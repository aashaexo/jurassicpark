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
uniform float uTimeOfDay;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += noise2(p) * a; p = p * 2.0 + 7.3; a *= 0.5; }
  return v;
}
void main() {
  vec3 d = normalize(vDirection);
  float h = max(d.y, 0.0);
  float sunDot = max(dot(d, normalize(uSunDirection)), 0.0);
  vec3 horizon = vec3(0.80, 0.43, 0.22);
  vec3 mid = vec3(0.26, 0.42, 0.48);
  vec3 zenith = vec3(0.035, 0.12, 0.20);
  vec3 sky = mix(horizon, mid, smoothstep(0.0, 0.38, h));
  sky = mix(sky, zenith, smoothstep(0.32, 1.0, h));
  float rayleigh = pow(1.0 - abs(d.y), 1.7) * (0.5 + 0.5 * d.y);
  float mie = pow(sunDot, 7.0) * 0.34 + pow(sunDot, 500.0) * 16.0;
  sky += vec3(0.13, 0.18, 0.22) * rayleigh;
  sky += vec3(1.0, 0.42, 0.12) * mie;
  float cloudBand = smoothstep(0.46, 0.64, fbm(d.xz * 3.0 + vec2(uTimeOfDay, 0.0)));
  cloudBand *= smoothstep(0.15, 0.52, d.y) * 0.17;
  sky = mix(sky, vec3(0.88, 0.72, 0.56), cloudBand);
  sky = mix(sky, vec3(0.66, 0.38, 0.19), smoothstep(0.16, -0.04, d.y));
  gl_FragColor = vec4(max(sky, vec3(0.005)) * 2.1, 1.0);
}
`;

export class Sky {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.skyScene = new THREE.Scene();
    this.uniforms = {
      uSunDirection: { value: new THREE.Vector3(0.52, 0.43, 0.74).normalize() },
      uTimeOfDay: { value: 0.35 },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.material);
    this.mesh.scale.setScalar(4500);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.skyScene.add(this.mesh);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileCubemapShader();
    this.cubeTarget = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    this.cubeCamera = new THREE.CubeCamera(0.1, 10000, this.cubeTarget);
    this.sunElevation = 26;
    this.setSun(26, 145);
  }

  setSun(elevationDeg, azimuthDeg) {
    const elevation = THREE.MathUtils.degToRad(elevationDeg);
    const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
    this.sunElevation = elevationDeg;
    this.uniforms.uSunDirection.value.set(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth),
    ).normalize();
    if (this.uniforms.uSunDirection.value.y <= 0) {
      throw new Error('Sky sun elevation must remain above the horizon');
    }
    return this;
  }

  bakeEnvironment() {
    this.cubeCamera.update(this.renderer, this.skyScene);
    const pmremTarget = this.pmrem.fromCubemap(this.cubeTarget.texture);
    this.scene.environment = pmremTarget.texture;
    this.environmentTarget = pmremTarget;
    return this;
  }

  addVisibleSky() {
    this.scene.add(this.mesh);
    return this;
  }

  get sunDirection() {
    return this.uniforms.uSunDirection.value;
  }
}
