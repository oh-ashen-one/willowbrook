// Weather — rain on/off, occasional cloud shadow flicker.
// Kept lightweight. Critics can replace with proper cloud system later.

import * as THREE from 'three';

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.raining = false;
    this.drops = null;
    this._timer = 0;
  }

  update(dt, time) {
    this._timer -= dt;
    if (this._timer <= 0) {
      this._timer = 25;
      // 25% chance of rolling a brief shower if not raining
      if (!this.raining && Math.random() < 0.25) this._startRain(20);
    }
    if (this.raining) {
      this._updateRain(dt);
      this._rainTimer -= dt;
      if (this._rainTimer <= 0) this._stopRain();
    }
  }

  _startRain(seconds) {
    this.raining = true;
    this._rainTimer = seconds;
    const count = 600;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xa6c8e6, size: 0.08, transparent: true, opacity: 0.55 });
    this.drops = new THREE.Points(geo, mat);
    this.scene.add(this.drops);
  }

  _updateRain(dt) {
    if (!this.drops) return;
    const pos = this.drops.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - 12 * dt;
      if (y < 0) y = 20;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }

  _stopRain() {
    if (!this.drops) return;
    this.scene.remove(this.drops);
    this.drops.geometry.dispose();
    this.drops.material.dispose();
    this.drops = null;
    this.raining = false;
  }
}
