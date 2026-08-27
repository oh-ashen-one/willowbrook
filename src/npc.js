// Villagers — friendly creatures with personalities, routines, and dialogue.
// Each villager has a name, species, color palette, schedule, and small talk lines.

import * as THREE from 'three';
import { gradientMap } from './toon.js';

const VILLAGER_DEFS = [
  {
    name: 'Maple', species: 'bear',
    palette: { fur: 0xc89060, snout: 0xeac098, shirt: 0xe65a5a },
    home: 'oak', schedule: { wake: 6, nap: 13, sleep: 22 },
    greeting: ['Hey neighbor!', 'What a lovely morning, huh?', 'Catch any fish lately?', 'I baked cookies — want one?'],
    hobby: 'baking',
  },
  {
    name: 'Finn', species: 'frog',
    palette: { fur: 0x9bd15e, snout: 0xc7e89a, shirt: 0xffd54f },
    home: 'lily',
    schedule: { wake: 7, nap: 14, sleep: 23 },
    greeting: ['Ribbit! Hi hi!', 'The river is so nice today.', 'Did you bring me a bug?', 'Plop plop!'],
    hobby: 'fishing',
  },
  {
    name: 'Pebble', species: 'cub',
    palette: { fur: 0xa88860, snout: 0xd4b78a, shirt: 0x6b9bd1 },
    home: 'cedar',
    schedule: { wake: 6, nap: 12, sleep: 21 },
    greeting: ['Welcome home!', 'I was just thinking about you.', 'Wanna dig for fossils?', 'It feels so good outside.'],
    hobby: 'fossils',
  },
  {
    name: 'Coral', species: 'octopus',
    palette: { fur: 0xff8aa8, snout: 0xffd0e0, shirt: 0x7cc6e0 },
    home: 'shell',
    schedule: { wake: 8, nap: 15, sleep: 24 },
    greeting: ['Hi sweetie!', 'The stars were pretty last night.', 'I made a sand castle today.', 'Come swim with me!'],
    hobby: 'sea',
  },
  {
    name: 'Hazel', species: 'squirrel',
    palette: { fur: 0xc06a3a, snout: 0xeab084, shirt: 0x9a6bd1 },
    home: 'acorn',
    schedule: { wake: 5, nap: 13, sleep: 22 },
    greeting: ['Hello hello!', 'I hid an acorn somewhere fun.', 'Tree climbing weather!', 'Do you have any nuts?'],
    hobby: 'climbing',
  },
];

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

export class Villagers {
  constructor(scene, world, buildings) {
    this.scene = scene;
    this.world = world;
    this.buildings = buildings;
    this.list = [];
    this._rng = rng(987654);
  }

  spawn() {
    for (let i = 0; i < VILLAGER_DEFS.length; i++) {
      const def = VILLAGER_DEFS[i];
      const home = this.buildings.get(def.home) || this.buildings.list[0];
      // Place villager closer to their home so they're easily seen near the plaza
      const pos = home.position.clone();
      pos.x += (this._rng() - 0.5) * 5;
      pos.z += (this._rng() - 0.5) * 5;
      pos.y = this.world.heightAt(pos.x, pos.z);

      const villager = this._buildVillager(def);
      villager.position.copy(pos);
      villager.userData.def = def;
      villager.userData.home = home;
      villager.userData.target = pos.clone();
      villager.userData.nextDecision = 1 + this._rng() * 3;
      // Each villager has a wide wander radius so they visit the plaza
      villager.userData.wanderRadius = 18 + this._rng() * 8;
      villager.userData.preferredDest = i % 2 === 0 ? 'plaza' : 'home';
      villager.userData.plazaTarget = new THREE.Vector3((this._rng() - 0.5) * 6, 0, (this._rng() - 0.5) * 6);
      villager.userData.facing = this._rng() * Math.PI * 2;
      villager.userData.bob = this._rng() * Math.PI * 2;
      villager.userData.friendship = 0;
      this.scene.add(villager);
      this.list.push(villager);
    }
  }

  _buildVillager(def) {
    const g = new THREE.Group();
    g.name = `villager-${def.name}`;
    g.userData.isVillager = true;

    const fur = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: def.palette.fur });
    const snout = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: def.palette.snout });
    const shirt = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: def.palette.shirt });
    const dark = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: this._darken(def.palette.fur, 0.7) });
    const light = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: this._lighten(def.palette.fur, 1.2) });

    if (def.species === 'bear' || def.species === 'cub') {
      this._buildBear(g, fur, snout, shirt, dark, light);
    } else if (def.species === 'frog') {
      this._buildFrog(g, fur, snout, shirt, dark, light);
    } else if (def.species === 'octopus') {
      this._buildOctopus(g, fur, snout, shirt, dark, light);
    } else if (def.species === 'squirrel') {
      this._buildSquirrel(g, fur, snout, shirt, dark, light);
    } else {
      this._buildBear(g, fur, snout, shirt, dark, light);
    }

    g.userData.dialogueState = 0;
    return g;
  }

  _darken(hex, amount) {
    const r = Math.round(((hex >> 16) & 0xff) * amount);
    const g = Math.round(((hex >> 8) & 0xff) * amount);
    const b = Math.round((hex & 0xff) * amount);
    return (r << 16) | (g << 8) | b;
  }
  _lighten(hex, amount) {
    const r = Math.round(((hex >> 16) & 0xff) * amount + (1 - amount) * 255);
    const g = Math.round(((hex >> 8) & 0xff) * amount + (1 - amount) * 255);
    const b = Math.round((hex & 0xff) * amount + (1 - amount) * 255);
    return (r << 16) | (g << 8) | b;
  }

  _buildBear(g, fur, snout, shirt, dark, light) {
    // Body — stocky egg shape
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.50, 16, 12), fur);
    body.position.y = 0.65; body.scale.set(1, 1.15, 0.95);
    body.castShadow = true;
    g.add(body);
    // Belly patch
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), light);
    belly.position.set(0, 0.55, 0.18);
    belly.scale.set(1, 1.1, 0.5);
    g.add(belly);
    // Head — round
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), fur);
    head.position.y = 1.45;
    head.castShadow = true;
    g.add(head);
    // Cheek puffs
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fur);
      cheek.position.set(side * 0.32, 1.35, 0.16);
      g.add(cheek);
    }
    // Snout — lighter muzzle
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), snout);
    muzzle.position.set(0, 1.36, 0.34);
    muzzle.scale.set(1.1, 0.85, 0.8);
    g.add(muzzle);
    // Nose
    const noseMat = new THREE.MeshBasicMaterial({ color: 0x2a1810 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), noseMat);
    nose.position.set(0, 1.40, 0.50);
    g.add(nose);
    // Eyes
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xffffff }));
      eyeWhite.position.set(side * 0.13, 1.50, 0.36);
      eyeWhite.scale.set(0.7, 1, 0.5);
      g.add(eyeWhite);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), noseMat);
      pupil.position.set(side * 0.135, 1.50, 0.39);
      g.add(pupil);
    }
    // Round ears on top
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), fur);
      ear.position.set(side * 0.24, 1.80, 0);
      ear.scale.set(0.9, 1, 0.5);
      g.add(ear);
      const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), snout);
      innerEar.position.set(side * 0.24, 1.80, 0.05);
      innerEar.scale.set(0.8, 0.9, 0.3);
      g.add(innerEar);
    }
    // Stocky legs (cylinder + paw)
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.25, 4, 6), dark);
      leg.position.set(side * 0.22, 0.18, 0);
      leg.castShadow = true;
      g.add(leg);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), dark);
      paw.position.set(side * 0.22, 0.07, 0.05);
      paw.scale.set(1, 0.6, 1.2);
      g.add(paw);
    }
    // Stubby arms
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.30, 4, 6), fur);
      arm.position.set(side * 0.42, 0.95, 0);
      arm.castShadow = true;
      g.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), snout);
      hand.position.set(side * 0.42, 0.77, 0.04);
      g.add(hand);
    }
    // Shirt collar / accent
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.55, 0.12, 12), shirt);
    collar.position.y = 0.95;
    g.add(collar);
    // Tiny tail (bear stub)
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), fur);
    tail.position.set(0, 0.55, -0.50);
    g.add(tail);
  }

  _buildFrog(g, fur, snout, shirt, dark, light) {
    // Squat body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.50, 14, 12), fur);
    body.position.y = 0.50; body.scale.set(1.1, 0.85, 1.1);
    body.castShadow = true;
    g.add(body);
    // Belly — bright
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), light);
    belly.position.set(0, 0.45, 0.10);
    belly.scale.set(1.05, 0.7, 0.4);
    g.add(belly);
    // Spots on back (frog pattern)
    for (let i = 0; i < 4; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), dark);
      const a = (i / 4) * Math.PI * 2;
      spot.position.set(Math.cos(a) * 0.32, 0.65, Math.sin(a) * 0.32);
      spot.scale.set(1.2, 0.4, 1.2);
      g.add(spot);
    }
    // Head — wide and flat
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), fur);
    head.position.y = 1.10;
    head.scale.set(1.2, 0.85, 1);
    head.castShadow = true;
    g.add(head);
    // Eye bumps (frog style — tall)
    for (const side of [-1, 1]) {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), fur);
      bump.position.set(side * 0.20, 1.45, 0);
      bump.scale.set(0.85, 1.1, 0.85);
      g.add(bump);
      // Eye white inside bump
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xffffff }));
      white.position.set(side * 0.22, 1.45, 0.08);
      white.scale.set(0.8, 1.0, 0.5);
      g.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a120a }));
      pupil.position.set(side * 0.225, 1.45, 0.14);
      g.add(pupil);
    }
    // Wide mouth (smiling curve hint)
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 16, Math.PI), dark);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, 1.00, 0.42);
    g.add(mouth);
    // Tiny stubby arms
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), fur);
      arm.position.set(side * 0.42, 0.50, 0.12);
      arm.scale.set(0.7, 1.4, 0.7);
      g.add(arm);
    }
    // Long back legs (frog jump pose)
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.35, 4, 6), dark);
      leg.position.set(side * 0.32, 0.30, 0);
      leg.rotation.z = side * 0.4;
      leg.castShadow = true;
      g.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), dark);
      foot.position.set(side * 0.50, 0.15, 0.10);
      foot.scale.set(0.7, 0.5, 1.4);
      g.add(foot);
    }
    // Cheek puffs
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), light);
      cheek.position.set(side * 0.40, 1.02, 0.30);
      g.add(cheek);
    }
  }

  _buildOctopus(g, fur, snout, shirt, dark, light) {
    // Big round head (no separate body for octopus)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), fur);
    head.position.y = 1.1;
    head.scale.set(1, 0.95, 1);
    head.castShadow = true;
    g.add(head);
    // Head dome highlight
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.50, 14, 12), light);
    dome.position.set(0, 1.25, 0.10);
    dome.scale.set(0.9, 0.5, 0.5);
    g.add(dome);
    // Eight tentacles — proper curly tentacles
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      // Each tentacle: two segments so it curls
      const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.30, 4, 6), fur);
      seg1.position.set(Math.cos(a) * 0.30, 0.70, Math.sin(a) * 0.30);
      seg1.rotation.z = Math.cos(a) * 0.5;
      seg1.rotation.x = Math.sin(a) * 0.5;
      seg1.castShadow = true;
      g.add(seg1);
      const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.25, 4, 6), dark);
      const tailX = Math.cos(a) * 0.55;
      const tailZ = Math.sin(a) * 0.55;
      seg2.position.set(tailX, 0.45, tailZ);
      seg2.rotation.z = Math.cos(a) * 0.8 + (a < Math.PI ? 0.3 : -0.3);
      seg2.rotation.x = Math.sin(a) * 0.8;
      g.add(seg2);
      // Suction cup dot at the tip
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), snout);
      tip.position.set(Math.cos(a) * 0.70, 0.32, Math.sin(a) * 0.70);
      g.add(tip);
    }
    // Big eyes on the head
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xffffff }));
      white.position.set(side * 0.20, 1.20, 0.40);
      white.scale.set(0.85, 1, 0.5);
      g.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a120a }));
      pupil.position.set(side * 0.20, 1.20, 0.48);
      g.add(pupil);
    }
    // Cute smiling mouth
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.025, 6, 12, Math.PI), dark);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, 1.00, 0.50);
    g.add(mouth);
    // Hat (small bow on top)
    const bowMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: shirt });
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 14), bowMat);
    bow.position.set(0, 1.62, 0.0);
    bow.rotation.x = Math.PI / 2;
    g.add(bow);
  }

  _buildSquirrel(g, fur, snout, shirt, dark, light) {
    // Body — slim pear
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), fur);
    body.position.y = 0.62; body.scale.set(0.95, 1.1, 1);
    body.castShadow = true;
    g.add(body);
    // Belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), light);
    belly.position.set(0, 0.55, 0.18);
    belly.scale.set(0.9, 1, 0.4);
    g.add(belly);
    // Head — small pointed snout
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.30, 14, 12), fur);
    head.position.y = 1.30;
    head.scale.set(0.95, 1, 1);
    head.castShadow = true;
    g.add(head);
    // Pointy snout
    const sn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 8), snout);
    sn.rotation.x = Math.PI / 2;
    sn.position.set(0, 1.22, 0.32);
    g.add(sn);
    // Nose tip
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2a1810 }));
    nose.position.set(0, 1.22, 0.45);
    g.add(nose);
    // Big round eyes
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xffffff }));
      white.position.set(side * 0.10, 1.35, 0.22);
      white.scale.set(0.85, 1, 0.5);
      g.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a120a }));
      pupil.position.set(side * 0.10, 1.35, 0.265);
      g.add(pupil);
      // Tiny eye highlight
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(side * 0.085, 1.37, 0.285);
      g.add(shine);
    }
    // Pointy ears at top
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 6), fur);
      ear.position.set(side * 0.16, 1.60, 0);
      g.add(ear);
      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.10, 6), snout);
      innerEar.position.set(side * 0.16, 1.55, 0.05);
      g.add(innerEar);
    }
    // BIG bushy tail — the squirrel's signature
    const tail = new THREE.Group();
    const tailBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), fur);
    tailBody.position.set(0, 0.95, -0.40);
    tailBody.scale.set(0.75, 1.5, 0.55);
    tailBody.castShadow = true;
    tail.add(tailBody);
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), light);
    tailTip.position.set(0, 1.30, -0.40);
    tailTip.scale.set(0.85, 1.2, 0.5);
    tail.add(tailTip);
    tail.position.y = 0;
    g.add(tail);
    // Tiny arms holding acorn (just an arm shape, simplified)
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.32, 4, 6), fur);
      arm.position.set(side * 0.32, 0.75, 0.05);
      arm.rotation.z = side * 0.3;
      arm.castShadow = true;
      g.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), snout);
      hand.position.set(side * 0.42, 0.62, 0.15);
      g.add(hand);
    }
    // Legs
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.20, 4, 6), dark);
      leg.position.set(side * 0.16, 0.18, 0);
      leg.castShadow = true;
      g.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), dark);
      foot.position.set(side * 0.16, 0.07, 0.05);
      foot.scale.set(1, 0.6, 1.3);
      g.add(foot);
    }
    // Chest tuft (lighter patch on chest)
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), light);
    chest.position.set(0, 0.75, 0.25);
    chest.scale.set(0.9, 1.1, 0.3);
    g.add(chest);
  }

  update(dt, time) {
    for (const v of this.list) {
      this._wander(v, dt, time);
      this._animate(v, dt, time);
    }
  }

  _wander(v, dt, time) {
    const def = v.userData.def;
    // Sleep at night
    const isSleeping = time.hour >= def.schedule.sleep || time.hour < def.schedule.wake;
    if (isSleeping) {
      v.userData.walking = false;
      // Idle breathing
      return;
    }
    v.userData.nextDecision -= dt;
    const toTarget = v.userData.target.clone().sub(v.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist < 0.3 || v.userData.nextDecision <= 0) {
      // Half the time head to the plaza so villagers visibly gather
      if (this._rng() < 0.45) {
        v.userData.target.copy(v.userData.plazaTarget);
      } else {
        const home = v.userData.home;
        const angle = this._rng() * Math.PI * 2;
        const radius = this._rng() * v.userData.wanderRadius;
        const t = home.position.clone();
        t.x += Math.cos(angle) * radius;
        t.z += Math.sin(angle) * radius;
        t.x = Math.max(-this.world.size * 0.42, Math.min(this.world.size * 0.42, t.x));
        t.z = Math.max(-this.world.size * 0.42, Math.min(this.world.size * 0.42, t.z));
        if (t.z < -22 && t.z > -54 && Math.abs(t.x) < 30) {
          t.z = t.z < -38 ? -22 : -54;
        }
        v.userData.target.copy(t);
      }
      v.userData.nextDecision = 4 + this._rng() * 6;
    }

    // Move toward target at villager pace
    const speed = 1.6;
    const dir = toTarget.normalize();
    v.position.x += dir.x * speed * dt;
    v.position.z += dir.z * speed * dt;
    v.userData.walking = true;
    // Face direction
    const desired = Math.atan2(dir.x, dir.z);
    const diff = ((desired - v.userData.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    v.userData.facing += diff * Math.min(1, dt * 6);
    v.rotation.y = v.userData.facing;
    v.position.y = this.world.heightAt(v.position.x, v.position.z);
  }

  _animate(v, dt, time) {
    v.userData.bob += dt * (v.userData.walking ? 7 : 1.2);
    const t = time.t;
    if (v.userData.walking) {
      v.position.y += Math.abs(Math.sin(v.userData.bob * 2)) * 0.04;
    }
    // Subtle idle look-around
    v.rotation.y = v.userData.facing + Math.sin(t * 0.4 + v.userData.bob) * 0.06;
  }

  // Find nearest villager within interaction range
  nearest(pos, range = 2.4) {
    let best = null, bestD = range;
    for (const v of this.list) {
      const d = v.position.distanceTo(pos);
      if (d < bestD) { best = v; bestD = d; }
    }
    return best;
  }

  greet(villager) {
    const def = villager.userData.def;
    const lines = def.greeting;
    return lines[Math.floor(Math.random() * lines.length)];
  }
}
