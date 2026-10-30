import { rand } from '../core/utils.js';

/** Fixed-size pooled particle system — no per-frame allocation. */
export class Particles {
  constructor(max = 700) {
    this.max = max;
    this.pool = new Array(max);
    for (let i = 0; i < max; i++) {
      this.pool[i] = {
        active: false, type: 'blood', x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1, size: 1, color: '#F04452',
        gravity: 0, drag: 0, rot: 0, vr: 0, grow: 0,
      };
    }
    this.cursor = 0;
    this.activeCount = 0;
  }

  clear() {
    for (let i = 0; i < this.max; i++) this.pool[i].active = false;
    this.cursor = 0;
    this.activeCount = 0;
  }

  _get() {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
      if (!p.active) return p;
    }
    return this.pool[0]; // recycle oldest-ish when saturated
  }

  spawn(type, x, y, opts = {}) {
    const p = this._get();
    p.active = true;
    p.type = type;
    p.x = x; p.y = y;
    p.vx = opts.vx ?? 0;
    p.vy = opts.vy ?? 0;
    p.life = p.maxLife = opts.life ?? 0.4;
    p.size = opts.size ?? 1;
    p.color = opts.color ?? '#F04452';
    p.gravity = opts.gravity ?? 0;
    p.drag = opts.drag ?? 0;
    p.rot = opts.rot ?? 0;
    p.vr = opts.vr ?? 0;
    p.grow = opts.grow ?? 0;
    return p;
  }

  blood(x, y, angle, amount = 6, power = 70) {
    for (let i = 0; i < amount; i++) {
      const a = angle + rand(-0.7, 0.7);
      const sp = rand(power * 0.35, power);
      this.spawn('blood', x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.25, 0.6), size: rand(1, 2.4),
        color: Math.random() < 0.25 ? '#FFE6C7' : '#F04452',
        gravity: 120, drag: 2,
      });
    }
  }

  sparks(x, y, angle, amount = 6) {
    for (let i = 0; i < amount; i++) {
      const a = angle + Math.PI + rand(-0.9, 0.9);
      const sp = rand(40, 150);
      this.spawn('spark', x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.08, 0.24), size: rand(1, 2),
        color: Math.random() < 0.4 ? '#FFE6C7' : (Math.random() < 0.5 ? '#FF9A3C' : '#F04452'),
        gravity: 40, drag: 6,
      });
    }
  }

  smoke(x, y, amount = 2, color = '#9B4DFF') {
    for (let i = 0; i < amount; i++) {
      this.spawn('smoke', x + rand(-4, 4), y + rand(-4, 4), {
        vx: rand(-12, 12), vy: rand(-20, -4),
        life: rand(0.35, 0.8), size: rand(2, 4),
        color, drag: 1.4, grow: 7,
      });
    }
  }

  casing(x, y, angle) {
    const a = angle + Math.PI * 0.5 + rand(-0.3, 0.3);
    const sp = rand(40, 80);
    this.spawn('casing', x, y, {
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.5, 0.9), size: 2, color: '#FF9A3C',
      gravity: 140, drag: 3, rot: rand(0, 6.28), vr: rand(-14, 14),
    });
  }

  dust(x, y, amount = 1) {
    this.spawn('dust', x, y, {
      vx: rand(-4, 4), vy: rand(-10, -2), life: rand(0.8, 2.2),
      size: 1, color: '#FFE6C7', drag: 0.3, grow: 0,
    });
  }

  ring(x, y, color = '#FF287F', size = 4, life = 0.2) {
    this.spawn('ring', x, y, { life, size, grow: 46, color });
  }

  update(dt) {
    let count = 0;
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      const d = 1 - p.drag * dt;
      p.vx *= Math.max(0, d);
      p.vy *= Math.max(0, d);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size += p.grow * dt;
      count++;
    }
    this.activeCount = count;
  }

  draw(ctx, bloodEnabled = true) {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      if (!bloodEnabled && p.type === 'blood') continue;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.type === 'ring') {
        ctx.globalAlpha = t * 0.5;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = p.type === 'smoke' ? t * 0.22 : t;
      ctx.fillStyle = p.color;
      if (p.type === 'casing') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        ctx.fillRect(-1, -1, 2, 1);
        ctx.restore();
      } else if (p.type === 'spark') {
        ctx.fillRect(x, y, p.size, p.size);
      } else {
        const s = Math.max(1, Math.round(p.size));
        ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** Tracers, muzzle flashes and score popups. */
export class Effects {
  constructor() {
    this.tracers = [];
    this.flashes = [];
    this.popups = [];
    this.rings = [];
  }

  tracer(x1, y1, x2, y2, color = '#FFE6C7', life = 0.075, width = 1) {
    if (this.tracers.length > 48) this.tracers.shift();
    this.tracers.push({ x1, y1, x2, y2, color, life, maxLife: life, width });
  }

  ring(x, y, color = '#FFE6C7', size = 4, life = 0.2) {
    if (this.rings.length > 24) this.rings.shift();
    this.rings.push({ x, y, color, size, grow: 48, life, maxLife: life });
  }

  flash(x, y, angle, scale = 1) {
    if (this.flashes.length > 24) this.flashes.shift();
    this.flashes.push({ x, y, angle, scale, life: 0.055, maxLife: 0.055 });
  }

  popup(x, y, text, color = '#FFE6C7', size = 8) {
    if (this.popups.length > 24) this.popups.shift();
    this.popups.push({ x, y, text, color, size, life: 0.85, maxLife: 0.85 });
  }

  clear() {
    this.tracers.length = 0;
    this.flashes.length = 0;
    this.popups.length = 0;
    this.rings.length = 0;
  }

  update(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) this.tracers.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) this.flashes.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.size += r.grow * dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.y -= 18 * dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
  }

  drawWorld(ctx) {
    // expanding impact / swing rings
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      const a = r.life / r.maxLife;
      ctx.globalAlpha = a * 0.6;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // tracers
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.tracers.length; i++) {
      const t = this.tracers[i];
      const a = t.life / t.maxLife;
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = t.width;
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
      ctx.globalAlpha = a * 0.25;
      ctx.lineWidth = t.width + 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // muzzle flashes
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      const t = f.life / f.maxLife;
      const frame = t > 0.66 ? 0 : t > 0.33 ? 1 : 2;
      this._drawFlash(ctx, f, frame);
    }

    // score popups
    for (let i = 0; i < this.popups.length; i++) {
      const p = this.popups[i];
      ctx.globalAlpha = Math.min(1, p.life / p.maxLife * 1.6);
      ctx.font = `${p.size}px Silkscreen, monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#100D18';
      ctx.fillText(p.text, Math.round(p.x) + 1, Math.round(p.y) + 1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  _drawFlash(ctx, f, frame) {
    const len = [14, 11, 7][frame];
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.scale(f.scale, f.scale);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#FFE6C7';
    ctx.beginPath();
    ctx.moveTo(0, -2); ctx.lineTo(len, -1); ctx.lineTo(len + 3, 0);
    ctx.lineTo(len, 1); ctx.lineTo(0, 2); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,154,60,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -1); ctx.lineTo(len + 7, 0); ctx.lineTo(0, 1); ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }
}
