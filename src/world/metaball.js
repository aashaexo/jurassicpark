import * as THREE from 'three';

const TRI_TABLE_BASE64 = '/////////////////////wAIA/////////////////8AAQn/////////////////AQgDCQgB/////////////wECCv////////////////8ACAMBAgr/////////////CQIKAAIJ/////////////wIIAwIKCAoJCP////////8DCwL/////////////////AAsCCAsA/////////////wEJAAIDC/////////////8BCwIBCQsJCAv/////////AwoBCwoD/////////////wAKAQAICggLCv////////8DCQADCwkLCgn/////////CQgKCggL/////////////wQHCP////////////////8EAwAHAwT/////////////AAEJCAQH/////////////wQBCQQHAQcDAf////////8BAgoIBAf/////////////AwQHAwAEAQIK/////////wkCCgkAAggEB/////////8CCgkCCQcCBwMHCQT/////CAQHAwsC/////////////wsEBwsCBAIABP////////8JAAEIBAcCAwv/////////BAcLCQQLCQsCCQIB/////wMKAQMLCgcIBP////////8BCwoBBAsBAAQHCwT/////BAcICQALCQsKCwAD/////wQHCwQLCQkLCv////////8JBQT/////////////////CQUEAAgD/////////////wAFBAEFAP////////////8IBQQIAwUDAQX/////////AQIKCQUE/////////////wMACAECCgQJBf////////8FAgoFBAIEAAL/////////AgoFAwIFAwUEAwQI/////wkFBAIDC/////////////8ACwIACAsECQX/////////AAUEAAEFAgML/////////wIBBQIFCAIICwQIBf////8KAwsKAQMJBQT/////////BAkFAAgBCAoBCAsK/////wUEAAUACwULCgsAA/////8FBAgFCAoKCAv/////////CQcIBQcJ/////////////wkDAAkFAwUHA/////////8ABwgAAQcBBQf/////////AQUDAwUH/////////////wkHCAkFBwoBAv////////8KAQIJBQAFAwAFBwP/////CAACCAIFCAUHCgUC/////wIKBQIFAwMFB/////////8HCQUHCAkDCwL/////////CQUHCQcCCQIAAgcL/////wIDCwABCAEHCAEFB/////8LAgELAQcHAQX/////////CQUICAUHCgEDCgML/////wUHAAUACQcLAAEACgsKAP8LCgALAAMKBQAIAAcFBwD/CwoFBwsF/////////////woGBf////////////////8ACAMFCgb/////////////CQABBQoG/////////////wEIAwEJCAUKBv////////8BBgUCBgH/////////////AQYFAQIGAwAI/////////wkGBQkABgACBv////////8FCQgFCAIFAgYDAgj/////AgMLCgYF/////////////wsACAsCAAoGBf/////////8AAQkCAwsFCgb/////////BQoGAQkCCQsCCQgL/////wYDCwYFAwUBA/////////8ACAsACwUABQEFCwb/////AwsGAAMGAAYFAAUJ/////wYFCQYJCwsJCP////////8FCgYEBwj/////////////BAMABAcDBgUK/////////wEJAAUKBggEB/////////8KBgUBCQcBBwMHCQT/////BgECBgUBBAcI/////////wECBQUCBgMABAMEB/////8IBAcJAAUABgUAAgb/////BwMJBwkEAwIJBQkGAgYJ/wMLAgcIBAoGBf////////8FCgYEBwIEAgACBwv/////AAEJBAcIAgMLBQoG/////wkCAQkLAgkECwcLBAUKBv8IBAcDCwUDBQEFCwb/////BQELBQsGAQALBwsEAAQL/wAFCQAGBQADBgsGAwgEB/8GBQkGCQsEBwkHCwn/////CgQJBgQK/////////////wQKBgQJCgAIA/////////8KAAEKBgAGBAD/////////CAMBCAEGCAYEBgEK/////wEECQECBAIGBP////////8DAAgBAgkCBAkCBgT/////AAIEBAIG/////////////wgDAggCBAQCBv////////8KBAkKBgQLAgP/////////AAgCAggLBAkKBAoG/////wMLAgABBgAGBAYBCv////8GBAEGAQoECAECAQsICwH/CQYECQMGCQEDCwYD/////wgLAQgBAAsGAQkBBAYEAf8DCwYDBgAABgT/////////BgQICwYI/////////////wcKBgcICggJCv////////8ABwMACgcACQoGBwr/////CgYHAQoHAQcIAQgA/////woGBwoHAQEHA/////////8BAgYBBggBCAkIBgf/////AgYJAgkBBgcJAAkDBwMJ/wcIAAcABgYAAv////////8HAwIGBwL/////////////AgMLCgYICggJCAYH/////wIABwIHCwAJBwYHCgkKB/8BCAABBwgBCgcGBwoCAwv/CwIBCwEHCgYBBgcB/////wgJBggGBwkBBgsGAwEDBv8ACQELBgf/////////////BwgABwAGAwsACwYA/////wcLBv////////////////8HBgv/////////////////AwAICwcG/////////////wABCQsHBv////////////8IAQkIAwELBwb/////////CgECBgsH/////////////wECCgMACAYLB/////////8CCQACCgkGCwf/////////BgsHAgoDCggDCgkI/////wcCAwYCB/////////////8HAAgHBgAGAgD/////////AgcGAgMHAAEJ/////////wEGAgEIBgEJCAgHBv////8KBwYKAQcBAwf/////////CgcGAQcKAQgHAQAI/////wADBwAHCgAKCQYKB/////8HBgoHCggICgn/////////BggECwgG/////////////wMGCwMABgAEBv////////8IBgsIBAYJAAH/////////CQQGCQYDCQMBCwMG/////wYIBAYLCAIKAf////////8BAgoDAAsABgsABAb/////BAsIBAYLAAIJAgoJ/////woJAwoDAgkEAwsDBgQGA/8IAgMIBAIEBgL/////////AAQCBAYC/////////////wEJAAIDBAIEBgQDCP////8BCQQBBAICBAb/////////CAEDCAYBCAQGBgoB/////woBAAoABgYABP////////8EBgMEAwgGCgMAAwkKCQP/CgkEBgoE/////////////wQJBQcGC/////////////8ACAMECQULBwb/////////BQABBQQABwYL/////////wsHBggDBAMFBAMBBf////8JBQQKAQIHBgv/////////BgsHAQIKAAgDBAkF/////wcGCwUECgQCCgQAAv////8DBAgDBQQDAgUKBQILBwb/BwIDBwYCBQQJ/////////wkFBAAIBgAGAgYIB/////8DBgIDBwYBBQAFBAD/////BgIIBggHAgEIBAgFAQUI/wkFBAoBBgEHBgEDB/////8BBgoBBwYBAAcIBwAJBQT/BAAKBAoFAAMKBgoHAwcK/wcGCgcKCAUECgQICv////8GCQUGCwkLCAn/////////AwYLAAYDAAUGAAkF/////wALCAAFCwABBQUGC/////8GCwMGAwUFAwH/////////AQIKCQULCQsICwUG/////wALAwAGCwAJBgUGCQECCv8LCAULBQYIAAUKBQIAAgX/BgsDBgMFAgoDCgUD/////wUICQUCCAUGAgMIAv////8JBQYJBgAABgL/////////AQUIAQgABQYIAwgCBgII/wEFBgIBBv////////////8BAwYBBgoDCAYFBgkICQb/CgEACgAGCQUABQYA/////wADCAUGCv////////////8KBQb/////////////////CwUKBwUL/////////////wsFCgsHBQgDAP////////8FCwcFCgsBCQD/////////CgcFCgsHCQgBCAMB/////wsBAgsHAQcFAf////////8ACAMBAgcBBwUHAgv/////CQcFCQIHCQACAgsH/////wcFAgcCCwUJAgMCCAkIAv8CBQoCAwUDBwX/////////CAIACAUCCAcFCgIF/////wkAAQUKAwUDBwMKAv////8JCAIJAgEIBwIKAgUHBQL/AQMFAwcF/////////////wAIBwAHAQEHBf////////8JAAMJAwUFAwf/////////CQgHBQkH/////////////wUIBAUKCAoLCP////////8FAAQFCwAFCgsLAwD/////AAEJCAQKCAoLCgQF/////woLBAoEBQsDBAkEAQMBBP8CBQECCAUCCwgEBQj/////AAQLAAsDBAULAgsBBQEL/wACBQAFCQILBQQFCAsIBf8JBAUCCwP/////////////AgUKAwUCAwQFAwgE/////wUKAgUCBAQCAP////////8DCgIDBQoDCAUEBQgAAQn/BQoCBQIEAQkCCQQC/////wgEBQgFAwMFAf////////8ABAUBAAX/////////////CAQFCAUDCQAFAAMF/////wkEBf////////////////8ECwcECQsJCgv/////////AAgDBAkHCQsHCQoL/////wEKCwELBAEEAAcEC/////8DAQQDBAgBCgQHBAsKCwT/BAsHCQsECQILCQEC/////wkHBAkLBwkBCwILAQAIA/8LBwQLBAICBAD/////////CwcECwQCCAMEAwIE/////wIJCgIHCQIDBwcECf////8JCgcJBwQKAgcIBwACAAf/AwcKAwoCBwQKAQoABAAK/wEKAggHBP////////////8ECQEEAQcHAQP/////////BAkBBAEHAAgBCAcB/////wQAAwcEA/////////////8ECAf/////////////////CQoICgsI/////////////wMACQMJCwsJCv////////8AAQoACggICgv/////////AwEKCwMK/////////////wECCwELCQkLCP////////8DAAkDCQsBAgkCCwn/////AAILCAAL/////////////wMCC/////////////////8CAwgCCAoKCAn/////////CQoCAAkC/////////////wIDCAIICgABCAEKCP////8BCgL/////////////////AQMICQEI/////////////wAJAf////////////////8AAwj//////////////////////////////////////w==';
const TRI_TABLE = new Int8Array([...atob(TRI_TABLE_BASE64.replace('/////////8AAQk', '////////8AAQk'))]
  .map(c => c.charCodeAt(0) > 127 ? c.charCodeAt(0) - 256 : c.charCodeAt(0)));
const EDGE_TABLE = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  for (let j = 0; j < 16 && TRI_TABLE[i * 16 + j] >= 0; j++) EDGE_TABLE[i] |= 1 << TRI_TABLE[i * 16 + j];
}
const EDGE_CORNERS = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

function capsuleDistance(p, a, b, ra, rb = ra) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const lengthSq = abx * abx + aby * aby + abz * abz;
  const t = THREE.MathUtils.clamp(
    (apx * abx + apy * aby + apz * abz) / Math.max(1e-8, lengthSq), 0, 1,
  );
  const dx = p.x - (a.x + abx * t);
  const dy = p.y - (a.y + aby * t);
  const dz = p.z - (a.z + abz * t);
  return Math.hypot(dx, dy, dz) - (ra + (rb - ra) * t);
}

function ellipsoidDistance(p, c, r) {
  const qx = p.x - c.x, qy = p.y - c.y, qz = p.z - c.z;
  const k0 = Math.hypot(qx / r.x, qy / r.y, qz / r.z);
  const k1 = Math.hypot(qx / (r.x * r.x), qy / (r.y * r.y), qz / (r.z * r.z));
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

function weld(vertices, precision = 500) {
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
  const edgeCache = new Map();
  let orientationFlips = 0;
  const pushTri = (a, b, c) => {
    const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const eps = 0.01;
    const grad = sdfGradient(centroid, volumes, eps);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if (normal.lengthSq() < 1e-12) return;
    if (normal.dot(grad) < 0) {
      orientationFlips++;
      verts.push(a, c, b);
    }
    else verts.push(a, b, c);
  };
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const cp = corner.map(([dx, dy, dz]) =>
      new THREE.Vector3(min.x + (x + dx) * spacing, min.y + (y + dy) * spacing, min.z + (z + dz) * spacing));
    const cv = corner.map(([dx, dy, dz]) => sample[index(x + dx, y + dy, z + dz)]);
    let cubeIndex = 0;
    for (let i = 0; i < 8; i++) if (cv[i] < 0) cubeIndex |= 1 << i;
    const edgeMask = EDGE_TABLE[cubeIndex];
    if (!edgeMask) continue;
    const edgePoints = new Array(12);
    for (let edge = 0; edge < 12; edge++) {
      if (!(edgeMask & (1 << edge))) continue;
      const [a, b] = EDGE_CORNERS[edge];
      const [ax, ay, az] = corner[a];
      const [bx, by, bz] = corner[b];
      const ka = `${x + ax},${y + ay},${z + az}`;
      const kb = `${x + bx},${y + by},${z + bz}`;
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      let point = edgeCache.get(key);
      if (!point) {
        const t = cv[a] / (cv[a] - cv[b]);
        point = cp[a].clone().lerp(cp[b], t);
        edgeCache.set(key, point);
      }
      edgePoints[edge] = point;
    }
    for (let i = 0; i < 16; i += 3) {
      const a = TRI_TABLE[cubeIndex * 16 + i];
      if (a < 0) break;
      pushTri(
        edgePoints[a],
        edgePoints[TRI_TABLE[cubeIndex * 16 + i + 2]],
        edgePoints[TRI_TABLE[cubeIndex * 16 + i + 1]],
      );
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
  const filtered = [];
  const triangleKeys = new Set();
  for (let i = 0; i < remap.length; i += 3) {
    const a = remap[i], b = remap[i + 1], c = remap[i + 2];
    if (a === b || b === c || c === a) continue;
    const key = [a, b, c].sort((u, v) => u - v).join(':');
    if (triangleKeys.has(key)) continue;
    triangleKeys.add(key);
    filtered.push(a, b, c);
  }
  const indexArray = new Uint32Array(filtered);
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
  geometry.userData.orientationFlips = orientationFlips;
  geometry.userData.validate = () => {
    const positions = geometry.getAttribute('position');
    const index = geometry.getIndex();
    let disagreement = 0;
    let minAlignment = Infinity;
    let degenerate = 0;
    let nonFinite = 0;
    const edges = new Map();
    for (let i = 0; i < index.count; i += 3) {
      const ia = index.getX(i);
      const ib = index.getX(i + 1);
      const ic = index.getX(i + 2);
      const a = new THREE.Vector3().fromBufferAttribute(positions, ia);
      const b = new THREE.Vector3().fromBufferAttribute(positions, ib);
      const c = new THREE.Vector3().fromBufferAttribute(positions, ic);
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      for (const point of [a, b, c]) {
        if (![point.x, point.y, point.z].every(Number.isFinite)) nonFinite++;
      }
      if (n.lengthSq() < 1e-12) degenerate++;
      const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      const alignment = n.dot(sdfGradient(centroid, volumes));
      minAlignment = Math.min(minAlignment, alignment);
      if (alignment < -1e-4) disagreement++;
      [[ia, ib], [ib, ic], [ic, ia]].forEach(([u, v]) => {
        const key = u < v ? `${u}:${v}` : `${v}:${u}`;
        edges.set(key, (edges.get(key) || 0) + 1);
      });
    }
    let boundary = 0;
    let nonManifold = 0;
    for (const count of edges.values()) {
      if (count === 1) boundary++;
      else if (count !== 2) nonManifold++;
    }
    const normalAttr = geometry.getAttribute('normal');
    for (let i = 0; i < normalAttr.count * 3; i++) {
      if (!Number.isFinite(normalAttr.array[i])) nonFinite++;
    }
    return {
      triangles: index.count / 3,
      disagreement,
      boundary,
      nonManifold,
      degenerate,
      nonFinite,
      orientationFlips,
      minAlignment,
    };
  };
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
