import * as THREE from 'three';
import { FS_VERT, HEIGHT_TO_NORMAL, SSTEP } from './glsl.js';

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
quad.frustumCulled = false;
scene.add(quad);

const fragment = (surface) => `
precision highp float;
varying vec2 vUv;
uniform int uChannel;
uniform float uTexel;
uniform float uNormalStrength;
${SSTEP}
${HEIGHT_TO_NORMAL}
${surface}
void main() {
  vec3 albedo; float height; float roughness; float ao;
  surf(vUv, albedo, height, roughness, ao);
  if (uChannel == 0) {
    gl_FragColor = vec4(albedo, 1.0);
  } else if (uChannel == 1) {
    vec3 a; float left; float right; float down; float up; float rr; float oo;
    surf(vUv - vec2(uTexel, 0.0), a, left, rr, oo);
    surf(vUv + vec2(uTexel, 0.0), a, right, rr, oo);
    surf(vUv - vec2(0.0, uTexel), a, down, rr, oo);
    surf(vUv + vec2(0.0, uTexel), a, up, rr, oo);
    gl_FragColor = vec4(heightToNormal(left, right, down, up, uNormalStrength), 1.0);
  } else {
    gl_FragColor = vec4(ao, roughness, 0.0, 1.0);
  }
}`;

export function bakeSurface(renderer, surface, {
  size = 256, repeat = 1, normalStrength = 2.0, uniforms = {},
} = {}) {
  const material = new THREE.ShaderMaterial({
    vertexShader: FS_VERT,
    fragmentShader: fragment(surface),
    uniforms: {
      uChannel: { value: 0 },
      uTexel: { value: 1 / size },
      uNormalStrength: { value: normalStrength },
      ...uniforms,
    },
    depthTest: false,
    depthWrite: false,
  });
  quad.material = material;
  const previous = renderer.getRenderTarget();
  const targets = [];
  const draw = (channel, colorSpace) => {
    const target = new THREE.WebGLRenderTarget(size, size, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: true,
      colorSpace,
      depthBuffer: false,
      stencilBuffer: false,
    });
    target.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    material.uniforms.uChannel.value = channel;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    target.texture.repeat.set(repeat, repeat);
    targets.push(target);
    return target.texture;
  };
  const result = {
    map: draw(0, THREE.SRGBColorSpace),
    normalMap: draw(1, THREE.NoColorSpace),
    ormMap: draw(2, THREE.NoColorSpace),
  };
  renderer.setRenderTarget(previous);
  material.dispose();
  quad.material = null;
  result.dispose = () => targets.forEach((target) => target.dispose());
  return result;
}
