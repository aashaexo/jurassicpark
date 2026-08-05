import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/park-content');
fs.mkdirSync(out, { recursive: true });
await run({ width: 1280, height: 720, hash: 'manual&tier=high' }, async ({ page }) => {
  const shots = [
    ['gate-eye.png', [0, 2.1, -289], [0, 4.5, -304]],
    ['gate-left.png', [-7, 3.0, -287], [0, 4.5, -304]],
    ['gate-through.png', [0, 2.1, -311], [0, 4.5, -304]],
  ];
  for (const [name, position, target] of shots) {
    await page.evaluate(([p, t]) => {
      const g = window.__game;
      g.camera.position.set(...p);
      g.camera.lookAt(...t);
      g.camera.updateMatrixWorld();
      g.setPaused(true);
      g.renderOnce();
    }, [position, target]);
    await capture(page, path.join(out, name));
  }
});
finish(process.exitCode || 0);
