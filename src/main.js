// Willowbrook — bootstrap & game loop.
// Each module owns one thing so sub-agents can swap pieces in isolation.

import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { Villagers } from './npc.js';
import { Buildings } from './buildings.js';
import { TimeOfDay } from './time.js';
import { Audio } from './audio.js';
import { Inventory } from './inventory.js';
import { UI } from './ui.js';
import { Interactions } from './interactions.js';
import { Save } from './save.js';
import { Particles } from './particles.js';
import { Weather } from './weather.js';
import { Interiors } from './interiors.js';
import { Cutscene } from './cutscene.js';

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6cb8e0); // sky blue, will be retinted by time
    this.scene.fog = new THREE.Fog(0x9bd1e6, 80, 220);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, 12, 14);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.running = false;
    this.modules = {};

    window.addEventListener('resize', () => this.onResize());
  }

  async init() {
    console.log('[init] start');
    // Order matters: world provides ground, then everything else parents to it.
    const world = new World(this.scene);
    console.log('[init] world created');
    this.modules.world = world;
    console.log('[init] world assigned');

    const time = new TimeOfDay();
    this.modules.time = time;

    const audio = new Audio();
    this.modules.audio = audio;

    const weather = new Weather(this.scene);
    this.modules.weather = weather;

    const particles = new Particles(this.scene);
    this.modules.particles = particles;

    const buildings = new Buildings(this.scene, world);
    this.modules.buildings = buildings;

    const villagers = new Villagers(this.scene, world, buildings);
    this.modules.villagers = villagers;

    const player = new Player(this.scene, world);
    this.modules.player = player;

    const inventory = new Inventory();
    this.modules.inventory = inventory;

    const ui = new UI(this.modules);
    this.modules.ui = ui;

    const save = new Save();
    this.modules.save = save;
    save.load(this.modules);

    const interactions = new Interactions(this.modules);
    this.modules.interactions = interactions;

    const interiors = new Interiors(this.scene, this.modules);
    this.modules.interiors = interiors;
    // When interior wants to exit, hand off to the main game
    interiors.modules.onExitToWorld = () => {
      // Save player position so we can restore after re-init
      this._savedPlayerPos = this.modules.player.position.clone();
      // Tear down and re-init the world parts
      this.reenterWorld();
    };

    const cutscene = new Cutscene();
    this.modules.cutscene = cutscene;

    // Camera follows the player
    this.cameraTarget = new THREE.Vector3();

    // Build out the world
    world.populate();
    buildings.spawn();
    villagers.spawn();
    player.spawn(new THREE.Vector3(0, 0, 4));

    // Sync initial state to UI
    ui.refresh();

    this.running = true;
    this.loop();
  }

  // Re-init from a clean state — used when exiting an interior.
  reenterWorld() {
    // Wipe scene
    while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    // Reset modules but keep audio + ui + save + time + inventory
    this.modules.world = new World(this.scene);
    this.modules.world.populate();
    this.modules.player = new Player(this.scene, this.modules.world);
    this.modules.player.spawn(this._savedPlayerPos || new THREE.Vector3(0, 0, 4));
    this.modules.villagers = new Villagers(this.scene, this.modules.world, this.modules.buildings);
    this.modules.villagers.spawn();
    this.modules.weather = new Weather(this.scene);
    this.modules.particles = new Particles(this.scene);
    this.modules.interactions = new Interactions(this.modules);
    // Hook the exit handler
    this.modules.onExitToWorld = null;
    this.modules.interiors = null;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());

    const dt = Math.min(this.clock.getDelta(), 1 / 30); // cap dt for stability
    const t = this.clock.elapsedTime;

    // Auto-shot trigger — fired once the world is settled (or interiors have swapped in)
    if (this._shotPending) {
      const s = this._shotPending;
      const ready = !this.modules.interiors || this.modules.interiors.active !== null;
      if (ready) {
        this.renderer.render(this.scene, this.camera);
        const data = this.renderer.domElement.toDataURL('image/png');
        document.body.innerHTML = `<img id="shot" src="${data}" style="display:block;width:100vw;height:100vh;object-fit:cover;background:#6cb8e0">`;
        document.body.style.background = '#6cb8e0';
        document.title = `WB_SHOT_${s}`;
        this._shotPending = null;
      }
    }

    try {

    const { time, world, player, villagers, buildings, audio, ui, particles, weather, interactions, inventory } = this.modules;

    time.update(dt);
    if (weather) weather.update(dt, time);
    if (particles) particles.update(dt, time);
    if (audio) audio.update(dt, time, world);

    if (this.modules.interiors && this.modules.interiors.isInside()) {
      // Inside: skip world module updates, only handle interactions + UI + fade
      if (interactions) interactions.update(dt);
      if (ui) ui.update(dt);
      this.modules.interiors.update(dt);
      // Interior camera: lower and closer, looking at the back of the room
      this.camera.position.set(0, 4, 6);
      this.camera.lookAt(0, 1.2, -3);
    } else {
      // Outside: full update
      if (world) world.update(dt, time);
      if (player) player.update(dt, time);
      if (villagers) villagers.update(dt, time);
      if (buildings) buildings.update(dt, time);
      if (interactions) interactions.update(dt);
      if (ui) ui.update(dt);
      if (this.modules.interiors) this.modules.interiors.update(dt);

      // Camera follow with damping
      if (player) {
        this.cameraTarget.lerp(player.cameraAnchor(), 0.08);
        const camOffset = new THREE.Vector3(0, 9, 10);
        this.camera.position.lerp(this.cameraTarget.clone().add(camOffset), 0.1);
        this.camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 0, -4)));
      }
      // Apply lighting from time of day
      if (world) world.applyLighting(this.scene, time);
    }

    this.renderer.render(this.scene, this.camera);
    } catch (e) {
      console.error('[loop] body failed', e.message, e.stack);
    }
  }
}

const game = new Game();
console.log('[willowbrook] main.js loaded');

// Dev / critic hook: auto-start with ?autostart so headless screenshots skip the splash.
const params = new URLSearchParams(location.search);
if (params.has('autostart')) {
  const start = async () => {
    console.log('[willowbrook] autostart begin');
    document.getElementById('splash').style.display = 'none';
    if (!game.running) await game.init();
    const setHour = parseFloat(params.get('hour'));
    if (!Number.isNaN(setHour)) game.modules.time.time = setHour * 60;
    const setX = parseFloat(params.get('x'));
    const setZ = parseFloat(params.get('z'));
    if (!Number.isNaN(setX) && !Number.isNaN(setZ)) {
      game.modules.player.position.set(setX, 0, setZ);
      game.modules.player._snapToGround();
    }
    // Auto-enter an interior for screenshots
    const enter = params.get('enter');
    if (enter && game.modules.interiors) {
      // For headless shots, skip the fade — swap immediately
      if (params.get('nofade')) {
        game.modules.interiors._swapToInterior(enter);
        game.modules.interiors.active = enter;
      } else {
        game.modules.interiors.enter(enter);
      }
    }
    // Schedule a shot — the loop will fire it once the swap is done.
    const shot = params.get('shot');
    if (shot) {
      game._shotPending = shot;
    }
    console.log('[willowbrook] autostart complete');
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}

document.getElementById('start-btn').addEventListener('click', async () => {
  // Hide splash immediately; init world behind the cutscene so it's ready when video ends.
  const splash = document.getElementById('splash');
  splash.classList.add('hidden');
  if (!game.running) await game.init();
  try { await game.modules.audio.start(); } catch (e) {}
  // Play intro cutscene; game picks up where it left off.
  await game.modules.cutscene.play('videos/v2-intro.mp4', {
    title: 'Welcome to Willowbrook',
    minDuration: 1500,
  });
});
// Also allow pressing Enter to start
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !game.running) {
    document.getElementById('start-btn').click();
  }
});

// Expose game for debugging
window.willowbrook = game;

// Headless screenshot helpers — invoked from CDP via Runtime.evaluate
window.willowbrook.captureHelpers = {
  setHour(h) { game.modules.time.time = h * 60; },
  teleport(x, z, facing = 0) {
    game.modules.player.position.set(x, 0, z);
    game.modules.player._snapToGround();
    game.modules.player.facing = facing;
  },
  waitFrames(n = 30) { return new Promise(r => {
    let i = 0; const f = () => { if (++i >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f);
  }); },
  // Take a shot by replacing the page with the canvas image, so headless --screenshot works.
  async shot(name = 'shot') {
    // Force an explicit render so the canvas is fresh even if RAF hasn't fired.
    try {
      game.renderer.render(game.scene, game.camera);
    } catch (e) { /* ignore */ }
    await new Promise(r => setTimeout(r, 100));
    const data = game.renderer.domElement.toDataURL('image/png');
    document.body.innerHTML = `<img id="shot" src="${data}" style="display:block;width:100vw;height:100vh;object-fit:cover;background:#6cb8e0">`;
    document.body.style.background = '#6cb8e0';
    document.title = `WB_SHOT_${name}`;
  },
};
