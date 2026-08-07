## 2026-08-05 — jungle-trail foundation pivot

The from-scratch valley renderer and its species turntable remain preserved in
the preceding commit, including the foliage debug captures. Per the approved
direction change, this branch now builds on the MIT-licensed
`StarKnightt/jungle-trail` source instead of continuing that renderer.

Baseline verification after the import:

- `npm install` completed with zero vulnerabilities.
- `npm run dump` passed: terrain bounds are `180 × 48.428 × 492 m`,
  matching jungle-trail's authored corridor, with `131,434` vegetation
  instances across `2,575` meshes.
- `npm run shoot -- baseline --tier high --w 1280 --h 720` completed with no
  browser errors or warnings. The software adapter reported 234–505 scene
  calls and 2.66–6.59 million triangles across the seven deterministic stops.
- `npm run isolate` produced `media/diagnostic-jungle-base.png`, hiding
  vegetation, ruins and water while retaining the terrain/atmosphere.

Honest reads of the imported baseline shots in `shots/baseline/`:

- `02.png` — a dark, enclosed trailhead with dense green vegetation and a
  readable path; it looks like a stylized but coherent rainforest corridor.
- `16.png` — a particularly closed-in, dark understory view with layered green
  foliage and little visible sky.
- `34.png` — the trail opens toward a brighter clearing; the warm opening and
  surrounding vegetation establish depth better than the old renderer.
- `52.png` — dense foliage frames a brighter central route, with strong canopy
  occlusion and a continuous ground path.
- `68.png` — the corridor remains richly layered and green, with a broad
  illuminated opening ahead.
- `84.png` — the scene transitions toward the ruins/falls area; distant
  structures and brighter sky are visible through vegetation.
- `96.png` — the endpoint reads as a dark, enclosed ruin/waterfall approach
  with strong foreground silhouettes and a brighter distant opening.

The imported baseline is visually much closer to the jungle-trail reference
than the previous 600 m valley pass. The adapter is SwiftShader in this
environment, so the reported FPS is not a hardware-performance claim.
# Phase 1 visual quality log

All beauty captures use the fixed positions and look-at targets in
`tools/shoot.mjs` at 1280×720, tier `high`. Diagnostic captures use the same
overview pose and the URL modes documented below.

The earlier captures used invalid poses and are not valid visual evidence:
they placed the camera far outside the valley, making the terrain appear as a
small central island while the sky dome's underside filled the frame.

## Iteration: geometry correction

- Diagnostic: `media/diagnostic-normal-overview.png`
- Mode: `?tier=high&mode=normal`
- Pose: position `[-205, 92, 205]`, look-at `[0, 0, 0]`
- Assessment: The normal-material render shows a continuous triangulated
  valley surface with no floating skirt meshes or black parallelogram artifacts;
  the upper frame is neutral diagnostic background, not terrain.

## Iteration: isolated sky correction

- Diagnostic: `media/diagnostic-sky-overview.png`
- Mode: `?tier=high&mode=sky`
- Pose: position `[-205, 92, 205]`, look-at `[0, 0, 0]`
- Assessment: The sky is brighter and no longer night-black, with a warm
  horizon contribution, but it still reads blue-violet rather than as the
  target warm late-afternoon photograph.

## Iteration: flat lighting correction

- Diagnostic: `media/diagnostic-white-overview.png`
- Mode: `?tier=high&mode=white`
- Pose: position `[-205, 92, 205]`, look-at `[0, 0, 0]`
- Assessment: White Lambert terrain is continuously shaped and exposed enough
  to read the valley and basin, with direct-light/shadow separation visible.

## Beauty validation

- `media/road-ground.png` — position `[-128, 12, 148]`, look-at `[-82, 10, 42]`;
  the road and lower terrain are continuous and free of the former skirt
  artifacts, but the foreground material is still darker and less detailed
  than the jungle-trail reference.
- `media/hills-sky.png` — position `[0, 18, -70]`, look-at `[0, 42, -220]`;
  the hill silhouette is continuous with readable atmospheric falloff, while
  the sky remains more saturated than the target late-afternoon photograph.
- `media/valley-overview.png` — position `[-205, 92, 205]`, look-at `[0, 0, 0]`;
  the overview reads as one connected valley landform without floating chunks,
  although the distant terrain and sky still need additional photographic
  grading before matching the reference.
- `media/toward-sun.png` uses the derived road pose recorded in
  `media/report.json`; the earlier hardcoded position is obsolete.

## Iteration: derived camera and light direction

- `media/report.json` now records camera position, look-at, terrain height, and
  render statistics for every screenshot.
- `media/road-ground.png` — derived road pose at
  `[-102.41, 23.18, 145.90]`, terrain height `21.48`; the eye-height view now
  actually occupies the valley and shows a continuous road/terrain surface,
  but the material still reads as a dark warm dirt surface rather than a
  photographic jungle valley.
- `media/diagnostic-white-road.png` — same derived road pose with a white
  Lambert terrain; direct lighting is now present after correcting the sun
  placement from underground to above-horizon, though the warm light is too
  orange for final use.
- `media/hills-sky.png` — derived overview pose; the horizon is no longer the
  painted underside of the sky dome, but the atmospheric sky is still too
  saturated.

## Iteration: restored 600 m terrain placement

- `npm run dump` passes with terrain bounds `[-300, 300]` in both X and Z.
- All 36 chunk centers are separated on a 100 m grid, with no duplicated
  world centers; non-adjacent chunk sphere overlap checks pass.
- `media/road-ground.png` — the eye-height road frame now shows the actual
  valley-scale terrain rather than the old stacked 100 m slab; the frame is
  continuously lit and brown/orange, but still lacks the reference's green
  material richness.
- `media/valley-overview.png` — the 600 m landform occupies the frame with
  broad terrain depth; the sky is still too violet at the zenith.
- `media/hills-sky.png` — distant terrain and blue atmospheric sky are visible
  together; the horizon is no longer the underside of the sky sphere.

## Fresh post-fix captures

- `media/road-ground.png` — the eye-height road shot now shows a real valley
  at close range with a continuous road and terrain surface; it is correctly
  lit after the sun-direction fix, although the dirt remains too orange and
  lacks the reference's fine green ground variation.
- `media/hills-sky.png` — the frame shows blue atmospheric sky over the
  distant hills rather than the sky dome's brown underside; the zenith still
  trends too violet in the wider views.
- `media/valley-overview.png` — the camera now overlooks the actual 600 m
  valley, with terrain depth across the frame and no stacked-chunk slab; the
  broad material palette remains too warm and dark.
- `media/toward-sun.png` — the derived eye-height road view has readable
  sunlit terrain and no detached geometry, but its foreground is still more
  stylized orange dirt than a photographic jungle valley.

## Iteration: jungle palette, continuous normals, and road cleanup

- Terrain normals are now generated from central differences of `heightAt`,
  so adjacent chunks use identical border normals and no longer form
  rectangular tonal patches.
- Grass remains dominant through gentle slopes; dirt and mud are reserved for
  the road and basin, while rock begins only on steep faces.
- The orange directional light was replaced by a less saturated warm-white
  source at lower intensity. The current captures have a more neutral
  illumination, with greener distant flats.
- The black tire-rut tube meshes were removed. The road is now a flush dirt
  ribbon using the baked dirt albedo and normal textures.
- `media/road-ground.png` — reads as a continuous eye-height dirt road with
  no black trench tubes; the close foreground is still dark and needs finer
  rut/ground variation before it matches the reference.
- `media/hills-sky.png` — the distant hills have greener lit flats and the
  sky reads blue overhead with warm haze, though the broad horizon remains
  brighter and less photographic than the reference.
- `media/valley-overview.png` — chunk tonal seams are substantially reduced
  and the valley has a green/yellow tropical palette rather than the earlier
  uniform desert orange; residual warm haze remains in the far ground.
- `media/toward-sun.png` — the road and terrain are continuous and no longer
  contain black rut geometry; the frame is still a procedural foundation,
  not yet a finished jungle photograph.

The `tod` query presets `morning`, `noon`, `afternoon`, and `dusk` all load
without page errors and keep the sun above the horizon.

## Artifact isolation and Phase 2 vegetation

- `media/diagnostic-grade-off-overview.png` — disabling the final grade removes
  the pale wedge pattern; the raw scene has continuous terrain shading. This
  identified the artifact as the aerial/depth portion of the grade pass, not
  chunk splat interpolation.
- `media/diagnostic-road-off-overview.png` — hiding the road leaves a
  continuous valley surface without the dark trench, isolating the second
  artifact to the road ribbon and its grading.
- The grade depth reconstruction now clamps invalid/negative view depths and
  rejects the clear-depth range before applying aerial perspective.
- The road ribbon samples `heightAt` at both edges, sits flush with the
  graded terrain, uses a light dirt material, and no longer contains black
  rut tubes.
- Phase 2 now includes deterministic, seeded, tile-bucketed instanced
  vegetation for canopy trees, palms, broadleaf understory, ferns, tussock
  grass, and fallen logs. Plant geometry uses crossed/bent leaf cards and
  swept trunk geometry, with vertex-stage wind, per-instance tint, and
  species-specific bucket culling.
- `media/road-ground.png` — dense vegetation now frames the road and the
  ribbon is bright enough to read as a track; the foliage is visibly
  procedural and still needs alpha-tested leaf silhouettes and more species
  variation to reach the reference.
- `media/valley-overview.png` — the valley remains readable through a dense
  green understory/canopy layer with no large pale wedge overlays; the
  vegetation currently reads as a first instanced pass rather than a fully
  layered jungle.
- `media/hills-sky.png` — the hills remain visible behind the vegetation and
  the sky-to-ground transition is continuous; distant foliage is still too
  uniform compared with the reference.

## Species turntables

The `?species=<name>` harness renders a centered specimen and a wider patch
under the real scene lighting. The current turntables are deliberately
diagnostic rather than accepted photographic assets:

- `media/species/canopy-close.png` / `canopy-patch.png` — layered crown cards
  and trunk are visible, but the canopy still lacks branch-level irregularity.
- `media/species/palm-close.png` / `palm-patch.png` — the bent frond fan reads
  as a palm silhouette, though the fronds remain too broad and opaque.
- `media/species/treefern-close.png` / `treefern-patch.png` — arching fronds
  read as a tree fern, but the bipinnate leaf structure is not yet resolved.
- `media/species/cycad-close.png` / `cycad-patch.png` — the squat trunk and
  stiff radial fronds read as a cycad, but the foliage is still card-like.
- `media/species/broadleaf-close.png` / `broadleaf-patch.png` — long petiole
  sprays are present, but they do not yet resemble fenestrated monstera leaves.
- `media/species/sapling-close.png` / `sapling-patch.png` — a small branched
  silhouette is visible, with insufficient leaf age and color variation.
- `media/species/fern-close.png` / `fern-patch.png` — the arching crown is
  legible, but the cards still read as dark opaque strips rather than fronds.
- `media/species/tussock-close.png` / `tussock-patch.png` — dense blades fill
  the patch, but the silhouette remains too repetitive.
- `media/species/shrub-close.png` / `shrub-patch.png` — layered shrub volume
  is present, though it still inherits the generic card language.
- `media/species/vine-close.png` / `vine-patch.png` — the hanging form is
  visible, but the leaves need a dedicated heart/lanceolate recipe.
- `media/species/litter-close.png` / `litter-patch.png` — low leaf litter
  geometry is present and helps break the ground plane, but is too sparse.
- `media/species/log-close.png` / `log-patch.png` — the log silhouette reads
  clearly, but moss and bark breakup are still absent.

## Current full-scene pass

- `media/road-ground.png` — the road is less orange and no longer has white
  gravel speckles, while the foreground is now layered with green plants;
  however, the foliage still reads as repeated procedural cards rather than
  photographic leaves.
- `media/valley-overview.png` — the valley has dense green coverage and the
  depth wedges remain absent; the ground is still too uniformly lit and the
  canopy does not yet form convincing overhead occlusion.
- `media/hills-sky.png` — the horizon is warmer and less lavender, but the
  distant ridge remains stylized and the sky still needs a stronger pale-blue
  to cream gradient.

The latest deterministic beauty capture reports 37,430 vegetation instances,
1,275 tile buckets, 785–943 render calls, and 1.45–1.67M triangles. The
software-rendered headless performance sample is approximately 0.55 FPS, so
 bucket culling and reduced bucket count remain follow-up work.

## Brachiosaurus procedural creature slice

Added the first Jurassic Park creature slice:

- shared named-bone `CreatureRig` in `src/world/creatures.js`;
- procedural Brachiosaurus silhouette with torso, hips, five neck segments,
  five tail segments, four articulated legs, feet, head, muzzle, eyes and
  nostrils;
- deterministic breathing, browsing head motion, tail counter-sway and
  quadruped lateral-sequence leg motion;
- terrain grounding for world specimens;
- procedural mottled skin `DataTexture` with rough PBR material;
- deterministic dino turntable and walking-loop capture scripts;
- procedural low-frequency rumble hook in the existing audio engine;
- three Brachiosaurus individuals placed near the late-trail clearing.

Captured:

```text
shots/dinosaurs/brachiosaurus/turntable.png
shots/dinosaurs/brachiosaurus/walk-00.png ... walk-07.png
shots/dinosaurs/brachiosaurus/report.json
shots/dinosaurs/in-world-brachiosaurus.png
```

Honest reads:

- `turntable.png` — the long rising neck, small head, deep torso, four massive
  legs and counterbalancing tail clearly read as a Brachiosaurus silhouette;
  the procedural skin is mottled and the proportions are film-readable, but
  the surface still lacks fine scale relief and the model remains visibly
  stylized at close range.
- `walk-00.png` through `walk-07.png` — breathing, head scanning, tail sway and
  alternating leg phases are visible across the sequence; this is a readable
  ponderous walk prototype, not yet a finished film-quality weight solve because
  the feet are not yet full IK targets.
- `in-world-brachiosaurus.png` — the herd is integrated into the vegetation and
  shadow pipeline, but the animals blend into the dark understory at this
  camera angle and the clearing sightline needs a dedicated reveal composition
  before the herd reads as the money shot.

Creature-only statistics:

```text
meshes:    26
triangles: 12,992
instances: 1
```

The integrated smoke capture at the clearing stop reported 366 scene calls and
approximately 3.78 million visible triangles under SwiftShader. Browser errors
and warnings were empty.

## Brachiosaurus anatomy pass

Reworked the hero animal from rigid capped parts into a continuous lofted,
skinned body:

- one stitched tail-to-shoulder-to-neck body surface;
- smooth cross-section width/height changes through the barrel, shoulder,
  hips, tail and neck;
- separate continuous lofted limb tubes with broad columnar profiles,
  joint bulges and wider shoulder/hip entries;
- forelimbs longer than hindlimbs to create the characteristic sloping back;
- gentle S-curve neck and thick, elevated tapering tail;
- procedural mottling, counter-shading and a normal detail texture;
- clean turntable ground with the player body and scene fog removed.

The new turntable and walk captures were regenerated after the loft rewrite.
The continuous mesh removes the old visible cylinder seams, but the current
close-up still needs another art pass on the head silhouette, joint folds and
true foot-target IK before this can be called final.

## Brachiosaurus density and limb pass

The loft resolution was raised for the hero budget:

```text
body: 180 spine sections × 64 radial segments
head: 40 sections × 36 radial segments
limbs: 24 sections × 32 radial segments
turntable animal: 41,448 triangles
```

The body and limbs now have closed end caps, broad fleshy foot pads and three
short blunt toes per foot. Shoulder/hip blend masses cover the limb junctions,
and the tail profile is arced higher to remain clear of the ground. The skin
material now binds both a mottled albedo `DataTexture` and a procedural normal
`DataTexture`; UVs follow the loft's along/around parameterisation.

Honest capture read:

- `shots/dinosaurs/brachiosaurus/turntable.png` — the higher tessellation
  removes the previous large planar facets and the body reads as a continuous
  surface. Closed legs, feet and shoulder masses are now visible. The
  Brachiosaurus silhouette is substantially stronger, though the head details
  and joint wrinkles remain simpler than the requested final close-up.
- `walk-00.png` through `walk-07.png` — the dense legs remain closed through
  the gait sequence and the feet are now present at ground level. The motion
  has more mass than the previous version, but the terrain IK is still an
  approximation rather than a full planted-foot solver.
- `in-world-brachiosaurus.png` — the herd remains atmospherically integrated;
  the reveal still needs a brighter, more deliberate clearing composition to
  separate the full 13 m silhouette from the understory.

The density smoke capture reported 371 scene calls and approximately 3.81M
visible triangles with no browser or console errors.

## Brachiosaurus implicit-surface pass

The primitive assembly was replaced for the active Brachiosaurus with a
reusable smooth-union volume polygonizer in `src/world/metaball.js`:

- capsule and ellipsoid volumes define torso, ribcage, shoulder/hip mass,
  neck, tail, head, jaw, legs, pads and toes;
- polynomial/exponential-style smooth-min blending merges the volumes;
- marching-tetrahedra polygonisation produces one welded closed surface;
- the resulting mesh is bound to the procedural skeleton with nearest-three
  distance-based skin weights;
- triplanar shader sampling uses the bound procedural skin map, avoiding
  unwrap seams;
- the active hero mesh uses a 0.16 m polygonisation spacing and reports
  70,650 triangles.

New deterministic views:

```text
shots/dinosaurs/brachiosaurus/side.png
shots/dinosaurs/brachiosaurus/three-quarter-front.png
shots/dinosaurs/brachiosaurus/low-hero.png
```

Honest reads:

- `side.png` — the torso is now a single smooth merged volume rather than a
  sheet assembled from sections; the continuous tail, neck and leg junctions
  hold together. The silhouette is substantially more organic, but the
  head anatomy and feet still need a further realism pass.
- `three-quarter-front.png` — the shoulder and chest volume read more broadly
  and the surface no longer shows the old primitive seams. The near-side leg
  still dominates the view, so the gait/foot solve needs additional tuning.
- `low-hero.png` — the elevated neck and torso mass read at a cinematic angle,
  with a much more convincing continuous underside. It is not yet a finished
  film-quality Brachiosaurus because wrinkles, scale relief and detailed foot
  anatomy remain limited.
- `walk-00.png` through `walk-07.png` — the single surface stays closed during
  animation and the limbs remain connected. The current solver is still
  approximate rather than a complete planted-foot IK solution.
- `in-world-brachiosaurus.png` — the fog and vegetation integration remains
  strong, but the clearing reveal still requires a brighter sightline and
  deliberate vegetation thinning.

The implicit turntable mesh reports 70,650 triangles, one skinned mesh and no
browser errors. The in-world smoke capture reported 348 scene calls and
approximately 3.91M visible triangles.

## Brachiosaurus polygoniser winding fix

The marching-tetrahedra output had inconsistent triangle winding, which caused
the implicit surface to render as alternating black/white triangular confetti.
Each generated triangle is now oriented against the analytic SDF gradient at
its centroid before welding. The material remains explicitly `THREE.FrontSide`;
`DoubleSide` was not used to mask the issue.

Added the diagnostic mode:

```text
?dino=brachiosaurus&debug=normal
```

Capture:

```text
shots/dinosaurs/brachiosaurus/normal-debug.png
```

Honest reads:

- `normal-debug.png` — the surface normals now form continuous object-space
  color gradients rather than alternating black/white facets. The previous
  winding artifact is gone.
- `side.png` — the surface shading is coherent across the torso, neck and
  limbs; the triangular confetti is no longer present.
- `three-quarter-front.png` — the merged shoulder/chest volume has continuous
  lighting with no inverted patches.
- `low-hero.png` — the underside and neck retain coherent shading from the
  low angle; remaining limitations are anatomy and skin-detail quality, not
  triangle winding.

The dead `_buildBrachiosaurus()` loft implementation was removed from
`src/world/creatures.js`; the implicit builder is now the only active
Brachiosaurus construction path.

## Brachiosaurus analytic-normal pass

The remaining triangular facet pattern was caused by the polygon mesh carrying
zero/noisy tessellation normals into lighting and triplanar blending. The
polygonizer now writes a central-difference SDF gradient as the normal at every
welded vertex instead of calling `computeVertexNormals()`. A fallback nearest
volume direction handles the mathematically-flat gradient case.

The material's triplanar projection now uses the smooth normal pipeline and the
high-frequency procedural normal map was removed. The skin map remains bound
and is sampled through world-space triplanar coordinates. The normal diagnostic
is a vertex-color view of the analytic normal attribute, which avoids lighting
confounding the diagnostic.

Capture reads:

- `normal-debug.png` — broad red/green/blue gradients cover the surface with no
  triangular mosaic; the analytic normal array contains 121,962 finite values,
  with a range of approximately `-1..1`.
- `side.png` — the former light/dark triangular facets are gone; the torso and
  neck now read as continuous shaded volume with the triplanar skin pattern
  visible at low contrast.
- `low-hero.png` — the underside remains smoothly shaded from the low angle,
  without the previous shard-like normal breaks.

The refreshed captures reported 70,650 creature triangles and no browser or
console errors. `npm run shoot -- analytic-normal-smoke --tier high --w 640
--h 360 --t 0.84` reported 348 scene calls and approximately 3.91M visible
triangles.

## Dinosaur capture material-mode isolation

The turntable harness was allowing the normal-debug invocation to overwrite
beauty captures and relied on mutable global debug state. The dinosaur debug
mode is now an explicit `DinosaurSystem`/`CreatureRig` constructor value,
exposed as `window.__game.creatures.debugNormals`.

Each capture asserts the expected mode before rendering. Beauty and debug
captures use separate browser runs and separate reports:

```text
shots/dinosaurs/brachiosaurus/report.json
shots/dinosaurs/brachiosaurus/normal-report.json
```

The refreshed reports contain:

```text
report.json         debugNormals: false
normal-report.json  debugNormals: true
```

The beauty images show brown/green mottled skin under scene lighting, while
`normal-debug.png` shows pastel RGB normal colors. The images are no longer
identical and the beauty material does not contain the debug normal output.

## Marching-cubes replacement and mesh validation

Replaced the tetrahedral polygonizer with the canonical 256-case marching-cubes
table (standard edge/corner topology and winding). This covers both the
previous bow-tie two-inside tetrahedron case and the omitted/degenerate
tetrahedron coverage problem. The gradient orientation check remains enabled;
the refreshed Brachiosaurus mesh required zero corrective flips.

The capture harness now fails if geometry validation reports:

- SDF-gradient triangle disagreement;
- boundary or non-manifold edges;
- degenerate triangles;
- non-finite positions or normals.

Latest validation:

```text
triangles:         22,864
gradient errors:   0
boundary edges:    0
non-manifold edges:0
degenerate:        0
non-finite:        0
orientation flips: 0
minimum alignment: -0.0000308 (finite-difference tolerance)
```

The turntable images were regenerated:

- `normal-debug.png` — smooth pastel normal gradients with no dark triangular
  holes.
- `side.png` — continuous mottled brown/green skin and coherent volume shading.
- `three-quarter-front.png` — shoulder and chest lighting remain continuous.
- `low-hero.png` — smooth low-angle underside and neck shading.

The tail field now uses three tapering, arcing capsule segments. The neck uses
three smooth-min capsule segments with a longer S-like rise, and the head/
nasal volumes were enlarged for a clearer silhouette. Skin contrast was
increased with stronger mottling and dorsal/belly counter-shading; feet retain
fleshy pads and blunt toes.

Creature geometry is cached by species and grid spacing, while each individual
still receives its own skeleton binding. In-world startup now reports:

```text
instances:       3
triangles:       68,592
polygonize time: 829.3 ms total
cache hits:      2
```

The previous herd path polygonised the same hard-coded field three times; the
cached path performs one polygonisation and two geometry reuses. Capsule and
ellipsoid distance evaluation now uses scalar math to reduce temporary vector
allocation during grid sampling.

## Brachiosaurus studio framing pass

The turntable harness now derives a world-space bounding box from the actual
skinned mesh and computes fit distances from the camera field of view. The
side pose is perpendicular to the animal's long axis, the front pose is on the
head side, and the low pose keeps the complete silhouette inside frame.
Turntable atmosphere volume is disabled while retaining the real sun and
neutral studio ground, so haze no longer washes the skin to grey.

The regenerated reads are:

- `side.png` — full animal is now framed in a true side profile, including the
  complete tapering tail and all four feet.
- `three-quarter-front.png` — the camera is genuinely on the head side rather
  than behind the animal; the head/neck and shoulder silhouette are judgeable.
- `low-hero.png` — the complete body remains inside the low-angle frame with
  readable lit/shadow separation.
- `normal-debug.png` — smooth pastel normals remain clean after the framing and
  atmosphere changes.

The turntable remains at 22,864 triangles per animal and the geometry
validation remains green.

## Current procedural species status

The current cached implicit species meshes validate as follows:

| Species | Triangles | Boundary | Non-manifold | Degenerate | Non-finite | Orientation flips |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Triceratops | 8,442 | 0 | 0 | 0 | 0 | 2 |
| Gallimimus | 3,346 | 0 | 0 | 0 | 0 | 2 |
| Dilophosaurus | 3,058 | 0 | 0 | 0 | 0 | 30 |
| T-Rex | 6,022 | 0 | 0 | 0 | 0 | 4 |

The species are now placed in the world and share the geometry cache. The
remaining weaknesses are that Gallimimus flocking/dust and the Dilophosaurus
proximity frill are procedural approximations rather than authored animation.
No visual acceptance is inferred from these numbers; they only describe fresh
capture and topology checks.

## Current content pass

The final capture harness now warms and streams vegetation around each shot
position, validates named-subject coverage and first-hit visibility, and
records nearby vegetation counts. The nine final frames have been regenerated
with distinct cameras. Gallimimus now has velocity-based cohesion, separation,
alignment, and small foot-dust puffs; these are procedural approximations, not
an authored animation. Dilophosaurus has a separate proximity-driven frill.
Trail dressing includes route markers, a park map board, and crates.

Fresh verification after this pass:

```text
node tools/final.mjs        — all nine final captures passed coverage/visibility/vegetation gates
npm run dino-world          — 18 instances, 19 meshes, 78,020 dinosaur triangles, 13 cache hits
npm run dump                — 131,434 vegetation instances, 61,698,544 vegetation tris, ok: true
normal-run probe            — avg renderOnce 14.6 ms, max 30.8 ms, zero captured console errors
```

Known weaknesses remain: the non-zero orientation-flip counts above have not
been eliminated, and the tan studio sliver has not been conclusively isolated.
These claims describe implementation and harness results only; they are not
visual acceptance.

## Normal gameplay visibility pass

The first implementation placed all dinosaur encounters near the final capture
zone, so normal play from the trailhead did not reveal dinosaurs for a long
stretch. The route was reworked with gameplay-facing encounters and a
pixel-diff probe (`tools/gameplay-probe.mjs`) that renders each sampled route
frame with and without dinosaurs, then with and without vegetation. This avoids
trusting projected bounding boxes when foliage fully occludes an animal.

The normal route now has three verified dinosaur encounters while preserving
rainforest density in the same frames:

| Route sample | Vegetation pixels | Dinosaur evidence |
| --- | ---: | --- |
| `t-0.18` | 64.02% | Brachiosaurus 2.98% pixel diff |
| `t-0.66` | 56.02% | Dilophosaurus 2.57% pixel diff |
| `t-0.74` | 42.09% | Triceratops 3.75%, Dilophosaurus 2.41% pixel diff |

Fresh route screenshots are in `shots/gameplay/route/`. The Brachiosaurus is
visible early on the trail through a narrow canopy sightline, and the later
Dilophosaurus/Triceratops encounters retain near-field foliage, understory and
jungle walls. Gameplay clearings suppress only tall sightline species, leaving
ground cover, broadleaf plants, ferns and litter intact.

The Dilophosaurus was reshaped after visual inspection because the first close
encounter read like a house cat. Its current procedural volume list uses a
longer low body, horizontal tail, S-curved neck, elongated snout, fore-aft crest
blades, small forelimbs and digitigrade hindlimbs. Triceratops frill and brow
horn volumes were also strengthened for the gate encounter.

Fresh verification after this gameplay pass:

```text
node tools/gameplay-probe.mjs  — route pixel-diff visibility/vegetation probe passed
node --check changed JS/MJS    — passed
git diff --check               — passed
npm run dino-world             — 20 instances, 22 meshes, 91,980 dinosaur triangles, 15 cache hits
npm run dump                   — 131,434 vegetation instances, 61,698,544 vegetation tris, ok: true
```
