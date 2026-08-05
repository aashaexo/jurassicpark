import fs from 'node:fs';
import path from 'node:path';
import { run } from './harness.mjs';
import { finish } from './tame.mjs';

const out = path.resolve('media/jungle-trail-dump.json');
await run({ width: 800, height: 450, hash: 'manual&tier=high' }, async ({ page, errs, gl }) => {
  const report = await page.evaluate(() => {
    const g = window.__game;
    g.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g.terrain.group);
    const size = box.getSize(new THREE.Vector3());
    return {
      terrain: {
        min: box.min.toArray().map(v => +v.toFixed(3)),
        max: box.max.toArray().map(v => +v.toFixed(3)),
        size: size.toArray().map(v => +v.toFixed(3)),
      },
      vegetation: g.veg.stats(),
      render: g.info(),
    };
  });
  const valid = report.terrain.size[0] > 170 && report.terrain.size[0] < 190 &&
    report.terrain.size[2] > 480 && report.terrain.size[2] < 505;
  report.ok = valid && errs.length === 0;
  report.gl = gl;
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!valid) throw new Error('terrain bounds outside expected jungle-trail dimensions');
});
finish(process.exitCode || 0);
