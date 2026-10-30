// NEON CARNAGE — boot entry point.
// Builds the procedural art atlas, waits for the bundled font, then starts the
// fixed-timestep-ish requestAnimationFrame loop.

import { Game } from './core/game.js';
import { buildSprites } from './render/sprites.js';

const $ = (id) => document.getElementById(id);
const boot = $('boot');

let game = null;
let fatalShown = false;

function showFatal(err) {
  if (fatalShown) return;
  fatalShown = true;
  console.error('[neon-carnage] fatal:', err);

  const box = document.createElement('div');
  box.className = 'fatal';
  const title = document.createElement('div');
  title.className = 'fatal-title';
  title.textContent = 'THE NIGHT CRASHED';
  const msg = document.createElement('pre');
  msg.className = 'fatal-msg';
  msg.textContent = String((err && (err.stack || err.message)) || err || 'Unknown error');
  const hint = document.createElement('div');
  hint.className = 'fatal-hint';
  hint.textContent = 'RELOAD THE PAGE TO TRY AGAIN';
  box.append(title, msg, hint);
  document.body.appendChild(box);
  if (boot) boot.classList.add('done');
}

window.addEventListener('error', (e) => {
  showFatal(e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  showFatal(e.reason);
});

/** Give the local font a short chance to load before we bake canvas text. */
function waitForFonts() {
  if (!document.fonts || typeof document.fonts.load !== 'function') {
    return Promise.resolve();
  }
  const load = Promise.all([
    document.fonts.load('16px Silkscreen'),
    document.fonts.load('700 16px Silkscreen'),
  ]).then(() => document.fonts.ready);
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 1800));
  return Promise.race([load, timeout]).catch(() => undefined);
}

let started = false;

async function start() {
  if (started) return;
  started = true;

  try {
    await waitForFonts();

    // All art is generated here — no image files are loaded anywhere.
    buildSprites();

    const canvas = $('game');
    if (!canvas) throw new Error('Missing #game canvas');

    game = new Game(canvas);
    // Handy for debugging and for the smoke test in tools/.
    window.NEON_CARNAGE = game;

    // ?autostart / #autostart jumps straight into the level for quick testing.
    const params = new URLSearchParams(window.location.search);
    if (params.has('autostart') || window.location.hash === '#autostart') {
      game.startGame();
    }

    let last = performance.now();
    let reportedSlow = false;

    const frame = (now) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      try {
        game.frame(dt);
      } catch (err) {
        showFatal(err);
        return;
      }
      if (!reportedSlow && dt > 0.05) {
        // Not fatal: just once in the console, useful on low-end machines.
        reportedSlow = true;
        console.info('[neon-carnage] first slow frame:', Math.round(dt * 1000), 'ms');
      }
      window.requestAnimationFrame(frame);
    };

    window.requestAnimationFrame(frame);

    // Reveal the attract-mode menu.
    window.requestAnimationFrame(() => {
      if (boot) {
        boot.classList.add('done');
        window.setTimeout(() => boot.remove(), 600);
      }
    });

    // Auto-pause when the player tabs away.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game && game.state === 'playing') game.pause();
    });
  } catch (err) {
    showFatal(err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
