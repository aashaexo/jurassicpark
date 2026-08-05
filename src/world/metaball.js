import * as THREE from 'three';

const TETS = [
  [0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6],
  [0, 3, 7, 6], [0, 3, 4, 7], [0, 6, 4, 5],
];

function capsuleDistance(p, a, b, ra, rb = ra) {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  const q = a.clone().lerp(b, t);
  const r = THREE.MathUtils.lerp(ra, rb, t);
  return p.distanceTo(q) - r;
}

function ellipsoidDistance(p, c, r) {
  const q = p.clone().sub(c);
  const k0 = Math.hypot(q.x / r.x, q.y / r.y, q.z / r.z);
  const k1 = Math.hypot(q.x / (r.x * r.x), q.y / (r.y * r.y), q.z / (r.z * r.z));
  return k0 * (k0 - 1) / Math.max(0.0001, k1);
}

function smoothMin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * h * k / 6;
}

export function sdfGradient(p, volumes, eps = 0.01) {
  const dx = volumeDistance(new THREE.Vector3(p.x + eps, p.y, p.z), volumes) -
    volumeDistance(new THREE.Vector3(p.x - eps, p.y, p.z), volumes);
  const dy = volumeDistance(new THREE.Vector3(p.x, p.y + eps, p.z), volumes) -
    volumeDistance(new THREE.Vector3(p.x, p.y - eps, p.z), volumes);
  const dz = volumeDistance(new THREE.Vector3(p.x, p.y, p.z + eps), volumes) -
    volumeDistance(new THREE.Vector3(p.x, p.y, p.z - eps), volumes);
  const gradient = new THREE.Vector3(dx, dy, dz);
  if (gradient.lengthSq() < 1e-10) {
    let nearest = null;
    let distance = Infinity;
    for (const v of volumes) {
      const c = v.type === 'ellipsoid' ? v.center : v.a;
      const d = p.distanceToSquared(c);
      if (d < distance) { distance = d; nearest = c; }
    }
    if (nearest) gradient.copy(p).sub(nearest);
  }
  return gradient.normalize();
}

export function volumeDistance(p, volumes) {
  let d = Infinity;
  for (const v of volumes) {
    const q = v.type === 'ellipsoid'
      ? ellipsoidDistance(p, v.center, v.radius)
      : capsuleDistance(p, v.a, v.b, v.ra, v.rb);
    d = d === Infinity ? q : smoothMin(d, q, v.blend || 0.15);
  }
  return d;
}

function weld(vertices, precision = 1000) {
  const out = [];
  const map = new Map();
  const remap = [];
  for (const p of vertices) {
    const k = `${Math.round(p.x * precision)},${Math.round(p.y * precision)},${Math.round(p.z * precision)}`;
    let i = map.get(k);
    if (i === undefined) {
      i = out.length;
      out.push(p);
      map.set(k, i);
    }
    remap.push(i);
  }
  return { vertices: out, remap };
}

export function polygonizeVolumes(volumes, {
  spacing = 0.16,
  margin = 0.35,
  boneForPoint = () => 0,
} = {}) {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const v of volumes) {
    if (v.type === 'ellipsoid') {
      min.min(v.center.clone().sub(v.radius));
      max.max(v.center.clone().add(v.radius));
    } else {
      min.min(v.a.clone().min(v.b).addScalar(-Math.max(v.ra, v.rb)));
      max.max(v.a.clone().max(v.b).addScalar(Math.max(v.ra, v.rb)));
    }
  }
  min.subScalar(margin);
  max.addScalar(margin);
  const nx = Math.ceil((max.x - min.x) / spacing);
  const ny = Math.ceil((max.y - min.y) / spacing);
  const nz = Math.ceil((max.z - min.z) / spacing);
  const sample = new Float32Array((nx + 1) * (ny + 1) * (nz + 1));
  const index = (x, y, z) => x + (nx + 1) * (y + (ny + 1) * z);
  const p = new THREE.Vector3();
  for (let z = 0; z <= nz; z++) for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
    p.set(min.x + x * spacing, min.y + y * spacing, min.z + z * spacing);
    sample[index(x, y, z)] = volumeDistance(p, volumes);
  }
  const corner = [
    [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
  ];
  const verts = [];
  const pushTri = (a, b, c) => {
    const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const eps = 0.01;
    const grad = sdfGradient(centroid, volumes, eps);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if (normal.dot(grad) < 0) verts.push(a, c, b);
    else verts.push(a, b, c);
  };
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const cp = corner.map(([dx, dy, dz]) =>
      new THREE.Vector3(min.x + (x + dx) * spacing, min.y + (y + dy) * spacing, min.z + (z + dz) * spacing));
    const cv = corner.map(([dx, dy, dz]) => sample[index(x + dx, y + dy, z + dz)]);
    for (const tet of TETS) {
      const inside = tet.filter(i => cv[i] < 0);
      if (!inside.length || inside.length === 4) continue;
      const edgePoints = [];
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
        const a = tet[i], b = tet[j];
        if ((cv[a] < 0) === (cv[b] < 0)) continue;
        const t = cv[a] / (cv[a] - cv[b]);
        edgePoints.push(cp[a].clone().lerp(cp[b], t));
      }
      if (edgePoints.length === 3) pushTri(...edgePoints);
      else if (edgePoints.length === 4) {
        pushTri(edgePoints[0], edgePoints[1], edgePoints[2]);
        pushTri(edgePoints[0], edgePoints[2], edgePoints[3]);
      }
    }
  }
  const { vertices, remap } = weld(verts);
  const geometry = new THREE.BufferGeometry();
  const pos = new Float32Array(vertices.length * 3);
  const skin = new Uint16Array(vertices.length * 4);
  const weights = new Float32Array(vertices.length * 4);
  const uv = new Float32Array(vertices.length * 2);
  vertices.forEach((v, i) => {
    pos.set([v.x, v.y, v.z], i * 3);
    const inf = boneForPoint(v);
    if (typeof inf === 'number') {
      skin.set([inf, inf, inf, 0], i * 4);
      weights.set([1, 0, 0, 0], i * 4);
    } else {
      skin.set([...(inf.indices || [0, 0, 0, 0]).slice(0, 4)], i * 4);
      weights.set([...(inf.weights || [1, 0, 0, 0]).slice(0, 4)], i * 4);
    }
    uv.set([v.x * 0.08, v.z * 0.08], i * 2);
  });
  const indexArray = new Uint32Array(remap.length);
  remap.forEach((v, i) => { indexArray[i] = v; });
  const normal = new Float32Array(vertices.length * 3);
  const color = new Float32Array(vertices.length * 3);
  vertices.forEach((v, i) => {
    const n = sdfGradient(v, volumes);
    normal.set([n.x, n.y, n.z], i * 3);
    color.set([n.x * 0.5 + 0.5, n.y * 0.5 + 0.5, n.z * 0.5 + 0.5], i * 3);
  });
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skin, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
  geometry.userData.analyticNormalSample = vertices.length
    ? sdfGradient(vertices[0], volumes).toArray()
    : null;
  geometry.userData.analyticPositionSample = vertices.length
    ? vertices[0].toArray()
    : null;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
