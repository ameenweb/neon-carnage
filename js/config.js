// NEON CARNAGE — global tuning, palette and data definitions.
// Visual values mirror ART_BIBLE.md.

export const VIEW = { W: 640, H: 360 };
export const TILE = 16;

export const PALETTE = {
  bg: '#100D18',
  dark: '#21152F',
  purple: '#9B4DFF',
  pink: '#FF287F',
  cyan: '#35E0E8',
  blood: '#F04452',
  orange: '#FF9A3C',
  highlight: '#FFE6C7',
  black: '#08060E',
  wall: '#150F20',
  wallTop: '#241735',
  gunmetal: '#3A2C4F',
};

export const FONT = 'Silkscreen, monospace';

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------
// `mag` is the starting magazine, `reserve` the starting spare ammo.
// Enemies use the same definitions with unlimited reserve.
export const WEAPONS = {
  fists: {
    id: 'fists', name: 'FISTS', melee: true,
    reach: 21, arc: 1.75, cooldown: 0.30, noise: 28,
    score: 1,
  },
  bat: {
    id: 'bat', name: 'BAT', melee: true, pickup: true,
    reach: 32, arc: 2.0, cooldown: 0.42, noise: 55,
    score: 1,
  },
  pistol: {
    id: 'pistol', name: 'PISTOL', melee: false, pickup: true,
    mag: 8, reserve: 16, maxReserve: 64,
    rpm: 250, spread: 0.016, pellets: 1, range: 560,
    reload: 0.85, auto: false, kick: 2.4, noise: 430,
    tracer: '#FFE6C7', ammoName: '9MM',
  },
  smg: {
    id: 'smg', name: 'SMG', melee: false, pickup: true,
    mag: 30, reserve: 30, maxReserve: 120,
    rpm: 780, spread: 0.085, pellets: 1, range: 470,
    reload: 1.45, auto: true, kick: 1.3, noise: 500,
    tracer: '#FF9A3C', ammoName: '9MM',
  },
  shotgun: {
    id: 'shotgun', name: 'SHOTGUN', melee: false, pickup: true,
    mag: 5, reserve: 10, maxReserve: 40,
    rpm: 72, spread: 0.17, pellets: 7, range: 300,
    reload: 2.05, auto: false, kick: 6.5, noise: 620,
    tracer: '#FF9A3C', ammoName: '12GA',
  },
};

// ---------------------------------------------------------------------------
// Enemy archetypes
// ---------------------------------------------------------------------------
export const ENEMIES = {
  thug: {
    id: 'thug', name: 'THUG', weapon: 'bat',
    speed: 86, chaseSpeed: 142, radius: 5.5,
    viewRange: 215, fov: 2.25, reaction: 0.26,
    meleeReach: 27, attackCooldown: 0.85, telegraph: 0.30,
    score: 100, dropChance: 0.5,
    jacket: '#FF287F', trousers: '#100D18', hair: '#FF287F',
  },
  goon: {
    id: 'goon', name: 'GOON', weapon: 'pistol',
    speed: 68, chaseSpeed: 96, radius: 5.5,
    viewRange: 280, fov: 2.1, reaction: 0.42,
    preferredRange: [104, 196], attackCooldown: 0.95,
    burst: 3, burstGap: 0.20, spread: 0.055,
    score: 120, dropChance: 1,
    jacket: '#35E0E8', trousers: '#21152F', hair: '#21152F',
  },
  heavy: {
    id: 'heavy', name: 'HEAVY', weapon: 'shotgun',
    speed: 56, chaseSpeed: 78, radius: 6.2,
    viewRange: 250, fov: 2.0, reaction: 0.55,
    preferredRange: [86, 168], attackCooldown: 1.65,
    burst: 1, burstGap: 0.20, spread: 0.13,
    score: 160, dropChance: 1,
    jacket: '#FF9A3C', trousers: '#100D18', hair: '#100D18',
  },
};

export const PLAYER = {
  speed: 158, radius: 5,
  startWeapon: 'pistol',
  invulnAfterDeath: 0,
};

export const SCORE = {
  killBase: 100,
  comboWindow: 4.0,
  comboMax: 8,
  timeBonusStart: 900,
  timeBonusPerSecond: 8,
  deathPenalty: 250,
  grades: [
    { min: 4200, grade: 'S' },
    { min: 3200, grade: 'A' },
    { min: 2300, grade: 'B' },
    { min: 1500, grade: 'C' },
    { min: 0, grade: 'D' },
  ],
};

export const KEYMAP = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  melee: ['Space'],
  interact: ['KeyE'],
  reload: ['KeyR'],
  swap: ['KeyQ'],
  pause: ['Escape'],
  restart: ['Enter'],
  mute: ['KeyM'],
};

export const SETTINGS_KEY = 'neon-carnage.settings.v1';

export const DEFAULT_SETTINGS = {
  music: 0.55,
  sfx: 0.75,
  muted: false,
  shake: true,
  blood: true,
  scanlines: true,
};

// Difficulty pacing knobs
export const AI = {
  repathInterval: 0.42,
  alertShoutRadius: 330,
  gunshotHearing: 520,
  footstepHearing: 90,
  doorOpenRadius: 22,
  corpseLimit: 20,
  maxParticles: 700,
  maxTracers: 48,
};
