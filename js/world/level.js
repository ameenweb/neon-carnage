import { TILE, VIEW } from '../config.js';
import { TileMap } from './tilemap.js';
import { Door } from '../entities/door.js';
import { Pickup } from '../entities/pickup.js';
import { drawCorpse } from '../render/sprites.js';
import { createCanvas, mulberry32, rand, rgba, TAU } from '../core/utils.js';

const OUT = '#08060E';

function outlineRect(ctx, x, y, w, h, fill, line = OUT) {
  ctx.fillStyle = line;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function softShadow(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + 2, y + h / 2 + 3, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Floor painting
// ---------------------------------------------------------------------------
function paintFloor(ctx, tx, ty, type) {
  const x = tx * TILE, y = ty * TILE;
  const rnd = mulberry32((tx * 374761393 + ty * 668265263 + type * 144269) >>> 0);
  let base = '#171021';

  switch (type) {
    case 1: { // club
      base = (((tx >> 1) + (ty >> 1)) & 1) ? '#1A1226' : '#161020';
      ctx.fillStyle = base;
      ctx.fillRect(x, y, TILE, TILE);
      if (rnd() < 0.35) {
        ctx.fillStyle = 'rgba(8,6,14,0.28)';
        ctx.fillRect(x + ((rnd() * 14) | 0), y + ((rnd() * 14) | 0), 2, 1);
      }
      if (rnd() < 0.06) {
        ctx.fillStyle = 'rgba(255,40,127,0.14)';
        ctx.fillRect(x + ((rnd() * 15) | 0), y + ((rnd() * 15) | 0), 1, 1);
      }
      break;
    }
    case 2: { // bar checker
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const dark = ((tx * 2 + sx) + (ty * 2 + sy)) & 1;
          ctx.fillStyle = dark ? '#1B1226' : '#241A33';
          ctx.fillRect(x + sx * 8, y + sy * 8, 8, 8);
        }
      }
      ctx.fillStyle = 'rgba(8,6,14,0.35)';
      ctx.fillRect(x, y, TILE, 1);
      ctx.fillRect(x, y, 1, TILE);
      if (rnd() < 0.3) {
        ctx.fillStyle = 'rgba(20,12,28,0.6)';
        ctx.fillRect(x + ((rnd() * 12) | 0), y + ((rnd() * 12) | 0), 3, 2);
      }
      break;
    }
    case 3: { // vip
      ctx.fillStyle = '#21152F';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(155,77,255,0.10)';
      ctx.fillRect(x, y + 7, TILE, 1);
      ctx.fillRect(x + 7, y, 1, TILE);
      break;
    }
    case 4:
    case 5: { // concrete (backroom / storage)
      ctx.fillStyle = type === 4 ? '#191322' : '#171122';
      ctx.fillRect(x, y, TILE, TILE);
      if (rnd() < 0.28) {
        ctx.strokeStyle = 'rgba(10,7,16,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const sx = x + rnd() * 12, sy = y + rnd() * 12;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + rnd() * 7 - 3, sy + rnd() * 7 - 3);
        ctx.stroke();
      }
      if (rnd() < 0.16) {
        ctx.fillStyle = 'rgba(30,20,46,0.55)';
        ctx.fillRect(x + ((rnd() * 12) | 0), y + ((rnd() * 12) | 0), 3, 2);
      }
      break;
    }
    case 6: { // entrance
      ctx.fillStyle = (((tx + ty) & 1) ? '#171021' : '#1B1328');
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(8,6,14,0.35)';
      ctx.fillRect(x, y, TILE, 1);
      ctx.fillRect(x, y, 1, TILE);
      break;
    }
    case 7: { // exit corridor
      ctx.fillStyle = '#140F1D';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(53,224,232,0.08)';
      ctx.fillRect(x, y + 13, TILE, 2);
      break;
    }
    default:
      ctx.fillStyle = base;
      ctx.fillRect(x, y, TILE, TILE);
  }

  // subtle tile seam
  ctx.fillStyle = 'rgba(8,6,14,0.16)';
  ctx.fillRect(x, y, TILE, 1);
  ctx.fillRect(x, y, 1, TILE);
}

// ---------------------------------------------------------------------------
// Wall painting
// ---------------------------------------------------------------------------
function paintWall(ctx, tm, tx, ty) {
  const x = tx * TILE, y = ty * TILE;
  const n = tm.isFloor(tx, ty - 1);
  const s = tm.isFloor(tx, ty + 1);
  const w = tm.isFloor(tx - 1, ty);
  const e = tm.isFloor(tx + 1, ty);
  const rnd = mulberry32((tx * 83492791 + ty * 29943829 + 7) >>> 0);

  if (!n && !s && !w && !e) {
    ctx.fillStyle = '#0C0813';
    ctx.fillRect(x, y, TILE, TILE);
    return;
  }

  ctx.fillStyle = s ? '#1B1228' : '#141021';
  ctx.fillRect(x, y, TILE, TILE);

  if (s) {
    ctx.fillStyle = '#2A1B3B';
    ctx.fillRect(x, y + 12, TILE, 3);
    ctx.fillStyle = '#3A2450';
    ctx.fillRect(x, y + 12, TILE, 1);
    ctx.fillStyle = OUT;
    ctx.fillRect(x, y + 15, TILE, 1);
  }
  if (n) {
    ctx.fillStyle = '#0B0712';
    ctx.fillRect(x, y, TILE, 2);
  }
  if (w) {
    ctx.fillStyle = '#241735';
    ctx.fillRect(x, y, 2, TILE);
  }
  if (e) {
    ctx.fillStyle = '#1E1229';
    ctx.fillRect(x + 14, y, 2, TILE);
  }

  // panel seam + grime
  if (tx % 2 === 0) {
    ctx.fillStyle = 'rgba(8,6,14,0.35)';
    ctx.fillRect(x, y, 1, TILE);
  }
  if (rnd() < 0.4) {
    ctx.fillStyle = 'rgba(10,7,16,0.4)';
    ctx.fillRect(x + ((rnd() * 14) | 0), y + ((rnd() * 14) | 0), 2, 1);
  }
}

// ---------------------------------------------------------------------------
// Prop painting (top-down, 1px outlines, palette only)
// ---------------------------------------------------------------------------
function paintProp(ctx, p) {
  const { x, y, w, h, type } = p;
  switch (type) {
    case 'rug': {
      ctx.fillStyle = p.vip ? '#2A1733' : '#2A1020';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = p.runner ? '#FF287F' : '#9B4DFF';
      ctx.globalAlpha = p.runner ? 0.55 : 0.35;
      ctx.fillRect(x + 1, y, 1, h);
      ctx.fillRect(x + w - 2, y, 1, h);
      if (!p.runner) {
        ctx.globalAlpha = 0.18;
        for (let ry = y + 8; ry < y + h - 4; ry += 16) {
          ctx.fillRect(x + 8, ry, w - 16, 1);
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'exitpad': {
      ctx.fillStyle = '#0F1A20';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(53,224,232,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      ctx.fillStyle = 'rgba(53,224,232,0.10)';
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      // hazard chevrons
      ctx.fillStyle = 'rgba(53,224,232,0.22)';
      for (let cy = y + 8; cy < y + h - 6; cy += 10) {
        for (let cx = x + 8; cx < x + w - 8; cx += 14) {
          ctx.fillRect(cx, cy, 6, 2);
          ctx.fillRect(cx + 3, cy + 3, 6, 2);
        }
      }
      break;
    }
    case 'bar': {
      softShadow(ctx, x, y, w, h);
      outlineRect(ctx, x, y, w, h, '#241735');
      ctx.fillStyle = '#3B2550';
      ctx.fillRect(x + 1, y + 1, w - 2, 11);
      ctx.fillStyle = '#2A1B3B';
      ctx.fillRect(x + 1, y + 12, w - 2, h - 14);
      ctx.fillStyle = '#9B4DFF';
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x + 2, y + 10, w - 4, 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(x + 6, y + 3, 10, 1);
      // glasses / ashtrays along the counter
      for (let i = 0; i < 9; i++) {
        const gx = x + 14 + i * 27;
        const color = i % 3 === 0 ? '#35E0E8' : i % 3 === 1 ? '#FF9A3C' : '#FFE6C7';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(gx + 1, y + 5, 3, 4);
        ctx.fillStyle = color;
        ctx.fillRect(gx, y + 4, 2, 3);
      }
      break;
    }
    case 'shelf': {
      ctx.fillStyle = '#140E1E';
      ctx.fillRect(x, y + h - 3, w, 3);
      ctx.fillStyle = '#3A2450';
      ctx.fillRect(x, y + h - 4, w, 1);
      for (let i = 0; i < Math.floor(w / 9); i++) {
        const bx = x + 4 + i * 9;
        const c = i % 4 === 0 ? '#35E0E8' : i % 4 === 1 ? '#FF287F' : i % 4 === 2 ? '#FF9A3C' : '#9B4DFF';
        ctx.fillStyle = OUT;
        ctx.fillRect(bx - 1, y + 3, 4, 9);
        ctx.fillStyle = c;
        ctx.fillRect(bx, y + 4, 2, 7);
        ctx.fillStyle = 'rgba(255,230,199,0.6)';
        ctx.fillRect(bx, y + 4, 1, 2);
      }
      break;
    }
    case 'stool': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x + w / 2 + 1, y + h / 2 + 2, 5, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 5.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2A1B3B';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 4.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#FF287F';
      ctx.globalAlpha = 0.45;
      ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 2, 2);
      ctx.globalAlpha = 1;
      break;
    }
    case 'table': {
      softShadow(ctx, x, y, w, h);
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3A2450';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 1.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2A1B3B';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 4, 0, TAU);
      ctx.fill();
      // drinks + candle
      ctx.fillStyle = '#35E0E8';
      ctx.fillRect(x + w / 2 - 5, y + h / 2 - 2, 2, 2);
      ctx.fillStyle = '#FFE6C7';
      ctx.fillRect(x + w / 2 + 3, y + h / 2 + 1, 2, 2);
      ctx.fillStyle = '#FF9A3C';
      ctx.fillRect(x + w / 2, y + h / 2 - 1, 1, 1);
      break;
    }
    case 'chair': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 2, y + 2, w, h);
      outlineRect(ctx, x, y, w, h, '#2A1B3B');
      ctx.fillStyle = '#3A2450';
      ctx.fillRect(x + 1, y + 1, w - 2, 2);
      break;
    }
    case 'sofa': {
      softShadow(ctx, x, y, w, h);
      outlineRect(ctx, x, y, w, h, '#241735');
      ctx.fillStyle = '#3A2450';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = '#2A1B3B';
      const horizontal = w > h;
      if (horizontal) {
        for (let i = 1; i < 4; i++) ctx.fillRect(x + (w / 4) * i, y + 2, 1, h - 4);
        ctx.fillStyle = 'rgba(255,40,127,0.45)';
        ctx.fillRect(x + 2, y + 2, w - 4, 1);
      } else {
        for (let i = 1; i < 4; i++) ctx.fillRect(x + 2, y + (h / 4) * i, w - 4, 1);
        ctx.fillStyle = 'rgba(255,40,127,0.45)';
        ctx.fillRect(x + 2, y + 2, 1, h - 4);
      }
      break;
    }
    case 'dj': {
      softShadow(ctx, x, y, w, h);
      outlineRect(ctx, x, y, w, h, '#1B1228');
      ctx.fillStyle = '#241735';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      // turntables
      for (const tx2 of [x + 18, x + w - 18]) {
        ctx.fillStyle = OUT;
        ctx.beginPath(); ctx.arc(tx2, y + h / 2, 10, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0E0916';
        ctx.beginPath(); ctx.arc(tx2, y + h / 2, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#35E0E8';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(tx2 - 5, y + h / 2 - 1, 10, 1);
        ctx.globalAlpha = 1;
      }
      // mixer
      ctx.fillStyle = '#0E0916';
      ctx.fillRect(x + w / 2 - 8, y + 5, 16, h - 10);
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(x + w / 2 - 5, y + 8, 2, 2);
      ctx.fillStyle = '#FF9A3C';
      ctx.fillRect(x + w / 2 + 2, y + 8, 2, 2);
      ctx.fillStyle = '#FF287F';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
      ctx.globalAlpha = 1;
      break;
    }
    case 'speaker': {
      softShadow(ctx, x, y, w, h);
      outlineRect(ctx, x, y, w, h, '#21152F');
      ctx.fillStyle = '#2A1B3B';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      for (const cy of [y + h * 0.32, y + h * 0.7]) {
        ctx.fillStyle = OUT;
        ctx.beginPath(); ctx.arc(x + w / 2, cy, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#35E0E8';
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(x + w / 2, cy, 3.5, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'plant': {
      softShadow(ctx, x, y, w, h);
      ctx.fillStyle = OUT;
      ctx.fillRect(x + 3, y + h - 8, w - 6, 8);
      ctx.fillStyle = '#3A2450';
      ctx.fillRect(x + 4, y + h - 7, w - 8, 6);
      const cx = x + w / 2, cy = y + h / 2;
      const leaf = ['#9B4DFF', '#FF287F', '#35E0E8'];
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7 + 0.4;
        ctx.fillStyle = leaf[i % 3];
        ctx.globalAlpha = 0.75;
        ctx.fillRect(cx + Math.cos(a) * 5 - 1, cy + Math.sin(a) * 5 - 1, 3, 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFE6C7';
      ctx.fillRect(cx - 1, cy - 1, 1, 1);
      break;
    }
    case 'crate': {
      softShadow(ctx, x, y, w, h);
      outlineRect(ctx, x, y, w, h, '#3A2A45');
      ctx.fillStyle = '#2E2038';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.strokeStyle = '#4A3250';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + w - 3, y + h - 3);
      ctx.moveTo(x + w - 3, y + 3); ctx.lineTo(x + 3, y + h - 3);
      ctx.stroke();
      ctx.strokeStyle = '#FF9A3C';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      break;
    }
    case 'locker': {
      softShadow(ctx, x, y, w, h);
      outlineRect(ctx, x, y, w, h, '#2A1B3B');
      ctx.fillStyle = '#241735';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.fillStyle = '#0E0916';
      for (let vy = y + 6; vy < y + h - 6; vy += 6) ctx.fillRect(x + 4, vy, w - 8, 1);
      ctx.fillStyle = '#35E0E8';
      ctx.fillRect(x + w - 5, y + h / 2, 2, 3);
      break;
    }
    case 'desk': {
      softShadow(ctx, x, y, w, h);
      outlineRect(ctx, x, y, w, h, '#2A1B3B');
      ctx.fillStyle = '#35203F';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.fillStyle = '#FFE6C7';
      ctx.fillRect(x + 6, y + 5, 9, 6);
      ctx.fillRect(x + 20, y + 6, 7, 5);
      ctx.fillStyle = '#FF9A3C';
      ctx.fillRect(x + 34, y + 6, 6, 3);
      ctx.fillStyle = '#35E0E8';
      ctx.fillRect(x + 6, y + 13, 4, 2);
      break;
    }
    case 'keg': {
      softShadow(ctx, x, y, w, h);
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3A2A45';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 1, h / 2 - 1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FF9A3C';
      ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 4, 2);
      ctx.fillStyle = 'rgba(255,230,199,0.4)';
      ctx.fillRect(x + w / 2 - 4, y + h / 2 - 3, 2, 1);
      break;
    }
    case 'coatrail': {
      softShadow(ctx, x, y, w, h);
      ctx.fillStyle = '#2A1B3B';
      ctx.fillRect(x + w / 2 - 1, y + 2, 2, h - 4);
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(x + 2, y + 4, 3, 7);
      ctx.fillStyle = '#35E0E8';
      ctx.fillRect(x + w - 5, y + 5, 3, 6);
      ctx.fillStyle = '#FFE6C7';
      ctx.fillRect(x + 4, y + 11, 2, 3);
      break;
    }
    case 'poster': {
      ctx.fillStyle = '#0E0916';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#241735';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(x + 3, y + 3, w - 6, 4);
      ctx.fillStyle = '#35E0E8';
      ctx.fillRect(x + 3, y + 9, w - 10, 2);
      ctx.fillStyle = '#9B4DFF';
      ctx.fillRect(x + 3, y + 13, w - 6, 2);
      break;
    }
    case 'window': {
      ctx.fillStyle = '#0A1218';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#0E2A33';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = 'rgba(53,224,232,0.35)';
      ctx.fillRect(x + 3, y + 2, 2, h - 4);
      ctx.fillStyle = 'rgba(255,40,127,0.28)';
      ctx.fillRect(x + w - 7, y + 2, 1, h - 4);
      ctx.fillStyle = '#08060E';
      ctx.fillRect(x + w / 2, y, 1, h);
      break;
    }
    case 'cart': {
      softShadow(ctx, x, y, w, h);
      outlineRect(ctx, x, y, w, h, '#2A1B3B');
      ctx.fillStyle = '#35203F';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.fillStyle = '#FFE6C7';
      ctx.fillRect(x + 4, y + 3, 2, 4);
      ctx.fillStyle = '#35E0E8';
      ctx.fillRect(x + 8, y + 4, 2, 3);
      ctx.fillStyle = '#FF287F';
      ctx.fillRect(x + 12, y + 3, 2, 4);
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
export class Level {
  constructor(game, data) {
    this.game = game;
    this.data = data;
    this.name = data.name;
    this.subtitle = data.subtitle;
    this.widthTiles = data.width;
    this.heightTiles = data.height;
    this.widthPx = data.width * TILE;
    this.heightPx = data.height * TILE;
    this.time = 0;

    this.tm = new TileMap(data.width, data.height);
    for (const r of data.rooms) this.tm.carveRect(r.x, r.y, r.w, r.h, r.floor);
    for (const c of data.corridors) this.tm.carveRect(c.x, c.y, c.w, c.h, c.floor);

    this.doors = data.doors.map((d) => new Door(this.game, d.x, d.y, d.dir, d.label));
    this.tm.doorBlocked = (tx, ty) => {
      for (const d of this.doors) if (d.blocksTile(tx, ty)) return true;
      return false;
    };

    // props (px space)
    this.props = data.props.map((p) => ({
      ...p,
      x: p.x * TILE,
      y: p.y * TILE,
      w: p.w * TILE,
      h: p.h * TILE,
    }));
    for (const p of this.props) {
      if (!p.solid && !p.blocksSight) {
        // still registered for rendering only
        p.solid = false;
      }
      this.tm.addProp(p);
    }

    this.playerSpawn = {
      x: data.player.x * TILE,
      y: data.player.y * TILE,
      angle: data.player.angle,
    };
    this.enemySpawns = data.enemies;
    this.exit = {
      x: data.exit.x * TILE,
      y: data.exit.y * TILE,
      w: data.exit.w * TILE,
      h: data.exit.h * TILE,
    };
    this.exitOpen = false;

    this.lights = data.lights.map((l) => ({
      x: l.x * TILE,
      y: l.y * TILE,
      radius: l.r,
      color: l.color,
      intensity: l.intensity,
      tint: 0.04 + l.intensity * 0.11,
      flicker: 0.01 + Math.random() * 0.03,
      phase: Math.random() * 10,
      speed: 0.6 + Math.random() * 1.8,
    }));

    // moving dancefloor spotlights
    this.lights.push({
      x: 20 * TILE, y: 26 * TILE, radius: 135, color: '#FF287F',
      intensity: 0.34, tint: 0.13, flicker: 0, phase: 0, speed: 1,
      orbit: { cx: 20 * TILE, cy: 26 * TILE, dist: 95, speed: 0.5, phase: 0 },
    });
    this.lights.push({
      x: 24 * TILE, y: 28 * TILE, radius: 120, color: '#35E0E8',
      intensity: 0.28, tint: 0.12, flicker: 0, phase: 0, speed: 1,
      orbit: { cx: 24 * TILE, cy: 28 * TILE, dist: 70, speed: -0.37, phase: 2 },
    });
    this.discolights = this.lights.filter((l) => l.orbit);
    this.exitLight = {
      x: this.exit.x + this.exit.w / 2,
      y: this.exit.y + this.exit.h / 2,
      radius: 120, color: '#35E0E8', intensity: 0.45, tint: 0.10,
      flicker: 0.02, phase: 1, speed: 1.4,
    };
    this.lights.push(this.exitLight);

    this.signs = data.signs.map((s) => ({
      x: s.x * TILE, y: s.y * TILE,
      text: s.text, color: s.color, size: s.size,
      flicker: s.flicker, alpha: 1, phase: Math.random() * 10,
    }));

    this.props.sort((a, b) => (a.y + a.h) - (b.y + b.h));
    this.bake();

    // decals
    const dec = createCanvas(this.widthPx, this.heightPx);
    this.decalCanvas = dec.canvas;
    this.decalCtx = dec.ctx;
    this.decalOps = 0;

    this.corpses = [];
    this.pulses = [];
    this.pickups = (data.pickups || []).map((p) => new Pickup(game, {
      ...p,
      x: p.x * TILE,
      y: p.y * TILE,
    }));

    this.prompt = null;
  }

  // -------------------------------------------------------------------------
  // Static bake
  // -------------------------------------------------------------------------
  bake() {
    const c = createCanvas(this.widthPx, this.heightPx);
    const ctx = c.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#08060E';
    ctx.fillRect(0, 0, this.widthPx, this.heightPx);

    // floors
    for (let ty = 0; ty < this.heightTiles; ty++) {
      for (let tx = 0; tx < this.widthTiles; tx++) {
        const f = this.tm.floor[ty * this.widthTiles + tx];
        if (f) paintFloor(ctx, tx, ty, f);
      }
    }

    // walls
    for (let ty = 0; ty < this.heightTiles; ty++) {
      for (let tx = 0; tx < this.widthTiles; tx++) {
        if (!this.tm.isWall(tx, ty)) continue;
        paintWall(ctx, this.tm, tx, ty);
      }
    }

    // neon wall trims
    for (const strip of this.data.wallNeon || []) {
      ctx.fillStyle = strip.color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(strip.x * TILE, strip.y * TILE + 13, strip.w * TILE, 2);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(strip.x * TILE, strip.y * TILE + 11, strip.w * TILE, 5);
      ctx.globalAlpha = 1;
    }

    // floor edge definition
    ctx.fillStyle = 'rgba(4,3,8,0.55)';
    for (let ty = 0; ty < this.heightTiles; ty++) {
      for (let tx = 0; tx < this.widthTiles; tx++) {
        if (!this.tm.isFloor(tx, ty)) continue;
        const x = tx * TILE, y = ty * TILE;
        if (!this.tm.isFloor(tx, ty - 1)) ctx.fillRect(x, y, TILE, 1);
        if (!this.tm.isFloor(tx, ty + 1)) ctx.fillRect(x, y + 15, TILE, 1);
        if (!this.tm.isFloor(tx - 1, ty)) ctx.fillRect(x, y, 1, TILE);
        if (!this.tm.isFloor(tx + 1, ty)) ctx.fillRect(x + 15, y, 1, TILE);
      }
    }

    // props: floor layer, then objects sorted, then wall-mounted
    const floorProps = this.props.filter((p) => p.layer === 'floor');
    const wallProps = this.props.filter((p) => p.onWall);
    const objects = this.props.filter((p) => p.layer !== 'floor' && !p.onWall);
    for (const p of floorProps) paintProp(ctx, p);
    for (const p of objects) paintProp(ctx, p);
    for (const p of wallProps) paintProp(ctx, p);

    // ambient grime passes
    const rnd = mulberry32(1337);
    ctx.fillStyle = 'rgba(6,4,10,0.5)';
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(rnd() * this.widthTiles) * TILE + Math.floor(rnd() * 14);
      const y = Math.floor(rnd() * this.heightTiles) * TILE + Math.floor(rnd() * 14);
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (!this.tm.isFloor(tx, ty)) continue;
      ctx.fillRect(x, y, 1 + (rnd() * 2 | 0), 1);
    }

    this.staticCanvas = c.canvas;
  }

  // -------------------------------------------------------------------------
  // Runtime
  // -------------------------------------------------------------------------
  update(dt) {
    this.time += dt;
    for (const d of this.doors) d.update(dt);
    for (const p of this.pickups) p.update(dt);
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.life -= dt;
      if (p.life <= 0) this.pulses.splice(i, 1);
    }
    for (const l of this.discolights) {
      const o = l.orbit;
      o.phase += o.speed * dt;
      l.x = o.cx + Math.cos(o.phase) * o.dist;
      l.y = o.cy + Math.sin(o.phase) * o.dist * 0.7;
    }
    if (this.exitOpen) {
      if (Math.random() < dt * 6) {
        this.game.particles.dust(
          this.exit.x + rand(4, this.exit.w - 4),
          this.exit.y + rand(4, this.exit.h - 4), 1);
      }
      const s = this.signs.find((sg) => sg.text === 'EXIT');
      if (s) s.alpha = 0.8 + Math.sin(this.time * 4) * 0.2;
    }
  }

  openExit() {
    this.exitOpen = true;
    this.exitLight.intensity = 0.85;
    this.exitLight.tint = 0.2;
    this.exitLight.flicker = 0.06;
    this.pulses.push({
      x: this.exit.x + this.exit.w / 2,
      y: this.exit.y + this.exit.h / 2,
      color: '#35E0E8', radius: 90, life: 1.2, maxLife: 1.2,
    });
    this.game.particles.ring(
      this.exit.x + this.exit.w / 2, this.exit.y + this.exit.h / 2,
      '#35E0E8', 6, 0.5);
  }

  getExtraLights() {
    const out = [];
    for (const p of this.pulses) {
      out.push({
        x: p.x, y: p.y, radius: p.radius,
        intensity: (p.life / p.maxLife) * 0.8,
      });
    }
    return out;
  }

  drawBase(ctx, camera) {
    const sx = Math.max(0, Math.floor(camera.left));
    const sy = Math.max(0, Math.floor(camera.top));
    const sw = Math.min(VIEW.W, this.widthPx - sx);
    const sh = Math.min(VIEW.H, this.heightPx - sy);
    if (sw > 0 && sh > 0) {
      ctx.drawImage(this.staticCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
      ctx.drawImage(this.decalCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
    }

    for (const c of this.corpses) {
      drawCorpse(ctx, c.x, c.y, c.angle, c.variant);
    }

    // exit pad glow (animated)
    if (this.exitOpen) {
      const p = 0.5 + Math.sin(this.time * 4) * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12 + p * 0.12;
      ctx.fillStyle = '#35E0E8';
      ctx.fillRect(this.exit.x, this.exit.y, this.exit.w, this.exit.h);
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 3; i++) {
        const off = ((this.time * 22 + i * 18) % 54);
        ctx.fillRect(this.exit.x + 10, this.exit.y + 4 + off, this.exit.w - 20, 2);
      }
      ctx.restore();
    }
  }

  drawDoors(ctx) {
    for (const d of this.doors) d.draw(ctx, this.time);
  }

  drawPickups(ctx) {
    for (const p of this.pickups) p.draw(ctx);
  }

  nearestDoor(x, y, radius) {
    let best = null, bestD = radius * radius;
    for (const d of this.doors) {
      const dx = x - (d.px + 8), dy = y - (d.py + 8);
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = d; }
    }
    return best;
  }

  nearestPickup(x, y, radius) {
    let best = null, bestD = radius * radius;
    for (const p of this.pickups) {
      const dx = x - p.x, dy = y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = p; }
    }
    return best;
  }

  onExit(x, y) {
    return x >= this.exit.x && x <= this.exit.x + this.exit.w &&
      y >= this.exit.y && y <= this.exit.y + this.exit.h;
  }

  spawnPickup(data, fromDrop = false) {
    const pickup = new Pickup(this.game, {
      ...data,
      x: data.x, y: data.y,
    });
    pickup.spawnT = fromDrop ? 0.4 : 0.25;
    this.pickups.push(pickup);
    return pickup;
  }

  removePickup(p) {
    const i = this.pickups.indexOf(p);
    if (i >= 0) this.pickups.splice(i, 1);
  }

  addCorpse(x, y, angle, variant) {
    this.corpses.push({ x, y, angle, variant: variant % 4 });
    if (this.corpses.length > 20) this.corpses.shift();
  }

  addBlood(x, y, angle, amount = 10) {
    if (amount <= 0) return;
    const d = this.decalCtx;
    d.save();
    for (let i = 0; i < amount; i++) {
      const a = angle + rand(-1.5, 1.5);
      const dist = rand(0, 22);
      const size = rand(1, 4);
      d.fillStyle = rgba('#F04452', rand(0.35, 0.8));
      d.fillRect(
        Math.round(x + Math.cos(a) * dist),
        Math.round(y + Math.sin(a) * dist),
        Math.round(size), Math.round(size));
    }
    d.fillStyle = 'rgba(110,20,40,0.45)';
    d.beginPath();
    d.ellipse(x, y + 2, rand(5, 10), rand(3, 6), rand(0, 3), 0, Math.PI * 2);
    d.fill();
    d.restore();
    this.decalOps += amount;
    this._trimDecals();
  }

  addBulletHole(x, y) {
    const d = this.decalCtx;
    d.fillStyle = 'rgba(6,4,10,0.75)';
    d.fillRect(Math.round(x), Math.round(y), 2, 2);
    d.fillStyle = 'rgba(255,230,199,0.12)';
    d.fillRect(Math.round(x) + 2, Math.round(y), 1, 1);
    this.decalOps++;
    this._trimDecals();
  }

  _trimDecals() {
    if (this.decalOps < 420) return;
    this.decalOps = 0;
    const d = this.decalCtx;
    d.save();
    d.globalCompositeOperation = 'destination-out';
    d.fillStyle = 'rgba(0,0,0,0.35)';
    d.fillRect(0, 0, this.widthPx, this.heightPx);
    d.restore();
  }

  addLightPulse(x, y, color, radius, life) {
    this.pulses.push({ x, y, color, radius, life, maxLife: life });
  }
}
