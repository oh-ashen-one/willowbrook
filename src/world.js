// World — terrain, trees, flowers, water, sky.
// One module, one job: make the world feel alive and walkable.

import * as THREE from 'three';

const COLORS = {
  grassA: 0x6fbf5a,
  grassB: 0x8fd17a,
  grassDark: 0x4f9c45,
  dirt: 0x9a7a4d,
  water: 0x7ec0e8,
  waterDeep: 0x4a96c2,
  trunk: 0x7a4a28,
  leaves: 0x4f9c45,
  leavesDark: 0x3d7e35,
  leavesSpring: 0xa6d97e,
  rock: 0x8a8276,
};

// Deterministic seeded RNG so the town is the same on every load.
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(20260826);
    this.size = 120;
    this.trees = [];
    this.flowers = [];
    this.rocks = [];
    this.heightAt = this._buildHeightField();
  }

  _buildHeightField() {
    // Soft rolling hills via simple summed sinusoids. Keep amplitude modest
    // so the world reads as a flat town with gentle undulation, not corrugated.
    const heights = new Map();
    const freqA = 0.018, ampA = 0.35;
    const freqB = 0.045, ampB = 0.12;
    const freqC = 0.11, ampC = 0.05;
    return (x, z) => {
      const key = `${Math.round(x*4)}_${Math.round(z*4)}`;
      if (heights.has(key)) return heights.get(key);
      const r = Math.sqrt(x * x + z * z);
      // Flatten near plaza so the center is walkable
      const flatten = Math.max(0, 1 - r / 14);
      const y = flatten * (
        Math.sin(x * freqA + 1.7) * ampA +
        Math.cos(z * freqB - 0.6) * ampB +
        Math.sin((x + z) * freqC) * ampC
      );
      heights.set(key, y);
      return y;
    };
  }

  populate() {
    this._buildGround();
    this._buildWater();
    this._buildCliffBorder();
    this._buildSkyDome();
    this._buildClouds();
    this._plantTrees();
    this._plantFlowers();
    this._placeRocks();
    this._addAmbientCreatures();
  }

  _buildClouds() {
    // Billboard cloud puffs — three overlapping circles per cloud.
    this.clouds = [];
    const tex = this._cloudTexture();
    for (let i = 0; i < 8; i++) {
      const cloud = new THREE.Group();
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
      const puffs = 3 + Math.floor(this.rng() * 3);
      for (let j = 0; j < puffs; j++) {
        const s = new THREE.Sprite(mat);
        const size = 12 + this.rng() * 8;
        s.scale.set(size, size * 0.6, 1);
        s.position.set((this.rng() - 0.5) * size * 0.7, (this.rng() - 0.5) * 2, (this.rng() - 0.5) * size * 0.4);
        cloud.add(s);
      }
      const angle = this.rng() * Math.PI * 2;
      const dist = 80 + this.rng() * 60;
      cloud.position.set(Math.cos(angle) * dist, 28 + this.rng() * 14, Math.sin(angle) * dist);
      cloud.userData = { driftSpeed: 0.3 + this.rng() * 0.3, basePos: cloud.position.clone() };
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  _cloudTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  _buildSkyDome() {
    // Big inverted sphere acts as sky so we never see black at the horizon.
    const skyGeom = new THREE.SphereGeometry(280, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x6cb8e0) },
        bottomColor: { value: new THREE.Color(0xcfe9f5) },
        offset: { value: 60 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(this.sky);
  }

  _buildGround() {
    const seg = 96;
    const geom = new THREE.PlaneGeometry(this.size, this.size, seg, seg);
    geom.rotateX(-Math.PI / 2);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.heightAt(x, z));
    }
    geom.computeVertexNormals();

    // Vertex colors: subtle blend between grass shades based on slope and noise.
    const colors = new Float32Array(pos.count * 3);
    const cA = new THREE.Color(COLORS.grassA);
    const cB = new THREE.Color(COLORS.grassB);
    const cD = new THREE.Color(COLORS.grassDark);
    const n = pos.count;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.sqrt(x*x + z*z);
      const t = 0.5 + 0.5 * Math.sin(x * 0.27 + z * 0.31 + this.rng() * 4);
      const slope = Math.abs(this.heightAt(x + 0.5, z) - this.heightAt(x - 0.5, z));
      const base = t < 0.45 ? cA.clone().lerp(cB, t * 2) : cB.clone().lerp(cD, (t - 0.45) * 1.6);
      // Subtle darkening on slopes
      base.multiplyScalar(1 - Math.min(slope, 0.3) * 0.4);
      // Slight darken toward edges (cliff)
      const edge = Math.max(0, (r - this.size * 0.42) / 8);
      base.multiplyScalar(1 - edge * 0.6);
      colors[i * 3 + 0] = base.r;
      colors[i * 3 + 1] = base.g;
      colors[i * 3 + 2] = base.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: false,
    });
    const ground = new THREE.Mesh(geom, mat);
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.ground = ground;
    this.scene.add(ground);
  }

  _buildWater() {
    // River/pond on the south edge.
    const waterGeom = new THREE.PlaneGeometry(60, 22, 32, 16);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: COLORS.water,
      roughness: 0.25,
      metalness: 0.0,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.set(0, -0.4, -38);
    water.receiveShadow = true;
    water.userData.basePositions = waterGeom.attributes.position.array.slice();
    this.water = water;
    this.scene.add(water);

    // Shoreline rocks
    for (let i = 0; i < 18; i++) {
      const r = 0.18 + this.rng() * 0.45;
      const g = new THREE.DodecahedronGeometry(r, 0);
      const m = new THREE.MeshStandardMaterial({ color: COLORS.rock, roughness: 0.9, flatShading: true });
      const rock = new THREE.Mesh(g, m);
      const x = (this.rng() - 0.5) * 50;
      const z = -28 + (this.rng() - 0.5) * 16;
      rock.position.set(x, this.heightAt(x, z) - 0.1, z);
      rock.rotation.set(this.rng()*Math.PI, this.rng()*Math.PI, this.rng()*Math.PI);
      rock.scale.set(1, 0.6 + this.rng() * 0.6, 1);
      rock.castShadow = true; rock.receiveShadow = true;
      this.scene.add(rock);
      this.rocks.push(rock);
    }
  }

  _buildCliffBorder() {
    // Soft ring of darker grass that fades into the sky color — no hard black edge.
    const ringGeom = new THREE.RingGeometry(this.size * 0.46, this.size * 0.55, 96, 1);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5a9a6a, transparent: true, opacity: 0.55, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = 0.06;
    this.scene.add(ring);
    // Sky-fringe ring — color driven by current sky so it blends with any time of day.
    const fringeGeom = new THREE.RingGeometry(this.size * 0.48, this.size * 0.62, 96, 1);
    fringeGeom.rotateX(-Math.PI / 2);
    const fringeMat = new THREE.MeshBasicMaterial({
      color: 0x9bd1e6, transparent: true, opacity: 0.35, depthWrite: false,
    });
    const fringe = new THREE.Mesh(fringeGeom, fringeMat);
    fringe.position.y = 0.07;
    this.scene.add(fringe);
    this.fringe = fringe;
  }

  _plantTrees() {
    // Available tree types with seasonal palettes.
    const treeTypes = [
      { trunkColor: 0x6a3a20, leavesColor: 0x4f9c45, leavesAlt: 0x3d7e35, height: 2.6, canopyScale: 1.3, type: 'oak' },
      { trunkColor: 0x8a5a30, leavesColor: 0xa6d97e, leavesAlt: 0xb9e88f, height: 2.0, canopyScale: 1.0, type: 'spring' },
      { trunkColor: 0x5a3a20, leavesColor: 0x3d7e35, leavesAlt: 0x4f9c45, height: 3.2, canopyScale: 1.5, type: 'cedar' },
      { trunkColor: 0x7a4a28, leavesColor: 0xd68a4c, leavesAlt: 0xc4743c, height: 2.4, canopyScale: 1.2, type: 'autumn' },
    ];

    const placements = [];
    let attempts = 0;
    while (placements.length < 80 && attempts < 2000) {
      attempts++;
      const x = (this.rng() - 0.5) * (this.size - 8);
      const z = (this.rng() - 0.5) * (this.size - 14);
      // Avoid the river corridor and town center
      if (z < -22 && z > -54 && Math.abs(x) < 30) continue;
      if (Math.sqrt(x*x + z*z) < 12) continue; // keep plaza clear
      // Min spacing
      let ok = true;
      for (const p of placements) {
        if ((p.x - x) ** 2 + (p.z - z) ** 2 < 3.2) { ok = false; break; }
      }
      if (!ok) continue;
      placements.push({ x, z });
    }

    for (const p of placements) {
      const type = treeTypes[Math.floor(this.rng() * treeTypes.length)];
      const tree = this._makeTree(type);
      tree.position.set(p.x, this.heightAt(p.x, p.z), p.z);
      tree.rotation.y = this.rng() * Math.PI * 2;
      this.scene.add(tree);
      this.trees.push(tree);
    }
  }

  _makeTree(type) {
    const group = new THREE.Group();

    // Trunk — shorter and chunkier so the canopy reads as a wide broccoli cloud
    const trunkH = type.type === 'cedar' ? 2.0 : 1.4;
    const trunkRTop = 0.22, trunkRBot = 0.34;
    const trunkG = new THREE.CylinderGeometry(trunkRTop, trunkRBot, trunkH, 7);
    const trunkM = new THREE.MeshStandardMaterial({ color: type.trunkColor, roughness: 0.95, flatShading: true });
    const trunk = new THREE.Mesh(trunkG, trunkM);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true; trunk.receiveShadow = true;
    group.add(trunk);

    // Root blobs
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + this.rng() * 0.6;
      const root = new THREE.Mesh(
        new THREE.SphereGeometry(0.32 + this.rng() * 0.08, 8, 6),
        trunkM
      );
      root.position.set(Math.cos(a) * 0.26, 0.2, Math.sin(a) * 0.26);
      root.scale.y = 0.65;
      root.castShadow = true; root.receiveShadow = true;
      group.add(root);
    }

    // Canopy — wider, lower, with side lobes that spread laterally
    const canopyMat = new THREE.MeshStandardMaterial({ color: type.leavesColor, roughness: 0.95, flatShading: false });
    const canopyMatAlt = new THREE.MeshStandardMaterial({ color: type.leavesAlt, roughness: 0.95, flatShading: false });
    const canopyMatDeep = new THREE.MeshStandardMaterial({ color: type.leavesDark ?? type.leavesColor, roughness: 0.95, flatShading: false });
    const baseR = type.canopyScale * 1.25; // wider than before

    // Main stacked body
    const layers = type.type === 'cedar' ? 4 : 2;
    for (let i = 0; i < layers; i++) {
      const r = baseR * (1.0 - i * 0.16);
      const g = new THREE.SphereGeometry(r, 12, 10);
      const mat = i === 0 ? canopyMatDeep : (i % 2 === 1 ? canopyMat : canopyMatAlt);
      const m = new THREE.Mesh(g, mat);
      m.position.set(
        (this.rng() - 0.5) * 0.3,
        trunkH + i * 0.45 + 0.1,
        (this.rng() - 0.5) * 0.3,
      );
      m.scale.set(1 + this.rng() * 0.15, 0.7 + this.rng() * 0.2, 1 + this.rng() * 0.15);
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }
    // Side lobes — these spread the canopy outward
    const lobeCount = 5;
    for (let i = 0; i < lobeCount; i++) {
      const a = (i / lobeCount) * Math.PI * 2 + this.rng() * 0.4;
      const r = baseR * (1.0 + this.rng() * 0.15);
      const g = new THREE.SphereGeometry(r * 0.6, 12, 10);
      const m = new THREE.Mesh(g, i % 2 === 0 ? canopyMat : canopyMatAlt);
      m.position.set(
        Math.cos(a) * (baseR * 0.65),
        trunkH + 0.35 + this.rng() * 0.25,
        Math.sin(a) * (baseR * 0.65),
      );
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }
    // Crown blob at the very top
    for (let i = 0; i < 2; i++) {
      const g = new THREE.SphereGeometry(baseR * 0.45, 10, 8);
      const m = new THREE.Mesh(g, i === 0 ? canopyMat : canopyMatAlt);
      m.position.set(
        (this.rng() - 0.5) * 0.4,
        trunkH + layers * 0.45 + 0.25 + i * 0.2,
        (this.rng() - 0.5) * 0.4,
      );
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }

    // Fruit chance — apples/oranges
    if (this.rng() < 0.5) {
      const fruitColor = type.type === 'autumn' ? 0xd63a2c : 0xffd56e;
      const fruitMat = new THREE.MeshStandardMaterial({ color: fruitColor, roughness: 0.6 });
      for (let i = 0; i < 6; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), fruitMat);
        const a = this.rng() * Math.PI * 2;
        const r = (0.9 + this.rng() * 0.4) * type.canopyScale;
        f.position.set(
          Math.cos(a) * r,
          trunkH + 0.5 + (this.rng() - 0.5) * 0.8,
          Math.sin(a) * r,
        );
        group.add(f);
      }
    }

    group.userData.isTree = true;
    group.userData.canShake = true;
    return group;
  }

  _plantFlowers() {
    const flowerColors = [0xff5e8a, 0xffd54f, 0xb46cff, 0xffffff, 0xff8a3a];
    const patches = 40;
    for (let i = 0; i < patches; i++) {
      const x = (this.rng() - 0.5) * (this.size - 10);
      const z = (this.rng() - 0.5) * (this.size - 16);
      if (z < -22 && z > -54 && Math.abs(x) < 30) continue;
      const count = 3 + Math.floor(this.rng() * 5);
      const c = flowerColors[Math.floor(this.rng() * flowerColors.length)];
      for (let j = 0; j < count; j++) {
        const f = this._makeFlower(c);
        f.position.set(x + (this.rng() - 0.5) * 1.6, this.heightAt(x, z), z + (this.rng() - 0.5) * 1.6);
        this.scene.add(f);
        this.flowers.push(f);
      }
    }
  }

  _makeFlower(colorHex) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: 0x4f9c45 })
    );
    stem.position.y = 0.15;
    g.add(stem);
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 6),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 })
    );
    petal.position.y = 0.32;
    petal.scale.y = 0.5;
    g.add(petal);
    g.userData.isFlower = true;
    return g;
  }

  _placeRocks() {
    for (let i = 0; i < 24; i++) {
      const r = 0.25 + this.rng() * 0.7;
      const g = new THREE.DodecahedronGeometry(r, 0);
      const m = new THREE.MeshStandardMaterial({ color: COLORS.rock, roughness: 0.95, flatShading: true });
      const rock = new THREE.Mesh(g, m);
      const x = (this.rng() - 0.5) * (this.size - 12);
      const z = (this.rng() - 0.5) * (this.size - 18);
      if (z < -22 && z > -54 && Math.abs(x) < 30) continue;
      rock.position.set(x, this.heightAt(x, z) + r * 0.3, z);
      rock.rotation.set(this.rng()*Math.PI, this.rng()*Math.PI, this.rng()*Math.PI);
      rock.scale.set(1, 0.5 + this.rng() * 0.7, 1);
      rock.castShadow = true; rock.receiveShadow = true;
      this.scene.add(rock);
      this.rocks.push(rock);
    }
  }

  _addAmbientCreatures() {
    // Tiny butterflies as billboard sprites — pure vibe, no logic.
    const butterflyColors = [0xff5e8a, 0xffd54f, 0xb46cff, 0x9bd1e6];
    this.butterflies = [];
    for (let i = 0; i < 14; i++) {
      const c = butterflyColors[i % butterflyColors.length];
      const tex = this._butterflyTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const s = new THREE.Sprite(mat);
      const x = (this.rng() - 0.5) * (this.size - 16);
      const z = (this.rng() - 0.5) * (this.size - 20);
      s.position.set(x, 1.4 + this.rng() * 0.5, z);
      s.scale.set(0.4, 0.4, 0.4);
      s.userData = {
        basePos: s.position.clone(),
        phase: this.rng() * Math.PI * 2,
        speed: 0.6 + this.rng() * 0.4,
      };
      this.scene.add(s);
      this.butterflies.push(s);
    }
  }

  _butterflyTexture(color) {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    const hex = '#' + color.toString(16).padStart(6, '0');
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 14);
    grad.addColorStop(0, hex);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    // wings
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.ellipse(8, 14, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(24, 14, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  update(dt, time) {
    // Water subtle ripple
    if (this.water) {
      const pos = this.water.geometry.attributes.position;
      const base = this.water.userData.basePositions;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        const y = Math.sin(time.t * 1.3 + x * 0.3) * 0.05 + Math.cos(time.t * 0.9 + z * 0.4) * 0.04;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      // water color tints with sky
      const tint = new THREE.Color(0x7ec0e8).lerp(new THREE.Color(0x4a78a8), 1 - Math.max(0.4, time.lightLevel));
      this.water.material.color.copy(tint);
    }

    // Butterflies dance
    if (this.butterflies) {
      for (const b of this.butterflies) {
        const p = b.userData;
        b.position.x = p.basePos.x + Math.sin(time.t * p.speed + p.phase) * 1.6;
        b.position.z = p.basePos.z + Math.cos(time.t * p.speed * 0.7 + p.phase) * 1.2;
        b.position.y = p.basePos.y + Math.sin(time.t * 1.6 + p.phase) * 0.3;
      }
    }

    // Clouds drift slowly across the sky
    if (this.clouds) {
      for (const c of this.clouds) {
        const p = c.userData;
        c.position.x = p.basePos.x + Math.sin(time.t * 0.05 + p.basePos.z * 0.01) * 4;
        c.position.z = p.basePos.z + time.t * p.driftSpeed;
        // wrap around so they keep drifting
        if (c.position.z > 150) c.position.z -= 300;
        if (c.position.z < -150) c.position.z += 300;
      }
    }

    // Trees sway gently with wind (more at midday)
    const sway = 0.02 * (0.5 + time.lightLevel * 0.5);
    for (const t of this.trees) {
      t.rotation.z = Math.sin(time.t * 0.8 + t.position.x) * sway;
      t.rotation.x = Math.cos(time.t * 0.6 + t.position.z) * sway;
    }
  }

  applyLighting(scene, time) {
    if (!this.sun) {
      this.sun = new THREE.DirectionalLight(0xfff2c8, 1.1);
      this.sun.position.set(20, 30, 12);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      this.sun.shadow.camera.left = -50;
      this.sun.shadow.camera.right = 50;
      this.sun.shadow.camera.top = 50;
      this.sun.shadow.camera.bottom = -50;
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 100;
      this.sun.shadow.bias = -0.0005;
      scene.add(this.sun);

      this.ambient = new THREE.HemisphereLight(0xbfe2ff, 0x4f9c45, 0.55);
      scene.add(this.ambient);

      this.fill = new THREE.DirectionalLight(0xc6e5ff, 0.25);
      this.fill.position.set(-15, 8, -10);
      scene.add(this.fill);

      // Starfield — only visible at night
      this._buildStarfield();
    }
    // Sun follows time of day
    const sunAngle = (time.hour / 24) * Math.PI * 2 - Math.PI / 2;
    this.sun.position.set(Math.cos(sunAngle) * 30, Math.sin(sunAngle) * 28 + 6, 12);
    this.sun.intensity = Math.max(0, Math.sin(sunAngle)) * 1.1 + 0.05;
    const warm = new THREE.Color(0xfff2c8);
    const dusk = new THREE.Color(0xff8a4a);
    const night = new THREE.Color(0x2a3a6a);
    const day = new THREE.Color(0x6cb8e0);
    const l = Math.max(0, Math.sin(sunAngle));

    // Time-of-day bands. Each band has a base sky color; dawn/dusk override.
    const isDawn = time.hour >= 4 && time.hour < 8;
    const isDusk = time.hour >= 16 && time.hour < 20;
    const isNight = time.hour < 5 || time.hour >= 20;
    let skyTop, skyBot;
    if (isNight) {
      skyTop = night.clone();
      skyBot = new THREE.Color(0x4a5a8a);
    } else if (isDawn) {
      // Blend peach (mid-dawn) toward day as hour approaches 8
      const t = (time.hour - 4) / 4;
      const peachTop = new THREE.Color(0xffc88a);
      const peachBot = new THREE.Color(0xffe4b8);
      skyTop = peachTop.clone().lerp(day, t * 0.4);
      skyBot = peachBot.clone().lerp(new THREE.Color(0xcfe9f5), t * 0.4);
    } else if (isDusk) {
      // Rose deepening into night as hour approaches 20
      const t = (time.hour - 16) / 4;
      const roseTop = new THREE.Color(0xd88aaa);
      const roseBot = new THREE.Color(0xffa0b8);
      skyTop = roseTop.clone().lerp(night, t * 0.6);
      skyBot = roseBot.clone().lerp(new THREE.Color(0x4a5a8a), t * 0.5);
    } else {
      // Day
      skyTop = day.clone();
      skyBot = new THREE.Color(0xcfe9f5);
    }
    if (this.sky) {
      this.sky.material.uniforms.topColor.value.copy(skyTop);
      this.sky.material.uniforms.bottomColor.value.copy(skyBot);
    }
    scene.background = skyTop;
    if (scene.fog) {
      const fogColor = skyBot.clone().lerp(skyTop, 0.4);
      scene.fog.color.copy(fogColor);
    }
    // Sky fringe matches the current sky bottom color so it always blends.
    if (this.fringe) {
      this.fringe.material.color.copy(skyBot).lerp(skyTop, 0.3);
    }
    this.ambient.intensity = 0.25 + l * 0.5;
    this.fill.intensity = 0.1 + (1 - l) * 0.15;
    // Stars fade in at night (use a smoother fade so they disappear by ~hour 5:30)
    if (this.stars) {
      let starOpacity;
      if (time.hour < 4) starOpacity = 1;
      else if (time.hour < 5.5) starOpacity = 1 - (time.hour - 4) / 1.5;
      else if (time.hour > 20.5) starOpacity = 1;
      else if (time.hour > 19) starOpacity = (time.hour - 19) / 1.5;
      else starOpacity = 0;
      this.stars.material.opacity = Math.max(0, Math.min(1, starOpacity)) * 0.95;
    }
    // Clouds tint with sky color subtly
    if (this.clouds) {
      for (const c of this.clouds) {
        for (const s of c.children) {
          const dayColor = new THREE.Color(0xffffff);
          const duskTint = isDawn ? new THREE.Color(0xffd0a0) : (isDusk ? new THREE.Color(0xffa0b8) : null);
          if (duskTint) {
            s.material.color.copy(dayColor).lerp(duskTint, 0.55);
          } else {
            s.material.color.copy(dayColor).lerp(new THREE.Color(0x6a78a8), 1 - l);
          }
        }
      }
    }
  }

  _buildStarfield() {
    const count = 1400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Hemisphere only, far from horizon
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(0.4 + v * 0.55); // upper hemisphere with denser zenith
      const r = 250;
      positions[i * 3 + 0] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.cos(phi) * r;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      // Subtle star-color jitter — most stars warm white, a few cooler blues
      const warm = Math.random() < 0.7;
      if (warm) {
        colors[i * 3 + 0] = 1.0;
        colors[i * 3 + 1] = 0.96 + Math.random() * 0.04;
        colors[i * 3 + 2] = 0.88 + Math.random() * 0.06;
      } else {
        colors[i * 3 + 0] = 0.78 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.86 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1.0;
      }
      // A few sparkle stars (large), most regular
      const sparkle = Math.random() < 0.012;
      sizes[i] = sparkle ? 2.2 + Math.random() * 0.6 : 0.9 + Math.random() * 0.8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      size: 1.0, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }
}

function dawnDusk(warm, dusk, angle) {
  // angle 0 = noon (sun overhead), ±π = midnight
  const a = Math.abs(angle);
  if (a > Math.PI * 0.35 && a < Math.PI * 0.55) return dusk; // golden hour
  return warm;
}
