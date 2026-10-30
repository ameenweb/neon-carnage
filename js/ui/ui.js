import { WEAPONS } from '../config.js';
import { formatTime } from '../core/utils.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.returnTo = 'menu';
    this.statusTimer = 0;
    this.toastTimer = 0;
    this.el = {
      screens: document.querySelectorAll('.screen'),
      hud: $('hud'),
      crosshair: $('crosshair'),
      scanlines: $('scanlines'),
      weapon: $('hud-weapon'),
      ammo: $('hud-ammo'),
      reserve: $('hud-reserve'),
      kills: $('hud-kills'),
      total: $('hud-total'),
      remaining: $('hud-remaining'),
      objective: $('hud-objective'),
      score: $('hud-score'),
      combo: $('hud-combo'),
      status: $('hud-status'),
      reload: $('hud-reload'),
      reloadFill: $('hud-reload-fill'),
      toast: $('toast'),
      flash: $('screen-flash'),
      grade: $('vic-grade'),
      vicKills: $('vic-kills'),
      vicTime: $('vic-time'),
      vicAcc: $('vic-acc'),
      vicDeaths: $('vic-deaths'),
      vicScore: $('vic-score'),
      deathKills: $('death-kills'),
      deathTime: $('death-time'),
      deathScore: $('death-score'),
    };
    this._cache = {};
    this._bind();
    this.applySettingsToDOM();
  }

  _bind() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      this.game.audio.init();
      this.game.audio.play('uiClick');
      this._action(btn.dataset.action);
      e.preventDefault();
    });

    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        if (this.game.audio.ready) this.game.audio.play('uiMove');
      });
    });

    document.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.toggle;
        const s = this.game.settings;
        const next = !s[key];
        this.game.applySettings({ [key]: next });
        this.applySettingsToDOM();
        this.game.audio.play('uiClick');
      });
    });

    const onRange = (id, key) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = Number(el.value) / 100;
        this.game.applySettings({ [key]: v });
        $(id + '-val').textContent = `${el.value}%`;
      });
    };
    onRange('set-music', 'music');
    onRange('set-sfx', 'sfx');
  }

  _action(action) {
    const game = this.game;
    switch (action) {
      case 'start': game.startGame(); break;
      case 'continue': game.resume(); break;
      case 'restart': game.restart(); break;
      case 'menu': game.toMenu(); break;
      case 'pause': game.pause(); break;
      case 'controls': this.show('controls'); break;
      case 'credits': this.show('credits'); break;
      case 'settings':
        this.returnTo = this.current === 'pause' ? 'pause' : 'menu';
        this.show('settings');
        break;
      case 'back': this.show(this.returnTo || 'menu'); break;
      case 'resume': game.resume(); break;
      default: break;
    }
  }

  show(name) {
    this.current = name;
    this.el.screens.forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
    const playing = this.game.state === 'playing';
    this.setHudVisible(playing && name === null);
    this.el.crosshair.classList.toggle('visible', playing && name === null);
    document.body.classList.toggle('menu-open', name !== null);
    document.body.classList.toggle('in-game', playing && name === null);
    if (name === 'settings') this.applySettingsToDOM();
  }

  hideAll() { this.show(null); }

  setHudVisible(v) {
    this.el.hud.classList.toggle('hidden', !v);
  }

  applySettingsToDOM() {
    const s = this.game.settings;
    const music = $('set-music');
    const sfx = $('set-sfx');
    if (music) {
      music.value = Math.round(s.music * 100);
      $('set-music-val').textContent = `${Math.round(s.music * 100)}%`;
    }
    if (sfx) {
      sfx.value = Math.round(s.sfx * 100);
      $('set-sfx-val').textContent = `${Math.round(s.sfx * 100)}%`;
    }
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      const on = !!s[b.dataset.toggle];
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('on', on);
    });
    this.el.scanlines.classList.toggle('hidden', !s.scanlines);
  }

  setStatus(text) {
    if (!text) {
      this.statusTimer = 0;
      this.el.status.classList.add('hidden');
      return;
    }
    this.el.status.textContent = text;
    this.el.status.classList.remove('hidden');
    this.statusTimer = 2.3;
  }

  flashStatus() {
    const el = this.el.status;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  toast(text, duration = 2.6) {
    this.el.toast.textContent = text;
    this.el.toast.classList.remove('hidden');
    this.el.toast.classList.remove('pop');
    void this.el.toast.offsetWidth;
    this.el.toast.classList.add('pop');
    this.toastTimer = duration;
  }

  pulseCrosshair() {
    this.el.crosshair.classList.remove('kick');
    void this.el.crosshair.offsetWidth;
    this.el.crosshair.classList.add('kick');
  }

  update(dt) {
    if (this.statusTimer > 0) {
      this.statusTimer -= dt;
      if (this.statusTimer <= 0) this.el.status.classList.add('hidden');
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.classList.add('hidden');
    }
    this.updateHUD();
  }

  updateCrosshair(x, y, active) {
    if (!active) {
      this.el.crosshair.classList.remove('visible');
      return;
    }
    this.el.crosshair.classList.add('visible');
    this.el.crosshair.style.transform = `translate(${x}px, ${y}px)`;
  }

  _set(key, el, value) {
    if (!el) return;
    if (this._cache[key] === value) return;
    this._cache[key] = value;
    el.textContent = value;
  }

  updateHUD() {
    const game = this.game;
    if (!game || game.state !== 'playing' || !game.player) return;
    const p = game.player;
    const stats = game.stats;
    const def = p.weaponDef || WEAPONS.fists;

    this._set('weapon', this.el.weapon, def.name);
    this.el.weapon.classList.toggle('melee', !!def.melee);

    if (def.melee) {
      this._set('ammo', this.el.ammo, '—');
      this._set('reserve', this.el.reserve, '');
    } else if (p.gun) {
      this._set('ammo', this.el.ammo, String(p.gun.mag));
      this._set('reserve', this.el.reserve, `/${p.gun.reserve}`);
    }

    this.el.ammo.classList.toggle('low', !def.melee && p.gun && p.gun.mag <= Math.max(1, Math.ceil(def.mag * 0.25)));

    const remaining = game.enemiesAlive();
    this._set('objective', this.el.objective, remaining > 0 ? 'ELIMINATE THE STAFF' : 'GET TO THE EXIT');
    this._set('remaining', this.el.remaining,
      remaining > 0 ? `${remaining} HOSTILE${remaining === 1 ? '' : 'S'} REMAIN` : 'ALL CLEAR');
    this._set('kills', this.el.kills, String(stats.kills));
    this._set('total', this.el.total, String(game.initialEnemyCount));
    this._set('score', this.el.score, stats.liveScore.toLocaleString('en-US'));

    const combo = stats.combo;
    if (combo >= 2) {
      this.el.combo.classList.remove('hidden');
      if (this._cache.combo !== combo) {
        this._cache.combo = combo;
        this.el.combo.textContent = `x${combo} COMBO`;
        this.el.combo.classList.remove('pop');
        void this.el.combo.offsetWidth;
        this.el.combo.classList.add('pop');
      }
    } else {
      this.el.combo.classList.add('hidden');
      this._cache.combo = 0;
    }

    if (p.reloadT > 0) {
      this.el.reload.classList.remove('hidden');
      const pct = 1 - p.reloadT / Math.max(0.01, p.reloadTotal);
      this.el.reloadFill.style.width = `${Math.round(pct * 100)}%`;
    } else if (!this.el.reload.classList.contains('hidden')) {
      this.el.reload.classList.add('hidden');
    }
  }

  showMenu() {
    this.show('menu');
    this.setHudVisible(false);
    this.el.crosshair.classList.remove('visible');
  }

  showDeath(stats) {
    this.setHudVisible(false);
    this.el.crosshair.classList.remove('visible');
    this.el.deathKills.textContent = String(stats.kills);
    this.el.deathTime.textContent = formatTime(stats.elapsed);
    this.el.deathScore.textContent = stats.killScore.toLocaleString('en-US');
    this.show('death');
  }

  showVictory(stats) {
    this.setHudVisible(false);
    this.el.crosshair.classList.remove('visible');
    this._set('vickills', this.el.vicKills, String(stats.kills));
    this._set('victime', this.el.vicTime, formatTime(stats.elapsed));
    this._set('vicacc', this.el.vicAcc, `${Math.round(stats.accuracy * 100)}%`);
    this._set('vicdeaths', this.el.vicDeaths, String(stats.deaths));
    this._set('vicscore', this.el.vicScore, stats.finalScore.toLocaleString('en-US'));
    this.el.grade.textContent = stats.grade;
    this.el.grade.dataset.grade = stats.grade;
    this.show('victory');
  }
}
