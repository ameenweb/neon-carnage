import { createCanvas, shade } from '../core/utils.js';

// ---------------------------------------------------------------------------
// Procedural pixel-art atlas. Everything is generated once at boot; no external
// images. Dimensions and anchors follow ART_BIBLE.md.
// ---------------------------------------------------------------------------

const CHAR_DEFS = {
  player: {
    jacket: '#FFE6C7', trousers: '#21152F', hair: '#100D18',
    accent: '#35E0E8', skin: '#E8C29B', bulk: 0,
  },
  thug: {
    jacket: '#FF287F', trousers: '#100D18', hair: '#FF287F',
    accent: '#F04452', skin: '#E8C29B', bulk: 0, mohawk: true,
  },
  goon: {
    jacket: '#35E0E8', trousers: '#21152F', hair: '#21152F',
    accent: '#F04452', skin: '#E8C29B', bulk: 0,
  },
  heavy: {
    jacket: '#FF9A3C', trousers: '#100D18', hair: '#100D18',
    accent: '#F04452', skin: '#E8C29B', bulk: 1, bald: true,
  },
  corpse: {
    jacket: '#FF287F', trousers: '#100D18', hair: '#FF287F',
    accent: '#F04452', skin: '#E8C29B', bulk: 0,
  },
};

export const POSES = {
  idle: 2,
  walk: 4,
  shoot: 2,
  melee: 2,
};

export const SPRITES = {
  chars: {},
  corpses: [],
  weapons: {},
  flashes: [],
  muzzle: {
    fists: 10, bat: 30, pistol: 19, smg: 24, shotgun: 30,
  },
  weaponHeight: {},
};

const OUTLINE = '#08060E';

function pixelCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

function block(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function outlinedBlock(ctx, x, y, w, h, color, outline = OUTLINE) {
  block(ctx, x - 1, y - 1, w + 2, h + 2, outline);
  block(ctx, x, y, w, h, color);
}

function makeBody(type, pose, frame) {
  const def = CHAR_DEFS[type] || CHAR_DEFS.thug;
  const { canvas, ctx } = createCanvas(28, 28);
  ctx.imageSmoothingEnabled = false;
  ctx.translate(14, 14);

  const walk = pose === 'walk' ? [-2, 0, 2, 0][frame] : 0;
  const bob = pose === 'walk' ? [0, -1, 0, -1][frame] :
    pose === 'idle' ? [0, 1][frame] : 0;
  const recoil = pose === 'shoot' ? [0, -1][frame] : 0;
  const lunge = pose === 'melee' ? [0, 2][frame] : 0;

  const bulk = def.bulk;

  // ---- boots (rear) ----
  outlinedBlock(ctx, 5 - walk + recoil, 6 + bob, 4, 3, shade(def.trousers, 0.12));
  outlinedBlock(ctx, 5 + walk + recoil, 19 + bob, 4, 3, def.trousers);
  block(ctx, 6 - walk + recoil, 7 + bob, 2, 1, shade(def.trousers, 0.25));

  // ---- torso ----
  const tx = 7 + recoil, ty = 8 + bob;
  const tw = 12 + bulk, th = 12 + bulk;
  outlinedBlock(ctx, tx, ty, tw, th, def.jacket);
  // rear shroud (jacket back reads darker)
  block(ctx, tx, ty + 2, 3, th - 4, shade(def.jacket, -0.28));
  // shoulder rim light (top)
  block(ctx, tx + 1, ty, tw - 3, 1, shade(def.jacket, 0.28));
  // collar / faction accent at the neck
  block(ctx, tx + tw - 3, ty + 2, 2, th - 4, def.accent);
  // trousers hem
  block(ctx, tx + 3, ty + th - 1, tw - 6, 1, def.trousers);

  // ---- arms + hands ----
  const handY = pose === 'melee' && frame === 1 ? 14 : 14;
  const handX = 22 + recoil + (pose === 'melee' ? (frame === 1 ? 2 : -2) : 0) + lunge;
  // arm lines from shoulders to grip
  for (const sy of [ty + 2, ty + th - 4]) {
    block(ctx, 16 + recoil, sy, 3, 2, OUTLINE);
    block(ctx, 18 + recoil, sy + (sy < 14 ? 0 : 0), 3, 1, def.jacket);
  }
  block(ctx, handX - 1, handY - 2, 3, 2, OUTLINE);
  block(ctx, handX, handY - 1, 2, 1, def.skin);
  block(ctx, handX - 1, handY + 1, 3, 2, OUTLINE);
  block(ctx, handX, handY + 2, 2, 1, def.skin);

  // ---- head ----
  const hx = 17 + recoil + Math.round(lunge * 0.5);
  const hy = 13 + bob;
  pixelCircle(ctx, hx, hy, 5, OUTLINE);
  pixelCircle(ctx, hx, hy, 4, def.bald ? def.skin : def.hair);
  if (!def.bald) {
    // face wedge forward
    pixelCircle(ctx, hx + 1, hy, 3, def.skin);
    // hair top stripe
    block(ctx, hx - 4, hy - 3, 4, 2, shade(def.hair, 0.2));
  } else {
    block(ctx, hx - 2, hy - 3, 3, 1, shade(def.skin, -0.2));
  }
  if (def.mohawk) {
    block(ctx, hx - 6, hy - 1, 4, 2, OUTLINE);
    block(ctx, hx - 6, hy, 3, 1, def.hair);
    block(ctx, hx - 7, hy - 2, 1, 1, shade(def.hair, 0.3));
  }
  // eye / visor pixel (threat read)
  block(ctx, hx + 3, hy - 1, 1, 1, def.accent);
  block(ctx, hx + 2, hy + 2, 2, 1, shade(def.skin, -0.25));

  return canvas;
}

function weaponCanvas(id) {
  const setup = (w, h) => {
    const c = createCanvas(w, h);
    c.ctx.imageSmoothingEnabled = false;
    return c;
  };
  if (id === 'pistol') {
    const { canvas, ctx } = setup(13, 10);
    outlinedBlock(ctx, 2, 3, 8, 3, '#3A2C4F');
    block(ctx, 9, 4, 3, 1, '#6A5A80');
    outlinedBlock(ctx, 3, 5, 3, 4, '#2A2038');
    block(ctx, 5, 3, 2, 1, '#35E0E8');
    block(ctx, 3, 4, 1, 1, '#FFE6C7');
    SPRITES.weaponHeight[id] = 10;
    return canvas;
  }
  if (id === 'smg') {
    const { canvas, ctx } = setup(18, 12);
    outlinedBlock(ctx, 2, 3, 12, 4, '#3A2C4F');
    block(ctx, 12, 4, 4, 2, '#6A5A80');
    outlinedBlock(ctx, 5, 6, 3, 4, '#2A2038');
    outlinedBlock(ctx, 9, 6, 3, 3, '#FF287F');
    block(ctx, 2, 6, 3, 3, '#2A2038');
    block(ctx, 3, 4, 7, 1, '#FF9A3C');
    SPRITES.weaponHeight[id] = 12;
    return canvas;
  }
  if (id === 'shotgun') {
    const { canvas, ctx } = setup(24, 12);
    outlinedBlock(ctx, 2, 4, 19, 3, '#3A2C4F');
    block(ctx, 19, 4, 3, 2, '#6A5A80');
    outlinedBlock(ctx, 7, 6, 5, 3, '#FF9A3C');
    outlinedBlock(ctx, 2, 5, 5, 4, '#2A2038');
    block(ctx, 17, 4, 4, 1, '#35E0E8');
    SPRITES.weaponHeight[id] = 12;
    return canvas;
  }
  if (id === 'bat') {
    const { canvas, ctx } = setup(26, 8);
    outlinedBlock(ctx, 2, 3, 5, 3, '#21152F');
    outlinedBlock(ctx, 6, 3, 17, 3, '#8A5B3A');
    block(ctx, 21, 2, 3, 4, '#A9714A');
    block(ctx, 8, 3, 3, 3, '#FF287F');
    block(ctx, 12, 3, 2, 3, '#FF287F');
    SPRITES.weaponHeight[id] = 8;
    return canvas;
  }
  const { canvas } = setup(4, 4);
  return canvas;
}

function makeCorpse(variant) {
  const { canvas, ctx } = createCanvas(34, 26);
  ctx.imageSmoothingEnabled = false;
  ctx.translate(17, 13);
  const def = CHAR_DEFS[variant % 2 === 0 ? 'thug' : 'goon'];
  const rot = variant % 2 === 0 ? 0.5 : -0.7;
  ctx.rotate(rot);
  // sprawled limbs
  block(ctx, -12, -2, 9, 3, OUTLINE);
  block(ctx, -11, -1, 8, 1, def.trousers);
  block(ctx, 2, -9, 3, 8, OUTLINE);
  block(ctx, 3, -8, 1, 6, def.skin);
  block(ctx, -3, 5, 8, 3, OUTLINE);
  // torso
  outlinedBlock(ctx, -6, -5, 12, 10, def.jacket);
  block(ctx, -4, -4, 3, 8, shade(def.jacket, -0.3));
  // head
  pixelCircle(ctx, 8, 0, 4, OUTLINE);
  pixelCircle(ctx, 8, 0, 3, def.skin);
  block(ctx, 6, -2, 3, 1, def.hair);
  return canvas;
}

function makeFlash(frame) {
  const { canvas, ctx } = createCanvas(26, 26);
  ctx.translate(3, 13);
  const len = [14, 11, 7][frame];
  ctx.fillStyle = '#FFE6C7';
  ctx.beginPath();
  ctx.moveTo(0, -2); ctx.lineTo(len, -1); ctx.lineTo(len + 2, 0);
  ctx.lineTo(len, 1); ctx.lineTo(0, 2); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FF9A3C';
  ctx.beginPath();
  ctx.moveTo(0, -1); ctx.lineTo(len + 6, 0); ctx.lineTo(0, 1); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FF287F';
  ctx.fillRect(len - 2, -3, 2, 1);
  ctx.fillRect(len - 2, 3, 2, 1);
  return canvas;
}

export function buildSprites() {
  for (const [type, poses] of Object.entries(POSES)) {
    // noop — kept for clarity
  }
  for (const type of ['player', 'thug', 'goon', 'heavy']) {
    SPRITES.chars[type] = {};
    for (const pose of Object.keys(POSES)) {
      const n = POSES[pose];
      const arr = [];
      for (let f = 0; f < n; f++) arr.push(makeBody(type, pose, f));
      SPRITES.chars[type][pose] = arr;
    }
  }
  for (let i = 0; i < 4; i++) SPRITES.corpses.push(makeCorpse(i));
  for (const id of ['pistol', 'smg', 'shotgun', 'bat']) {
    SPRITES.weapons[id] = weaponCanvas(id);
  }
  for (let f = 0; f < 3; f++) SPRITES.flashes.push(makeFlash(f));
  return SPRITES;
}

/**
 * Draw a rotating top-down character.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawCharacter(ctx, type, x, y, angle, pose, frame, weaponId = null, opts = {}) {
  const set = SPRITES.chars[type] || SPRITES.chars.thug;
  const list = set[pose] || set.idle;
  const img = list[frame % list.length];

  ctx.save();
  ctx.translate(x, y);
  if (opts.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.rotate(angle);
  ctx.drawImage(img, -14, -14);
  if (weaponId && SPRITES.weapons[weaponId]) {
    const w = SPRITES.weapons[weaponId];
    const h = SPRITES.weaponHeight[weaponId] ?? 8;
    ctx.drawImage(w, 6, -h / 2);
  }
  ctx.restore();
}

export function drawCorpse(ctx, x, y, angle, variant) {
  const img = SPRITES.corpses[variant % SPRITES.corpses.length];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(img, -17, -13);
  ctx.restore();
}

export function drawWeaponIcon(ctx, weaponId, x, y, angle = 0, scale = 1) {
  const img = SPRITES.weapons[weaponId];
  if (!img) return;
  const h = SPRITES.weaponHeight[weaponId] ?? 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -img.width / 2, -h / 2);
  ctx.restore();
}

export function drawFlash(ctx, x, y, angle, frame, scale = 1) {
  const img = SPRITES.flashes[Math.min(frame, SPRITES.flashes.length - 1)];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, -3, -13);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

export { CHAR_DEFS };
