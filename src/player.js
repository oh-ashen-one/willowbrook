// Player — avatar, movement, camera anchor.
// Walks around the world, faces the cursor direction, and animates while moving.

import * as THREE from 'three';
import { gradientMap } from './toon.js';

const ACCEL = 26;
const FRICTION = 12;
const MAX_SPEED = 5.5;

export class Player {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.facing = Math.PI; // face -Z (toward plaza / south)
    this.mesh = null;
    this.walking = false;
    this.bob = 0;
    this._tmp = new THREE.Vector3();
  }

  spawn(pos) {
    this.mesh = this._buildAvatar();
    this.mesh.position.copy(pos);
    this.mesh.position.y = this.world.heightAt(pos.x, pos.z);
    this.scene.add(this.mesh);
    this.position.copy(this.mesh.position);
    this._cameraOffset = new THREE.Vector3(0, 0, 0);
  }

  _buildAvatar() {
    const g = new THREE.Group();
    g.name = 'player';

    const skin = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xf6c89a });
    const shirt = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x5cb1e8 });
    const shirtDark = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x3a8cc7 });
    const pants = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x314b6a });
    const hair = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x4a2a18 });
    const shoeMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x3a2a1a });
    const bagMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xa86838 });
    const hatBandMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xd63a2c });

    // === Torso (shirt) — slightly tapered capsule ===
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.30, 0.45, 4, 8), shirt);
    body.position.y = 0.88;
    body.castShadow = true;
    g.add(body);

    // Belly highlight (front rounded bit — chest)
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), shirtDark);
    chest.position.set(0, 0.85, 0.06);
    chest.scale.z = 0.5;
    g.add(chest);

    // Belt
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.32, 0.10, 16),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x4a2a12 })
    );
    belt.position.y = 0.62;
    g.add(belt);
    const beltBuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.07, 0.05),
      new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xffd56e, emissive: 0xffd56e, emissiveIntensity: 0.4 })
    );
    beltBuckle.name = 'buckle';
    beltBuckle.userData.skipOutline = true;
    beltBuckle.position.set(0, 0.62, 0.31);
    g.add(beltBuckle);

    // === Backpack ===
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.18), bagMat);
    bag.position.set(0, 0.95, -0.32);
    bag.castShadow = true;
    g.add(bag);
    // Bag flap
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.04), hatBandMat);
    flap.position.set(0, 1.06, -0.22);
    g.add(flap);
    // Bag straps
    const strapMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x6a4a2a });
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), strapMat);
    strapL.name = 'strap';
    strapL.userData.skipOutline = true;
    strapL.position.set(-0.22, 0.95, -0.18);
    g.add(strapL);
    const strapR = strapL.clone();
    strapR.name = 'strap';
    strapR.userData.skipOutline = true;
    strapR.position.x = 0.22;
    g.add(strapR);

    // === Head — slightly bigger, with jaw line ===
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.30, 16, 12), skin);
    head.position.y = 1.55;
    head.scale.set(1, 1.05, 0.95);
    head.castShadow = true;
    g.add(head);

    // Jaw / chin
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), skin);
    chin.position.set(0, 1.40, 0.07);
    chin.scale.set(1.05, 0.7, 0.6);
    g.add(chin);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.12, 8), skin);
    neck.position.y = 1.25;
    g.add(neck);

    // === Hair — AC-style messy bowl cut ===
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    hairCap.position.y = 1.55;
    g.add(hairCap);
    // Hair fringe (curved over forehead)
    const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.31, 14, 8), hair);
    fringe.position.set(0, 1.66, 0.10);
    fringe.scale.set(1, 0.5, 0.6);
    g.add(fringe);
    // Hair tufts at sides
    const tuftL = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), hair);
    tuftL.position.set(-0.30, 1.45, 0.04);
    tuftL.scale.set(0.8, 1.4, 0.8);
    g.add(tuftL);
    const tuftR = tuftL.clone();
    tuftR.position.x = 0.30;
    g.add(tuftR);
    // Back hair tuft
    const tuftBack = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), hair);
    tuftBack.position.set(0, 1.50, -0.18);
    tuftBack.scale.set(1, 1.1, 0.8);
    g.add(tuftBack);

    // === Eyes — proper AC-style oval eyes with whites ===
    const eyeWhiteMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x1a120a });
    const eyeWhiteGeom = new THREE.SphereGeometry(0.05, 10, 8);
    const pupilGeom = new THREE.SphereGeometry(0.025, 8, 6);
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
      white.position.set(side * 0.10, 1.58, 0.245);
      white.scale.set(0.7, 1.0, 0.5);
      g.add(white);
      const pupil = new THREE.Mesh(pupilGeom, eyePupilMat);
      pupil.position.set(side * 0.105, 1.58, 0.27);
      g.add(pupil);
    }

    // Eyebrows (thin slabs)
    const browMat = new THREE.MeshToonMaterial({ gradientMap: gradientMap(3), color: 0x2a1810 });
    const browGeom = new THREE.BoxGeometry(0.09, 0.02, 0.025);
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(browGeom, browMat);
      brow.position.set(side * 0.10, 1.66, 0.255);
      g.add(brow);
    }

    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), skin);
    nose.position.set(0, 1.53, 0.28);
    nose.scale.set(0.7, 0.8, 1.0);
    g.add(nose);

    // Cheeks (rosy blush)
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffb3a3, transparent: true, opacity: 0.65 });
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), cheekMat);
      cheek.position.set(side * 0.18, 1.48, 0.215);
      g.add(cheek);
    }

    // === Arms (with hands at end) ===
    const armGeom = new THREE.CapsuleGeometry(0.085, 0.40, 4, 6);
    const handGeom = new THREE.SphereGeometry(0.10, 10, 8);
    this.armL = new THREE.Group();
    const armLmesh = new THREE.Mesh(armGeom, shirt);
    this.armL.add(armLmesh);
    const handL = new THREE.Mesh(handGeom, skin);
    handL.position.y = -0.32;
    this.armL.add(handL);
    this.armL.position.set(-0.40, 1.0, 0);
    this.armL.castShadow = true;
    g.add(this.armL);

    this.armR = new THREE.Group();
    const armRmesh = new THREE.Mesh(armGeom, shirt);
    this.armR.add(armRmesh);
    const handR = new THREE.Mesh(handGeom, skin);
    handR.position.y = -0.32;
    this.armR.add(handR);
    this.armR.position.set(0.40, 1.0, 0);
    this.armR.castShadow = true;
    g.add(this.armR);

    // === Legs (with shoes) ===
    const legGeom = new THREE.CapsuleGeometry(0.11, 0.45, 4, 6);
    const shoeGeom = new THREE.BoxGeometry(0.20, 0.10, 0.32);
    this.legL = new THREE.Group();
    const legLmesh = new THREE.Mesh(legGeom, pants);
    this.legL.add(legLmesh);
    const shoeL = new THREE.Mesh(shoeGeom, shoeMat);
    shoeL.position.set(0, -0.30, 0.04);
    this.legL.add(shoeL);
    this.legL.position.set(-0.16, 0.30, 0);
    this.legL.castShadow = true;
    g.add(this.legL);

    this.legR = new THREE.Group();
    const legRmesh = new THREE.Mesh(legGeom, pants);
    this.legR.add(legRmesh);
    const shoeR = new THREE.Mesh(shoeGeom, shoeMat);
    shoeR.position.set(0, -0.30, 0.04);
    this.legR.add(shoeR);
    this.legR.position.set(0.16, 0.30, 0);
    this.legR.castShadow = true;
    g.add(this.legR);

    return g;
  }

  update(dt, time) {
    const input = this._readInput();
    this._applyMovement(input, dt);
    this._animate(dt, time);
    this._clampToWorld();
    this._snapToGround();
  }

  _readInput() {
    const k = window._input || {};
    let x = 0, z = 0;
    if (k.left || k.a) x -= 1;
    if (k.right || k.d) x += 1;
    if (k.up || k.w) z -= 1;
    if (k.down || k.s) z += 1;
    const mag = Math.hypot(x, z);
    if (mag > 1) { x /= mag; z /= mag; }
    return { x, z, action: !!k.action, run: !!k.run };
  }

  _applyMovement(input, dt) {
    const target = this._tmp.set(input.x, 0, input.z);
    if (target.lengthSq() > 0) {
      this.velocity.x += target.x * ACCEL * dt;
      this.velocity.z += target.z * ACCEL * dt;
      // Face direction of travel
      const desiredFacing = Math.atan2(target.x, target.z);
      const diff = ((desiredFacing - this.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.facing += diff * Math.min(1, dt * 12);
    } else {
      // Friction
      const v = this.velocity.length();
      const drop = Math.min(v, FRICTION * dt);
      this.velocity.multiplyScalar((v - drop) / Math.max(v, 0.0001));
    }

    // Cap to max speed
    const speed = this.velocity.length();
    const max = MAX_SPEED * (input.run ? 1.5 : 1);
    if (speed > max) this.velocity.multiplyScalar(max / speed);

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    this.walking = speed > 0.4;
  }

  _animate(dt, time) {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facing;

    const speed = this.velocity.length();
    if (this.walking) {
      this.bob += dt * (8 + speed * 0.6);
      const swing = Math.sin(this.bob) * 0.6;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.6;
      this.armR.rotation.x = swing * 0.6;
      this.mesh.position.y += Math.abs(Math.sin(this.bob * 2)) * 0.05;
    } else {
      this.legL.rotation.x *= 0.85;
      this.legR.rotation.x *= 0.85;
      this.armL.rotation.x *= 0.85;
      this.armR.rotation.x *= 0.85;
    }
  }

  _clampToWorld() {
    const half = this.world.size * 0.45;
    this.position.x = Math.max(-half, Math.min(half, this.position.x));
    this.position.z = Math.max(-half + 6, Math.min(half, this.position.z));
    // Don't walk into the river
    if (this.position.z < -22 && this.position.z > -54 && Math.abs(this.position.x) < 30) {
      // push out to nearest bank
      if (this.position.z < -38) this.position.z = -22;
      else this.position.z = -54;
    }
  }

  _snapToGround() {
    this.position.y = this.world.heightAt(this.position.x, this.position.z);
  }

  cameraAnchor() {
    return this.mesh.position.clone();
  }
}
