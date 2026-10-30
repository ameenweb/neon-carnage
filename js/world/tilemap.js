import { TILE } from '../config.js';
import { circleRect, clamp } from '../core/utils.js';

/**
 * Tile grid + coarse prop broadphase.
 * Handles movement collision, line of sight, bullet raycasts and BFS navigation.
 */
export class TileMap {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.solid = new Uint8Array(w * h).fill(1);
    this.floor = new Uint8Array(w * h); // 0 = none, 1..7 = material
    this.nav = new Uint8Array(w * h);   // 1 = blocked for navigation
    this.props = [];
    this.propCells = new Map();
    this.doorBlocked = null;            // (tx,ty) => bool, set by Level

    // reusable BFS buffers
    const n = w * h;
    this._dist = new Int32Array(n);
    this._prev = new Int32Array(n);
    this._queue = new Int32Array(n);
  }

  idx(tx, ty) { return ty * this.w + tx; }
  inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }

  carveRect(x, y, w, h, floorType) {
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        if (!this.inBounds(tx, ty)) continue;
        const i = this.idx(tx, ty);
        this.floor[i] = floorType;
        this.solid[i] = 0;
      }
    }
  }

  isWall(tx, ty) {
    if (!this.inBounds(tx, ty)) return true;
    return this.solid[this.idx(tx, ty)] === 1;
  }

  isFloor(tx, ty) {
    return this.inBounds(tx, ty) && this.floor[this.idx(tx, ty)] !== 0;
  }

  isDoorBlocked(tx, ty) {
    return this.doorBlocked ? this.doorBlocked(tx, ty) : false;
  }

  /** Blocked for walking (wall or closed door). */
  tileBlocked(tx, ty) {
    return this.isWall(tx, ty) || this.isDoorBlocked(tx, ty);
  }

  addProp(p) {
    const prop = {
      solid: true, blocksSight: false, navBlock: true, layer: 'object',
      ...p,
    };
    this.props.push(prop);
    // register into coarse cells
    const x0 = Math.floor(prop.x / TILE), x1 = Math.floor((prop.x + prop.w) / TILE);
    const y0 = Math.floor(prop.y / TILE), y1 = Math.floor((prop.y + prop.h) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const key = ty * this.w + tx;
        let list = this.propCells.get(key);
        if (!list) { list = []; this.propCells.set(key, list); }
        list.push(prop);
      }
    }
    if (prop.solid && prop.navBlock) {
      const cx0 = Math.floor(prop.x / TILE), cx1 = Math.floor((prop.x + prop.w - 0.01) / TILE);
      const cy0 = Math.floor(prop.y / TILE), cy1 = Math.floor((prop.y + prop.h - 0.01) / TILE);
      for (let ty = cy0; ty <= cy1; ty++) {
        for (let tx = cx0; tx <= cx1; tx++) {
          if (this.inBounds(tx, ty)) this.nav[this.idx(tx, ty)] = 1;
        }
      }
    }
    return prop;
  }

  propsAt(px, py) {
    return this.propCells.get(Math.floor(py / TILE) * this.w + Math.floor(px / TILE));
  }

  propBlockedAt(px, py) {
    const list = this.propsAt(px, py);
    if (!list) return false;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.solid) continue;
      if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return true;
    }
    return false;
  }

  /** Circle vs world (tiles + solid props + closed doors). */
  circleBlocked(x, y, r) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.tileBlocked(tx, ty) &&
            circleRect(x, y, r, tx * TILE, ty * TILE, TILE, TILE)) {
          return true;
        }
      }
    }
    const cx0 = Math.floor(x / TILE), cy0 = Math.floor(y / TILE);
    for (let ty = cy0 - 1; ty <= cy0 + 1; ty++) {
      for (let tx = cx0 - 1; tx <= cx0 + 1; tx++) {
        const list = this.propCells.get(ty * this.w + tx);
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          if (p.solid && circleRect(x, y, r, p.x, p.y, p.w, p.h)) return true;
        }
      }
    }
    return false;
  }

  /** Axis-separated slide movement. */
  moveCircle(x, y, r, dx, dy) {
    let nx = x, ny = y, hitX = false, hitY = false;
    if (dx !== 0) {
      if (!this.circleBlocked(x + dx, y, r)) nx = x + dx;
      else {
        hitX = true;
        // micro-step to hug the surface
        const step = Math.sign(dx) * 0.5;
        for (let i = 0; i < 4; i++) {
          if (!this.circleBlocked(nx + step, y, r)) nx += step; else break;
        }
      }
    }
    if (dy !== 0) {
      if (!this.circleBlocked(nx, y + dy, r)) ny = y + dy;
      else {
        hitY = true;
        const step = Math.sign(dy) * 0.5;
        for (let i = 0; i < 4; i++) {
          if (!this.circleBlocked(nx, ny + step, r)) ny += step; else break;
        }
      }
    }
    return { x: nx, y: ny, hitX, hitY };
  }

  /** Straight-line visibility, blocked by walls, closed doors and tall props. */
  lineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const steps = Math.ceil(d / 4);
    const sx = dx / steps, sy = dy / steps;
    let x = x1, y = y1;
    for (let i = 1; i < steps; i++) {
      x += sx; y += sy;
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (this.tileBlocked(tx, ty)) return false;
      const list = this.propsAt(x, y);
      if (list) {
        for (let k = 0; k < list.length; k++) {
          const p = list[k];
          if (p.blocksSight && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /** Wall distance along a ray (for bullet impacts). */
  raycastWall(x, y, dx, dy, maxDist) {
    const steps = Math.ceil(maxDist / 4);
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * maxDist;
      const px = x + dx * t, py = y + dy * t;
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      if (this.tileBlocked(tx, ty) || this.propBlockedAt(px, py)) return t;
    }
    return maxDist;
  }

  isFree(x, y, r) {
    return !this.circleBlocked(x, y, r);
  }

  /** Walkability along a straight line (used to smooth BFS paths). */
  navClear(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const steps = Math.ceil(d / 5);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t, py = y1 + dy * t;
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      if (!this.inBounds(tx, ty)) return false;
      const idx = ty * this.w + tx;
      if (this.solid[idx] || this.nav[idx]) return false;
      const list = this.propsAt(px, py);
      if (list) {
        for (let k = 0; k < list.length; k++) {
          const p = list[k];
          if (p.solid && px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return false;
        }
      }
    }
    return true;
  }

  /** BFS on the 16px nav grid. Returns array of world waypoints or null. */
  findPath(sx, sy, tx, ty) {
    const w = this.w, h = this.h;
    let startX = clamp(Math.floor(sx / TILE), 0, w - 1);
    let startY = clamp(Math.floor(sy / TILE), 0, h - 1);
    let goalX = clamp(Math.floor(tx / TILE), 0, w - 1);
    let goalY = clamp(Math.floor(ty / TILE), 0, h - 1);

    const free = (x, y) => {
      if (!this.inBounds(x, y)) return false;
      const i = y * w + x;
      return !this.solid[i] && !this.nav[i];
    };

    if (!free(goalX, goalY)) {
      // snap goal to nearest navigable neighbour
      let best = null, bestD = Infinity;
      for (let ry = -2; ry <= 2; ry++) {
        for (let rx = -2; rx <= 2; rx++) {
          if (free(goalX + rx, goalY + ry)) {
            const d = rx * rx + ry * ry;
            if (d < bestD) { bestD = d; best = [goalX + rx, goalY + ry]; }
          }
        }
      }
      if (!best) return null;
      goalX = best[0]; goalY = best[1];
    }
    if (!free(startX, startY)) {
      let found = false;
      for (let ry = -1; ry <= 1 && !found; ry++) {
        for (let rx = -1; rx <= 1 && !found; rx++) {
          if (free(startX + rx, startY + ry)) { startX += rx; startY += ry; found = true; }
        }
      }
      if (!found) return null;
    }

    const start = startY * w + startX;
    const goal = goalY * w + goalX;
    if (start === goal) return [{ x: tx, y: ty }];

    const distArr = this._dist, prev = this._prev, queue = this._queue;
    distArr.fill(-1);
    distArr[start] = 0;
    prev[start] = -1;
    let head = 0, tail = 0;
    queue[tail++] = start;

    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];

    let found = false;
    while (head < tail) {
      const cur = queue[head++];
      if (cur === goal) { found = true; break; }
      const cx = cur % w, cy = (cur / w) | 0;
      const cd = distArr[cur];
      for (let k = 0; k < 8; k++) {
        const nx = cx + dirs[k][0], ny = cy + dirs[k][1];
        if (!free(nx, ny)) continue;
        if (k >= 4) {
          // no corner cutting through walls or solid props
          if (!free(cx + dirs[k][0], cy) || !free(cx, cy + dirs[k][1])) continue;
        }
        const ni = ny * w + nx;
        if (distArr[ni] !== -1) continue;
        distArr[ni] = cd + 1;
        prev[ni] = cur;
        queue[tail++] = ni;
      }
    }
    if (!found) return null;

    const tiles = [];
    let cur = goal;
    while (cur !== start && cur !== -1) {
      tiles.push(cur);
      cur = prev[cur];
    }
    tiles.reverse();

    // drop waypoints that are already visible from the previous one
    const pts = tiles.map((i) => ({
      x: (i % w) * TILE + TILE / 2,
      y: ((i / w) | 0) * TILE + TILE / 2,
    }));
    pts.push({ x: tx, y: ty });

    const out = [];
    let ax = sx, ay = sy;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.navClear(ax, ay, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]);
      ax = pts[j].x; ay = pts[j].y;
      if (j === i) i++;
      else i = j + 1;
    }
    return out.length ? out : null;
  }
}
