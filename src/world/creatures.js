/* Procedural Jurassic Park creatures.
 *
 * The body is a continuous skinned loft, not a collection of capped
 * primitives. Cross-sections follow one anatomical spine and share a smooth
 * bone-weight falloff. That keeps the silhouette continuous while retaining
 * the deterministic procedural rig used by the player body.
 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function skinTexture(seed = 1) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = Math.sin((x + seed * 19) * 0.075) *
        Math.sin((y - seed * 13) * 0.091) +
        0.3 * Math.sin((x + y) * 0.43 + seed);
      const scale = 0.82 + 0.12 * p;
      const belly = y / size;
      const dorsal = 1 - belly * 0.20;
      const i = (y * size + x) * 4;
      data[i] = clamp(155 * scale * dorsal, 0, 255);
      data[i + 1] = clamp(142 * scale * dorsal + belly * 12, 0, 255);
      data[i + 2] = clamp(94 * scale * dorsal + belly * 14, 0, 255);
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

function skinNormalTexture(seed = 1) {
  const size = 128;
  const data = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = Math.sin((x + seed * 13) * 0.42) *
        Math.sin((y - seed * 7) * 0.37);
      const i = (y * size + x) * 3;
      data[i] = 128 + n * 28;
      data[i + 1] = 128 - n * 18;
      data[i + 2] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function materialFor(seed) {
  return new THREE.MeshStandardMaterial({
    map: skinTexture(seed),
    normalMap: skinNormalTexture(seed),
    color: 0xd2ba7c,
    roughness: 0.88,
    metalness: 0,
    normalScale: new THREE.Vector2(0.42, 0.42),
  });
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
  constructor(species = 'brachiosaurus', { seed = 1, scale = 1, terrain = null } = {}) {
    this.species = species;
    this.terrain = terrain;
    this.phase = (seed * 1.618) % TAU;
    this.seed = seed;
    this.group = new THREE.Group();
    this.group.name = `${species}-${seed}`;
    this.group.scale.setScalar(scale);
    this.material = materialFor(seed);
    this.bones = {};
    this._buildBrachiosaurus();
    this._groundY = 0;
  }

  _buildBrachiosaurus() {
    const root = bone(this.group, 'root', new THREE.Vector3());
    this.bones.root = root;
    const profile = [
      profilePoint(9.6, 4.55, 0.18, 0.18),
      profilePoint(8.2, 4.62, 0.32, 0.28),
      profilePoint(6.8, 4.65, 0.52, 0.42),
      profilePoint(5.3, 4.62, 0.8, 0.65),
      profilePoint(3.9, 4.52, 1.2, 1.0),
      profilePoint(2.4, 4.55, 1.58, 1.3),
      profilePoint(1.1, 4.8, 1.72, 1.48),
      profilePoint(-0.3, 5.05, 1.8, 1.62),
      profilePoint(-1.6, 5.35, 1.82, 1.72),
      profilePoint(-2.7, 5.72, 1.72, 1.62),
      profilePoint(-3.5, 6.08, 1.5, 1.4),
      profilePoint(-4.15, 6.75, 0.98, 0.94),
      profilePoint(-4.75, 7.6, 0.86, 0.84),
      profilePoint(-5.3, 8.55, 0.77, 0.75),
      profilePoint(-5.72, 9.5, 0.68, 0.66),
      profilePoint(-6.0, 10.45, 0.6, 0.59),
      profilePoint(-6.18, 11.3, 0.54, 0.52),
      profilePoint(-6.25, 12.0, 0.48, 0.46),
    ];
    const spine = [];
    for (let i = 0; i < profile.length; i++) {
      const parent = i ? spine[i - 1] : root;
      const prev = i ? profile[i - 1].p : new THREE.Vector3();
      spine.push(bone(parent, `spine-${i}`, profile[i].p.clone().sub(prev)));
    }
    this.bones.spine = spine;
    const dense = resampleProfile(profile, 180);
    dense.bones = dense.bones.map(i => i + 1);
    const geom = loftGeometry(dense.points, dense.radii, 64, dense.bones,
      dense.points.map(() => 0.72), spine.length);
    const bodyGeometry = geom;

    const headProfile = [
      { p: new THREE.Vector3(0, 12.0, -6.25), r: new THREE.Vector2(0.48, 0.46) },
      { p: new THREE.Vector3(0, 12.12, -6.75), r: new THREE.Vector2(0.52, 0.45) },
      { p: new THREE.Vector3(0, 12.05, -7.3), r: new THREE.Vector2(0.48, 0.38) },
      { p: new THREE.Vector3(0, 11.92, -7.78), r: new THREE.Vector2(0.35, 0.28) },
    ];
    const headBone = bone(spine[spine.length - 1], 'head', new THREE.Vector3(0, 0, -0.3));
    this.bones.head = headBone;
    const hd = resampleProfile(headProfile, 40);
    hd.bones = hd.bones.map(() => spine.length);
    const hg = loftGeometry(hd.points, hd.radii, 36, hd.bones,
      hd.points.map(() => 1), spine.length);
    const headGeometry = hg;

    this.bones.legs = [];
    const legGeometries = [];
    const legDefs = [
      ['front-left', -1, -2.55, 5.85, 3.05, 0.95],
      ['front-right', 1, -2.55, 5.85, 3.05, 0.95],
      ['rear-left', -1, 1.2, 4.65, 2.65, 0.76],
      ['rear-right', 1, 1.2, 4.65, 2.65, 0.76],
    ];
    for (const [name, side, z, hipY, kneeY, ankleY] of legDefs) {
      const hip = new THREE.Vector3(side * 1.22, hipY, z);
      const knee = new THREE.Vector3(side * 1.15, kneeY, z - 0.16);
      const ankle = new THREE.Vector3(side * 1.12, ankleY, z - 0.08);
      const foot = new THREE.Vector3(side * 1.1, 0.28, z - 0.32);
      const upper = bone(root, `${name}-upper`, hip);
      const lower = bone(root, `${name}-lower`, knee);
      const footBone = bone(root, `${name}-foot`, ankle);
      this.bones.legs.push({ name, side, upper, lower, foot: footBone, hip, knee, ankle, end: foot });
      const lp = [hip, knee, ankle, foot];
      const rr = [
        new THREE.Vector2(0.78, 0.78),
        new THREE.Vector2(0.7, 0.72),
        new THREE.Vector2(0.58, 0.55),
        new THREE.Vector2(0.72, 0.32),
      ];
      const legBoneBase = 1 + spine.length + (this.bones.legs.length - 1) * 3;
      const ld = resampleProfile(lp.map((p, i) => ({ p, r: rr[i] })), 24);
      ld.bones = ld.bones.map(i => legBoneBase + clamp(i, 0, 2));
      const lg = loftGeometry(ld.points, ld.radii, 32, ld.bones,
        ld.points.map(() => 0.92), legBoneBase + 2);
      legGeometries.push([lg, `${name}-continuous-leg`]);
    }

    const legBones = this.bones.legs.flatMap(l => [l.upper, l.lower, l.foot]);
    const skeleton = new THREE.Skeleton([root, ...spine, ...legBones]);
    root.updateMatrixWorld(true);
    skeleton.calculateInverses();
    this.skeleton = skeleton;
    this.group.add(skinned(bodyGeometry, this.material, skeleton, 'continuous-brachiosaurus-body'));
    this.group.add(skinned(headGeometry, this.material, skeleton, 'domed-brachiosaurus-head'));
    for (const [lg, name] of legGeometries) {
      this.group.add(skinned(lg, this.material, skeleton, name));
    }

    const detail = new THREE.MeshStandardMaterial({ color: 0x100e0a, roughness: 0.5 });
    const flesh = new THREE.MeshStandardMaterial({
      map: this.material.map,
      normalMap: this.material.normalMap,
      color: 0xd0b77a,
      roughness: 0.9,
    });
    for (const leg of this.bones.legs) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), flesh);
      pad.name = `${leg.name}-fleshy-foot-pad`;
      pad.position.set(0, -0.42, -0.24);
      pad.scale.set(0.82, 0.3, 1.05);
      pad.castShadow = pad.receiveShadow = true;
      leg.foot.add(pad);
      for (const side of [-1, 0, 1]) {
        const toe = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), flesh);
        toe.name = `${leg.name}-blunt-toe`;
        toe.position.set(side * 0.24, -0.46, -0.86);
        toe.scale.set(0.2, 0.13, 0.3);
        toe.castShadow = toe.receiveShadow = true;
        leg.foot.add(toe);
      }
    }
    for (const [side, z] of [[-1, -2.7], [1, -2.7], [-1, 1.15], [1, 1.15]]) {
      const mass = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), flesh);
      mass.name = side < 0 ? 'left-shoulder-hip-blend' : 'right-shoulder-hip-blend';
      mass.position.set(side * 1.12, z < 0 ? 5.55 : 4.6, z);
      mass.scale.set(0.95, z < 0 ? 1.2 : 1.05, 1.0);
      mass.castShadow = mass.receiveShadow = true;
      this.group.add(mass);
    }
    const detailHead = this.bones.head;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), flesh);
    dome.name = 'domed-nasal-arch';
    dome.position.set(0, 0.33, -0.72);
    dome.scale.set(0.53, 0.3, 0.72);
    dome.castShadow = dome.receiveShadow = true;
    detailHead.add(dome);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), flesh);
    jaw.name = 'defined-lower-jaw';
    jaw.position.set(0, -0.28, -0.83);
    jaw.scale.set(0.43, 0.18, 0.76);
    jaw.castShadow = jaw.receiveShadow = true;
    detailHead.add(jaw);
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.035, 0.035),
      detail,
    );
    mouth.name = 'mouth-line';
    mouth.position.set(0, -0.22, -1.48);
    detailHead.add(mouth);
    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), detail);
      nostril.name = 'top-nostril';
      nostril.position.set(side * 0.2, 0.62, -1.18);
      nostril.scale.set(1.2, 0.5, 0.8);
      detailHead.add(nostril);
      const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), flesh);
      brow.name = 'brow-ridge';
      brow.position.set(side * 0.42, 0.3, -0.86);
      brow.scale.set(0.2, 0.12, 0.34);
      detailHead.add(brow);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), detail);
    eye.position.set(-0.42, 0.28, -1.0);
    eye.castShadow = true;
    detailHead.add(eye);
    const eye2 = eye.clone();
    eye2.position.x = 0.42;
    detailHead.add(eye2);
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
    return { meshes, triangles };
  }
}

export class DinosaurSystem {
  constructor(renderer, terrain, { turntable = null } = {}) {
    this.renderer = renderer;
    this.terrain = terrain;
    this.root = new THREE.Group();
    this.root.name = 'procedural-dinosaurs';
    this.creatures = [];
    this.time = 0;
    this.turntable = Boolean(turntable);
    this.audio = null;
    if (turntable) {
      const dino = new CreatureRig(turntable, { seed: 7, terrain: null });
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
      return out;
    }, { meshes: 0, triangles: 0, instances: this.creatures.length });
  }
}
