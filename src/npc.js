// Villagers — friendly creatures with personalities, routines, and dialogue.
// Each villager has a name, species, color palette, schedule, and small talk lines.

import * as THREE from 'three';
import { gradientMap } from './toon.js';
import { HEX as PAL } from './core/palette.js';

const VILLAGER_DEFS = [
  {
    name: 'Maple', species: 'bear',
    palette: { fur: PAL.villagerFurBear, snout: PAL.villagerSnoutBear, shirt: PAL.villagerShirtBear },
    home: 'oak',
    birthday: 'Spring 17',
    favoriteGift: 'flower',
    schedule: { wake: 6, plazaHour: 10, eveningHour: 17, sleep: 22 },
    greeting: ['Hey neighbor!', 'What a lovely morning, huh?', 'Catch any fish lately?', 'I baked cookies — want one?'],
    anecdote: ['I tried a new muffin recipe this morning.', 'The plaza fountain was sparkling at dawn.'],
    insideJoke: ['Remember when you mistook my hat for a beehive?'],
    invite: ['Come by tonight — I\'m baking a pie.'],
    hobby: 'baking',
  },
  {
    name: 'Finn', species: 'frog',
    palette: { fur: PAL.villagerFurFrog, snout: PAL.villagerSnoutFrog, shirt: PAL.villagerShirtFrog },
    home: 'lily',
    birthday: 'Summer 4',
    favoriteGift: 'bug',
    schedule: { wake: 7, plazaHour: 9, eveningHour: 17, sleep: 23 },
    greeting: ['Ribbit! Hi hi!', 'The river is so nice today.', 'Did you bring me a bug?', 'Plop plop!'],
    anecdote: ['A dragonfly landed on my nose yesterday.'],
    insideJoke: ['You still owe me a beetle for the race.'],
    invite: ['Dinner at the lily pad — bring your appetite.'],
    hobby: 'fishing',
  },
  {
    name: 'Pebble', species: 'cub',
    palette: { fur: PAL.villagerFurCub, snout: PAL.villagerSnoutCub, shirt: PAL.villagerShirtCub },
    home: 'cedar',
    birthday: 'Spring 28',
    favoriteGift: 'fossil',
    schedule: { wake: 6, plazaHour: 11, eveningHour: 16, sleep: 21 },
    greeting: ['Welcome home!', 'I was just thinking about you.', 'Wanna dig for fossils?', 'It feels so good outside.'],
    anecdote: ['I found a trilobite-shaped pebble today.'],
    insideJoke: ['You still pretend you don\'t like mud.'],
    invite: ['Sleepover at mine — I have extra blankets.'],
    hobby: 'fossils',
  },
  {
    name: 'Coral', species: 'octopus',
    palette: { fur: PAL.villagerFurOctopus, snout: PAL.villagerSnoutOctopus, shirt: PAL.villagerShirtOctopus },
    home: 'shell',
    birthday: 'Autumn 9',
    favoriteGift: 'shell',
    schedule: { wake: 8, plazaHour: 13, eveningHour: 18, sleep: 24 },
    greeting: ['Hi sweetie!', 'The stars were pretty last night.', 'I made a sand castle today.', 'Come swim with me!'],
    anecdote: ['A conch shell hummed at low tide.'],
    insideJoke: ['You still owe me a rematch at chess.'],
    invite: ['Midnight swim at the shore — just us.'],
    hobby: 'sea',
  },
  {
    name: 'Hazel', species: 'squirrel',
    palette: { fur: PAL.villagerFurSquirrel, snout: PAL.villagerSnoutSquirrel, shirt: PAL.villagerShirtSquirrel },
    home: 'acorn',
    birthday: 'Autumn 23',
    favoriteGift: 'acorn',
    schedule: { wake: 5, plazaHour: 9, eveningHour: 17, sleep: 22 },
    greeting: ['Hello hello!', 'I hid an acorn somewhere fun.', 'Tree climbing weather!', 'Do you have any nuts?'],
    anecdote: ['I buried 30 acorns and already forgot where half are.'],
    insideJoke: ['You still pretend you don\'t see me in the trees.'],
    invite: ['Treehouse dinner — bring a kite.'],
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
      // Place villager at home so the schedule starts cleanly
      const pos = home.position.clone();
      pos.x += (this._rng() - 0.5) * 1.5;
      pos.z += (this._rng() - 0.5) * 1.5;
      pos.y = this.world.heightAt(pos.x, pos.z);

      // Build 4 waypoints for the daily schedule
      // - home: right at their house
      // - morning: just outside home (front yard)
      // - plaza: random spot near the fountain
      // - evening: a few meters from home, opposite the plaza
      const homeWP = home.position.clone();
      const morningWP = home.position.clone();
      morningWP.x += (this._rng() - 0.5) * 4;
      morningWP.z += (this._rng() - 0.5) * 4;
      const plazaWP = new THREE.Vector3((this._rng() - 0.5) * 6, 0, (this._rng() - 0.5) * 6);
      const eveningWP = home.position.clone();
      eveningWP.x += (this._rng() - 0.5) * 3;
      eveningWP.z += 6 + (this._rng() - 0.5) * 3; // away from plaza

      const villager = this._buildVillager(def);
      villager.position.copy(pos);
      villager.userData.def = def;
      villager.userData.home = home;
      villager.userData.target = pos.clone();
      // Schedule waypoints and current state
      villager.userData.waypoints = {
        home: homeWP.clone(),
        morning: morningWP.clone(),
        plaza: plazaWP.clone(),
        evening: eveningWP.clone(),
      };
      villager.userData.currentSegment = 'home'; // start sleeping at home until wake
      villager.userData.friendship = 0;
      villager.userData.friendshipSeen = false; // tracks whether player has met them
      villager.userData.birthdayGiftCount = 0; // gifts received today on their birthday
      villager.userData.lastGiftDay = -1; // last day they received a gift
      villager.userData.facing = this._rng() * Math.PI * 2;
      villager.userData.bob = this._rng() * Math.PI * 2;
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
    const noseMat = new THREE.MeshBasicMaterial({ color: PAL.hudInk });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), noseMat);
    nose.position.set(0, 1.40, 0.50);
    g.add(nose);
    // Eyes
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.cloudLit }));
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
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.cloudLit }));
      white.position.set(side * 0.22, 1.45, 0.08);
      white.scale.set(0.8, 1.0, 0.5);
      g.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: PAL.hudInk }));
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
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.cloudLit }));
      white.position.set(side * 0.20, 1.20, 0.40);
      white.scale.set(0.85, 1, 0.5);
      g.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: PAL.hudInk }));
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
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: PAL.hudInk }));
    nose.position.set(0, 1.22, 0.45);
    g.add(nose);
    // Big round eyes
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.cloudLit }));
      white.position.set(side * 0.10, 1.35, 0.22);
      white.scale.set(0.85, 1, 0.5);
      g.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: PAL.hudInk }));
      pupil.position.set(side * 0.10, 1.35, 0.265);
      g.add(pupil);
      // Tiny eye highlight
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), new THREE.MeshBasicMaterial({ color: PAL.cloudLit }));
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
    // Bunny Day: Spring day 7 spawns a hidden bunny in the plaza.
    // The bunny is a one-off entity — not in this.list — so it's a fresh
    // NPC the player can gift a flower to for a celebration. Gated on
    // window._bunnyDayCelebrated so it doesn't respawn after the player
    // has already completed the celebration.
    const isBunnyDay = time.season === 'Spring' && time.day === 7;
    const celebrated = !!window._bunnyDayCelebrated;
    if (isBunnyDay && !this._bunny && !celebrated) {
      this._bunny = this._buildBunny();
      this.scene.add(this._bunny);
    } else if (!isBunnyDay && this._bunny) {
      this.scene.remove(this._bunny);
      this._bunny = null;
    }
    if (this._bunny) this._animateBunny(this._bunny, dt, time);

    for (const v of this.list) {
      this._wander(v, dt, time);
      this._animate(v, dt, time);
    }
  }

  nearestIncludingBunny(pos, range = 2.4) {
    const v = this.nearest(pos, range);
    if (v) return v;
    if (this._bunny) {
      const d = this._bunny.position.distanceTo(pos);
      if (d < range) return this._bunny;
    }
    return null;
  }

  _buildBunny() {
    const g = new THREE.Group();
    g.name = 'bunny';
    g.userData.isBunny = true;
    g.userData.def = {
      name: 'Bunny', species: 'bunny',
      // No favoriteGift — the bunny reacts specially to flowers via the
      // Bunny Day celebration branch in interactions.js, not via the
      // generic favorite-gift multiplier. This keeps the +N friendship
      // math honest.
      greeting: ['Hippity hop!', 'I hid eggs this morning.', 'Happy Bunny Day!'],
    };
    const fur = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.skin });
    const pink = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.villagerFurOctopus });
    // Body (egg)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), fur);
    body.position.y = 0.45;
    body.scale.y = 0.85;
    g.add(body);
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), fur);
    head.position.y = 0.85;
    g.add(head);
    // Ears (long upright)
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.45, 8), fur);
      ear.position.set(sx * 0.12, 1.35, 0);
      ear.rotation.z = sx * 0.12;
      g.add(ear);
      const innerEar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.35, 8), pink);
      innerEar.position.set(sx * 0.12, 1.35, 0.04);
      innerEar.rotation.z = sx * 0.12;
      g.add(innerEar);
    }
    // Eyes
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6),
        new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: PAL.hudInk }));
      eye.position.set(sx * 0.10, 0.92, 0.21);
      g.add(eye);
    }
    // Pink nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), pink);
    nose.position.set(0, 0.83, 0.25);
    g.add(nose);
    // Fluffy tail
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), fur);
    tail.position.set(0, 0.35, -0.28);
    g.add(tail);
    // Position: in the plaza, near the fountain
    g.position.set(0, 0, 0);
    g.userData.bob = 0;
    g.userData.facing = 0;
    g.userData.friendship = 0;
    g.userData.friendshipSeen = false;
    // Children must cast shadow individually — Groups don't propagate.
    for (const child of g.children) child.castShadow = true;
    return g;
  }

  _animateBunny(b, dt, time) {
    b.userData.bob += dt * 1.4;
    b.position.y = Math.abs(Math.sin(b.userData.bob * 1.5)) * 0.06;
    // Slow spin in place
    b.rotation.y = time.t * 0.4;
  }

  _wander(v, dt, time) {
    const def = v.userData.def;
    const s = def.schedule;
    const wp = v.userData.waypoints;

    // Pick the segment for this hour of the day.
    //   < wake or >= sleep  → 'home'  (sleeping, frozen at home)
    //   wake..plazaHour     → 'morning'
    //   plazaHour..evening   → 'plaza'
    //   evening..sleep       → 'evening'
    let segment;
    const h = time.hour;
    if (h < s.wake || h >= s.sleep) segment = 'home';
    else if (h < s.plazaHour) segment = 'morning';
    else if (h < s.eveningHour) segment = 'plaza';
    else segment = 'evening';

    // Update target if the segment changed
    if (segment !== v.userData.currentSegment) {
      v.userData.currentSegment = segment;
      v.userData.target.copy(wp[segment]);
    }

    if (segment === 'home' && h < s.wake) {
      // Sleeping — frozen, idle breathing only
      v.userData.walking = false;
      return;
    }

    const toTarget = v.userData.target.clone().sub(v.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    // Once we're close to the current waypoint, do a small in-place idle
    // (slight wander around the waypoint) until the hour advances.
    if (dist < 0.6) {
      v.userData.walking = false;
      // Add a tiny breathing offset so they don't feel glued to the spot
      const idleAngle = time.t * 0.7 + (v.userData.def.name?.charCodeAt(0) || 0);
      v.position.x = wp[segment].x + Math.cos(idleAngle) * 0.3;
      v.position.z = wp[segment].z + Math.sin(idleAngle) * 0.3;
      v.position.y = this.world.heightAt(v.position.x, v.position.z);
      return;
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

    // Birthday 🎂 sprite — appears above the villager when it's their birthday.
    // Lazy-created on first birthday match so we don't allocate sprites for
    // every villager every frame.
    const def = v.userData.def;
    const isBirthday = def.birthday
      && time.season + ' ' + time.day === def.birthday;
    if (isBirthday) {
      if (!v.userData._cakeSprite) {
        const tex = this._cakeTexture();
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.7, 0.7, 0.7);
        sprite.position.y = 2.0;
        v.add(sprite);
        v.userData._cakeSprite = sprite;
      }
      // Bob the cake gently
      v.userData._cakeSprite.position.y = 2.0 + Math.sin(t * 1.5) * 0.08;
    } else if (v.userData._cakeSprite) {
      v.remove(v.userData._cakeSprite);
      v.userData._cakeSprite.material.map.dispose();
      v.userData._cakeSprite.material.dispose();
      v.userData._cakeSprite = null;
    }
  }

  /**
   * Procedural cake emoji sprite — drawn on a 64x64 canvas so we don't
   * need an emoji font or external asset.
   */
  _cakeTexture() {
    if (this._cakeTex) return this._cakeTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    // Plate shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(32, 54, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cake body (chocolate)
    ctx.fillStyle = '#b87333';
    ctx.fillRect(10, 30, 44, 22);
    // Frosting drips (cream)
    ctx.fillStyle = '#fff0d6';
    ctx.beginPath();
    ctx.moveTo(10, 30);
    for (let x = 0; x <= 44; x += 6) {
      const dip = (x % 12 === 0) ? 6 : 2;
      ctx.lineTo(10 + x, 30 + dip);
    }
    ctx.lineTo(54, 30);
    ctx.lineTo(54, 36);
    ctx.lineTo(10, 36);
    ctx.closePath();
    ctx.fill();
    // Candles
    ctx.fillStyle = '#ff7aa8';
    ctx.fillRect(18, 18, 3, 12);
    ctx.fillRect(31, 16, 3, 14);
    ctx.fillRect(44, 18, 3, 12);
    // Flames
    ctx.fillStyle = '#ffd56e';
    ctx.beginPath(); ctx.arc(19.5, 17, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(32.5, 15, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(45.5, 17, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath(); ctx.arc(19.5, 16.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(32.5, 14.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(45.5, 16.5, 1, 0, Math.PI * 2); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    this._cakeTex = tex;
    return tex;
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
    const fs = villager.userData.friendship || 0;
    // Tier 0 (stranger): greeting + weather flavor
    // Tier 1 (friend, fs >= 100): anecdote + favorite recipe offer
    // Tier 2 (best friend, fs >= 250): inside joke + dinner invitation
    let pool;
    if (fs >= 250 && def.insideJoke && def.invite) {
      pool = [...def.insideJoke, ...def.invite];
    } else if (fs >= 100 && def.anecdote) {
      pool = [...def.greeting, ...def.anecdote];
    } else {
      pool = def.greeting;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
