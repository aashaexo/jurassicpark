import * as THREE from 'three';
import { Noise2D, smoothstep } from './noise.js';
import { roadSample } from './road.js';

export const WORLD_SIZE = 600;
const CHUNKS = 6;
const CHUNK_SIZE = WORLD_SIZE / CHUNKS;
const terrainNoise = new Noise2D(0x4A11A);
const detailNoise = new Noise2D(0x19BEEF);

export function heightAt(x, z) {
  const radius = Math.sqrt(x * x + z * z) / 300;
  const shoulder = smoothstep(0.34, 0.94, radius);
  const broad = terrainNoise.fbm(x * 0.0048, z * 0.0048, 5, 0.52);
  const ridges = terrainNoise.ridged(x * 0.010, z * 0.010, 5, 0.57);
  const spurs = terrainNoise.ridged(x * 0.028, z * 0.028, 4, 0.58);
  let y = 3.0 + broad * 5.0 + shoulder * (ridges * 47 + spurs * 16);
  const basin = Math.exp(-(((x + 92) ** 2) / 16000 + ((z - 76) ** 2) / 9000));
  const drainage = Math.exp(-((x + 42) ** 2) / 2800) * Math.exp(-((z - 18) ** 2) / 18000);
  y -= basin * 7.5 + drainage * 1.7;
  const padMask = Math.exp(-(((x - 142) ** 2) / 8000 + ((z + 78) ** 2) / 5000));
  y = THREE.MathUtils.lerp(y, 9.2, padMask * 0.92);
  const road = roadSample(x, z);
  const roadMask = smoothstep(13.5, 3.5, road.distance);
  const shoulderMask = smoothstep(17, 5, road.distance);
  y -= roadMask * 1.8;
  y += (1 - roadMask) * shoulderMask * (0.7 + 0.45 * Math.sin(road.t * 34.0));
  const channels = terrainNoise.ridged(x * 0.075, z * 0.075, 3, 0.5);
  y -= shoulder * channels * channels * 1.8;
  y += detailNoise.fbm(x * 0.065, z * 0.065, 3, 0.52) * 0.28;
  return y;
}

function patchTerrainMaterial(material, textures) {
  material.onBeforeCompile = (shader) => {
    const maps = ['grass', 'dirt', 'mud', 'gravel', 'rock'];
    for (const layer of maps) {
      shader.uniforms[`t${layer}`] = { value: textures[layer].map };
      shader.uniforms[`n${layer}`] = { value: textures[layer].normalMap };
      shader.uniforms[`o${layer}`] = { value: textures[layer].ormMap };
    }
    shader.vertexShader = `varying vec3 vTerrainWorld;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n vTerrainWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    const layerSampling = `
      vec2 uvA = vTerrainWorld.xz * 0.018;
      vec2 uvB = vTerrainWorld.xy * 0.014;
      vec2 uvC = vTerrainWorld.zy * 0.014;
      vec3 grass = texture2D(tgrass, uvA).rgb;
      vec3 dirt = texture2D(tdirt, uvA * 1.27 + 0.17).rgb;
      vec3 mud = texture2D(tmud, uvA * 0.81 - 0.23).rgb;
      vec3 gravel = texture2D(tgravel, uvA * 1.72 + 0.61).rgb;
      vec3 upMask = abs(vNormal);
      vec3 rock = (texture2D(trock, uvA).rgb * upMask.y +
        texture2D(trock, uvB).rgb * upMask.x + texture2D(trock, uvC).rgb * upMask.z) /
        max(upMask.x + upMask.y + upMask.z, 0.001);
      float slope = 1.0 - saturate(vNormal.y);
      float t = clamp((250.0 - vTerrainWorld.z) / 315.0, 0.0, 1.0);
      float roadCenter = -260.0 + 445.0 * t + 18.0 * sin(t * 6.9115);
      float roadMask = smoothstep(14.5, 2.7, abs(vTerrainWorld.x - roadCenter));
      float basinMask = smoothstep(1.0, 0.0, abs(vTerrainWorld.x + 92.0) / 130.0 + abs(vTerrainWorld.z - 76.0) / 100.0);
      float macro = 0.82 + 0.22 * noise2(vTerrainWorld.xz * 0.0027);
      float grassFactor = 1.0 - smoothstep(0.62, 0.98, slope);
      float wGrass = max(0.0, grassFactor * (1.0 - roadMask * 0.95) * (1.0 - basinMask * 0.65));
      float wDirt = max(0.0, roadMask * 1.35 + slope * 0.08);
      float wMud = max(0.0, basinMask * 1.25 + roadMask * 0.22);
      float wGravel = max(0.0, roadMask * 0.16 + smoothstep(0.55, 0.82, slope) * 0.12);
      float wRock = max(0.0, smoothstep(0.68, 0.94, slope) * 1.6);
      float total = max(wGrass + wDirt + wMud + wGravel + wRock, 0.001);
      vec3 blended = (grass * wGrass + dirt * wDirt + mud * wMud + gravel * wGravel + rock * wRock) / total;
      diffuseColor.rgb *= min(blended * macro, vec3(0.78));
    `;
    const ormSampling = `
      vec2 ormUv = vTerrainWorld.xz * 0.018;
      float ormSlope = 1.0 - saturate(vNormal.y);
      float ormT = clamp((250.0 - vTerrainWorld.z) / 315.0, 0.0, 1.0);
      float ormRoad = smoothstep(14.5, 2.7, abs(vTerrainWorld.x - (-260.0 + 445.0 * ormT + 18.0 * sin(ormT * 6.9115))));
      float ormBasin = smoothstep(1.0, 0.0, abs(vTerrainWorld.x + 92.0) / 130.0 + abs(vTerrainWorld.z - 76.0) / 100.0);
      float a = max(0.0, (1.0 - ormSlope * 2.5) * (1.0 - ormRoad) * (1.0 - ormBasin));
      float b = max(0.0, ormRoad * 1.5 + ormSlope * 0.25);
      float c = max(0.0, ormBasin * 1.1 + ormRoad * 0.28);
      float d = max(0.0, ormRoad * 0.42 + ormSlope * 0.22);
      float e = max(0.0, ormSlope * 2.0 - 0.25);
      float sum = max(a + b + c + d + e, 0.001);
    `;
    shader.fragmentShader = `
      varying vec3 vTerrainWorld;
      uniform sampler2D tgrass,tdirt,tmud,tgravel,trock;
      uniform sampler2D ngrass,ndirt,nmud,ngravel,nrock;
      uniform sampler2D ograss,odirt,omud,ogravel,orock;
      float noise2(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }
      ${shader.fragmentShader}
    `.replace('#include <map_fragment>', layerSampling)
      .replace('#include <normal_fragment_maps>', `
      vec3 terrainNormal = texture2D(ngrass, vTerrainWorld.xz * 0.018).xyz * 2.0 - 1.0;
        terrainNormal += texture2D(ndirt, vTerrainWorld.xz * 0.022 + 0.17).xyz * 0.18;
        terrainNormal += texture2D(nrock, vTerrainWorld.xz * 0.011 - 0.41).xyz * 0.12;
      normal = normalize(normal + terrainNormal * 0.07);
      `)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        ${ormSampling}
        roughnessFactor = clamp((texture2D(ograss, ormUv).g * a + texture2D(odirt, ormUv).g * b +
          texture2D(omud, ormUv).g * c + texture2D(ogravel, ormUv).g * d + texture2D(orock, ormUv).g * e) / sum, 0.58, 0.98);`)
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => 'jurassic-terrain-layered-v3';
  return material;
}

export function createTerrain(renderer, textures, mode = 'beauty') {
  const group = new THREE.Group();
  group.name = '600m-valley-terrain';
  const material = mode === 'normal'
    ? new THREE.MeshNormalMaterial({ flatShading: false })
    : mode === 'white'
      ? new THREE.MeshLambertMaterial({ color: 0xffffff })
      : patchTerrainMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.91, metalness: 0,
        normalMap: textures.grass.normalMap,
        normalScale: new THREE.Vector2(0.24, 0.24),
      }), textures);
  for (let cz = 0; cz < CHUNKS; cz++) {
    for (let cx = 0; cx < CHUNKS; cx++) {
      // Correctness pass: use one shared tessellation while validating the
      // heightfield. LOD is intentionally disabled until boundary morphing
      // can be added without hiding cracks behind fake skirts.
      const segments = 96;
      const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segments, segments);
      geometry.rotateX(-Math.PI / 2);
      const pos = geometry.attributes.position;
      const normals = new Float32Array(pos.count * 3);
      const step = CHUNK_SIZE / segments;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + (cx - 2.5) * CHUNK_SIZE;
        const z = pos.getZ(i) + (cz - 2.5) * CHUNK_SIZE;
        pos.setX(i, x);
        pos.setZ(i, z);
        pos.setY(i, heightAt(x, z));
        const left = heightAt(x - step, z);
        const right = heightAt(x + step, z);
        const down = heightAt(x, z - step);
        const up = heightAt(x, z + step);
        const normal = new THREE.Vector3(
          -(right - left) / (2 * step),
          1,
          -(up - down) / (2 * step),
        ).normalize();
        normals[i * 3] = normal.x;
        normals[i * 3 + 1] = normal.y;
        normals[i * 3 + 2] = normal.z;
      }
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      mesh.name = `terrain-chunk-${cx}-${cz}-${segments}`;
      group.add(mesh);
    }
  }
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(48, 52, 0.7, 64),
    mode === 'normal' ? new THREE.MeshNormalMaterial() :
      mode === 'white' ? new THREE.MeshLambertMaterial({ color: 0xffffff }) :
        new THREE.MeshStandardMaterial({ color: 0x615a48, roughness: 0.95 }));
  pad.scale.z = 0.58;
  pad.position.set(142, heightAt(142, -78) + 0.35, -78);
  pad.receiveShadow = true;
  pad.name = 'future-gate-pad';
  group.add(pad);
  return { group, heightAt };
}
