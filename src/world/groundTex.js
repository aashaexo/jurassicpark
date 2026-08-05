import { bakeSurface } from '../gfx/bake.js';

const MATERIALS = {
  grass: `
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float broad = fbm(uv * 5.0);
      float fine = noise2(uv * 72.0);
      albedo = mix(vec3(0.055, 0.115, 0.045), vec3(0.20, 0.31, 0.095), broad);
      albedo *= 0.80 + fine * 0.34;
      height = broad * 0.07 + fine * 0.012;
      roughness = 0.86 - broad * 0.10;
      ao = 0.84 + fine * 0.16;
    }
  `,
  dirt: `
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float broad = fbm(uv * 4.2);
      float grain = noise2(uv * 90.0);
      albedo = mix(vec3(0.11, 0.065, 0.032), vec3(0.34, 0.19, 0.085), broad);
      albedo *= 0.78 + grain * 0.35;
      height = broad * 0.09 + grain * 0.015;
      roughness = 0.93;
      ao = 0.72 + broad * 0.28;
    }
  `,
  mud: `
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float cloudy = fbm(uv * 3.0);
      float flecks = noise2(uv * 42.0);
      albedo = mix(vec3(0.075, 0.055, 0.032), vec3(0.19, 0.125, 0.062), cloudy);
      albedo *= 0.84 + flecks * 0.22;
      height = cloudy * 0.035;
      roughness = 0.72 + cloudy * 0.16;
      ao = 0.68 + cloudy * 0.22;
    }
  `,
  gravel: `
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float cells = noise2(uv * 38.0);
      float broad = fbm(uv * 6.0);
      albedo = mix(vec3(0.18, 0.17, 0.13), vec3(0.36, 0.34, 0.27), broad);
      albedo *= 0.72 + cells * 0.44;
      height = cells * 0.045;
      roughness = 0.88;
      ao = 0.78 + cells * 0.18;
    }
  `,
  rock: `
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float layers = fbm(uv * 3.4);
      float chips = noise2(uv * 28.0);
      albedo = mix(vec3(0.12, 0.15, 0.12), vec3(0.29, 0.31, 0.25), layers);
      albedo *= 0.78 + chips * 0.28;
      height = layers * 0.13 + chips * 0.025;
      roughness = 0.94;
      ao = 0.62 + layers * 0.30;
    }
  `,
};

export function bakeGroundTextures(renderer, tier = 'high') {
  const size = tier === 'low' ? 128 : 256;
  return Object.fromEntries(Object.entries(MATERIALS).map(([name, source]) => [
    name,
    bakeSurface(renderer, source, { size, repeat: 4, normalStrength: name === 'rock' ? 2.8 : 1.8 }),
  ]));
}
