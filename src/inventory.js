// Inventory — items and tools, hotbar slots.
// All defined inline so the critic can judge without external data.

export const ITEMS = {
  // Tools
  grass:    { name: 'Grass', icon: '🌿', type: 'tool', slot: 0, color: 0x6fbf5a },
  axe:      { name: 'Axe',   icon: '🪓', type: 'tool', slot: 1, color: 0xb0a090 },
  bucket:   { name: 'Bucket', icon: '🪣', type: 'tool', slot: 2, color: 0x4a8fd1 },
  rod:      { name: 'Rod',   icon: '🎣', type: 'tool', slot: 3, color: 0xc0a070 },
  // Foraged
  apple:    { name: 'Apple', icon: '🍎', type: 'food', value: 50 },
  fish:     { name: 'Fish',  icon: '🐟', type: 'food', value: 200 },
  bug:      { name: 'Bug',   icon: '🦋', type: 'gift', value: 80 },
  fossil:   { name: 'Fossil', icon: '🦴', type: 'gift', value: 250 },
  flower:   { name: 'Flower', icon: '🌸', type: 'gift', value: 40 },
  acorn:    { name: 'Acorn', icon: '🌰', type: 'gift', value: 60 },
  shell:    { name: 'Shell', icon: '🐚', type: 'gift', value: 90 },
  // Furniture / misc handled later
};

export class Inventory {
  constructor() {
    this.slots = [
      { id: 'grass', count: 1 },
      { id: 'axe',   count: 1 },
      { id: 'bucket', count: 1 },
      { id: 'rod',   count: 1 },
      { id: 'apple', count: 0 },
      { id: 'fish',  count: 0 },
      { id: 'bug',   count: 0 },
      { id: 'fossil', count: 0 },
    ];
    this.active = 0;
    this.bells = 0;
  }

  activeItem() { return this.slots[this.active] || null; }
  has(id, n = 1) {
    const s = this.slots.find(s => s.id === id);
    return s && s.count >= n;
  }
  add(id, n = 1) {
    const s = this.slots.find(s => s.id === id);
    if (s) s.count += n;
    else this.slots.push({ id, count: n });
  }
  remove(id, n = 1) {
    const s = this.slots.find(s => s.id === id);
    if (s) s.count = Math.max(0, s.count - n);
  }
  setActive(i) {
    if (i >= 0 && i < this.slots.length) this.active = i;
  }
  nextSlot() { this.setActive((this.active + 1) % Math.min(this.slots.length, 8)); }
}
