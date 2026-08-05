import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = path.resolve('media/species/debug');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const species of ['cycad', 'palm']) {
  for (const debug of ['normal', 'ndotl', 'transmission']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:8099/?tier=high&species=${species}&leafDebug=${debug}&tod=afternoon`);
    await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 30000 });
    await page.evaluate(() => {
      window.__fixedCameraPose = {
        position: [1.5, 1.3, 2.1],
        lookAt: [0, 0.85, 0],
      };
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(out, `${species}-${debug}.png`),
      timeout: 120000,
    });
    await page.close();
  }
}
await browser.close();
