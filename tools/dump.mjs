import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const server = spawn(process.execPath, ['tools/serve.mjs'], { stdio: 'ignore' });
try {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await page.goto('http://localhost:8099/?tier=high', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 120000 });
  const dump = await page.evaluate(() => {
    const validation = window.__game.validateTerrain();
    const meshes = [];
    window.__game.scene.traverse((object) => {
      if (!object.isMesh) return;
      object.updateMatrixWorld(true);
      object.geometry.computeBoundingSphere();
      const sphere = object.geometry.boundingSphere.clone();
      sphere.applyMatrix4(object.matrixWorld);
      meshes.push({
        name: object.name || object.type,
        center: sphere.center.toArray().map((v) => +v.toFixed(2)),
        radius: +sphere.radius.toFixed(2),
        visible: object.visible,
        material: object.material?.type,
      });
    });
    return { validation, meshes, camera: window.__game.camera.position.toArray() };
  });
  console.log(JSON.stringify(dump, null, 2));
  if (!dump.validation.ok) {
    console.error(dump.validation.failures.join('\n'));
    process.exitCode = 1;
  }
  await browser.close();
} finally {
  server.kill();
}
