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
const Controls = { init() {} };
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
