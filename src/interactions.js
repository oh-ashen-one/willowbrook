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
        const surface = this._surfaceAt(player.position.x, player.position.z);
        // Tell audio.js what surface to use on its next footstep blip.
        window._lastSurface = surface;
        particles.spawnFootPuff(pos, surface);
      }
      this._lastBob = cur % twoPi;
    } else {
      this._lastBob = player.bob;
    }

    // Proximity checks
    const nearby = (villagers.nearestIncludingBunny
      ? villagers.nearestIncludingBunny(player.position, 2.5)
      : villagers.nearest(player.position, 2.5));
    const inside = this.modules.interiors && this.modules.interiors.isInside();
    const activeItem = inventory && inventory.activeItem();
    const activeDef = activeItem ? ITEMS[activeItem.id] : null;
    const hasGift = activeDef && activeDef.type === 'gift' && activeItem.count > 0;
    if (inside) {
      // Inside an interior: show "press E to leave" when standing near the
      // doorway. Doorway is the gap in the front wall (z ≈ +8, x ∈ [-0.5, 0.5]).
      const dx = player.position.x;
      const dz = player.position.z - 8;
      const atDoor = (Math.abs(dx) < 1.2) && (dz > -1.6 && dz < 1.0);
      if (atDoor) {
        ui.showInteractPrompt('Press E to step outside');
      } else {
        ui.hideInteractPrompt();
      }
    } else if (nearby && hasGift) {
      ui.showInteractPrompt(`Press E to give ${activeDef.name}`);
    } else if (nearby) {
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
      // Inside: E near doorway steps back outside
      if (inside) {
        const dx = player.position.x;
        const dz = player.position.z - 8;
        const atDoor = (Math.abs(dx) < 1.2) && (dz > -1.6 && dz < 1.0);
        if (atDoor && this.modules.interiors) {
          this.modules.player._interiorMode = false;
          this.modules.player._interiorHalf = null;
          this.modules.interiors.exit();
          ui.hideInteractPrompt();
          return;
        }
      }
      if (this.activeDialogueWith) {
        // Advance dialogue: simple close-on-second-press
        this.activeDialogueWith = null;
        ui.hideDialogue();
        return;
      }
      if (nearby && hasGift) {
        // GIVE GIFT: skip dialogue, give the held gift, add friendship, sparkle
        const giftId = activeItem.id;
        const giftDef = activeDef;
        const def = nearby.userData.def;
        const isFavorite = def.favoriteGift === giftId;
        // Birthday check (Phase 4 will provide the day-of-year format)
        const todaysBirthday = this.modules.time && def.birthday
          && this.modules.time.season + ' ' + this.modules.time.day === def.birthday;
        const multiplier = isFavorite ? 2 : (todaysBirthday ? 3 : 1);
        const earned = (giftDef.value || 0) * multiplier;
        nearby.userData.friendship = (nearby.userData.friendship || 0) + earned;
        inventory.remove(giftId, 1);
        // Visual reaction: heart particles at the villager's head
        const heartPos = nearby.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        particles.spawnPickupPuff(heartPos, 0xff7aa8);
        // Per-gift reaction line
        const lines = {
          flower:  ['Oh! A flower — thank you!', 'So pretty! I\'ll press it.'],
          bug:     ['A BUG! Ribbit! Thanks!', 'I\'ll show it off at the pond.'],
          fossil:  ['Whoa — a fossil!', 'This belongs in the museum!'],
          fish:    ['A fish! Fresh!', 'You\'re the best fisher!'],
          apple:   ['An apple — my favorite snack!', 'Crunch! Perfect.'],
          acorn:   ['An acorn! My treasure!', 'I\'ll bury it somewhere secret.'],
          shell:   ['A shell — listen to the ocean!', 'So pretty. Thank you.'],
        };
        const pool = lines[giftId] || ['Thank you!'];
        const greeting = pool[Math.floor(Math.random() * pool.length)];
        ui.showDialogue(nearby.userData.def.name, greeting);
        // Audio + camera shake
        this.modules.audio.blip(880, 0.2);
        if (this.modules.game && this.modules.game.shake) this.modules.game.shake(0.1, 0.1);
        // Toast with the friendship earned
        const bonusText = isFavorite ? ' (favorite — 2×)' : (todaysBirthday ? ' (birthday — 3×)' : '');
ui.toast(`${def.name} +${earned} friendship${bonusText}`);
        this.activeDialogueWith = nearby;
        if (!nearby.userData.friendshipSeen) {
          inventory.bells += 50;
          ui.toast('+50 bells (first-meeting bonus)');
          nearby.userData.friendshipSeen = true;
        }
        // Bunny Day celebration: gifting the bunny a flower on Spring day 7
        // triggers the celebration cutscene + a stack of egg-rewards.
        if (nearby.userData.isBunny && giftId === 'flower' && !window._bunnyDayCelebrated) {
          window._bunnyDayCelebrated = true;
          this.activeDialogueWith = null;
          ui.hideDialogue();
          if (this.modules.cutscene) {
            await this.modules.cutscene.play('videos/v2-complete.mp4', {
              title: 'Happy Bunny Day!',
              minDuration: 1500,
            });
          }
          // Rewards
          inventory.bells += 500;
          inventory.add('shell', 3);
          inventory.add('flower', 5);
          ui.toast('🎉 Bunny Day! +500 bells, 3 shells, 5 flowers');
          this.modules.audio.blip(1200, 0.4);
          if (this.modules.game && this.modules.game.shake) this.modules.game.shake(0.5, 0.3);
          // Despawn the bunny
          if (this.modules.villagers && this.modules.villagers._bunny) {
            this.modules.villagers.scene.remove(this.modules.villagers._bunny);
            this.modules.villagers._bunny = null;
          }
        }
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
        // Tool swing — emit dust + camera shake + per-tool SFX
        const toolId = inventory.activeItem().id;
        particles.spawnFootPuff(player.position.clone().add(new THREE.Vector3(0, 0.4, 0)).add(
          new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing)).multiplyScalar(1)
        ));
        if (this.modules.game && this.modules.game.shake) {
          this.modules.game.shake(0.25, 0.18);
        }
        if (this.modules.audio && this.modules.audio.toolUse) {
          this.modules.audio.toolUse(toolId);
        }
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

  /**
   * What surface is the player standing on? Used to color the foot-puff
   * particles so footprints read differently on each material.
   *   grass — open field (default)
   *   dirt  — within ~1 unit of the stepping-stone path spline
   *   water — on the river strip (z ∈ [-54, -22] and |x| < 30)
   *   stone — within ~1 unit of any placed rock
   *   wood  — inside an interior room
   */
  _surfaceAt(x, z) {
    if (this.modules.interiors && this.modules.interiors.isInside()) return 'wood';
    // River strip (matches player.js _clampToWorld logic)
    if (z < -22 && z > -54 && Math.abs(x) < 30) return 'water';
    // Path spline — gentle S-curve from x≈4,z=-52 to x≈1,z=-3 (matches world.js _paintPath)
    // Distance check along the path: sample the curve and return the closest.
    const pathSamples = 24;
    let bestD2 = Infinity;
    for (let i = 0; i <= pathSamples; i++) {
      const t = i / pathSamples;
      const px = 4 + Math.sin(t * Math.PI * 1.4) * 2 - t * 3;
      const pz = -52 + t * 49;
      const dx = x - px, dz = z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) bestD2 = d2;
    }
    if (bestD2 < 1.4 * 1.4) return 'dirt';
    // Stone — within 1 unit of any rock
    const rocks = this.modules.world?.rocks;
    if (rocks) {
      for (const r of rocks) {
        const dx = x - r.position.x, dz = z - r.position.z;
        if (dx * dx + dz * dz < 1.0 * 1.0) return 'stone';
      }
    }
    return 'grass';
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
