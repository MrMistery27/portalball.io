# PortalBall.io

Pinball meets Portal Gun — a browser game with procedural tables, dimensional mini-games, and neon-cyberpunk aesthetics.

## Play

[Live at GitHub Pages](https://mrmistery27.github.io/portalball.io/)

Or open `index.html` directly in any modern browser.

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `A` | Left flipper |
| `D` | Right flipper |
| `Space` | Launch ball |
| `Left click` | Place blue portal (upper play area) |
| `Arrow keys` | Labyrinth navigation |

### Mobile
- Tap left half / left button → left flipper
- Tap right half / right button → right flipper
- Launch button (center bottom) → launch ball
- Tap upper area → place blue portal
- Swipe → labyrinth navigation

## Portals

| Color | Who places it | Effect |
|-------|--------------|--------|
| 🔵 Blue | You | Teleport entry |
| 🟢 Green | Table (fixed) | Teleport exit |
| 🔴 Red | Table (fixed) | Triggers a random mini-game |

## Mini-Games

- **Labyrinth** — Navigate a procedural maze in 30s for +3 coins
- **Gravity Flip** — Survive a flip-gravity gauntlet for +1 emerald
- **Mirror Mode** — Pinball with inverted controls, hit 3 bumpers for +5 coins + 2× multiplier

## Scoring

- Bumper hit: 100 × multiplier
- 3 consecutive bumper hits: multiplier increases (1× → 2× → 3× → 5×)
- Coin: +50 score, +1 🪙
- Emerald: +500 score, +1 💎
- Coins and emeralds persist across sessions (for future ball skin shop)

## Tech

- Vanilla JS + Matter.js 0.19 (physics)
- Web Audio API (all sounds synthetic, no audio files)
- Canvas 2D rendering
- localStorage for highscore, coins, emeralds
- Capacitor-ready (works offline via local Matter.js fallback)
