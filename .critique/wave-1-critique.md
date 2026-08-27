## Verdict
AC-feel: FAIL — biggest gap is the **trees**, which read as faceted gemstone blobs rather than the soft, lobed, layered canopy that defines the AC silhouette.

## Blind A/B comparison

1. **Plaza fountain**
   - Ours — `.critique/shots/w1-noon-plaza.png` and `critic-plaza-near.png` show a flat brown disc on the grass with a vaguely-green stack of small spheres in the distance. From the player's default POV the fountain is barely identifiable.
   - AC reference — `.critique/refs/ac-fountain.png` (NL model) and `.critique/refs/ac-cf-fountain.jpg` (CF in-game) show a circular **stone** basin with a rim, a central pillar, cascading blue water, and an iron fence around it.
   - Closer to AC? **AC, by a mile.** Our basin exists (`basin` CylinderGeometry in `buildings.js:302`) but it is the same warm beige as the paving circle, the water disc is nearly flush, and at typical camera distance it reads as "a stain on the path." The water has no visible spray/jet, no rim contrast, no fence, no surrounding lantern posts. The plaza feels empty rather than ceremonial.

2. **Tree silhouette (oak / hardwood)**
   - Ours — `.critique/shots/w1-noon-trees.png`, `critic-east.png`. Trees are clearly polygonal icosahedrons with hard triangular facets, dark uniform color, and a short trunk hidden underneath. Up close they look like cut crystals or mossy boulders.
   - AC reference — `.critique/refs/ac-oak-nh.png` (NH official render) and `.critique/refs/ac-tree-cf.jpg` (CF in-game). Tall trunk with visible knobby roots, then a canopy that is a *cloud* of stacked rounded lobes with bright pastel greens and white speckle highlights.
   - Closer to AC? **AC, completely.** Confirmed in source: `world.js:254` builds the canopy from `IcosahedronGeometry(r, 0)` — the lowest-detail icosahedron (12 verts, 20 faces), stacked 2× with only 18% size decrement (`world.js:251-262`). The comment claims "soft rounded shapes" but `detail=0` is the geometric opposite of soft. This is the single highest-impact failure in the game because trees populate almost every frame.

3. **Sky / horizon**
   - Ours — `.critique/shots/w1-noon-plaza.png`, `w1-dawn-plaza.png`, `w1-dusk-shop.png`, `w1-night-river.png`. Sky is a clean blue gradient by day, but the **horizon line is a hard black band** where the world geometry ends before the sky dome wraps; night sky has visible white speckle that reads as compression noise rather than stars; dawn/dusk merely dim the same blue instead of warming toward pink/orange.
   - AC reference — Nookipedia Tree page gallery + general AC in-game look (`refs/ac-tree-cf.jpg` is a good proxy for AC horizon handling). AC has a soft haze at the horizon, warm dawn/dusk gradients that go pink-orange-violet, and a proper starfield at night.
   - Closer to AC? **AC.** Our sky shader (`world.js:72-104`) only lerps two colors and never reaches warm tones; the cliff-border ring (`world.js:189-197`) is a faint dark disc but does not match the sky color at the camera altitude, producing that black void band visible in `w1-noon-park.png` and every wide shot.

## Single biggest gap

**Trees read as faceted gemstones because the canopy is built from `IcosahedronGeometry(r, 0)` with `flatShading: true` and only 2 stacked layers (`world.js:251-262`).** Fix it by:
- Replacing the canopy geometry with 3–4 **stacked `SphereGeometry(r, 12, 10)`** blobs with small random position offsets (0.15–0.3 units) and *gradually decreasing radii* so the silhouette has visible lobes.
- Turn **off** `flatShading` on the canopy material so sphere normals blend smoothly; keep `flatShading: true` only on the trunk for a hand-carved wood feel.
- Add a second darker material as accent dots (e.g. 2–3 small `SphereGeometry` "berries" or shadow lumps) inset on the canopy surface.
- **Increase trunk height to 2.2–2.8 units** with a slight taper (radius 0.25 bottom → 0.18 top) and add 3 small `SphereGeometry` "roots" around the base.
- This single change will move the trees from "crystal cluster" to "AC oak" perception in every wide shot.

## Secondary gaps (max 5)

1. **Plaza fountain is invisible at game distance.** The basin (`buildings.js:302-308`) is the same beige as the paving texture and the water disc is only 0.05 units tall, so from player eye level it reads as a stain. Add a dark slate rim Cylinder (`color 0x6a6a64`, height 0.15, radius 1.85) sitting on top of the basin, give the water a brighter `0x9ed4f0` with mild emissive, and add 4 short lantern posts (`CylinderGeometry` + `PointLight(0xffe9b6, 0.4)`) at the plaza corners.
2. **Ground has a "wrinkled bedsheet" look.** `world.js:42-58` builds height with summed sinusoids of total amplitude ~1.65 units across the 120-unit world, producing visible long ridges that cast hard shadows (`world.js:141-146` is fine but the heights are too dramatic). Reduce amplitudes to `ampA=0.4, ampB=0.15, ampC=0.05` and add a 2-tile flat ring around the plaza.
3. **Fences are bare sticks.** `_makeVillagerHome` (`buildings.js:184-209`) places 6 fence posts and 6 rails but the rails are 0.06 thick and offset 0.55 up, so in the screenshots they read as floating polka dots rather than continuous fences. Either thicken the rails to 0.12 with a second lower rail at 0.25, or use AC-style picket fences (a series of vertical `BoxGeometry(0.05, 0.6, 0.03)` per side with two horizontal stringers).
4. **House roof reads as a stripe, not a gable.** `_makeBuildingShell` (`buildings.js:70-82`) places two thin tilted boxes meant to be "roof halves" but they're only 0.18 thick, leaving a visible gap and a flat top — looks like an awning, not a roof. Use two real triangular prisms (custom BufferGeometry, or build a prism via ExtrudeGeometry from a triangle shape) meeting at the ridge, with overhang eaves 0.2 wider than the walls and a visible shingle color.
5. **No villagers wandering.** AC's most signature warmth is residents visibly walking around. `npc.js` exists but the screenshots show only the player. Make sure at least 2–3 villager meshes are placed at random `x,z` away from the plaza on spawn (`main.js` startup) and that `npc.js.update` drives a walking loop.

## What works
- **Color palette** is in the right family: warm beige walls (`0xf2d6a8`-ish), green roofs that differ per house, red awning on the shop. Doesn't clash.
- **Sky shader exists and shifts by time-of-day** (`world.js:72-104`, `applyLighting` `world.js:423-464`). Day-to-dusk sky color lerp is wired up correctly; it's a tuning problem, not an architecture problem.
- **Paving circle** under the plaza is the right shape and the right size; the bug is only that the fountain on top of it doesn't pop.
- **Doors + windows + sign texture** are recognizable AC elements (window with cross mullion, mailbox in front of player house, "Nook's Nook" sign rendered to canvas).
- **Water body** at z=-38 is wired with shoreline rocks and subtle ripple (`world.js:154-187`, `world.js:388-403`) — at the right coordinates it should read as a river bank.
- **Butterflies** as billboard sprites is a thoughtful AC touch and they animate (`world.js:341-386`).

## Reference URLs
- https://nookipedia.com/wiki/Fountain — Animal Crossing Fountain landmark page (image: `https://dodo.ac/np/images/thumb/d/d5/Fountain_NL_Model.png/500px-Fountain_NL_Model.png`, saved to `.critique/refs/ac-fountain.png`)
- https://nookipedia.com/wiki/File:CF_Fountain.jpg — City Folk in-game fountain (saved to `.critique/refs/ac-cf-fountain.jpg`)
- https://nookipedia.com/wiki/Tree — AC tree reference (NH oak render: `https://dodo.ac/np/images/thumb/d/d9/Oak_Tree_NH.png/240px-Oak_Tree_NH.png` → `.critique/refs/ac-oak-nh.png`; NH cedar: `https://dodo.ac/np/images/thumb/0/04/Cedar_Tree_NH.png/123px-Cedar_Tree_NH.png` → `.critique/refs/ac-cedar-nh.png`; CF oak: `https://dodo.ac/np/images/thumb/9/92/CF_Tree.jpg/200px-CF_Tree.jpg` → `.critique/refs/ac-tree-cf.jpg`; CF cedar: `https://dodo.ac/np/images/thumb/f/f6/CF_Cedar_Tree.jpg/200px-CF_Cedar_Tree.jpg` → `.critique/refs/ac-cedar-cf.jpg`)
- https://nookipedia.com/wiki/Animal_Crossing:_New_Horizons/Gallery — official NH screenshot gallery (timed out on fetch but is the canonical reference for in-game day/dusk/night framing)
- https://nookipedia.com/wiki/Grass — AC grass pattern reference (used for the "wrinkled bedsheet" diagnosis)
