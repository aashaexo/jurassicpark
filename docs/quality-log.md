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
