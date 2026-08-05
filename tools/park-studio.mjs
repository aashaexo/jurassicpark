import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/park-content');
const expected = ['studio-front.png', 'studio-three-quarter.png', 'studio-sign.png'];
fs.mkdirSync(out, { recursive: true });
for (const file of expected) fs.rmSync(path.join(out, file), { force: true });
const renderStart = Date.now();

await run({ width: 1280, height: 720, hash: 'manual&tier=high&parkStudio=1' }, async ({ page }) => {
  const poses = [
    ['studio-front.png', 'front'],
    ['studio-three-quarter.png', 'three-quarter'],
    ['studio-sign.png', 'sign'],
  ];
  for (const [file, mode] of poses) {
    await page.evaluate((mode) => {
      const g = window.__game;
      g.sky.setSun(38, 332);
      g.canopy.setSun(g.sky.sunDir);
      const box = g.gate.bounds.clone();
      const center = box.getCenter(g.camera.position.clone());
      const size = box.getSize(g.camera.position.clone());
      const fov = g.camera.fov * Math.PI / 180;
      if (mode === 'sign') {
        const sign = center.clone().set(7, g.terrain.height(7, -304) + 8.9, -304);
        g.camera.position.copy(sign).add(new sign.constructor(0, 1.0, -7));
        g.camera.lookAt(sign);
      } else {
        const span = Math.max(size.x, size.y);
        const distance = span / (2 * Math.tan(fov * 0.5)) * 1.25;
        const offset = mode === 'front'
          ? center.clone().set(0, 0.5, -distance)
          : center.clone().set(distance * 0.72, 0.5, -distance * 0.72);
        g.camera.position.copy(center).add(offset);
        g.camera.lookAt(center.clone().add(new center.constructor(0, 0.2, 0)));
      }
      g.camera.updateMatrixWorld();
      g.setPaused(true);
      g.renderOnce();
    }, mode);
    await capture(page, path.join(out, file));
  }
});
for (const file of expected) {
  const target = path.join(out, file);
  if (!fs.existsSync(target)) throw new Error(`missing capture: ${target}`);
  if (fs.statSync(target).mtimeMs < renderStart) throw new Error(`stale capture: ${target}`);
}
finish(process.exitCode || 0);
