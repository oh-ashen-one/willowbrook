// Villagers — friendly creatures with personalities, routines, and dialogue.
// Each villager has a name, species, color palette, schedule, and small talk lines.

import * as THREE from 'three';

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

    const fur = new THREE.MeshStandardMaterial({ color: def.palette.fur, roughness: 0.95, flatShading: false });
    const snout = new THREE.MeshStandardMaterial({ color: def.palette.snout, roughness: 0.9 });
    const shirt = new THREE.MeshStandardMaterial({ color: def.palette.shirt, roughness: 0.9 });

    // Species-specific body
    if (def.species === 'bear' || def.species === 'cub') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), fur);
      body.position.y = 0.7; body.scale.y = 1.1; body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), fur);
      head.position.y = 1.55; head.castShadow = true;
      g.add(head);
      const sn = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), snout);
      sn.position.set(0, 1.45, 0.34); sn.scale.set(1.1, 0.9, 0.9);
      g.add(sn);
      // ears
      const earGeom = new THREE.SphereGeometry(0.12, 8, 6);
      const earL = new THREE.Mesh(earGeom, fur);
      earL.position.set(-0.22, 1.85, 0);
      const earR = new THREE.Mesh(earGeom, fur);
      earR.position.set(0.22, 1.85, 0);
      g.add(earL, earR);
    } else if (def.species === 'frog') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), fur);
      body.position.y = 0.55; body.scale.set(1.1, 0.8, 1.1); body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), fur);
      head.position.y = 1.25; head.castShadow = true;
      g.add(head);
      // eye bumps
      const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const eyePupil = new THREE.MeshBasicMaterial({ color: 0x1a120a });
      const eyeBallG = new THREE.SphereGeometry(0.13, 10, 8);
      const pupilG = new THREE.SphereGeometry(0.05, 8, 6);
      const eyeL = new THREE.Mesh(eyeBallG, eyeWhite);
      eyeL.position.set(-0.18, 1.55, 0.05); g.add(eyeL);
      const eyeR = new THREE.Mesh(eyeBallG, eyeWhite);
      eyeR.position.set(0.18, 1.55, 0.05); g.add(eyeR);
      const pupL = new THREE.Mesh(pupilG, eyePupil);
      pupL.position.set(-0.18, 1.55, 0.16); g.add(pupL);
      const pupR = new THREE.Mesh(pupilG, eyePupil);
      pupR.position.set(0.18, 1.55, 0.16); g.add(pupR);
    } else if (def.species === 'octopus') {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), fur);
      head.position.y = 1.1; head.castShadow = true;
      g.add(head);
      // tentacles
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 4, 6), fur);
        t.position.set(Math.cos(a) * 0.25, 0.4, Math.sin(a) * 0.25);
        t.rotation.z = Math.cos(a) * 0.5;
        t.rotation.x = Math.sin(a) * 0.5;
        g.add(t);
      }
    } else if (def.species === 'squirrel') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), fur);
      body.position.y = 0.7; body.scale.y = 1.05; body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), fur);
      head.position.y = 1.45; head.castShadow = true;
      g.add(head);
      // big tail
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), fur);
      tail.position.set(0, 0.9, -0.4); tail.scale.set(0.7, 1.4, 0.7);
      g.add(tail);
      const earGeom = new THREE.SphereGeometry(0.09, 8, 6);
      const earL = new THREE.Mesh(earGeom, fur);
      earL.position.set(-0.16, 1.7, 0);
      const earR = new THREE.Mesh(earGeom, fur);
      earR.position.set(0.16, 1.7, 0);
      g.add(earL, earR);
    }

    // Eyes common
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a120a });
    if (def.species !== 'frog') {
      const eyeG = new THREE.SphereGeometry(0.035, 8, 6);
      const eL = new THREE.Mesh(eyeG, eyeMat);
      eL.position.set(-0.1, def.species === 'octopus' ? 1.18 : 1.6, 0.3);
      g.add(eL);
      const eR = new THREE.Mesh(eyeG, eyeMat);
      eR.position.set(0.1, def.species === 'octopus' ? 1.18 : 1.6, 0.3);
      g.add(eR);
    }

    // Shirt / accessory
    if (def.species === 'bear' || def.species === 'cub' || def.species === 'squirrel') {
      const shirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.4, 12), shirt);
      shirtMesh.position.y = 0.75;
      shirtMesh.castShadow = true;
      g.add(shirtMesh);
    }

    g.userData.dialogueState = 0;
    return g;
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
