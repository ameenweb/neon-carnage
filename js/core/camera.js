import { VIEW } from '../config.js';
import { clamp, damp, rand } from './utils.js';

/** Centre-based camera with smooth follow, aim look-ahead and shake. */
export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = worldW / 2;
    this.y = worldH / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.shake = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.lookAhead = 26;
    this.zoom = 1;
  }

  setBounds(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
  }

  snapTo(x, y) {
    this.x = x; this.y = y;
    this.targetX = x; this.targetY = y;
    this.offsetX = 0; this.offsetY = 0;
  }

  addShake(amount) {
    this.shake = Math.min(7, this.shake + amount);
  }

  /**
   * @param {number} dt
   * @param {number} tx target centre x
   * @param {number} ty target centre y
   * @param {number} aimAngle aim angle (for look-ahead)
   * @param {boolean} shakeEnabled
   */
  update(dt, tx, ty, aimAngle = 0, shakeEnabled = true) {
    const lookX = Math.cos(aimAngle) * this.lookAhead;
    const lookY = Math.sin(aimAngle) * this.lookAhead;
    this.targetX = tx + lookX;
    this.targetY = ty + lookY;

    this.x = damp(this.x, this.targetX, 13, dt);
    this.y = damp(this.y, this.targetY, 13, dt);

    const halfW = VIEW.W / 2 / this.zoom;
    const halfH = VIEW.H / 2 / this.zoom;
    if (this.worldW > VIEW.W) this.x = clamp(this.x, halfW, this.worldW - halfW);
    else this.x = this.worldW / 2;
    if (this.worldH > VIEW.H) this.y = clamp(this.y, halfH, this.worldH - halfH);
    else this.y = this.worldH / 2;

    this.shake = Math.max(0, this.shake - dt * 34);
    if (shakeEnabled && this.shake > 0.05) {
      this.offsetX = rand(-this.shake, this.shake);
      this.offsetY = rand(-this.shake, this.shake);
    } else {
      this.offsetX = 0; this.offsetY = 0;
    }
  }

  get left() { return Math.round(this.x - VIEW.W / 2 + this.offsetX); }
  get top() { return Math.round(this.y - VIEW.H / 2 + this.offsetY); }

  screenToWorld(sx, sy) {
    return { x: sx + this.left, y: sy + this.top };
  }

  worldToScreen(wx, wy) {
    return { x: wx - this.left, y: wy - this.top };
  }

  /** True for entities inside (or slightly outside) the viewport. */
  isVisible(x, y, pad = 40) {
    return (
      x >= this.left - pad && x <= this.left + VIEW.W + pad &&
      y >= this.top - pad && y <= this.top + VIEW.H + pad
    );
  }
}
