import {
  AI, DEFAULT_SETTINGS, SETTINGS_KEY, TILE, VIEW, WEAPONS,
} from '../config.js';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { dist, rand } from './utils.js';
import { Renderer } from '../render/renderer.js';
import { Lighting } from '../render/lighting.js';
import { Particles, Effects } from '../render/particles.js';
import { AudioSystem } from '../systems/audio.js';
import { RunStats } from '../systems/score.js';
import { Level } from '../world/level.js';
import { LAST_CALL } from '../world/levels/lastcall.js';
import { Player } from '../entities/player.js';
import { Enemy } from '../entities/enemy.js';
import { UI } from '../ui/ui.js';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'menu';
    this.settings = loadSettings();

    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.camera = new Camera(64 * TILE, 52 * TILE);
    this.audio = new AudioSystem();
    this.audio.applySettings(this.settings);
    this.particles = new Particles(AI.maxParticles);
    this.effects = new Effects();
    this.lighting = new Lighting();
    this.ui = new UI(this);

    this.hitstopT = 0;
    this.slowmoT = 0;
    this.flash = 0;
    this.deathTimer = 0;
    this.sessionDeaths = 0;
    this.menuT = 0;
    this._drawList = [];
    this.initialEnemyCount = 0;
    this.stats = new RunStats(0);
    this.player = null;
    this.level = null;
    this.enemies = [];

    this.startAttract();
    this.ui.showMenu();
  }

  // -------------------------------------------------------------------------
  // Flow
  // -------------------------------------------------------------------------
  startAttract() {
    this.level = new Level(this, LAST_CALL);
    this.tilemap = this.level.tm;
    this.camera.setBounds(this.level.widthPx, this.level.heightPx);
    this.camera.snapTo(21 * TILE, 26 * TILE);
    this.enemies = this.level.enemySpawns.map((e) =>
      new Enemy(this, e.type, e.x, e.y, e.patrol));
    this.initialEnemyCount = this.enemies.length;
    this.player = new Player(this, this.level.playerSpawn.x, this.level.playerSpawn.y, this.level.playerSpawn.angle);
    this.stats = new RunStats(this.initialEnemyCount);
    this.particles.clear();
    this.effects.clear();
    this.menuT = 0;
  }

  startGame() {
    this.audio.init();
    this.audio.startMusic();
    this.sessionDeaths = 0;
    this.newGame();
  }

  newGame() {
    this.level = new Level(this, LAST_CALL);
    this.tilemap = this.level.tm;
    this.player = new Player(this, this.level.playerSpawn.x, this.level.playerSpawn.y, this.level.playerSpawn.angle);
    this.enemies = this.level.enemySpawns.map((e) =>
      new Enemy(this, e.type, e.x, e.y, e.patrol));
    this.initialEnemyCount = this.enemies.length;
    this.stats = new RunStats(this.initialEnemyCount);
    this.stats.deaths = this.sessionDeaths;

    this.camera.setBounds(this.level.widthPx, this.level.heightPx);
    this.camera.snapTo(this.player.x, this.player.y);
    this.camera.shake = 0;

    this.particles.clear();
    this.effects.clear();
    this.hitstopT = 0;
    this.slowmoT = 0;
    this.flash = 0;
    this.deathTimer = 0;

    this.state = 'playing';
    this.ui._cache = {};
    this.ui.hideAll();
    this.ui.setStatus(null);
    this.ui.el.toast.classList.add('hidden');
    this.input.clear();
    this.audio.setPaused(false);
    this.audio.setIntensity(0.28);
    this.input.mouse.pressed = false;
  }

  restart() {
    if (this.state === 'menu') { this.startGame(); return; }
    this.audio.init();
    this.audio.startMusic();
    this.newGame();
  }

  toMenu() {
    this.state = 'menu';
    this.audio.stopMusic();
    this.audio.setPaused(false);
    this.sessionDeaths = 0;
    this.startAttract();
    this.ui.showMenu();
  }

  pause() {
    if (this.state !== 'playing') return;
    if (!this.player || this.player.dead) return;
    this.state = 'paused';
    this.ui.show('pause');
    this.audio.setPaused(true);
    this.input.clear();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.hideAll();
    this.audio.setPaused(false);
    this.input.clear();
    this.input.mouse.pressed = false;
  }

  applySettings(patch) {
    Object.assign(this.settings, patch);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) { /* ignore */ }
    this.audio.applySettings(this.settings);
    document.body.classList.toggle('scanlines-off', !this.settings.scanlines);
  }

  // -------------------------------------------------------------------------
  // Loop
  // -------------------------------------------------------------------------
  frame(dt) {
    this.audio.update(dt);
    this._globalKeys();
    this.update(dt);
    this.render();
    this.ui.update(dt);
    const playing = this.state === 'playing' && !this.ui.current && this.player && !this.player.dead;
    this.ui.updateCrosshair(this.input.mouse.clientX, this.input.mouse.clientY, playing);
    this.input.endFrame();
  }

  _globalKeys() {
    if (this.input.wasPressed('mute')) {
      this.applySettings({ muted: !this.settings.muted });
      this.ui.applySettingsToDOM();
      this.ui.setStatus(this.settings.muted ? 'AUDIO MUTED' : 'AUDIO ON');
    }
    if (this.input.wasPressed('pause')) {
      const sub = this.ui.current && this.ui.current !== 'pause' &&
        this.ui.current !== 'death' && this.ui.current !== 'victory';
      if (sub) {
        this.ui.show(this.ui.returnTo || 'menu');
      } else if (this.state === 'playing') {
        this.pause();
      } else if (this.state === 'paused') {
        this.resume();
      }
    }
    if (this.input.wasPressed('restart')) {
      if (this.state === 'dead' || this.state === 'victory') this.restart();
      else if (this.state === 'menu' && this.ui.current === 'menu') this.startGame();
    }
  }

  update(dt) {
    const real = Math.min(dt, 0.05);
    this.flash = Math.max(0, this.flash - real * 2.4);

    if (this.state === 'playing') this._updatePlay(real);
    else if (this.state === 'menu') this._updateMenu(real);
    else if (this.state === 'paused') { /* frozen */ }
    else {
      this.effects.update(real * 0.4);
      this.particles.update(real * 0.4);
    }
  }

  _updateMenu(dt) {
    this.menuT += dt;
    this.level.update(dt * 0.5);
    this.particles.update(dt * 0.5);
    this.effects.update(dt * 0.5);

    const cx = 21 * TILE + Math.sin(this.menuT * 0.11) * 130;
    const cy = 26 * TILE + Math.cos(this.menuT * 0.085) * 55;
    this.camera.x = cx;
    this.camera.y = cy;
    this.camera.offsetX = 0;
    this.camera.offsetY = 0;

    if (Math.random() < dt * 3) {
      this.particles.dust(rand(8 * TILE, 36 * TILE), rand(16 * TILE, 34 * TILE), 1);
    }
  }

  _updatePlay(dt) {
    // hit-stop & slow motion use real time
    if (this.hitstopT > 0) this.hitstopT -= dt;
    if (this.slowmoT > 0) this.slowmoT -= dt;

    let scale = this.slowmoT > 0 ? 0.32 : 1;
    if (this.hitstopT > 0) scale *= 0.06;
    const sdt = dt * scale;

    this.level.update(sdt);
    this.player.update(sdt);
    for (const e of this.enemies) e.update(sdt);

    // clear dead from the active list (corpses live in the level)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].dead) this.enemies.splice(i, 1);
    }

    this.particles.update(sdt);
    this.effects.update(sdt);

    if (!this.player.dead) {
      this.stats.update(sdt);
      this.camera.update(dt, this.player.x, this.player.y, this.player.angle, this.settings.shake);
      if (this.level.onExit(this.player.x, this.player.y) && this.enemiesAlive() === 0) {
        this.winLevel();
      }
    } else {
      this.deathTimer -= dt;
      this.camera.update(dt, this.player.x, this.player.y, this.player.deathAngle, this.settings.shake);
      if (this.deathTimer <= 0 && this.state === 'playing') {
        this.state = 'dead';
        this.ui.showDeath(this.stats);
        this.audio.setPaused(true);
      }
    }

    // combat-intensity score
    let alerted = 0;
    for (const e of this.enemies) {
      if (e.aware && !e.dead) alerted++;
    }
    const target = this.player.dead ? 0.1 : 0.26 + Math.min(1, alerted / 3) * 0.74;
    this.audio.setIntensity(target);
  }

  // -------------------------------------------------------------------------
  // World events
  // -------------------------------------------------------------------------
  enemiesAlive() {
    let n = 0;
    for (const e of this.enemies) if (!e.dead) n++;
    return n;
  }

  emitNoise(x, y, radius, kind = 'shot') {
    for (const e of this.enemies) {
      if (!e.dead) e.onNoise(x, y, radius, kind);
    }
  }

  alertNearby(src, radius) {
    for (const e of this.enemies) {
      if (e === src || e.dead || e.aware) continue;
      const d = dist(e.x, e.y, src.x, src.y);
      if (d <= radius) e.onNoise(src.x, src.y, radius, 'shout');
    }
  }

  hitstop(seconds) {
    this.hitstopT = Math.max(this.hitstopT, seconds);
  }

  killEnemy(enemy, angle, source = 'shot') {
    if (enemy.dead) return;
    enemy.dead = true;
    const def = enemy.def;
    const combo = this.stats.registerKill(def.score);
    const points = Math.round(def.score * combo);

    this.level.addBlood(enemy.x, enemy.y, angle, this.settings.blood ? 16 : 0);
    if (this.settings.blood) {
      this.particles.blood(enemy.x, enemy.y, angle, 16, 150);
      this.particles.ring(enemy.x, enemy.y, '#F04452', 3, 0.2);
    }
    this.level.addCorpse(enemy.x, enemy.y, angle + Math.PI / 2 + rand(-0.45, 0.45), enemy.corpseVariant);
    this.effects.popup(enemy.x, enemy.y - 13, `+${points}`,
      combo >= 2 ? '#FF287F' : '#FFE6C7', combo >= 3 ? 9 : 8);
    this.audio.play('death');
    this.camera.addShake(2.4);
    this.hitstop(0.05);
    this.flash = Math.max(this.flash, 0.1);

    if (Math.random() < (def.dropChance ?? 1)) {
      if (def.weapon === 'bat') {
        this.level.spawnPickup({ type: 'weapon', weapon: 'bat', x: enemy.x, y: enemy.y }, true);
      } else {
        const wdef = WEAPONS[def.weapon];
        this.level.spawnPickup({
          type: 'weapon', weapon: def.weapon,
          x: enemy.x, y: enemy.y,
          mag: Math.max(1, Math.ceil(wdef.mag * 0.7)),
          reserve: Math.max(0, Math.floor(wdef.reserve * 0.5)),
        }, true);
      }
    }

    if (this.enemiesAlive() === 0 && this.state === 'playing') {
      this.level.openExit();
      this.audio.play('uiClick');
      this.ui.toast('EXIT UNLOCKED — GET OUT', 3.2);
      this.ui.setStatus('ALL HOSTILES ELIMINATED');
      this.audio.setIntensity(1);
    }
  }

  killPlayer(player, angle) {
    if (!player || player.dead) return;
    player.dead = true;
    player.deathT = 0;
    player.deathAngle = angle + Math.PI;
    this.onPlayerDeath(angle);
  }

  onPlayerDeath(angle) {
    this.sessionDeaths++;
    this.stats.deaths = this.sessionDeaths;
    const p = this.player;
    this.level.addBlood(p.x, p.y, angle, this.settings.blood ? 26 : 0);
    if (this.settings.blood) {
      this.particles.blood(p.x, p.y, angle, 24, 170);
      this.particles.ring(p.x, p.y, '#F04452', 4, 0.35);
    }
    this.camera.addShake(7);
    this.audio.play('playerDeath');
    this.audio.setIntensity(0.08);
    this.flash = 1;
    this.hitstop(0.12);
    this.slowmoT = 1.3;
    this.deathTimer = 1.7;
    this.ui.setStatus(null);
  }

  winLevel() {
    if (this.state !== 'playing') return;
    this.state = 'victory';
    this.stats.finish(this.sessionDeaths);
    this.audio.play('win');
    this.audio.setPaused(true);
    this.effects.popup(this.player.x, this.player.y - 20, 'EXTRACTED', '#35E0E8', 10);
    this.ui.showVictory(this.stats);
    this.input.clear();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  render() {
    const r = this.renderer;
    const ctx = r.sctx;
    r.clear();
    if (!this.level) { r.present(); return; }

    const cam = this.camera;
    ctx.save();
    ctx.translate(-cam.left, -cam.top);
    this.level.drawBase(ctx, cam);
    this.level.drawDoors(ctx);
    this.level.drawPickups(ctx);

    // y-sorted entities (player hidden in attract mode)
    const list = this._drawList;
    list.length = 0;
    for (const e of this.enemies) if (!e.dead) list.push(e);
    if (this.state !== 'menu' && this.player) list.push(this.player);
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.draw(ctx, this.level.time);

    this.particles.draw(ctx, this.settings.blood);
    if (this.state === 'playing' && this.player && !this.player.dead) this._drawPrompt(ctx);
    ctx.restore();

    const darkness = this.state === 'menu' ? 0.68 : 0.66;
    const extra = this.level.getExtraLights();
    if (this.state === 'menu') {
      extra.push({ x: cam.x, y: cam.y, radius: 150, intensity: 0.4 });
    }
    this.lighting.render(ctx, cam, this.level, this.state === 'menu' ? null : this.player, darkness, extra);
    this.lighting.drawSigns(ctx, cam, this.level);

    // bright effects above the darkness
    ctx.save();
    ctx.translate(-cam.left, -cam.top);
    this.effects.drawWorld(ctx);
    ctx.restore();

    r.drawVignette();

    if (this.flash > 0.002) {
      ctx.fillStyle = `rgba(240,68,82,${this.flash * 0.28})`;
      ctx.fillRect(0, 0, VIEW.W, VIEW.H);
    }

    r.present();
  }

  _drawPrompt(ctx) {
    const p = this.player;
    if (!p || p.dead) return;
    let text = null;
    let x = 0, y = 0;

    const door = this.level.nearestDoor(p.x, p.y, 30);
    if (door && door.closed) {
      text = 'E  OPEN';
      x = door.px + 8;
      y = door.py - 8;
    } else {
      const pickup = this.level.nearestPickup(p.x, p.y, 28);
      if (pickup) {
        const def = WEAPONS[pickup.weapon];
        text = pickup.kind === 'ammo'
          ? `E  TAKE ${def.ammoName}`
          : `E  TAKE ${def.name}`;
        x = pickup.x;
        y = pickup.y - 15;
      } else if (this.level.exitOpen && this.level.onExit(p.x, p.y)) {
        text = 'E  ESCAPE';
        x = p.x;
        y = p.y - 24;
      }
    }
    if (!text) return;

    ctx.font = '6px Silkscreen, monospace';
    const w = ctx.measureText(text).width + 8;
    const bx = Math.round(x - w / 2);
    const by = Math.round(y - 8);
    ctx.fillStyle = 'rgba(8,6,14,0.82)';
    ctx.fillRect(bx, by, w, 11);
    ctx.strokeStyle = 'rgba(255,40,127,0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 10);
    ctx.fillStyle = '#FFE6C7';
    ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(x), by + 8);
    ctx.textAlign = 'left';
  }
}

