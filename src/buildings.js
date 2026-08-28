// Buildings — houses, shop, museum, plaza.
// Each building is a group with walls, roof, door, and a fenced yard.

import * as THREE from 'three';
import { gradientMap } from './toon.js';
import { HEX as PAL } from './core/palette.js';

// Roof and wall colour *instances* (six reds for the cottage roofs, four creams
// for the cottage walls). Per-instance values — kept inline. Palette tones
// (one-off semantic colours) flow through PAL.x.
const ROOF_COLORS = [0xc44a3a, 0x4a8fd1, 0xc49a3a, 0x6ac44a, 0x9a4ac4, 0xd16a8f];
const WALL_COLORS = [0xf2d6a8, 0xeac9a3, 0xddc6a4, 0xeed7b0];

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

export class Buildings {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.list = [];
    this._rng = rng(424242);
  }

  spawn() {
    // Plaza fountain at center, surrounding buildings placed around it.
    this._makePlaza();

    // Player house south of plaza so plaza stays visible.
    this._makePlayerHouse();

    // Villager homes keyed by ID for villager home lookup
    this._makeVillagerHome('oak', 'Maple', { x: 16, z: -10 }, ROOF_COLORS[0], WALL_COLORS[0]);
    this._makeVillagerHome('lily', 'Finn', { x: -16, z: -10 }, ROOF_COLORS[1], WALL_COLORS[1]);
    this._makeVillagerHome('cedar', 'Pebble', { x: -16, z: 14 }, ROOF_COLORS[2], WALL_COLORS[2]);
    this._makeVillagerHome('shell', 'Coral', { x: 16, z: 14 }, ROOF_COLORS[4], WALL_COLORS[0]);
    this._makeVillagerHome('acorn', 'Hazel', { x: 24, z: -18 }, ROOF_COLORS[3], WALL_COLORS[1]);

    // Public buildings
    this._makeShop({ x: 6, z: -16 }, "Nook's Nook", 0x4a8fd1, 0xf6e0a8);
    this._makeMuseum({ x: -24, z: 4 }, 'Museum', 0x8a6a4a, PAL.fence);

    // Signpost near the plaza
    this._makeSignpost();
  }

  get(id) {
    return this.list.find(b => b.userData.id === id);
  }

  _makeBuildingShell(width, depth, wallColor, roofColor) {
    const g = new THREE.Group();

    // Foundation (stone slab slightly wider than walls)
    const found = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.5, 0.2, depth + 0.5),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.windowGlass })
    );
    found.position.y = 0.1;
    found.receiveShadow = true; found.castShadow = true;
    g.add(found);

    // Walls
    const wallMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: wallColor });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(width, 1.6, depth), wallMat);
    walls.position.y = 1.0;
    walls.castShadow = true; walls.receiveShadow = true;
    g.add(walls);

    // Wood plank siding texture on walls (vertical grooves)
    this._addPlankSiding(g, width, depth);

    // Eave trim — a thin band running along the wall top, color of roof
    // Wave-Racer pattern: small Y rotation jitter on every eave plank so two
    // cottages side-by-side don't look stamped from the same mold.
    const trimMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.wallSiding });
    const eaveFront = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.12, 0.18), trimMat);
    eaveFront.position.set(0, 1.86, depth / 2 + 0.08);
    eaveFront.rotation.y = (this._rng() - 0.5) * 0.04;
    eaveFront.castShadow = true;
    g.add(eaveFront);
    const eaveBack = eaveFront.clone();
    eaveBack.position.z = -(depth / 2 + 0.08);
    g.add(eaveBack);
    const eaveLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, depth + 0.6), trimMat);
    eaveLeft.position.set(-(width / 2 + 0.08), 1.86, 0);
    eaveLeft.rotation.y = (this._rng() - 0.5) * 0.04;
    eaveLeft.castShadow = true;
    g.add(eaveLeft);
    const eaveRight = eaveLeft.clone();
    eaveRight.position.x = (width / 2 + 0.08);
    g.add(eaveRight);

    // Gable roof — triangular prism with proper overhang (extending beyond walls)
    const roofMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: roofColor });
    const roofH = 1.1;
    const ridgeY = 1.8 + roofH * 0.5;
    // Roof extends past walls by 0.6 on each axis for eaves
    const ridge = this._makeGableRoof(width + 1.0, depth + 1.0, roofH, roofMat);
    ridge.position.y = ridgeY;
    ridge.castShadow = true;
    ridge.receiveShadow = true;
    g.add(ridge);

    // Roof ridge cap — long thin cylinder along the peak
    const ridgeCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, width + 1.1, 6),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.roof })
    );
    ridgeCap.position.set(0, 2 * roofH + 0.05, 0);
    ridgeCap.rotation.z = Math.PI / 2;
    // Y rotation jitter so the ridge cap isn't always perfectly aligned with
    // the world axes.
    ridgeCap.rotation.y = this._rng() * Math.PI * 2;
    g.add(ridgeCap);

    // Brick chimney with cap
    const brickColor = PAL.brick;
    const chim = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.1, 0.5),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: brickColor })
    );
    chim.position.set(width * 0.30, 2.85, depth * 0.15);
    // Y rotation jitter — chimneys look hand-built when each one is a tiny
    // bit crooked vs the perfectly axis-aligned default.
    chim.rotation.y = (this._rng() - 0.5) * 0.15;
    chim.castShadow = true; chim.receiveShadow = true;
    g.add(chim);
    const chimneyCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.1, 0.65),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.roof })
    );
    chimneyCap.position.set(width * 0.30, 3.45, depth * 0.15);
    chimneyCap.rotation.y = chim.rotation.y;
    g.add(chimneyCap);

    return g;
  }

  // Vertical wood plank lines etched into the wall surface
  _addPlankSiding(g, width, depth) {
    const lineMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.wood });
    const plankCount = Math.floor(width / 0.18);
    for (let i = 0; i <= plankCount; i++) {
      const x = -width / 2 + i * 0.18;
      const lineFront = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.6, 0.012), lineMat);
      lineFront.position.set(x, 1.0, depth / 2 + 0.005);
      g.add(lineFront);
      const lineBack = lineFront.clone();
      lineBack.position.z = -(depth / 2 + 0.005);
      g.add(lineBack);
    }
    // Horizontal trim line at mid-height
    const midFront = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, 0.015), lineMat);
    midFront.position.set(0, 0.65, depth / 2 + 0.005);
    g.add(midFront);
    const midBack = midFront.clone();
    midBack.position.z = -(depth / 2 + 0.005);
    g.add(midBack);
  }

  // Triangular prism: vertices = (0,-h,0), (±w/2,0,±d/2). Custom BufferGeometry.
  _makeGableRoof(w, d, h, mat) {
    const halfW = w / 2, halfD = d / 2;
    // 6 vertices: 2 ridges (front/back), 2 eave-front-left, 2 eave-back-right
    const verts = new Float32Array([
      -halfW, 0, -halfD,  // 0 eave front-left
       halfW, 0, -halfD,  // 1 eave front-right
       halfW, 0,  halfD,  // 2 eave back-right
      -halfW, 0,  halfD,  // 3 eave back-left
       0, h, -halfD,      // 4 ridge front
       0, h,  halfD,      // 5 ridge back
    ]);
    const idx = [
      // front slope
      0, 1, 4,
      // back slope
      2, 3, 5,
      // left gable triangle
      0, 4, 3, 3, 4, 5,
      // right gable triangle
      1, 2, 5, 5, 4, 1,
      // bottom (cap) — invisible normally but cap to be safe
      0, 3, 2, 0, 2, 1,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  _makeDoor(building, x, z, rotY = 0) {
    const g = new THREE.Group();
    // Recessed doorway — frame set INTO the wall (negative z), door recessed behind frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 1.5, 0.1),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.windowFrame })
    );
    frame.position.set(0, 0.75, -0.02);
    frame.castShadow = true;
    g.add(frame);
    // Threshold step
    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.4),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.rock })
    );
    threshold.position.set(0, 0.04, 0.15);
    g.add(threshold);
    // Door panel (recessed)
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.2, 0.06),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.doorInset })
    );
    door.position.set(0, 0.6, -0.005);
    g.add(door);
    // Door inset panels (two horizontal raised rectangles — a classic door detail)
    const insetMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.wood });
    const inset1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.01), insetMat);
    inset1.position.set(0, 0.85, 0.026);
    g.add(inset1);
    const inset2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.01), insetMat);
    inset2.position.set(0, 0.32, 0.026);
    g.add(inset2);
    // Brass doorknob
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.doorknob, emissive: PAL.doorknob, emissiveIntensity: 0.3 })
    );
    knob.name = 'doorknob';
    knob.userData.skipOutline = true;
    knob.position.set(0.25, 0.6, 0.04);
    g.add(knob);
    // Stepping stone in front
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.05, 0.25),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.rock })
    );
    step.position.set(0, 0.025, 0.4);
    g.add(step);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    g.userData.isDoor = true;
    building.add(g);
    return g;
  }

  _makeWindows(building, w, d) {
    const winMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.water, emissive: PAL.lanternEmissive, emissiveIntensity: 0.2 });
    const frameMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.windowFrame });
    const sillMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.wallSiding });
    const shutterMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.shutter });

    const placeWindow = (x, y, z, rotY, withShutters = true) => {
      const grp = new THREE.Group();
      // Outer frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.06), frameMat);
      frame.position.z = 0.01;
      grp.add(frame);
      // Window glass
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.025), winMat);
      grp.add(win);
      // 4-pane mullions (vertical + horizontal cross + another vertical for 3x2 panes)
      const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.04), frameMat);
      grp.add(m1);
      const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.04), frameMat);
      grp.add(m2);
      const m3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.04), frameMat);
      m3.position.x = -0.21;
      grp.add(m3);
      const m4 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.04), frameMat);
      m4.position.x = 0.21;
      grp.add(m4);
      // Window sill (a tiny ledge below)
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.18), sillMat);
      sill.position.set(0, -0.45, 0.05);
      grp.add(sill);
      // Shutters on either side
      if (withShutters) {
        const sh1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.04), shutterMat);
        sh1.position.set(-0.6, 0, 0.005);
        grp.add(sh1);
        // Shutter slats (horizontal lines)
        for (let s = 0; s < 3; s++) {
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 0.045), frameMat);
          slat.position.set(-0.6, -0.22 + s * 0.22, 0.025);
          grp.add(slat);
        }
        const sh2 = sh1.clone();
        sh2.position.x = 0.6;
        grp.add(sh2);
        for (let s = 0; s < 3; s++) {
          const slat2 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 0.045), frameMat);
          slat2.position.set(0.6, -0.22 + s * 0.22, 0.025);
          grp.add(slat2);
        }
      }
      grp.position.set(x, y, z);
      grp.rotation.y = rotY;
      building.add(grp);
    };
    // Front windows
    placeWindow(-w/2 + 1.0, 1.3, d/2 + 0.04, 0);
    placeWindow(w/2 - 1.0, 1.3, d/2 + 0.04, 0);
    // Side windows (no shutters on sides to save poly count)
    placeWindow(w/2 + 0.04, 1.3, -d/4, Math.PI / 2, false);
    placeWindow(w/2 + 0.04, 1.3, d/4, Math.PI / 2, false);
    placeWindow(-w/2 - 0.04, 1.3, -d/4, -Math.PI / 2, false);
    placeWindow(-w/2 - 0.04, 1.3, d/4, -Math.PI / 2, false);
  }

  _makePlayerHouse() {
    const g = this._makeBuildingShell(4.5, 4.0, 0xf6d6a8, 0xc44a3a);
    this._makeDoor(g, 0, 2.02);
    this._makeWindows(g, 4.5, 4.0);
    g.position.set(0, 0, 10);
    g.position.y = this.world.heightAt(0, 10);
    g.rotation.y = Math.PI; // face the plaza
    g.userData = { id: 'player', isHouse: true, name: 'Home' };
    this.scene.add(g);
    this.list.push(g);

    // Mailbox in front (toward plaza)
    // Y rotation jitter so the post doesn't always face perfectly square.
    const mb = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.wallSiding }));
    post.position.y = 0.5;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.55), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.fruitApple }));
    box.position.set(0, 1.05, 0.05);
    mb.add(post, box);
    mb.position.set(0, g.position.y, 10 - 2.3);
    mb.rotation.y = (this._rng() - 0.5) * 0.4;
    mb.castShadow = true;
    this.scene.add(mb);
  }

  _makeVillagerHome(id, villagerName, pos, roofColor, wallColor) {
    const g = this._makeBuildingShell(4.2, 3.8, wallColor, roofColor);
    this._makeDoor(g, 0, 1.92);
    this._makeWindows(g, 4.2, 3.8);
    g.position.set(pos.x, this.world.heightAt(pos.x, pos.z), pos.z);
    g.rotation.y = this._rng() * 0.6 - 0.3;
    g.userData = { id, isHouse: true, name: `${villagerName}'s home`, villagerName };
    this.scene.add(g);
    this.list.push(g);

    // Picket fence — continuous ring with two stringers and vertical pickets.
    const fenceMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.fence });
    const darkMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.dirtStep });
    const r = 4.0;
    const sides = 32; // smoother ring, no visible segment seams
    // Sample evenly-spaced points around the ring
    const ringPoints = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      ringPoints.push({ x: g.position.x + Math.cos(a) * r, z: g.position.z + Math.sin(a) * r });
    }
    // Two continuous stringer rings: a thin ribbon we re-build from segments with overlap
    for (const yy of [0.25, 0.55]) {
      for (let i = 0; i < sides; i++) {
        const p1 = ringPoints[i];
        const p2 = ringPoints[(i + 1) % sides];
        const dx = p2.x - p1.x, dz = p2.z - p1.z;
        const len = Math.hypot(dx, dz) + 0.12; // overlap so corners connect
        const angle = Math.atan2(dz, dx);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.05), darkMat);
        rail.position.set((p1.x + p2.x) / 2, g.position.y + yy, (p1.z + p2.z) / 2);
        rail.rotation.y = angle;
        rail.castShadow = true; rail.receiveShadow = true;
        this.scene.add(rail);
      }
    }
    // Picket posts every 0.4 units around the ring
    // Wave-Racer pattern: tiny Y rotation jitter on every picket so the
    // fence ring isn't a perfectly regular polygon.
    const totalArc = 2 * Math.PI * r;
    const picketStep = 0.4;
    const pickets = Math.floor(totalArc / picketStep);
    for (let p = 0; p < pickets; p++) {
      const a = (p / pickets) * Math.PI * 2;
      const px = g.position.x + Math.cos(a) * r;
      const pz = g.position.z + Math.sin(a) * r;
      const picketJitter = (this._rng() - 0.5) * 0.06;
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.04), fenceMat);
      picket.position.set(px, g.position.y + 0.35, pz);
      picket.rotation.y = a + Math.PI / 2 + picketJitter; // face inward/outward + jitter
      picket.castShadow = true;
      this.scene.add(picket);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), fenceMat);
      cap.position.set(px, g.position.y + 0.74, pz);
      cap.rotation.y = a + picketJitter;
      this.scene.add(cap);
    }
  }

  _makeShop(pos, name, roofColor, wallColor) {
    const g = this._makeBuildingShell(6.0, 4.5, wallColor, roofColor);
    // Awning — Y rotation jitter so the awning hangs at a tiny tilt, not
    // perfectly axis-aligned. Wave-Racer pattern: every hand-built detail
    // gets a small per-instance rotation.
    const awningMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.hull0 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.12, 1.2), awningMat);
    awning.position.set(0, 1.85, 2.65);
    awning.rotation.x = -Math.PI / 8;
    awning.rotation.y = (this._rng() - 0.5) * 0.05;
    awning.castShadow = true;
    g.add(awning);
    // Awning stripes — match awning rotation so they read as one piece
    const stripeMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.cloudLit });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.13, 1.2), stripeMat);
      s.position.set(-2.5 + i, 1.86, 2.65);
      s.rotation.x = -Math.PI / 8;
      s.rotation.y = awning.rotation.y;
      g.add(s);
    }
    // Sign — Y rotation jitter, sign face follows sign
    const signBg = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.8, 0.1),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.doorInset })
    );
    signBg.position.set(0, 2.4, 2.3);
    signBg.rotation.y = (this._rng() - 0.5) * 0.05;
    g.add(signBg);
    // Sign text simulated by textured plane
    const signTex = this._textSignTexture(name, 0xffe9a8);
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.65),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signFace.position.set(0, 2.4, 2.36);
    signFace.rotation.y = signBg.rotation.y;
    g.add(signFace);

    this._makeDoor(g, 0, 2.27);
    this._makeWindows(g, 6.0, 4.5);

    g.position.set(pos.x, this.world.heightAt(pos.x, pos.z), pos.z);
    g.userData = { id: 'shop', name, isShop: true };
    this.scene.add(g);
    this.list.push(g);
  }

  _makeMuseum(pos, name, roofColor, wallColor) {
    const g = this._makeBuildingShell(7.0, 5.0, wallColor, roofColor);
    // Columns at the front
    const colMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.woodLight });
    for (let i = -1; i <= 1; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.0, 10), colMat);
      col.position.set(i * 2, 1.0, 2.55);
      col.castShadow = true;
      g.add(col);
    }
    // Pediment
    const pedi = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.2, 1.0),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.woodLight })
    );
    pedi.position.set(0, 2.1, 2.55);
    g.add(pedi);
    // Sign
    const signTex = this._textSignTexture(name, 0xfff8d6, 64);
    const signBg = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.0),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signBg.position.set(0, 2.3, 2.56);
    g.add(signBg);

    this._makeDoor(g, 0, 2.55, 0);
    g.position.set(pos.x, this.world.heightAt(pos.x, pos.z), pos.z);
    g.userData = { id: 'museum', name, isMuseum: true };
    this.scene.add(g);
    this.list.push(g);
  }

  _makePlaza() {
    // Open paved square with fountain
    const g = new THREE.Group();
    const pavTex = this._pavingTexture();
    const pav = new THREE.Mesh(
      new THREE.CircleGeometry(7, 32),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), map: pavTex })
    );
    pav.rotation.x = -Math.PI / 2;
    pav.position.y = 0.05;
    pav.receiveShadow = true;
    g.add(pav);

    // Fountain — AC-inspired: octagonal stone basin with water mounded in a dome.
    const fount = new THREE.Group();
    // Outer stone rim (octagonal)
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.95, 1.95, 0.22, 8),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.rock })
    );
    rim.position.y = 0.16;
    rim.castShadow = true; rim.receiveShadow = true;
    fount.add(rim);
    // Light-gray inner sleeve so the well reads as stone, not a chocolate well
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 0.18, 20),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.rock })
    );
    basin.position.y = 0.18;
    basin.castShadow = true;
    fount.add(basin);
    // Glowing blue water disc raised above the rim
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.04, 24),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3),
        color: PAL.water,
        emissive: PAL.waterDeep, emissiveIntensity: 0.5,
      })
    );
    water.position.y = 0.30;
    fount.add(water);
    // Hemispherical water mound — the dome of cascading water AC has.
    // Bumped radius and raised Y so it visibly crowns above the inner sleeve.
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 18, 14),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3),
        color: PAL.skyDay,
        emissive: PAL.water, emissiveIntensity: 0.4,
      })
    );
    mound.position.y = 0.52;
    mound.scale.y = 0.55;
    fount.add(mound);
    // Outer ring of cascading water at the rim — TorusGeometry instead of disc.
    const waterRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.1, 12, 24),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3),
        color: PAL.skyDay,
        emissive: PAL.waterDeep, emissiveIntensity: 0.5,
      })
    );
    waterRing.rotation.x = -Math.PI / 2;
    waterRing.position.y = 0.45;
    fount.add(waterRing);
    // Central pillar (thicker)
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.2, 12),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.rock })
    );
    pillar.position.y = 1.05;
    pillar.castShadow = true;
    fount.add(pillar);
    // Top "urn" bowl (bigger)
    const urn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.4, 0.55, 14),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.rock })
    );
    urn.position.y = 1.85;
    urn.castShadow = true;
    fount.add(urn);
    // Glowing spray ball — water mist, not a marble
    const spray = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 10),
      new THREE.MeshBasicMaterial({ color: PAL.glass, transparent: true, opacity: 0.7 })
    );
    spray.position.y = 2.25;
    fount.add(spray);

    // Water droplets — small spheres that animate up the pillar then fall
    this.fountainDroplets = [];
    for (let i = 0; i < 18; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 4),
        new THREE.MeshToonMaterial({ gradientMap: gradientMap(3),
          color: PAL.glass, transparent: true, opacity: 0.85, emissive: PAL.water, emissiveIntensity: 0.6,
        })
      );
      const ang = (i / 18) * Math.PI * 2;
      drop.userData = { angle: ang, baseR: 0.42, phase: (i / 18) * Math.PI * 2 };
      fount.add(drop);
      this.fountainDroplets.push(drop);
    }
    // Plaza lanterns — 4 short posts around the fountain
    const lanternMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3),
      color: 0xffe9b6, emissive: PAL.doorknob, emissiveIntensity: 0.5,
    });
    // Soft glow halo sprite — additive billboard so each lantern has a
    // visible warm glow around the lamp, not just a sharp sphere. The
    // texture is a soft radial gradient; AdditiveBlending adds the sprite
    // on top of the lit scene so the glow reads as light, not paint.
    const glowTex = this._lanternGlowTexture();
    this.lanternLights = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const post = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
        new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x4a3a25 })
      );
      pole.position.y = 0.45;
      post.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), lanternMat);
      lamp.position.y = 0.95;
      post.add(lamp);
      // Glow halo — sprite scales slightly larger than the lamp, billboarded
      // toward camera via Sprite. AdditiveBlending so the sprite adds glow
      // on top of the scene; depthWrite off so it doesn't write z-buffer.
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffcb6b,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      glow.position.y = 0.95;
      glow.scale.set(0.85, 0.85, 1);
      post.add(glow);
      // Point light bulb — warms the plaza at night
      const bulb = new THREE.PointLight(0xffcb6b, 0.0, 6.0, 2.0);
      bulb.position.y = 0.95;
      post.add(bulb);
      this.lanternLights.push(bulb);
      post.position.set(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5);
      fount.add(post);
    }
    fount.position.set(0, 0.04, 0);
    g.add(fount);

    // Benches around the plaza
    const benchMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.wallSiding });
    const bench = (x, z, ry) => {
      const b = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.5), benchMat);
      seat.position.y = 0.4;
      seat.castShadow = true;
      b.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.1), benchMat);
      back.position.set(0, 0.65, -0.22);
      b.add(back);
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.5), benchMat);
      leg1.position.set(-0.9, 0.2, 0);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.5), benchMat);
      leg2.position.set(0.9, 0.2, 0);
      b.add(leg1, leg2);
      b.position.set(x, 0.05, z);
      b.rotation.y = ry;
      g.add(b);
    };
    bench(6, 0, -Math.PI / 2);
    bench(-6, 0, Math.PI / 2);
    bench(0, 6, Math.PI);
    bench(0, -6, 0);

    g.position.set(0, 0, 0);
    g.userData = { id: 'plaza', isPlaza: true };
    this.scene.add(g);
    this.list.push(g);
  }

  _makeSignpost() {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.wood })
    );
    post.position.set(8, this.world.heightAt(8, -3) + 0.8, -3);
    post.castShadow = true;
    this.scene.add(post);
    const tex = this._textSignTexture('Plaza', 0xfff8d6, 32);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.4),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    board.position.set(8, this.world.heightAt(8, -3) + 1.4, -3 + 0.05);
    this.scene.add(board);
  }

  _textSignTexture(text, color = 0xffe9a8, fontSize = 48) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(0, 0, 512, 128);
    const hex = '#' + color.toString(16).padStart(6, '0');
    ctx.fillStyle = hex;
    ctx.font = `bold ${fontSize}px Quicksand, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    return new THREE.CanvasTexture(c);
  }

  _lanternGlowTexture() {
    // Soft radial-gradient halo for the lantern glow sprite. Warm yellow
    // fades to transparent so the sprite reads as light when additively
    // blended over the scene. Same canvas pattern as the cloud puffs, but
    // warmer and tighter falloff.
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0,    'rgba(255, 230, 160, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 200, 110, 0.55)');
    grad.addColorStop(0.75, 'rgba(255, 180, 80,  0.18)');
    grad.addColorStop(1,    'rgba(255, 180, 80,  0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  _pavingTexture() {
    // Seeded RNG so the paving pattern is identical on every load —
    // red-sands rule: no Math.random() for anything that ends up in a screenshot.
    let s = 0xABCDE1 | 0;
    const r = () => {
      s = (s * 1664525 + 1013904223) | 0;
      return ((s >>> 0) / 4294967296);
    };
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d6c8a8';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 32; i++) {
      const x = Math.floor(r() * 16) * 16;
      const y = Math.floor(r() * 16) * 16;
      ctx.fillStyle = `rgba(${100 + r() * 60}, ${90 + r() * 50}, ${60 + r() * 40}, 0.5)`;
      ctx.fillRect(x, y, 14, 14);
    }
    return new THREE.CanvasTexture(c);
  }

  update(dt, time) {
    // Animate the fountain water droplets — they spiral up the pillar then fall back.
    if (this.fountainDroplets) {
      for (const d of this.fountainDroplets) {
        const phase = (time.t * 1.5 + d.userData.phase) % (Math.PI * 2);
        const y = 0.5 + Math.sin(phase) * 0.9 + 0.45;
        const r = d.userData.baseR * (0.4 + 0.6 * Math.cos(phase));
        d.position.set(
          Math.cos(d.userData.angle + time.t * 0.4) * r,
          y,
          Math.sin(d.userData.angle + time.t * 0.4) * r,
        );
      }
    }
    // Lantern PointLights flicker at dusk / night — they fade in then wobble.
    if (this.lanternLights) {
      // Night-only: 0 during full day, ramps up after hour 17, full after 19
      const h = time.hour;
      let base;
      if (h < 5 || h >= 21) base = 1.0;
      else if (h < 7) base = (h - 5) / 2 * 0.5;
      else if (h >= 17 && h < 19) base = (h - 17) / 2;
      else if (h >= 19 && h < 21) base = 1.0;
      else base = 0;
      const flicker = 1 + Math.sin(time.t * 5.3) * 0.05 + Math.sin(time.t * 11.1) * 0.03;
      for (const bulb of this.lanternLights) {
        bulb.intensity = base * 1.6 * flicker;
      }
    }
  }
}
