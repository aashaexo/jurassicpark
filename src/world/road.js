import * as THREE from 'three';

const ROAD_START = new THREE.Vector2(-260, 250);
const ROAD_END = new THREE.Vector2(185, -65);

function centerAt(t) {
  const p = ROAD_START.clone().lerp(ROAD_END, t);
  p.x += Math.sin(t * Math.PI * 2.2) * 18.0;
  p.y += Math.sin(t * Math.PI * 3.0 + 0.4) * 9.0;
  return p;
}

export function roadSample(x, z) {
  let best = { distance: Infinity, t: 0, point: new THREE.Vector2(), tangent: new THREE.Vector2(1, 0) };
  let previous = centerAt(0);
  for (let i = 1; i <= 36; i++) {
    const t = i / 36;
    const current = centerAt(t);
    const segment = current.clone().sub(previous);
    const len2 = segment.lengthSq();
    const q = new THREE.Vector2(x, z);
    const u = THREE.MathUtils.clamp(q.clone().sub(previous).dot(segment) / len2, 0, 1);
    const point = previous.clone().addScaledVector(segment, u);
    const distance = q.distanceTo(point);
    if (distance < best.distance) {
      best = { distance, t: (i - 1 + u) / 36, point, tangent: segment.normalize() };
    }
    previous = current;
  }
  return best;
}

export function roadInfluence(x, z) {
  const sample = roadSample(x, z);
  const width = 7.0 + Math.sin(sample.t * 21.0) * 0.6;
  return THREE.MathUtils.smoothstep(width + 8.0, width - 2.0, sample.distance);
}

export function createRoad(terrain, textures = null) {
  const group = new THREE.Group();
  group.name = 'graded-jeep-road';
  const segments = 120;
  const width = 7.4;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const center = centerAt(t);
    const next = centerAt(Math.min(1, t + 1 / segments));
    const tangent = next.sub(center).normalize();
    const side = new THREE.Vector2(-tangent.y, tangent.x);
    const bank = Math.sin(t * Math.PI * 14.0) * 0.06;
    for (const offset of [-width, width]) {
      const p = center.clone().addScaledVector(side, offset);
      const y = terrain.heightAt(p.x, p.y) + 0.12;
      positions.push(p.x, y + bank * (offset / width), p.y);
      uvs.push(t * 18, offset / width * 0.5 + 0.5);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0x4f5146,
    roughness: 0.96,
    metalness: 0,
    map: null,
    normalMap: textures?.dirt?.normalMap || null,
    normalScale: new THREE.Vector2(0.45, 0.45),
  });
  const road = new THREE.Mesh(geometry, material);
  road.receiveShadow = true;
  road.name = 'dirt-jeep-road';
  group.add(road);

  return group;
}
