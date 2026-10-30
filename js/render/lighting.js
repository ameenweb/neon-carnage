import { VIEW } from '../config.js';
import { createCanvas, rgba } from '../core/utils.js';

/**
 * Screen-space darkness mask with neon cut-outs, plus additive neon glow.
 * Uses pre-rendered radial sprites (no per-frame gradients, no shadowBlur).
 */
export class Lighting {
  constructor() {
    const c = createCanvas(VIEW.W, VIEW.H);
    this.canvas = c.canvas;
    this.ctx = c.ctx;
    this.ctx.imageSmoothingEnabled = true;

    this.lightSprite = this._makeSprite('255,255,255');
    this.glowSprites = new Map();
    this.time = 0;
  }

  _makeSprite(rgb) {
    const size = 128;
    const { canvas, ctx } = createCanvas(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(0.32, `rgba(${rgb},0.72)`);
    g.addColorStop(0.68, `rgba(${rgb},0.24)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  _glow(color) {
    let s = this.glowSprites.get(color);
    if (!s) {
      const n = parseInt(color.slice(1), 16);
      const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
      s = this._makeSprite(rgb);
      this.glowSprites.set(color, s);
    }
    return s;
  }

  /**
   * @param {CanvasRenderingContext2D} target scene context (screen space)
   * @param {Camera} camera
   * @param {Level} level
   * @param {Player} player
   * @param {number} darkness 0..1
   */
  render(target, camera, level, player, darkness = 0.82, extra = null) {
    this.time += 1 / 60;
    const lc = this.ctx;
    lc.globalCompositeOperation = 'source-over';
    lc.globalAlpha = 1;
    lc.clearRect(0, 0, VIEW.W, VIEW.H);
    lc.fillStyle = rgba('#08060E', darkness);
    lc.fillRect(0, 0, VIEW.W, VIEW.H);

    lc.globalCompositeOperation = 'destination-out';
    const left = camera.left, top = camera.top;
    const lights = level.lights;
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      const sx = l.x - left, sy = l.y - top;
      const r = l.radius * (1 + Math.sin(this.time * l.speed + l.phase) * l.flicker);
      if (sx + r < 0 || sy + r < 0 || sx - r > VIEW.W || sy - r > VIEW.H) continue;
      lc.globalAlpha = l.intensity;
      lc.drawImage(this.lightSprite, sx - r, sy - r, r * 2, r * 2);
    }

    // player's own pool of light so the silhouette never vanishes
    if (player && !player.dead) {
      const sx = player.x - left, sy = player.y - top;
      lc.globalAlpha = 0.9;
      lc.drawImage(this.lightSprite, sx - 120, sy - 120, 240, 240);
    }
    if (extra) {
      for (const e of extra) {
        lc.globalAlpha = e.intensity;
        lc.drawImage(this.lightSprite, e.x - left - e.radius, e.y - top - e.radius, e.radius * 2, e.radius * 2);
      }
    }
    lc.globalAlpha = 1;
    lc.globalCompositeOperation = 'source-over';

    target.drawImage(this.canvas, 0, 0);

    // additive neon tint
    target.globalCompositeOperation = 'lighter';
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      const sx = l.x - left, sy = l.y - top;
      const r = l.radius * 1.15;
      if (sx + r < 0 || sy + r < 0 || sx - r > VIEW.W || sy - r > VIEW.H) continue;
      target.globalAlpha = l.tint * (1 + Math.sin(this.time * l.speed + l.phase) * 0.25);
      const sprite = this._glow(l.color);
      target.drawImage(sprite, sx - r, sy - r, r * 2, r * 2);
    }
    target.globalAlpha = 1;
    target.globalCompositeOperation = 'source-over';
  }

  /** Neon signage drawn above the darkness, with flicker and a coloured halo. */
  drawSigns(target, camera, level) {
    const left = camera.left, top = camera.top;
    target.save();
    target.globalCompositeOperation = 'lighter';
    target.textAlign = 'center';
    target.textBaseline = 'middle';
    for (const s of level.signs) {
      const sx = Math.round(s.x - left);
      const sy = Math.round(s.y - top);
      if (sx < -80 || sy < -40 || sx > VIEW.W + 80 || sy > VIEW.H + 40) continue;
      let alpha = s.alpha;
      if (s.flicker > 0) {
        const n = Math.sin(this.time * 13 + s.phase) * Math.sin(this.time * 3.7 + s.phase * 2);
        if (n > 1 - s.flicker * 2.2) alpha *= 0.25;
      }
      // halo
      target.globalAlpha = 0.30 * alpha;
      const sprite = this._glow(s.color);
      const r = s.size * 4.5;
      target.drawImage(sprite, sx - r, sy - r, r * 2, r * 2);
      // text core
      target.globalAlpha = alpha;
      target.font = `${s.size}px Silkscreen, monospace`;
      target.fillStyle = s.color;
      target.fillText(s.text, sx, sy);
      target.fillStyle = 'rgba(255,230,199,0.55)';
      target.font = `${Math.max(3, s.size - 2)}px Silkscreen, monospace`;
      target.fillText(s.text, sx, sy - 1);
    }
    target.restore();
  }
}
