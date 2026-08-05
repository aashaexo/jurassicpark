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
await page.waitForTimeout(1000);
const viewpoints = [
  ['valley-overview', [-205, 205], -0.92, -0.08],
  ['road-ground', [-130, 150], -0.98, -0.18],
  ['hills-sky', [0, -70], 0.1, -0.18],
  ['toward-sun', [65, 35], 2.0, -0.12],
];
for (const [name, position, yaw, pitch] of viewpoints) {
  await page.evaluate(([p, y, pi]) => {
    const g = window.__game;
    g.player.position.set(p[0], g.terrain.heightAt(p[0], p[1]) + 1.8, p[1]);
    g.player.yaw = y;
    g.player.pitch = pi;
  }, [position, yaw, pitch]);
  await page.waitForTimeout(350);
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
