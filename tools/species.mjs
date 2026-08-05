import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const species = ['canopy', 'palm', 'treefern', 'cycad', 'broadleaf', 'sapling', 'fern', 'tussock', 'shrub', 'vine', 'litter', 'log'];
const output = path.resolve('media/species');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const name of species) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:8099/?tier=high&species=${name}&tod=afternoon`);
  await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 30000 });
  const tall = ['canopy', 'palm', 'treefern', 'sapling', 'vine'].includes(name);
  const closeTarget = tall ? 2.8 : 0.75;
  for (const [shot, pose] of [
    ['close', { position: [1.25, tall ? 2.8 : 1.05, 1.8], lookAt: [0, closeTarget, 0] }],
    ['patch', { position: [4.8, tall ? 4.2 : 2.6, 6], lookAt: [0, tall ? 2.2 : 0.65, 0] }],
  ]) {
    await page.evaluate((p) => { window.__fixedCameraPose = p; }, pose);
    await page.waitForTimeout(450);
    await page.screenshot({
      path: path.join(output, `${name}-${shot}.png`),
      timeout: 120000,
    });
  }
  const info = await page.evaluate(() => window.__game.info());
  fs.writeFileSync(path.join(output, `${name}.json`), JSON.stringify(info, null, 2));
  await page.close();
}
await browser.close();
