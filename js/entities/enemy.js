import { AI, ENEMIES, WEAPONS } from '../config.js';
import { angleDiff, angleTo, dampAngle, dist, rand, randInt } from '../core/utils.js';
import { SPRITES, drawCharacter } from '../render/sprites.js';
import { fireHitscan } from '../systems/combat.js';

/**
 * Enemy behaviour: IDLE → PATROL → ALERT → CHASE → ATTACK
 *                                    ↘ INVESTIGATE ↗
 * DEAD is terminal.
 */
export class Enemy {
  constructor(game, type, tx, ty, patrolTiles = []) {
    this.game = game;
    this.type = type;
    this.def = ENEMIES[type];
    this.isPlayer = false;

    this.x = tx * 16;
    this.y = ty * 16;
    this.radius = this.def.radius;
    this.angle = rand(0, Math.PI * 2);
    this.seed = rand(0, 10);

    this.weaponId = this.def.weapon;
    this.weapon = WEAPONS[this.weaponId];

    this.state = 'IDLE';
    this.stateT = 0;
    this.idleT = rand(0.4, 1.4);
    this.aware = false;
    this.reaction = this.def.reaction;

    this.patrol = patrolTiles.length
      ? patrolTiles.map((p) => ({ x: p[0] * 16, y: p[1] * 16 }))
      : [{ x: this.x, y: this.y }];
    this.patrolIndex = this.patrol.length > 1 ? 1 : 0;
    this.waitT = rand(0, 0.8);

    this.path = null;
    this.pathIndex = 0;
    this.pathGoal = { x: this.x, y: this.y };
    this.repathT = 0;
    this.stuckT = 0;
    this.moveAngle = this.angle;
    this.moving = false;

    this.lastKnown = { x: this.x, y: this.y };
    this.lastSeenT = 99;
    this.sees = false;

    this.fireCd = rand(0.4, 1.0);
    this.burstLeft = 0;
    this.shootAnim = 0;
    this.windup = 0;
    this.struck = true;
    this.strikeCd = 0;
    this.aimGlow = 0;

    this.alertPip = 0;
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeT = rand(0.9, 2.0);

    this.dead = false;
    this.deathT = 0;
    this.corpseVariant = randInt(0, 3);
    this.pose = 'idle';
    this.frame = 0;
    this.animT = rand(0, 2);
    this.weaponRaised = false;
  }

  _setState(s) {
    this.state = s;
    this.stateT = 0;
    this.path = null;
    this.repathT = 0;
  }

  _perceive() {
    const p = this.game.player;
    if (!p || p.dead) return false;
    const d = dist(this.x, this.y, p.x, p.y);
    if (d > this.def.viewRange) return false;
    if (d > 46) {
      const to = angleTo(this.x, this.y, p.x, p.y);
      const fov = this.aware ? 2.7 : this.def.fov;
      if (Math.abs(angleDiff(this.angle, to)) > fov * 0.5) return false;
    }
    return this.game.tilemap.lineOfSight(this.x, this.y, p.x, p.y);
  }

  _spotPlayer() {
    const p = this.game.player;
    this.aware = true;
    this._setState('ALERT');
    this.reaction = this.def.reaction + rand(0, 0.18);
    this.alertPip = 1.2;
    this.lastKnown.x = p.x;
    this.lastKnown.y = p.y;
    this.lastSeenT = 0;
    this.game.audio.play('alert');
    this.game.alertNearby(this, AI.alertShoutRadius);
    this.game.ui.setStatus('DETECTED');
  }

  onNoise(x, y, radius, kind = 'shot') {
    if (this.dead) return;
    const d = dist(this.x, this.y, x, y);
    if (d > radius) return;
    if (kind === 'step' && (this.state === 'CHASE' || this.state === 'ATTACK')) return;
    if (this.state === 'ATTACK') return;

    this.lastKnown.x = x;
    this.lastKnown.y = y;
    if (!this.aware) {
      this._setState('INVESTIGATE');
      this.repathT = 0;
    } else if (this.state === 'INVESTIGATE') {
      this.stateT = 0;
    }
  }

  update(dt) {
    if (this.dead) { this.deathT += dt; return; }
    const game = this.game;
    const p = game.player;

    this.stateT += dt;
    this.fireCd -= dt;
    this.strikeCd = Math.max(0, this.strikeCd - dt);
    this.shootAnim = Math.max(0, this.shootAnim - dt);
    this.alertPip = Math.max(0, this.alertPip - dt);
    this.animT += dt;
    this.moving = false;
    this.aimGlow = 0;

    if (this.windup > 0) {
      this.windup -= dt;
    }

    if (!p || p.dead) {
      if (this.state !== 'IDLE') this._setState('IDLE');
    } else {
      const sees = this._perceive();
      this.sees = sees;
      if (sees) {
        this.lastKnown.x = p.x;
        this.lastKnown.y = p.y;
        this.lastSeenT = 0;
        if (!this.aware) this._spotPlayer();
        else if (this.state === 'INVESTIGATE') this._setState('CHASE');
      } else {
        this.lastSeenT += dt;
      }

      this._think(dt, sees);
    }

    // facing
    if (this.sees && this.state !== 'INVESTIGATE' && this.state !== 'PATROL') {
      this.angle = dampAngle(this.angle, angleTo(this.x, this.y, p.x, p.y), 10, dt);
    } else if (this.moving) {
      this.angle = dampAngle(this.angle, this.moveAngle, 7, dt);
    } else if (this.state === 'INVESTIGATE' || this.state === 'PATROL' || this.state === 'IDLE') {
      this.angle += Math.sin(this.stateT * 1.4 + this.seed) * dt * 0.7;
    }

    // doors
    if (this.state === 'CHASE' || this.state === 'INVESTIGATE' || this.state === 'ATTACK') {
      const door = game.level.nearestDoor(this.x, this.y, 22);
      if (door && door.closed) door.open('enemy');
    }

    // animation pose
    if (this.windup > 0) {
      this.pose = 'melee';
      this.frame = this.windup > this.def.telegraph * 0.45 ? 1 : 0;
    } else if (this.shootAnim > 0) {
      this.pose = 'shoot';
      this.frame = this.shootAnim > 0.045 ? 1 : 0;
    } else if (this.moving) {
      this.pose = 'walk';
      this.frame = Math.floor(this.animT * 8) % 4;
    } else {
      this.pose = 'idle';
      this.frame = Math.floor(this.animT * 3) % 2;
    }
  }

  _think(dt, sees) {
    switch (this.state) {
      case 'IDLE':
        if (this.stateT > this.idleT) this._setState('PATROL');
        break;
      case 'PATROL':
        this._patrol(dt);
        break;
      case 'ALERT':
        if (!sees && this.lastSeenT > 0.5) {
          this._setState('INVESTIGATE');
          break;
        }
        if (this.stateT >= this.reaction) this._setState('CHASE');
        break;
      case 'CHASE':
        this._chase(dt, sees);
        break;
      case 'ATTACK':
        this._attack(dt, sees);
        break;
      case 'INVESTIGATE':
        this._investigate(dt, sees);
        break;
      default:
        break;
    }
  }

  _patrol(dt) {
    const p = this.game.player;
    if (this.waitT > 0) {
      this.waitT -= dt;
      return;
    }
    const target = this.patrol[this.patrolIndex] || this.patrol[0];
    if (!target) return;
    const d = dist(this.x, this.y, target.x, target.y);
    if (d < 9) {
      this.waitT = rand(1.1, 2.3);
      this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
      return;
    }
    this._moveToward(target.x, target.y, this.def.speed, dt);
    if (this.stateT > 22) this._setState('PATROL'); // safety net
  }

  _chase(dt, sees) {
    const p = this.game.player;
    if (!this.aware) { this._setState('PATROL'); return; }
    if (!sees && this.lastSeenT > 5.5) {
      this._setState('INVESTIGATE');
      return;
    }
    const target = sees ? p : this.lastKnown;
    const d = dist(this.x, this.y, target.x, target.y);

    if (this.type === 'thug') {
      if (sees && d < this.def.meleeReach + 8 && this.strikeCd <= 0) {
        this._setState('ATTACK');
        this.windup = this.def.telegraph;
        this.struck = false;
        this.weaponRaised = true;
        this.game.audio.play('meleeSwing');
        return;
      }
      this._moveToward(target.x, target.y, this.def.chaseSpeed, dt);
    } else {
      if (sees && d < 288) {
        this._setState('ATTACK');
        return;
      }
      this._moveToward(target.x, target.y, this.def.chaseSpeed, dt);
    }
  }

  _attack(dt, sees) {
    const p = this.game.player;
    if (!p || p.dead) { this._setState('IDLE'); return; }

    if (this.type === 'thug') {
      this._thugAttack(dt);
      return;
    }

    if (!sees) {
      this._setState('CHASE');
      return;
    }

    const d = dist(this.x, this.y, p.x, p.y);
    const [minR, maxR] = this.def.preferredRange;

    // maintain distance
    if (d < minR - 8) {
      this._steer(this.x - p.x, this.y - p.y, this.def.speed, dt);
    } else if (d > maxR) {
      this._moveToward(p.x, p.y, this.def.chaseSpeed, dt);
    } else {
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeT = rand(1.0, 2.2);
        this.strafeDir *= -1;
      }
      this._strafe(dt);
    }

    const to = angleTo(this.x, this.y, p.x, p.y);
    const aligned = Math.abs(angleDiff(this.angle, to)) < 0.16;

    if (this.fireCd <= 0.2) this.aimGlow = 1;

    if (this.fireCd <= 0 && aligned) {
      this._shoot(p);
    }
  }

  _thugAttack(dt) {
    const p = this.game.player;
    const d = dist(this.x, this.y, p.x, p.y);
    if (!this.struck && this.windup <= 0) {
      // strike moment
      this.struck = true;
      this.weaponRaised = false;
      this.strikeCd = 0.6;
      this.game.audio.play('meleeHit');
      const to = angleTo(this.x, this.y, p.x, p.y);
      const hit = d < this.def.meleeReach + 9 &&
        Math.abs(angleDiff(this.angle, to)) < 0.9 &&
        this.game.tilemap.lineOfSight(this.x, this.y, p.x, p.y);
      if (hit) {
        this.game.particles.blood(p.x, p.y, to, 8, 90);
        this.game.camera.addShake(3);
        this.game.killPlayer(p, to);
      } else {
        this.game.effects.ring(
          this.x + Math.cos(this.angle) * 16,
          this.y + Math.sin(this.angle) * 16, '#FF287F', 4, 0.18);
      }
      // lunge visual
      this.x += Math.cos(this.angle) * 3;
      this.y += Math.sin(this.angle) * 3;
    }

    if (this.struck) {
      if (d > this.def.meleeReach + 14) this._setState('CHASE');
      else if (this.strikeCd <= 0) {
        this._setState('ATTACK');
        this.windup = this.def.telegraph;
        this.struck = false;
        this.weaponRaised = true;
        this.game.audio.play('meleeSwing');
      }
    }
  }

  _shoot(p) {
    const def = this.weapon;
    const muzzle = SPRITES.muzzle[this.weaponId] ?? 14;
    this.shootAnim = 0.1;
    this.burstLeft = this.burstLeft > 0 ? this.burstLeft - 1 : (this.def.burst || 1) - 1;

    fireHitscan(this.game, this, this.angle, this.weaponId, {
      spread: this.def.spread,
      muzzle,
    });

    const ox = this.x + Math.cos(this.angle) * muzzle;
    const oy = this.y + Math.sin(this.angle) * muzzle;
    this.game.effects.flash(ox, oy, this.angle, this.weaponId === 'shotgun' ? 1.3 : 0.9);
    this.game.particles.casing(this.x, this.y, this.angle);
    this.game.audio.play(this.weaponId === 'shotgun' ? 'shotgun' : this.weaponId === 'smg' ? 'smg' : 'pistol', { enemy: true });
    this.game.emitNoise(this.x, this.y, def.noise, 'shot');
    this.game.camera.addShake(this.weaponId === 'shotgun' ? 1.8 : 0.8);

    if (this.burstLeft > 0) this.fireCd = this.def.burstGap;
    else this.fireCd = this.def.attackCooldown * rand(0.85, 1.2);
  }

  _investigate(dt, sees) {
    if (sees) {
      this._setState('CHASE');
      return;
    }
    const d = dist(this.x, this.y, this.lastKnown.x, this.lastKnown.y);
    if (d < 12 || this.stateT > 7) {
      this._setState('PATROL');
      // resume near the nearest patrol point
      let best = 0, bestD = Infinity;
      for (let i = 0; i < this.patrol.length; i++) {
        const dd = dist(this.x, this.y, this.patrol[i].x, this.patrol[i].y);
        if (dd < bestD) { bestD = dd; best = i; }
      }
      this.patrolIndex = best;
      this.waitT = rand(0.6, 1.6);
      return;
    }
    this._moveToward(this.lastKnown.x, this.lastKnown.y, this.def.chaseSpeed * 0.86, dt);
  }

  _steer(dx, dy, speed, dt) {
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    let ux = dx / len, uy = dy / len;

    // separation from allies
    let px = 0, py = 0;
    const enemies = this.game.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const o = enemies[i];
      if (o === this || o.dead) continue;
      const ox = this.x - o.x, oy = this.y - o.y;
      const d2 = ox * ox + oy * oy;
      const min = this.radius + o.radius + 3;
      if (d2 > 0.001 && d2 < min * min) {
        const dd = Math.sqrt(d2);
        px += (ox / dd) * (1 - dd / min);
        py += (oy / dd) * (1 - dd / min);
      }
    }
    ux += px * 0.85;
    uy += py * 0.85;
    const l2 = Math.hypot(ux, uy);
    if (l2 > 0.01) { ux /= l2; uy /= l2; }
    this.moveAngle = Math.atan2(uy, ux);

    const tm = this.game.tilemap;
    const res = tm.moveCircle(this.x, this.y, this.radius, ux * speed * dt, uy * speed * dt);
    this.x = res.x;
    this.y = res.y;
    this.moving = true;

    if (res.hitX || res.hitY) {
      this.stuckT += dt;
      if (this.stuckT > 0.22) {
        this.stuckT = 0;
        this.repathT = 0;
        this.strafeDir *= -1;
      }
    } else {
      this.stuckT = Math.max(0, this.stuckT - dt);
    }
  }

  _strafe(dt) {
    const p = this.game.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const px = -dy / d * this.strafeDir;
    const py = dx / d * this.strafeDir;
    this._steer(px, py, this.def.speed * 0.85, dt);
  }

  _moveToward(tx, ty, speed, dt) {
    const tm = this.game.tilemap;
    const d = dist(this.x, this.y, tx, ty);
    if (d < 2) return;

    this.repathT -= dt;
    if (this.repathT <= 0 || !this.path || this.path.length === 0) {
      this.path = tm.findPath(this.x, this.y, tx, ty) || [];
      this.pathIndex = 0;
      this.pathGoal.x = tx;
      this.pathGoal.y = ty;
      this.repathT = AI.repathInterval + rand(0, 0.14);
    }
    if (dist(this.pathGoal.x, this.pathGoal.y, tx, ty) > 40) {
      this.repathT = Math.min(this.repathT, 0.06);
    }

    let wx = tx, wy = ty;
    if (!(d < 40 && tm.navClear(this.x, this.y, tx, ty))) {
      while (this.pathIndex < this.path.length) {
        const wp = this.path[this.pathIndex];
        if (dist(this.x, this.y, wp.x, wp.y) < 8) this.pathIndex++;
        else break;
      }
      const wp = this.path[this.pathIndex];
      if (wp) { wx = wp.x; wy = wp.y; }
    }

    this._steer(wx - this.x, wy - this.y, speed, dt);
  }

  draw(ctx) {
    if (this.dead) return;

    const heldWeapon = this.weaponId;
    drawCharacter(ctx, this.type, this.x, this.y, this.angle, this.pose, this.frame, heldWeapon);

    // red aim dot just before firing
    if (this.aimGlow > 0) {
      const muzzle = SPRITES.muzzle[this.weaponId] ?? 14;
      ctx.fillStyle = '#F04452';
      ctx.globalAlpha = 0.5 + Math.sin(this.animT * 30) * 0.4;
      ctx.fillRect(this.x + Math.cos(this.angle) * muzzle - 1, this.y + Math.sin(this.angle) * muzzle - 1, 2, 2);
      ctx.globalAlpha = 1;
    }

    // melee wind-up telegraph
    if (this.windup > 0) {
      const reach = this.def.meleeReach;
      const p = 1 - this.windup / this.def.telegraph;
      ctx.save();
      ctx.globalAlpha = 0.25 + p * 0.5;
      ctx.strokeStyle = '#F04452';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, reach + 2, this.angle - 0.6, this.angle + 0.6);
      ctx.stroke();
      ctx.restore();
    }

    // alert pip
    if (this.alertPip > 0) {
      const y = this.y - 20 - Math.sin(this.animT * 8) * 2;
      ctx.font = '8px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#100D18';
      ctx.fillText('!', Math.round(this.x) + 1, Math.round(y) + 1);
      ctx.fillStyle = '#FF287F';
      ctx.fillText('!', Math.round(this.x), Math.round(y));
      ctx.textAlign = 'left';
    }
  }
}
