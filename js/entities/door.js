import { TILE } from '../config.js';

/** Sliding door occupying exactly one tile. Blocks movement and sight when closed. */
export class Door {
  constructor(game, tx, ty, dir, label) {
    this.game = game;
    this.tx = tx;
    this.ty = ty;
    this.dir = dir;           // 'h' = horizontal opening (east/west passage)
    this.label = label;
    this.openT = 0;           // 0 closed, 1 open
    this.target = 0;
    this.soundCd = 0;
    this.px = tx * TILE;
    this.py = ty * TILE;
    this.openAmount = 0;
  }

  get closed() { return this.openT < 0.65; }

  open(source = 'player') {
    if (this.target === 1) return;
    this.target = 1;
    if (this.soundCd <= 0) {
      this.soundCd = 0.35;
      this.game.audio.play('door');
      this.game.emitNoise(this.px + 8, this.py + 8, 150, 'door');
      this.game.level.addLightPulse(this.px + 8, this.py + 8, '#FF287F', 30, 0.4);
    }
  }

  close() { this.target = 0; }

  update(dt) {
    this.soundCd = Math.max(0, this.soundCd - dt);
    const speed = 3.6;
    if (this.openT < this.target) this.openT = Math.min(this.target, this.openT + dt * speed);
    else if (this.openT > this.target) this.openT = Math.min(this.target, this.openT - dt * speed);
    this.openAmount = this.openT;

    // enemies push through doors
    if (this.closed) {
      for (const e of this.game.enemies) {
        if (e.dead) continue;
        const dx = e.x - (this.px + 8);
        const dy = e.y - (this.py + 8);
        if (dx * dx + dy * dy < 26 * 26) { this.open('enemy'); break; }
      }
    }
  }

  blocksTile(tx, ty) {
    return tx === this.tx && ty === this.ty && this.closed;
  }

  draw(ctx, time) {
    const x = this.px, y = this.py;
    // frame
    ctx.fillStyle = '#0A0710';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#3A2C4F';
    if (this.dir === 'v') {
      ctx.fillRect(x, y, 2, TILE);
      ctx.fillRect(x + TILE - 2, y, 2, TILE);
    } else {
      ctx.fillRect(x, y, TILE, 2);
      ctx.fillRect(x, y + TILE - 2, TILE, 2);
    }

    if (this.dir === 'v') {
      // two panels slide up/down
      const off = this.openT * 14;
      ctx.fillStyle = '#241735';
      ctx.fillRect(x + 2, y - off, TILE - 4, 13);
      ctx.fillRect(x + 2, y + 14 + off, TILE - 4, 13);
      // hazard stripe
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(x + 3, y + 3 - off, TILE - 6, 2);
      ctx.fillRect(x + 3, y + 11 + off, TILE - 6, 2);
    } else {
      const off = this.openT * 14;
      ctx.fillStyle = '#241735';
      ctx.fillRect(x - off, y + 2, 13, TILE - 4);
      ctx.fillRect(x + 14 + off, y + 2, 13, TILE - 4);
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(x + 3 - off, y + 3, 2, TILE - 6);
      ctx.fillRect(x + 11 + off, y + 3, 2, TILE - 6);
    }

    // status lamp
    const lamp = this.closed ? '#FF287F' : '#35E0E8';
    ctx.fillStyle = lamp;
    ctx.globalAlpha = 0.55 + Math.sin(time * 4 + this.tx) * 0.2;
    ctx.fillRect(x + 6, y + 6, 2, 2);
    ctx.globalAlpha = 1;
  }
}
