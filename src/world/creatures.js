/* Procedural Jurassic Park creatures.
 *
 * The body is a continuous skinned loft, not a collection of capped
 * primitives. Cross-sections follow one anatomical spine and share a smooth
 * bone-weight falloff. That keeps the silhouette continuous while retaining
 * the deterministic procedural rig used by the player body.
 */
import * as THREE from 'three';
import { polygonizeVolumes } from './metaball.js';

const GEOMETRY_CACHE = new Map();

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function skinTexture(seed = 1) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = Math.sin((x + seed * 19) * 0.075) *
        Math.sin((y - seed * 13) * 0.091) +
        0.42 * Math.sin((x + y) * 0.43 + seed) +
        0.22 * Math.sin((x * 1.7 - y * 1.25) * 0.19 + seed * 2.1);
      const scale = 0.56 + 0.46 * p;
      const belly = y / size;
      const dorsal = 0.72 + belly * 0.38;
      const i = (y * size + x) * 4;
      data[i] = clamp(128 * scale * dorsal + belly * 34, 0, 255);
      data[i + 1] = clamp(116 * scale * dorsal + belly * 42, 0, 255);
      data[i + 2] = clamp(72 * scale * dorsal + belly * 36, 0, 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function materialFor(seed, debugNormals = false) {
  if (debugNormals) {
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.FrontSide,
    });
    material.userData.debugNormals = true;
    material.customProgramCacheKey = () => 'dino-normal-debug-v1';
    return material;
  }
  const material = new THREE.MeshStandardMaterial({
    map: skinTexture(seed),
    color: 0xd2ba7c,
    roughness: 0.88,
    metalness: 0,
  });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>',
        '#include <common>\nvarying vec3 vCreatureWorld;\nvarying vec3 vCreatureNormalWorld;')
      .replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvCreatureWorld = worldPosition.xyz;')
      .replace('#include <defaultnormal_vertex>',
        '#include <defaultnormal_vertex>\nvCreatureNormalWorld = normalize(mat3(modelMatrix) * transformedNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        '#include <common>\nvarying vec3 vCreatureWorld;\nvarying vec3 vCreatureNormalWorld;')
      .replace('#include <map_fragment>', `
        vec3 creatureN = abs(normalize(vCreatureNormalWorld));
        creatureN /= max(0.001, creatureN.x + creatureN.y + creatureN.z);
        vec3 creatureMap = texture2D(map, vCreatureWorld.yz * 0.20).rgb * creatureN.x
          + texture2D(map, vCreatureWorld.xz * 0.20).rgb * creatureN.y
          + texture2D(map, vCreatureWorld.xy * 0.20).rgb * creatureN.z;
        diffuseColor *= vec4(creatureMap * 1.25, 1.0);
      `);
    if (!material.userData.shaderLogged) {
      material.userData.shaderLogged = true;
      material.userData.shaderHasTriplanar = shader.fragmentShader.includes('creatureMap');
      material.userData.shaderHasWorldNormal = shader.fragmentShader.includes('vCreatureNormalWorld');
      material.userData.shaderFragmentLength = shader.fragmentShader.length;
      console.info('[dino-skin] triplanar shader compiled',
        material.userData.shaderHasWorldNormal,
        material.userData.shaderHasTriplanar);
    }
  };
  material.customProgramCacheKey = () => 'dino-skin-triplanar-v4';
  material.side = THREE.FrontSide;
  return material;
}

function bone(parent, name, p) {
  const b = new THREE.Bone();
  b.name = name;
  b.position.copy(p);
  parent.add(b);
  return b;
}

function loftGeometry(points, radii, radial, boneIndices, weights = null, maxBone = 255) {
  const pos = [], nor = [], uv = [], idx = [];
  const skin = [], sw = [];
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const p = points[i];
    const r = radii[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(count - 1, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    const side = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
    side.crossVectors(up, tangent).normalize();
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * TAU;
      const c = Math.cos(a), s = Math.sin(a);
      const n = side.clone().multiplyScalar(c).addScaledVector(up, s).normalize();
      const v = p.clone().addScaledVector(side, r.x * c).addScaledVector(up, r.y * s);
      pos.push(v.x, v.y, v.z);
      nor.push(n.x, n.y, n.z);
      uv.push(i / Math.max(1, count - 1), j / radial);
      const bi = boneIndices[i];
      const fall = weights ? weights[i] : 1;
      skin.push(bi, Math.max(0, bi - 1), Math.min(maxBone, bi + 1), 0);
      sw.push(fall, (1 - fall) * 0.5, (1 - fall) * 0.5, 0);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < count - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const start = pos.length / 3;
  const a = points[0], b = points[count - 1];
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
  nor.push(0, -1, 0, 0, 1, 0);
  uv.push(0, 0.5, 1, 0.5);
  skin.push(boneIndices[0], boneIndices[0], boneIndices[0], 0,
    boneIndices[count - 1], boneIndices[count - 1], boneIndices[count - 1], 0);
  sw.push(1, 0, 0, 0, 1, 0, 0, 0);
  for (let j = 0; j < radial; j++) {
    const s0 = j, s1 = j + 1;
    idx.push(start, s1, s0);
    const e0 = (count - 1) * row + j;
    const e1 = e0 + 1;
    idx.push(start + 1, e0, e1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skin, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

function resampleProfile(profile, count) {
  const points = [], radii = [], bones = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1) * (profile.length - 1);
    const a = Math.floor(t);
    const b = Math.min(profile.length - 1, a + 1);
    const f = t - a;
    points.push(profile[a].p.clone().lerp(profile[b].p, f));
    radii.push(profile[a].r.clone().lerp(profile[b].r, f));
    bones.push(Math.round(a + f));
  }
  return { points, radii, bones };
}

function skinned(geometry, material, skeleton, name) {
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.bind(skeleton);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function profilePoint(z, y, width, height) {
  return {
    p: new THREE.Vector3(0, y, z),
    r: new THREE.Vector2(width, height),
  };
}

export class CreatureRig {
  constructor(species = 'brachiosaurus', {
    seed = 1, scale = 1, terrain = null, debugNormals = false,
  } = {}) {
    this.species = species;
    this.terrain = terrain;
    this.phase = (seed * 1.618) % TAU;
    this.seed = seed;
    this.group = new THREE.Group();
    this.group.name = `${species}-${seed}`;
    this.group.scale.setScalar(scale);
    this.material = materialFor(seed, debugNormals);
    this.bones = {};
    if (species === 'brachiosaurus') this._buildImplicitBrachiosaurus();
    else this._buildImplicitSpecies(species);
    this._groundY = 0;
  }

  _buildImplicitSpecies(species) {
    const root = bone(this.group, 'root', new THREE.Vector3());
    this.bones.root = root;
    this.bones.spine = [root];
    this.bones.head = root;
    this.bones.legs = [];
    const E = (center, radius, blend = 0.25) =>
      ({ type: 'ellipsoid', center: new THREE.Vector3(...center),
        radius: new THREE.Vector3(...radius), blend });
    const C = (a, b, ra, rb = ra, blend = 0.25) =>
      ({ type: 'capsule', a: new THREE.Vector3(...a), b: new THREE.Vector3(...b),
        ra, rb, blend });
    const volumes = [];
    if (species === 'triceratops') {
      volumes.push(E([0, 3.4, 0], [2.25, 2.0, 3.1], 0.6));
      volumes.push(E([0, 3.8, 3.0], [1.55, 1.5, 1.5], 0.4));
      volumes.push(E([0, 4.4, 4.0], [1.45, 1.25, 1.3], 0.3));
      volumes.push(E([0, 4.4, 4.8], [2.3, 2.0, 0.35], 0.3));
      volumes.push(C([-0.45, 4.8, 4.5], [-0.65, 4.85, 5.9], 0.22, 0.1, 0.12));
      volumes.push(C([0.45, 4.8, 4.5], [0.65, 4.85, 5.9], 0.22, 0.1, 0.12));
      volumes.push(C([0, 4.35, 4.9], [0, 4.2, 5.7], 0.18, 0.08, 0.1));
      for (const x of [-1.25, 1.25]) for (const z of [-1.8, 1.7])
        volumes.push(C([x, 3.1, z], [x * 0.95, 0.65, z], 0.62, 0.38, 0.25));
    } else if (species === 'gallimimus') {
      volumes.push(E([0, 3.5, 0], [0.85, 1.0, 1.8], 0.3));
      volumes.push(C([0, 3.8, 1.2], [0, 5.0, 2.8], 0.42, 0.22, 0.18));
      volumes.push(E([0, 5.2, 3.1], [0.32, 0.28, 0.55], 0.15));
      volumes.push(C([0, 3.4, -1.2], [0, 3.0, -4.5], 0.3, 0.08, 0.15));
      for (const x of [-0.48, 0.48]) {
        volumes.push(C([x, 3.0, 0.6], [x * 1.1, 0.45, 0.2], 0.22, 0.12, 0.15));
        volumes.push(C([x * 1.1, 0.45, 0.2], [x * 1.3, 0.12, -0.15], 0.12, 0.06, 0.1));
      }
    } else if (species === 'dilophosaurus') {
      volumes.push(E([0, 2.5, 0], [0.8, 1.0, 1.35], 0.3));
      volumes.push(C([0, 2.8, 0.8], [0, 4.0, 1.9], 0.38, 0.2, 0.2));
      volumes.push(E([0, 4.2, 2.2], [0.55, 0.5, 0.85], 0.18));
      volumes.push(E([0, 4.55, 1.95], [0.65, 0.55, 0.18], 0.12));
      for (const side of [-1, 1]) volumes.push(E([side * 0.38, 4.7, 2.15], [0.22, 0.65, 0.3], 0.12));
      volumes.push(C([0, 2.3, -0.8], [0, 2.0, -3.5], 0.32, 0.08, 0.16));
      for (const x of [-0.5, 0.5]) volumes.push(C([x, 2.0, 0.2], [x * 1.15, 0.3, -0.1], 0.2, 0.1, 0.15));
    } else {
      volumes.push(E([0, 4.0, 0], [2.0, 1.8, 3.0], 0.55));
      volumes.push(C([0, 4.2, 2.0], [0, 4.8, 4.0], 0.75, 0.5, 0.3));
      volumes.push(E([0, 5.0, 4.7], [1.3, 1.25, 1.55], 0.3));
      volumes.push(E([0, 5.3, 5.7], [1.2, 0.8, 1.1], 0.2));
      volumes.push(C([0, 3.8, -2.0], [0, 3.1, -7.0], 0.75, 0.12, 0.3));
      for (const x of [-1.3, 1.3]) {
        volumes.push(C([x, 3.5, 1.0], [x * 1.05, 0.65, 0.7], 0.6, 0.35, 0.25));
        volumes.push(C([x * 0.55, 3.7, 3.8], [x * 0.75, 3.0, 4.5], 0.18, 0.1, 0.12));
      }
    }
    const boneForPoint = () => ({ indices: [0], weights: [1] });
    const spacing = species === 'trex' ? 0.18 : 0.16;
    const cacheKey = `${species}:${spacing}`;
    const started = performance.now();
    let geometry = GEOMETRY_CACHE.get(cacheKey);
    this.polygonizeCached = Boolean(geometry);
    if (!geometry) {
      geometry = polygonizeVolumes(volumes, { spacing, margin: 0.3, boneForPoint });
      GEOMETRY_CACHE.set(cacheKey, geometry);
    }
    this.polygonizeMs = performance.now() - started;
    const skeleton = new THREE.Skeleton([root]);
    root.updateMatrixWorld(true);
    skeleton.calculateInverses();
    this.skeleton = skeleton;
    const mesh = new THREE.SkinnedMesh(geometry, this.material);
    mesh.name = `implicit-${species}-surface`;
    mesh.bind(skeleton);
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
    this.mesh = mesh;
    this.group.userData.creatureRig = this;
  }

  _buildImplicitBrachiosaurus() {
    const root = bone(this.group, 'root', new THREE.Vector3());
    this.bones.root = root;
    const profile = [
      [0, 4.55, 9.6], [0, 4.62, 8.2], [0, 4.65, 6.8], [0, 4.62, 5.3],
      [0, 4.52, 3.9], [0, 4.55, 2.4], [0, 4.8, 1.1], [0, 5.05, -0.3],
      [0, 5.35, -1.6], [0, 5.72, -2.7], [0, 6.08, -3.5],
      [0, 6.75, -4.15], [0, 7.6, -4.75], [0, 8.55, -5.3],
      [0, 9.5, -5.72], [0, 10.45, -6], [0, 11.3, -6.18],
      [0, 12, -6.25],
    ].map(v => new THREE.Vector3(...v));
    const spine = [];
    for (let i = 0; i < profile.length; i++) {
      const parent = i ? spine[i - 1] : root;
      spine.push(bone(parent, `spine-${i}`, profile[i].clone().sub(i ? profile[i - 1] : new THREE.Vector3())));
    }
    this.bones.spine = spine;
    this.bones.head = spine[spine.length - 1];
    this.bones.legs = [];
    const legDefs = [
      ['front-left', -1, -2.55, 6.45, 3.45, 1.05],
      ['front-right', 1, -2.55, 6.45, 3.45, 1.05],
      ['rear-left', -1, 1.2, 4.95, 2.75, 0.78],
      ['rear-right', 1, 1.2, 4.95, 2.75, 0.78],
    ];
    for (const [name, side, z, hipY, kneeY, ankleY] of legDefs) {
      const hip = new THREE.Vector3(side * 1.22, hipY, z);
      const knee = new THREE.Vector3(side * 1.15, kneeY, z - 0.16);
      const ankle = new THREE.Vector3(side * 1.12, ankleY, z - 0.08);
      const upper = bone(root, `${name}-upper`, hip);
      const lower = bone(root, `${name}-lower`, knee);
      const foot = bone(root, `${name}-foot`, ankle);
      this.bones.legs.push({ name, side, upper, lower, foot, hip, knee, ankle,
        end: new THREE.Vector3(side * 1.1, 0.28, z - 0.32) });
    }
    const legBones = this.bones.legs.flatMap(l => [l.upper, l.lower, l.foot]);
    const skeleton = new THREE.Skeleton([root, ...spine, ...legBones]);
    root.updateMatrixWorld(true);
    skeleton.calculateInverses();
    this.skeleton = skeleton;
    const bonePoints = [new THREE.Vector3(), ...profile,
      ...this.bones.legs.flatMap(l => [l.hip, l.knee, l.ankle])];
    const boneForPoint = p => {
      const ranked = bonePoints.map((q, i) => ({ i, d: p.distanceToSquared(q) }))
        .sort((a, b) => a.d - b.d).slice(0, 3);
      const raw = ranked.map(v => 1 / Math.max(0.05, Math.sqrt(v.d)));
      const sum = raw.reduce((a, b) => a + b, 0);
      return {
        indices: ranked.map(v => v.i),
        weights: raw.map(v => v / sum),
      };
    };
    const E = (center, radius, blend = 0.25) =>
      ({ type: 'ellipsoid', center: new THREE.Vector3(...center),
        radius: new THREE.Vector3(...radius), blend });
    const C = (a, b, ra, rb = ra, blend = 0.25) =>
      ({ type: 'capsule', a: new THREE.Vector3(...a), b: new THREE.Vector3(...b),
        ra, rb, blend });
    const volumes = [
      E([0, 5.65, -0.3], [1.65, 2.0, 3.5], 0.6),
      E([0, 6.25, -2.55], [1.75, 1.65, 1.7], 0.65),
      E([0, 4.9, 1.45], [1.75, 1.55, 1.9], 0.65),
      C([0, 4.35, 3.7], [0, 4.45, 6.2], 0.82, 0.52, 0.34),
      C([0, 4.45, 6.2], [0, 4.7, 8.5], 0.52, 0.24, 0.24),
      C([0, 4.7, 8.5], [0, 4.62, 10.8], 0.24, 0.12, 0.16),
      C([0, 6.6, -2.8], [0, 8.4, -4.15], 1.05, 0.84, 0.38),
      C([0, 8.4, -4.15], [0, 10.8, -5.35], 0.84, 0.56, 0.3),
      C([0, 10.8, -5.35], [0, 12.7, -6.4], 0.56, 0.36, 0.24),
      E([0, 12.0, -6.9], [0.7, 0.62, 0.95], 0.3),
      E([0, 12.3, -7.15], [0.58, 0.42, 0.6], 0.18),
      E([0, 11.85, -7.5], [0.5, 0.28, 0.7], 0.14),
    ];
    for (const leg of this.bones.legs) {
      volumes.push(C(leg.hip.toArray(), leg.knee.toArray(), 0.82, 0.68, 0.42));
      volumes.push(C(leg.knee.toArray(), leg.ankle.toArray(), 0.68, 0.58, 0.3));
      volumes.push(E(leg.end.toArray(), [0.82, 0.32, 1.0], 0.3));
      for (const side of [-1, 0, 1]) {
        volumes.push(C(
          [leg.end.x + side * 0.24, 0.1, leg.end.z - 0.55],
          [leg.end.x + side * 0.24, 0.22, leg.end.z - 0.92],
          0.2, 0.12, 0.12,
        ));
      }
    }
    const spacing = this.species === 'trex' ? 0.18 : 0.16;
    const cacheKey = `${this.species}:${spacing}`;
    const started = performance.now();
    let geometry = GEOMETRY_CACHE.get(cacheKey);
    this.polygonizeCached = Boolean(geometry);
    if (!geometry) {
      geometry = polygonizeVolumes(volumes, {
        spacing,
        margin: 0.3,
        boneForPoint,
      });
      GEOMETRY_CACHE.set(cacheKey, geometry);
    }
    this.polygonizeMs = performance.now() - started;
    const mesh = new THREE.SkinnedMesh(geometry, this.material);
    mesh.name = 'implicit-brachiosaurus-surface';
    mesh.bind(skeleton);
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
    this.mesh = mesh;
    this.group.userData.creatureRig = this;
  }

  update(dt, { walk = false } = {}) {
    this.phase += dt * (walk ? 1.15 : 0.38);
    const p = this.phase;
    const stride = walk ? 0.34 : 0.045;
    const loaded = Math.sin(p * 1.15);
    this.bones.root.rotation.z = loaded * 0.012;
    this.bones.root.rotation.x = loaded * 0.009;
    for (let i = 0; i < this.bones.spine.length; i++) {
      const b = this.bones.spine[i];
      const neck = i > 9 ? (i - 9) / 9 : 0;
      b.rotation.z = Math.sin(p * 0.38 + i * 0.08) * (0.006 + neck * 0.008);
      b.rotation.x = neck * Math.sin(p * 0.22) * 0.014;
    }
    this.bones.head.rotation.x = Math.sin(p * 0.7) * 0.018;
    this.bones.head.rotation.y = Math.sin(p * 0.19) * 0.07;
    for (let i = 0; i < this.bones.legs.length; i++) {
      const leg = this.bones.legs[i];
      const phase = p * 1.15 + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.35 : 0);
      const swing = Math.sin(phase) * stride;
      leg.upper.rotation.x = swing;
      leg.lower.rotation.x = -Math.max(0, swing) * 0.48;
      leg.foot.rotation.x = -swing * 0.22;
    }
    for (let i = 0; i < this.bones.spine.length - 1; i++) {
      if (i < 10) continue;
      this.bones.spine[i].rotation.z += Math.sin(p * 0.28 - i * 0.14) * 0.008;
    }
    if (this.terrain) {
      const n = this.terrain.normal(this.group.position.x, this.group.position.z);
      const yaw = this.group.rotation.y;
      this.group.rotation.set(
        Math.atan2(n.z, n.y) * 0.65,
        yaw,
        Math.atan2(-n.x, n.y) * 0.65,
      );
      const ground = this.terrain.height(this.group.position.x, this.group.position.z);
      this.group.position.y = ground;
      for (const leg of this.bones.legs) {
        const wx = this.group.position.x + leg.end.x;
        const wz = this.group.position.z + leg.end.z;
        const target = this.terrain.height(wx, wz) - ground;
        const delta = clamp(target, -0.45, 0.45);
        leg.lower.position.y = leg.knee.y + delta * 0.5;
        leg.foot.position.y = leg.ankle.y + delta;
      }
      this._groundY = this.group.position.y;
    }
  }

  stats() {
    let meshes = 0, triangles = 0;
    this.group.traverse(o => {
      if (!o.isMesh) return;
      meshes++;
      triangles += o.geometry.index
        ? o.geometry.index.count / 3
        : o.geometry.attributes.position.count / 3;
    });
    return {
      meshes,
      triangles,
      polygonizeMs: this.polygonizeMs,
      polygonizeCached: this.polygonizeCached,
    };
  }
}

export class DinosaurSystem {
  constructor(renderer, terrain, { turntable = null, debugNormals = false } = {}) {
    this.renderer = renderer;
    this.terrain = terrain;
    this.root = new THREE.Group();
    this.root.name = 'procedural-dinosaurs';
    this.creatures = [];
    this.time = 0;
    this.turntable = Boolean(turntable);
    this.debugNormals = Boolean(debugNormals);
    this.audio = null;
    if (turntable) {
      const dino = new CreatureRig(turntable, {
        seed: 7, terrain: null, debugNormals: this.debugNormals,
      });
      this.root.add(dino.group);
      this.creatures.push(dino);
    } else {
      const spots = [[-20, -326], [2, -334], [24, -329]];
      spots.forEach(([x, z], i) => {
        const dino = new CreatureRig('brachiosaurus', { seed: i + 1, terrain });
        dino.group.position.set(x, terrain.height(x, z), z);
        dino.group.rotation.y = i * 0.35;
        this.root.add(dino.group);
        this.creatures.push(dino);
      });
    }
  }

  update(dt) {
    this.time += dt;
    for (const dino of this.creatures) dino.update(dt, { walk: false });
    if (!this.turntable && this.audio &&
        Math.floor(this.time) !== Math.floor(this.time - dt) &&
        Math.floor(this.time) % 14 === 0) {
      this.audio.triggerDinoRumble(this.creatures[0].group.position, 0.7);
    }
  }

  stats() {
    return this.creatures.reduce((out, c) => {
      const s = c.stats();
      out.meshes += s.meshes;
      out.triangles += s.triangles;
      out.polygonizeMs = (out.polygonizeMs || 0) + (s.polygonizeMs || 0);
      out.cached = (out.cached || 0) + (s.polygonizeCached ? 1 : 0);
      return out;
    }, {
      meshes: 0, triangles: 0, instances: this.creatures.length,
      polygonizeMs: 0, cached: 0,
    });
  }
}
