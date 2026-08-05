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
