/* Wind — the canopy overhead.
 *
 * Under a closed canopy you barely feel wind; you *hear* it arrive in the
 * leaves above and pass over. Two textures carry that:
 *
 *  - a low "wash" (pink noise, lowpassed) that is the air itself and is
 *    always faintly present, and
 *  - a "rustle" (broadband granular noise) that is the leaves, and only
 *    exists when a gust is actually pushing them.
 *
 * The gust envelope is the part that must never repeat, so it is not baked:
 * it is a pure function of time built from two incommensurate Perlin rates,
 * evaluated at control rate by both the engine and the offline renderer.
 * The rustle follows a *thresholded* copy of it — leaves need real wind
 * before they move at all — which is what gives gusts a beginning and an
 * end instead of the whole layer just breathing louder and softer.
 */
import {
  makeRng, rrange, biquad, makePink, clamp, smoothstep, normalize, loopify,
} from './dsp.js';

export const RUSTLE_LOOPS = [9.31, 10.69];
export const WASH_LOOP = 12.07;

/**
 * Leaf rustle texture. Broadband noise alone sounds like tape hiss; the
 * micro-AM at ~40 Hz chops it into the small dry collisions actual foliage
 * makes. The modulator is half-wave shaped so the grains have silence
 * between them — symmetric AM just sounded like slower hiss.
 */
export function renderRustle(sr, seed, seconds) {
  const rng = makeRng(seed);
  const n = Math.round(seconds * sr);
  const out = new Float32Array(n);
  const bp = biquad('bandpass', sr, rrange(rng, 2600, 3400), 0.35);
  const gateLp = biquad('lowpass', sr, rrange(rng, 32, 48), 0.707);
  for (let i = 0; i < n; i++) {
    const g = Math.max(0, gateLp.step((rng() * 2 - 1) * 8));
    out[i] = bp.step(rng() * 2 - 1) * (0.25 + 0.75 * Math.min(1, g * g * 3));
  }
  return loopify(normalize(out), sr);
}

/** The air component: felt more than heard, it fills the floor of the mix. */
export function renderWash(sr, seed, seconds = WASH_LOOP) {
  const rng = makeRng(seed);
  const n = Math.round(seconds * sr);
  const out = new Float32Array(n);
  const pink = makePink(rng);
  const lp = biquad('lowpass', sr, 350, 0.707);
  for (let i = 0; i < n; i++) out[i] = lp.step(pink());
  return loopify(normalize(out), sr, 0.15);
}

/**
 * Gust strength at time t, 0..1. Two rates: the slow one is weather (does
 * the next half-minute have wind in it), the fast one is the individual
 * gust. Either alone was wrong — only-slow never surprises, only-fast
 * flutters like a flag.
 */
export function gustEnvelope(gesture, t) {
  const v = 0.55 * gesture(t * 0.045, 51) + 0.45 * gesture(t * 0.21, 52);
  return clamp(0.5 + 0.62 * v, 0, 1);
}

/** Wash gain from gust strength: present at rest, filled out in gusts. */
export function washGain(g) { return 0.35 + 0.65 * g; }

/**
 * Rustle gain from gust strength: thresholded, then curved so the loudest
 * gusts open up disproportionately. The left/right channels of the canopy
 * evaluate this at slightly offset times, which makes a gust cross the
 * canopy overhead instead of switching on in both ears at once.
 */
export function rustleGain(g) { return Math.pow(smoothstep(0.36, 0.92, g), 1.5); }

/** Seconds the right channel lags the left: the gust's travel time. */
export const RUSTLE_LAG = 0.35;

export const BRUSH_LOOP = 7.73;
export const CREAK_VARIANTS = 3;

/**
 * Brush-through texture: the player's own body pushing past foliage.
 * Same granular recipe as the canopy rustle but a broader band and a much
 * denser gate — near-field leaves brush continuously rather than in the
 * discrete gusty collisions the canopy makes overhead.
 */
export function renderBrush(sr, seed, seconds = BRUSH_LOOP) {
  const rng = makeRng(seed);
  const n = Math.round(seconds * sr);
  const out = new Float32Array(n);
  const bp = biquad('bandpass', sr, rrange(rng, 1700, 2300), 0.45);
  const gateLp = biquad('lowpass', sr, rrange(rng, 70, 110), 0.707);
  for (let i = 0; i < n; i++) {
    const g = Math.max(0, gateLp.step((rng() * 2 - 1) * 8));
    out[i] = bp.step(rng() * 2 - 1) * (0.15 + 0.85 * Math.min(1, g * g * 4));
  }
  return loopify(normalize(out), sr);
}

/**
 * A branch creak: gated noise through a high-Q bandpass, so the woody
 * resonance is the filter's ring and the stick-slip is the gate. A raised
 * sine envelope gives it the lean-and-release shape of a trunk loading up
 * under a gust and letting go.
 */
export function renderCreak(sr, seed) {
  const rng = makeRng(seed);
  const seconds = rrange(rng, 1.1, 1.9);
  const n = Math.round(seconds * sr);
  const out = new Float32Array(n);
  const bp = biquad('bandpass', sr, rrange(rng, 160, 300), 6);
  const gate = biquad('lowpass', sr, rrange(rng, 9, 15), 0.707);
  for (let i = 0; i < n; i++) {
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, (i / n) * 1.15)), 1.5);
    const g = Math.max(0, gate.step((rng() * 2 - 1) * 10));
    out[i] = bp.step((rng() * 2 - 1) * (0.2 + 0.8 * Math.min(1, g * g * 5))) * env;
  }
  return normalize(out);
}

/**
 * Brush gain from normalized player speed (speed / jog speed). Zero at
 * rest — foliage you are not moving through makes no contact noise — and
 * saturating below full jog so a walk already reads.
 */
export function brushGain(speedNorm) {
  return smoothstep(0.12, 0.85, speedNorm);
}

/**
 * Creak scheduler: creaks only happen when a gust is actually loading the
 * trees, so candidate times walk forward until the gust envelope is high.
 * Same shape as the bird/insect schedulers — a stateful next() the engine
 * and the offline renderer both consume, so a WAV has the same creaks the
 * game would.
 */
export function makeCreakEvents(seed, gesture) {
  const rng = makeRng(seed ^ 0xc4ea);
  let t = rrange(rng, 4, 10);
  return {
    next() {
      for (let guard = 0; guard < 400; guard++) {
        const g = gustEnvelope(gesture, t);
        if (g > 0.52 && rng() < 0.7) {
          const ev = {
            time: t,
            variant: (rng() * CREAK_VARIANTS) | 0,
            az: rng() * Math.PI * 2,
            dist: rrange(rng, 5, 16),
            elev: rrange(rng, 3, 8),
            rate: 0.92 + rng() * 0.16,
            gain: 0.7 + 0.5 * smoothstep(0.52, 1, g),
          };
          t += rrange(rng, 3, 9);
          return ev;
        }
        t += rrange(rng, 1.5, 4);
      }
      // Calm weather for minutes on end: emit a soft distant creak anyway
      // rather than letting a consumer loop on next() forever.
      const ev = {
        time: t, variant: (rng() * CREAK_VARIANTS) | 0,
        az: rng() * Math.PI * 2, dist: 14, elev: 6, rate: 1, gain: 0.5,
      };
      t += rrange(rng, 6, 12);
      return ev;
    },
  };
}
