# Phase 1 visual quality log

All beauty captures use the fixed positions and look-at targets in
`tools/shoot.mjs` at 1280×720, tier `high`. Diagnostic captures use the same
overview pose and the URL modes documented below.

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
- `media/toward-sun.png` — position `[65, 22, 35]`, look-at `[180, 28, -120]`;
  the sun-facing frame has warm atmospheric lighting and a continuous ground
  plane, but the sun disc is small and the foreground remains too dark.
