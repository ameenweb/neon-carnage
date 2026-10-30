import { KEYMAP, VIEW } from '../config.js';

/**
 * Action-mapped keyboard + mouse input.
 * Per-frame `pressed` / `released` sets are cleared by endFrame().
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.wheel = 0;
    this.mouse = {
      sx: VIEW.W / 2, sy: VIEW.H / 2,   // internal-resolution pixels
      cx: 0, cy: 0,                     // CSS pixels relative to canvas
      clientX: window.innerWidth / 2, clientY: window.innerHeight / 2,
      inside: false,
      down: false, rightDown: false,
      pressed: false, released: false,
    };
    this.enabled = true;

    this._onKeyDown = (e) => {
      if (this._isTypingTarget(e.target)) return;
      if (this._gameKey(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) {
        this.keys.add(e.code);
        this.pressed.add(e.code);
      }
    };
    this._onKeyUp = (e) => {
      if (this._isTypingTarget(e.target)) return;
      if (this._gameKey(e.code)) e.preventDefault();
      this.keys.delete(e.code);
      this.released.add(e.code);
    };
    this._onMouseMove = (e) => this._setMouse(e);
    this._onMouseDown = (e) => {
      this._setMouse(e);
      if (e.button === 0) {
        this.mouse.down = true;
        this.mouse.pressed = true;
      } else if (e.button === 2) {
        this.mouse.rightDown = true;
      }
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) {
        if (this.mouse.down) this.mouse.released = true;
        this.mouse.down = false;
      } else if (e.button === 2) {
        this.mouse.rightDown = false;
      }
    };
    this._onWheel = (e) => {
      this.wheel += Math.sign(e.deltaY);
      if (e.target === canvas) e.preventDefault();
    };
    this._onBlur = () => this.clear();
    this._onContext = (e) => e.preventDefault();

    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp, { passive: false });
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('contextmenu', this._onContext);
  }

  _isTypingTarget(t) {
    if (!t) return false;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  _gameKey(code) {
    for (const list of Object.values(KEYMAP)) if (list.includes(code)) return true;
    return false;
  }

  _setMouse(e) {
    this.mouse.clientX = e.clientX;
    this.mouse.clientY = e.clientY;
    const r = this.canvas.getBoundingClientRect();
    this.mouse.cx = e.clientX - r.left;
    this.mouse.cy = e.clientY - r.top;
    this.mouse.inside =
      this.mouse.cx >= 0 && this.mouse.cy >= 0 &&
      this.mouse.cx <= r.width && this.mouse.cy <= r.height;
    this.mouse.sx = (this.mouse.cx / r.width) * VIEW.W;
    this.mouse.sy = (this.mouse.cy / r.height) * VIEW.H;
  }

  isDown(action) {
    if (action === 'shoot') return this.mouse.down;
    const codes = KEYMAP[action];
    if (!codes) return false;
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  wasPressed(action) {
    if (action === 'shoot') return this.mouse.pressed;
    const codes = KEYMAP[action];
    if (!codes) return false;
    for (const c of codes) if (this.pressed.has(c)) return true;
    return false;
  }

  wasReleased(action) {
    if (action === 'shoot') return this.mouse.released;
    const codes = KEYMAP[action];
    if (!codes) return false;
    for (const c of codes) if (this.released.has(c)) return true;
    return false;
  }

  /** Raw key check (used for "any key" prompts). */
  anyPressed() {
    return this.pressed.size > 0 || this.mouse.pressed;
  }

  moveVector() {
    let x = 0, y = 0;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('right')) x += 1;
    if (this.isDown('up')) y -= 1;
    if (this.isDown('down')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = Math.SQRT1_2;
      x *= inv; y *= inv;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.wheel = 0;
    this.mouse.pressed = false;
    this.mouse.released = false;
  }

  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.released.clear();
    this.wheel = 0;
    this.mouse.down = false;
    this.mouse.rightDown = false;
    this.mouse.pressed = false;
    this.mouse.released = false;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('contextmenu', this._onContext);
  }
}
