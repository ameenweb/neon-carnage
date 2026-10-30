import { WEAPONS } from '../config.js';
import { angleDiff, angleTo, rand, rayCircle } from '../core/utils.js';

/**
 * Hitscan weapon fire. Lethal: a single hit kills an enemy or the player.
 * Returns the number of entities hit.
 */
export function fireHitscan(game, shooter, angle, weaponId, opts = {}) {
  const def = WEAPONS[weaponId];
  if (!def) return { hits: 0 };
  const isPlayer = shooter.isPlayer === true;
  const muzzle = opts.muzzle ?? 12;
  const ox = shooter.x + Math.cos(angle) * muzzle;
  const oy = shooter.y + Math.sin(angle) * muzzle;

  const pellets = opts.pellets ?? def.pellets ?? 1;
  const spread = opts.spread ?? def.spread ?? 0;
  const range = opts.range ?? def.range ?? 400;
  const color = opts.color ?? def.tracer ?? '#FFE6C7';

  let hits = 0;

  for (let i = 0; i < pellets; i++) {
    let a;
    if (pellets > 1) {
      const t = pellets === 1 ? 0 : i / (pellets - 1) - 0.5;
      a = angle + t * spread * 2.0 + rand(-spread * 0.25, spread * 0.25);
    } else {
      a = angle + rand(-spread, spread);
    }
    const dx = Math.cos(a), dy = Math.sin(a);

    let hitDist = game.tilemap.raycastWall(ox, oy, dx, dy, range);
    let target = null;

    const targets = isPlayer ? game.enemies : [game.player];
    for (let k = 0; k < targets.length; k++) {
      const t = targets[k];
      if (!t || t.dead) continue;
      const d = rayCircle(ox, oy, dx, dy, t.x, t.y, t.radius + 1.5);
      if (d >= 0 && d < hitDist) {
        hitDist = d;
        target = t;
      }
    }

    const ex = ox + dx * hitDist;
    const ey = oy + dy * hitDist;
    game.effects.tracer(ox, oy, ex, ey, color, 0.07);

    if (target) {
      hits++;
      if (isPlayer) game.killEnemy(target, a, 'shot');
      else game.killPlayer(target, a);
    } else {
      game.particles.sparks(ex, ey, a, 4);
      game.particles.smoke(ex, ey, 1, '#35E0E8');
      game.level.addBulletHole(ex, ey);
    }
  }

  return { hits };
}

/** Directional melee sweep. Lethal, respects walls. */
export function meleeAttack(game, attacker, opts) {
  const reach = opts.reach;
  const arc = opts.arc;
  const isPlayer = attacker.isPlayer === true;
  const targets = isPlayer ? game.enemies : [game.player];
  let hits = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!t || t.dead) continue;
    const d = Math.hypot(t.x - attacker.x, t.y - attacker.y);
    if (d > reach + t.radius) continue;
    const a = angleTo(attacker.x, attacker.y, t.x, t.y);
    if (Math.abs(angleDiff(attacker.angle, a)) > arc * 0.5) continue;
    if (!game.tilemap.lineOfSight(attacker.x, attacker.y, t.x, t.y)) continue;
    hits++;
    if (isPlayer) game.killEnemy(t, a, 'melee');
    else game.killPlayer(t, a);
  }
  return { hits };
}
