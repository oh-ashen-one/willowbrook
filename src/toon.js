// Toon shading helpers — gradient maps, outline materials, and conversions.
// Used to swap MeshStandardMaterial for a cel-shaded look without rebuilding geometry.

import * as THREE from 'three';

// Cache gradient maps so we don't re-allocate.
const gradientCache = new Map();

/**
 * Build a small DataTexture that steps lighting into N bands.
 * @param {number} steps — 3 or 4 typically
 */
export function gradientMap(steps = 3) {
  if (gradientCache.has(steps)) return gradientCache.get(steps);
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    // Step function — sharp transitions, slight lift at the brightest band
    data[i] = Math.round(((i + 0.5) / steps) * 255);
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  gradientCache.set(steps, tex);
  return tex;
}

/**
 * Convert any existing material into a toon-shaded equivalent.
 * Reads color/emissive from the source so we don't need to re-author the palette.
 */
export function toonify(source, opts = {}) {
  const params = {
    color: 0xffffff,
    gradient: gradientMap(opts.steps ?? 3),
    emissive: 0x000000,
    transparent: false,
    opacity: 1,
    side: THREE.FrontSide,
    vertexColors: false,
    map: null,
    flatShading: !!opts.flatShading,
  };

  if (source) {
    if (source.color) params.color = source.color.getHex();
    if (source.emissive) params.emissive = source.emissive.getHex();
    if ('transparent' in source) params.transparent = source.transparent;
    if ('opacity' in source) params.opacity = source.opacity;
    if ('side' in source) params.side = source.side;
    if ('vertexColors' in source) params.vertexColors = source.vertexColors;
    if (source.map) params.map = source.map;
  }
  if (opts.color !== undefined) params.color = opts.color;
  if (opts.emissive !== undefined) params.emissive = opts.emissive;
  if (opts.opacity !== undefined) params.opacity = opts.opacity;
  if (opts.transparent !== undefined) params.transparent = opts.transparent;
  if (opts.flatShading !== undefined) params.flatShading = opts.flatShading;

  const mat = new THREE.MeshToonMaterial(params);
  return mat;
}

/**
 * Wrap a mesh in an inverted-hull outline. Renders the outline as a slightly
 * larger back-faced mesh in dark color, giving a 1-2px silhouette like AC.
 * Returns a Group containing both the original and the outline.
 */
export function addOutline(mesh, opts = {}) {
  const color = opts.color ?? 0x1a1208;
  const thickness = opts.thickness ?? 0.04;
  const group = new THREE.Group();
  // Original mesh, slightly inset to avoid z-fighting
  mesh.renderOrder = 1;
  group.add(mesh);
  // Outline mesh — clone the geometry, scale up, render back-faces only
  const outlineMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.multiplyScalar(1 + thickness);
  outline.renderOrder = 0;
  // Don't cast shadows from the outline
  outline.castShadow = false;
  outline.receiveShadow = false;
  group.add(outline);
  // Preserve userData and animation hooks from the original
  group.userData = mesh.userData;
  return group;
}

/**
 * Walk a Group / Object3D and add outline meshes to every Mesh in it.
 * Useful when you've got a rigged character group and want everything outlined.
 */
export function outlineGroup(root, opts = {}) {
  root.traverse((child) => {
    if (child.isMesh && !child.userData.skipOutline) {
      // Skip tiny meshes (eyes, particles) — outlined eyes look weird
      const skip = opts.skipMeshes || ['eye', 'particle'];
      if (skip.some(s => child.name?.toLowerCase().includes(s))) return;
      const wrapped = addOutline(child, opts);
      // Replace the child with the wrapped group
      child.parent?.add(wrapped);
      child.parent?.remove(child);
      wrapped.position.copy(child.position);
      wrapped.rotation.copy(child.rotation);
      wrapped.scale.copy(child.scale);
    }
  });
}
