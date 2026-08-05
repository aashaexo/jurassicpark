export const SSTEP = `
float sstep(float a, float b, float x) {
  return smoothstep(a, b, x);
}
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += noise2(p) * a;
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}
`;

export const FS_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const HEIGHT_TO_NORMAL = `
vec3 heightToNormal(float l, float r, float d, float u, float strength) {
  return normalize(vec3((l - r) * strength, (d - u) * strength, 1.0)) * 0.5 + 0.5;
}
`;
