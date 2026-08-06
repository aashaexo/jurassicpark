import path from 'node:path';
import fs from 'node:fs';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/gameplay');
fs.mkdirSync(path.join(out, 'route'), { recursive: true });
const started = Date.now();
const samples = [0.02, 0.10, 0.18, 0.26, 0.34, 0.42, 0.50, 0.58, 0.66, 0.74, 0.82, 0.90, 0.98]
  .map(t => [`t-${t.toFixed(2)}`, t]);
await run({ width: 1280, height: 720, hash: 'manual&tier=high' }, async ({ page }) => {
  for (const [name, t] of samples) {
    const info = await page.evaluate((t) => {
      const g = window.__game;
      g.goTo(t);
      g.warp(1.2);
      g.setPaused(true);
      g.dinosaurs.root.updateMatrixWorld(true);
      g.scene.updateMatrixWorld(true);
      g.camera.updateMatrixWorld();
      const T = window.THREE;
      const camera = g.camera;
      const values = g.dinosaurs.creatures.map(c => {
        const box = new T.Box3().setFromObject(c.group);
        const points = [];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) points.push(new T.Vector3(x, y, z)
            .applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix));
        const x0 = Math.max(-1, Math.min(...points.map(p => p.x)));
        const x1 = Math.min(1, Math.max(...points.map(p => p.x)));
        const y0 = Math.max(-1, Math.min(...points.map(p => p.y)));
        const y1 = Math.min(1, Math.max(...points.map(p => p.y)));
        const head = c.species === 'brachiosaurus'
          ? c.group.localToWorld(new T.Vector3(0, 11.8, -6.0))
          : new T.Vector3((box.min.x + box.max.x) * 0.5, box.max.y - 0.25,
            (box.min.z + box.max.z) * 0.5);
        const ray = new T.Raycaster(camera.position, head.clone().sub(camera.position).normalize(), 0, 1000);
        const visibleHit = ray.intersectObjects(g.scene.children, true).find(hit => {
          for (let p = hit.object; p; p = p.parent) if (p.visible === false) return false;
          return true;
        });
        let headClear = false;
        if (visibleHit) {
          for (let p = visibleHit.object; p; p = p.parent) {
            if (p === c.group) { headClear = true; break; }
          }
        }
        return {
          species: c.species,
          distance: c.group.position.distanceTo(camera.position),
          coverage: Math.max(0, x1 - x0) * Math.max(0, y1 - y0) / 4,
          headClear,
        };
      });
      const forward = new T.Vector3();
      camera.getWorldDirection(forward);
      const dinosaurs = Object.fromEntries([...new Set(values.map(v => v.species))].map(species => {
        const same = values.filter(v => v.species === species);
        return [species, {
          nearestDistance: Math.min(...same.map(v => v.distance)),
          maxCoverage: Math.max(...same.map(v => v.coverage)),
          headClear: same.some(v => v.headClear),
        }];
      }));
      return { camera: camera.position.toArray(), forward: forward.toArray(), dinosaurs };
    }, t);
    console.log(`${name}: ${JSON.stringify(info)}`);
    await capture(page, path.join(out, 'route', `${name}.png`));
  }
});
for (const [name] of samples) {
  const file = path.join(out, 'route', `${name}.png`);
  const stat = fs.statSync(file);
  if (stat.mtimeMs < started) throw new Error(`stale gameplay capture: ${file}`);
}
finish(process.exitCode || 0);
