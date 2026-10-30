// Level data — "THE LAST CALL"
// All coordinates are in tiles (16 px). Fractional values are allowed for props.
// Edit this file to redesign the level; no rendering code needs to change.

export const FLOOR = {
  CLUB: 1,
  BAR: 2,
  VIP: 3,
  BACKROOM: 4,
  STORAGE: 5,
  ENTRANCE: 6,
  EXIT: 7,
};

export const LAST_CALL = {
  id: 'last-call',
  name: 'THE LAST CALL',
  subtitle: 'UNDERGROUND NIGHTCLUB · 1989',
  width: 64,
  height: 52,

  player: { x: 5.5, y: 47.2, angle: -Math.PI / 2 },

  rooms: [
    { x: 2, y: 2, w: 23, h: 10, floor: FLOOR.BAR },        // bar
    { x: 2, y: 14, w: 37, h: 25, floor: FLOOR.CLUB },      // main floor
    { x: 2, y: 40, w: 8, h: 11, floor: FLOOR.ENTRANCE },   // entrance
    { x: 43, y: 3, w: 19, h: 18, floor: FLOOR.VIP },       // vip lounge
    { x: 43, y: 25, w: 19, h: 14, floor: FLOOR.BACKROOM }, // backroom
    { x: 22, y: 42, w: 12, h: 8, floor: FLOOR.STORAGE },   // storage
    { x: 43, y: 42, w: 19, h: 8, floor: FLOOR.EXIT },      // exit corridor
  ],

  corridors: [
    { x: 5, y: 38, w: 2, h: 4, floor: FLOOR.ENTRANCE },
    { x: 11, y: 11, w: 2, h: 4, floor: FLOOR.BAR },
    { x: 38, y: 10, w: 6, h: 2, floor: FLOOR.CLUB },
    { x: 37, y: 12, w: 2, h: 3, floor: FLOOR.CLUB },
    { x: 38, y: 30, w: 6, h: 2, floor: FLOOR.CLUB },
    { x: 26, y: 38, w: 2, h: 5, floor: FLOOR.STORAGE },
    { x: 53, y: 38, w: 2, h: 5, floor: FLOOR.BACKROOM },
  ],

  doors: [
    { x: 5, y: 40, dir: 'h', label: 'ENTRANCE' },
    { x: 40, y: 10, dir: 'v', label: 'VIP' },
    { x: 40, y: 30, dir: 'v', label: 'STAFF ONLY' },
    { x: 26, y: 40, dir: 'h', label: 'STORAGE' },
    { x: 53, y: 40, dir: 'h', label: 'EXIT' },
  ],

  props: [
    // ---- bar ----
    { type: 'rug', x: 4, y: 6.6, w: 16, h: 4.6, solid: false, layer: 'floor' },
    { type: 'bar', x: 4, y: 4, w: 17, h: 2, solid: true, blocksSight: true },
    { type: 'shelf', x: 4, y: 1.05, w: 17, h: 0.9, solid: false, blocksSight: false, onWall: true },
    { type: 'stool', x: 5.4, y: 6.3, w: 0.65, h: 0.65, solid: false },
    { type: 'stool', x: 8.2, y: 6.3, w: 0.65, h: 0.65, solid: false },
    { type: 'stool', x: 11.0, y: 6.3, w: 0.65, h: 0.65, solid: false },
    { type: 'stool', x: 13.8, y: 6.3, w: 0.65, h: 0.65, solid: false },
    { type: 'stool', x: 16.6, y: 6.3, w: 0.65, h: 0.65, solid: false },
    { type: 'table', x: 20.6, y: 8.2, w: 1.5, h: 1.5, solid: true },
    { type: 'chair', x: 19.4, y: 8.6, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 22.2, y: 8.4, w: 0.7, h: 0.7, solid: false },
    { type: 'plant', x: 2.4, y: 10.2, w: 0.9, h: 0.9, solid: true },

    // ---- main floor ----
    { type: 'dj', x: 25, y: 14, w: 7, h: 2, solid: true, blocksSight: true },
    { type: 'speaker', x: 23.0, y: 14, w: 1.8, h: 2, solid: true, blocksSight: true },
    { type: 'speaker', x: 32.2, y: 14, w: 1.8, h: 2, solid: true, blocksSight: true },
    { type: 'sofa', x: 2.3, y: 16.5, w: 1.2, h: 4, solid: true },
    { type: 'sofa', x: 12, y: 36.7, w: 4, h: 1.2, solid: true },
    { type: 'sofa', x: 33, y: 36.4, w: 4, h: 1.2, solid: true },

    { type: 'table', x: 7.2, y: 19.2, w: 1.6, h: 1.6, solid: true },
    { type: 'chair', x: 6.0, y: 19.6, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 9.1, y: 19.4, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 7.5, y: 21.1, w: 0.7, h: 0.7, solid: false },

    { type: 'table', x: 13.6, y: 26.2, w: 1.6, h: 1.6, solid: true },
    { type: 'chair', x: 12.4, y: 26.6, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 15.5, y: 26.4, w: 0.7, h: 0.7, solid: false },

    { type: 'table', x: 25.2, y: 30.2, w: 1.6, h: 1.6, solid: true },
    { type: 'chair', x: 24.0, y: 30.6, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 27.1, y: 30.4, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 25.6, y: 32.2, w: 0.7, h: 0.7, solid: false },

    { type: 'table', x: 33.0, y: 23.2, w: 1.6, h: 1.6, solid: true },
    { type: 'chair', x: 31.8, y: 23.6, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 34.9, y: 23.4, w: 0.7, h: 0.7, solid: false },

    { type: 'table', x: 6.6, y: 33.8, w: 1.6, h: 1.6, solid: true },
    { type: 'chair', x: 5.4, y: 34.2, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 8.5, y: 34.0, w: 0.7, h: 0.7, solid: false },

    { type: 'table', x: 19.2, y: 34.0, w: 1.6, h: 1.6, solid: true },
    { type: 'chair', x: 18.0, y: 34.4, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 21.1, y: 34.2, w: 0.7, h: 0.7, solid: false },

    { type: 'table', x: 23.6, y: 20.0, w: 1.6, h: 1.6, solid: true },
    { type: 'chair', x: 22.4, y: 20.4, w: 0.7, h: 0.7, solid: false },
    { type: 'chair', x: 25.5, y: 20.2, w: 0.7, h: 0.7, solid: false },

    { type: 'plant', x: 35.8, y: 16.2, w: 0.9, h: 0.9, solid: true },
    { type: 'plant', x: 2.4, y: 35.4, w: 0.9, h: 0.9, solid: true },
    { type: 'plant', x: 35.8, y: 33.2, w: 0.9, h: 0.9, solid: true },
    { type: 'keg', x: 3.0, y: 13.2, w: 0.8, h: 0.8, solid: true },

    // ---- vip ----
    { type: 'rug', x: 44.5, y: 3.8, w: 15, h: 15, solid: false, layer: 'floor', vip: true },
    { type: 'sofa', x: 45.5, y: 4.4, w: 6, h: 1.2, solid: true },
    { type: 'sofa', x: 54.5, y: 4.4, w: 5, h: 1.2, solid: true },
    { type: 'sofa', x: 59.2, y: 11, w: 1.2, h: 4.5, solid: true },
    { type: 'sofa', x: 46, y: 17.7, w: 5, h: 1.2, solid: true },
    { type: 'table', x: 53.0, y: 8.0, w: 1.7, h: 1.7, solid: true },
    { type: 'table', x: 57.4, y: 14.2, w: 1.5, h: 1.5, solid: true },
    { type: 'cart', x: 58.0, y: 9.8, w: 1.2, h: 0.8, solid: true },
    { type: 'plant', x: 60.0, y: 5.0, w: 0.9, h: 0.9, solid: true },
    { type: 'plant', x: 44.4, y: 18.8, w: 0.9, h: 0.9, solid: true },
    { type: 'window', x: 46.5, y: 2.05, w: 4.5, h: 0.8, solid: false, onWall: true },

    // ---- backroom ----
    { type: 'desk', x: 56.4, y: 26.0, w: 4, h: 1.6, solid: true, blocksSight: true },
    { type: 'crate', x: 45.6, y: 26.6, w: 1.8, h: 1.8, solid: true, blocksSight: true },
    { type: 'crate', x: 55.0, y: 33.4, w: 2, h: 2, solid: true, blocksSight: true },
    { type: 'crate', x: 58.8, y: 28.0, w: 1.2, h: 1.2, solid: true },
    { type: 'crate', x: 46.0, y: 34.6, w: 1.4, h: 1.4, solid: true },
    { type: 'locker', x: 60.3, y: 29.0, w: 1.2, h: 5, solid: true, blocksSight: true },
    { type: 'keg', x: 44.1, y: 36.4, w: 0.9, h: 0.9, solid: true },
    { type: 'keg', x: 45.4, y: 36.4, w: 0.9, h: 0.9, solid: true },
    { type: 'table', x: 50.2, y: 28.6, w: 1.5, h: 1.5, solid: true },

    // ---- storage ----
    { type: 'shelf', x: 22.3, y: 42.3, w: 1.2, h: 6.8, solid: true, blocksSight: true },
    { type: 'crate', x: 23.7, y: 43.0, w: 2, h: 2, solid: true, blocksSight: true },
    { type: 'crate', x: 30.0, y: 43.4, w: 2, h: 2, solid: true, blocksSight: true },
    { type: 'crate', x: 23.9, y: 47.4, w: 1.4, h: 1.4, solid: true },
    { type: 'crate', x: 31.4, y: 47.0, w: 1.3, h: 1.3, solid: true },
    { type: 'shelf', x: 32.4, y: 45.2, w: 1.2, h: 3.2, solid: true, blocksSight: true },
    { type: 'plant', x: 27.8, y: 48.0, w: 0.9, h: 0.9, solid: false },

    // ---- entrance ----
    { type: 'rug', x: 4.7, y: 38.2, w: 2.6, h: 10, solid: false, layer: 'floor', runner: true },
    { type: 'coatrail', x: 3.2, y: 42.0, w: 1.0, h: 1.0, solid: true },
    { type: 'plant', x: 8.2, y: 49.0, w: 0.9, h: 0.9, solid: true },
    { type: 'poster', x: 2.05, y: 44.5, w: 0.8, h: 2.2, solid: false, onWall: true },
    { type: 'poster', x: 9.1, y: 45.5, w: 0.8, h: 2.2, solid: false, onWall: true },

    // ---- exit ----
    { type: 'exitpad', x: 56.4, y: 43.6, w: 4.6, h: 5.4, solid: false, layer: 'floor' },
    { type: 'crate', x: 44.2, y: 47.5, w: 1.5, h: 1.5, solid: true },
    { type: 'plant', x: 61.0, y: 43.6, w: 0.9, h: 0.9, solid: true },
    { type: 'poster', x: 50.2, y: 43.05, w: 2.4, h: 0.7, solid: false, onWall: true },
  ],

  enemies: [
    // bar
    { type: 'goon', x: 18, y: 3.2, patrol: [[18, 3.2], [6.5, 3.0], [18, 8.0]] },
    { type: 'thug', x: 6.2, y: 8.0, patrol: [[6.2, 8.0], [15, 7.6], [20.5, 9.4]] },
    // main floor
    { type: 'thug', x: 16, y: 30, patrol: [[16, 30], [16, 22], [26, 25]] },
    { type: 'goon', x: 31, y: 18, patrol: [[31, 18], [22, 18], [34.5, 27]] },
    { type: 'heavy', x: 33, y: 33.5, patrol: [[33, 33.5], [20, 34], [34, 28]] },
    // vip
    { type: 'heavy', x: 50, y: 12.5, patrol: [[50, 12.5], [52.5, 9.0]] },
    { type: 'goon', x: 57, y: 6.0, patrol: [[57, 6.0], [51.5, 6.2], [58, 13]] },
    { type: 'thug', x: 57, y: 17.0, patrol: [[57, 17], [48, 16.4]] },
    // backroom
    { type: 'goon', x: 48, y: 31.2, patrol: [[48, 31.2], [57, 31.0]] },
    { type: 'thug', x: 58, y: 35.2, patrol: [[58, 35.2], [50, 36.0]] },
    // storage
    { type: 'thug', x: 29, y: 46.0, patrol: [[29, 46.0], [25.0, 45.0], [29.5, 48.2]] },
  ],

  pickups: [
    { type: 'weapon', weapon: 'bat', x: 7.0, y: 44.2 },
    { type: 'weapon', weapon: 'smg', x: 10.4, y: 7.2 },
    { type: 'weapon', weapon: 'shotgun', x: 29.2, y: 44.4 },
    { type: 'weapon', weapon: 'pistol', x: 46.0, y: 28.6 },
    { type: 'ammo', weapon: 'pistol', amount: 16, x: 20.4, y: 19.0 },
    { type: 'ammo', weapon: 'pistol', amount: 16, x: 55.5, y: 36.0 },
    { type: 'ammo', weapon: 'smg', amount: 30, x: 3.0, y: 28.5 },
  ],

  lights: [
    { x: 5.6, y: 46.0, r: 100, color: '#35E0E8', intensity: 0.55 },
    { x: 5.6, y: 40.5, r: 60, color: '#FF287F', intensity: 0.35 },
    { x: 12, y: 7.0, r: 140, color: '#FF9A3C', intensity: 0.7 },
    { x: 4.5, y: 4.0, r: 80, color: '#FF287F', intensity: 0.45 },
    { x: 28, y: 16.0, r: 150, color: '#9B4DFF', intensity: 0.75 },
    { x: 12, y: 22, r: 170, color: '#FF287F', intensity: 0.55 },
    { x: 34, y: 34, r: 120, color: '#35E0E8', intensity: 0.45 },
    { x: 20, y: 30, r: 180, color: '#FF287F', intensity: 0.5 },
    { x: 40, y: 10.5, r: 70, color: '#9B4DFF', intensity: 0.45 },
    { x: 52, y: 9, r: 150, color: '#9B4DFF', intensity: 0.7 },
    { x: 58, y: 16, r: 120, color: '#FF287F', intensity: 0.5 },
    { x: 40, y: 30.5, r: 70, color: '#FF9A3C', intensity: 0.4 },
    { x: 52, y: 31, r: 140, color: '#FF9A3C', intensity: 0.55 },
    { x: 45, y: 35, r: 90, color: '#35E0E8', intensity: 0.4 },
    { x: 27, y: 45, r: 100, color: '#FF9A3C', intensity: 0.45 },
    { x: 58, y: 46, r: 150, color: '#35E0E8', intensity: 0.7 },
  ],

  signs: [
    { text: 'BAR', x: 12, y: 2.55, color: '#FF287F', size: 7, flicker: 0.05 },
    { text: 'V.I.P.', x: 47.5, y: 3.4, color: '#9B4DFF', size: 6, flicker: 0.12 },
    { text: 'LAST CALL', x: 28.5, y: 13.45, color: '#FF287F', size: 6, flicker: 0.02 },
    { text: 'STAFF ONLY', x: 48.5, y: 25.35, color: '#FF9A3C', size: 4, flicker: 0.2 },
    { text: 'EXIT', x: 58.5, y: 43.15, color: '#35E0E8', size: 6, flicker: 0.0 },
  ],

  exit: { x: 56.4, y: 43.6, w: 4.6, h: 5.4 },
  // Dark-red runner down the entrance; also used for wall trims.
  wallNeon: [
    { x: 11, y: 13.0, w: 2, color: '#FF287F' },
    { x: 25, y: 15.0, w: 7, color: '#9B4DFF' },
    { x: 43, y: 3.0, w: 19, color: '#9B4DFF' },
  ],
};

export const TILEMAP_DATA = LAST_CALL;
