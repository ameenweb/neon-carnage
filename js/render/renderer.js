import { VIEW } from '../config.js';
import { createCanvas } from '../core/utils.js';

/** Fixed 640x360 scene buffer, integer-scaled into the window. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = VIEW.W;
    canvas.height = VIEW.H;
    this.ctx.imageSmoothingEnabled = false;

    const scene = createCanvas(VIEW.W, VIEW.H);
    this.scene = scene.canvas;
    this.sctx = scene.ctx;
    this.sctx.imageSmoothingEnabled = false;

    this.scale = 1;
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this._buildVignette();
  }

  _buildVignette() {
    const { canvas, ctx } = createCanvas(VIEW.W, VIEW.H);
    const g = ctx.createRadialGradient(
      VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.28,
      VIEW.W / 2, VIEW.H / 2, VIEW.W * 0.72,
    );
    g.addColorStop(0, 'rgba(8,6,14,0)');
    g.addColorStop(0.62, 'rgba(8,6,14,0.18)');
    g.addColorStop(1, 'rgba(8,6,14,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);
    this.vignette = canvas;
  }

  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let scale = Math.min(Math.floor(vw / VIEW.W), Math.floor(vh / VIEW.H));
    if (scale < 1) scale = Math.min(vw / VIEW.W, vh / VIEW.H);
    this.scale = scale;
    const w = Math.round(VIEW.W * scale);
    const h = Math.round(VIEW.H * scale);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  clear() {
    this.sctx.fillStyle = '#08060E';
    this.sctx.fillRect(0, 0, VIEW.W, VIEW.H);
  }

  drawVignette() {
    this.sctx.drawImage(this.vignette, 0, 0);
  }

  present() {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.scene, 0, 0);
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
  }
}
