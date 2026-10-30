import { PLAYER, WEAPONS } from '../config.js';
import { TAU, angleTo } from '../core/utils.js';
import { SPRITES, drawCharacter } from '../render/sprites.js';
import { fireHitscan, meleeAttack } from '../systems/combat.js';

export function makeGun(id, mag = null, reserve = null) {
  const def = WEAPONS[id];
  return {
    id,
    mag: mag == null ? def.mag : mag,
    reserve: reserve == null ? def.reserve : reserve,
  };
}

export class Player {
  constructor(game, x, y, angle = -Math.PI / 2) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.isPlayer = true;
    this.radius = PLAYER.radius;
    this.angle = angle;

    this.gun = makeGun('pistol');
    this.melee = 'fists';
    this.slot = 0;              // 0 = gun, 1 = melee
    this.dead = false;
    this.deathT = 0;
    this.deathAngle = 0;

    this.cooldown = 0;
    this.reloadT = 0;
    this.reloadTotal = 0;
    this.meleeCd = 0;

    this.moving = false;
    this.pose = 'idle';
    this.frame = 0;
    this.animT = 0;
    this.shootAnim = 0;
    this.meleeAnim = 0;
    this.meleeDir = 1;
    this.footT = 0;
    this.footAlt = false;
    this.recoil = 0;
    this.walkDust = 0;
    this.exitHintCd = 0;
  }

  get weaponId() {
    return this.slot === 0 && this.gun ? this.gun.id : this.melee;
  }

  get weaponDef() {
    return WEAPONS[this.weaponId];
  }

  gunDef() { return this.gun ? WEAPONS[this.gun.id] : null; }

  update(dt) {
    if (this.dead) {
      this.deathT += dt;
      return;
    }
    const game = this.game;
    const input = game.input;

    // ---- aim ----
    const m = game.camera.screenToWorld(input.mouse.sx, input.mouse.sy);
    this.angle = angleTo(this.x, this.y, m.x, m.y);

    // ---- timers ----
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.shootAnim = Math.max(0, this.shootAnim - dt);
    this.meleeAnim = Math.max(0, this.meleeAnim - dt);
    this.recoil = Math.max(0, this.recoil - dt * 10);
    this.exitHintCd = Math.max(0, this.exitHintCd - dt);

    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this._finishReload();
    }

    // ---- movement ----
    const mv = input.moveVector();
    this.moving = mv.x !== 0 || mv.y !== 0;
    if (this.moving) {
      const speed = PLAYER.speed;
      const res = game.tilemap.moveCircle(this.x, this.y, this.radius, mv.x * speed * dt, mv.y * speed * dt);
      this.x = res.x; this.y = res.y;
      this.footT -= dt;
      if (this.footT <= 0) {
        this.footT = 0.27;
        this.footAlt = !this.footAlt;
        game.audio.play('footstep', { alt: this.footAlt });
        game.particles.dust(this.x + Math.cos(this.angle + 2.4) * 3, this.y + 5, 1);
        game.emitNoise(this.x, this.y, 80, 'step');
      }
    } else {
      this.footT = 0.06;
    }

    // ---- animation ----
    if (this.meleeAnim > 0) {
      this.pose = 'melee';
      this.frame = this.meleeAnim > 0.12 ? 1 : 0;
    } else if (this.shootAnim > 0) {
      this.pose = 'shoot';
      this.frame = this.shootAnim > 0.06 ? 1 : 0;
    } else if (this.moving) {
      this.pose = 'walk';
      this.animT += dt;
      this.frame = Math.floor(this.animT * 11) % 4;
    } else {
      this.pose = 'idle';
      this.animT += dt;
      this.frame = Math.floor(this.animT * 4) % 2;
    }

    // ---- weapon actions ----
    if (input.wasPressed('swap') || input.wheel !== 0) this._swap();

    if (input.wasPressed('reload')) this.startReload();

    if (input.wasPressed('melee')) this.doMelee(true);

    if (input.wasPressed('interact')) this.interact();

    const def = this.weaponDef;
    const wantFire = this.slot === 1
      ? input.wasPressed('shoot')
      : (def.auto ? input.isDown('shoot') : input.wasPressed('shoot'));

    if (wantFire) {
      if (this.slot === 1) this.doMelee();
      else this.tryShoot();
    }
  }

  _swap() {
    if (!this.gun) { this.slot = 1; return; }
    this.slot = this.slot === 0 ? 1 : 0;
    this.reloadT = 0;
    this.game.audio.play('uiMove');
  }

  startReload() {
    if (!this.gun || this.reloadT > 0) return;
    const def = this.gunDef();
    if (this.gun.mag >= def.mag || this.gun.reserve <= 0) return;
    this.reloadT = def.reload;
    this.reloadTotal = def.reload;
    this.game.audio.play('reload');
    this.game.ui.setStatus('RELOADING');
  }

  _finishReload() {
    if (!this.gun) return;
    const def = this.gunDef();
    const need = def.mag - this.gun.mag;
    const take = Math.min(need, this.gun.reserve);
    this.gun.mag += take;
    this.gun.reserve -= take;
    this.reloadT = 0;
    this.game.ui.setStatus(null);
  }

  tryShoot() {
    if (!this.gun || this.reloadT > 0) return;
    const def = this.gunDef();
    if (this.cooldown > 0) return;
    if (this.gun.mag <= 0) {
      if (this.gun.reserve > 0) {
        this.startReload();
      } else {
        this.game.audio.play('dry');
        this.game.ui.setStatus('NO AMMO — FIND A WEAPON');
        this.game.ui.flashStatus();
      }
      return;
    }

    this.gun.mag--;
    this.cooldown = 60 / def.rpm;
    this.shootAnim = 0.1;
    this.recoil = 1;

    const muzzle = SPRITES.muzzle[this.gun.id] ?? 14;
    const ox = this.x + Math.cos(this.angle) * muzzle;
    const oy = this.y + Math.sin(this.angle) * muzzle;

    this.game.stats.shotFired();
    const { hits } = fireHitscan(this.game, this, this.angle, this.gun.id, {
      muzzle, color: def.tracer,
    });
    if (hits > 0) this.game.stats.shotHit();

    this.game.audio.play(this.gun.id === 'shotgun' ? 'shotgun' : this.gun.id === 'smg' ? 'smg' : 'pistol');
    this.game.effects.flash(ox, oy, this.angle, this.gun.id === 'shotgun' ? 1.35 : 1);
    this.game.particles.casing(this.x, this.y, this.angle);
    this.game.particles.smoke(ox, oy, 1, '#FF9A3C');
    this.game.emitNoise(this.x, this.y, def.noise, 'shot');
    this.game.camera.addShake(def.kick * 0.55);
    this.game.hitstop(Math.min(0.045, def.kick * 0.006));
  }

  doMelee(force = false) {
    if (this.meleeCd > 0) return;
    if (!force && this.slot !== 1) return;
    const def = WEAPONS[this.melee] || WEAPONS.fists;
    this.meleeCd = def.cooldown;
    this.meleeAnim = 0.22;
    this.meleeDir = Math.random() < 0.5 ? 1 : -1;

    const result = meleeAttack(this.game, this, {
      reach: def.reach, arc: def.arc, noise: def.noise,
    });

    this.game.audio.play('meleeSwing');
    this.game.emitNoise(this.x, this.y, def.noise, 'melee');
    const hx = this.x + Math.cos(this.angle) * (def.reach * 0.7);
    const hy = this.y + Math.sin(this.angle) * (def.reach * 0.7);
    this.game.effects.ring(hx, hy, '#FFE6C7', 4, 0.14);
    if (result.hits > 0) {
      this.game.camera.addShake(3.2);
      this.game.hitstop(0.07);
      this.game.audio.play('meleeHit');
    }
  }

  interact() {
    const game = this.game;

    // doors first
    const door = game.level.nearestDoor(this.x, this.y, 30);
    if (door && door.closed) {
      door.open('player');
      return;
    }

    // weapon / ammo
    const pickup = game.level.nearestPickup(this.x, this.y, 28);
    if (pickup) {
      this._takePickup(pickup);
      return;
    }

    // exit hint
    if (game.level.onExit(this.x, this.y)) this._tryExit(true);
  }

  _takePickup(pickup) {
    const game = this.game;
    if (pickup.kind === 'ammo') {
      if (!this.gun || this.gun.id !== pickup.weapon) {
        game.ui.setStatus('NO MATCHING WEAPON');
        game.ui.flashStatus();
        return;
      }
      const def = WEAPONS[this.gun.id];
      this.gun.reserve = Math.min(def.maxReserve, this.gun.reserve + pickup.amount);
      game.audio.play('pickup');
      game.ui.setStatus(`+${pickup.amount} ${def.ammoName}`);
      game.level.removePickup(pickup);
      game.particles.ring(pickup.x, pickup.y, '#FFE6C7', 4, 0.2);
      return;
    }

    const wdef = WEAPONS[pickup.weapon];
    if (!wdef) return;
    game.audio.play('pickup');
    game.particles.ring(pickup.x, pickup.y, wdef.melee ? '#FF287F' : '#35E0E8', 4, 0.2);

    if (wdef.melee) {
      this.melee = pickup.weapon;
      game.level.removePickup(pickup);
      this.slot = 1;
      game.ui.setStatus(`EQUIPPED ${wdef.name}`);
      return;
    }

    // swap guns, drop the old one with its remaining ammo
    const carried = this.gun ? { ...this.gun } : null;
    this.gun = makeGun(pickup.weapon, pickup.mag, pickup.reserve);
    game.level.removePickup(pickup);
    this.slot = 0;
    if (carried && carried.mag + carried.reserve > 0) {
      game.level.spawnPickup({
        type: 'weapon', weapon: carried.id,
        x: this.x, y: this.y + 6,
        mag: carried.mag, reserve: carried.reserve,
      }, true);
    }
    game.ui.setStatus(`EQUIPPED ${wdef.name}`);
  }

  _tryExit(force = false) {
    const game = this.game;
    if (game.enemiesAlive() > 0) {
      if (force || this.exitHintCd <= 0) {
        this.exitHintCd = 2.4;
        game.ui.setStatus('EXIT SEALED — ELIMINATE ALL HOSTILES');
        game.ui.flashStatus();
        game.audio.play('uiBack');
      }
      return;
    }
    game.winLevel();
  }

  onHit(angle = this.angle + Math.PI) {
    if (this.dead) return;
    this.game.killPlayer(this, angle);
  }

  draw(ctx, t) {
    if (this.dead) {
      // sprawled silhouette + slow fade
      ctx.save();
      ctx.globalAlpha = Math.max(0.2, 1 - this.deathT * 0.25);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.deathAngle);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 3, 10, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#FFE6C7';
      ctx.fillRect(-9, -4, 15, 8);
      ctx.fillStyle = '#21152F';
      ctx.fillRect(-9, 1, 15, 3);
      ctx.fillStyle = '#E8C29B';
      ctx.fillRect(6, -3, 5, 5);
      ctx.restore();
      return;
    }

    const heldWeapon = this.slot === 1
      ? (this.melee === 'fists' ? null : this.melee)
      : (this.gun ? this.gun.id : null);

    // aiming laser (subtle)
    if (this.slot === 0) {
      const def = this.gunDef();
      if (def) {
        const mx = this.x + Math.cos(this.angle) * (SPRITES.muzzle[def.id] ?? 14);
        const my = this.y + Math.sin(this.angle) * (SPRITES.muzzle[def.id] ?? 14);
        const wallDist = this.game.tilemap.raycastWall(mx, my, Math.cos(this.angle), Math.sin(this.angle), def.range);
        ctx.globalAlpha = 0.10;
        ctx.strokeStyle = '#FF287F';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(this.angle) * wallDist, my + Math.sin(this.angle) * wallDist);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    drawCharacter(ctx, 'player', this.x, this.y, this.angle, this.pose, this.frame, heldWeapon);

    // melee swing streak
    if (this.meleeAnim > 0) {
      const def = WEAPONS[this.melee] || WEAPONS.fists;
      const p = 1 - this.meleeAnim / 0.22;
      const arc = def.arc * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * (1 - p);
      ctx.strokeStyle = '#FFE6C7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, def.reach * (0.7 + p * 0.3),
        this.angle - arc * this.meleeDir, this.angle + arc * this.meleeDir);
      ctx.stroke();
      ctx.restore();
    }
  }
}
