import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/park-content');
fs.mkdirSync(out, { recursive: true });
const expected = ['gate-eye.png', 'gate-left.png', 'gate-through.png'];
for (const file of expected) fs.rmSync(path.join(out, file), { force: true });
const renderStart = Date.now();
await run({ width: 1280, height: 720, hash: 'manual&tier=high&park=1' }, async ({ page }) => {
  const shots = [
    ['gate-eye.png', 7, -268, 7, -304],
    ['gate-left.png', 1, -274, 7, -304],
    ['gate-through.png', 7, -312, 7, -304],
  ];
  for (const [name, x, z, targetX, targetZ] of shots) {
    await page.evaluate(([name, x, z, targetX, targetZ]) => {
      const g = window.__game;
      const y = g.terrain.height(x, z) + 1.7;
      const targetY = g.terrain.height(targetX, targetZ) + 4.2;
      g.camera.position.set(x, y, z);
      g.camera.lookAt(targetX, targetY, targetZ);
      g.camera.updateMatrixWorld();
      g.setPaused(true);
      g.renderOnce();
    }, [name, x, z, targetX, targetZ]);
    await capture(page, path.join(out, name));
  }
});
for (const file of expected) {
  const target = path.join(out, file);
  if (!fs.existsSync(target)) throw new Error(`missing capture: ${target}`);
  const mtime = fs.statSync(target).mtimeMs;
  if (mtime < renderStart) throw new Error(`stale capture: ${target}`);
}
finish(process.exitCode || 0);
