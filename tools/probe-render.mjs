import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const mode = process.argv[2] || 'baseline';
await run({ width: 1280, height: 720, hash: 'manual&tier=high&park=1' }, async ({ page }) => {
  await page.evaluate((mode) => {
    const g = window.__game;
    if (mode === 'species') g.dinosaurs.root.visible = false;
    if (mode === 'gate') g.gate.root.visible = false;
    if (mode === 'fence') g.fence.root.visible = false;
    if (mode === 'jeep') g.jeep.root.visible = false;
    if (mode === 'shadows') g.sun.castShadow = false;
    g.camera.position.set(7, g.terrain.height(7, -268) + 1.7, -268);
    g.camera.lookAt(7, g.terrain.height(7, -304) + 2.5, -304);
    g.camera.updateMatrixWorld();
    console.log(`[probe] before renderOnce mode=${mode}`);
    g.setPaused(true);
  }, mode);
  await capture(page, `/tmp/probe-${mode}.png`);
  console.log(`[probe] completed mode=${mode}`);
});
finish(process.exitCode || 0);
