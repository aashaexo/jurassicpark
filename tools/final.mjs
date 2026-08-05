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
  console.log('warming renderer and vegetation buckets');
  await page.waitForTimeout(3000);
  for (const [name, pos, target] of shots) {
    console.log(`capturing ${name}`);
    const settled = await page.evaluate(([name, pos, target]) => {
      const g = window.__game;
      g.setPaused(true);
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
      return g.camera.position.toArray();
    }, [name, pos, target]);
    await page.waitForTimeout(700);
    const actual = await page.evaluate(() => window.__game.camera.position.toArray());
    const error = Math.hypot(actual[0] - settled[0], actual[1] - settled[1], actual[2] - settled[2]);
    if (error > 0.05) throw new Error(`${name} camera moved ${error.toFixed(3)}m after settling`);
    const shotStart = Date.now();
    await Promise.race([
      capture(page, path.join(out, name)),
      new Promise((_, reject) => setTimeout(() =>
        reject(new Error(`capture timeout: ${name}`)), 300_000)),
    ]);
    console.log(`captured ${name} in ${Date.now() - shotStart} ms camera=${actual.map(v => v.toFixed(3)).join(',')}`);
  }
});
for (const [name] of shots) {
  const file = path.join(out, name);
  if (!fs.existsSync(file) || fs.statSync(file).mtimeMs < start) {
    throw new Error(`stale or missing final capture: ${file}`);
  }
}
finish(process.exitCode || 0);
