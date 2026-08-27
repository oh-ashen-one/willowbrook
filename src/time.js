// TimeOfDay — clock, day/night cycle, calendar.
// The world reads `lightLevel` (0..1) and `hour` (0..24).

const SECONDS_PER_DAY = 12 * 60; // 12 real minutes = 1 game day
const START_HOUR = 7.5;

export class TimeOfDay {
  constructor() {
    this.time = START_HOUR * 60; // minutes
    this.day = 1;
    this.season = 'Spring';
    this.t = 0;
    this.hour = START_HOUR;
    this.minute = 0;
    this.lightLevel = 1;
  }

  update(dt) {
    this.t += dt;
    this.time += dt * (24 * 60 / SECONDS_PER_DAY);
    if (this.time >= 24 * 60) {
      this.time -= 24 * 60;
      this.day++;
      const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
      this.season = seasons[Math.floor((this.day - 1) / 7) % 4];
    }
    this.hour = Math.floor(this.time / 60);
    this.minute = Math.floor(this.time % 60);
    // 1.0 at noon, ~0 at midnight, smooth
    const a = (this.time / (24 * 60)) * Math.PI * 2 - Math.PI / 2;
    this.lightLevel = Math.max(0, Math.sin(a));
  }

  isNight() { return this.hour < 6 || this.hour >= 20; }
  isGoldenHour() { return (this.hour >= 5 && this.hour < 7) || (this.hour >= 17 && this.hour < 19); }

  formatTime() {
    return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
  }
  formatDate() {
    return `${this.season} ${this.day}`;
  }
}
