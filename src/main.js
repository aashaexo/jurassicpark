import * as THREE from 'three';
import { Sky } from './render/sky.js';
import { createGrade } from './render/grade.js';
import { bakeGroundTextures } from './world/groundTex.js';
import { createTerrain } from './world/terrain.js';
import { createRoad, roadSample } from './world/road.js';
import { validateTerrainGroup } from './world/terrainDiagnostics.js';
import { PlayerController } from './player/controller.js';
import { createVegetation } from './world/vegetation.js';

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
// Scene passes stay linear. The final grade shader writes to the default
// framebuffer, where the renderer performs the sole sRGB conversion.
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const probe = renderer.capabilities;
const queryTier = new URLSearchParams(location.search).get('tier');
const mode = new URLSearchParams(location.search).get('mode') || 'beauty';
const params = new URLSearchParams(location.search);
const gradeEnabled = params.get('grade') !== 'off';
const roadEnabled = params.get('road') !== 'off';
const speciesName = params.get('species');
const speciesMode = Boolean(speciesName);
const leafDebug = params.get('leafDebug');
const tier = queryTier || (probe.maxTextureSize >= 8192 && window.devicePixelRatio <= 2 ? 'high' : 'medium');
const quality = {
  low: { dpr: 1, shadows: 1024, fog: 0.0026 },
  medium: { dpr: 1.35, shadows: 1536, fog: 0.0021 },
  high: { dpr: 1.65, shadows: 2048, fog: 0.0035 },
}[tier] || { dpr: 1.35, shadows: 1536, fog: 0.0021 };

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(67, 1, 0.1, 2200);

const sky = new Sky(renderer, scene);
const tod = new URLSearchParams(location.search).get('tod') || 'afternoon';
const todPresets = {
  morning: { elevation: 24, azimuth: 105 },
  noon: { elevation: 62, azimuth: 155 },
  afternoon: { elevation: 30, azimuth: 145 },
  dusk: { elevation: 11, azimuth: 220 },
};
const selectedTod = todPresets[tod] || todPresets.afternoon;
sky.setSun(selectedTod.elevation, selectedTod.azimuth);
scene.background = sky.horizonRadiance.clone();
scene.fog = new THREE.FogExp2(sky.horizonRadiance, quality.fog);
if (mode !== 'normal') {
  sky.addVisibleSky();
  sky.bakeEnvironment();
  scene.environmentIntensity = 0.62;
} else {
  sky.mesh.visible = false;
  scene.background = new THREE.Color(0x808080);
}

const textures = mode === 'normal' || mode === 'white' ? null : bakeGroundTextures(renderer, tier);
const terrain = createTerrain(renderer, textures, mode);
scene.add(terrain.group);
if (speciesMode) {
  terrain.group.visible = false;
  const patch = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshStandardMaterial({ color: 0x66553b, roughness: 1 }),
  );
  patch.rotation.x = -Math.PI / 2;
  patch.receiveShadow = true;
  patch.visible = !leafDebug;
  patch.name = 'species-turntable-ground';
  scene.add(patch);
}
if (mode !== 'normal' && roadEnabled && !speciesMode) scene.add(createRoad(terrain, textures));
const vegetationTerrain = speciesMode
  ? { heightAt: () => 0 }
  : terrain;
const vegetationRoad = speciesMode
  ? () => ({ distance: 999 })
  : roadSample;
const vegetation = speciesMode
  ? createVegetation(vegetationTerrain, vegetationRoad, {
    species: speciesName,
    area: 15,
    count: leafDebug ? 1 : 100,
    center: true,
    debugLeaf: Boolean(leafDebug),
    debug: leafDebug,
  })
  : mode === 'beauty'
    ? createVegetation(terrain, roadSample)
    : null;
if (vegetation) scene.add(vegetation);
if (mode === 'sky') terrain.group.visible = false;

const sun = new THREE.DirectionalLight(0xffead1, 4.2);
sun.castShadow = true;
sun.shadow.mapSize.set(quality.shadows, quality.shadows);
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -150;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 650;
sun.shadow.bias = -0.00018;
sun.shadow.normalBias = 150 / quality.shadows;
sun.shadow.radius = 3.5;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(sky.horizonRadiance.clone().offsetHSL(0.03, 0.02, 0.24), 0x352919, 1.75);
scene.add(hemi);

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
grade.material.uniforms.uFogColor.value.copy(sky.horizonRadiance);
grade.material.uniforms.uFogDensity.value = quality.fog * 0.8;
if (mode === 'normal') {
  grade.material.uniforms.uFogDensity.value = 0;
}
if (mode === 'sky') console.table(sky.radianceDiagnostics());

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
    if (!window.__fixedCameraPose) player.update(1 / 60, elapsed);
    accumulator -= 1 / 60;
  }
  if (window.__fixedCameraPose) {
    camera.position.set(...window.__fixedCameraPose.position);
    camera.lookAt(...window.__fixedCameraPose.lookAt);
    player.position.set(...window.__fixedCameraPose.position);
  }
  // The sky vector points from the ground toward the sun. Keep the
  // directional light above the horizon rather than placing it underground.
  sun.position.copy(player.position).addScaledVector(sky.sunDirection, 260);
  sun.target.position.copy(player.position);
  sun.target.updateMatrixWorld();
  if (vegetation) {
    vegetation.traverse((object) => {
      const shader = object.material?.userData?.shader;
      if (shader?.uniforms.uVegetationTime) {
        shader.uniforms.uVegetationTime.value = performance.now() * 0.001;
        shader.uniforms.uLeafSun.value.copy(sky.sunDirection);
      }
    });
  }
  renderer.setRenderTarget(hdr);
  renderer.clear();
  renderer.render(scene, camera);
  sceneCalls = renderer.info.render.calls;
  sceneTriangles = renderer.info.render.triangles;
  if (gradeEnabled) {
    grade.render(hdr, elapsed);
  } else {
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }
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
  renderer, scene, camera, player, terrain, sky, tier, mode, roadSample,
  hdr, grade,
  validateTerrain: () => validateTerrainGroup(terrain.group),
  info: () => ({
    fps,
    calls: sceneCalls,
    triangles: sceneTriangles,
    vegetationInstances: vegetation?.userData.instanceCount || 0,
    vegetationBuckets: vegetation?.userData.bucketCount || 0,
  }),
};
window.__sceneReady = true;
