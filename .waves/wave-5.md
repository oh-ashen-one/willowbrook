# Wave 5: Villager Heart

Date: 2026-08-27

## Goal

Push Willowbrook past the visuals milestone and into actual
relationship mechanics — give the player a reason to visit villagers
beyond walking past them, and a real save format that holds onto
that progress across reloads.

Constraint: stay 100% procedural (no Quaternius / Mixamo / itch.io /
Google Drive). Three.js with importmap, no build step, runs on
`python3 -m http.server 8080`.

## Pieces shipped

### Phase 1 — Per-villager daily schedule (4 waypoints)

Replaces the old random wander with a deterministic schedule so each
villager has a real routine the player can predict:

```
< wake   → sleeping at home (frozen, idle breathing only)
wake..plazaHour     → walking to morning waypoint (front yard)
plazaHour..eveningHour  → walking to plaza waypoint
eveningHour..sleep  → walking to evening waypoint (away from plaza)
```

Each villager has 4 waypoints stored on `userData.waypoints`:
- `home`: right at the house
- `morning`: jittered spot just outside home
- `plaza`: random spot in the central plaza
- `evening`: away-from-plaza spot near home

Schedule fields per species (deliberately varied so villagers aren't
all in lockstep):

| Villager | wake | plazaHour | eveningHour | sleep |
|---|---|---|---|---|
| Maple (bear) | 6 | 10 | 17 | 22 |
| Finn (frog) | 7 | 9 | 17 | 23 |
| Pebble (cub) | 6 | 11 | 16 | 21 |
| Coral (octopus) | 8 | 13 | 18 | 24 |
| Hazel (squirrel) | 5 | 9 | 17 | 22 |

When close to a waypoint (< 0.6 u), the villager idles with a small
circular breath around it so they don't feel glued to the spot.

### Phase 2 — Gift reaction system

Walking up to a villager with a gift-type item in the active hotbar
slot shows **"Press E to give [item]"** instead of **"Press E to talk"**.
Pressing E then:

- Removes the item from inventory
- Adds `gift.value × multiplier` to friendship
- Spawns a pink heart puff above their head (`spawnPickupPuff` @ `0xff7aa8`)
- Shows a per-gift reaction line ("Oh! A flower — thank you!")
- Plays a higher blip + 0.1-amp camera shake
- Toast: `"Name +X friendship (favorite — 2×)"` / `"(birthday — 3×)"`

Multipliers:

| Condition | Multiplier |
|---|---|
| Default | 1× |
| Matching the villager's `favoriteGift` | 2× |
| Their birthday | 3× |

Per-villager favorites (set on each `def`):

| Villager | Favorite |
|---|---|
| Maple | flower |
| Finn | bug |
| Pebble | fossil |
| Coral | shell |
| Hazel | acorn |

Per-gift dialogue pool of 2 lines each so reactions feel personal.

### Phase 3 — Branching dialogue trees

`Villagers.greet()` now picks a pool based on the villager's
`friendship` tier:

```
fs < 100   → "stranger"     pool: just def.greeting lines
fs >= 100  → "friend"       pool: greeting + def.anecdote lines
fs >= 250  → "best friend"  pool: def.insideJoke + def.invite
```

Each villager has 1–2 anecdote lines, 1–2 inside joke lines, and 1–2
dinner invite lines on their `def`. The pool is sampled uniformly so
each conversation feels different but the tier signals real progress.

### Phase 4 — Birthday + Bunny Day

**Birthdays.** Each villager has a `def.birthday` in `'Season day'`
format (e.g. `"Spring 17"` for Maple). On their birthday, a procedural
🎂 cake sprite bobs above their head:

- 64×64 canvas-drawn (no emoji font): plate shadow, chocolate body,
  cream frosting drips with alternating heights, three candles with
  flame highlights
- Cached as a single shared `CanvasTexture` on the `Villagers` class
- Lazy-allocated per villager, removed when the day rolls over
- The `giftId === flower` branch in `interactions.js` automatically
  applies the 3× birthday multiplier

**Bunny Day.** When `time.season === 'Spring' && time.day === 7`:

- A procedural bunny NPC spawns in the plaza (egg-shaped cream body,
  head, two upright ears with pink inner-ear cylinders, black bead
  eyes, pink nose, fluffy tail, casts shadow)
- `_animateBunny()` does a small vertical hop + slow spin so it
  reads as alive in the plaza
- Gifting the bunny a flower triggers the existing `v2-complete.mp4`
  cutscene as the celebration video + rewards:
  - +500 bells
  - +3 shells
  - +5 flowers
  - Bunny despawns
  - `window._bunnyDayCelebrated = true` so it doesn't respawn
- One-time per save (saved in v2 schema below)

### Phase 5 — Verify + critic

Verifier returned **PASS**. Six polish nits flagged, three closed in
the same session:

1. **Bunny respawned every frame after celebration** (npc.js) —
   closed: spawn now gated on `window._bunnyDayCelebrated`
2. **Bunny had no shadow** — closed: `castShadow = true` set on each
   child mesh in `_buildBunny()` (Group-level is a no-op in Three.js)
3. **Duplicate toast on bunny gift** — closed: removed the bunny's
   `favoriteGift: 'flower'` (it reacts specially via the celebration
   branch, not via the favorite multiplier) and skipped the generic
   `+N friendship` + `+50 bells` toasts for `nearby.isBunny`

Three nits remain open:
- `def.name?.charCodeAt(0)` (npc.js) is a stylistic redundancy — the
  per-villager `userData.bob` already provides per-villager phase
- Two cosmetic: `g.castShadow = true` is a no-op (now per-child)
  and Bunny Day uses the `v2-complete` video as a stand-in

Visual checks fall back to static read because the in-app `browser`
tool is unavailable in some sessions — the same fallback used by
wave-4 verification. Console is clean.

### Phase 6 — Save v2

Without persistence, all Villager Heart progress was lost on reload:
friendship reset to 0 (tier 2 dialogue pools became unreachable) and
the bunny celebration was session-only (respawned every Spring day 7).

Changes to `src/save.js`:

- Storage key bumped to `willowbrook.save.v2`
- Serializes per-villager `{friendship, seen}` keyed by `def.name`
- Serializes `bunnyDayCelebrated`
- `load()` falls back to `willowbrook.save.v1` on first read; if
  found, it migrates to v2 in place (writes the v2 key, removes the
  v1 key) so subsequent loads hit the fast path
- Restores `villager.userData.friendship` and `.friendshipSeen`
  before villagers update() runs the schedule

v1 saves keep working — migration is automatic and idempotent.

### Phase 7 — Polish + ship

`progress.html` updated with a new "Wave 5 — Villager Heart" section
showing screenshots of the four key beats (two villagers mid-chat,
gift reaction heart particle, birthday 🎂 above Maple, Bunny Day
plaza with the bunny).

## Files

- `src/npc.js` — schedule system, gift-reaction data, dialogue tier
  picker, cake sprite, bunny NPC, bunny animation
- `src/interactions.js` — `hasGift` detection, gift branch with
  favorite + birthday multipliers, bunny celebration hook, duplicate
  toasts suppressed for the bunny
- `src/save.js` — bumped to v2, serializes villagers + bunny flag,
  v1 → v2 migration
- `src/main.js` — `day` and `season` URL params for testing
- `progress.html` — added Wave 5 section
- `.critique/wave-5-critique.md` — verifier PASS with polish nits

## Commits

`b231c8f` Phase 1 — Per-villager daily schedule
`b804c4f` Phase 2 — Gift reaction system
`385571b` Phase 3 — Branching dialogue trees
`ec6f010` Phase 4 — Birthday cake sprite + Bunny Day celebration
`02a42a9` Polish — 3 verifier-flagged bug fixes
`1232c98` Phase 6 — Save v2

Final HEAD on `master`: `1232c98`. Local and remote in sync.

## Known gaps for future waves

1. Friendship gifts don't decay over time (AC: New Horizons gifts lose
   value if given too often on the same day) — could add per-villager
   daily gift cap
2. Cake sprite is just one variant — could give each villager a
   differently-colored cake (Maple's pink, Finn's green, etc.)
3. Bunny Day is one festival per season in the goal brief — only
   Spring day 7 implemented so far
4. Dialogue tier thresholds (100, 250) are hard-coded — could be per
   villager based on species
5. No "house visit" follow-through — the tier-2 invite line promises
   dinner at their home but doesn't trigger an actual scene change
