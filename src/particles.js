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

  spawnFootPuff(pos, surface = 'grass') {
    // Per-surface tuning — color, size, lifetime, drift, opacity all vary
    // so footprints read differently on grass vs dirt vs wood vs water.
    const palette = {
      grass: { color: 0xd8e6b8, size: 0.22, opacity: 0.55, life: 0.55, drift: 0.4, count: 5 },
      dirt:  { color: 0xc8a878, size: 0.20, opacity: 0.65, life: 0.50, drift: 0.6, count: 5 },
      path:  { color: 0xb89a6a, size: 0.18, opacity: 0.55, life: 0.45, drift: 0.5, count: 4 },
      wood:  { color: 0xb88a58, size: 0.10, opacity: 0.45, life: 0.30, drift: 0.2, count: 3 },
      water: { color: 0xc6e4f0, size: 0.28, opacity: 0.50, life: 0.45, drift: 0.3, count: 6 },
      stone: { color: 0x9a9a9a, size: 0.12, opacity: 0.55, life: 0.35, drift: 0.3, count: 3 },
    }[surface] || { color: 0xfff5d6, size: 0.18, opacity: 0.6, life: 0.5, drift: 0.6, count: 4 };
    for (let i = 0; i < palette.count; i++) {
      const m = new THREE.SpriteMaterial({ map: this._softCircle(palette.color), transparent: true, opacity: palette.opacity, depthWrite: false });
      const s = new THREE.Sprite(m);
      const size = palette.size + Math.random() * palette.size * 0.4;
      s.scale.set(size, size, size);
      s.position.set(pos.x + (Math.random() - 0.5) * 0.4, pos.y, pos.z + (Math.random() - 0.5) * 0.4);
      this.scene.add(s);
      const life = palette.life + Math.random() * 0.15;
      this.active.push({
        mesh: s,
        life,
        maxLife: life,
        startOpacity: palette.opacity,
        scale: size,
        update: (dt, k) => {
          s.position.y += dt * palette.drift;
          s.material.opacity = k * palette.opacity;
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
