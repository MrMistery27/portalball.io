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

const Table = { generate() {} };
const Portals = { drawBlue() {} };
const Collectibles = {};
const Bumpers = {};
const Flippers = {};
const Minigames = { start() {}, draw() {} };
const Controls = { init() {} };

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
  const pulse = (Bumpers.getPulse && Bumpers.getPulse(body.id)) || 0;
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

// ─── Entry point ──────────────────────────────────────────────────────────────
function startGame() {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  Physics.init(canvas);
  Renderer.init(canvas);
  Renderer.start();
  Controls.init(canvas);

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

// ─── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  function tryStart() {
    if (window._matterLoaded && typeof Matter !== 'undefined') {
      startGame();
    } else {
      setTimeout(tryStart, 50);
    }
  }
  tryStart();
});
