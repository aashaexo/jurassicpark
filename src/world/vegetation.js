import * as THREE from 'three';

const WORLD = 300;
const TILE = 100;
const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17; s >>>= 0;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function addQuad(data, a, b, c, d, color = [0, 1, 0]) {
  const base = data.p.length / 3;
  const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  for (const p of [a, b, c, d]) {
    data.p.push(p.x, p.y, p.z);
    data.n.push(normal.x, normal.y, normal.z);
    data.u.push(p === a || p === d ? 0 : 1, p === a || p === b ? 0 : 1);
    data.flex.push(p.y / Math.max(1, Math.max(a.y, b.y, c.y, d.y)));
  }
  data.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function addTube(data, radius, height, sides = 6) {
  const base = data.p.length / 3;
  for (let y = 0; y <= 1; y++) {
    for (let s = 0; s < sides; s++) {
      const a = s / sides * TAU;
      data.p.push(Math.cos(a) * radius * (1 - y * 0.35), y * height, Math.sin(a) * radius * (1 - y * 0.35));
      data.n.push(Math.cos(a), 0.2, Math.sin(a));
      data.u.push(s / sides, y);
      data.flex.push(y * 0.2);
    }
  }
  for (let s = 0; s < sides; s++) {
    const n = (s + 1) % sides;
    data.i.push(base + s, base + n, base + sides + n, base + s, base + sides + n, base + sides + s);
  }
}

function leafCluster(data, y, radius, count, length, width, phase = 0) {
  for (let i = 0; i < count; i++) {
    const a = phase + i / count * TAU;
    const dir = new THREE.Vector3(Math.cos(a), 0.12 + (i % 3) * 0.06, Math.sin(a));
    const base = new THREE.Vector3(Math.cos(a) * radius * 0.22, y, Math.sin(a) * radius * 0.22);
    const tip = base.clone().addScaledVector(dir, length);
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(width * 0.5);
    addQuad(data, base.clone().sub(side), base.clone().add(side), tip.clone().add(side.multiplyScalar(0.15)), tip.clone().sub(side.multiplyScalar(0.15)));
  }
}

function makeGeometry(kind) {
  const data = { p: [], n: [], u: [], flex: [], i: [] };
  if (kind === 'canopy') {
    addTube(data, 0.18, 5.8, 7);
    leafCluster(data, 4.5, 1.0, 8, 3.5, 1.35, 0.2);
    leafCluster(data, 5.7, 0.7, 10, 3.1, 1.15, 0.5);
    leafCluster(data, 6.8, 0.4, 7, 2.4, 0.95, 0.1);
  } else if (kind === 'palm') {
    addTube(data, 0.12, 4.3, 7);
    leafCluster(data, 4.15, 0.25, 9, 2.3, 0.62, 0);
  } else if (kind === 'broadleaf') {
    addTube(data, 0.08, 0.9, 5);
    leafCluster(data, 0.65, 0.25, 5, 1.2, 0.72, 0.35);
  } else if (kind === 'fern') {
    leafCluster(data, 0.05, 0.0, 9, 0.95, 0.22, 0.1);
    leafCluster(data, 0.12, 0.0, 7, 0.7, 0.16, 0.55);
  } else if (kind === 'tussock') {
    leafCluster(data, 0.02, 0.0, 14, 0.8, 0.10, 0.0);
  } else if (kind === 'log') {
    addTube(data, 0.28, 2.0, 8);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(data.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(data.u, 2));
  g.setAttribute('aFlex', new THREE.Float32BufferAttribute(data.flex, 1));
  g.setIndex(data.i);
  g.computeBoundingSphere();
  return g;
}

const SPECIES = [
  { kind: 'canopy', count: 1600, spacing: 13, tile: 100, color: 0x245c24, scale: [0.85, 1.5] },
  { kind: 'palm', count: 650, spacing: 17, tile: 100, color: 0x337b31, scale: [0.8, 1.3] },
  { kind: 'broadleaf', count: 3500, spacing: 7, tile: 50, color: 0x328d32, scale: [0.65, 1.25] },
  { kind: 'fern', count: 6000, spacing: 5, tile: 50, color: 0x2d7d2c, scale: [0.7, 1.35] },
  { kind: 'tussock', count: 16000, spacing: 3.2, tile: 100, color: 0x4a9632, scale: [0.55, 1.4] },
  { kind: 'log', count: 180, spacing: 28, tile: 100, color: 0x4b3020, scale: [0.8, 1.4] },
];

function materialFor(kind, color, wind) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: kind === 'log' ? 0.92 : 0.78,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: true,
    alphaTest: 0.28,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVegetationTime = { value: 0 };
    shader.vertexShader = `uniform float uVegetationTime;\nattribute float aFlex;\nvarying vec2 vVegetationUv;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vVegetationUv = uv;
       float windPhase = transformed.x * 0.7 + transformed.z * 0.45 + instanceMatrix[3].x * 0.035 + instanceMatrix[3].z * 0.027;
       float gust = 0.45 + 0.55 * sin(uVegetationTime * 0.4 + instanceMatrix[3].x * 0.02 + instanceMatrix[3].z * 0.016);
       float flex = aFlex * aFlex;
       transformed.xz += vec2(cos(windPhase + uVegetationTime), sin(windPhase * 1.3 + uVegetationTime * 0.8)) * flex * ${wind.toFixed(3)} * gust;`,
    );
    shader.fragmentShader = `varying vec2 vVegetationUv;\n${shader.fragmentShader}`.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
       diffuseColor.a *= smoothstep(0.02, 0.14, vVegetationUv.x) * smoothstep(0.98, 0.86, vVegetationUv.x)
         * smoothstep(0.02, 0.14, vVegetationUv.y) * smoothstep(0.98, 0.86, vVegetationUv.y);`,
    );
    material.userData.shader = shader;
  };
  return material;
}

export function createVegetation(terrain, roadSample) {
  const group = new THREE.Group();
  group.name = 'procedural-jungle-vegetation';
  const shared = new THREE.Object3D();
  const color = new THREE.Color();
  let total = 0;
  for (const species of SPECIES) {
    const buckets = new Map();
    const random = rng(0x71A5EED + species.kind.length * 991);
    let placed = 0;
    for (let n = 0; n < species.count * 2 && placed < species.count; n++) {
      const x = -WORLD + random() * WORLD * 2;
      const z = -WORLD + random() * WORLD * 2;
      const y = terrain.heightAt(x, z);
      const hL = terrain.heightAt(x - 1, z), hR = terrain.heightAt(x + 1, z);
      const hD = terrain.heightAt(x, z - 1), hU = terrain.heightAt(x, z + 1);
      const slope = Math.hypot(hR - hL, hU - hD) * 0.5;
      const road = roadSample(x, z);
      if (road.distance < (species.kind === 'tussock' ? 10 : 15)) continue;
      if (species.kind === 'canopy' && (slope > 0.75 || y < 3)) continue;
      if (species.kind === 'palm' && (slope > 0.5 || y > 32)) continue;
      if ((species.kind === 'fern' || species.kind === 'broadleaf') && slope > 1.0) continue;
      const tx = Math.floor((x + WORLD) / species.tile);
      const tz = Math.floor((z + WORLD) / species.tile);
      const key = `${tx},${tz}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ x, y, z, scale: species.scale[0] + random() * (species.scale[1] - species.scale[0]), rot: random() * TAU });
      placed++;
    }
    const geometry = makeGeometry(species.kind);
    const material = materialFor(species.kind, species.color, species.kind === 'tussock' ? 0.035 : 0.07);
    for (const [key, instances] of buckets) {
      const tileGeometry = geometry.clone();
      const mesh = new THREE.InstancedMesh(tileGeometry, material, instances.length);
      mesh.name = `vegetation-${species.kind}-tile-${key}`;
      mesh.castShadow = species.kind === 'canopy' || species.kind === 'palm' || species.kind === 'log';
      mesh.receiveShadow = true;
      for (let i = 0; i < instances.length; i++) {
        const p = instances[i];
        shared.position.set(p.x, p.y, p.z);
        shared.rotation.set(0, p.rot, 0);
        shared.scale.setScalar(p.scale);
        shared.updateMatrix();
        mesh.setMatrixAt(i, shared.matrix);
        color.setHSL(0.26 + (random() - 0.5) * 0.035, 0.58, 0.20 + random() * 0.10);
        mesh.setColorAt(i, color);
      }
      const center = new THREE.Vector3();
      for (const p of instances) center.add(new THREE.Vector3(p.x, p.y, p.z));
      center.multiplyScalar(1 / instances.length);
      let radius = geometry.boundingSphere.radius * species.scale[1];
      for (const p of instances) radius = Math.max(radius, center.distanceTo(new THREE.Vector3(p.x, p.y, p.z)) + geometry.boundingSphere.radius * p.scale);
      mesh.boundingSphere = new THREE.Sphere(center, radius);
      tileGeometry.boundingSphere = mesh.boundingSphere.clone();
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
      total += instances.length;
    }
  }
  group.userData.instanceCount = total;
  group.userData.bucketCount = group.children.length;
  return group;
}
