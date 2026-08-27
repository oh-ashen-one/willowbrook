// Buildings — houses, shop, museum, plaza.
// Each building is a group with walls, roof, door, and a fenced yard.

import * as THREE from 'three';

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
    this._makeMuseum({ x: -24, z: 4 }, 'Museum', 0x8a6a4a, 0xeacfa8);

    // Signpost near the plaza
    this._makeSignpost();
  }

  get(id) {
    return this.list.find(b => b.userData.id === id);
  }

  _makeBuildingShell(width, depth, wallColor, roofColor) {
    const g = new THREE.Group();

    // Foundation
    const found = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.4, 0.2, depth + 0.4),
      new THREE.MeshStandardMaterial({ color: 0xa48a6a, roughness: 0.95 })
    );
    found.position.y = 0.1;
    found.receiveShadow = true; found.castShadow = true;
    g.add(found);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(width, 1.6, depth), wallMat);
    walls.position.y = 1.0;
    walls.castShadow = true; walls.receiveShadow = true;
    g.add(walls);

    // Gable roof — proper triangular prism with ridge running along the long axis
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
    const roofH = 1.1;
    const ridgeY = 1.8 + roofH * 0.5;
    const ridge = this._makeGableRoof(width + 0.5, depth + 0.5, roofH, roofMat);
    ridge.position.y = ridgeY;
    ridge.castShadow = true;
    ridge.receiveShadow = true;
    g.add(ridge);

    // Chimney
    const chim = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.9, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.9 })
    );
    chim.position.set(width * 0.32, 2.6, 0);
    chim.castShadow = true;
    g.add(chim);

    return g;
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
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.4, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 })
    );
    frame.position.y = 0.7;
    g.add(frame);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.2, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.7 })
    );
    door.position.set(0, 0.6, 0.04);
    g.add(door);
    // knob
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffd56e, metalness: 0.7, roughness: 0.3 })
    );
    knob.position.set(0.25, 0.6, 0.08);
    g.add(knob);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    g.userData.isDoor = true;
    building.add(g);
    return g;
  }

  _makeWindows(building, w, d) {
    const winMat = new THREE.MeshStandardMaterial({ color: 0x9bd1e6, roughness: 0.3, metalness: 0.1, emissive: 0xffe9b6, emissiveIntensity: 0.2 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 });

    const placeWindow = (x, y, z, rotY) => {
      const grp = new THREE.Group();
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.04), winMat);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.06), frameMat);
      frame.position.z = -0.01;
      // cross
      const vbar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.07), frameMat);
      const hbar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.07), frameMat);
      grp.add(win, frame, vbar, hbar);
      grp.position.set(x, y, z);
      grp.rotation.y = rotY;
      building.add(grp);
    };
    // Front windows
    placeWindow(-w/2 + 0.9, 1.2, d/2 + 0.04, 0);
    placeWindow(w/2 - 0.9, 1.2, d/2 + 0.04, 0);
    // Side windows
    placeWindow(w/2 + 0.04, 1.2, -d/4, Math.PI / 2);
    placeWindow(w/2 + 0.04, 1.2, d/4, Math.PI / 2);
    placeWindow(-w/2 - 0.04, 1.2, -d/4, -Math.PI / 2);
    placeWindow(-w/2 - 0.04, 1.2, d/4, -Math.PI / 2);
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
    const mb = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a3a }));
    post.position.y = 0.5;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.55), new THREE.MeshStandardMaterial({ color: 0xd63a2c }));
    box.position.set(0, 1.05, 0.05);
    mb.add(post, box);
    mb.position.set(0, g.position.y, 10 - 2.3);
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
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xeacfa8, roughness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0xa8845a, roughness: 0.85 });
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
    const totalArc = 2 * Math.PI * r;
    const picketStep = 0.4;
    const pickets = Math.floor(totalArc / picketStep);
    for (let p = 0; p < pickets; p++) {
      const a = (p / pickets) * Math.PI * 2;
      const px = g.position.x + Math.cos(a) * r;
      const pz = g.position.z + Math.sin(a) * r;
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.04), fenceMat);
      picket.position.set(px, g.position.y + 0.35, pz);
      picket.rotation.y = a + Math.PI / 2; // face inward/outward
      picket.castShadow = true;
      this.scene.add(picket);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), fenceMat);
      cap.position.set(px, g.position.y + 0.74, pz);
      cap.rotation.y = a;
      this.scene.add(cap);
    }
  }

  _makeShop(pos, name, roofColor, wallColor) {
    const g = this._makeBuildingShell(6.0, 4.5, wallColor, roofColor);
    // Awning
    const awningMat = new THREE.MeshStandardMaterial({ color: 0xff5e5e, roughness: 0.8 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.12, 1.2), awningMat);
    awning.position.set(0, 1.85, 2.65);
    awning.rotation.x = -Math.PI / 8;
    awning.castShadow = true;
    g.add(awning);
    // Awning stripes
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.13, 1.2), stripeMat);
      s.position.set(-2.5 + i, 1.86, 2.65);
      s.rotation.x = -Math.PI / 8;
      g.add(s);
    }
    // Sign
    const signBg = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.8, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.8 })
    );
    signBg.position.set(0, 2.4, 2.3);
    g.add(signBg);
    // Sign text simulated by textured plane
    const signTex = this._textSignTexture(name, 0xffe9a8);
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.65),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signFace.position.set(0, 2.4, 2.36);
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
    const colMat = new THREE.MeshStandardMaterial({ color: 0xf2e0c0, roughness: 0.7 });
    for (let i = -1; i <= 1; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.0, 10), colMat);
      col.position.set(i * 2, 1.0, 2.55);
      col.castShadow = true;
      g.add(col);
    }
    // Pediment
    const pedi = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.2, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xeed7a8, roughness: 0.7 })
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
      new THREE.MeshStandardMaterial({ map: pavTex, roughness: 0.9 })
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
      new THREE.MeshStandardMaterial({ color: 0xb8b6ad, roughness: 0.55 })
    );
    rim.position.y = 0.16;
    rim.castShadow = true; rim.receiveShadow = true;
    fount.add(rim);
    // Light-gray inner sleeve so the well reads as stone, not a chocolate well
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 0.18, 20),
      new THREE.MeshStandardMaterial({ color: 0xb8b6ad, roughness: 0.7 })
    );
    basin.position.y = 0.18;
    basin.castShadow = true;
    fount.add(basin);
    // Glowing blue water disc raised above the rim
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.04, 24),
      new THREE.MeshStandardMaterial({
        color: 0x9ed4f0, roughness: 0.2, metalness: 0.0,
        emissive: 0x6abee5, emissiveIntensity: 0.5,
      })
    );
    water.position.y = 0.30;
    fount.add(water);
    // Hemispherical water mound — the dome of cascading water AC has.
    // Bumped radius and raised Y so it visibly crowns above the inner sleeve.
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 18, 14),
      new THREE.MeshStandardMaterial({
        color: 0xb8e4ff, roughness: 0.15, metalness: 0.0,
        emissive: 0x7acaf0, emissiveIntensity: 0.4,
      })
    );
    mound.position.y = 0.52;
    mound.scale.y = 0.55;
    fount.add(mound);
    // Outer ring of cascading water at the rim — TorusGeometry instead of disc.
    const waterRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.1, 12, 24),
      new THREE.MeshStandardMaterial({
        color: 0xb8e4ff, roughness: 0.2, metalness: 0.0,
        emissive: 0x6abee5, emissiveIntensity: 0.5,
      })
    );
    waterRing.rotation.x = -Math.PI / 2;
    waterRing.position.y = 0.45;
    fount.add(waterRing);
    // Central pillar (thicker)
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xc4c2b8, roughness: 0.6 })
    );
    pillar.position.y = 1.05;
    pillar.castShadow = true;
    fount.add(pillar);
    // Top "urn" bowl (bigger)
    const urn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.4, 0.55, 14),
      new THREE.MeshStandardMaterial({ color: 0xc4c2b8, roughness: 0.55 })
    );
    urn.position.y = 1.85;
    urn.castShadow = true;
    fount.add(urn);
    // Glowing spray ball — water mist, not a marble
    const spray = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.7 })
    );
    spray.position.y = 2.25;
    fount.add(spray);

    // Water droplets — small spheres that animate up the pillar then fall
    this.fountainDroplets = [];
    for (let i = 0; i < 18; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 4),
        new THREE.MeshStandardMaterial({
          color: 0xdff2ff, transparent: true, opacity: 0.85, emissive: 0x7acaf0, emissiveIntensity: 0.6,
        })
      );
      const ang = (i / 18) * Math.PI * 2;
      drop.userData = { angle: ang, baseR: 0.42, phase: (i / 18) * Math.PI * 2 };
      fount.add(drop);
      this.fountainDroplets.push(drop);
    }
    // Plaza lanterns — 4 short posts around the fountain
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffe9b6, emissive: 0xffd56e, emissiveIntensity: 0.5, roughness: 0.7,
    });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const post = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3a25, roughness: 0.8 })
      );
      pole.position.y = 0.45;
      post.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), lanternMat);
      lamp.position.y = 0.95;
      post.add(lamp);
      post.position.set(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5);
      fount.add(post);
    }
    fount.position.set(0, 0.04, 0);
    g.add(fount);

    // Benches around the plaza
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.85 });
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
      new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 })
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

  _pavingTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d6c8a8';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 32; i++) {
      const x = Math.floor(Math.random() * 16) * 16;
      const y = Math.floor(Math.random() * 16) * 16;
      ctx.fillStyle = `rgba(${100 + Math.random() * 60}, ${90 + Math.random() * 50}, ${60 + Math.random() * 40}, 0.5)`;
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
    // Lantern flicker at night (subtle intensity wobble)
    if (time.lightLevel < 0.4) {
      for (const b of this.list) {
        // no-op for now, future: window glow pulse
      }
    }
  }
}
