# Wave 4: AC: New Horizons Visuals

Date: 2026-08-27

## Goal

Push Willowbrook's visuals from "playable demo" up to Animal Crossing: New Horizons
quality using a procedural, asset-free pipeline — cel-shading + outlines, real
image-based lighting, AC-shaped silhouettes for trees, cottages, and villagers,
and a polish pass on ambience.

Constraint: stay 100% procedural (no Quaternius / Mixamo / itch / Google Drive).
Three.js with importmap, no build step, runs on `python3 -m http.server 8080`.

## Pieces shipped

### Phase 1 — Cel-shading + outline pass

- New module `src/toon.js` — `gradientMap(steps)` builds a small DataTexture
  with `NearestFilter` so lighting steps into 3 distinct bands (shade / midtone /
  lit). `toonify(source, opts)` converts any existing material into a
  MeshToonMaterial while reading color / emissive / map / vertex colors. `addOutline()`
  + `outlineGroup()` walk a tree and wrap every mesh in an inverted-hull
  back-face black mesh (`thickness = 0.04–0.06`, `renderOrder = 0`).
- All MeshStandardMaterial across `world.js / buildings.js / player.js / npc.js`
  swapped to `MeshToonMaterial({ gradientMap: gradientMap(3), color })`.
  Roughness / metalness / flatShading stripped where they don't make sense
  on toon shading.
- New module `src/outliner.js` exposes `outlineScene(scene, opts)` which walks
  the world after `populate()` / `spawn()` and adds outlines to the visible
  meshes. Initial pass added ~3,000 outline meshes.

### Phase 2 — PolyHaven HDRI for IBL

- Downloaded `kloofendal_misty_morning_puresky_1k.hdr` (702 KB) into
  `assets/hdri/sky.hdr`. Loaded via `RGBELoader` with
  `mapping = EquirectangularReflectionMapping`.
- Set `scene.environment = skyTex` so PBR / toon materials get IBL.
- Tuned `scene.environmentIntensity = 0.35` so the HDRI doesn't wash out the
  cel-shaded colors (the cel look needs controlled lighting, not full envmap).
- Procedural CubeTexture fallback installed in the loader's onError branch.

### Phase 3 — Better procedural trees (6 species)

Rewrote `_makeTree()` in `src/world.js` with six distinct species, each
with a unique silhouette rather than just a different color:

- **oak** — wide lobed canopy with 6 side lobes + crown blob + visible leaf
  clusters at branch tips; 2 random apples (red, low count)
- **cedar** — stacked conical tiers (3 cones of decreasing radius), AC-style
- **spring** — wide lobed canopy in saturated green + 6 side lobes
- **autumn** — wide lobed canopy in orange-red + 6 side lobes + 5 orange fruits
- **fruit** — small dense canopy with 14 visible red apples scattered
- **birch** — slim drooping canopy with sparse leaf clusters + drip-style
  pendant branches; lighter colored trunk

Common to all non-birch species: visible cylindrical branches reaching outward
at angles, root blob at the base, larger main trunk. Trunk height ~1.6,
canopy width ~1.7 — broader-than-tall AC silhouette.

### Phase 4 — Detailed AC cottages

Rewrote `_makeBuildingShell()` in `src/buildings.js`:

- Wood plank siding — vertical grooves (4 thin parallel geometries) +
  horizontal trim at mid-height
- Eave trim — 4 thin bands along wall top
- Roof overhang — 1.0 unit past walls (gives the roof weight AC cottages have)
- Roof ridge cap — cylinder along peak
- Brick chimney with cap on every cottage

Rewrote `_makeDoor()`:

- Recessed panel with two raised insets, threshold step, brass doorknob
  (emissive yellow), stepping stone in front of door

Rewrote `_makeWindows()`:

- 4-pane mullions (cross frame)
- Window sill
- Green shutters with horizontal slat grooves

Apothecary shop now has the red-and-white striped awning across its front.

### Phase 5 — Better procedural characters

Player avatar rewrite (`src/player.js`):

- Backpack (box + flap + two shoulder straps)
- Belt with brass buckle (emissive)
- Hair cap + fringe + side tufts + back tuft
- Oval eyes with whites + pupils + eyebrows + nose + rosy cheeks
- Hands at end of arms, shoes at end of legs (legs/arms now wrapped in
  Groups so animation hooks keep working — `armL.rotation.x` rotates the
  whole arm Group, including the hand)

NPC rewrite (`src/npc.js`) — split into species-specific body builders:

- `_buildBear()` — stocky egg body, belly patch, cheek puffs, lighter muzzle,
  round ears with inner ear, stubby arms, paw feet
- `_buildFrog()` — squat body with belly + back spots, wide flat head,
  tall eye bumps with whites/pupils, curved mouth, long back legs
- `_buildOctopus()` — round head with dome highlight, 8 two-segment curly
  tentacles with suction cups, big eyes, bow on top
- `_buildSquirrel()` — slim pear body, pointy snout, big round eyes with
  shine, pointy ears, BIG bushy tail with lighter tip, tiny arms with hands

Shared helpers `_darken()` / `_lighten()` keep palette consistent across
species.

### Phase 6 — Polish

- **Grass tufts** — 220 procedural tufts scattered across the terrain (each
  tuft = 3–6 crossed PlaneGeometry blades with random colors drawn from 4 grass
  shades). Each tuft has its own wind phase so the field rustles naturally in
  `world.update()`.
- **Dirt path** — `_paintPath()` lays down 48 stepping-stone plates in a
  gentle S-curve from the south shore up to the plaza fountain, with random
  pebbles alongside for organic feel. Plates alternate between two dirt
  browns every 3rd stone.
- **Lantern PointLights** — each of the 4 plaza lanterns got a PointLight bulb
  (`#ffcb6b`, distance 6, decay 2). Lights dim during day and ramp up smoothly
  17:00–19:00, with a subtle 5.3 Hz flicker (multiplied by a 11.1 Hz wobble)
  for that lantern-flame feel.
- **More stars** — starfield bumped 1,400 → 2,000 with the same per-star
  warm/cool color jitter and the existing sparkle-star 1.2 % rarities.

### Verification

Captured via the in-app `browser` tool (no external Chrome):

- `w4-noon-plaza.jpg` — hour 14, plaza overview with stepping-stone path,
  fountain, lit-day lanterns, player with backpack, bear villager visible
  by right cottage, multiple species visible (cedar, oak, birch, fruit)
- `w4-shop-interior.jpg` — shop interior rendered through `?enter=shop`:
  4 category tabs, two shelves of colored goods, counter, chest
- `w4-dawn.jpg` (captured inline) — hour 6.5: peach sky band visible on horizon,
  lanterns still in cool-down glow, stepping stones catch the warm light
- `w4-night.jpg` (captured inline) — hour 20: lanterns fully lit with warm
  pools of light on the plaza, bear villager clearly readable, sky dark
- UI/HUD intact — date/time/bells/top-right, inventory hotbar at bottom,
  compass top-left

No console errors on load. `outlineScene(scene, { thickness: 0.06 })`
adds outlines after spawn with no measurable perf hit.

## Files

- src/toon.js — NEW: gradientMap, toonify, addOutline, outlineGroup
- src/outliner.js — NEW: scene-wide outline walker
- src/world.js — 6-species `_makeTree`, `_plantGrassTufts`, `_paintPath`,
  starfield 2,000, grass sway added to update()
- src/buildings.js — cottage shell, door, window rewrites; lantern
  PointLights + flicker in update()
- src/player.js — backpack, belt, hair, eyes, hands, shoes; arms/legs as Groups
- src/npc.js — species-specific body builders: bear / frog / octopus / squirrel
- src/main.js — outlineScene wired AFTER populate/spawn, HDRI loader + intensity
- assets/hdri/sky.hdr — 702 KB kloofendal_misty_morning_puresky_1k

## Polish followups (post-critic, same session)

The critic returned PASS but flagged six nits. Five were cleaned up in
followup commits the same session; one (HDRI subtlety) was kept as-is
because it's intentional for the controlled cel look.

| Nit | Fix | Commit |
|---|---|---|
| Path stones look like stairs from high angles | Continuous dirt strip under the stones | `784942d` |
| `_setupEnvironment()` called twice in init | Idempotency guard + dropped empty outline pre-pass | `45ccfff` |
| Tiny detail meshes getting 1-2 px outline halos | Expanded `skipKeywords` + named doorknob / buckle / straps | `2c1739d` |
| 12 console warnings on page load (leftover PBR props on MeshToonMaterial) | Stripped `roughness` / `metalness` / `flatShading` from 6 sites | `6366fbd` |
| (in the same commit) No foot-puffs on regular walking | `_lastBob` step detector in `interactions.update()` | `6366fbd` |
| Trees lose toon banding at distance | Shadow-belly sphere under each lobed canopy | `3cae4d3` |
| (kept) HDRI subtle as ambient rim | Intentional — sky dome owns background | — |
| (cleanup) Orphan Quaternius assets dir | `.gitignore`d; not deleted (user can decide) | `526c956` |
| (cleanup) Phase-1 in-progress evidence PNGs | Committed to `.critique/shots/` | `526c956` |

Final commit count on `master`: **8 commits** (`a848a57` initial → `3cae4d3`
post-polish). Local and remote in sync.

## Known gaps for future waves

1. Grass tufts are very visible at noon but disappear at distance — acceptable
2. No ambient bird audio yet (the chirp synth is still there but tied to time)
3. Lantern PointLight pool radius is 6 units — could go to 9 for more glow
4. The HDRI is mostly visible as a slight rim light rather than as a visible
   background — intentional since the sky dome handles background. If we want
   a true reflective ground we'd need a faint envmap cube underlay.
5. The path stops at the plaza; no branch paths to villager homes yet.
