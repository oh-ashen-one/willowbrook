# Wave 1: Living Town

Date: 2026-08-26

## Pieces shipped

- Terrain with rolling hills, color variation, edge cliff band
- Sky dome with shader gradient
- Day/night cycle with directional sun + warm/dusk/night color blends
- 80+ trees (oak, cedar, spring, autumn) with fruit, gentle wind sway
- River on south edge with shoreline rocks and animated ripples
- 40 flower patches, 24 rocks, 14 butterflies
- Player avatar: skin/clothes/hair, eye dots, rosy cheeks, walk-cycle animation
- Camera: fixed-angle follow, ~38° downward, AC-style framing
- 6 buildings: player home + 5 villager homes, Nook's Nook shop, museum, plaza with fountain, signpost
- 5 villagers: bear (Maple), frog (Finn), cub (Pebble), octopus (Coral), squirrel (Hazel)
- Villager AI: per-species body, wandering near home, sleep at night
- Interaction: press E to talk, pick up flowers / apples
- Inventory: 8 slots, hotbar (1-4), tabs to swap, click to select
- HUD: clock, date, season, bells, hotbar
- Dialogue box with name tag and next prompt
- WebAudio synth: drone pad, bird chirps, footstep clicks, action blips
- Save: localStorage (player pos, inventory, time)
- Particles: footstep puffs, pickup sparkles
- Weather: occasional rain showers

## Files

- index.html
- src/main.js — bootstrap, game loop
- src/world.js — terrain, water, trees, flowers, rocks, sky, lighting
- src/player.js — avatar, walk cycle, camera anchor
- src/npc.js — villagers, dialogue, AI
- src/buildings.js — houses, shop, museum, plaza, signpost
- src/time.js — clock, day/night
- src/audio.js — WebAudio synth pad + chirps + SFX
- src/inventory.js — slots, items
- src/ui.js — HUD, dialogue, toast
- src/interactions.js — proximity talk / forage / open doors
- src/save.js — localStorage
- src/particles.js — transient sprites
- src/weather.js — rain

## Known gaps (self-flagged before critic)

1. Buildings are boxy — no rounded edges, no window cross / chimneys aren't aligned
2. Trees are uniform clusters — no variation in height/canopy
3. No path network between buildings (grass everywhere)
4. Plaza fountain is just stacked cylinders, no water animation
5. NPCs don't have names displayed above heads
6. No cloud sprites in the sky
7. Time-of-day transitions are abrupt in 5-min jumps
8. No interior scenes yet
9. Audio is very minimal (drone + clicks) — no real "music"
10. Player avatar still slightly off (no ear, no arms modeled cleanly)

## Screenshots

See .critique/shots/w1-*.png — 12 views covering noon, dawn, dusk, night, and locations around town.
