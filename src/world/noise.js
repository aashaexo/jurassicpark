const TABLE = new Uint8Array(512);
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export class Noise2D {
  constructor(seed = 2026) {
    const random = mulberry32(seed);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) TABLE[i] = p[i & 255];
  }
  value(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const u = fade(fx), v = fade(fz);
    const grad = (h, dx, dz) => {
      const a = h & 3;
      return ((a & 1) ? dx : -dx) + ((a & 2) ? dz : -dz);
    };
    const X = ix & 255, Z = iz & 255;
    const aa = TABLE[TABLE[X] + Z], ab = TABLE[TABLE[X] + Z + 1];
    const ba = TABLE[TABLE[X + 1] + Z], bb = TABLE[TABLE[X + 1] + Z + 1];
    const x0 = grad(aa, fx, fz), x1 = grad(ba, fx - 1, fz);
    const x2 = grad(ab, fx, fz - 1), x3 = grad(bb, fx - 1, fz - 1);
    const a = x0 + (x1 - x0) * u;
    const b = x2 + (x3 - x2) * u;
    return (a + (b - a) * v) * 0.5 + 0.5;
  }
  fbm(x, z, octaves = 5, gain = 0.5) {
    let value = 0, amp = 0.5, total = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.value(x, z) * amp;
      total += amp;
      x = x * 2.02 + 17.7;
      z = z * 2.02 - 11.3;
      amp *= gain;
    }
    return value / total;
  }
  ridged(x, z, octaves = 5, gain = 0.55) {
    let value = 0, amp = 0.5, total = 0;
    for (let i = 0; i < octaves; i++) {
      value += (1 - Math.abs(this.value(x, z) * 2 - 1)) * amp;
      total += amp;
      x = x * 2.01 + 9.1;
      z = z * 2.01 - 15.2;
      amp *= gain;
    }
    return value / total;
  }
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
