import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';
import { assertCaptureCoverage } from './assert-capture.mjs';

const out = path.resolve('shots/park-content');
const expected = ['jeep-front.png', 'jeep-three-quarter.png'];
fs.mkdirSync(out, { recursive: true });
for (const file of expected) fs.rmSync(path.join(out, file), { force: true });
const renderStart = Date.now();
await run({ width: 1280, height: 720, hash: 'manual&tier=high&jeepStudio=1' }, async ({ page }) => {
  for (const [file, side] of [['jeep-front.png', 0], ['jeep-three-quarter.png', 5]]) {
    await page.evaluate((side) => {
      const g = window.__game;
      const b = g.jeep.bounds;
      const c = b.getCenter(g.camera.position.clone());
      g.camera.position.set(c.x + side, c.y + 2.2, c.z - 8);
      g.camera.lookAt(c.x, c.y + 0.7, c.z);
      g.camera.updateMatrixWorld();
      g.setPaused(true);
      g.renderOnce();
    }, side);
    await assertCaptureCoverage(page, 'jeep');
    await capture(page, path.join(out, file));
  }
});
for (const file of expected) {
  const target = path.join(out, file);
  if (!fs.existsSync(target)) throw new Error(`missing capture: ${target}`);
  if (fs.statSync(target).mtimeMs < renderStart) throw new Error(`stale capture: ${target}`);
}
finish(process.exitCode || 0);
