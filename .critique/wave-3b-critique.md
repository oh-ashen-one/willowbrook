## Verdict
**PASS** — All five flagged gaps landed in code and read correctly in screenshots; remaining nits are polish, not deal-breakers.

## Five fixes verified

1. **Dawn/dusk sky math — PASS.** `world.js:574-600` now branches on `isNight / isDawn / isDusk` bands and picks `skyTop` / `skyBot` directly (peach `0xffc88a`, rose `0xd88aaa`, navy `0x2a3a6a`, day `0x6cb8e0`). `w4-dawn-sky.png` reads as solid warm peach, `w4-dusk-river.png` reads as rose deepening toward the horizon — no more "night sky with a peach tint" failure mode.

2. **Fountain water mound — PASS.** `buildings.js:377-397`: mound is `SphereGeometry(1.1)` at `y=0.52`, plus `TorusGeometry(1.55, 0.1)` water ring at `y=0.45`. Visible in `w4-midday.png` and `w4-fountain.png` as a clear blue dome-and-ring over the basin; compared to `ac-fountain.png`, the cascade silhouette is now present.

3. **Cyan fringe ring — PASS.** `world.js:611-613`: `fringe.material.color.copy(skyBot).lerp(skyTop, 0.3)` every frame. In `w4-dawn-sky.png` the horizon band is pinkish, in `w4-dusk-river.png` it's rose; no more hard cyan stripe against any sky color.

4. **Museum fossils — PASS.** `interiors.js:315-352`: ammonite=`TorusGeometry(0.32, 0.13)`, trilobite=`BoxGeometry(0.55, 0.22, 0.32)`, dino-bone=`ConeGeometry(0.22, 0.6)`, plant=4 fanned leaf planes. In `w4-interior-museum.png` and `/tmp/wb-shots/museum-int.png` the four pedestals now hold four visibly distinct shapes (ring / brick / spike / fan) instead of four identical spheres.

5. **Interiors four walls + lintel + baseboard — PASS.** `interiors.js:80-130`: back wall with vertical stripes + two side walls + two front-wall halves with doorway cutout + `BoxGeometry(1.0, 1.0, 0.2)` lintel + four `BoxGeometry(_, 0.3, _)` baseboard segments. `w4-interior-home.png` and `/tmp/wb-shots/museum-int.png` show a fully enclosed room with a visible brown wood trim line along the floor; the previous "room floating in brown void" failure is gone.

## Remaining issues

1. **Stars are fully visible during dawn (hours 4-8).** `world.js:617-620` fades stars by `1 - l*2.2` where `l = max(0, sin(sunAngle))`. At hour 6 `sunAngle = 0`, so `l = 0` and star opacity = 0.95. Visible as scattered white dots in `w4-dawn-sky.png` and `/tmp/wb-shots/dawn-real.png`. Fix: gate star opacity on the `isDawn / isNight` bands instead of `l` — e.g. dawn fades stars from 1.0 at hour 5 to 0.0 at hour 7.

2. **Museum/home interior camera sits above the wall tops.** Walls are 6 units tall but the camera retains its outdoor `y=9` follow offset, so the upper third of `museum-int.png` and `w4-interior-museum.png` shows outdoor sky leaking in. Fix: in `_swapToInterior` set `game.camera.position.set(player.x, 2, player.z + 6)` and `camera.lookAt(player.x, 1, player.z - 4)` so the camera is inside the room and looks forward.

3. **Fountain water reads as a static blob, not as cascading water.** AC reference (`ac-fountain.png`, `ac-cf-fountain.jpg`) shows water visibly spilling from the central urn over the basin rim. Willowbrook has a hemispheric mound + torus ring that sits motionless. Fix: animate `mound.scale.y` (e.g. `0.5 + sin(t*2)*0.05`) and add 8–12 small `SphereGeometry(0.06)` droplet meshes orbiting the mound with slight vertical jitter, or replace the torus with a textured cylinder using a vertical-gradient water-fall texture.

4. **Dawn sky has almost no vertical gradient.** `peachTop = 0xffc88a` and `peachBot = 0xffe4b8` differ by ~12 RGB points; in `w4-dawn-sky.png` the zenith and horizon read as the same flat peach. Fix: deepen `peachTop` to `0xe89860` (warmer/amber) so the dawn reads "amber above, peach at the horizon" the way dusk already does.

5. **Fossils are too small to read as specimens.** Pedestal is 0.9 wide; ammonite ring radius is 0.32, cone height 0.6. In `museum-int.png` the fossils look like pebbles on top of bricks. Fix: double the fossil dimensions (TorusGeometry 0.32→0.5, BoxGeometry 0.55→0.9, ConeGeometry height 0.6→1.0, leaf planes 0.45→0.7) so each piece fills roughly half the pedestal top.

## What's now genuinely close

- The plaza-with-fountain beat in `w4-midday.png` reads as a small Animal Crossing–style village at first glance — octagonal fountain with visible blue water, surrounding picket-fenced houses with varied roof colors, lanterns, benches. A casual viewer would accept this as a "cozy little town" before noticing anything wrong.
- The peach dawn in `w4-dawn-sky.png` and rose dusk in `w4-dusk-river.png` read as time-of-day tints rather than as a bug — they no longer look like "broken black sky with paint smeared on."
- The museum interior in `w4-interior-museum.png` shows four clearly distinct fossil shapes on pedestals inside an enclosed room with wood trim — it reads as "tiny museum exhibit" rather than "four balls on a table."

## Reference URLs

- AC references: `.critique/refs/ac-fountain.png`, `.critique/refs/ac-cf-fountain.jpg`
- Wave-3b evidence: `.critique/shots/w4-dawn-sky.png`, `.critique/shots/w4-dawn-river.png`, `.critique/shots/w4-dusk-river.png`, `.critique/shots/w4-midday.png`, `.critique/shots/w4-fountain.png`, `.critique/shots/w4-interior-home.png`, `.critique/shots/w4-interior-museum.png`
- Fresh playwright captures (5s settle): `/tmp/wb-shots/museum-int.png`, `/tmp/wb-shots/home-int.png`, `/tmp/wb-shots/fountain-eye.png`, `/tmp/wb-shots/dawn-real.png`
- Source diffs: `src/world.js:539-635` (sky bands + fringe), `src/buildings.js:347-397` (fountain), `src/interiors.js:80-130` (walls/lintel/trim), `src/interiors.js:312-361` (fossils)
