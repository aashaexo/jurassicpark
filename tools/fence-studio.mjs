import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';
import { assertCaptureCoverage } from './assert-capture.mjs';

const out = path.resolve('shots/park-content');
const expected = ['fence-front.png', 'fence-three-quarter.png'];
fs.mkdirSync(out, { recursive: true });
for (const file of expected) fs.rmSync(path.join(out, file), { force: true });
const renderStart = Date.now();
await run({ width: 1280, height: 720, hash: 'manual&tier=high&fenceStudio=1' }, async ({ page }) => {
  for (const [file, side] of [['fence-front.png', 0], ['fence-three-quarter.png', 8]]) {
    await page.evaluate((side) => {
      const g = window.__game;
      g.fence.trimBays(3);
      g.camera.position.set(g.fence.root.position.x + (side ? 10 : 8),
        g.fence.root.position.y + 3.0, g.fence.root.position.z + (side ? -8 : 8));
      g.camera.lookAt(g.fence.root.position.x, g.fence.root.position.y + 2,
        g.fence.root.position.z + 8);
      g.camera.updateMatrixWorld();
      g.setPaused(true);
      g.renderOnce();
    }, side);
    await assertCaptureCoverage(page, 'fence');
    await capture(page, path.join(out, file));
  }
});
for (const file of expected) {
  const target = path.join(out, file);
  if (!fs.existsSync(target)) throw new Error(`missing capture: ${target}`);
  if (fs.statSync(target).mtimeMs < renderStart) throw new Error(`stale capture: ${target}`);
}
finish(process.exitCode || 0);
