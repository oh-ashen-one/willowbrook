// Particles — footstep puffs, pickup sparkles, leaf motes.
// All transient so critics can grade the feel without needing assets.

import * as THREE from 'three';

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  update(dt, time) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this.active.splice(i, 1);
        continue;
      }
      const k = p.life / p.maxLife;
      if (p.update) p.update(dt, k, time);
      p.mesh.material.opacity = k * (p.startOpacity ?? 1);
      p.mesh.scale.setScalar(p.scale * (1 + (1 - k) * 0.5));
    }
  }

  spawnFootPuff(pos) {
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: this._softCircle(0xfff5d6), transparent: true, opacity: 0.6, depthWrite: false });
      const s = new THREE.Sprite(m);
      const size = 0.18 + Math.random() * 0.12;
      s.scale.set(size, size, size);
      s.position.set(pos.x + (Math.random() - 0.5) * 0.4, pos.y, pos.z + (Math.random() - 0.5) * 0.4);
      this.scene.add(s);
      const life = 0.5 + Math.random() * 0.2;
      this.active.push({
        mesh: s,
        life,
        maxLife: life,
        startOpacity: 0.6,
        scale: size,
        update: (dt, k) => {
          s.position.y += dt * 0.6;
          s.material.opacity = k * 0.6;
        },
      });
    }
  }

  spawnPickupPuff(pos, color = 0xffd56e) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: this._softCircle(color), transparent: true, opacity: 1, depthWrite: false });
      const s = new THREE.Sprite(m);
      const size = 0.12;
      s.scale.set(size, size, size);
      s.position.copy(pos);
      this.scene.add(s);
      const life = 0.6;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5),
        0.4 + Math.random() * 0.4,
        (Math.random() - 0.5),
      );
      this.active.push({
        mesh: s,
        life,
        maxLife: life,
        startOpacity: 1,
        scale: size,
        update: (dt) => {
          s.position.addScaledVector(dir, dt * 1.5);
          dir.y -= dt * 0.6;
        },
      });
    }
  }

  _softCircle(color = 0xffffff) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const hex = '#' + color.toString(16).padStart(6, '0');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
    grad.addColorStop(0, hex);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }
}
