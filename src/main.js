import * as THREE from 'three';
import { Sky } from './render/sky.js';
import { createGrade } from './render/grade.js';
import { bakeGroundTextures } from './world/groundTex.js';
import { createTerrain } from './world/terrain.js';
import { createRoad } from './world/road.js';
import { PlayerController } from './player/controller.js';

const canvas = document.querySelector('#view');
const statsNode = document.querySelector('#stats');
window.__consoleErrors = [];
const originalError = console.error.bind(console);
console.error = (...args) => {
  window.__consoleErrors.push(args.map(String).join(' '));
  originalError(...args);
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  depth: true,
  stencil: false,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const probe = renderer.capabilities;
const queryTier = new URLSearchParams(location.search).get('tier');
const tier = queryTier || (probe.maxTextureSize >= 8192 && window.devicePixelRatio <= 2 ? 'high' : 'medium');
const quality = {
  low: { dpr: 1, shadows: 1024, fog: 0.0026 },
  medium: { dpr: 1.35, shadows: 1536, fog: 0.0021 },
  high: { dpr: 1.65, shadows: 2048, fog: 0.0018 },
}[tier] || { dpr: 1.35, shadows: 1536, fog: 0.0021 };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x304438);
scene.fog = new THREE.FogExp2(0x3e5140, quality.fog);
const camera = new THREE.PerspectiveCamera(67, 1, 0.1, 2200);

const sky = new Sky(renderer, scene);
sky.addVisibleSky();
sky.bakeEnvironment();

const textures = bakeGroundTextures(renderer, tier);
const terrain = createTerrain(renderer, textures);
scene.add(terrain.group);
scene.add(createRoad(terrain));

const sun = new THREE.DirectionalLight(0xffc58e, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(quality.shadows, quality.shadows);
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 650;
sun.shadow.bias = -0.00018;
sun.shadow.normalBias = 0.55;
sun.shadow.radius = 3.5;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0x9bb9a1, 0x3e2d1b, 1.25);
scene.add(hemi);

function addDistantTrees() {
  const trunkGeometry = new THREE.CylinderGeometry(0.7, 1.5, 13, 7);
  const crownGeometry = new THREE.ConeGeometry(8, 22, 9);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2115, roughness: 0.96 });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x172c19, roughness: 0.94 });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, 120);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, 120);
  const matrix = new THREE.Matrix4();
  let index = 0;
  for (let i = 0; i < 120; i++) {
    const angle = (i / 120) * Math.PI * 2 + Math.sin(i * 4.8) * 0.1;
    const radius = 235 + (i % 9) * 5.4;
    const x = Math.cos(angle) * radius + Math.sin(i * 2.9) * 28;
    const z = Math.sin(angle) * radius + Math.cos(i * 1.7) * 22;
    const y = terrain.heightAt(x, z);
    const scale = 0.55 + (i % 7) * 0.09;
    matrix.makeTranslation(x, y + 6.5 * scale, z);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    trunks.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, y + 17 * scale, z);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    crowns.setMatrixAt(index, matrix);
    index++;
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  trunks.castShadow = true;
  crowns.castShadow = false;
  trunks.receiveShadow = true;
  scene.add(trunks, crowns);
}
addDistantTrees();

const player = new PlayerController(camera, terrain.heightAt);
const hdr = new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.HalfFloatType,
  format: THREE.RGBAFormat,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: true,
  stencilBuffer: false,
});
hdr.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
hdr.depthTexture.minFilter = THREE.NearestFilter;
hdr.depthTexture.magFilter = THREE.NearestFilter;
const grade = createGrade(renderer, 1, 1, tier);

let width = 1, height = 1;
function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, quality.dpr);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  hdr.setSize(Math.floor(width * dpr), Math.floor(height * dpr));
  grade.resize(Math.floor(width * dpr), Math.floor(height * dpr));
}
window.addEventListener('resize', resize);
resize();

let showStats = false;
window.addEventListener('keydown', (event) => {
  if (event.code === 'F3') {
    showStats = !showStats;
    statsNode.style.display = showStats ? 'block' : 'none';
  }
});

const clock = new THREE.Clock();
let accumulator = 0;
let elapsed = 0;
let frames = 0;
let fps = 0;
let sceneCalls = 0;
let sceneTriangles = 0;
function animate() {
  requestAnimationFrame(animate);
  const frame = Math.min(0.1, clock.getDelta());
  elapsed += frame;
  accumulator += frame;
  while (accumulator >= 1 / 60) {
    player.update(1 / 60, elapsed);
    accumulator -= 1 / 60;
  }
  sun.position.copy(player.position).addScaledVector(sky.sunDirection, -260);
  sun.target.position.copy(player.position);
  sun.target.updateMatrixWorld();
  renderer.setRenderTarget(hdr);
  renderer.clear();
  renderer.render(scene, camera);
  sceneCalls = renderer.info.render.calls;
  sceneTriangles = renderer.info.render.triangles;
  grade.render(hdr, elapsed);
  frames++;
  if (elapsed > 1) {
    fps = frames / elapsed;
    frames = 0;
    elapsed = 0;
  }
  if (showStats) {
    const info = renderer.info.render;
    statsNode.textContent = `tier ${tier}\n${fps.toFixed(1)} fps\ncalls ${info.calls}\ntris ${(info.triangles / 1000).toFixed(0)}k\nshadow ${quality.shadows}px\nmode ${player.spectator ? 'spectator' : 'walk'}`;
  }
}
animate();

window.__game = {
  renderer, scene, camera, player, terrain, sky, tier,
  info: () => ({ fps, calls: sceneCalls, triangles: sceneTriangles }),
};
window.__sceneReady = true;
