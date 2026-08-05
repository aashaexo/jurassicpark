import { run } from './harness.mjs';
import { finish } from './tame.mjs';

await run({ width: 1280, height: 720, hash: 'manual&tier=high' }, async ({ page }) => {
  const result = await page.evaluate(() => {
    const g = window.__game;
    const T = window.THREE;
    const subject = g.gate.root;
    const camera = g.camera;
    const box = new T.Box3().setFromObject(subject);
    const center = box.getCenter(new T.Vector3());
    camera.position.set(7, g.terrain.height(7, -268) + 1.7, -268);
    camera.lookAt(7, g.terrain.height(7, -304) + 2.5, -304);
    camera.updateMatrixWorld();
    const ray = new T.Raycaster(camera.position, center.clone().sub(camera.position).normalize());
    const hits = ray.intersectObjects(g.scene.children, true);
    const first = hits[0]?.object;
    let belongs = false;
    for (let p = first; p; p = p.parent) if (p === subject) belongs = true;
    return { first: first?.name || null, distance: hits[0]?.distance || null, belongs };
  });
  console.log(`[obstruction-probe] ${JSON.stringify(result)}`);
});
finish(process.exitCode || 0);
