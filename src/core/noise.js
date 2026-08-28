// noise.js — seeded value-noise textures on canvas.
//
// Lifted from gillworks/Vyom-26/Wave-Racer `src/render/textures.ts`'s
// `makeNoiseTexture` function (MIT). Their three-channel packing (R = octave
// 0, G = octave 1, B = octave N) lets one fetch feed three different uses —
// foam break-up, cloud shaping, ocean sparkle mask. We don't need that
// density, so this port exposes a single-channel version: pick the octave
// you want at call site via the `channel` arg.
//
// Why canvas, not math? A canvas-generated noise texture tiles seamlessly
// (the lattice wraps) and ships to the GPU as a normal texture — no shader
// hookup, no per-frame cost. Wave-Racer's comment on this was that visible
// tiling in the water is a named failure mode of any procedural approach
// that doesn't wrap.

import * as THREE from 'three';

/**
 * Seeded RNG — Wave-Racer uses a hand-rolled splitmix32 so the texture is
 * identical across runs. Same code here so two players see the same sparkle
 * pattern in their ponds.
 */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fade = (t) => t * t * (3 - 2 * t);

/**
 * Generate a tiling value-noise texture as a CanvasTexture.
 *
 * @param {number} size    Texture side in pixels (square). 256 is plenty for
 *                         a sparkle/foam map.
 * @param {number} lattice Base lattice cells per side. Higher = more detail
 *                         in the first octave; lower = chunkier blobs.
 * @param {number} octaves Octave count. Each octave doubles the lattice and
 *                         halves the amplitude — 4 gives smooth-with-detail.
 * @param {number} seed    RNG seed for reproducibility.
 * @returns {THREE.CanvasTexture}
 */
export function makeNoiseTexture(size = 256, lattice = 16, octaves = 4, seed = 0x9e3779b9) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const img = g.createImageData(size, size);

  const rand = mulberry32(seed);

  // Pre-compute one grid per octave so sample() is O(1) per pixel.
  const grids = [];
  for (let o = 0; o < octaves; o++) {
    const n = lattice << o;
    const grid = new Array(n * n);
    for (let i = 0; i < n * n; i++) grid[i] = rand();
    grids.push(grid);
  }

  const sampleOctave = (o, u, v) => {
    const n = lattice << o;
    const grid = grids[o];
    const x = u * n;
    const y = v * n;
    const x0 = Math.floor(x) % n;
    const y0 = Math.floor(y) % n;
    const x1 = (x0 + 1) % n;
    const y1 = (y0 + 1) % n;
    const fx = fade(x - Math.floor(x));
    const fy = fade(y - Math.floor(y));
    const a = grid[y0 * n + x0];
    const b = grid[y0 * n + x1];
    const c = grid[y1 * n + x0];
    const d = grid[y1 * n + x1];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let amp = 0.5;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        sum += sampleOctave(o, u, v) * amp;
        norm += amp;
        amp *= 0.5;
      }
      const n = sum / norm;
      // Single-channel — R = noise, G = B = n. Keeps the call site simple.
      const i = (y * size + x) * 4;
      const b = Math.round(n * 255);
      img.data[i + 0] = b;
      img.data[i + 1] = b;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // Mip-filtered — any surface sampling this map at a grazing angle aliases
  // without it. Same fix Wave-Racer's comment called out.
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
