import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = path.resolve('media');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const poses = {
  road: {
    position: [-102.41251660273889, 23.18366584961135, 145.90010486233408],
    lookAt: [-80.54647655165259, 4.525903809520105, 122.53610921766128],
  },
  overview: {
    position: [-118, 82, 178],
    lookAt: [0, 7, 0],
  },
};
for (const [name, query] of [['grade-off', 'grade=off'], ['road-off', 'road=off']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:8099/?tier=high&${query}`);
  await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 30000 });
  for (const [poseName, pose] of Object.entries(poses)) {
    await page.evaluate((p) => { window.__fixedCameraPose = p; }, pose);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `diagnostic-${name}-${poseName}.png`), timeout: 120000 });
  }
  await page.close();
}
await browser.close();
