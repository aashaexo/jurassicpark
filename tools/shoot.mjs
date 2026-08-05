import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const out = path.join(root, 'media');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
const warnings = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
  if (message.type() === 'warning' && !/favicon|DevTools|GPU stall|ReadPixels/i.test(message.text())) warnings.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('http://localhost:8099/?tier=high');
await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 30000 });
await page.waitForTimeout(1200);
const terrainValidation = await page.evaluate(() => window.__game.validateTerrain());
if (!terrainValidation.ok) {
  throw new Error(`Terrain validation failed:\n${terrainValidation.failures.join('\n')}`);
}
const viewpoints = await page.evaluate(() => {
  const g = window.__game;
  const terrainY = (x, z) => g.terrain.heightAt(x, z);
  const roadPose = (x, z, name) => {
    const sample = g.roadSample(x, z);
    const tangent = sample.tangent;
    const px = sample.point.x - tangent.x * 4.0;
    const pz = sample.point.y - tangent.y * 4.0;
    const y = terrainY(px, pz) + 1.7;
    return {
      name,
      position: [px, y, pz],
      lookAt: [sample.point.x + tangent.x * 28.0, terrainY(sample.point.x + tangent.x * 28.0, sample.point.y + tangent.y * 28.0) + 1.3, sample.point.y + tangent.y * 28.0],
      groundY: terrainY(px, pz),
      kind: 'ground',
    };
  };
  return [
    roadPose(-105, 138, 'road-ground'),
    {
      name: 'hills-sky',
      position: [-90, 76, 128],
      lookAt: [0, 34, -170],
      groundY: terrainY(-90, 128),
      kind: 'overview',
    },
    {
      name: 'valley-overview',
      position: [-118, 82, 178],
      lookAt: [0, 7, 0],
      groundY: terrainY(-118, 178),
      kind: 'overview',
    },
    roadPose(-105, 138, 'toward-sun'),
  ];
});
const shotReport = [];
for (const viewpoint of viewpoints) {
  const { name, position, lookAt, groundY, kind } = viewpoint;
  const [x, y, z] = position;
  if (Math.abs(x) > 300 || Math.abs(z) > 300 || y < 1 || y > 150) {
    throw new Error(`Invalid camera pose ${name}: ${JSON.stringify(viewpoint)}`);
  }
  if (kind === 'ground' && Math.abs(y - (groundY + 1.7)) > 0.05) {
    throw new Error(`Ground camera height mismatch ${name}: y=${y} ground=${groundY}`);
  }
  await page.evaluate(([p, target]) => {
    window.__fixedCameraPose = {
      position: p,
      lookAt: target,
    };
  }, [position, lookAt]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  shotReport.push({
    name, position, lookAt, terrainHeight: groundY, kind,
    render: await page.evaluate(() => window.__game.info()),
  });
}
const perf = await page.evaluate(() => new Promise((resolve) => {
  let frames = 0;
  const start = performance.now();
  function tick(now) {
    frames++;
    if (now - start >= 1500) resolve({ fps: frames * 1000 / (now - start), frameMs: (now - start) / frames });
    else requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}));
const result = {
  errors, warnings,
  consoleErrors: await page.evaluate(() => window.__consoleErrors || []),
  info: await page.evaluate(() => window.__game.info()),
  radiance: await page.evaluate(() => window.__game.sky.radianceDiagnostics()),
  terrainValidation,
  shots: shotReport,
  perf,
};
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(result, null, 2));
await browser.close();
if (errors.length || result.consoleErrors.length || warnings.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
