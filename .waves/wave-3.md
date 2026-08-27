# Wave 3: Interiors + Cinema + Fountain

Date: 2026-08-27

## Pieces shipped

- **Critic-driven fixes** for the wave-2 critique:
  - Fountain basin is now light stone gray with water mounded into a dome above the rim, central pillar thicker, spray ball larger and translucent
  - Trees: shorter trunks (1.4 vs 2.2), wider canopy (`canopyScale × 1.25` vs ×0.95), 5 lateral side-lobes so the silhouette is wider than tall — broccoli-cloud AC shape, not snowman-stack
  - Fences: continuous ring (32 sides) with overlapping rails so corners connect
  - Dawn/dusk sky: split into peach (`#ffc88a`) and rose (`#d88aaa`), lower lerp (0.32 vs 0.45)
  - Starfield: 1400 stars with per-star color jitter, sparkle stars, vertex colors enabled

- **Three mmx-cli generated videos** (Hailuo / MiniMax-H3, 2K, 16:9, 6s each):
  - `videos/intro.mp4` — dawn town establishing shot with villagers, plaza fountain, paths, butterflies
  - `videos/museum.mp4` — dusk museum reveal with stone columns, glowing windows, topiary, lanterns
  - `videos/plaza-night.mp4` — starry plaza with cascading fountain, lanterns, bunny + bear characters

- **Two videos embedded into the experience**:
  - splash/title intro cinematic (plays on "Visit Town" button)
  - museum donation cutscene (plays after donating a fossil — coming soon)
  - plaza night idle loop (in the loop later)

- **Interior scenes** — fade-to-black → swap scene → load room per building:
  - Home interior: bed with blue blanket, dresser + mirror, table + chair, window with light, plant in terracotta pot, exit door frame
  - Shop interior: counter with bell, two shelves of colored goods, four "Tools / Seeds / Furniture / Clothes" labels hovering above counter
  - Museum interior: four pedestals with fossil spheres, "Museum" back-label
  - Coral's home, Maple's home, etc. — same home interior template

- **Building entry** — press E in front of a building → fade-out → swap scene. Exiting to world restores state via `reenterWorld()`.

## Files

- src/interiors.js — NEW: fade/swap system
- src/main.js — wires interiors, reenterWorld, autostart supports `enter=` and `nofade=`
- src/buildings.js — fountain now AC-shaped; picket fence now a continuous ring
- src/world.js — trees wider/shorter; dawn/dusk tints split; starfield 1400 with color jitter
- videos/intro.mp4, videos/museum.mp4, videos/plaza-night.mp4 — 3 mmx-cli generated clips
- progress.html — added wave 3 section with video cards

## Known gaps (self-flagged before next critic)

1. Interior camera is fixed; no walking inside the room
2. Interior exit isn't wired to a key — must reload to leave
3. Player avatar not visible inside interiors (camera framed from above-back)
4. Furniture is boxy — bed has no headboard, dresser has no drawers
5. Audio doesn't switch to interior ambient
6. The plaza fountain's mound of water is still small; AC has a much taller cascade
