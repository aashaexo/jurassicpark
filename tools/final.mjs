import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/final');
fs.mkdirSync(out, { recursive: true });
const shots = [
  ['gate-approach.png', [7, -268], [7, -304]],
  ['brachiosaurus-reveal.png', [-45, -360], [-20, -326]],
  ['fence-line.png', [22, -300], [30, -300]],
  ['jeep-road.png', [7, -302], [7, -306]],
  ['triceratops-trail.png', [-8, -286], [-8, -296]],
  ['gallimimus-flock.png', [34, -292], [42, -300]],
  ['dilophosaurus-undergrowth.png', [10, -280], [13, -286]],
  ['trex-distant.png', [52, -340], [70, -360]],
  ['valley-establishing.png', [0, -250], [0, -330]],
];
for (const [name] of shots) fs.rmSync(path.join(out, name), { force: true });
const start = Date.now();
await run({ width: 1280, height: 720, hash: 'manual&tier=high&park=1' }, async ({ page }) => {
  for (const [name, pos, target] of shots) {
    console.log(`capturing ${name}`);
    await page.evaluate(([name, pos, target]) => {
      const g = window.__game;
      g.gate.root.visible = name.includes('gate');
      g.fence.root.visible = name.includes('fence');
      g.jeep.root.visible = name.includes('jeep');
      g.dinosaurs.root.visible = !name.includes('gate') &&
        !name.includes('fence') && !name.includes('jeep');
      const y = g.terrain.height(pos[0], pos[1]) + 1.7;
      const ty = g.terrain.height(target[0], target[1]) + 2.5;
      g.camera.position.set(pos[0], y, pos[1]);
      g.camera.lookAt(target[0], ty, target[1]);
      g.camera.updateMatrixWorld();
    }, [name, pos, target]);
    await Promise.race([
      capture(page, path.join(out, name)),
      new Promise((_, reject) => setTimeout(() =>
        reject(new Error(`capture timeout: ${name}`)), 30_000)),
    ]);
  }
});
for (const [name] of shots) {
  const file = path.join(out, name);
  if (!fs.existsSync(file) || fs.statSync(file).mtimeMs < start) {
    throw new Error(`stale or missing final capture: ${file}`);
  }
}
finish(process.exitCode || 0);
