import * as THREE from 'three';

const vertexShader = `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w;
}
`;
const fragmentShader = `
precision highp float;
varying vec3 vDirection;
uniform vec3 uSunDirection;
uniform float uTurbidity;
uniform float uCameraHeight;
const float PI = 3.14159265359;
const vec3 BETA_R = vec3(5.8e-3, 1.35e-2, 3.31e-2);
const float BETA_M = 0.0021;
float rayleighPhase(float mu) { return 3.0 / (16.0 * PI) * (1.0 + mu * mu); }
float miePhase(float mu, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
}
float hash31(vec3 p) {
  p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash31(i), b = hash31(i + vec3(1,0,0));
  float c = hash31(i + vec3(0,1,0)), d = hash31(i + vec3(1,1,0));
  float e = hash31(i + vec3(0,0,1)), g = hash31(i + vec3(1,0,1));
  float h = hash31(i + vec3(0,1,1)), j = hash31(i + vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),
    mix(mix(e,g,f.x),mix(h,j,f.x),f.y),f.z);
}
float cloud(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += noise3(p) * a; p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
void main() {
  vec3 view = normalize(vDirection), sun = normalize(uSunDirection);
  float mu = dot(view, sun);
  float rayLength = mix(18.0, 3.0, clamp(abs(view.y), 0.0, 1.0));
  vec3 inscatterR = vec3(0.0); float inscatterM = 0.0;
  float opticalR = 0.0, opticalM = 0.0, previous = 0.0;
  for (int i = 0; i < 18; i++) {
    float f = (float(i) + 0.5) / 18.0;
    float t = f * f * rayLength, segment = t - previous;
    previous = t;
    float altitude = max(0.0, uCameraHeight + view.y * t);
    float densityR = exp(-altitude / 8.0), densityM = exp(-altitude / 1.25);
    opticalR += densityR * segment; opticalM += densityM * segment;
    float sunDepth = 1.0 / max(0.08, sun.y + 0.15);
    vec3 transmittance = exp(-(BETA_R * (opticalR + densityR * sunDepth) +
      BETA_M * (opticalM + densityM * sunDepth) * uTurbidity));
    inscatterR += transmittance * densityR * segment;
    inscatterM += transmittance.r * densityM * segment;
  }
  vec3 radiance = inscatterR * BETA_R * rayleighPhase(mu) * 16.0;
  radiance += inscatterM * BETA_M * miePhase(mu, 0.78) * vec3(1.0, 0.83, 0.65) * 9.0;
  float disc = smoothstep(0.99965, 0.99998, mu);
  float limb = 1.0 - 0.32 * (1.0 - smoothstep(0.9997, 1.0, mu));
  radiance += vec3(18.0, 11.8, 5.2) * disc * limb;
  float cloudBand = smoothstep(0.54, 0.72, cloud(view * 2.4 + vec3(0.0, 1.7, 3.1)));
  cloudBand *= smoothstep(0.1, 0.48, view.y) * 0.32;
  radiance += vec3(0.19, 0.15, 0.1) * cloudBand;
  float haze = exp(-max(view.y, -0.05) * max(view.y, -0.05) * 26.0);
  radiance += vec3(0.055, 0.043, 0.026) * haze * (1.0 + 0.7 * max(0.0, sun.y));
  if (view.y < -0.055) radiance = vec3(0.045, 0.036, 0.023);
  gl_FragColor = vec4(max(radiance, vec3(0.0001)), 1.0);
}
`;

export class Sky {
  constructor(renderer, scene) {
    this.renderer = renderer; this.scene = scene;
    this.skyScene = new THREE.Scene();
    this.uniforms = {
      uSunDirection: { value: new THREE.Vector3() },
      uTurbidity: { value: 5.2 },
      uCameraHeight: { value: 0.02 },
    };
    this.horizonRadiance = new THREE.Color(0.08, 0.06, 0.04);
    this.material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms: this.uniforms,
      side: THREE.BackSide, depthWrite: false, toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), this.material);
    this.mesh.scale.setScalar(4500); this.mesh.frustumCulled = false; this.mesh.renderOrder = -1000;
    this.skyScene.add(this.mesh);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileCubemapShader();
    this.cubeTarget = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter,
    });
    this.cubeCamera = new THREE.CubeCamera(0.1, 10000, this.cubeTarget);
    this.setSun(28, 145);
  }
  setSun(elevationDeg, azimuthDeg) {
    const e = THREE.MathUtils.degToRad(Math.max(1, elevationDeg));
    const a = THREE.MathUtils.degToRad(azimuthDeg);
    this.uniforms.uSunDirection.value.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).normalize();
    this.horizonRadiance.setRGB(0.052 + this.sunDirection.y * 0.045, 0.041 + this.sunDirection.y * 0.03, 0.025 + this.sunDirection.y * 0.02);
    if (this.sunDirection.y <= 0) throw new Error('Sky sun elevation must remain above horizon');
    return this;
  }
  bakeEnvironment() {
    this.cubeCamera.update(this.renderer, this.skyScene);
    this.environmentTarget = this.pmrem.fromCubemap(this.cubeTarget.texture);
    this.scene.environment = this.environmentTarget.texture;
    return this;
  }
  addVisibleSky() { this.scene.add(this.mesh); return this; }
  get sunDirection() { return this.uniforms.uSunDirection.value; }
}
