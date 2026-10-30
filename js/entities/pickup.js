import { TAU, rand } from '../core/utils.js';

export class Pickup {
  constructor(game, data) {
    this.game = game;
    this.kind = data.type === 'ammo' ? 'ammo' : 'weapon';
    this.weapon = data.weapon;
    this.amount = data.amount ?? 0;
    this.mag = data.mag ?? undefined;
    this.reserve = data.reserve ?? undefined;
    this.x = data.x;
    this.y = data.y;
    this.baseY = data.y;
    this.bob = rand(0, TAU);
    this.glow = rand(0, TAU);
    this.dead = false;
    this.spawnT = 0.25;
  }

  update(dt) {
    this.bob += dt * 2.4;
    this.glow += dt * 3.1;
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.y = this.baseY + Math.sin(this.bob) * 1.5;
  }

  draw(ctx) {
    if (this.kind === 'ammo') {
      const g = 0.35 + Math.sin(this.glow) * 0.15;
      ctx.globalAlpha = g;
      ctx.fillStyle = '#FFE6C7';
      ctx.fillRect(this.x - 5, this.y - 3, 10, 6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#21152F';
      ctx.fillRect(this.x - 4, this.y - 2, 8, 4);
      ctx.fillStyle = '#FF9A3C';
      ctx.fillRect(this.x - 3, this.y - 1, 2, 2);
      ctx.fillRect(this.x, this.y - 1, 2, 2);
      ctx.fillStyle = '#FFE6C7';
      ctx.fillRect(this.x + 3, this.y - 2, 1, 1);
      return;
    }

    // weapon icon with soft ground glow
    const color = this.weapon === 'bat' ? '#FF287F' : '#35E0E8';
    const pulse = 0.25 + Math.sin(this.glow) * 0.1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 9, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // simple rotated silhouette of the weapon
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-0.5);
    ctx.globalAlpha = this.spawnT > 0 ? 0.65 : 1;
    if (this.weapon === 'bat') {
      ctx.fillStyle = '#08060E';
      ctx.fillRect(-12, -2, 24, 4);
      ctx.fillStyle = '#8A5B3A';
      ctx.fillRect(-11, -1, 20, 2);
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(-7, -1, 4, 2);
    } else if (this.weapon === 'shotgun') {
      ctx.fillStyle = '#08060E';
      ctx.fillRect(-13, -2, 26, 4);
      ctx.fillStyle = '#3A2C4F';
      ctx.fillRect(-12, -1, 24, 2);
      ctx.fillStyle = '#FF9A3C';
      ctx.fillRect(-3, -1, 6, 2);
    } else if (this.weapon === 'smg') {
      ctx.fillStyle = '#08060E';
      ctx.fillRect(-9, -2, 18, 4);
      ctx.fillStyle = '#3A2C4F';
      ctx.fillRect(-8, -1, 16, 2);
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(-1, -1, 3, 3);
    } else {
      ctx.fillStyle = '#08060E';
      ctx.fillRect(-7, -2, 14, 4);
      ctx.fillStyle = '#3A2C4F';
      ctx.fillRect(-6, -1, 12, 2);
      ctx.fillStyle = '#35E0E8';
      ctx.fillRect(1, -1, 2, 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
