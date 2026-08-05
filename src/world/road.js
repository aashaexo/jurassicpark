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
    const y = terrain.heightAt(center.x, center.y) + 0.09;
    const bank = Math.sin(t * Math.PI * 14.0) * 0.06;
    for (const offset of [-width, width]) {
      const p = center.clone().addScaledVector(side, offset);
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
    color: 0x56351e,
    roughness: 0.92,
    metalness: 0,
    map: textures?.dirt?.map || null,
    normalMap: textures?.dirt?.normalMap || null,
    normalScale: new THREE.Vector2(0.45, 0.45),
  });
  const road = new THREE.Mesh(geometry, material);
  road.receiveShadow = true;
  road.name = 'dirt-jeep-road';
  group.add(road);

  const rutMaterial = new THREE.MeshStandardMaterial({
    color: 0x24160e,
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  for (const sideOffset of [-2.25, 2.25]) {
    const rut = new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(Array.from({ length: 34 }, (_, i) => {
        const t = i / 33;
        const p = centerAt(t);
        const n = centerAt(Math.min(1, t + 0.01)).sub(p).normalize();
        const side = new THREE.Vector2(-n.y, n.x);
        const q = p.clone().addScaledVector(side, sideOffset);
        return new THREE.Vector3(q.x, terrain.heightAt(q.x, q.y) + 0.13, q.y);
      })), 160, 0.12, 5, false),
      rutMaterial,
    );
    rut.scale.y = 0.18;
    rut.name = sideOffset < 0 ? 'left-tire-rut' : 'right-tire-rut';
    group.add(rut);
  }
  return group;
}
