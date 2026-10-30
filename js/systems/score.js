import { SCORE } from '../config.js';
import { clamp } from '../core/utils.js';

/** Tracks a single run: kills, combo, accuracy, time and final grade. */
export class RunStats {
  constructor(totalEnemies) {
    this.totalEnemies = totalEnemies;
    this.reset();
  }

  reset() {
    this.kills = 0;
    this.killScore = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.elapsed = 0;
    this.deaths = 0;
    this.finished = false;
    this.timeBonus = 0;
    this.accuracyBonus = 0;
    this.deathPenalty = 0;
    this.finalScore = 0;
    this.grade = 'D';
  }

  update(dt) {
    if (this.finished) return;
    this.elapsed += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  shotFired() { this.shotsFired++; }

  shotHit() { this.shotsHit++; }

  registerKill(baseScore) {
    this.kills++;
    this.combo = clamp(this.combo + 1, 1, SCORE.comboMax);
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboTimer = SCORE.comboWindow;
    this.killScore += Math.round(baseScore * this.combo);
    return this.combo;
  }

  get multiplier() { return Math.max(1, this.combo); }

  get accuracy() {
    if (this.shotsFired === 0) return 0;
    return this.shotsHit / this.shotsFired;
  }

  /** Finalise and compute grade. `sessionDeaths` includes retries this session. */
  finish(sessionDeaths = 0) {
    this.finished = true;
    this.deaths = sessionDeaths;
    this.timeBonus = Math.max(0, Math.round(SCORE.timeBonusStart - this.elapsed * SCORE.timeBonusPerSecond));
    this.accuracyBonus = Math.round(this.accuracy * 800);
    this.deathPenalty = sessionDeaths * SCORE.deathPenalty;
    this.finalScore = Math.max(0,
      this.killScore + this.timeBonus + this.accuracyBonus - this.deathPenalty);
    for (const g of SCORE.grades) {
      if (this.finalScore >= g.min) { this.grade = g.grade; break; }
    }
    return this;
  }

  get liveScore() {
    return Math.max(0, this.killScore +
      Math.max(0, Math.round(SCORE.timeBonusStart - this.elapsed * SCORE.timeBonusPerSecond)));
  }
}
