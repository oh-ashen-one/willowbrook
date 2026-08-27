// Save — localStorage persistence.
// v2 (Aug 2026): also serializes per-villager friendship + first-meeting
// state + bunnyDayCelebrated so the Villager Heart progress carries
// across reloads. v1 saves are read once and migrated to v2 on the fly.

const KEY_V1 = 'willowbrook.save.v1';
const KEY = 'willowbrook.save.v2';

export class Save {
  constructor() {
    this.data = null;
  }

  load(modules) {
    try {
      let raw = localStorage.getItem(KEY);
      let v1Migrated = false;
      if (!raw) {
        // Try the v1 key once — migrate to v2 format on first read.
        raw = localStorage.getItem(KEY_V1);
        if (!raw) return;
        v1Migrated = true;
      }
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
      // v2 fields: per-villager friendship + first-meeting + bunnyDayCelebrated
      const villagers = modules.villagers && modules.villagers.list;
      if (villagers && data.villagers) {
        for (let i = 0; i < villagers.length; i++) {
          const v = villagers[i];
          const saved = data.villagers[v.userData.def.name];
          if (saved) {
            v.userData.friendship = saved.friendship || 0;
            v.userData.friendshipSeen = !!saved.seen;
          }
        }
      }
      if (typeof data.bunnyDayCelebrated === 'boolean') {
        window._bunnyDayCelebrated = data.bunnyDayCelebrated;
      }
      // If we just migrated, write back under the v2 key so future loads
      // hit the fast path.
      if (v1Migrated) {
        try { localStorage.setItem(KEY, raw); localStorage.removeItem(KEY_V1); } catch (_) {}
      }
    } catch (e) {
      console.warn('Save load failed', e);
    }
  }

  save(modules) {
    try {
      const villagers = {};
      if (modules.villagers && modules.villagers.list) {
        for (const v of modules.villagers.list) {
          if (v.userData && v.userData.def) {
            villagers[v.userData.def.name] = {
              friendship: v.userData.friendship || 0,
              seen: !!v.userData.friendshipSeen,
            };
          }
        }
      }
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
        villagers,
        bunnyDayCelebrated: !!window._bunnyDayCelebrated,
      };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }
}
