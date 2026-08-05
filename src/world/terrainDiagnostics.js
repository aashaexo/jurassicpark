import * as THREE from 'three';

export function validateTerrainGroup(group) {
  group.updateMatrixWorld(true);
  const chunks = group.children.filter((mesh) => mesh.name.startsWith('terrain-chunk-'));
  const boxes = chunks.map((mesh) => {
    mesh.geometry.computeBoundingBox();
    return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
  });
  const bounds = boxes.reduce((total, box) => total.union(box), new THREE.Box3());
  const records = chunks.map((mesh, i) => {
    const sphere = new THREE.Sphere();
    boxes[i].getBoundingSphere(sphere);
    const match = mesh.name.match(/terrain-chunk-(\d+)-(\d+)-/);
    return { mesh, sphere, cx: Number(match[1]), cz: Number(match[2]) };
  });
  const failures = [];
  const width = bounds.max.x - bounds.min.x;
  const depth = bounds.max.z - bounds.min.z;
  if (width < 590 || width > 610 || depth < 590 || depth > 610) {
    failures.push(`terrain bounds are ${width.toFixed(2)} x ${depth.toFixed(2)}, expected approximately 600 x 600`);
  }
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i], b = records[j];
      const distance = a.sphere.center.distanceTo(b.sphere.center);
      if (distance < 1) failures.push(`${a.mesh.name} and ${b.mesh.name} share a world center`);
      const gridDistance = Math.max(Math.abs(a.cx - b.cx), Math.abs(a.cz - b.cz));
      const overlap = a.sphere.radius + b.sphere.radius - distance;
      if (gridDistance > 1 && overlap > 2) {
        failures.push(`${a.mesh.name} and ${b.mesh.name} overlap by ${overlap.toFixed(2)}m`);
      }
    }
  }
  return {
    ok: failures.length === 0,
    failures,
    bounds: {
      min: bounds.min.toArray(),
      max: bounds.max.toArray(),
      width,
      depth,
    },
    chunks: records.map(({ mesh, sphere, cx, cz }) => ({
      name: mesh.name,
      center: sphere.center.toArray(),
      radius: sphere.radius,
      cx,
      cz,
    })),
  };
}
