import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/park-content');
fs.mkdirSync(out, { recursive: true });
await run({ width: 1280, height: 720, hash: 'manual&tier=high&park=1' }, async ({ page }) => {
  const shots = [
    ['gate-eye.png', 7, -268, -304],
    ['gate-left.png', 1, -266, -304],
    ['gate-through.png', 7, -268, -304],
  ];
  for (const [name, x, z, targetZ] of shots) {
    await page.evaluate(([name, x, z, targetZ]) => {
      const g = window.__game;
      const y = g.terrain.height(x, z) + 1.7;
      const targetY = g.terrain.height(7, targetZ) + 4.2;
      g.camera.position.set(x, y, z);
      g.camera.lookAt(7, targetY, targetZ);
      g.camera.updateMatrixWorld();
      g.setPaused(true);
      g.renderOnce();
    }, [name, x, z, targetZ]);
    await capture(page, path.join(out, name));
  }
});
finish(process.exitCode || 0);
