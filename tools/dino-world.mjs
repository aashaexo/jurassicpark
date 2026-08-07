import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/dinosaurs/in-world-brachiosaurus.png');
await run({ width: 1600, height: 900, hash: 'manual&tier=high' }, async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.goTo(0.84);
    g.warp(1.5);
    const p = g.camera.position;
    g.camera.position.set(p.x - 1, p.y + 0.1, p.z + 2);
    g.camera.lookAt(-10, 5.5, -326);
    g.camera.updateMatrixWorld();
  });
  await capture(page, out);
  console.log(`dino stats: ${JSON.stringify(await page.evaluate(() => window.__game.dinosaurs.stats()))}`);
  console.log(`→ ${out}`);
});
finish(process.exitCode || 0);
