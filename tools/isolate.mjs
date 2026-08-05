import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('media/diagnostic-jungle-base.png');
await run({ width: 1600, height: 900, hash: 'manual&tier=high' }, async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.veg.root.visible = false;
    g.ruins.root.visible = false;
    g.water.root.visible = false;
    g.goTo(0.34);
    g.warp(1.5);
  });
  await capture(page, out);
  console.log(`→ ${out}`);
});
finish(process.exitCode || 0);
