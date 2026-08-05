# Jurassic Park Valley

An early procedural scene study for a photorealistic Jurassic Park valley:
warm Isla Nublar afternoon light, a graded jeep road, a future gate pad, a
shallow lagoon basin, and jungle hills. Everything visible is generated in
Three.js at runtime; no models, image textures, HDR files, or audio are
committed.

The rendering approach is inspired by
[`StarKnightt/jungle-trail`](https://github.com/StarKnightt/jungle-trail), whose
procedural GPU texture baking, sky/IBL pairing, terrain chunking, and restrained
HDR post-processing were used as technical reference. This project is an
independent implementation for a wider open valley rather than a copied scene.

## Run

```bash
npm install
npm run serve
```

Open <http://localhost:8099/>. There is intentionally no bundler or build step;
Three.js r170 is imported from jsDelivr through the import map.

Controls: click for pointer lock, WASD to walk, Shift to sprint, Space to jump,
F to toggle spectator/free-fly mode, and F3 to toggle diagnostics.

## Phase 1 architecture

- `src/main.js`: WebGL renderer, half-float HDR target, fixed-step simulation,
  quality tiers, player-following shadow frustum, diagnostics.
- `src/render/sky.js`: analytic Rayleigh/Mie-inspired sky, sun disc, haze,
  clouds, cube capture and PMREM environment lighting.
- `src/world/terrain.js`: chunked 600 m valley heightfield, basin, hills,
  gate pad, slope-aware PBR splatting.
- `src/world/road.js`: spline road with cut/fill, banking, shoulder and ruts.
- `src/gfx/`: GLSL noise and GPU-baked albedo/normal/ORM material sets.
- `src/render/grade.js`: HDR fullscreen grade with bloom, AO-like depth darkening,
  DOF, vignette, aberration and grain.
- `src/player/`: first-person/spectator controller and terrain contact.

Later phases will add procedural vegetation, the park gate, dinosaurs,
water/lagoon detail, signage, and audio.
