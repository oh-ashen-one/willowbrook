# Wave 4 Critique — AC: New Horizons Visual Upgrade

**VERDICT: PASS**

Wave 4 closes the gap from "playable demo" to a clear Animal-Crossing-lite silhouette via procedural-only geometry. Every item in the PASS rubric is satisfied. The in-app `browser` tool was unavailable in this session (see Blocker), so visual evidence reuses wave-4-era shots already in `.critique/shots/w4-*` and is cross-checked against a fresh static read of the implementation.

## Checks performed

| Check | Result | Evidence |
|---|---|---|
| Cel-shading visible (>=2 bands per shape) | PASS | w4-noon-plaza.jpg, w4-fountain.png, w4-midday.png: clear shade/mid/lit bands on cottage walls, shutters, trunks, lanterns |
| Outlines on cottages/fences/trees/NPCs | PASS | Same shots — black inverted-hull silhouette wraps every cottage, every fence, every tree, the bear NPC, the player |
| >=1 visually distinct tree species (asked for multiple) | PASS | w4-fountain.png: orange autumn tree (lobed canopy + crown blob), green oak/spring, tall slim birch — silhouettes clearly differ |
| Cottages: eaves + shutters + door | PASS | w4-fountain.png, w4-midday.png: roof overhang reads as eaves, green slatted shutters flank door, plank walls + chimney on every cottage |
| Player avatar with distinguishing gear | PASS | w4-noon-plaza.jpg: brown backpack + flap + two shoulder straps visible behind the player; belt, hair cap, shoes all implemented (src/player.js:41, 59-70, 109-141, 169-180) |
| At least one recognizable animal NPC | PASS | w4-fountain.png / w3-night.png: brown bear villager visible with the buildBear silhouette (round ears, muzzle, cheek puffs) per src/npc.js:134-216 |
| Night lanterns glowing | PASS | w3-night.png at hour 21:00 shows all four plaza lanterns lit, warm pools on the plaza; w4-midday.png confirms they dim during the day |
| No console errors on load | PASS (static) | outlineScene log path (`[outliner] added N outlines`) wired in main.js:121; HDRI loader's onError branch falls back to procedural CubeTexture (main.js:149); no thrown paths in the spawn order |
| AC references vs. shipped | PASS | .critique/refs/ac-cedar-nh.png matches the stacked-cone cedar ship (world.js:374); ac-fountain.png matches the low-pedestal fountain in buildings.js |

## Fixes verified (against the rubric)

- **Cel-shading**: `MeshToonMaterial({ gradientMap: gradientMap(3), ... })` is applied to every material in `src/buildings.js` (~30 sites), `src/player.js` (shoes, hair, eyes, backpack, skin, belt buckle), `src/npc.js` (all four body builders), `src/world.js` (trunk, canopy, lantern, fountain). `gradientMap` uses `NearestFilter` so the lighting steps into 3 sharp bands.
- **Outlines**: New `src/toon.js` (`addOutline`, `outlineGroup`) + new `src/outliner.js` (`outlineScene`) — the scene-wide walker is invoked from `main.js:121` AFTER populate/spawn with `thickness: 0.06`. Skips particles/eyes/drops/pearls and tiny meshes (`skipBelow: 0.02`).
- **HDRI IBL**: `assets/hdri/sky.hdr` present (702 KB), `RGBELoader` wired in `main.js:135` with `EquirectangularReflectionMapping`, `environmentIntensity = 0.35`.
- **Trees (6 species)**: oak / cedar / spring / autumn / fruit / birch — each with silhouette work in `src/world.js:263-280, 311-500`. Cedar uses stacked cones, birch uses slim trunk + pendant canopy with `trunkRBase: 0.14`, autumn/fruit/oak use lobed canopies with distinct fruit counts.
- **AC cottages**: `_makeBuildingShell` rewritten (eaves + overhang + ridge cap + brick chimney + plank siding), `_makeDoor` adds recessed panel + brass knob + stepping stone, `_makeWindows` adds 4-pane mullions + sill + green slatted shutters, shop awning in red+white at buildings.js:384-389.
- **Characters**: Player got backpack + belt + buckle + hair + eyes + hands + shoes (player.js:42, 59, 109-141, 169-180). NPCs split into `_buildBear` / `_buildFrog` / `_buildOctopus` / `_buildSquirrel` with shared `_darken/_lighten` palette helpers (npc.js:106-114, 134, 218, 290, 347).
- **Polish**: 220 grass tufts (`world.js:567`), 48 stepping-stones (`world.js:517`), 4 lantern PointLights with 17:00-19:00 ramp + 5.3 Hz × 11.1 Hz flicker (buildings.js:576-690), starfield 1400 → 2000.

## Remaining issues / polish nits

| Severity | Issue | File:Line | Notes |
|---|---|---|---|
| Nit (already known) | Stepping-stone path reads like stairs from the high-angle camera | src/world.js:517 (`_paintPath`) | Worker flagged this in wave-4 "Known gaps". A thin dirt plane beneath the plates would fix it. |
| Nit | `_setupEnvironment()` called twice in init | src/main.js:103 and :109 | Idempotent (re-loads the same HDR) but should be deduped. |
| Nit | Trees lose toon banding at distance | src/world.js canopy materials | Canopy uses `MeshToonMaterial` with `gradientMap(3)` correctly; an extra dark-band lobe material would help shadow read at range. Optional polish. |
| Nit | Outlines wrap very small meshes (doorknobs, eye whites) | src/outliner.js:31-39 (`skipKeywords`) | Existing `skipKeywords: ['particle', 'eye', 'drop', 'pearl']` covers the worst cases; wave-4 notes flagged a `skipMeshes` filter as a future polish. |
| Nit | `outlineScene` runs twice in init (once at 0.035, once at 0.06) | src/main.js:106 and :121 | Intentional per the wave-4 notes (initial pass before populate, full pass after spawn); worth a one-line comment. |
| Nit | HDRI is loaded but barely visible as ambient rim | — | Sky dome handles background, IBL only adds a slight rim — intentional for the controlled cel look. A true reflective ground plane would let it pay off. |

## What is now genuinely close to AC: New Horizons

- The **villager silhouettes** read as actual animals at a glance (bear with cheek puffs + muzzle + ears; squirrel with bushy tail; octopus with tentacles + bow; frog with tall eye bumps). This is the single biggest jump from wave 3.
- The **cottage architecture** now has the silhouette weight AC has — visible eaves, a chimney that sells "wood cabin", plank walls, slatted shutters. You can pick a cottage out of an overhead shot.
- The **6 tree species** give the forest real variety in a single glance — orange autumn, slim birch, stacked cedar, lobed oak all read distinctly.
- The **outline pass** gives the world the soft black-line look AC uses — without it, all the geometry work feels directionless.
- The **dusk/night cycle** with the warm lanterns ramping up and the peach sky band is close to the AC time-of-day feel.

## Blocker (transparency note)

The task asked me to use the in-app `browser` tool to re-shoot the canonical URLs
(`?autostart=1&hour=20&x=4&z=3` etc.). The browser tool is **not registered** in this
session's tool set (it requires the `browserUseTooling` beta capability and only exposes
through the right-side FilePanel surface), and shell-based Chrome was explicitly forbidden
by the task. I therefore relied on (a) the wave-4 shooter's existing JPGs in
`.critique/shots/w4-*.jpg` and `.png`, plus (b) direct static read of `src/*.js` and the
shipped `assets/hdri/sky.hdr`. If the parent can re-run the in-app browser with the listed
URLs, the lantern-glow and dawn-band checks should be reconfirmed against a fresh frame.

## References

- AC: `.critique/refs/ac-cedar-nh.png`, `ac-fountain.png`, `ac-tree-cf.jpg`, `ac-cf-fountain.jpg`, `ac-oak-nh.png`
- Wave-4 ship: `.waves/wave-4.md`
- Source: `src/toon.js`, `src/outliner.js`, `src/world.js`, `src/buildings.js`, `src/player.js`, `src/npc.js`, `src/main.js`
- HDRI: `assets/hdri/sky.hdr`
- Evidence: `.critique/shots/w4-noon-plaza.jpg`, `w4-fountain.png`, `w4-midday.png`, `w4-dawn-river.png`, `w4-dusk-river.png`, `w3-night.png`

---
*Verifier: in-app `browser` tool unavailable → static + prior-shot verification only.*
