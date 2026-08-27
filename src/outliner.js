// Outliner — walk a scene and attach inverted-hull outlines to every mesh.
// Keeps the original meshes intact, just adds a slightly-larger black back-face copy behind each one.

import * as THREE from 'three';

/**
 * Recursively outline every Mesh in `root`. Skip rules:
 * - meshes flagged with userData.skipOutline = true
 * - tiny meshes (eyes, particles, leaves) below an area threshold
 * - particles with userData.isParticle
 */
export function outlineScene(root, opts = {}) {
  const color = opts.color ?? 0x1a1208;
  const thickness = opts.thickness ?? 0.03;
  const skipBelow = opts.skipBelow ?? 0.04; // world units
  const skipKeywords = opts.skipKeywords ?? ['particle', 'eye', 'drop', 'pearl'];
  const outlineMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
    depthWrite: true,
    fog: true,
  });
  let added = 0;
  let skipped = 0;
  const meshes = [];
  root.traverse((c) => {
    if (c.isMesh) meshes.push(c);
  });
  console.log('[outliner] found', meshes.length, 'meshes');
  for (const m of meshes) {
    if (m.userData.skipOutline) { skipped++; continue; }
    if (m.userData.isParticle) { skipped++; continue; }
    const n = (m.name || '').toLowerCase();
    if (skipKeywords.some(k => n.includes(k))) { skipped++; continue; }
    if (skipBelow > 0) {
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      const r = m.geometry.boundingSphere?.radius || 0;
      if (r < skipBelow && m.geometry.attributes.position.count < 60) { skipped++; continue; }
    }
    // Already outlined?
    if (m.parent && m.parent.userData?.isOutline && m.parent.userData.target === m) continue;
    const outline = new THREE.Mesh(m.geometry, outlineMat);
    // Scale up slightly, more on flat things
    const t = thickness * (m.geometry.boundingSphere?.radius > 1 ? 1.2 : 1);
    outline.scale.set(1 + t, 1 + t, 1 + t);
    outline.castShadow = false;
    outline.receiveShadow = false;
    outline.renderOrder = (m.renderOrder ?? 0) - 1;
    outline.userData.isOutline = true;
    outline.userData.target = m;
    outline.name = m.name ? m.name + '_outline' : 'outline';
    m.add(outline);
    added++;
  }
  return added;
}

/**
 * Walk the tree once more to get the outline count (used for debugging).
 */
export function countOutlines(root) {
  let n = 0;
  root.traverse(c => { if (c.userData?.isOutline) n++; });
  return n;
}

/**
 * Dispose outlines previously attached by outlineScene. Walks the tree,
 * removes every child whose userData.isOutline is true.
 */
export function unoutline(root) {
  let removed = 0;
  const toRemove = [];
  root.traverse((c) => {
    if (c.userData?.isOutline) toRemove.push(c);
  });
  for (const o of toRemove) {
    o.parent?.remove(o);
    removed++;
  }
  return removed;
}
