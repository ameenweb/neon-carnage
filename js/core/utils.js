// Small, dependency-free math + canvas helpers.

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));

/** Frame-rate independent smoothing. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const chance = (p) => Math.random() < p;
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export const dist2 = (ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
};
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

/** Signed shortest difference between two angles, in [-PI, PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function lerpAngle(a, b, t) {
  return a + angleDiff(a, b) * t;
}

export function dampAngle(a, b, lambda, dt) {
  return a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
}

/** Circle vs axis-aligned rectangle. */
export function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

/** Ray (origin + unit dir) vs circle. Returns distance or -1. */
export function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const ex = cx - ox, ey = cy - oy;
  const t = ex * dx + ey * dy;
  if (t < 0) return -1;
  const px = ox + dx * t, py = oy + dy * t;
  const d2 = (cx - px) * (cx - px) + (cy - py) * (cy - py);
  if (d2 > r * r) return -1;
  const back = Math.sqrt(r * r - d2);
  return Math.max(0, t - back);
}

/** Ray vs AABB (slab method). Returns entry distance or -1. */
export function rayRect(ox, oy, dx, dy, rx, ry, rw, rh) {
  let tmin = 0, tmax = Infinity;
  if (Math.abs(dx) < 1e-8) {
    if (ox < rx || ox > rx + rw) return -1;
  } else {
    let t1 = (rx - ox) / dx, t2 = (rx + rw - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
  }
  if (Math.abs(dy) < 1e-8) {
    if (oy < ry || oy > ry + rh) return -1;
  } else {
    let t1 = (ry - oy) / dy, t2 = (ry + rh - oy) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
  }
  return tmin <= tmax ? tmin : -1;
}

export function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.floor((s * 100) % 100);
  return `${m}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export const pad2 = (n) => String(n).padStart(2, '0');

/** Seeded RNG for reproducible grime / texture detail. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas: c, ctx };
}

const rgbaCache = new Map();
/** '#RRGGBB' + alpha -> 'rgba(r,g,b,a)' (cached). */
export function rgba(hex, a = 1) {
  const key = hex + '|' + a;
  let v = rgbaCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  v = `rgba(${r},${g},${b},${a})`;
  rgbaCache.set(key, v);
  return v;
}

export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amount < 0) {
    r = Math.round(r * (1 + amount));
    g = Math.round(g * (1 + amount));
    b = Math.round(b * (1 + amount));
  } else {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  }
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
