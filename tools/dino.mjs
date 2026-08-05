import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';
import { assertCaptureCoverage } from './assert-capture.mjs';

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
  const studioCamera = async (mode) => page.evaluate((mode) => {
    const g = window.__game;
    const mesh = g.dinosaurs.creatures[0].mesh;
    const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    const center = box.getCenter(g.camera.position.clone());
    const size = box.getSize(g.camera.position.clone());
    const fov = g.camera.fov * Math.PI / 180;
    const aspect = innerWidth / innerHeight;
    const vHalf = fov * 0.5;
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const visibleWidth = mode === 'side' ? size.z : size.x;
    const distance = Math.max(
      size.y / (2 * Math.tan(vHalf)),
      visibleWidth / (2 * Math.tan(hHalf)),
    ) * (g.dinosaurs.creatures[0].species === 'trex' ? 3.2 : 2.0);
    let offset;
    if (mode === 'side') offset = center.clone().set(distance, 0, 0);
    else if (mode === 'front') offset = center.clone().set(-distance * 0.68, 0, -distance * 0.74);
    else offset = center.clone().set(distance * 0.72, -distance * 0.22, distance * 0.68);
    offset.y = 0;
    if (mode === 'low') offset.y = -distance * 0.22;
    g.camera.position.copy(center).add(offset);
    g.camera.lookAt(center);
    g.camera.updateMatrixWorld();
    g.setPaused(true);
    g.renderOnce();
  }, mode);
  await page.evaluate(() => {
    const g = window.__game;
    const mesh = g.dinosaurs.creatures[0].mesh;
    mesh.geometry.computeBoundingBox();
    const ground = g.scene.getObjectByName('dinosaur-turntable-ground');
    const delta = Math.abs(ground.position.y - mesh.geometry.boundingBox.min.y);
    if (delta >= 0.01) throw new Error(`studio ground mismatch: ${delta}`);
  });
  await assertMode(debug);
  const frames = [];
  const coverage = {};
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
    ['side.png', 'side'],
    ['three-quarter-front.png', 'front'],
    ['low-hero.png', 'low'],
  ];
  for (const [file, mode] of poses) {
    await assertMode(false);
    await studioCamera(mode);
    coverage[file] = await assertCaptureCoverage(page, 'dino', {
      contain: mode === 'side' || mode === 'front',
      minCoverage: mode === 'side' || mode === 'front' ? 0.02 : 0.05,
    });
    await capture(page, path.join(out, file));
  }
  await studioCamera('side');
  await capture(page, path.join(out, 'turntable.png'));

  for (let i = 0; i < 8; i++) {
    await assertMode(false);
    await page.evaluate((i) => {
      const g = window.__game;
      g.setPaused(false);
      g.dinosaurs.creatures[0].speed = 0.8;
      g.dinosaurs.creatures[0].update(0.18, { walk: true });
      g.setPaused(true);
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
    skinShader: window.__game.dinosaurs.creatures[0].material.userData,
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
    species: name, debugNormals: debug, frames, coverage, stats, errors: errs,
  }, null, 2));
});
finish(process.exitCode || 0);
