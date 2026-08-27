// Save — localStorage persistence.

const KEY = 'willowbrook.save.v1';

export class Save {
  constructor() {
    this.data = null;
  }

  load(modules) {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.data = data;
      if (data.inventory) {
        modules.inventory.slots = data.inventory.slots || modules.inventory.slots;
        modules.inventory.bells = data.inventory.bells || 0;
        modules.inventory.active = data.inventory.active || 0;
      }
      if (data.player) {
        modules.player.position.set(data.player.x, data.player.y, data.player.z);
      }
      if (data.time) {
        modules.time.time = data.time.time || modules.time.time;
        modules.time.day = data.time.day || 1;
        modules.time.season = data.time.season || 'Spring';
      }
    } catch (e) {
      console.warn('Save load failed', e);
    }
  }

  save(modules) {
    try {
      const data = {
        inventory: {
          slots: modules.inventory.slots,
          bells: modules.inventory.bells,
          active: modules.inventory.active,
        },
        player: {
          x: modules.player.position.x,
          y: modules.player.position.y,
          z: modules.player.position.z,
        },
        time: {
          time: modules.time.time,
          day: modules.time.day,
          season: modules.time.season,
        },
      };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }
}
