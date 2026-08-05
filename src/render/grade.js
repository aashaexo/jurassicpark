import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uTime;
uniform float uExposure;
uniform float uBloom;
uniform float uDof;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec2 uNearFar;
varying vec2 vUv;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
vec3 aces(vec3 x) {
  x *= uExposure;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec2 px = 1.0 / uResolution;
  vec3 c = texture2D(tColor, vUv).rgb;
  vec3 blur = vec3(0.0);
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    blur += texture2D(tColor, vUv + vec2(float(x), float(y)) * px * 2.5).rgb;
  }
  blur /= 25.0;
  float centerDepth = texture2D(tDepth, vUv).r;
  float occlusion = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 tap = vec2(mod(float(i), 2.0) * 2.0 - 1.0, floor(float(i) / 2.0) * 2.0 - 1.0) * px * 3.0;
    occlusion += step(texture2D(tDepth, vUv + tap).r + 0.0015, centerDepth);
  }
  c *= 1.0 - occlusion * 0.018;
  float bright = max(max(blur.r, blur.g), blur.b);
  c += max(blur - 0.72, 0.0) * uBloom * 0.28;
  float depth = texture2D(tDepth, vUv).r;
  float viewDepth = (uNearFar.x * uNearFar.y) / ((uNearFar.y - uNearFar.x) * depth - uNearFar.y);
  viewDepth = max(0.0, -viewDepth);
  float aerial = (1.0 - exp(-uFogDensity * viewDepth)) * smoothstep(0.0005, 0.01, depth);
  c = mix(c, uFogColor, clamp(aerial, 0.0, 0.82));
  float nearBlur = smoothstep(0.0, 0.018, depth) * smoothstep(0.09, 0.02, depth);
  c = mix(c, blur, nearBlur * uDof);
  vec2 centered = vUv - 0.5;
  float vignette = smoothstep(0.92, 0.20, dot(centered, centered));
  c *= mix(0.86, 1.0, vignette);
  float aberration = dot(centered, centered) * 0.0016;
  float r = texture2D(tColor, vUv + centered * aberration).r;
  float b = texture2D(tColor, vUv - centered * aberration).b;
  c.r = mix(c.r, r, 0.35);
  c.b = mix(c.b, b, 0.35);
  c += (hash21(gl_FragCoord.xy + uTime) - 0.5) * 0.012;
  gl_FragColor = vec4(aces(c), 1.0);
}
`;

export function createGrade(renderer, width, height, tier = 'high') {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      tColor: { value: null },
      tDepth: { value: null },
      uResolution: { value: new THREE.Vector2(width, height) },
      uTime: { value: 0 },
      uExposure: { value: tier === 'low' ? 1.9 : 2.35 },
      uBloom: { value: tier === 'high' ? 1.0 : 0.65 },
      uDof: { value: tier === 'low' ? 0.0 : 0.28 },
      uFogColor: { value: new THREE.Color(0.08, 0.11, 0.08) },
      uFogDensity: { value: tier === 'high' ? 0.004 : 0.006 },
      uNearFar: { value: new THREE.Vector2(0.1, 2200) },
    },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);
  return {
    scene, camera, material,
    render(target, time) {
      material.uniforms.tColor.value = target.texture;
      material.uniforms.tDepth.value = target.depthTexture;
      material.uniforms.uTime.value = time;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    resize(w, h) { material.uniforms.uResolution.value.set(w, h); },
  };
}
