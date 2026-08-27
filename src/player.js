// Player — avatar, movement, camera anchor.
// Walks around the world, faces the cursor direction, and animates while moving.

import * as THREE from 'three';

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

    const skin = new THREE.MeshStandardMaterial({ color: 0xf6c89a, roughness: 0.8 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x5cb1e8, roughness: 0.9 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x314b6a, roughness: 0.9 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9 });

    // Body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 4, 8), shirt);
    body.position.y = 0.85;
    body.castShadow = true;
    g.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), skin);
    head.position.y = 1.55;
    head.castShadow = true;
    g.add(head);

    // Hair cap
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.295, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    hairCap.position.y = 1.55;
    hairCap.position.y -= 0.01;
    g.add(hairCap);

    // Eyes (tiny black dots)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a120a });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
    eyeL.position.set(-0.08, 1.58, 0.255);
    g.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
    eyeR.position.set(0.08, 1.58, 0.255);
    g.add(eyeR);

    // Cheeks (rosy)
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffb3a3, transparent: true, opacity: 0.65 });
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), cheekMat);
    cheekL.position.set(-0.13, 1.48, 0.245);
    g.add(cheekL);
    const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), cheekMat);
    cheekR.position.set(0.13, 1.48, 0.245);
    g.add(cheekR);

    // Arms
    const armGeom = new THREE.CapsuleGeometry(0.085, 0.45, 4, 6);
    this.armL = new THREE.Mesh(armGeom, shirt);
    this.armL.position.set(-0.4, 1.0, 0);
    this.armL.castShadow = true;
    g.add(this.armL);
    this.armR = new THREE.Mesh(armGeom, shirt);
    this.armR.position.set(0.4, 1.0, 0);
    this.armR.castShadow = true;
    g.add(this.armR);

    // Legs
    const legGeom = new THREE.CapsuleGeometry(0.11, 0.5, 4, 6);
    this.legL = new THREE.Mesh(legGeom, pants);
    this.legL.position.set(-0.15, 0.3, 0);
    this.legL.castShadow = true;
    g.add(this.legL);
    this.legR = new THREE.Mesh(legGeom, pants);
    this.legR.position.set(0.15, 0.3, 0);
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
