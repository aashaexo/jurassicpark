import fs from 'node:fs';
import path from 'node:path';
import { run, capture } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('shots/final');
fs.mkdirSync(out, { recursive: true });
const shots = [
  ['gate-approach.png', 'gate', [7, -268], [7, -304]],
  ['brachiosaurus-reveal.png', 'brachiosaurus', [-45, -360], [-20, -326]],
  ['fence-line.png', 'fence', [22, -300], [30, -300]],
  ['jeep-road.png', 'jeep', [7, -302], [7, -306]],
  ['triceratops-trail.png', 'triceratops', [-12, -306], [-8, -296]],
  ['gallimimus-flock.png', 'gallimimus', [34, -292], [42, -300]],
  ['dilophosaurus-undergrowth.png', 'dilophosaurus', [10, -280], [13, -286]],
  ['trex-distant.png', 'trex', [52, -340], [70, -360]],
  ['valley-establishing.png', null, [0, -250], [0, -330]],
];
for (const [name] of shots) fs.rmSync(path.join(out, name), { force: true });
const start = Date.now();
const failures = [];
await run({ width: 1280, height: 720, hash: 'manual&tier=high' }, async ({ page }) => {
  console.log('warming renderer and vegetation buckets');
  await page.waitForTimeout(3000);
  for (const [name, subjectKind, pos, target] of shots) {
    console.log(`capturing ${name}`);
    const settled = await page.evaluate(([name, subjectKind, pos, target]) => {
      const g = window.__game;
      const T = window.THREE;
      g.goTo(0.84);
      g.warp(1.5);
      if (subjectKind === 'gate') {
        for (const z of [-304, -292, -280, -268, -256]) g.veg.suppressZone(7, z, 8);
      }
      g.setPaused(true);
      g.gate.root.visible = subjectKind === 'gate';
      g.fence.root.visible = subjectKind === 'fence';
      g.jeep.root.visible = subjectKind === 'jeep';
      g.dinosaurs.root.visible = subjectKind !== 'gate' &&
        subjectKind !== 'fence' && subjectKind !== 'jeep';
      const subject = subjectKind === 'gate' ? g.gate.root :
        subjectKind === 'fence' ? g.fence.root :
          subjectKind === 'jeep' ? g.jeep.root :
            subjectKind === 'gallimimus' ? g.dinosaurs.root :
            g.dinosaurs.creatures.find(c => c.species === subjectKind)?.group;
      if (!subjectKind) {
        const y = g.terrain.height(pos[0], pos[1]) + 1.7;
        const ty = g.terrain.height(target[0], target[1]) + 2.5;
        g.camera.position.set(pos[0], y, pos[1]);
        g.camera.lookAt(target[0], ty, target[1]);
        g.camera.updateMatrixWorld();
        g.veg.update(0, g.camera, g.sky.sunDir, g.sun.color, g.hemi.color);
        let nearbyVegetation = 0;
        for (const c of g.veg.cells) {
          const dx = c.x - g.camera.position.x, dz = c.z - g.camera.position.z;
          if (dx * dx + dz * dz <= 40 * 40 && c.group.visible)
            for (const mesh of c.hi.children) nearbyVegetation += mesh.count;
        }
        if (nearbyVegetation < 8) throw new Error(`${name} has only ${nearbyVegetation} nearby vegetation instances`);
        return { position: g.camera.position.toArray(), nearbyVegetation,
          coverage: null, contained: true, obstructionFree: true, valid: true };
      }
      if (!subject) throw new Error(`missing final subject: ${subjectKind}`);
      if (subjectKind !== 'gate' && subjectKind !== 'fence' && subjectKind !== 'jeep') {
        g.veg.suppressZone(subject.position.x, subject.position.z, 10);
        if (subjectKind === 'gallimimus') {
          for (const c of g.dinosaurs.creatures.filter(c => c.species === 'gallimimus'))
            g.veg.suppressZone(c.group.position.x, c.group.position.z, 8);
        }
      } else if (subjectKind === 'fence' || subjectKind === 'jeep') {
        g.veg.suppressZone(subject.position.x, subject.position.z, 10);
      }
      const box = new T.Box3().setFromObject(subject);
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const base = new T.Vector3(pos[0], g.terrain.height(pos[0], pos[1]) + 1.7, pos[1]);
      const look = new T.Vector3(target[0], g.terrain.height(target[0], target[1]) + 2.5, target[1]);
      const direction = look.clone().sub(base).normalize();
      let chosen = null;
      let best = null;
      const candidates = [-16, -8, 0, 6, 12, 20, 30, 42, 56];
      for (const back of candidates) {
        const candidate = base.clone().addScaledVector(direction, -back);
        g.camera.position.copy(candidate);
        g.camera.lookAt(look);
        g.camera.updateMatrixWorld();
        const corners = [];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) corners.push(new T.Vector3(x, y, z)
            .applyMatrix4(g.camera.matrixWorldInverse).applyMatrix4(g.camera.projectionMatrix));
        const x0 = Math.max(-1, Math.min(...corners.map(p => p.x)));
        const x1 = Math.min(1, Math.max(...corners.map(p => p.x)));
        const y0 = Math.max(-1, Math.min(...corners.map(p => p.y)));
        const y1 = Math.min(1, Math.max(...corners.map(p => p.y)));
        const coverage = Math.max(0, x1 - x0) * Math.max(0, y1 - y0) / 4;
        const contained = corners.every(p => p.x >= -1 && p.x <= 1 && p.y >= -1 && p.y <= 1);
        const belongsToSubject = (object) => {
          for (let p = object; p; p = p.parent) if (p === subject) return true;
          return false;
        };
        const isVisible = (object) => {
          for (let p = object; p; p = p.parent) if (p.visible === false) return false;
          return true;
        };
        const aims = [center];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) aims.push(new T.Vector3(x, y, z));
        if (subjectKind === 'gate') aims.push(center.clone().setX(center.x + 4.8));
        const rayResults = aims.slice(0, 9).map(aim => {
          const ray = new T.Raycaster(candidate, aim.clone().sub(candidate).normalize());
          const hits = ray.intersectObjects(g.scene.children, true);
          const first = hits.find(hit => isVisible(hit.object));
          return Boolean(first && belongsToSubject(first.object));
        });
        const clearRays = rayResults.filter(Boolean).length;
        const obstructionFree = rayResults[0] || clearRays >= 2;
        const score = coverage - (clearRays / aims.length) * 0.5 - (contained ? 0 : 0.25);
        if (!best || score > best.score) best = { candidate, coverage, contained, obstructionFree, clearRays, score };
        if (coverage >= 0.08 && obstructionFree) {
          chosen = { candidate, coverage, contained, obstructionFree, clearRays };
          break;
        }
      }
      if (!chosen) chosen = best;
      g.camera.position.copy(chosen.candidate);
      g.camera.lookAt(look);
      g.camera.updateMatrixWorld();
      g.veg.update(0, g.camera, g.sky.sunDir, g.sun.color, g.hemi.color);
      let nearbyVegetation = 0;
      for (const c of g.veg.cells) {
        const dx = c.x - g.camera.position.x, dz = c.z - g.camera.position.z;
        if (dx * dx + dz * dz > 40 * 40) continue;
        if (!c.group.visible) continue;
        for (const mesh of c.hi.children) nearbyVegetation += mesh.count;
      }
      if (nearbyVegetation < 8) throw new Error(`${name} has only ${nearbyVegetation} nearby vegetation instances`);
      return { position: g.camera.position.toArray(), nearbyVegetation,
        coverage: chosen.coverage, contained: chosen.contained,
        obstructionFree: chosen.obstructionFree, clearRays: chosen.clearRays,
        valid: chosen.coverage >= 0.08 && chosen.obstructionFree };
    }, [name, subjectKind, pos, target]);
    await page.waitForTimeout(700);
    const actual = await page.evaluate(() => window.__game.camera.position.toArray());
    const error = Math.hypot(actual[0] - settled.position[0], actual[1] - settled.position[1], actual[2] - settled.position[2]);
    if (error > 0.05) throw new Error(`${name} camera moved ${error.toFixed(3)}m after settling`);
    const shotStart = Date.now();
    await Promise.race([
      capture(page, path.join(out, name)),
      new Promise((_, reject) => setTimeout(() =>
        reject(new Error(`capture timeout: ${name}`)), 300_000)),
    ]);
    if (!settled.valid) failures.push(`${name}: coverage=${settled.coverage?.toFixed(3) ?? 'n/a'}, clearRays=${settled.clearRays ?? 'n/a'}`);
    console.log(`captured ${name} in ${Date.now() - shotStart} ms camera=${actual.map(v => v.toFixed(3)).join(',')} coverage=${settled.coverage == null ? 'n/a' : settled.coverage.toFixed(3)} clearRays=${settled.clearRays ?? 'n/a'} valid=${settled.valid} nearbyVegetation=${settled.nearbyVegetation} subject=${subjectKind || 'valley'}`);
  }
});
for (const [name] of shots) {
  const file = path.join(out, name);
  if (!fs.existsSync(file) || fs.statSync(file).mtimeMs < start) {
    throw new Error(`stale or missing final capture: ${file}`);
  }
}
if (failures.length) throw new Error(`invalid final captures:\n${failures.join('\n')}`);
finish(process.exitCode || 0);
