import path from 'node:path';
import fs from 'node:fs';
import { run } from './harness.mjs';
import { finish } from './tame.mjs';
import { readPng } from './px.mjs';

const out = path.resolve('shots/gameplay');
fs.mkdirSync(path.join(out, 'route'), { recursive: true });
const started = Date.now();
const routeValues = (process.env.GAMEPLAY_SAMPLES || '0.02,0.10,0.18,0.26,0.34,0.42,0.50,0.58,0.66,0.74,0.82,0.90,0.98')
  .split(',').map(Number);
const samples = routeValues
  .map(t => [`t-${t.toFixed(2)}`, t]);

await run({ width: 1280, height: 720, hash: 'manual&tier=high' }, async ({ page }) => {
  for (const [name, t] of samples) {
      const info = await page.evaluate((t) => {
      const g = window.__game;
      g.goTo(t);
      g.warp(1.2);
      g.setPaused(true);
      g.dinosaurs.root.visible = false;
      g.dinosaurs.root.updateMatrixWorld(true);
      g.scene.updateMatrixWorld(true);
      g.camera.updateMatrixWorld();
      g.renderer.render(g.scene, g.camera);
      const T = window.THREE;
      const camera = g.camera;
      const values = g.dinosaurs.creatures.map(c => {
        return {
          species: c.species,
          distance: c.group.position.distanceTo(camera.position),
        };
      });
      const forward = new T.Vector3();
      camera.getWorldDirection(forward);
      return { camera: camera.position.toArray(), forward: forward.toArray(), values };
      }, t);

    await page.evaluate(() => {
      const g = window.__game;
      g.dinosaurs.root.visible = true;
      for (const c of g.dinosaurs.creatures) c.group.visible = true;
      g.dinosaurs.root.updateMatrixWorld(true);
      g.renderer.render(g.scene, g.camera);
    });
    await page.screenshot();
    await page.evaluate(() => {
      const g = window.__game;
      g.dinosaurs.root.visible = false;
      g.dinosaurs.root.updateMatrixWorld(true);
      g.renderer.render(g.scene, g.camera);
    });
    const base = readPngBuffer(await page.screenshot());
    const species = [...new Set(info.values.map(v => v.species))];
    const pixelDiff = {};
    for (const kind of species) {
      await page.evaluate((kind) => {
        const g = window.__game;
        g.dinosaurs.root.visible = true;
        for (const c of g.dinosaurs.creatures) c.group.visible = c.species === kind;
        g.dinosaurs.root.updateMatrixWorld(true);
        g.renderer.render(g.scene, g.camera);
      }, kind);
      pixelDiff[kind] = diffFraction(base, readPngBuffer(await page.screenshot()));
    }
    await page.evaluate(() => {
      const g = window.__game;
      g.dinosaurs.root.visible = true;
      for (const c of g.dinosaurs.creatures) c.group.visible = true;
      g.dinosaurs.root.updateMatrixWorld(true);
      g.renderer.render(g.scene, g.camera);
    });
    const finalPath = path.join(out, 'route', `${name}.png`);
    await page.screenshot({ path: finalPath });
    const dinosaurs = Object.fromEntries(species.map(kind => {
      const same = info.values.filter(v => v.species === kind);
      return [kind, {
        nearestDistance: Math.min(...same.map(v => v.distance)),
        pixelDiff: pixelDiff[kind],
      }];
    }));
    console.log(`${name}: ${JSON.stringify({
      camera: info.camera, forward: info.forward, dinosaurs,
    })}`);
  }
});

for (const [name] of samples) {
  const file = path.join(out, 'route', `${name}.png`);
  const stat = fs.statSync(file);
  if (stat.mtimeMs < started) throw new Error(`stale gameplay capture: ${file}`);
}
finish(process.exitCode || 0);

function readPngBuffer(buffer) {
  const file = `/tmp/gameplay-${process.pid}-${Math.random().toString(16).slice(2)}.png`;
  fs.writeFileSync(file, buffer);
  const png = readPng(file);
  fs.unlinkSync(file);
  return png;
}

function diffFraction(a, b, threshold = 8) {
  if (a.w !== b.w || a.h !== b.h) throw new Error('pixel diff dimensions differ');
  let changed = 0;
  for (let i = 0; i < a.d.length; i += 4) {
    if (Math.max(
      Math.abs(a.d[i] - b.d[i]),
      Math.abs(a.d[i + 1] - b.d[i + 1]),
      Math.abs(a.d[i + 2] - b.d[i + 2]),
    ) > threshold) changed++;
  }
  return changed / (a.w * a.h);
}
