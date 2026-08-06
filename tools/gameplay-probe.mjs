import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/gameplay');
const samples = [
  ['trailhead', 0.02],
  ['clearing', 0.84],
  ['mid-trail', 0.62],
];
await run({ width: 1280, height: 720, hash: 'manual&tier=high' }, async ({ page }) => {
  for (const [name, t] of samples) {
    const info = await page.evaluate((t) => {
      const g = window.__game;
      g.goTo(t);
      g.warp(1.2);
      g.setPaused(true);
      g.dinosaurs.root.updateMatrixWorld(true);
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
        return {
          species: c.species,
          distance: c.group.position.distanceTo(camera.position),
          coverage: Math.max(0, x1 - x0) * Math.max(0, y1 - y0) / 4,
        };
      });
      const forward = new T.Vector3();
      camera.getWorldDirection(forward);
      return { camera: camera.position.toArray(), forward: forward.toArray(), dinosaurs: values };
    }, t);
    console.log(`${name}: ${JSON.stringify(info)}`);
    await capture(page, path.join(out, `${name}.png`));
  }
});
finish(process.exitCode || 0);
