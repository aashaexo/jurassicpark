export async function assertCaptureCoverage(page, kind, options = {}) {
  const minCoverage = options.minCoverage ?? 0.05;
  return page.evaluate(({ kind, minCoverage, contain }) => {
    const g = window.__game;
    const subject = kind === 'dino' ? g.dinosaurs.creatures[0].mesh
      : kind === 'gate' ? g.gate.root
        : kind === 'fence' ? g.fence.root : g.jeep.root;
    if (!subject || !subject.visible) throw new Error(`capture subject missing/invisible: ${kind}`);
    for (let o = subject; o; o = o.parent) {
      if (!o.visible) throw new Error(`capture ancestor invisible: ${o.name || kind}`);
    }
    const V = subject.position.constructor;
    const min = new V(Infinity, Infinity, Infinity);
    const max = new V(-Infinity, -Infinity, -Infinity);
    subject.updateMatrixWorld(true);
    subject.traverse(o => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const p = o.geometry.attributes.position;
      const q = new V();
      for (let i = 0; i < p.count; i++) {
        q.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        min.min(q); max.max(q);
      }
    });
    if (!Number.isFinite(min.x) || min.x === Infinity) {
      throw new Error(`capture subject has empty geometry: ${kind}`);
    }
    const corners = [];
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y])
      for (const z of [min.z, max.z]) corners.push(new V(x, y, z));
    let behind = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of corners) {
      p.applyMatrix4(g.camera.matrixWorldInverse).applyMatrix4(g.camera.projectionMatrix);
      if (p.z < -1 || p.z > 1) behind++;
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    if (behind === corners.length) throw new Error(`capture subject behind camera: ${kind}`);
    const ix = Math.max(0, Math.min(1, x1) - Math.max(-1, x0));
    const iy = Math.max(0, Math.min(1, y1) - Math.max(-1, y0));
    const coverage = ix * iy / 4;
    const contained = corners.every(p => p.x >= -1 && p.x <= 1 &&
      p.y >= -1 && p.y <= 1);
    if (contain && !contained) {
      throw new Error(`capture subject is cropped: ${kind}`);
    }
    if (coverage < minCoverage) {
      throw new Error(`capture subject coverage ${coverage.toFixed(4)} below ${minCoverage}: ${kind}`);
    }
    return { kind, coverage, contained, bounds: { min: min.toArray(), max: max.toArray() } };
  }, { kind, minCoverage, contain: options.contain ?? false });
}
