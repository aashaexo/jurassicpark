import { run } from './harness.mjs';
import { finish } from './tame.mjs';

const mode = process.argv[2] || 'fence';
await run({ width: 1280, height: 720, hash: 'manual&tier=high' }, async ({ page }) => {
  const result = await page.evaluate((mode) => {
    const g = window.__game;
    const T = window.THREE;
    const subject = mode === 'gate' ? g.gate.root : g.fence.root;
    g.gate.root.visible = mode === 'gate';
    g.fence.root.visible = mode !== 'gate';
    g.jeep.root.visible = false;
    g.dinosaurs.root.visible = false;
    const camera = g.camera;
    const box = new T.Box3().setFromObject(subject);
    const center = box.getCenter(new T.Vector3());
    camera.position.set(mode === 'gate' ? 7 : 22,
      g.terrain.height(mode === 'gate' ? 7 : 22, mode === 'gate' ? -268 : -300) + 1.7,
      mode === 'gate' ? -268 : -300);
    camera.lookAt(mode === 'gate' ? 7 : 30,
      g.terrain.height(mode === 'gate' ? 7 : 30, mode === 'gate' ? -304 : -300) + 2.5,
      mode === 'gate' ? -304 : -300);
    camera.updateMatrixWorld();
    g.scene.updateMatrixWorld(true);
    const rays = [center];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) rays.push(new T.Vector3(x, y, z));
    const details = rays.map(aim => {
      const ray = new T.Raycaster(camera.position, aim.clone().sub(camera.position).normalize(), 0, 1000);
      const hits = ray.intersectObjects(g.scene.children, true);
      const firstHit = hits.find(hit => {
        for (let p = hit.object; p; p = p.parent) if (p.visible === false) return false;
        return true;
      });
      const first = firstHit?.object;
      const chain = [];
      for (let p = first; p; p = p.parent) chain.push(`${p.type}:${p.name || '(unnamed)'}`);
      let belongs = false;
      for (let p = first; p; p = p.parent) if (p === subject) belongs = true;
      return { name: first?.name || null, type: first?.type || null, chain, distance: firstHit?.distance ?? null, belongs };
    });
    return { details };
  }, mode);
  console.log(`[obstruction-probe] ${JSON.stringify(result)}`);
});
finish(process.exitCode || 0);
