import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const name = process.argv[2] || 'brachiosaurus';
const out = path.resolve('shots/dinosaurs', name);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await run({
  width: 1280,
  height: 720,
  hash: `manual&tier=high&dino=${name}`,
}, async ({ page, errs }) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.camera.position.set(7, 4.8, 9);
    g.camera.lookAt(0, 5.1, 0);
    g.camera.updateMatrixWorld();
    g.setPaused(true);
    g.renderOnce();
  });
  await capture(page, path.join(out, 'turntable.png'));

  const frames = [];
  for (let i = 0; i < 8; i++) {
    await page.evaluate((i) => {
      const g = window.__game;
      g.setPaused(false);
      g.dinosaurs.creatures[0].speed = 0.8;
      g.dinosaurs.update(0.18);
      g.setPaused(true);
      g.camera.position.set(6.5, 4.5, 8);
      g.camera.lookAt(0, 4.9, 0);
      g.camera.updateMatrixWorld();
      g.renderOnce();
    }, i);
    const file = path.join(out, `walk-${String(i).padStart(2, '0')}.png`);
    await capture(page, file);
    frames.push(path.basename(file));
  }
  const stats = await page.evaluate(() => ({
    dino: window.__game.dinosaurs.stats(),
    render: window.__game.info(),
  }));
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({
    species: name, frames, stats, errors: errs,
  }, null, 2));
});
finish(process.exitCode || 0);
