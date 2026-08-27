// Interactions — proximity-based, action button triggers dialogue, picking up, using tools.

import * as THREE from 'three';
import { ITEMS } from './inventory.js';

export class Interactions {
  constructor(modules) {
    this.modules = modules;
    this.activeDialogueWith = null;
    this._downAction = false;
  }

  async update(dt) {
    const { player, villagers, buildings, ui, inventory, particles, time } = this.modules;

    // Foot-puff on each foot strike while walking.
    // The walk cycle uses sin(bob) so foot-strikes happen near bob = 0 / π / 2π.
    // We detect crossings of π and 2π to fire one puff per step.
    if (player.walking && player.velocity.length() > 1.2) {
      const prev = this._lastBob ?? player.bob;
      const cur = player.bob;
      const twoPi = Math.PI * 2;
      const fired =
        (prev < Math.PI && cur >= Math.PI) ||
        (prev < twoPi && cur >= twoPi);
      if (fired && particles) {
        // Spawn at the leading foot, slightly in front of facing direction
        const side = ((Math.floor(cur / Math.PI) % 2) === 0) ? -1 : 1;
        const fwd = new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing));
        const right = new THREE.Vector3(Math.cos(player.facing), 0, -Math.sin(player.facing));
        const pos = player.position.clone()
          .add(new THREE.Vector3(0, 0.05, 0))
          .addScaledVector(fwd, 0.35)
          .addScaledVector(right, side * 0.18);
        particles.spawnFootPuff(pos);
      }
      this._lastBob = cur % twoPi;
    } else {
      this._lastBob = player.bob;
    }

    // Proximity checks
    const nearby = villagers.nearest(player.position, 2.5);
    if (nearby) {
      ui.showInteractPrompt('Press E to talk');
    } else {
      ui.hideInteractPrompt();
    }

    // End-of-level celebration: first time the player stands on the plaza
    // after meeting all 5 villagers AND having earned 100+ bells.
    if (this.modules.cutscene && !window._completeCutscenePlayed) {
      const distToPlaza = Math.hypot(player.position.x, player.position.z);
      if (distToPlaza < 4.5) {
        const met = new Set((window._villagersMet || []));
        for (const v of this.modules.villagers.list) {
          if ((v.userData.friendship || 0) > 0) met.add(v.userData.def.name);
        }
        window._villagersMet = Array.from(met);
        if (met.size >= 5 && inventory.bells >= 100) {
          window._completeCutscenePlayed = true;
          // Pause input via UI hint while cutscene plays
          ui.toast('Level complete!');
          await new Promise(r => setTimeout(r, 600));
          await this.modules.cutscene.play('videos/v2-complete.mp4', {
            title: 'Welcome home, friend.',
            minDuration: 1500,
          });
          ui.toast('🎉 You completed the first level.');
        }
      }
    }

    // Action button rising edge
    const actionNow = !!(window._input && window._input.action);
    const justPressed = actionNow && !this._downAction;
    this._downAction = actionNow;

    if (justPressed) {
      if (this.activeDialogueWith) {
        // Advance dialogue: simple close-on-second-press
        this.activeDialogueWith = null;
        ui.hideDialogue();
        return;
      }
      if (nearby) {
        this.activeDialogueWith = nearby;
        const greeting = villagers.greet(nearby);
        ui.showDialogue(nearby.userData.def.name, greeting);
        nearby.userData.friendship = (nearby.userData.friendship || 0) + 1;
        this.modules.audio.blip(720, 0.2);
        // Gift on first talk
        if (nearby.userData.friendship === 1) {
          inventory.bells += 50;
          ui.toast('+50 bells (first-meeting bonus)');
        }
        // Maple's special cutscene — first time you meet the bear baker
        if (nearby.userData.def.name === 'Maple' && !window._mapleCutscenePlayed) {
          window._mapleCutscenePlayed = true;
          this.activeDialogueWith = null;
          ui.hideDialogue();
          if (this.modules.cutscene) {
            await this.modules.cutscene.play('videos/v2-meet-maple.mp4', {
              title: 'You meet Maple, the baker',
              minDuration: 1500,
            });
          }
          inventory.add('apple', 3);
          ui.toast('Maple gave you 3 apples!');
          this.modules.audio.blip(880, 0.3);
        }
        return;
      }
      // Try entering nearest building
      const b = this._nearestBuilding(player.position, 2.6);
      if (b) {
        // Public buildings (shop, museum) or villager homes (visit) — enter
        const enterable = ['player', 'shop', 'museum', 'oak', 'lily', 'cedar', 'shell', 'acorn'];
        if (enterable.includes(b.userData.id)) {
          this.modules.audio.blip(440, 0.18);
          ui.toast(`Entering ${b.userData.name || 'building'}...`);
          this.modules.interiors.enter(b.userData.id);
          this.activeDialogueWith = null;
          ui.hideDialogue();
          return;
        }
      }
      // Try foraging near a tree/flower
      const forage = this._forage(player.position);
      if (forage) {
        inventory.add(forage.id, 1);
        ui.toast(`Picked up ${ITEMS[forage.id].name}!`);
        this.modules.audio.blip(580, 0.12);
        particles.spawnPickupPuff(forage.position, ITEMS[forage.id].color);
        forage.parent && forage.parent.remove(forage);
      } else if (inventory.activeItem() && ITEMS[inventory.activeItem().id]?.type === 'tool') {
        // Tool swing — emit dust
        particles.spawnFootPuff(player.position.clone().add(new THREE.Vector3(0, 0.4, 0)).add(
          new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing)).multiplyScalar(1)
        ));
      }
    }
  }

  _nearestBuilding(pos, range) {
    let best = null, bestD = range;
    for (const b of this.modules.buildings.list) {
      const d = b.position.distanceTo(pos);
      if (d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  _forage(pos) {
    const r = 1.6;
    // Check flowers first
    for (const f of this.modules.world.flowers) {
      const d = f.position.distanceTo(pos);
      if (d < r) return { id: 'flower', position: f.position.clone() };
    }
    // Check trees (apple chance)
    for (const t of this.modules.world.trees) {
      const d = t.position.distanceTo(pos);
      if (d < r) return { id: 'apple', position: t.position.clone().add(new THREE.Vector3(0, 1.4, 0)) };
    }
    return null;
  }
}
