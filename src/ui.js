// UI — HUD updates, dialogue rendering, toast notifications.

import { ITEMS } from './inventory.js';

export class UI {
  constructor(modules) {
    this.modules = modules;
    this.hudDate = document.getElementById('hud-date');
    this.hudClock = document.getElementById('hud-clock');
    this.hudBells = document.getElementById('hud-bells');
    this.dialogue = document.getElementById('dialogue');
    this.dialogueName = document.getElementById('dialogue-name');
    this.dialogueText = document.getElementById('dialogue-text');
    this.toastEl = document.getElementById('toast');
    this.interactPrompt = document.getElementById('interact-prompt');
    this.toastTimer = 0;

    this._bindSlotClicks();
    this._wireKeyboard();
  }

  _bindSlotClicks() {
    document.querySelectorAll('.slot').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.slot, 10);
        this.modules.inventory.setActive(idx);
        this.refresh();
        this.modules.audio.blip(520);
      });
    });
  }

  _wireKeyboard() {
    window._input = window._input || {};
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup')    window._input.up = true;
      if (k === 's' || k === 'arrowdown')  window._input.down = true;
      if (k === 'a' || k === 'arrowleft')  window._input.left = true;
      if (k === 'd' || k === 'arrowright') window._input.right = true;
      if (k === 'shift') window._input.run = true;
      if (k === 'e' || k === ' ' || k === 'enter') window._input.action = true;
      if (k === '1') this.modules.inventory.setActive(0);
      if (k === '2') this.modules.inventory.setActive(1);
      if (k === '3') this.modules.inventory.setActive(2);
      if (k === '4') this.modules.inventory.setActive(3);
      if (k === 'tab') { e.preventDefault(); this.modules.inventory.nextSlot(); }
      if (k === 'escape') this.hideDialogue();
      this.refresh();
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup')    window._input.up = false;
      if (k === 's' || k === 'arrowdown')  window._input.down = false;
      if (k === 'a' || k === 'arrowleft')  window._input.left = false;
      if (k === 'd' || k === 'arrowright') window._input.right = false;
      if (k === 'shift') window._input.run = false;
      if (k === 'e' || k === ' ' || k === 'enter') window._input.action = false;
    });
  }

  refresh() {
    // Slot icons
    document.querySelectorAll('.slot').forEach(el => {
      const idx = parseInt(el.dataset.slot, 10);
      const s = this.modules.inventory.slots[idx];
      if (s) {
        const it = ITEMS[s.id];
        if (it) {
          el.firstChild.nodeValue = it.icon;
          el.title = `${it.name}${s.count > 1 ? ' ×' + s.count : ''}`;
        }
      }
      el.classList.toggle('active', idx === this.modules.inventory.active);
    });
  }

  update(dt) {
    const { time, inventory, save, ui } = this.modules;
    this.hudClock.textContent = time.formatTime();
    this.hudDate.textContent = time.formatDate();
    this.hudBells.textContent = inventory.bells;

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }

    // Autosave every ~10 seconds
    ui._autosaveTimer = (ui._autosaveTimer || 0) + dt;
    if (ui._autosaveTimer > 10) {
      ui._autosaveTimer = 0;
      save.save(this.modules);
    }
  }

  showDialogue(name, text) {
    this.dialogueName.textContent = name;
    this.dialogueText.textContent = text;
    this.dialogue.classList.add('show');
  }
  hideDialogue() {
    this.dialogue.classList.remove('show');
  }

  showInteractPrompt(text) {
    this.interactPrompt.textContent = text;
    this.interactPrompt.classList.add('show');
  }
  hideInteractPrompt() {
    this.interactPrompt.classList.remove('show');
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = 2.0;
  }
}
