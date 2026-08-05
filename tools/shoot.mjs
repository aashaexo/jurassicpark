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
const viewpoints = [
  ['road-ground', [-128, 12, 148], [-82, 10, 42]],
  ['hills-sky', [0, 18, -70], [0, 42, -220]],
  ['valley-overview', [-205, 92, 205], [0, 0, 0]],
  ['toward-sun', [65, 22, 35], [180, 28, -120]],
];
for (const [name, position, lookAt] of viewpoints) {
  await page.evaluate(([p, target]) => {
    window.__fixedCameraPose = {
      position: p,
      lookAt: target,
    };
  }, [position, lookAt]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
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
const result = { errors, warnings, consoleErrors: await page.evaluate(() => window.__consoleErrors || []), info: await page.evaluate(() => window.__game.info()), perf };
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(result, null, 2));
await browser.close();
if (errors.length || result.consoleErrors.length || warnings.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
