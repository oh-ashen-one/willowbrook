// Palette — single source of truth for every colour in Willowbrook.
//
// Lifted from gillworks/Vyom-26/Wave-Racer `src/core/palette.ts` (their rule:
// "never hand-author a colour literal in a subsystem — if you need a new tone,
// add it here so the whole game stays one piece of art").
//
// Willowbrook's visual upgrade made this necessary: previously the grass palette,
// hemisphere bounce, building trim, fence, lantern emissive and water tints all
// lived as inline hex literals scattered across world.js, buildings.js,
// npc.js, interactions.js. One palette means future palette tweaks are a
// single-file change.

/** Hex helper — keeps the table below readable. */
const c = (hex) => hex;

/**
 * Raw hex table. Single source of truth. Subsystems read `PAL.x` and never
 * hard-code hex.
 */
export const HEX = {
  // ── Ground / foliage ─────────────────────────────────────────────────────
  // grassA/B/Dark were re-tuned in the wave-6 visual pass for grass_not_emerald
  // (saturation 0.30, not 0.53 like the original 0x6fbf5a).
  grassA:    0x8aab6e,
  grassB:    0x9bbb7c,
  grassDark: 0x5e8048,
  dirt:      0x9a7a4d,
  dirtStep:  0xb89a6a,
  dirtEdge:  0x8a6f48,

  // ── Sky / atmosphere ────────────────────────────────────────────────────
  skyDawn:     0xffc88a,
  skyDawnBot:  0xffe4b8,
  skyDay:      0x6cb8e0,
  skyDusk:     0xd88aaa,
  skyDuskBot:  0xffa0b8,
  skyNight:    0x2a3a6a,
  skyNightBot: 0x4a5a8a,
  fog:         0xb8d6e6,

  // ── Trees ───────────────────────────────────────────────────────────────
  trunk:         0x7a4a28,
  trunkBirch:    0xeae0c8,
  leaves:        0x5e8048,
  leavesAlt:     0x6fbf5a,   // note: still used for spring variant
  leavesDark:    0x3d5e2e,
  leavesAutumn:  0xd68a4c,
  leavesSpring:  0xb6c97e,
  leavesBirch:   0x9ed47a,
  leavesFruit:   0x6fbf5a,
  fruitApple:    0xd63a2c,
  fruitOrange:   0xff8a3a,

  // ── Buildings ───────────────────────────────────────────────────────────
  wall:        0xc4a478,
  wallSiding:  0xa48058,
  wallTrim:    0x8a5a3a,
  roof:        0x6a3a20,
  roofTrim:    0xc8a060,
  roofSlate:   0x4a4a55,
  door:        0x6a4a2a,
  doorInset:   0x4a2a18,
  doorknob:    0xffd56e,   // emissive brass
  windowFrame: 0x5a3a20,
  windowGlass: 0x9bd5e5,
  shutter:     0x4a8a4a,
  shutterTrim: 0x2a5a2a,
  chimney:     0x7a5040,
  brick:       0x9a5a3a,

  // ── Fence / ground trim ──────────────────────────────────────────────────
  fence:       0xeacfa8,
  paving:      0xd6c8a8,

  // ── Water ──────────────────────────────────────────────────────────────
  water:      0x7ec0e8,
  waterDeep:  0x4a96c2,

  // ── Rock / terrain accents ───────────────────────────────────────────────
  rock: 0x8a8276,

  // ── Furniture / interior ────────────────────────────────────────────────
  wood:        0x6a4a2a,
  woodLight:   0xc4a478,
  woodCushion: 0xeacfa8,
  bedFabric:   0x4a8fd1,
  plantPot:    0x8a4a2a,
  plantLeaf:   0x6fbf5a,
  glass:       0xbfe4f5,
  bell:        0xffd56e,

  // ── Lanterns / glow ─────────────────────────────────────────────────────
  // lanternEmissive is what the lights look like; lanternMat is the post body.
  lantern:        0xffe9b6,
  lanternEmissive:0xffd56e,
  lanternPost:    0x4a3a25,

  // ── Villager palettes ───────────────────────────────────────────────────
  // Each def gets one fur + one snout + one shirt. Used by npc.js _buildVillager.
  villagerFurBear:  0xc89060,
  villagerSnoutBear: 0xeac098,
  villagerShirtBear: 0xe65a5a,
  villagerFurFrog:  0x9bd15e,
  villagerSnoutFrog: 0xc7e89a,
  villagerShirtFrog: 0xffd54f,
  villagerFurCub:   0xa88860,
  villagerSnoutCub:  0xd4b78a,
  villagerShirtCub:  0x6b9bd1,
  villagerFurOctopus:  0xff8aa8,
  villagerSnoutOctopus: 0xffd0e0,
  villagerShirtOctopus: 0x7cc6e0,
  villagerFurSquirrel: 0xc06a3a,
  villagerSnoutSquirrel: 0xeab084,
  villagerShirtSquirrel: 0x9a6bd1,

  // ── HUD / interactive ───────────────────────────────────────────────────
  hudInk:    0x081426,
  hudPaper:  0xf2fbff,
  hotbarBg:  0xfff8e7,
  hotbarSel: 0xe0a872,
  heartPink: 0xff7aa8,   // heart puff above villager head when gifted

  // ── Outlines ────────────────────────────────────────────────────────────
  // The outline pass renders the whole image at thickness 0.06 — palette kept
  // here so future tweaks (warm ink? sepia?) are one-line changes.
  outlineInk: 0x1a1208,
};

/** Hex lookup type for editor hints. */
export const HEX_KEYS = Object.keys(HEX);

/** Shared SUN_DIR — every cel-shaded material uses this so the terminator
 *  line is consistent across the whole scene. Lifted from Wave-Racer's
 *  palette.ts which had the same idea. */
export const SUN_DIR = { x: -0.42, y: 0.66, z: 0.62 };
