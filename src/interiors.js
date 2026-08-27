// Interiors — fade-to-black, swap scene, place player inside.
// Keeps the feel minimal but recognisable: beds, tables, dressers, a museum exhibit.

import * as THREE from 'three';

export class Interiors {
  constructor(scene, modules) {
    this.scene = scene;
    this.modules = modules;
    this.active = null; // null = outside
    this._fadeT = 0;
    this._fading = 0; // 0 = none, 1 = fading out, -1 = fading in
    this._pendingInterior = null;
  }

  isInside() { return this.active !== null; }

  enter(buildingId) {
    if (this._fading !== 0) return;
    this._pendingInterior = buildingId;
    this._fading = 1;
    this._fadeT = 0;
  }

  exit() {
    if (this._fading !== 0) return;
    // Snap player back to the doorway on the world side so the fade-in lands
    // them right in front of the building they just left.
    if (this.modules.player) {
      const pos = this.modules.game?._savedPlayerPos;
      if (pos) this.modules.player.position.copy(pos);
      this.modules.player._interiorMode = false;
      this.modules.player._interiorHalf = null;
    }
    this._pendingInterior = null;
    this._fading = -1;
    this._fadeT = 0;
    // Re-enter the world once the fade-in finishes
    setTimeout(() => {
      if (this.modules.onExitToWorld) this.modules.onExitToWorld();
    }, 350);
  }

  update(dt) {
    if (this._fading === 0) return;
    this._fadeT += dt * 4.0;
    if (this._fadeT >= 1) {
      this._fadeT = 1;
      if (this._fading === 1) {
        try {
          this._swapToInterior(this._pendingInterior);
        } catch (e) {
          console.error('[interiors] swap failed', e);
        }
        this.active = this._pendingInterior;
        this._fading = -1;
        this._fadeT = 0;
      } else {
        this._fading = 0;
        this._fadeT = 0;
      }
    }
    this._applyFade();
  }

  _swapToInterior(id) {
    // Remove all world objects (children of scene that aren't part of the interior)
    // Simpler: clear scene and rebuild just the interior
    while (this.scene.children.length) {
      const c = this.scene.children[0];
      this.scene.remove(c);
    }

    // Sky / fog tinted warmly
    this.scene.background = new THREE.Color(0x2a1f15);
    this.scene.fog = new THREE.Fog(0x2a1f15, 8, 30);
    this.scene.add(new THREE.AmbientLight(0xffeac0, 0.55));

    const sun = new THREE.DirectionalLight(0xffe6b0, 0.9);
    sun.position.set(2, 5, 2);
    this.scene.add(sun);

    // Wood floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: 0xa47850, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Walls — four of them so the room actually encloses
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2e0c0, roughness: 0.9 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe8d5a0, roughness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.85 });
    const WALL = 16, WALLH = 6;
    // Back wall (-z) with wallpaper stripes
    const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(WALL, WALLH), wallMat);
    wallBack.position.set(0, WALLH / 2, -WALL / 2);
    wallBack.receiveShadow = true;
    this.scene.add(wallBack);
    for (let i = -3; i <= 3; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.6, WALLH), stripeMat);
      stripe.position.set(i * 2.2, WALLH / 2, -WALL / 2 + 0.05);
      this.scene.add(stripe);
    }
    // Side walls (±x)
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(WALL, WALLH), wallMat);
      w.position.set(sx * WALL / 2, WALLH / 2, 0);
      w.rotation.y = -sx * Math.PI / 2;
      w.receiveShadow = true;
      this.scene.add(w);
    }
    // Front wall (+z) — with a doorway cutout visually broken into two pieces
    const frontL = new THREE.Mesh(new THREE.PlaneGeometry(7.5, WALLH), wallMat);
    frontL.position.set(-4.25, WALLH / 2, WALL / 2);
    frontL.rotation.y = Math.PI;
    frontL.receiveShadow = true;
    this.scene.add(frontL);
    const frontR = new THREE.Mesh(new THREE.PlaneGeometry(7.5, WALLH), wallMat);
    frontR.position.set(4.25, WALLH / 2, WALL / 2);
    frontR.rotation.y = Math.PI;
    frontR.receiveShadow = true;
    this.scene.add(frontR);
    // Lintel above the doorway
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.2), trimMat);
    lintel.position.set(0, WALLH - 0.5, WALL / 2 - 0.05);
    this.scene.add(lintel);
    // Floor trim — wood baseboard around the room
    const trimH = 0.3;
    const trim = (x, z, w, d, rotY = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, trimH, d), trimMat);
      m.position.set(x, trimH / 2, z);
      m.rotation.y = rotY;
      m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
    };
    trim(0, -WALL / 2 + 0.06, WALL, 0.1, 0);
    trim(0,  WALL / 2 - 0.06, WALL, 0.1, 0);
    trim(-WALL / 2 + 0.06, 0, 0.1, WALL, 0);
    trim( WALL / 2 - 0.06, 0, 0.1, WALL, 0);

    // Furniture per interior type
    if (id === 'home' || id === 'player') this._buildHomeInterior();
    else if (id === 'shop') this._buildShopInterior();
    else if (id === 'museum') this._buildMuseumInterior();
    else this._buildHomeInterior(); // default

    // Place player inside (camera anchor)
    this.modules.player.position.set(0, 0, 2);
    this.modules.player._interiorMode = true;
    this.modules.player._interiorHalf = 7.5;
    this.modules.player._snapToGround();
  }

  exitToWorld() {
    // Restore outdoor scene by re-initing the game
    // Simpler approach: page reload — but that loses state. For now, request re-init.
    // We use the main game class to re-init.
    if (this.modules.onExitToWorld) this.modules.onExitToWorld();
  }

  _buildHomeInterior() {
    // Bed
    const bed = new THREE.Group();
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.4, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xeecfa8, roughness: 0.9 })
    );
    mattress.position.y = 0.5;
    mattress.castShadow = true; mattress.receiveShadow = true;
    bed.add(mattress);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.15, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.95 })
    );
    pillow.position.set(-0.8, 0.78, 0);
    bed.add(pillow);
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x4a8fd1, roughness: 0.95 })
    );
    blanket.position.set(0, 0.74, 0);
    bed.add(blanket);
    bed.position.set(-4, 0, -6);
    bed.rotation.y = Math.PI / 2;
    this.scene.add(bed);

    // Dresser
    const dresser = new THREE.Group();
    const drBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.0, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xc4a478, roughness: 0.85 })
    );
    drBody.position.y = 0.5;
    drBody.castShadow = true; drBody.receiveShadow = true;
    dresser.add(drBody);
    // Mirror
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.8, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xbfe4f5, roughness: 0.1, metalness: 0.5 })
    );
    mirror.position.set(0, 1.45, 0);
    dresser.add(mirror);
    const mirrorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.95, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 })
    );
    mirrorFrame.position.set(0, 1.45, -0.02);
    dresser.add(mirrorFrame);
    dresser.position.set(4, 0, -6.5);
    this.scene.add(dresser);

    // Table + chair
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xb89466, roughness: 0.8 })
    );
    table.position.set(3, 0.85, 4);
    table.castShadow = true;
    this.scene.add(table);
    const tableLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 })
    );
    tableLeg.position.set(3, 0.4, 4);
    this.scene.add(tableLeg);

    // Window — square cutout with sky behind
    const winMat = new THREE.MeshStandardMaterial({ color: 0xcfe9f5, emissive: 0xfff2c8, emissiveIntensity: 0.4 });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), winMat);
    win.position.set(-3, 3, -7.94);
    this.scene.add(win);

    // Plant
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.18, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xc4743c, roughness: 0.9 })
    );
    pot.position.set(-3.5, 0.2, -5.5);
    pot.castShadow = true;
    this.scene.add(pot);
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x6fbf5a, roughness: 0.95 })
    );
    leaves.position.set(-3.5, 0.65, -5.5);
    leaves.castShadow = true;
    this.scene.add(leaves);

    // Exit indicator — door icon
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.8, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.8 })
    );
    doorFrame.position.set(0, 0.9, 7.95);
    this.scene.add(doorFrame);
  }

  _buildShopInterior() {
    // Counter
    const counter = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 1.0, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xb89466, roughness: 0.8 })
    );
    body.position.y = 0.5;
    counter.add(body);
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(4.7, 0.1, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xeed7a8, roughness: 0.6 })
    );
    top.position.y = 1.05;
    counter.add(top);
    counter.position.set(0, 0, -4);
    this.scene.add(counter);

    // Register / bell
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd56e, roughness: 0.4, metalness: 0.6 })
    );
    bell.position.set(0, 1.25, -4.5);
    this.scene.add(bell);

    // Shelves with colored packages
    const colors = [0xd63a2c, 0x4a8fd1, 0x6fbf5a, 0xffd56e, 0xc44a9a, 0x9a4ac4];
    for (let shelf = 0; shelf < 2; shelf++) {
      const y = 2 + shelf * 1.4;
      // shelf plank
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.1, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.85 })
      );
      plank.position.set(0, y, -7.4);
      this.scene.add(plank);
      // items on shelf
      for (let i = 0; i < 6; i++) {
        const c = colors[(i + shelf) % colors.length];
        const item = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.7, 0.4),
          new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })
        );
        item.position.set(-3 + i * 1.2, y + 0.4, -7.4);
        item.castShadow = true;
        this.scene.add(item);
      }
    }

    // Item icons floating above counter (representing what you can buy)
    const labels = ['Tools', 'Seeds', 'Furniture', 'Clothes'];
    for (let i = 0; i < labels.length; i++) {
      const x = -2 + i * 1.4;
      const tex = this._labelTexture(labels[i]);
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 0.5),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      card.position.set(x, 2.5, -3.5);
      card.rotation.x = -Math.PI / 8;
      this.scene.add(card);
    }
  }

  _buildMuseumInterior() {
    // Pedestals with fossil exhibits — each fossil is a distinctly shaped mesh
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0xb89876, roughness: 0.7 });
    const fossils = [
      { color: 0xe8d5a0, geom: () => new THREE.TorusGeometry(0.32, 0.13, 8, 18), name: 'ammonite' },
      { color: 0xf6e0a8, geom: () => new THREE.BoxGeometry(0.55, 0.22, 0.32), name: 'trilobite' },
      { color: 0xdac6a0, geom: () => new THREE.ConeGeometry(0.22, 0.6, 6), name: 'dino-bone' },
      { color: 0x9ec46a, geom: () => null, name: 'plant' }, // built specially below
    ];
    for (let i = 0; i < fossils.length; i++) {
      const x = -3 + i * 2;
      const pedestal = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.0, 0.9),
        pedestalMat
      );
      pedestal.position.set(x, 0.5, -5);
      pedestal.castShadow = true; pedestal.receiveShadow = true;
      this.scene.add(pedestal);

      let fossil;
      if (fossils[i].geom) {
        // Scale up so fossils are clearly the focus
        const f = new THREE.Mesh(fossils[i].geom(), new THREE.MeshStandardMaterial({ color: fossils[i].color, roughness: 0.7 }));
        f.scale.setScalar(1.4);
        fossil = f;
      } else {
        fossil = new THREE.Group();
        for (let j = 0; j < 4; j++) {
          const leaf = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.3),
            new THREE.MeshStandardMaterial({ color: fossils[i].color, roughness: 0.8, side: THREE.DoubleSide })
          );
          leaf.position.set(0, 0, 0);
          leaf.rotation.z = (j - 1.5) * 0.35;
          leaf.rotation.y = j * 0.4;
          fossil.add(leaf);
        }
      }
      fossil.position.set(x, 1.55, -5);
      fossil.castShadow = true;
      if (fossils[i].name === 'plant') fossil.position.y = 1.35;
      this.scene.add(fossil);
    }
    // Backdrop sign
    const tex = this._labelTexture('Museum');
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    sign.position.set(0, 3.5, -7.6);
    this.scene.add(sign);
  }

  _labelTexture(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255, 248, 231, 0.9)';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 92);
    ctx.fillStyle = '#4a3a25';
    ctx.font = 'bold 36px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 48);
    return new THREE.CanvasTexture(c);
  }

  _applyFade() {
    // Use a fullscreen overlay div
    let overlay = document.getElementById('fade-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fade-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:#000;pointer-events:none;z-index:50;opacity:0;transition:opacity 0.05s linear';
      document.body.appendChild(overlay);
    }
    overlay.style.opacity = this._fadeT;
  }
}
