# PortalBall.io Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete browser Pinball game with Portal-Gun mechanics, procedural table generation, 3 mini-games, collectibles, Web Audio API sounds, and GitHub Pages deployment.

**Architecture:** Central `GameState` state-machine in `game.js` with module namespaces. Matter.js handles pinball physics; mini-games render directly to Canvas 2D (Matter.js paused). CDN-first Matter.js load with local fallback for Capacitor-readiness.

**Tech Stack:** Vanilla JS (ES6), Matter.js 0.19, Web Audio API, Canvas 2D, CSS3 animations, GitHub Actions

## Global Constraints

- All game logic in `game.js` — no build step, no bundler
- Matter.js loaded from CDN first, local `matter.min.js` as fallback
- Mobile-first: touch controls primary, keyboard secondary
- Neon-Cyberpunk palette: bg `#0a0a0f`, cyan `#00ffff`, magenta `#ff00ff`, orange `#ff6600`
- Font: `Orbitron` (Google Fonts) with `monospace` fallback
- localStorage keys: `pb_highscore`, `pb_coins`, `pb_emeralds`, `pb_skin`
- State transitions only via `transitionTo(state)` — never mutate state directly
- Canvas portal placement: only upper 70% of canvas for blue portals on mobile
- No external audio files — all sounds synthetic via Web Audio API
- Relative paths everywhere (Capacitor-ready)

---

### Task 1: Project scaffold — index.html + style.css + Matter.js

**Files:**
- Create: `index.html`
- Create: `style.css`
- Download: `matter.min.js`

**Interfaces:**
- Produces: `<canvas id="gameCanvas">`, `<div id="hud">`, `<div id="overlay">` for all later tasks

- [ ] **Step 1: Download Matter.js locally**

```bash
curl -L https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js -o /Users/mircomuckenhirn/Documents/portalball.io/matter.min.js
```

- [ ] **Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>PortalBall.io</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="game-container">
    <canvas id="gameCanvas"></canvas>

    <div id="hud">
      <span id="hud-score">SCORE: 0</span>
      <span id="hud-mult">×1</span>
      <span id="hud-lives">♥♥♥</span>
      <span id="hud-coins">🪙 0</span>
      <span id="hud-emeralds">💎 0</span>
    </div>

    <div id="overlay" class="active">
      <div id="screen-launch" class="screen active">
        <h1 class="title">PORTAL<span class="accent">BALL</span>.io</h1>
        <p id="highscore-display">HIGHSCORE: 0</p>
        <div id="ball-preview"></div>
        <button id="btn-play" class="btn-primary">PLAY</button>
      </div>
      <div id="screen-gameover" class="screen">
        <h2>GAME OVER</h2>
        <p id="final-score"></p>
        <p id="session-coins"></p>
        <p id="session-emeralds"></p>
        <button id="btn-restart" class="btn-primary">RESTART</button>
      </div>
      <div id="screen-minigame-flash" class="screen">
        <h2 id="minigame-title"></h2>
      </div>
    </div>

    <div id="touch-controls">
      <button id="btn-left-flipper" class="flipper-btn left">◀</button>
      <button id="btn-launch" class="launch-btn">▲</button>
      <button id="btn-right-flipper" class="flipper-btn right">▶</button>
    </div>
  </div>

  <script>
    // CDN-first, local fallback for Matter.js
    (function() {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
      s.onerror = function() {
        var fallback = document.createElement('script');
        fallback.src = 'matter.min.js';
        fallback.onload = startGame;
        document.head.appendChild(fallback);
      };
      s.onload = startGame;
      document.head.appendChild(s);
    })();
  </script>
  <script src="game.js" defer></script>
</body>
</html>
```

- [ ] **Step 3: Create style.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0a0a0f;
  color: #00ffff;
  font-family: 'Orbitron', monospace;
  overflow: hidden;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Animated grid background */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridScroll 8s linear infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes gridScroll {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}

#game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  z-index: 1;
}

#gameCanvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

#hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0,0,0,0.7);
  border-bottom: 1px solid rgba(0,255,255,0.2);
  font-size: clamp(10px, 2.5vw, 14px);
  font-weight: 700;
  z-index: 10;
  pointer-events: none;
}

#hud-mult { color: #ff00ff; }
#hud-lives { color: #ff6600; letter-spacing: 2px; }
#hud-coins { color: #ffdd00; }
#hud-emeralds { color: #00ff88; }

#overlay {
  display: none;
  position: absolute;
  inset: 0;
  background: rgba(10,10,15,0.92);
  z-index: 20;
  align-items: center;
  justify-content: center;
}

#overlay.active { display: flex; }

.screen { display: none; flex-direction: column; align-items: center; gap: 20px; text-align: center; padding: 24px; }
.screen.active { display: flex; }

.title { font-size: clamp(32px, 8vw, 56px); font-weight: 900; letter-spacing: 4px; text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff; }
.accent { color: #ff00ff; text-shadow: 0 0 20px #ff00ff, 0 0 40px #ff00ff; }

.btn-primary {
  background: transparent;
  border: 2px solid #00ffff;
  color: #00ffff;
  font-family: 'Orbitron', monospace;
  font-size: 18px;
  font-weight: 700;
  padding: 14px 40px;
  cursor: pointer;
  letter-spacing: 3px;
  text-transform: uppercase;
  transition: all 0.2s;
  box-shadow: 0 0 10px rgba(0,255,255,0.3);
}

.btn-primary:hover, .btn-primary:active {
  background: rgba(0,255,255,0.15);
  box-shadow: 0 0 20px rgba(0,255,255,0.6);
}

#touch-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 10;
  pointer-events: none;
}

.flipper-btn, .launch-btn {
  pointer-events: all;
  background: rgba(0,255,255,0.1);
  border: 2px solid rgba(0,255,255,0.4);
  color: #00ffff;
  font-size: 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.flipper-btn { width: 70px; height: 60px; }
.launch-btn { width: 60px; height: 50px; }

.flipper-btn:active, .launch-btn:active {
  background: rgba(0,255,255,0.35);
}

/* Mini-game flash overlay */
#screen-minigame-flash { color: #ff00ff; }
#screen-minigame-flash h2 {
  font-size: 36px;
  text-shadow: 0 0 30px #ff00ff;
  animation: flashIn 0.5s ease-out;
}

@keyframes flashIn {
  0% { opacity: 0; transform: scale(1.5); }
  100% { opacity: 1; transform: scale(1); }
}

/* HUD multiplier blink */
@keyframes multBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
.mult-blink { animation: multBlink 0.3s ease 3; }
```

- [ ] **Step 4: Verify files exist**

```bash
ls -la /Users/mircomuckenhirn/Documents/portalball.io/
```
Expected: `index.html`, `style.css`, `matter.min.js` present

- [ ] **Step 5: Commit**

```bash
cd /Users/mircomuckenhirn/Documents/portalball.io && git add index.html style.css matter.min.js && git commit -m "feat: scaffold HTML, CSS, and Matter.js"
```

---

### Task 2: game.js skeleton — Store, AudioEngine, GameState

**Files:**
- Create: `game.js`

**Interfaces:**
- Produces: `window.startGame()` (called by index.html CDN loader), `Store`, `AudioEngine`, `transitionTo(state)`, `GameState`

- [ ] **Step 1: Create game.js with Store, AudioEngine, and state skeleton**

```js
'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const STATES = {
  LAUNCH: 'LAUNCH',
  PINBALL: 'PINBALL',
  MINIGAME_LABYRINTH: 'MINIGAME_LABYRINTH',
  MINIGAME_GRAVITY: 'MINIGAME_GRAVITY',
  MINIGAME_MIRROR: 'MINIGAME_MIRROR',
  GAME_OVER: 'GAME_OVER'
};

const COLORS = {
  bg: '#0a0a0f',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ff6600',
  portalBlue: '#0088ff',
  portalGreen: '#00ff88',
  portalRed: '#ff0033',
  coin: '#ffdd00',
  emerald: '#00ff88'
};

// ─── Store (localStorage) ────────────────────────────────────────────────────
const Store = {
  get(key) {
    const v = localStorage.getItem('pb_' + key);
    return v === null ? 0 : JSON.parse(v);
  },
  set(key, val) {
    localStorage.setItem('pb_' + key, JSON.stringify(val));
  },
  add(key, amount) {
    this.set(key, this.get(key) + amount);
  }
};

// ─── AudioEngine ─────────────────────────────────────────────────────────────
const AudioEngine = {
  ctx: null,

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },

  _play({ type = 'sine', freqStart, freqEnd, duration, gainStart = 0.5, gainEnd = 0, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(gainStart, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.001), t + duration);
    osc.start(t);
    osc.stop(t + duration);
  },

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'bumper':
        this._play({ type: 'square', freqStart: 220, freqEnd: 110, duration: 0.05, gainStart: 0.8 });
        break;
      case 'portalBlue':
        this._play({ type: 'sine', freqStart: 300, freqEnd: 1200, duration: 0.3, gainStart: 0.4 });
        break;
      case 'portalRed':
        this._play({ type: 'sawtooth', freqStart: 80, freqEnd: 40, duration: 0.2, gainStart: 0.6 });
        break;
      case 'flipper':
        this._play({ type: 'square', freqStart: 440, freqEnd: 220, duration: 0.06, gainStart: 0.5 });
        break;
      case 'launch':
        this._play({ type: 'sine', freqStart: 200, freqEnd: 600, duration: 0.4, gainStart: 0.4 });
        break;
      case 'life':
        this._play({ type: 'sawtooth', freqStart: 400, freqEnd: 50, duration: 0.8, gainStart: 0.7 });
        break;
      case 'coin':
        this._play({ type: 'sine', freqStart: 1000, freqEnd: 1400, duration: 0.12, gainStart: 0.4 });
        break;
      case 'emerald':
        [800, 1000, 1200, 1600].forEach((freq, i) => {
          this._play({ type: 'sine', freqStart: freq, freqEnd: freq * 1.2, duration: 0.08, gainStart: 0.35, delay: i * 0.07 });
        });
        break;
      case 'minigameStart':
        [523, 659, 784].forEach((freq, i) => {
          this._play({ type: 'triangle', freqStart: freq, duration: 0.1, gainStart: 0.4, delay: i * 0.1 });
        });
        break;
    }
  }
};

// ─── GameState ───────────────────────────────────────────────────────────────
const GameState = {
  current: STATES.LAUNCH,
  score: 0,
  lives: 3,
  multiplier: 1,
  consecutiveBumps: 0,
  sessionCoins: 0,
  sessionEmeralds: 0,
  mirrorBonusExpiry: 0,

  reset() {
    this.score = 0;
    this.lives = 3;
    this.multiplier = 1;
    this.consecutiveBumps = 0;
    this.sessionCoins = 0;
    this.sessionEmeralds = 0;
    this.mirrorBonusExpiry = 0;
  },

  addScore(pts) {
    const mult = (Date.now() < this.mirrorBonusExpiry) ? this.multiplier * 2 : this.multiplier;
    this.score += pts * mult;
    HUD.update();
  },

  bumpMultiplier() {
    this.consecutiveBumps++;
    if (this.consecutiveBumps % 3 === 0) {
      if (this.multiplier === 1) this.multiplier = 2;
      else if (this.multiplier === 2) this.multiplier = 3;
      else if (this.multiplier === 3) this.multiplier = 5;
      HUD.blinkMultiplier();
    }
    HUD.update();
  },

  resetMultiplier() {
    this.multiplier = 1;
    this.consecutiveBumps = 0;
    HUD.update();
  },

  loseLife() {
    this.lives--;
    AudioEngine.play('life');
    HUD.update();
    if (this.lives <= 0) transitionTo(STATES.GAME_OVER);
  },

  addCoins(n) {
    this.sessionCoins += n;
    Store.add('coins', n);
    AudioEngine.play('coin');
    HUD.update();
  },

  addEmerald() {
    this.sessionEmeralds++;
    Store.add('emeralds', 1);
    AudioEngine.play('emerald');
    HUD.update();
  }
};

// ─── HUD ─────────────────────────────────────────────────────────────────────
const HUD = {
  update() {
    document.getElementById('hud-score').textContent = 'SCORE: ' + GameState.score.toLocaleString();
    document.getElementById('hud-mult').textContent = '×' + GameState.multiplier;
    const hearts = '♥'.repeat(GameState.lives) + '♡'.repeat(Math.max(0, 3 - GameState.lives));
    document.getElementById('hud-lives').textContent = hearts;
    document.getElementById('hud-coins').textContent = '🪙 ' + Store.get('coins');
    document.getElementById('hud-emeralds').textContent = '💎 ' + Store.get('emeralds');
  },

  blinkMultiplier() {
    const el = document.getElementById('hud-mult');
    el.classList.remove('mult-blink');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('mult-blink');
  }
};

// ─── State transition ─────────────────────────────────────────────────────────
function transitionTo(state, payload = {}) {
  const prev = GameState.current;
  GameState.current = state;

  // Teardown previous state
  if (prev === STATES.PINBALL) Physics.pause();

  // Setup new state
  switch (state) {
    case STATES.LAUNCH:
      showScreen('screen-launch');
      document.getElementById('highscore-display').textContent =
        'HIGHSCORE: ' + Store.get('highscore').toLocaleString();
      break;

    case STATES.PINBALL:
      hideOverlay();
      GameState.reset();
      HUD.update();
      Table.generate();
      Physics.resume();
      break;

    case STATES.MINIGAME_LABYRINTH:
    case STATES.MINIGAME_GRAVITY:
    case STATES.MINIGAME_MIRROR:
      AudioEngine.play('minigameStart');
      showMinigameFlash(state, () => {
        hideOverlay();
        Minigames.start(state);
      });
      break;

    case STATES.GAME_OVER:
      if (GameState.score > Store.get('highscore')) Store.set('highscore', GameState.score);
      showScreen('screen-gameover');
      document.getElementById('final-score').textContent = 'SCORE: ' + GameState.score.toLocaleString();
      document.getElementById('session-coins').textContent = '+' + GameState.sessionCoins + ' 🪙';
      document.getElementById('session-emeralds').textContent = '+' + GameState.sessionEmeralds + ' 💎';
      break;
  }
}

function showScreen(id) {
  document.getElementById('overlay').classList.add('active');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function hideOverlay() {
  document.getElementById('overlay').classList.remove('active');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
}

function showMinigameFlash(state, cb) {
  const names = {
    [STATES.MINIGAME_LABYRINTH]: 'LABYRINTH',
    [STATES.MINIGAME_GRAVITY]: 'GRAVITY FLIP',
    [STATES.MINIGAME_MIRROR]: 'MIRROR MODE'
  };
  document.getElementById('minigame-title').textContent = names[state];
  showScreen('screen-minigame-flash');
  setTimeout(cb, 800);
}

// ─── Placeholder namespaces (filled in later tasks) ───────────────────────────
const Physics = { pause() {}, resume() {} };
const Table = { generate() {} };
const Portals = {};
const Collectibles = {};
const Bumpers = {};
const Flippers = {};
const Minigames = { start() {} };
const Controls = {};
const Renderer = {};

// ─── Entry point ──────────────────────────────────────────────────────────────
function startGame() {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  // Init audio on first interaction
  const initAudio = () => {
    AudioEngine.init();
    document.removeEventListener('keydown', initAudio);
    document.removeEventListener('touchstart', initAudio);
    document.removeEventListener('click', initAudio);
  };
  document.addEventListener('keydown', initAudio);
  document.addEventListener('touchstart', initAudio);
  document.addEventListener('click', initAudio);

  // Button wiring
  document.getElementById('btn-play').addEventListener('click', () => transitionTo(STATES.PINBALL));
  document.getElementById('btn-restart').addEventListener('click', () => transitionTo(STATES.PINBALL));

  transitionTo(STATES.LAUNCH);
  HUD.update();
}
```

- [ ] **Step 2: Open index.html in browser, verify launch screen appears**

Open `index.html` in a browser. Expected: dark background with grid, "PORTALBALL.io" title, HIGHSCORE: 0, PLAY button.

- [ ] **Step 3: Commit**

```bash
cd /Users/mircomuckenhirn/Documents/portalball.io && git add game.js && git commit -m "feat: game skeleton — Store, AudioEngine, GameState, HUD, transitions"
```

---

### Task 3: Physics engine + Canvas renderer

**Files:**
- Modify: `game.js` — replace `Physics` and `Renderer` placeholders

**Interfaces:**
- Consumes: `Matter` (global from CDN/fallback), canvas `#gameCanvas`
- Produces: `Physics.world`, `Physics.engine`, `Physics.render` (custom), `Renderer.drawFrame(ctx)`

- [ ] **Step 1: Replace Physics and Renderer placeholders in game.js**

Find the line `const Physics = { pause() {}, resume() {} };` and replace it and the `const Renderer = {};` line with:

```js
const Physics = (() => {
  let engine, world, runner, rafId;
  const { Engine, World, Bodies, Body, Events, Runner } = Matter;

  function init(canvas) {
    engine = Engine.create({ gravity: { y: 2 } });
    world = engine.world;
    runner = Runner.create();
    Runner.run(runner, engine);
    return { engine, world };
  }

  function pause() {
    if (runner) Runner.stop(runner);
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function resume() {
    if (runner) Runner.run(runner, engine);
  }

  function getEngine() { return engine; }
  function getWorld() { return world; }

  return { init, pause, resume, getEngine, getWorld };
})();

const Renderer = (() => {
  let ctx, canvas, rafId, running = false;

  function init(cnv) {
    canvas = cnv;
    ctx = canvas.getContext('2d');
  }

  function start() {
    running = true;
    loop();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (GameState.current === STATES.PINBALL) {
      drawPinball(ctx, canvas);
    } else if ([STATES.MINIGAME_LABYRINTH, STATES.MINIGAME_GRAVITY, STATES.MINIGAME_MIRROR].includes(GameState.current)) {
      Minigames.draw(ctx, canvas);
    }

    rafId = requestAnimationFrame(loop);
  }

  return { init, start, stop };
})();

function drawPinball(ctx, canvas) {
  const world = Physics.getWorld();
  if (!world) return;

  ctx.save();
  // Draw static bodies (walls, bumpers, ramps)
  world.bodies.forEach(body => {
    if (body.label === 'wall' || body.label === 'ramp' || body.label === 'slingshot') {
      drawBody(ctx, body, COLORS.cyan, 'rgba(0,255,255,0.08)', 1.5);
    } else if (body.label === 'bumper') {
      drawBumperBody(ctx, body);
    } else if (body.label === 'ball') {
      drawBallBody(ctx, body);
    } else if (body.label === 'flipper-left' || body.label === 'flipper-right') {
      drawBody(ctx, body, COLORS.magenta, 'rgba(255,0,255,0.2)', 2);
    } else if (body.label === 'coin') {
      drawCoin(ctx, body);
    } else if (body.label === 'emerald') {
      drawEmerald(ctx, body);
    } else if (body.label === 'portal-green' || body.label === 'portal-red') {
      drawPortalStatic(ctx, body);
    }
  });

  Portals.drawBlue(ctx);
  ctx.restore();
}

function drawBody(ctx, body, stroke, fill, lineWidth) {
  const verts = body.vertices;
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill || 'transparent';
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth || 1;
  ctx.shadowBlur = 8;
  ctx.shadowColor = stroke;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawBumperBody(ctx, body) {
  const pos = body.position;
  const r = body.circleRadius;
  const pulse = Bumpers.getPulse(body.id);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r + pulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,0,255,0.1)';
  ctx.fill();
  ctx.strokeStyle = COLORS.magenta;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 15 + pulse * 3;
  ctx.shadowColor = COLORS.magenta;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Inner dot
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.magenta;
  ctx.fill();
}

function drawBallBody(ctx, body) {
  const pos = body.position;
  const r = body.circleRadius;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.cyan;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLORS.cyan;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawCoin(ctx, body) {
  const pos = body.position;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.coin;
  ctx.shadowBlur = 12;
  ctx.shadowColor = COLORS.coin;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawEmerald(ctx, body) {
  const pos = body.position;
  const angle = (Date.now() * 0.002) % (Math.PI * 2);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 10);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fillStyle = COLORS.emerald;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLORS.emerald;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPortalStatic(ctx, body) {
  const pos = body.position;
  const color = body.label === 'portal-green' ? COLORS.portalGreen : COLORS.portalRed;
  const r = body.circleRadius || 14;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color + '33';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.stroke();
  ctx.shadowBlur = 0;
}
```

- [ ] **Step 2: Update startGame() to initialize Physics and Renderer**

Replace the `transitionTo(STATES.LAUNCH)` section in `startGame()`:

```js
function startGame() {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  Physics.init(canvas);
  Renderer.init(canvas);
  Renderer.start();
  Controls.init(canvas);

  const initAudio = () => {
    AudioEngine.init();
    document.removeEventListener('keydown', initAudio);
    document.removeEventListener('touchstart', initAudio);
    document.removeEventListener('click', initAudio);
  };
  document.addEventListener('keydown', initAudio);
  document.addEventListener('touchstart', initAudio);
  document.addEventListener('click', initAudio);

  document.getElementById('btn-play').addEventListener('click', () => transitionTo(STATES.PINBALL));
  document.getElementById('btn-restart').addEventListener('click', () => transitionTo(STATES.PINBALL));

  transitionTo(STATES.LAUNCH);
  HUD.update();
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mircomuckenhirn/Documents/portalball.io && git add game.js && git commit -m "feat: Physics engine and Canvas renderer"
```

---

### Task 4: Procedural table generation + Flippers + Controls

**Files:**
- Modify: `game.js` — replace `Table`, `Flippers`, `Controls` placeholders

**Interfaces:**
- Consumes: `Physics.getWorld()`, `Physics.getEngine()`, `Matter.Bodies`, `Matter.Body`, `Matter.World`, `Matter.Constraint`, `Matter.Events`
- Produces: `Table.generate()`, `Table.getBallSpawnPos()`, `Table.getGreenPortalPos()`, `Flippers.activateLeft()`, `Flippers.releaseLeft()`, `Flippers.activateRight()`, `Flippers.releaseRight()`, `Controls.init(canvas)`

- [ ] **Step 1: Replace Table placeholder**

```js
const Table = (() => {
  const { Bodies, World, Body, Events, Constraint } = Matter;
  let tableData = {};

  function seededRand(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function generate() {
    const world = Physics.getWorld();
    World.clear(world);
    Physics.getEngine().gravity.y = 2;

    const canvas = document.getElementById('gameCanvas');
    const W = canvas.width, H = canvas.height;
    const rand = seededRand(Date.now());

    tableData = { W, H, bumpers: [], greenPortals: [], redPortals: [], coins: [], emeralds: [] };

    const wallOpts = { isStatic: true, label: 'wall', restitution: 0.5, friction: 0 };

    // Fixed walls
    const thickness = 20;
    World.add(world, [
      Bodies.rectangle(W / 2, -thickness / 2, W, thickness, wallOpts),           // ceiling
      Bodies.rectangle(-thickness / 2, H / 2, thickness, H, wallOpts),           // left wall
      Bodies.rectangle(W + thickness / 2, H / 2, thickness, H, wallOpts),        // right wall
      Bodies.rectangle(W * 0.28, H - 20, W * 0.25, thickness, { ...wallOpts, angle: -0.5 }), // left drain wall
      Bodies.rectangle(W * 0.72, H - 20, W * 0.25, thickness, { ...wallOpts, angle: 0.5 }),  // right drain wall
    ]);

    // Plunger lane right side
    World.add(world, Bodies.rectangle(W - 30, H * 0.6, 4, H * 0.8, wallOpts));

    // Random bumpers
    const numBumpers = 4 + Math.floor(rand() * 5);
    for (let i = 0; i < numBumpers; i++) {
      const x = W * 0.15 + rand() * W * 0.65;
      const y = H * 0.15 + rand() * H * 0.5;
      const b = Bodies.circle(x, y, 20, { isStatic: true, label: 'bumper', restitution: 1.5, friction: 0 });
      World.add(world, b);
      tableData.bumpers.push(b);
    }

    // Random ramps
    const numRamps = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < numRamps; i++) {
      const x = W * 0.1 + rand() * W * 0.7;
      const y = H * 0.2 + rand() * H * 0.55;
      const angle = (rand() - 0.5) * 1.2;
      const ramp = Bodies.rectangle(x, y, 80 + rand() * 60, 10, { isStatic: true, label: 'ramp', restitution: 0.4, friction: 0, angle });
      World.add(world, ramp);
    }

    // Random slingshots
    const numSlings = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < numSlings; i++) {
      const x = (i % 2 === 0 ? W * 0.12 : W * 0.78) + rand() * W * 0.1 - W * 0.05;
      const y = H * 0.4 + rand() * H * 0.25;
      const s = Bodies.rectangle(x, y, 12, 70, { isStatic: true, label: 'slingshot', restitution: 1.8, friction: 0 });
      World.add(world, s);
    }

    // Green portals (1-2)
    const numGreen = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < numGreen; i++) {
      const x = W * 0.15 + rand() * W * 0.6;
      const y = H * 0.1 + rand() * H * 0.35;
      const p = Bodies.circle(x, y, 14, { isStatic: true, isSensor: true, label: 'portal-green' });
      World.add(world, p);
      tableData.greenPortals.push(p);
    }

    // Red portals (1-3)
    const numRed = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < numRed; i++) {
      const x = W * 0.2 + rand() * W * 0.55;
      const y = H * 0.5 + rand() * H * 0.25;
      const p = Bodies.circle(x, y, 14, { isStatic: true, isSensor: true, label: 'portal-red' });
      World.add(world, p);
      tableData.redPortals.push(p);
    }

    // Coins (5-10)
    const numCoins = 5 + Math.floor(rand() * 6);
    for (let i = 0; i < numCoins; i++) {
      const x = W * 0.1 + rand() * W * 0.75;
      const y = H * 0.1 + rand() * H * 0.65;
      const c = Bodies.circle(x, y, 8, { isStatic: true, isSensor: true, label: 'coin' });
      World.add(world, c);
      tableData.coins.push(c);
    }

    // Emeralds (1-2)
    const numEmeralds = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < numEmeralds; i++) {
      const x = W * 0.2 + rand() * W * 0.55;
      const y = H * 0.12 + rand() * H * 0.3;
      const e = Bodies.circle(x, y, 10, { isStatic: true, isSensor: true, label: 'emerald' });
      World.add(world, e);
      tableData.emeralds.push(e);
    }

    // Add flippers and ball
    Flippers.init(world, W, H);
    spawnBall(world, W, H);

    // Wire collision events
    wireCollisions();
  }

  function spawnBall(world, W, H) {
    const { Bodies, World } = Matter;
    const ball = Bodies.circle(W - 45, H * 0.75, 12, {
      restitution: 0.7, friction: 0.05, density: 0.002, label: 'ball'
    });
    World.add(world, ball);
    tableData.ball = ball;
  }

  function getBallSpawnPos() {
    const canvas = document.getElementById('gameCanvas');
    return { x: canvas.width - 45, y: canvas.height * 0.75 };
  }

  function getGreenPortalPos() {
    if (tableData.greenPortals && tableData.greenPortals.length > 0) {
      return tableData.greenPortals[0].position;
    }
    const canvas = document.getElementById('gameCanvas');
    return { x: canvas.width / 2, y: canvas.height * 0.3 };
  }

  function getData() { return tableData; }

  function wireCollisions() {
    const engine = Physics.getEngine();
    Matter.Events.on(engine, 'collisionStart', e => {
      e.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        const labels = [bodyA.label, bodyB.label];

        if (labels.includes('ball') && labels.includes('bumper')) {
          const bumper = bodyA.label === 'bumper' ? bodyA : bodyB;
          Bumpers.onHit(bumper);
        }
        if (labels.includes('ball') && labels.includes('coin')) {
          const coin = bodyA.label === 'coin' ? bodyA : bodyB;
          Collectibles.collectCoin(coin);
        }
        if (labels.includes('ball') && labels.includes('emerald')) {
          const em = bodyA.label === 'emerald' ? bodyA : bodyB;
          Collectibles.collectEmerald(em);
        }
        if (labels.includes('ball') && labels.includes('portal-green')) {
          Portals.onGreenHit();
        }
        if (labels.includes('ball') && labels.includes('portal-red')) {
          Portals.onRedHit();
        }
        if (labels.includes('ball') && (labels.includes('flipper-left') || labels.includes('flipper-right'))) {
          AudioEngine.play('flipper');
        }
        if (labels.includes('ball') && labels.includes('portal-blue-sensor')) {
          Portals.onBlueHit();
        }
      });
    });

    // Drain detection: ball falls below canvas
    const engine2 = Physics.getEngine();
    Matter.Events.on(engine2, 'afterUpdate', () => {
      const data = getData();
      if (!data.ball) return;
      const canvas = document.getElementById('gameCanvas');
      if (data.ball.position.y > canvas.height + 50) {
        GameState.resetMultiplier();
        GameState.loseLife();
        if (GameState.lives > 0) {
          const { W, H } = data;
          Matter.Body.setPosition(data.ball, getBallSpawnPos());
          Matter.Body.setVelocity(data.ball, { x: 0, y: 0 });
        }
      }
    });
  }

  return { generate, getData, getBallSpawnPos, getGreenPortalPos };
})();
```

- [ ] **Step 2: Replace Flippers placeholder**

```js
const Flippers = (() => {
  const { Bodies, World, Body, Constraint } = Matter;
  let leftFlipper, rightFlipper, leftConstraint, rightConstraint;

  function init(world, W, H) {
    const fy = H - 90;
    const flW = W * 0.22, flH = 14;

    leftFlipper = Bodies.trapezoid(W * 0.28, fy, flW, flH, 0.15, {
      label: 'flipper-left', restitution: 0.3, friction: 0.1
    });
    rightFlipper = Bodies.trapezoid(W * 0.72, fy, flW, flH, 0.15, {
      label: 'flipper-right', restitution: 0.3, friction: 0.1
    });

    leftConstraint = Constraint.create({
      pointA: { x: W * 0.18, y: fy },
      bodyB: leftFlipper, pointB: { x: -flW / 2 + 10, y: 0 },
      stiffness: 1, length: 0
    });
    rightConstraint = Constraint.create({
      pointA: { x: W * 0.82, y: fy },
      bodyB: rightFlipper, pointB: { x: flW / 2 - 10, y: 0 },
      stiffness: 1, length: 0
    });

    World.add(world, [leftFlipper, rightFlipper, leftConstraint, rightConstraint]);

    Body.setMass(leftFlipper, 100);
    Body.setMass(rightFlipper, 100);
  }

  function activateLeft() {
    Body.setAngularVelocity(leftFlipper, -0.3);
    Body.setAngle(leftFlipper, -0.5);
  }
  function releaseLeft() {
    Body.setAngularVelocity(leftFlipper, 0.2);
    Body.setAngle(leftFlipper, 0.4);
  }
  function activateRight() {
    Body.setAngularVelocity(rightFlipper, 0.3);
    Body.setAngle(rightFlipper, 0.5);
  }
  function releaseRight() {
    Body.setAngularVelocity(rightFlipper, -0.2);
    Body.setAngle(rightFlipper, -0.4);
  }

  return { init, activateLeft, releaseLeft, activateRight, releaseRight };
})();
```

- [ ] **Step 3: Replace Controls placeholder**

```js
const Controls = (() => {
  let launched = false;

  function init(canvas) {
    // Keyboard
    document.addEventListener('keydown', e => {
      if (GameState.current !== STATES.PINBALL) return;
      if (e.key === 'a' || e.key === 'A') Flippers.activateLeft();
      if (e.key === 'd' || e.key === 'D') Flippers.activateRight();
      if (e.key === ' ' && !launched) launchBall();
    });
    document.addEventListener('keyup', e => {
      if (GameState.current !== STATES.PINBALL) return;
      if (e.key === 'a' || e.key === 'A') Flippers.releaseLeft();
      if (e.key === 'd' || e.key === 'D') Flippers.releaseRight();
    });

    // Touch: flipper buttons
    const btnL = document.getElementById('btn-left-flipper');
    const btnR = document.getElementById('btn-right-flipper');
    const btnLaunch = document.getElementById('btn-launch');

    btnL.addEventListener('touchstart', e => { e.preventDefault(); if (GameState.current === STATES.PINBALL) Flippers.activateLeft(); }, { passive: false });
    btnL.addEventListener('touchend', e => { e.preventDefault(); Flippers.releaseLeft(); }, { passive: false });
    btnR.addEventListener('touchstart', e => { e.preventDefault(); if (GameState.current === STATES.PINBALL) Flippers.activateRight(); }, { passive: false });
    btnR.addEventListener('touchend', e => { e.preventDefault(); Flippers.releaseRight(); }, { passive: false });
    btnLaunch.addEventListener('touchstart', e => { e.preventDefault(); if (GameState.current === STATES.PINBALL && !launched) launchBall(); }, { passive: false });
    btnLaunch.addEventListener('click', () => { if (GameState.current === STATES.PINBALL && !launched) launchBall(); });

    // Touch: tap-half-screen flipper (upper 30% = portal zone, lower 70% = flipper zone)
    canvas.addEventListener('touchstart', e => {
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const portalZoneEnd = canvas.height * 0.7;

      if (GameState.current === STATES.PINBALL) {
        if (y < portalZoneEnd) {
          Portals.placeBlue(x, y, canvas);
        } else {
          if (x < canvas.width / 2) Flippers.activateLeft();
          else Flippers.activateRight();
        }
      } else if (GameState.current === STATES.MINIGAME_GRAVITY) {
        Minigames.onTap();
      } else if (GameState.current === STATES.MINIGAME_LABYRINTH) {
        Minigames.onSwipe(e);
      }
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      if (GameState.current === STATES.PINBALL && y >= canvas.height * 0.7) {
        if (x < canvas.width / 2) Flippers.releaseLeft();
        else Flippers.releaseRight();
      }
    }, { passive: true });

    // Left-click: portal placement on desktop
    canvas.addEventListener('click', e => {
      if (GameState.current !== STATES.PINBALL) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y < canvas.height * 0.7) Portals.placeBlue(x, y, canvas);
    });
  }

  function launchBall() {
    launched = true;
    const data = Table.getData();
    if (data.ball) {
      Matter.Body.setVelocity(data.ball, { x: 0, y: -18 });
      AudioEngine.play('launch');
    }
  }

  function resetLaunch() { launched = false; }

  return { init, resetLaunch };
})();
```

- [ ] **Step 4: Update Table.generate() to call Controls.resetLaunch() at end**

In `generate()`, add before `wireCollisions()`:

```js
Controls.resetLaunch();
```

- [ ] **Step 5: Commit**

```bash
cd /Users/mircomuckenhirn/Documents/portalball.io && git add game.js && git commit -m "feat: procedural table, flippers, and controls"
```

---

### Task 5: Bumpers + Collectibles + Portal system

**Files:**
- Modify: `game.js` — replace `Bumpers`, `Collectibles`, `Portals` placeholders

**Interfaces:**
- Consumes: `Table.getData()`, `Table.getGreenPortalPos()`, `Physics.getWorld()`, `Matter.World`, `Matter.Body`, `GameState`, `AudioEngine`
- Produces: `Bumpers.onHit(body)`, `Bumpers.getPulse(id)`, `Collectibles.collectCoin(body)`, `Collectibles.collectEmerald(body)`, `Portals.placeBlue(x, y, canvas)`, `Portals.drawBlue(ctx)`, `Portals.onBlueHit()`, `Portals.onGreenHit()`, `Portals.onRedHit()`

- [ ] **Step 1: Replace Bumpers placeholder**

```js
const Bumpers = (() => {
  const pulses = {};

  function onHit(body) {
    AudioEngine.play('bumper');
    GameState.addScore(100);
    GameState.bumpMultiplier();
    pulses[body.id] = 8;
    setTimeout(() => { delete pulses[body.id]; }, 200);
  }

  function getPulse(id) {
    return pulses[id] || 0;
  }

  return { onHit, getPulse };
})();
```

- [ ] **Step 2: Replace Collectibles placeholder**

```js
const Collectibles = (() => {
  function collectCoin(body) {
    const world = Physics.getWorld();
    Matter.World.remove(world, body);
    const data = Table.getData();
    data.coins = data.coins.filter(c => c.id !== body.id);
    GameState.addCoins(1);
    GameState.addScore(50);
  }

  function collectEmerald(body) {
    const world = Physics.getWorld();
    Matter.World.remove(world, body);
    const data = Table.getData();
    data.emeralds = data.emeralds.filter(e => e.id !== body.id);
    GameState.addEmerald();
    GameState.addScore(500);
  }

  return { collectCoin, collectEmerald };
})();
```

- [ ] **Step 3: Replace Portals placeholder**

```js
const Portals = (() => {
  let bluePortal = null;
  let blueSensor = null;
  let teleporting = false;

  function placeBlue(x, y, canvas) {
    const world = Physics.getWorld();
    if (blueSensor) Matter.World.remove(world, blueSensor);

    bluePortal = { x, y };
    blueSensor = Matter.Bodies.circle(x, y, 14, {
      isStatic: true, isSensor: true, label: 'portal-blue-sensor'
    });
    Matter.World.add(world, blueSensor);
    AudioEngine.play('portalBlue');
  }

  function drawBlue(ctx) {
    if (!bluePortal) return;
    const pulse = (Math.sin(Date.now() * 0.006) * 3 + 3);
    ctx.beginPath();
    ctx.arc(bluePortal.x, bluePortal.y, 14 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.portalBlue + '33';
    ctx.fill();
    ctx.strokeStyle = COLORS.portalBlue;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20 + pulse * 2;
    ctx.shadowColor = COLORS.portalBlue;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function onBlueHit() {
    if (teleporting) return;
    teleporting = true;
    const data = Table.getData();
    const exit = Table.getGreenPortalPos();
    if (data.ball) {
      const vel = { ...data.ball.velocity };
      Matter.Body.setPosition(data.ball, { x: exit.x, y: exit.y });
      Matter.Body.setVelocity(data.ball, vel);
    }
    AudioEngine.play('portalBlue');
    setTimeout(() => { teleporting = false; }, 500);
  }

  function onGreenHit() {
    // Green is exit — no action needed (ball just passes through)
  }

  function onRedHit() {
    if (GameState.current !== STATES.PINBALL) return;
    AudioEngine.play('portalRed');
    const options = [STATES.MINIGAME_LABYRINTH, STATES.MINIGAME_GRAVITY, STATES.MINIGAME_MIRROR];
    const chosen = options[Math.floor(Math.random() * options.length)];
    setTimeout(() => transitionTo(chosen), 300);
  }

  function reset() {
    bluePortal = null;
    if (blueSensor) {
      Matter.World.remove(Physics.getWorld(), blueSensor);
      blueSensor = null;
    }
    teleporting = false;
  }

  return { placeBlue, drawBlue, onBlueHit, onGreenHit, onRedHit, reset };
})();
```

- [ ] **Step 4: Call Portals.reset() in Table.generate() before wireCollisions()**

In `generate()`, add:

```js
Portals.reset();
```

- [ ] **Step 5: Test in browser — click on upper half of canvas, verify blue portal appears with glow**

Open `index.html`, press Play, click upper area — blue circle with glow should appear. Bumpers should push ball with magenta pulse.

- [ ] **Step 6: Commit**

```bash
cd /Users/mircomuckenhirn/Documents/portalball.io && git add game.js && git commit -m "feat: bumpers, collectibles, and portal system"
```

---

### Task 6: Mini-Games — Labyrinth, Gravity-Flip, Mirror-Mode

**Files:**
- Modify: `game.js` — replace `Minigames` placeholder

**Interfaces:**
- Consumes: `transitionTo()`, `GameState`, `AudioEngine`, `STATES`, `COLORS`, `Table.getGreenPortalPos()`
- Produces: `Minigames.start(state)`, `Minigames.draw(ctx, canvas)`, `Minigames.onTap()`, `Minigames.onSwipe(e)`

- [ ] **Step 1: Replace Minigames placeholder**

```js
const Minigames = (() => {
  let active = null;

  // ── Labyrinth ────────────────────────────────────────────────────────────
  const Labyrinth = (() => {
    const COLS = 15, ROWS = 20;
    let maze, playerPos, startTime, swipeStart;

    function generateMaze(cols, rows) {
      const cells = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({ r, c, visited: false, walls: [true, true, true, true] }))
      );
      const stack = [];
      const start = cells[0][0];
      start.visited = true;
      stack.push(start);

      while (stack.length) {
        const cur = stack[stack.length - 1];
        const dirs = [[-1,0,0,2],[0,1,1,3],[1,0,2,0],[0,-1,3,1]];
        const neighbors = dirs
          .map(([dr, dc, wall, opp]) => {
            const nr = cur.r + dr, nc = cur.c + dc;
            return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !cells[nr][nc].visited
              ? { cell: cells[nr][nc], wall, opp } : null;
          })
          .filter(Boolean);

        if (!neighbors.length) { stack.pop(); continue; }
        const { cell, wall, opp } = neighbors[Math.floor(Math.random() * neighbors.length)];
        cur.walls[wall] = false;
        cell.walls[opp] = false;
        cell.visited = true;
        stack.push(cell);
      }
      return cells;
    }

    function start() {
      maze = generateMaze(COLS, ROWS);
      playerPos = { r: 0, c: 0 };
      startTime = Date.now();
      swipeStart = null;

      document.addEventListener('keydown', onKey);
    }

    function onKey(e) {
      if (GameState.current !== STATES.MINIGAME_LABYRINTH) return;
      const moves = {
        ArrowUp: [-1, 0, 0], ArrowRight: [0, 1, 1], ArrowDown: [1, 0, 2], ArrowLeft: [0, -1, 3]
      };
      const m = moves[e.key];
      if (!m) return;
      const [dr, dc, wall] = m;
      const cell = maze[playerPos.r][playerPos.c];
      if (!cell.walls[wall]) {
        playerPos.r += dr;
        playerPos.c += dc;
        checkWin();
      }
    }

    function onSwipe(e) {
      if (!swipeStart) { swipeStart = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }; return; }
      const dx = e.changedTouches[0].clientX - swipeStart.x;
      const dy = e.changedTouches[0].clientY - swipeStart.y;
      swipeStart = null;
      const cell = maze[playerPos.r][playerPos.c];
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && !cell.walls[1]) { playerPos.c++; checkWin(); }
        else if (dx < -20 && !cell.walls[3]) { playerPos.c--; checkWin(); }
      } else {
        if (dy > 20 && !cell.walls[2]) { playerPos.r++; checkWin(); }
        else if (dy < -20 && !cell.walls[0]) { playerPos.r--; checkWin(); }
      }
    }

    function checkWin() {
      if (playerPos.r === ROWS - 1 && playerPos.c === COLS - 1) {
        document.removeEventListener('keydown', onKey);
        GameState.addCoins(3);
        GameState.addScore(500);
        setTimeout(() => transitionTo(STATES.PINBALL), 500);
      }
    }

    function checkTimeout() {
      if (Date.now() - startTime > 30000) {
        document.removeEventListener('keydown', onKey);
        transitionTo(STATES.PINBALL);
      }
    }

    function draw(ctx, canvas) {
      checkTimeout();
      const W = canvas.width, H = canvas.height - 80;
      const cellW = W / COLS, cellH = H / ROWS;

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = COLORS.cyan;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * cellW, y = r * cellH;
          const cell = maze[r][c];
          if (cell.walls[0]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellW, y); ctx.stroke(); }
          if (cell.walls[1]) { ctx.beginPath(); ctx.moveTo(x + cellW, y); ctx.lineTo(x + cellW, y + cellH); ctx.stroke(); }
          if (cell.walls[2]) { ctx.beginPath(); ctx.moveTo(x, y + cellH); ctx.lineTo(x + cellW, y + cellH); ctx.stroke(); }
          if (cell.walls[3]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellH); ctx.stroke(); }
        }
      }

      ctx.shadowBlur = 0;

      // Goal
      const gx = (COLS - 1) * cellW + cellW / 2, gy = (ROWS - 1) * cellH + cellH / 2;
      ctx.beginPath(); ctx.arc(gx, gy, cellW * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.portalGreen; ctx.fill();

      // Player
      const px = playerPos.c * cellW + cellW / 2, py = playerPos.r * cellH + cellH / 2;
      ctx.beginPath(); ctx.arc(px, py, cellW * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.cyan;
      ctx.shadowBlur = 15; ctx.shadowColor = COLORS.cyan;
      ctx.fill(); ctx.shadowBlur = 0;

      // Timer bar
      const elapsed = (Date.now() - startTime) / 30000;
      ctx.fillStyle = elapsed > 0.8 ? COLORS.orange : COLORS.cyan;
      ctx.fillRect(0, H, canvas.width * (1 - elapsed), 6);
    }

    function stop() { document.removeEventListener('keydown', onKey); }

    return { start, draw, onSwipe, stop };
  })();

  // ── Gravity-Flip ──────────────────────────────────────────────────────────
  const Gravity = (() => {
    let ballY, gravDir, checkpoints, passed, startTime, lastFlip, obstacles;

    function start() {
      ballY = 0.5;
      gravDir = 1;
      passed = 0;
      startTime = Date.now();
      lastFlip = Date.now();
      checkpoints = [0.2, 0.35, 0.5, 0.65, 0.8];
      obstacles = Array.from({ length: 8 }, (_, i) => ({
        y: 0.12 + i * 0.11,
        gap: 0.3 + Math.random() * 0.2,
        gapCenter: 0.2 + Math.random() * 0.6,
        x: 0
      }));
    }

    function flip() {
      gravDir *= -1;
      lastFlip = Date.now();
    }

    function onTap() { flip(); }

    function draw(ctx, canvas) {
      const W = canvas.width, H = canvas.height;
      const elapsed = (Date.now() - startTime) / 1000;

      if (elapsed > 20) { transitionTo(STATES.PINBALL); return; }

      // Auto-flip every 3s
      if (Date.now() - lastFlip > 3000) flip();

      // Move ball
      ballY += gravDir * 0.003;
      ballY = Math.max(0.03, Math.min(0.97, ballY));

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

      const scrollOffset = (elapsed * 0.06) % 1;

      // Obstacles
      obstacles.forEach(ob => {
        const screenY = ((ob.y - scrollOffset + 1) % 1) * H;
        const gapY = ob.gapCenter * H;
        const gapH = ob.gap * H;

        ctx.fillStyle = 'rgba(255,0,51,0.3)';
        ctx.strokeStyle = COLORS.portalRed;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8; ctx.shadowColor = COLORS.portalRed;

        // Top block
        ctx.fillRect(0, screenY - H * 0.05, W, Math.max(0, (gapY - gapH / 2) - (screenY - H * 0.05)));
        // Bottom block
        const botY = gapY + gapH / 2;
        ctx.fillRect(0, botY, W, H - botY);
        ctx.shadowBlur = 0;

        // Check collision
        const ballScreenY = ballY * H;
        if (ballScreenY < gapY - gapH / 2 || ballScreenY > gapY + gapH / 2) {
          transitionTo(STATES.PINBALL);
        }
      });

      // Checkpoints
      checkpoints.forEach((cp, i) => {
        if (i < passed) return;
        const cpScreenY = ((cp - scrollOffset + 1) % 1) * H;
        ctx.strokeStyle = COLORS.portalGreen;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10; ctx.shadowColor = COLORS.portalGreen;
        ctx.beginPath(); ctx.moveTo(0, cpScreenY); ctx.lineTo(W, cpScreenY); ctx.stroke();
        ctx.shadowBlur = 0;

        if (Math.abs(ballY - cp) < 0.05) {
          passed++;
          if (passed >= 5) {
            GameState.addEmerald();
            GameState.addScore(800);
            setTimeout(() => transitionTo(STATES.PINBALL), 400);
          }
        }
      });

      // Ball
      const bY = ballY * H;
      ctx.beginPath(); ctx.arc(W / 2, bY, 14, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.cyan;
      ctx.shadowBlur = 20; ctx.shadowColor = COLORS.cyan;
      ctx.fill(); ctx.shadowBlur = 0;

      // Gravity indicator
      ctx.fillStyle = gravDir > 0 ? COLORS.orange : COLORS.magenta;
      ctx.font = 'bold 14px Orbitron, monospace';
      ctx.fillText(gravDir > 0 ? '▼ GRAVITY' : '▲ GRAVITY', 10, 30);

      // Timer
      ctx.fillStyle = COLORS.cyan;
      ctx.fillRect(0, H - 6, W * (1 - elapsed / 20), 6);
    }

    return { start, draw, onTap };
  })();

  // ── Mirror-Mode ────────────────────────────────────────────────────────────
  const Mirror = (() => {
    let bumpers, ball, startTime, bumpersHit;

    function start() {
      const canvas = document.getElementById('gameCanvas');
      const W = canvas.width, H = canvas.height;
      startTime = Date.now();
      bumpersHit = 0;

      bumpers = [
        { x: W * 0.3, y: H * 0.3, r: 20, hit: false },
        { x: W * 0.7, y: H * 0.25, r: 20, hit: false },
        { x: W * 0.5, y: H * 0.45, r: 20, hit: false }
      ];
      ball = { x: W / 2, y: H * 0.7, vx: 3, vy: -4 };

      document.addEventListener('keydown', onKey);
    }

    let leftDown = false, rightDown = false;
    function onKey(e) {
      if (GameState.current !== STATES.MINIGAME_MIRROR) return;
      if (e.key === 'a' || e.key === 'A') rightDown = true; // mirrored
      if (e.key === 'd' || e.key === 'D') leftDown = true;
    }

    function onTouchLeft() { rightDown = true; }
    function onTouchRight() { leftDown = true; }
    function onTouchRelease() { leftDown = false; rightDown = false; }

    function draw(ctx, canvas) {
      const W = canvas.width, H = canvas.height;
      const elapsed = (Date.now() - startTime) / 1000;

      if (elapsed > 25) { stop(); transitionTo(STATES.PINBALL); return; }

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

      // Mirror label
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-W, 0);
      ctx.fillStyle = COLORS.magenta + '22';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.fillStyle = COLORS.magenta;
      ctx.font = 'bold 14px Orbitron, monospace';
      ctx.fillText('MIRROR MODE — CONTROLS INVERTED', 10, 30);

      // Walls
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8; ctx.shadowColor = COLORS.cyan;
      ctx.strokeRect(10, 50, W - 20, H - 100);
      ctx.shadowBlur = 0;

      // Flippers (mirrored positions)
      const fy = H - 70;
      const flipW = W * 0.22;
      const leftActive = leftDown, rightActive = rightDown;

      ctx.fillStyle = COLORS.magenta;
      ctx.shadowBlur = 10; ctx.shadowColor = COLORS.magenta;
      ctx.fillRect(leftActive ? W * 0.2 : W * 0.18, fy, flipW, 10);  // visual only in mini
      ctx.fillRect(rightActive ? W * 0.58 : W * 0.6, fy, flipW, 10);
      ctx.shadowBlur = 0;

      // Ball physics
      ball.vy += 0.25;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < 20) { ball.x = 20; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - 20) { ball.x = W - 20; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < 60) { ball.y = 60; ball.vy = Math.abs(ball.vy); }
      if (ball.y > H - 90) {
        // flipper bounce
        if ((leftActive && ball.x < W / 2) || (rightActive && ball.x >= W / 2)) {
          ball.vy = -Math.abs(ball.vy) * 1.1;
          ball.vx += (leftActive ? -1 : 1) * 2;
        } else {
          ball.y = H * 0.7; ball.vx = 3; ball.vy = -4;
        }
      }

      // Bumpers
      bumpers.forEach(b => {
        if (b.hit) {
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.portalGreen + '44'; ctx.fill();
          return;
        }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.magenta; ctx.lineWidth = 2;
        ctx.shadowBlur = 15; ctx.shadowColor = COLORS.magenta;
        ctx.stroke(); ctx.shadowBlur = 0;

        const dist = Math.hypot(ball.x - b.x, ball.y - b.y);
        if (dist < b.r + 12) {
          b.hit = true;
          bumpersHit++;
          const angle = Math.atan2(ball.y - b.y, ball.x - b.x);
          ball.vx = Math.cos(angle) * 8;
          ball.vy = Math.sin(angle) * 8;
          if (bumpersHit >= 3) {
            stop();
            GameState.addCoins(5);
            GameState.addScore(600);
            GameState.mirrorBonusExpiry = Date.now() + 30000;
            setTimeout(() => transitionTo(STATES.PINBALL), 400);
          }
        }
      });

      // Ball
      ctx.beginPath(); ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.cyan;
      ctx.shadowBlur = 18; ctx.shadowColor = COLORS.cyan;
      ctx.fill(); ctx.shadowBlur = 0;

      // Timer
      ctx.fillStyle = COLORS.magenta;
      ctx.fillRect(0, H - 6, W * (1 - elapsed / 25), 6);
    }

    function stop() {
      document.removeEventListener('keydown', onKey);
      leftDown = false; rightDown = false;
    }

    return { start, draw, onTouchLeft, onTouchRight, onTouchRelease, stop };
  })();

  // ── Public API ────────────────────────────────────────────────────────────
  function start(state) {
    active = state;
    if (state === STATES.MINIGAME_LABYRINTH) Labyrinth.start();
    else if (state === STATES.MINIGAME_GRAVITY) Gravity.start();
    else if (state === STATES.MINIGAME_MIRROR) Mirror.start();
  }

  function draw(ctx, canvas) {
    if (active === STATES.MINIGAME_LABYRINTH) Labyrinth.draw(ctx, canvas);
    else if (active === STATES.MINIGAME_GRAVITY) Gravity.draw(ctx, canvas);
    else if (active === STATES.MINIGAME_MIRROR) Mirror.draw(ctx, canvas);
  }

  function onTap() {
    if (active === STATES.MINIGAME_GRAVITY) Gravity.onTap();
  }

  function onSwipe(e) {
    if (active === STATES.MINIGAME_LABYRINTH) Labyrinth.onSwipe(e);
  }

  function stop() {
    if (active === STATES.MINIGAME_LABYRINTH) Labyrinth.stop();
    if (active === STATES.MINIGAME_MIRROR) Mirror.stop();
    active = null;
  }

  return { start, draw, onTap, onSwipe, stop };
})();
```

- [ ] **Step 2: Update transitionTo() PINBALL case to stop active minigame**

In `transitionTo`, before `Table.generate()`:

```js
case STATES.PINBALL:
  hideOverlay();
  Minigames.stop();
  GameState.reset();
  HUD.update();
  Table.generate();
  Physics.resume();
  break;
```

- [ ] **Step 3: Test — press Play, hit a red portal (or call transitionTo(STATES.MINIGAME_LABYRINTH) in console)**

Open browser console: `transitionTo('MINIGAME_LABYRINTH')` — maze should appear, arrow keys should move the cyan dot.

- [ ] **Step 4: Commit**

```bash
cd /Users/mircomuckenhirn/Documents/portalball.io && git add game.js && git commit -m "feat: mini-games — Labyrinth, Gravity-Flip, Mirror-Mode"
```

---

### Task 7: README + GitHub Actions deploy + GitHub Pages activation

**Files:**
- Create: `README.md`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: Working GitHub Pages deployment at `https://<user>.github.io/portalball.io/`

- [ ] **Step 1: Create README.md**

```markdown
# PortalBall.io

Pinball meets Portal Gun — a browser game with procedural tables, dimensional mini-games, and neon-cyberpunk aesthetics.

## Play

[Live at GitHub Pages](https://mircomuckenhirn.github.io/portalball.io/)

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
```

- [ ] **Step 2: Create .github/workflows/deploy.yml**

```bash
mkdir -p /Users/mircomuckenhirn/Documents/portalball.io/.github/workflows
```

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Commit everything**

```bash
cd /Users/mircomuckenhirn/Documents/portalball.io && git add README.md .github/workflows/deploy.yml && git commit -m "feat: README and GitHub Pages deploy workflow"
```

- [ ] **Step 4: Push to origin**

```bash
cd /Users/mircomuckenhirn/Documents/portalball.io && git push -u origin main
```

- [ ] **Step 5: Enable GitHub Pages via API**

```bash
gh api repos/mircomuckenhirn/portalball.io/pages \
  --method POST \
  -f build_type=workflow \
  -f source[branch]=main \
  -f source[path]=/
```

If that fails (repo may need Pages enabled in settings first):

```bash
gh api repos/mircomuckenhirn/portalball.io/pages \
  --method PUT \
  -f build_type=workflow
```

- [ ] **Step 6: Verify workflow ran**

```bash
gh run list --repo mircomuckenhirn/portalball.io --limit 3
```

Expected: a completed `Deploy to GitHub Pages` run.

---

## Self-Review Checklist

**Spec coverage:**
- [x] Matter.js CDN + local fallback → Task 1
- [x] Flipper A/D + Space + Linksklick → Task 4
- [x] Portal system: blau/grün/rot → Task 5
- [x] Labyrinth (30s, 3 coins) → Task 6
- [x] Gravity-Flip (20s, 1 emerald) → Task 6
- [x] Mirror-Mode (25s, 5 coins + 2× mult) → Task 6
- [x] Bumper + multiplier (1→2→3→5×) → Task 5
- [x] Score, Lives, Highscore localStorage → Task 2
- [x] Coins + Emeralds + localStorage → Task 2 + 5
- [x] Neon-Cyberpunk aesthetic → Task 1
- [x] Mobile touch controls (buttons + half-screen) → Task 4
- [x] AudioEngine 9 sounds → Task 2
- [x] Procedural table per restart → Task 4
- [x] HUD with score/mult/lives/coins/emeralds → Task 2
- [x] GitHub Pages workflow → Task 7
- [x] README → Task 7

**No placeholders found.**

**Type consistency:** All function names used in collision handlers (`Bumpers.onHit`, `Collectibles.collectCoin`, `Portals.onBlueHit`, etc.) match their definitions.
