## Verdict
FAIL — only 3 of 5 wave-2 fixes actually landed; the fountain's water mound is invisible in-game and the dawn/dusk tinting is still desaturated maroon because the night-blue base lerp drowns out the peach/rose. The mmx-cli videos, meanwhile, look better than the world they belong to.

## Wave-2 fixes confirmed

### 1. Fountain water mounds up — PARTIAL
Basin color is correctly fixed to light stone gray (`0xb8b6ad` in `buildings.js:352,360`) and the rim overhangs the inner sleeve. However the hemispherical water mound at `buildings.js:376-385` (`SphereGeometry(0.6)` scaled to `(0.6, 0.33, 0.6)` at y=0.36) is essentially invisible — see `.critique/shots/w3-fountain.png`, `w3-fountain-side.png`, and my own `/tmp/w3-critic/fountain-side.png`. What you actually see is a thin blue ring (the water disc) at the base of a gray pillar, then the gray urn bowl, then the white spray sphere on top. There's no dome of cascading water rising above the rim. The mound is also hidden inside the basin's inner sleeve (basin radius 1.7 vs mound radius 0.6), and its `0xb8e4ff` pale-blue color blends with the white spray ball. Against the AC reference (`.critique/refs/ac-fountain.png`, `ac-cf-fountain.jpg`), the in-game fountain now matches roughly the right *shape* — pillar + urn + sphere + octagonal rim with water at rim level — so it's not a regression, but the "mound of cascading water" the wave-2 fix promised is still missing.

### 2. Trees shorter + wider with side lobes — PASS
`world.js:294-365` now builds trunks at `trunkH=1.4` (cedar 2.0) with `canopyScale 1.3 × 1.25 = 1.625` base radius, plus 5 side-lobe spheres and 2 crown blobs. Result: `.critique/shots/w3-trees.png` and my `/tmp/w3-critic/tree-close.png` show clearly wider-than-tall silhouettes with visible lobing, knobby roots, and smooth shading. Compared to AC CF reference (`ac-tree-cf.jpg`), our trees are recognisably in the same family — wide canopy, low trunk, lobed. Not yet "AC's tiered broccoli cloud" (ours reads as one lumpy ball, AC has stacked tiers), but the wave-2 fix has clearly landed.

### 3. Fences continuous — PASS
`buildings.js:213-256` now builds each ring segment with a 0.12-unit overlap (`len = Math.hypot(dx, dz) + 0.12` at `:230`) and the picket cap is at the same arc spacing. `.critique/shots/w3-trees.png`, `critic3-fence-close.png` (carried over), and my `/tmp/w3-critic/fence-close.png` show fences running continuously around each home with no visible gaps at corners. Picket caps (cone) on top of each picket are visible. PASS.

### 4. Dawn is peach (not red) — FAIL
`world.js:574-585` did the right code-level thing: split into `dawnColor = 0xffc88a` (peach) and `duskColor = 0xd88aaa` (rose), lerp factor 0.32. But the underlying sun-angle math makes it not work: at hour 6, `sunAngle = (6/24)*2π - π/2 = 0`, so `l = sin(0) = 0`, which lerps the base color 100% toward night blue (`0x2a3a6a`) BEFORE the dawn tint is applied. A 0.32 peach lerp on top of full-night blue produces a desaturated muddy purple, not peach. Same problem at dusk. Evidence: `.critique/shots/w3-dawn.png`, `w3-dawn-river.png`, `w3-dusk.png`, and my `/tmp/w3-critic/dh7.png` (hour=7) all show a uniform dark mauve/maroon sky. Compare AC reference (`ac-fountain.png`, AC screenshots) — AC dawn is unmistakably warm peach/yellow with a darker horizon. Ours looks more like dusk than dawn, and dusk looks more like night than warm.

Secondary nit (still unfixed from wave 2): the cyan fringe ring at `world.js:246` (`0x9bd1e6`) is still hardcoded and shows up as a visible light-cyan band between any colored sky and the ground — most obvious in `w3-dawn.png` and `w3-dusk.png`.

### 5. Stars plentiful with color jitter — PASS
`world.js:619-660` builds 1400 stars with `count=1400`, `vertexColors: true`, per-star RGB jitter (70% warm white, 30% cool blue), and ~1.2% sparkle stars at size 2.2-2.8 vs regular 0.9-1.7. Evidence: `.critique/shots/w3-night-sky.png` (counted ~30+ visible stars in the upper sky portion of that frame, vs ~5 in the wave-2 `critic3-stars.png`). Color jitter is subtle but the bigger stars do read as slightly bluer against the warm-white majority. Could be denser — most of the sky between zenith and horizon is still empty — but it crosses the "plentiful" bar.

## Interior scene review

All three interiors share the same template: a 16×16 brown floor, a single 16×6 wall at z=-8, vertical wallpaper stripes, warm `0xffeac0` ambient + `0xffe6b0` sun. The camera is fixed at the player anchor (0, 0, 2) with a fixed-angle follow camera looking roughly north — so you see a vast brown floor, the back wall way at the end, and your props floating in a brown void. See `/tmp/w3-critic/int-home.png`, `int-shop.png`, `int-museum.png`.

- **Home** (`buildings.js:114-209`): bed (mattress + pillow + blue blanket), dresser with mirror, single-leg round table, window cutout, terracotta plant, brown door-rectangle as "exit." Reads as props placed in an empty box. No headboard on the bed. No drawers on the dresser. The "door" is a single brown BoxGeometry at z=7.95 — looks like a brown slab, not a doorway. The plant is a single green sphere on a terracotta cone (very abstract). Closest to functional but the props feel small relative to the floor (camera is too far back). The wallpaper stripes only appear behind the bed — they don't extend along a wall because there's no wall.

- **Shop** (`buildings.js:211-274`): counter + brass bell + two wall shelves with colored boxes (12 items) + four floating label cards ("Tools / Seeds / Furniture / Clothes"). The labels are the strongest AC nod — those are exactly how AC's Nook's Cranny displays its categories. But same issues: only one back wall, counter floats in front of the back wall but its left/right ends extend into void.

- **Museum** (`buildings.js:276-312`): four pedestals, each with a sphere fossil, "Museum" sign. ALL FOUR FOSSILS ARE THE SAME SHAPE — `SphereGeometry(0.35)` at `:295-301`, just different colors. The wave-3 notes claimed different fossils (ammonite, trilobite, dino, plant) but the code uses the same sphere for all four. Easiest fix in the whole critique file.

Specific fixes for interiors:
1. Add three more walls (left x=-8, right x=8, front z=8 with door cutout) so the room actually encloses. The current "one back wall + void" composition is the biggest "not AC" tell.
2. Pull the camera in: `interiors.js:103` sets player to `(0,0,2)` — move to `(0, 0.5, 4)` and lower camera FOV so props don't look like specks.
3. Replace the brown door-rectangle at `interiors.js:203-208` with a door-shaped frame + a glowing "EXIT" hover label (like AC's door mat).
4. Differentiate the museum fossils — actually build ammonite (torus), trilobite (oblong), dino (long bone), plant (leaf cluster) so the four pedestals don't read as identical.
5. Add a player avatar inside the interior (camera is currently framed from above-back, you can't see yourself).

## Video review

All three videos are 2560×1440 H.264, 24fps, 6.58s, MiniMax-H3 generated. They are gorgeous — frame-grabs at `vid-intro-1s.png`, `vid-museum-3s.png`, `vid-plaza-night-3s.png` are indistinguishable from AC promotional art. The intro shows a cascading fountain with visible water spray, soft warm dawn, AC-style rounded-roof houses, and 10+ cute villagers on dirt paths. The museum shows stone columns with capitals, warm glowing windows, blue tile roof, topiary hedges — exactly the AC museum. The plaza-night video shows a fountain with realistic water cascading over the rim and four lanterns casting warm pool light, with a bunny and bear character in AC proportions.

But there's a *huge* tonal mismatch: the videos look like AC; the in-game world looks like a blocky low-poly tribute. The same fountain in `plaza-night.mp4` has cascading water shooting upward 1m above the rim; the in-game fountain has a 0.04m water disc inside the basin. Same trees in `intro.mp4` are wide AC broccoli clouds with visible leaf texture; the in-game trees are 3-5 smooth spheres welded into a lumpy ball. Same houses in `intro.mp4` have rounded roofs with white trim; the in-game houses have sharp triangular prisms with no trim.

The videos are fine on their own. The problem is they're embedded as if they belong to this world — `progress.html:196-216` displays them as "Wave 3 cinematic" — but stylistically they belong to a higher-fidelity version that doesn't exist yet. Two specific fixes:

1. Either commit to making the in-game world match the video aesthetic (sphere-mound water, rounded AC roofs, real leaf textures) — OR commission new videos in the current low-poly style. The current split-brain is jarring.
2. The intro video plays behind the "Visit Town" button per `progress.html:199-202` — but per `wave-3.md:21` it's *supposed* to play in-game. There's no code path I can see in `main.js` that plays these videos as a splash — they're HTML `<video>` embeds in the progress page only. If splash playback is the goal, wire it into `main.js` startup.

## Single biggest remaining gap
**Make the dawn sky actually peach, not muddy maroon.** In `world.js:564-589`, the sun-angle math maps hour 6 to `sunAngle = 0`, which lerps the base color 100% toward night blue before dawn tint is applied. The dawn/dusk fix in `wave-3.md` was a one-line color split that doesn't survive contact with the base-color lerp. Concrete fix: at hour 4-8, set `l = clamp((hour-4)/3, 0, 1) * 0.6 + sin(sunAngle) * 0.4` and lerp the base 30% night instead of 100% — OR just override `skyTop` to the dawn/dusk color directly during the dawn/dusk windows and ignore the day/night base. The visible result should be: `world.js:574` peach `0xffc88a` reads at the horizon, not a 30%-strength tint of dark navy.

## Secondary gaps (max 5)
1. **Fountain water mound is invisible.** In `buildings.js:376-385`, the mound sphere is buried inside the basin's inner sleeve (radius 0.6 inside radius 1.7 at lower y). Either bump radius to `1.0` and position at `y=0.45` so it visibly crowns above the rim, OR delete the mound and replace with a `TorusGeometry(1.4, 0.08, 12, 24)` "water ring" at y=0.32 so there's an obvious visible water element around the pillar. The plaza-night.mp4 is the reference.
2. **Cyan fringe ring still hardcoded.** `world.js:246` `0x9bd1e6` shows as a visible cyan band between any colored sky and the ground in `w3-dawn.png`, `w3-dusk.png`. Read it from `skyTop` (lerped 0.3 toward `bottomColor`) instead of hardcoding.
3. **Museum fossils are all the same sphere.** `buildings.js:294-302` uses `SphereGeometry(0.35)` for all four. Differentiate: ammonite = `TorusGeometry(0.3, 0.12, 8, 16)`, trilobite = `BoxGeometry(0.5, 0.2, 0.3)` (oblong), dino = `ConeGeometry(0.2, 0.5, 6)` (long bone), plant = a few flat `PlaneGeometry` leaves.
4. **Interiors have no side walls.** `interiors.js:80-94` builds only one wall plane at z=-8. Add three more `Mesh(PlaneGeometry(16, 6))` walls at x=±8 and z=+8 (the +8 one with a 1×2 door cutout) so the room actually encloses — right now the brown floor extends into black void, which is the single biggest "not AC" tell in the whole deliverable.
5. **Videos are split-brain with the world.** The plaza-night.mp4 fountain has water cascading 1m above the rim with a stone basin; the in-game fountain has a 4cm disc. Pick a side: either replace the videos with low-poly versions, or commit to upgrading the in-game fountain to match (see gap #1).

## Reference URLs
- AC fountain NL model: `https://dodo.ac/np/images/thumb/d/d5/Fountain_NL_Model.png/500px-Fountain_NL_Model.png` → `.critique/refs/ac-fountain.png`
- AC fountain CF in-game: `https://nookipedia.com/wiki/File:CF_Fountain.jpg` → `.critique/refs/ac-cf-fountain.jpg`
- AC tree CF in-game: `https://dodo.ac/np/images/thumb/9/92/CF_Tree.jpg/200px-CF_Tree.jpg` → `.critique/refs/ac-tree-cf.jpg`
- AC oak NH: `https://dodo.ac/np/images/thumb/d/d9/Oak_Tree_NH.png/240px-Oak_Tree_NH.png` → `.critique/refs/ac-oak-nh.png`
- mmx-cli (MiniMax-H3) video generation: see `videos/{intro,museum,plaza-night}.mp4` in this repo
