---
name: testing-jungle-trail
description: How to run and visually test the procedural Jurassic Park / jungle-trail WebGL game (first-person trail, dinosaur encounters, capture harnesses) on a GPU-less Devin box.
---

# Testing the jungle-trail / Jurassic Park WebGL game

## Run the app
```bash
node tools/serve.mjs 8099          # static server; file:// will not work (ES modules + importmap)
```
Open `http://localhost:8099/`. Useful URL hash params (parsed **only at page load** —
changing the hash on a live page does nothing, you must reload):

- `#tier=low|medium|high|ultra` — quality tier (`src/main.js:40-64`)
- `#fps=<n>` — frame cap
- `#manual` — do not auto-start the loop (used by the capture harnesses)
- `?dino=<species>`, `?park=1`, `?parkStudio=1`, `?fenceStudio=1`, `?jeepStudio=1` — isolation/studio modes

## GPU-less boxes: expect software rendering, plan around it
Devin boxes typically have **no GPU**; Chrome falls back to ANGLE/Vulkan **SwiftShader** on ~2 cores.
Observed behaviour and workarounds:

- At the default `high` tier the canvas may stay **black forever** (frame never composites). Load with
  `#tier=low` (and a modest window, ~1100x800) — then it renders in ~1–2 min after load.
- The in-game **F3 overlay** shows FPS / CPU frame ms / draws / triangles / quality / GPU string. It
  reported `FPS 4.0` but `CPU frame ~700–1200 ms`, i.e. ~1 real frame per second.
- Because the loop clamps `dt` to 0.25 s (`src/main.js`), low fps also **slows in-game travel** to
  roughly 0.3–0.7 m/s instead of the 3.1 m/s jog. Walking the whole ~410 m trail is impractical; budget
  minutes per 20 m, or use route warps (below).
- Chrome's GPU process may crash under sustained load (`GPU process exited unexpectedly: exit_code=512`,
  canvas goes black) — relaunch and reload. Launch Chrome **detached** or the exec-tool shell teardown
  kills it:
  ```bash
  setsid nohup /opt/.devin/playwright_browsers/chromium-*/chrome-linux/chrome \
    --remote-debugging-port=29229 --user-data-dir=$HOME/.config/google-chrome-for-testing \
    --no-first-run --disable-hang-monitor --window-size=1100,800 \
    "http://localhost:8099/#tier=low&fps=20" >/tmp/chrome.log 2>&1 </dev/null & disown
  ```
  `--disable-hang-monitor` suppresses the "Page unresponsive" dialogs that otherwise cover the frame.
- The CDP-based console tool is frequently unavailable while the scene renders
  ("Could not connect to Chrome via CDP"). Do not build a plan that depends on reading `window.__game`
  from the console; prefer on-screen evidence and the F3 overlay.

## Playing it (in-game controls)
- Click the canvas → pointer lock; `walker.enabled` (and therefore all keys) is gated on pointer lock.
- `W/A/S/D` walk, `Shift` = jog, `Space` = jump, mouse = look, `F3` = debug overlay.
- **Digit keys 1–9 warp along the route** (`WARP_STOPS` in `src/main.js`, calls `goTo(t)` and faces along
  the trail — identical to what the capture harness does). Default stops are t = 0.04/0.34/0.81/0.88/0.96.
  For encounter testing it is legitimate and much faster to **temporarily** extend `WARP_STOPS` with the
  t values you need, test with in-game keypresses, then revert the edit before reporting.
- Mouse-look via synthetic `mouse_move` needs **large** cumulative deltas to visibly rotate; a 100 px
  move at ~1 fps looks like nothing happened.

## Where the content lives
- Dinosaur placements: `src/world/creatures.js` (`spots` for brachiosaurus, then `add(species, x, z, …)`).
- Canopy sightline clearings for gameplay visibility: `src/main.js` (`veg.suppressZone(x, z, r, species)`
  with a species allow-list) and `src/world/vegetation.js` (`suppressZone`).
- Trail geometry / route t: `src/world/path.js` (`CONTROL` points, arc length ~410 m, travel is along −Z).

## Capture harnesses (headless, good regression evidence)
```bash
node tools/gameplay-probe.mjs                       # normal-route pixel-diff probe → shots/gameplay/route/
GAMEPLAY_SAMPLES=0.18,0.66,0.74 node tools/gameplay-probe.mjs   # subset: ~5 min/sample instead of ~1 h
node tools/final.mjs                                # nine cinematic captures → shots/final/ (~15 min)
node tools/dino-world.mjs ; node tools/dump.mjs
```
- Both harnesses self-assert (freshness of output PNGs, camera settling, `nearbyVegetation`, coverage),
  so a clean exit is meaningful. `gameplay-probe` logs per-sample `vegetationDiff` and per-species
  `pixelDiff` — a non-trivial species `pixelDiff` (≥ ~2 %) plus a high `vegetationDiff` (40–65 %) is the
  intended "dinosaur visible but jungle still dense" signature.
- `shots/` is **gitignored** — captures are local artifacts, so "fresh" must be judged by mtime.
- Frames in deep canopy are legitimately very dark at `tier=low`; brighten a copy (e.g. PIL
  `ImageEnhance.Brightness(...).enhance(2.6)`) for report legibility and keep the raw frame alongside.
- The desktop screenshot tool's coordinate space (1024x768) is scaled vs the real display (e.g.
  1600x1200); multiply by `real_width/1024` when cropping saved screenshots with PIL.

## Devin Secrets Needed
None — everything is local and procedural (no external assets, no API keys).
