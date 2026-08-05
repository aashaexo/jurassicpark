import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const name = process.argv[2] || 'brachiosaurus';
const debug = process.argv[3] === 'normal';
const out = path.resolve('shots/dinosaurs', name);
if (!debug) fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await run({
  width: 1280,
  height: 720,
  hash: `manual&tier=high&dino=${name}${debug ? '&debug=normal' : ''}`,
}, async ({ page, errs }) => {
  const assertMode = async (expected) => {
    await page.evaluate((expected) => {
      const actual = window.__game?.creatures?.debugNormals;
      if (actual !== expected) {
        throw new Error(`dinosaur debug mode mismatch: expected ${expected}, got ${actual}`);
      }
    }, expected);
  };
  await assertMode(debug);
  const frames = [];
  if (debug) {
    await page.evaluate(() => {
      const g = window.__game;
      g.camera.position.set(7, 4.8, 9);
      g.camera.lookAt(0, 5.1, 0);
      g.camera.updateMatrixWorld();
      g.setPaused(true);
      g.renderOnce();
    });
    await capture(page, path.join(out, 'normal-debug.png'));
  } else {
  const poses = [
    ['side.png', [7, 4.8, 9], [0, 5.1, 0]],
    ['three-quarter-front.png', [-8, 5.4, 8], [0, 5.2, 0]],
    ['low-hero.png', [6, 2.4, 8], [0, 6.5, -1]],
  ];
  for (const [file, position, target] of poses) {
    await assertMode(false);
    await page.evaluate(([position, target]) => {
      const g = window.__game;
      g.camera.position.set(...position);
      g.camera.lookAt(...target);
      g.camera.updateMatrixWorld();
      g.setPaused(true);
      g.renderOnce();
    }, [position, target]);
    await capture(page, path.join(out, file));
  }
  await page.evaluate(() => {
    const g = window.__game;
    g.camera.position.set(7, 4.8, 9);
    g.camera.lookAt(0, 5.1, 0);
    g.camera.updateMatrixWorld();
    g.setPaused(true);
    g.renderOnce();
  });
  await capture(page, path.join(out, debug ? 'normal-debug.png' : 'turntable.png'));

  for (let i = 0; i < 8; i++) {
    await assertMode(false);
    await page.evaluate((i) => {
      const g = window.__game;
      g.setPaused(false);
      g.dinosaurs.creatures[0].speed = 0.8;
      g.dinosaurs.creatures[0].update(0.18, { walk: true });
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
  }
  const stats = await page.evaluate(() => ({
    dino: window.__game.dinosaurs.stats(),
    render: window.__game.info(),
    validation: window.__game.dinosaurs.creatures[0].mesh.geometry.userData.validate(),
    normal: (() => {
      const a = window.__game.dinosaurs.creatures[0].mesh.geometry.attributes.normal.array;
      let nan = 0, min = Infinity, max = -Infinity;
      for (const v of a) {
        if (!Number.isFinite(v)) nan++;
        min = Math.min(min, v); max = Math.max(max, v);
      }
      const geometry = window.__game.dinosaurs.creatures[0].mesh.geometry;
      return {
        count: a.length, nan, min, max,
        sample: geometry.userData.analyticNormalSample,
        position: geometry.userData.analyticPositionSample,
        first: Array.from(a.slice(0, 6)),
      };
    })(),
  }));
  const v = stats.validation;
  if (v.disagreement || v.boundary || v.nonManifold || v.degenerate || v.nonFinite) {
    throw new Error(`invalid creature mesh: ${JSON.stringify(v)}`);
  }
  fs.writeFileSync(path.join(out, debug ? 'normal-report.json' : 'report.json'), JSON.stringify({
    species: name, debugNormals: debug, frames, stats, errors: errs,
  }, null, 2));
});
finish(process.exitCode || 0);
