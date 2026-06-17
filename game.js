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

    // Reset launch state and wire collision events
    Controls.resetLaunch();
    Portals.reset();
    // Clear previous event listeners before re-wiring to avoid stacking on restart
    Matter.Events.off(Physics.getEngine());
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
          Matter.Body.setPosition(data.ball, getBallSpawnPos());
          Matter.Body.setVelocity(data.ball, { x: 0, y: 0 });
        }
      }
    });
  }

  return { generate, getData, getBallSpawnPos, getGreenPortalPos };
})();

const Portals = { drawBlue() {}, reset() {}, onGreenHit() {}, onRedHit() {}, onBlueHit() {}, placeBlue() {} };
const Collectibles = {};
const Bumpers = {};

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

const Minigames = { start() {}, draw() {} };

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
