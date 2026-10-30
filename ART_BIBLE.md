# NEON CARNAGE — Art Bible

> Single source of truth for every visual element. If an asset does not follow
> this document, it does not ship.

---

## 1. Premise & visual thesis

An underground nightclub in a fictional late-1980s city, seen from directly
above. Everything is rendered as deliberate low-resolution pixel art with hard
edges, limited values and saturated neon. The mood is *dangerous glamour*:
black-and-purple rooms cut by hot pink, cyan and orange light; clean geometric
silhouettes; blood that reads instantly against dark floors.

**Rule:** no photographic, 3D-rendered, vector-cartoon or stock imagery. Every
pixel is generated procedurally from the rules below.

---

## 2. Palette

Only these hues may dominate. Tints/shades of them are allowed for shading.

| Role | Hex | Use |
|---|---|---|
| Background / void | `#100D18` | Outside walls, letterbox, shadow base |
| Dark purple | `#21152F` | Walls, furniture body, floor base |
| Neon purple | `#9B4DFF` | Ambient light, VIP identity, wall trim |
| Hot pink | `#FF287F` | Primary accent, logo, threats, dance floor |
| Cyan | `#35E0E8` | Secondary accent, player identity, exits, tech |
| Blood red | `#F04452` | Damage, blood, death, enemy eyes |
| Warm orange | `#FF9A3C` | Bar/backroom warmth, muzzle flash, lamps |
| Highlight | `#FFE6C7` | Text, skin, rim light, player jacket |

Derived neutrals (shades of `#100D18` and `#21152F`) are used for grout, grime
and shadow. No green, blue, yellow or brown as a dominant colour.

**60/30/10 rule:** 60 % dark neutrals, 30 % purple family, 10 % hot accents.
Neon is a light source, not a fill.

---

## 3. Resolution & scale

- Internal render: **640 × 360**, presented at integer scale (2×/3×/4×).
- Tile size: **16 × 16 px**. All geometry snaps to this grid.
- Character sprite canvas: **28 × 28 px**, body occupies ~18 × 20 px.
- Weapon sprites: 9–24 px long, 3–6 px tall, anchored at the grip.
- Outline: **exactly 1 px**, colour `#08060E` (near-black).
- No sub-pixel positioning for static art; entities may move sub-pixel but are
  drawn with nearest-neighbour sampling.
- No sprite scaling at runtime except death/corpse squash (≤ 15 %).

---

## 4. Character construction

Top-down, facing **right** in the source sprite (rotation is applied at draw).

- **Shadow:** flattened ellipse under the feet, `rgba(0,0,0,0.38)`, offset +2 px.
- **Legs:** two 2×4 px blocks, animated 4-frame walk cycle.
- **Torso:** 9×8 px rounded block in jacket colour, 1 px outline, 1 px inner
  highlight on the shoulder facing the light (top-left).
- **Arms:** 2 px limbs reaching toward the facing direction; hands in skin tone.
- **Head:** 7 px circle, hair cap on the rear half, 1 px outline.
- **Threat read:** enemies wear a 2×1 px red eye/visor pixel at the front of the
  head. The player has a cyan pixel instead. Silhouette + colour identify a
  faction before detail.
- **Proportions:** head ≈ 40 % of body width, shoulders wider than hips; never
  chibi, never realistic.
- **Animation frames:** idle 2, walk 4, shoot 1 (+1 px recoil), melee 1, death 1.
  Animations loop at 8 fps (walk 12 fps).

### Faction colours

| Character | Jacket | Trousers | Head | Accent |
|---|---|---|---|---|
| Player ("V") | `#FFE6C7` cream | `#21152F` | black hair | cyan collar |
| Thug (melee) | `#FF287F` pink | `#100D18` | pink mohawk | red eye |
| Goon (pistol) | `#35E0E8` cyan | `#21152F` | dark hair | red eye |
| Heavy (shotgun) | `#FF9A3C` orange | `#100D18` | shaved | red eye |

Heavy is built at 1.08× body width; never larger than 1.1× or it breaks scale.

---

## 5. Weapons

Side profile, pointing right, grip at the left third, 1 px outline, one highlight
pixel row on top. Palette-limited: gunmetal = `#3A2C4F`, highlight =
`#FFE6C7`, accent stripe = weapon identity colour.

| Weapon | Length | Identity |
|---|---|---|
| Pistol | 9 px | cyan sight dot |
| SMG | 15 px | pink magazine |
| Shotgun | 22 px | orange pump |
| Bat | 22 px | highlight wood + pink tape |

Pickups on the floor are drawn at −35°, gently bobbing (2 px), with a 1-frame
coloured glow. No floating icons, no emoji.

---

## 6. Environment

### Perspective
Strict top-down, 90°. Walls are solid extrusions seen from above; the face that
borders a walkable tile gets a 3 px lit edge so rooms read as enclosed. No
isometric, no vanishing points.

### Surfaces

| Area | Floor | Pattern |
|---|---|---|
| Entrance corridor | `#171021` tiles | 16 px grid, pink runner stripe |
| Main club floor | `#1A1226` | large checker + scuff noise |
| Bar | `#241A33` / `#1B1226` | dirty 8 px checker, grout |
| VIP lounge | `#21152F` | diamond rug over dark parquet |
| Backroom | `#191322` | concrete, cracks, stains |
| Storage | `#171122` | concrete + crate shadows |
| Exit corridor | `#140F1D` | cyan edge strip |

Texture density: **≤ 6 %** of any floor tile covered by noise pixels; grime is
sparse, low-contrast, and never competes with silhouettes.

### Walls
Base `#150F20`, top face `#241735`, 1 px `#0A0710` outline. Neon trim only where
a sign or light motivates it. Wall panels repeat every 32 px with a subtle seam.

### Props
Readable at a glance, 1 px outline, two-value shading, palette only:
bar counter (wood + bottles), tables (round, drink glasses), chairs, sofas,
crates, DJ booth, speakers, plants, coat rack, lockers, desk, kegs.
Every prop is solid or clearly decorative — never ambiguous.

---

## 7. Lighting & shadow

- Key light direction is **top-left** for rim highlights on characters/props.
- Practical lights: neon signs, pendant lamps, DJ booth, exit signs.
- Light pools are soft radial gradients, **screen-blended**; darkness is a cool
  near-black overlay at 70–80 % before cut-outs.
- Coloured glow is additive and weak (≤ 18 % alpha) so it tints, not washes out.
- Shadows are hard, short and directional only under characters and large props.
- Neon may flicker (1–4 % of frames) but never strobe faster than 6 Hz.
- Maximum 3 overlapping light colours in one screen region.

---

## 8. Effects

| Effect | Rule |
|---|---|
| Muzzle flash | 3-frame star, 6–10 px, warm orange + highlight core |
| Tracer | 1 px line, 60–90 ms, hot pink/cyan by faction |
| Blood | 1–3 px droplets, `#F04452`, gravity, sticks as decals |
| Impact spark | 4–8 pixels, orange→red, 120 ms |
| Smoke | 4–10 px soft pixel puffs, 400 ms, low alpha |
| Casings | 1×2 px highlight pixels, bounce once |
| Screen shake | ≤ 4 px, decays in 120 ms; never obscures aiming |
| Hit-stop | 40–70 ms on kill; 90 ms on player death |
| Death | sprite squash + blood pool decal + 6 gib pixels max |

Clarity beats decoration: effects may never cover the player, the crosshair, or
an enemy's telegraph for more than 2 frames.

---

## 9. Typography & UI

- Typeface: **Silkscreen** (pixel, OFL) for all UI and signage.
- Case: uppercase only. Tracking +1 px at HUD sizes, +2 px for headings.
- HUD: 10–12 px, `#FFE6C7` on transparent dark scrims, accent value in
  `#FF287F` or `#35E0E8`. Never full-width bars.
- Menus: black 82 % scrim, 2 px neon border, clipped corners, pink hover fill.
- Logo: "NEON" in hot pink, "CARNAGE" in cyan, layered glow; no drop-shadow
  gradients, no glossy bevels.
- No browser-default buttons, no rounded Material toggles, no system icons.
- Grade letters: S `#FFE6C7`, A `#35E0E8`, B `#9B4DFF`, C `#FF9A3C`,
  D `#F04452`.

---

## 10. Motion language

- Player walk: fast, 12 fps, 1 px vertical bob; no easing on input.
- Enemies: deliberate, slower cadence; telegraphs hold a pose for ≥ 250 ms.
- Doors slide 16 px in 180 ms with no bounce.
- UI: 120–180 ms cuts/fades; no long springs.
- Camera: follows with ~90 ms lag, 20 px aim look-ahead, clamped shake.

---

## 11. Asset inventory (prototype)

**Characters (procedural, 28×28, 16 rotations runtime):**
player · thug · goon · heavy · corpse variants (4)

**Animations:** idle, walk, shoot, melee, death — 9 frames per character.

**Weapons:** pistol · SMG · shotgun · bat · fists (no sprite).

**Environment tiles:** club floor, bar checker, VIP carpet, concrete, exit
strip, wall body, wall top, wall lit edge, doorway threshold.

**Props:** bar counter, back bar shelf + bottles, round table, chair, sofa,
crate (2 sizes), DJ booth, speaker, keg, plant, coat rack, locker, desk,
wall window, neon sign frames, exit pad, rug, ashtray/drinks.

**Effects:** muzzle flash, tracer, blood drop, gib, spark, smoke, casing,
bullet hole decal, blood pool decal, impact ring, alert pip (`!`), exit glow.

**UI:** logo, menu panel, button states, HUD blocks, crosshair, prompt chip,
grade stamp, scanline/vignette overlays.

**Audio (synthesised, not sampled):** pistol, SMG, shotgun, dry-fire, reload,
melee whoosh, melee impact, footsteps, door, alert, death, UI move/confirm,
generative synthwave score (bass, drums, pad, arp).

---

## 12. Consistency checklist

- [ ] Colours sampled from the palette only.
- [ ] 1 px outline on every character, weapon, prop.
- [ ] Snap to the 16 px tile grid for all environment art.
- [ ] Light comes from the top-left, neon from practical sources.
- [ ] Silhouette readable at 1× in under 100 ms.
- [ ] No external/stock/3D assets, no emoji.
- [ ] Effects ≤ 2 frames over a target silhouette.
