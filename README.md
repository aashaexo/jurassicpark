# Jurassic Park

This project is derived from
[StarKnightt's jungle-trail](https://github.com/StarKnightt/jungle-trail),
which is MIT-licensed. The original license and copyright notice are preserved
in [`LICENSE-jungle-trail`](LICENSE-jungle-trail), and the reused systems are
listed in [`NOTICE`](NOTICE). Our Jurassic Park-specific additions are covered
by [`LICENSE`](LICENSE).

Jurassic Park is a procedural Three.js exploration scene built on that
jungle-trail foundation. The verified base provides a dense tropical trail,
layered vegetation, procedural ruins, a waterfall and brook, atmospheric
lighting, first-person traversal, synthesized ambience, and deterministic
capture tooling.

## Running locally

There is no build step. Install dependencies for the capture tools, then serve
the page over HTTP:

```bash
npm install
npm run serve
```

Open <http://localhost:8099/>.

Deterministic baseline captures:

```bash
npm run shoot
```

Diagnostics:

```bash
npm run dump
npm run isolate
```

## Base systems

- procedural heightfield terrain and trail/path shaping;
- 100,000+ deterministic plants across sixteen species;
- bent leaf cards, swept tubes, alpha-tested atlases and analytical canopy
  transmittance;
- procedural ruins, stone materials, brook, spillway and waterfall;
- atmospheric scattering, volumetric effects, HDR grading and bloom;
- first-person player body, collision world and traversal;
- synthesized jungle ambience and deterministic browser capture tools.

Jurassic Park-specific gate architecture, vehicles, dinosaurs and signage are
deferred until this base remains stable.
