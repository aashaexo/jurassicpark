import { bakeSurface } from '../gfx/bake.js';

const MATERIALS = {
  grass: `
    float blade(vec2 p) {
      float n = noise2(p * vec2(1.0, 8.0));
      return smoothstep(0.68, 0.92, n) * smoothstep(0.18, 0.46, noise2(p * 4.0));
    }
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float macro = fbm(uv * 3.5);
      float clump = fbm(uv * 15.0 + 8.0);
      float blades = blade(uv * 42.0);
      float dead = smoothstep(0.72, 0.9, noise2(uv * 11.0 + 18.0));
      albedo = mix(vec3(0.003, 0.026, 0.002), vec3(0.014, 0.24, 0.008), macro);
      albedo = mix(albedo, vec3(0.09, 0.11, 0.025), dead * 0.22);
      albedo *= 0.76 + clump * 0.34 + blades * 0.14;
      height = macro * 0.06 + clump * 0.018 + blades * 0.045;
      roughness = 0.84 + clump * 0.12;
      ao = 0.64 + macro * 0.20 + blades * 0.08;
    }
  `,
  dirt: `
    float pebble(vec2 p) {
      vec2 cell = floor(p), f = fract(p) - 0.5;
      vec2 jitter = vec2(hash21(cell), hash21(cell + 19.7)) - 0.5;
      float d = length(f - jitter * 0.7);
      return smoothstep(0.23, 0.08, d);
    }
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float strata = fbm(uv * 4.0);
      float crack = smoothstep(0.48, 0.57, abs(noise2(uv * 18.0) - noise2(uv * 18.0 + 4.0)));
      float stones = pebble(uv * 25.0) * (0.5 + noise2(uv * 4.0));
      albedo = mix(vec3(0.14, 0.075, 0.03), vec3(0.46, 0.24, 0.09), strata);
      albedo = mix(albedo, vec3(0.035, 0.018, 0.009), crack * 0.34);
      albedo = mix(albedo, vec3(0.34, 0.31, 0.24), stones * 0.28);
      height = strata * 0.08 + stones * 0.08 - crack * 0.025;
      roughness = 0.82 + crack * 0.14;
      ao = 0.65 + strata * 0.25 - crack * 0.12;
    }
  `,
  mud: `
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float puddle = smoothstep(0.54, 0.8, fbm(uv * 3.2));
      float relief = fbm(uv * 18.0 + 3.0);
      float footprint = smoothstep(0.52, 0.7, noise2(uv * 8.0)) * smoothstep(0.55, 0.45, noise2(uv * 8.0 + 12.0));
      albedo = mix(vec3(0.07, 0.04, 0.022), vec3(0.27, 0.14, 0.055), relief);
      albedo *= 0.82 + puddle * 0.24;
      height = relief * 0.04 + footprint * 0.055;
      roughness = mix(0.88, 0.36, puddle);
      ao = 0.59 + relief * 0.25;
    }
  `,
  gravel: `
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float stones = noise2(uv * 42.0);
      float medium = fbm(uv * 7.0);
      float chips = smoothstep(0.55, 0.8, noise2(uv * 94.0));
      albedo = mix(vec3(0.2, 0.18, 0.14), vec3(0.5, 0.43, 0.3), medium);
      albedo = mix(albedo, vec3(0.44, 0.40, 0.31), chips * 0.3);
      height = stones * 0.06 + chips * 0.025;
      roughness = 0.82 + stones * 0.15;
      ao = 0.7 + medium * 0.2;
    }
  `,
  rock: `
    void surf(vec2 uv, out vec3 albedo, out float height, out float roughness, out float ao) {
      float strata = fbm(vec2(uv.x * 2.2, uv.y * 7.0));
      float fractures = smoothstep(0.42, 0.56, abs(noise2(uv * 15.0) - 0.5));
      float lichen = smoothstep(0.64, 0.8, noise2(uv * 5.0 + 22.0));
      albedo = mix(vec3(0.16, 0.18, 0.15), vec3(0.43, 0.43, 0.33), strata);
      albedo = mix(albedo, vec3(0.18, 0.25, 0.13), lichen * 0.45);
      albedo = mix(albedo, vec3(0.035, 0.04, 0.032), fractures * 0.42);
      height = strata * 0.13 + fractures * 0.02;
      roughness = 0.88 + fractures * 0.1;
      ao = 0.58 + strata * 0.28 - fractures * 0.12;
    }
  `,
};

export function bakeGroundTextures(renderer, tier = 'high') {
  const size = tier === 'low' ? 256 : 512;
  return Object.fromEntries(Object.entries(MATERIALS).map(([name, source]) => [
    name,
    bakeSurface(renderer, source, {
      size, repeat: 3,
      normalStrength: name === 'rock' ? 3.2 : 2.2,
    }),
  ]));
}
