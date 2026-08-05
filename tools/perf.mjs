import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:8099/?tier=high');
await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 30000 });
const result = await page.evaluate(() => new Promise((resolve) => {
  let frames = 0;
  const start = performance.now();
  function tick(now) {
    frames++;
    if (now - start >= 3000) resolve({ fps: frames * 1000 / (now - start), frameMs: (now - start) / frames, scene: window.__game.info() });
    else requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}));
console.log(JSON.stringify(result, null, 2));
await browser.close();
