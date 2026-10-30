# NEON CARNAGE — Technical Architecture

A one-level, single-player, top-down action game. Vanilla HTML/CSS/JS, Canvas 2D,
no runtime dependencies, no build step, deployable as a static site.

---

## 1. Folder structure

```
neon-carnage/
├── index.html                 # Single page shell: canvas + DOM UI layers
├── css/
│   └── style.css              # Palette tokens, HUD, menus, CRT overlay
├── js/
│   ├── main.js                # Boot, font wait, error surface, RAF loop
│   ├── config.js              # Palette, tuning, weapons, enemy archetypes
│   ├── core/
│   │   ├── game.js            # State machine + orchestration
│   │   ├── input.js           # Keyboard / mouse, action mapping
│   │   ├── camera.js          # Follow, look-ahead, clamp, shake
│   │   └── utils.js           # Math, RNG, geometry helpers
│   ├── world/
│   │   ├── tilemap.js         # Grid, collision, LOS, BFS navigation, static bake
│   │   ├── level.js           # Level runtime: doors, props, lights, exit
│   │   └── levels/
│   │       └── lastcall.js    # Data-only level definition ("THE LAST CALL")
│   ├── render/
│   │   ├── renderer.js        # Low-res canvas, integer scaling, frame compose
│   │   ├── sprites.js         # Procedural pixel-art atlas (no external images)
│   │   ├── particles.js       # Pooled particle system
│   │   └── lighting.js        # Light pass, neon glow, vignette
│   ├── entities/
│   │   ├── player.js          # Movement, aim, inventory, actions
│   │   ├── enemy.js           # Archetypes + AI state machine
│   │   ├── pickup.js          # Weapons / ammo on the floor
│   │   └── door.js            # Sliding doors, blocking + auto-open
│   ├── systems/
│   │   ├── combat.js          # Hitscan, melee, damage, noise propagation
│   │   ├── audio.js           # WebAudio synth SFX + generative synthwave
│   │   └── score.js           # Run stats, combo, grading
│   └── ui/
│       └── ui.js              # Screen routing, HUD, settings persistence
├── assets/
│   └── fonts/                 # Silkscreen (OFL) — bundled locally
├── docs/
│   ├── ARCHITECTURE.md
│   └── screenshots/           # Documentation screenshots
├── ART_BIBLE.md
├── README.md
├── LICENSE
└── tools/serve.mjs            # Zero-dependency static dev server
```

No bundler, no framework, no external API, no backend. ES modules are served
directly; any static host works.

---

## 2. Rendering architecture

Two-resolution pipeline:

1. **World render target** — offscreen canvas at **640×360** (fixed internal
   resolution). Everything is drawn here in world units at 1:1, with
   `imageSmoothingEnabled = false`. This guarantees a consistent pixel grid
   regardless of monitor size.
2. **Present** — the 640×360 buffer is blitted 1:1 to the visible canvas, which
   CSS scales to an **integer factor** (1×–6×) with nearest-neighbour sampling,
   letterboxed on a near-black frame. 1080p → exactly 3×; 768p → 2×.

Layers, back to front:

| Layer | Frequency | Notes |
|---|---|---|
| Static bake (floors, walls, props, grime) | once per level | 1024×832 offscreen canvas |
| Decals (blood, bullet holes, corpses) | incremental | separate world-size canvas, capped |
| Doors | per frame | animated sliding panels |
| Pickups | per frame | bob + glow |
| Entities | per frame | y-sorted draw list |
| Tracers / particles | per frame | pooled |
| Lighting | per frame | 640×360 darkness mask, radial cut-outs |
| Neon signs / additive glow | per frame | cheap `lighter` passes, 4–6 signs |
| Screen FX | per frame | flash, letterbox, vignette |
| HUD / menus | DOM | crisp text, updated only on value change |

**Camera** is centre-based with exponential smoothing (`1 - exp(-k·dt)`), a
small aim look-ahead, level clamping and additive shake. World→screen is a
round() translation so pixels stay aligned.

**Lighting** is a screen-space darkness mask: fill rgba dark, punch radial
gradients out with `destination-out`, composite over the scene. Coloured neon
glow is added with `lighter` at low alpha. No canvas shadowBlur in the hot loop.

---

## 3. Input architecture

`Input` maps physical inputs to named actions:

```
MOVE      WASD / arrows        (normalised vector)
AIM       mouse position       (CSS px → internal px → world px)
SHOOT     left mouse           (down / pressed)
MELEE     Space                (pressed)
INTERACT  E                    (pressed)
RELOAD    R                    (pressed)
SWITCH    Q / mouse wheel      (pressed)
PAUSE     Escape               (pressed)
RESTART   Enter                (pressed)
MUTE      M                    (pressed)
```

- Per-frame `pressed`/`released` sets are cleared at end of frame, so an input
  can never be consumed twice or dropped.
- All game keys call `preventDefault`; context menu is suppressed on the canvas.
- The mouse is converted through the letterboxed canvas rect and the camera, so
  aiming stays accurate at any window size.
- UI screens are normal DOM elements above the canvas and stop propagation, so
  clicking a menu button cannot fire the weapon.
- Mouse buttons are tracked with `buttons` bitmask + explicit `mouseup` on window
  to avoid stuck-fire when the cursor leaves the canvas.

---

## 4. Player and enemy systems

**Player** (`entities/player.js`)

- Circle collider (r=5) against tile grid + solid props, axis-separated slide.
- 8-direction input normalised; velocity applied directly (no slippery
  acceleration); collision resolved by `TileMap.moveCircle`.
- Aim angle from world mouse; sprite rotates around its centre; weapon drawn as
  a separate rotated layer at the hand anchor.
- Inventory: one gun slot + one melee slot. The player starts with fists; a bat
  replaces them. Picking up a gun swaps it in and drops the old gun with its
  remaining ammo.
- Actions: hitscan fire, reload with timer, melee arc, interact (pickup / door),
  weapon switch. Lethal damage model: one hit = death.

**Enemies** (`entities/enemy.js`)

Three archetypes share one state machine:

```
IDLE → PATROL → ALERT → CHASE → ATTACK
                     ↘ INVESTIGATE ↗
DEAD (terminal)
```

- **Thug** — melee rusher, fast, telegraphed lunge.
- **Goon** — pistol guard, patrols, burst fire, keeps medium distance.
- **Heavy** — shotgun guard, holds angles, slow, punishing at close range.
- Perception: range + 120° cone + tile line-of-sight (closed doors block sight)
  + hearing radius fed by `emitNoise()` (gunshots, melee, doors, footsteps).
- Alert propagation: a spotting enemy shouts; nearby allies switch to
  INVESTIGATE toward the player's last known position.
- Navigation: BFS on the 16 px navigation grid (doors passable, solid props
  blocked), recomputed 2–3×/s with a stagger, plus straight-line smoothing when
  LOS to the next waypoint is clear. No heavy A*.
- Readability: `!` alert pip, aim laser/dot for gunners, colour-coded jackets,
  visible wind-up before melee.

---

## 5. Collision system

- **World** is a tile grid (64×52 tiles, 16 px). One `Uint8Array` for solid
  tiles, one for floor material, one for navigation blocking.
- **Static props** register their world AABBs into a coarse 2-tile broadphase
  grid, so collision/LOS only tests nearby props.
- **Entities** are circles. Movement is resolved X then Y (`moveCircle`) which
  gives clean wall sliding without tunnelling at prototype speeds.
- **Doors** are dynamic blockers: a closed door marks its tile as blocked for
  movement and sight; opening animates and clears the block.
- **Sight/bullets** use a 4 px ray march over the tile grid + prop AABB checks —
  cheap and accurate enough at 16 px tiles.
- **Navigation** marks tiles covered by solid props as blocked; doors stay
  passable so enemies can open them.

---

## 6. Asset management

There are **no external image or audio files**. All artwork is generated at boot
by `render/sprites.js` into offscreen canvases (a procedural pixel-art atlas):

- Characters, weapons, props, floor/wall tiles, effects.
- Generated once, reused every frame; keyed by name so nothing is built twice.
- Sprite dimensions and anchors are declared next to the builders and mirror
  `ART_BIBLE.md`.

The only binary asset is the OFL-licensed **Silkscreen** pixel font, bundled in
`assets/fonts/` and preloaded with `document.fonts.load()`.

Audio is fully synthesised in `systems/audio.js` (oscillators + one shared noise
buffer). There is nothing to 404; missing WebAudio support degrades to silence
without breaking gameplay.

---

## 7. Game state management

`Game` owns a single explicit state:

```
BOOT → MENU (attract-mode camera) → PLAYING ⇄ PAUSED
                                      ↓          ↓
                                    DEAD      VICTORY
                                      ↓          ↓
                                   PLAYING (restart, instant)
```

- `newGame()` tears down the previous level instance and rebuilds it from the
  data file — no global arrays survive, so restarts cannot leak.
- Run statistics live in `score.js` (`RunStats`), session deaths persist across
  retries until the player returns to the menu.
- HUD is DOM; `UI.updateHUD()` diffs cached values and only writes changed text,
  so gameplay frames do no layout work.
- Settings (volumes, mute, shake, blood, scanlines) persist in `localStorage`
  with try/catch fallbacks.

---

## 8. Performance strategy

- Fixed 640×360 render target; integer upscale; nearest-neighbour.
- Static level geometry and props baked once into a 1024×832 canvas; per frame
  only the visible source rect is blitted.
- Blood/damage decals accumulate on a separate canvas instead of in arrays.
- Particle pool (fixed 700), tracers pool, no per-frame allocation in hot paths.
- Cached colour strings, reused vectors, squared-distance checks.
- AI pathing staggered across frames; LOS ray march at 4 px steps.
- Lights limited to those intersecting the view; no `shadowBlur` during play.
- `requestAnimationFrame` with clamped delta (≤ 50 ms), hit-stop and slow-motion
  applied through a time scale rather than extra loops.
- DOM updated only on change; no per-frame `innerHTML`.
- Dead enemies, projectiles, tracers and collected pickups are removed from
  arrays; doors persist for the lifetime of the level. Decal canvas is capped
  and rebuilt when full.

---

## 9. Implementation sequence

1. Shell, palette, resolution pipeline, loop, input.
2. Procedural sprite atlas + art bible compliance pass.
3. Tilemap, collision, LOS, navigation.
4. Player controller + camera feel.
5. Combat (hitscan, pellets, melee, feedback).
6. Enemy archetypes + state machine + perception.
7. Level data "THE LAST CALL" + doors, props, lights, exit.
8. Audio synthesis (SFX + generative score).
9. UI screens, HUD, settings, run stats + grading.
10. Polish pass, balance, performance audit, QA, deployment.
