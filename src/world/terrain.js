import * as THREE from 'three';
import { roadInfluence } from './road.js';

const WORLD = 600;
const CHUNKS = 6;
const CHUNK = WORLD / CHUNKS;

function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), ux),
    THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), ux), uz,
  );
}
function fbm(x, z) {
  let value = 0, amp = 0.5;
  for (let i = 0; i < 5; i++) {
    value += noise(x, z) * amp;
    x = x * 2.04 + 19.2;
    z = z * 2.04 - 11.7;
    amp *= 0.5;
  }
  return value;
}

export function heightAt(x, z) {
  const edge = Math.max(Math.abs(x), Math.abs(z)) / 300;
  const ring = Math.max(0, edge - 0.43);
  const broad = fbm(x * 0.006, z * 0.006);
  const ridges = Math.abs(noise(x * 0.018, z * 0.018) * 2 - 1);
  let y = 4 + broad * 7 + ring * ring * 75 + ridges * ring * 20;

  const basin = Math.exp(-(((x + 100) ** 2) / 11500 + ((z - 70) ** 2) / 6500));
  y -= basin * 6.5;

  const pad = Math.exp(-(((x - 145) ** 2) / 7000 + ((z + 75) ** 2) / 4000));
  y = THREE.MathUtils.lerp(y, 9.5, pad * 0.86);

  const road = roadInfluence(x, z);
  const nearby = roadInfluence(x, z);
  y = THREE.MathUtils.lerp(y, y - 1.8 + (1 - road) * 0.9, nearby);
  return y;
}

function patchTerrainMaterial(material, textures) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.tGrass = { value: textures.grass.map };
    shader.uniforms.tDirt = { value: textures.dirt.map };
    shader.uniforms.tRock = { value: textures.rock.map };
    shader.uniforms.uTerrainScale = { value: 0.0105 };
    shader.vertexShader = `
      varying vec3 vTerrainWorld;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n vTerrainWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = `
      uniform sampler2D tGrass;
      uniform sampler2D tDirt;
      uniform sampler2D tRock;
      uniform float uTerrainScale;
      varying vec3 vTerrainWorld;
      ${shader.fragmentShader}
    `.replace(
      '#include <map_fragment>',
      `
        vec2 terrainUv = vTerrainWorld.xz * uTerrainScale;
        vec3 grassColor = texture2D(tGrass, terrainUv).rgb;
        vec3 dirtColor = texture2D(tDirt, terrainUv * 1.18 + 0.17).rgb;
        vec3 rockColor = texture2D(tRock, terrainUv * 0.68 - 0.31).rgb;
        float slope = 1.0 - saturate(vNormal.y);
        float roadMask = ${roadInfluence.toString().includes('roadInfluence') ? '0.0' : '0.0'};
        float basinMask = smoothstep(0.0, 1.0, 1.0 - abs(vTerrainWorld.y - 3.0) / 7.0);
        vec3 terrainColor = mix(grassColor, rockColor, smoothstep(0.28, 0.80, slope));
        terrainColor = mix(terrainColor, dirtColor, smoothstep(0.55, 0.82, slope) * 0.35 + basinMask * 0.12);
        diffuseColor.rgb *= terrainColor * 2.25;
      `,
    );
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => 'jurassic-terrain-splat-v1';
  return material;
}

export function createTerrain(renderer, textures) {
  const group = new THREE.Group();
  group.name = '600m-valley-terrain';
  const material = patchTerrainMaterial(new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0,
    normalMap: textures.grass.normalMap,
    normalScale: new THREE.Vector2(0.42, 0.42),
  }), textures);

  for (let cz = 0; cz < CHUNKS; cz++) {
    for (let cx = 0; cx < CHUNKS; cx++) {
      const geometry = new THREE.PlaneGeometry(CHUNK, CHUNK, 28, 28);
      geometry.rotateX(-Math.PI / 2);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i) + (cx - CHUNKS / 2 + 0.5) * CHUNK;
        const lz = pos.getZ(i) + (cz - CHUNKS / 2 + 0.5) * CHUNK;
        pos.setY(i, heightAt(lx, lz));
      }
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set((cx - CHUNKS / 2 + 0.5) * CHUNK, 0, (cz - CHUNKS / 2 + 0.5) * CHUNK);
      mesh.receiveShadow = true;
      mesh.name = `terrain-chunk-${cx}-${cz}`;
      group.add(mesh);
    }
  }
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(47, 50, 0.7, 48),
    new THREE.MeshStandardMaterial({ color: 0x76705b, roughness: 0.94 }),
  );
  pad.scale.z = 0.57;
  pad.position.set(145, 9.55, -75);
  pad.receiveShadow = true;
  pad.name = 'future-gate-pad';
  group.add(pad);
  return { group, heightAt };
}
