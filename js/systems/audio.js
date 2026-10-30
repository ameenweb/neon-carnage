import { damp } from '../core/utils.js';

/**
 * Fully synthesised audio. No sample files, no network requests.
 * All calls are guarded so the game is fully playable with audio disabled.
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.supported = typeof window !== 'undefined' &&
      !!(window.AudioContext || window.webkitAudioContext);
    this.ready = false;
    this.settings = { music: 0.55, sfx: 0.75, muted: false };
    this.musicPlaying = false;
    this.paused = false;
    this.intensity = 0.2;
    this.targetIntensity = 0.2;
    this.step = 0;
    this.nextStepTime = 0;
    this.bpm = 122;
    this.stepDur = 60 / this.bpm / 4;
    this.noiseBuffer = null;
    this._duck = 1;
  }

  init() {
    if (this.ready) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    if (!this.supported) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const ctx = this.ctx;

      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.18;

      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = 0.7;

      // shared delay send for the arp
      this.delay = ctx.createDelay(0.6);
      this.delay.delayTime.value = 0.28;
      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.value = 0.28;
      this.delayWet = ctx.createGain();
      this.delayWet.gain.value = 0.32;
      this.delay.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delay);
      this.delay.connect(this.delayWet);
      this.delayWet.connect(this.musicGain);

      this.musicGain.connect(this.compressor);
      this.sfxGain.connect(this.compressor);
      this.compressor.connect(this.master);
      this.master.connect(ctx.destination);

      // 1 second of white noise, reused by every noise-based sound
      const len = Math.floor(ctx.sampleRate);
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      this.ready = true;
      this.applySettings(this.settings);
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (err) {
      console.warn('[audio] unavailable', err);
      this.supported = false;
    }
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  applySettings(s) {
    this.settings = { ...this.settings, ...s };
    if (!this.ready) return;
    try {
      const t = this.now();
      const m = this.settings.muted ? 0 : 1;
      this.master.gain.setTargetAtTime(m, t, 0.04);
      const mv = Math.pow(this.settings.music, 1.5) * 0.85;
      const sv = Math.pow(this.settings.sfx, 1.5);
      this.musicGain.gain.setTargetAtTime(mv, t, 0.06);
      this.sfxGain.gain.setTargetAtTime(sv, t, 0.04);
    } catch (e) { /* ignore */ }
  }

  // -------------------------------------------------------------------------
  // Music
  // -------------------------------------------------------------------------
  startMusic() {
    if (!this.ready) return;
    this.musicPlaying = true;
    this.paused = false;
    this.step = 0;
    this.nextStepTime = this.now() + 0.08;
    this.intensity = 0.18;
    this.targetIntensity = 0.18;
  }

  stopMusic() {
    this.musicPlaying = false;
  }

  setPaused(p) {
    this.paused = p;
    if (!this.ready) return;
    try {
      const t = this.now();
      this.musicGain.gain.setTargetAtTime(
        p ? 0.12 : Math.pow(this.settings.music, 1.5) * 0.85, t, 0.12);
    } catch (e) { /* ignore */ }
  }

  setIntensity(v) { this.targetIntensity = Math.max(0, Math.min(1, v)); }

  update(dt) {
    if (!this.ready || !this.musicPlaying) return;
    this.intensity = damp(this.intensity, this.paused ? 0.25 : this.targetIntensity, 1.6, dt);
    const ahead = 0.2;
    let guard = 0;
    while (this.nextStepTime < this.ctx.currentTime + ahead && guard++ < 32) {
      this._scheduleStep(this.step, this.nextStepTime);
      this.nextStepTime += this.stepDur;
      this.step++;
    }
  }

  _scheduleStep(step, t) {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const intensity = this.intensity;
    const chords = AudioSystem.CHORDS;
    const roots = AudioSystem.ROOTS;
    const chord = chords[bar];

    if (s % 4 === 0) this._kick(t, s === 0 ? 1 : 0.8);
    if (s === 4 || s === 12) this._snare(t);
    if (s % 4 === 2) this._hat(t, 0.55 + intensity * 0.4, false);
    if (intensity > 0.42 && s % 2 === 1) this._hat(t, 0.18 + intensity * 0.15, false);
    if (intensity > 0.7 && (s === 7 || s === 15)) this._hat(t, 0.35, true);

    if (s % 2 === 0) {
      const pattern = [0, 0, 12, 0, 0, 7, 12, 0];
      const n = pattern[(s / 2) | 0];
      this._bass(t, roots[bar] * Math.pow(2, n / 12), this.stepDur * 0.9, 0.55 + intensity * 0.3);
    }

    if (s === 0) this._pad(t, chord, this.stepDur * 16);

    if (intensity > 0.34 && s % 2 === 1) {
      const seq = [0, 1, 2, 1, 2, 0, 1, 2];
      const note = chord[seq[s % 8]] * 2;
      this._arp(t, note, 0.09 + intensity * 0.05);
    }
    if (intensity > 0.8 && s === 14) {
      this._arp(t, chord[0] * 4, 0.1);
    }
  }

  _kick(t, vel = 1) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(134, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.3);
  }

  _snare(t) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.34, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(bp); bp.connect(g); g.connect(this.musicGain);
    src.start(t); src.stop(t + 0.18);

    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(190, t);
    tone.frequency.exponentialRampToValueAtTime(120, t + 0.09);
    tg.gain.setValueAtTime(0.16, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    tone.connect(tg); tg.connect(this.musicGain);
    tone.start(t); tone.stop(t + 0.12);
  }

  _hat(t, vel, open) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7200;
    const g = ctx.createGain();
    const dur = open ? 0.14 : 0.035;
    g.gain.setValueAtTime(0.10 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(hp); hp.connect(g); g.connect(this.musicGain);
    src.start(t); src.stop(t + dur + 0.01);
  }

  _bass(t, freq, dur, vel) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 0.5;
    filter.type = 'lowpass';
    filter.Q.value = 7;
    filter.frequency.setValueAtTime(240, t);
    filter.frequency.exponentialRampToValueAtTime(720, t + 0.02);
    filter.frequency.exponentialRampToValueAtTime(180, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.17 * vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter); osc2.connect(filter);
    filter.connect(g); g.connect(this.musicGain);
    osc.start(t); osc2.start(t); osc.stop(t + dur + 0.02); osc2.stop(t + dur + 0.02);
  }

  _pad(t, chord, dur) {
    const ctx = this.ctx;
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.value = chord[i] * 0.5;
      osc.detune.value = (i - 1) * 7;
      f.type = 'lowpass'; f.frequency.value = 780; f.Q.value = 0.6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.028, t + 0.35);
      g.gain.linearRampToValueAtTime(0.02, t + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.connect(f); f.connect(g); g.connect(this.musicGain);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
  }

  _arp(t, freq, vel) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = 2400; f.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.055 * (0.5 + this.intensity), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    osc.connect(f); f.connect(g);
    g.connect(this.musicGain);
    g.connect(this.delay);
    osc.start(t); osc.stop(t + 0.16);
  }

  // -------------------------------------------------------------------------
  // SFX
  // -------------------------------------------------------------------------
  play(name, opts = {}) {
    if (!this.ready) return;
    try {
      switch (name) {
        case 'pistol': this._gunshot(opts.enemy ? 0.55 : 0.85, 820, 0.11); break;
        case 'smg': this._gunshot(opts.enemy ? 0.4 : 0.6, 1100, 0.07); break;
        case 'shotgun': this._shotgun(opts.enemy ? 0.6 : 1); break;
        case 'dry': this._click(0.12, 1800); break;
        case 'reload': this._reload(); break;
        case 'meleeSwing': this._swing(); break;
        case 'meleeHit': this._meleeHit(); break;
        case 'footstep': this._footstep(opts.alt); break;
        case 'alert': this._alert(); break;
        case 'death': this._death(); break;
        case 'playerDeath': this._playerDeath(); break;
        case 'door': this._door(); break;
        case 'pickup': this._blip(560, 980, 0.09, 0.1); break;
        case 'empty': this._click(0.08, 2600); break;
        case 'hit': this._meleeHit(0.7); break;
        case 'uiMove': this._blip(740, 740, 0.045, 0.05); break;
        case 'uiClick': this._blip(540, 1040, 0.08, 0.08); break;
        case 'uiBack': this._blip(640, 380, 0.07, 0.06); break;
        case 'win': this._win(); break;
        default: break;
      }
    } catch (e) { /* audio must never break gameplay */ }
  }

  _gunshot(vol, freq, dur) {
    const ctx = this.ctx, t = this.now();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.4;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(freq, t);
    bp.frequency.exponentialRampToValueAtTime(freq * 0.35, t + dur);
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.09);
    og.gain.setValueAtTime(vol * 0.32, t);
    og.gain.exponentialRampToValueAtTime(0.0006, t + 0.1);
    osc.connect(og); og.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.12);
  }

  _shotgun(vol) {
    const ctx = this.ctx, t = this.now();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.9;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.34);
    src.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.36);

    const osc = ctx.createOscillator(), og = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.22);
    og.gain.setValueAtTime(vol * 0.55, t);
    og.gain.exponentialRampToValueAtTime(0.0006, t + 0.26);
    osc.connect(og); og.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.28);
  }

  _click(vol, freq) {
    const ctx = this.ctx, t = this.now();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.03);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.035);
  }

  _reload() {
    const t = this.now();
    this._clickAt(0.1, 900, t);
    this._clickAt(0.13, 1400, t + 0.13);
    this._clickAt(0.16, 620, t + 0.42);
  }

  _clickAt(vol, freq, t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'square'; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.035);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.04);
  }

  _swing() {
    const ctx = this.ctx, t = this.now();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.16);
    src.connect(bp); bp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.18);
  }

  _meleeHit(vol = 1) {
    const ctx = this.ctx, t = this.now();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.34 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.12);
    src.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.14);

    const osc = ctx.createOscillator(), og = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    og.gain.setValueAtTime(0.35 * vol, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
    osc.connect(og); og.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.16);
  }

  _footstep(alt = false) {
    const ctx = this.ctx, t = this.now();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = alt ? 1.4 : 1.1;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 480;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.055, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.055);
    src.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.07);
  }

  _alert() {
    const t = this.now();
    this._blipAt(680, 940, 0.13, 0.07, t);
    this._blipAt(940, 1240, 0.13, 0.05, t + 0.09);
  }

  _blip(f1, f2, dur, vol) {
    const t = this.now();
    this._blipAt(f1, f2, dur, vol, t);
  }

  _blipAt(f1, f2, dur, vol, t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + dur + 0.01);
  }

  _death() {
    const ctx = this.ctx, t = this.now();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.28);
    src.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.3);

    const osc = ctx.createOscillator(), og = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.35);
    og.gain.setValueAtTime(0.12, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.36);
    osc.connect(og); og.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.38);
  }

  _playerDeath() {
    this._death();
    const t = this.now() + 0.06;
    this._blipAt(220, 55, 0.9, 0.12, t);
  }

  _door() {
    const ctx = this.ctx, t = this.now();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.22);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.24);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.26);
    this._blipAt(80, 60, 0.08, 0.06, t + 0.24);
  }

  _win() {
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    const t = this.now();
    for (let i = 0; i < notes.length; i++) {
      this._blipAt(notes[i], notes[i], 0.22, 0.07, t + i * 0.11);
    }
  }

  static CHORDS = [
    [220.00, 261.63, 329.63], // Am
    [174.61, 220.00, 261.63], // F
    [146.83, 174.61, 220.00], // Dm
    [164.81, 207.65, 246.94], // E
  ];

  static ROOTS = [55.00, 43.65, 73.42, 82.41];
}
