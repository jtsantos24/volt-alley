/* VOLT ALLEY — original hover-bike lane racer.
   All graphics are canvas draws. No external art, fonts, or audio files. */
(function () {
  'use strict';

  const BEST_KEY = 'volt-alley-best';
  const MUTE_KEY = 'volt-alley-mute';
  const HELP_KEY = 'volt-alley-help';
  const FINISH_X = 49200;
  const STEP = 1 / 120;
  const SIGNS = ['NOODLE', 'WETWARE', '24H', 'KILO', 'STATIC', 'ASH CO', 'BYTE', 'RAIN', 'VOLT', 'LOW', 'GRID', 'NITE', 'AMP', 'RADIO', 'SODA'];

  const TUNE = {
    gravity: 760,
    accel: 340,
    turboAccel: 560,
    coast: 150,
    drag: 0.08,
    maxSpeed: 720,
    turboSpeed: 980,
    heatSpeed: 400,
    pop: 3.3,
    vyMax: 410,
    vyMin: 170,
    crashAngle: 0.82,
    hardAngle: 0.48,
    cleanAngle: 0.22,
    leanRate: 9.0,
    laneRate: 5.2,
    penalty: 3,
    heatOn: 0.22,
    heatOff: 0.05,
    heatLock: 0.11,
    heatClear: 0.28,
    launchMin: 200,
  };

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const audio = window.VoltAudio;

  const $ = (id) => document.getElementById(id);
  const canvas = $('view');
  const ctx = canvas.getContext('2d', { alpha: false });

  let W = 844;
  let H = 390;
  let dpr = 1;
  let time = 0;
  let frameDt = 0;
  let accum = 0;
  let fpsSmoothed = 60;
  let cameraX = 0;
  let shake = 0;
  let phase = 'title';
  let helpBack = 'title';
  let seenHelp = false;
  let best = null;
  let portrait = false;

  let laneTarget = 1;
let raceTime = 0;
  let crashes = 0;
  let cleans = 0;
  let topSpeed = 0;
  let rev = 0;
  let countStage = 0;
  let countLeft = 0;
  let goLeft = 0;
  let penaltyFlash = 0;
  let toastUntil = 0;
  let spawnT = 0;
  let flash = 0;
  let nextFlash = 5;

  const bike = {
    x: 520,
    prevX: 520,
    lane: 1,
    y: 0,
    vy: 0,
    pitch: 0,
    speed: 0,
    air: false,
    airTime: 0,
    prevH: 0,
    prevSlope: 0,
    prevLane: 1,
    heat: 0,
    overheated: false,
    invuln: 0,
    crashing: false,
    crashT: 0,
    pastX: 520,
    onPad: false,
    debrisHit: null,
    cleanFlash: 0,
  };

  const demo = { x: 900, y: 12, pitch: 0, lane: 1 };
  const keys = new Set();
  const touch = { throttle: false, turbo: false, up: false, down: false, leanBack: false, leanFwd: false };
  /* rain was removed; the alley is a dry neon dusk */
  const pool = [];
  let track = null;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function kmh(speed) { return Math.round(speed * 0.3); }
  function fmt(t) {
    if (t == null || !isFinite(t)) return '--:--.--';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const cs = Math.floor((t - Math.floor(t)) * 100);
    return m + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
  }
  function hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }
  function loadNum(key) {
    try {
      const v = localStorage.getItem(key);
      if (v == null || v === '') return null;
      const n = Number(v);
      return isFinite(n) ? n : null;
    } catch (err) {
      return null;
    }
  }
  function saveNum(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (err) { /* private mode */ }
  }

  function buildTrack() {
    const ramps = [[], [], [], []];
    const hazards = [];
    const pads = [];
    const hints = [];
    const A = [0, 1, 2, 3];
    function ramp(lanes, x, len, h, p) {
      for (let i = 0; i < lanes.length; i++) ramps[lanes[i]].push({ x: x, len: len, h: h, p: p });
    }
    function fence(lanes, x, w, clear) {
      for (let i = 0; i < lanes.length; i++) hazards.push({ kind: 'fence', lane: lanes[i], x: x, w: w, clear: clear });
    }
    function junk(lanes, x, w) {
      for (let i = 0; i < lanes.length; i++) hazards.push({ kind: 'debris', lane: lanes[i], x: x, w: w, clear: 26 });
    }
    function cool(lanes, x, len) {
      for (let i = 0; i < lanes.length; i++) pads.push({ lane: lanes[i], x: x, len: len });
    }

    ramp(A, 1600, 320, 34, 1.4);
    hints.push({ x: 1280, text: 'EASE IN' });
    ramp(A, 3600, 300, 62, 2.05);
    hints.push({ x: 3180, text: 'LEAN FWD' });
    junk([0, 3], 5200, 120);
    fence([0, 3], 6400, 230, 999);
    hints.push({ x: 5600, text: 'HOLD THE MIDDLE' });
    cool(A, 7800, 820);
    hints.push({ x: 7600, text: 'HEAT DUMP' });
    ramp(A, 9800, 400, 86, 2.35);
    hints.push({ x: 9200, text: 'BIG AIR' });
    ramp(A, 12800, 260, 44, 1.55);
    fence(A, 13220, 140, 28);
    hints.push({ x: 12400, text: 'JUMP' });
    fence([1, 2], 14800, 240, 999);
    hints.push({ x: 14000, text: 'GO WIDE' });
    junk([0], 16200, 110);
    junk([3], 16800, 110);
    ramp(A, 18600, 320, 62, 2.05);
    hints.push({ x: 18000, text: 'LEVEL OUT' });
    fence([0, 1], 21400, 240, 999);
    hints.push({ x: 20400, text: 'DROP DOWN' });
    ramp([2, 3], 23000, 280, 40, 1.5);
    cool(A, 25200, 860);
    ramp(A, 27600, 420, 90, 2.4);
    hints.push({ x: 26800, text: 'COMMIT' });
    fence([0, 1], 31200, 210, 999);
    hints.push({ x: 30200, text: 'SLALOM DOWN' });
    fence([2, 3], 32800, 210, 999);
    hints.push({ x: 32200, text: 'SLALOM UP' });
    ramp(A, 34800, 280, 36, 1.45);
    ramp(A, 36600, 280, 36, 1.45);
    ramp(A, 38600, 320, 62, 2.05);
    cool(A, 41200, 900);
    junk([1, 2], 43200, 120);
    fence([0, 3], 44800, 250, 999);
    hints.push({ x: 43800, text: 'MIDDLE TO THE LINE' });
    ramp(A, 46800, 280, 38, 1.45);

    for (let lane = 0; lane < 4; lane++) ramps[lane].sort((a, b) => a.x - b.x);
    hazards.sort((a, b) => a.x - b.x);
    return { ramps: ramps, hazards: hazards, pads: pads, hints: hints };
  }

  function queryGround(lane, x) {
    const list = track.ramps[lane];
    if (!list) return { h: 0, slope: 0 };
    let h = 0;
    let slope = 0;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (x < r.x) break;
      if (x >= r.x + r.len) continue;
      const t = (x - r.x) / r.len;
      const ht = r.h * Math.pow(t, r.p);
      const sl = t < 0.001 ? 0 : (r.h * r.p * Math.pow(t, r.p - 1)) / r.len;
      if (ht >= h) {
        h = ht;
        slope = sl;
      }
    }
    return { h: h, slope: slope };
  }

function layoutMetrics() {
  const controlH = Math.min(H * 0.4, 172);
  const horizon = Math.round(Math.max(92, Math.min(128, H * 0.3)));
  const deckBottom = H - controlH + 18;
  const trackTop = horizon + 10;
  const laneGap = clamp((deckBottom - trackTop) / 3.05, 30, 52);
  return { horizon: horizon, trackTop: trackTop, laneGap: laneGap };
}
  function laneBase(i, layout) { return layout.trackTop + i * layout.laneGap; }

  function visualHeight(y, layout, lane) {
    const ceiling = 36;
    const maxY = Math.max(0, laneBase(lane, layout) - ceiling);
    if (y <= maxY) return y;
    return maxY + (y - maxY) * 0.4;
  }

  function initPool() {
    pool.length = 0;
    for (let i = 0; i < 80; i++) pool.push({ alive: false });
  }
  function burst(wx, wy, lane, color, n, life) {
    const span = life || 0.4;
    for (let i = 0; i < pool.length && n > 0; i++) {
      const p = pool[i];
      if (p.alive) continue;
      p.alive = true;
      p.wx = wx;
      p.wy = wy;
      p.vx = (Math.random() - 0.5) * 260;
      p.vy = 40 + Math.random() * 160;
      p.life = span * (0.6 + Math.random() * 0.6);
      p.max = p.life;
      p.color = color;
      p.lane = lane;
      n -= 1;
    }
  }

  function readInput() {
    return {
      throttle: touch.throttle || keys.has('Space') || keys.has('KeyD') || keys.has('ArrowRight'),
      turbo: touch.turbo || keys.has('ShiftLeft') || keys.has('ShiftRight'),
      up: touch.up || keys.has('KeyW') || keys.has('ArrowUp'),
      down: touch.down || keys.has('KeyS') || keys.has('ArrowDown'),
      leanBack: touch.leanBack || keys.has('KeyA') || keys.has('ArrowLeft'),
      leanFwd: touch.leanFwd || keys.has('KeyQ') || keys.has('KeyZ'),
    };
  }

function wrapAngle(a) {
  const turn = Math.PI * 2;
  let x = (a + Math.PI) % turn;
  if (x < 0) x += turn;
  return x - Math.PI;
}

function nudgeLane(dir) {
  laneTarget = clamp(Math.round(laneTarget) + dir, 0, 3);
}

function chaseLane(dt) {
  const diff = laneTarget - bike.lane;
  if (Math.abs(diff) < 0.01) {
    bike.lane = laneTarget;
    return;
  }
  const step = TUNE.laneRate * dt;
  bike.lane += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
}

  function launch(slope) {
    const vy = Math.min(TUNE.vyMax, Math.max(TUNE.vyMin, bike.speed * Math.max(0.05, slope) * TUNE.pop));
    bike.air = true;
    bike.vy = vy;
    bike.y = Math.max(bike.y, bike.prevH);
    bike.airTime = 0;
    bike.pitch = Math.atan(clamp(slope, 0, 1.2));
    bike.takeoffPitch = bike.pitch;
    bike.flips = 0;
    audio.jump();
  }

  function startCrash(pastX) {
    if (bike.crashing) return;
    bike.crashing = true;
    bike.crashT = 0;
    bike.pastX = clamp(pastX, 240, FINISH_X - 120);
    bike.speed *= 0.25;
    shake = 1;
    crashes += 1;
    raceTime += TUNE.penalty;
    penaltyFlash = 0.9;
    audio.crash();
    burst(bike.x, bike.y, clamp(Math.round(bike.lane), 0, 3), '#ff2bd6', 14, 0.5);
    toast('+3.0s', 'bad');
  }

  function respawn() {
    bike.crashing = false;
    bike.x = bike.pastX;
    bike.prevX = bike.x;
    const lane = clamp(Math.round(bike.lane), 0, 3);
    const g = queryGround(lane, bike.x);
    bike.y = g.h;
    bike.vy = 0;
    bike.air = false;
    bike.pitch = 0;
    bike.speed = 280;
    bike.prevH = g.h;
    bike.prevSlope = g.slope;
    bike.prevLane = lane;
    bike.airTime = 0;
    bike.invuln = 1.15;
    bike.debrisHit = null;
    cameraX = bike.x - W * 0.3;
  }

  function land(g, lane) {
    const groundAngle = Math.atan(clamp(g.slope, -1.2, 1.2));
    const diff = Math.abs(wrapAngle(bike.pitch - groundAngle));
    bike.air = false;
    bike.vy = 0;
    bike.y = g.h;
    bike.prevH = g.h;
    bike.prevSlope = g.slope;
    bike.prevLane = lane;
    if (diff >= TUNE.crashAngle) {
      startCrash(bike.x + 140);
      return;
    }
    bike.pitch = groundAngle;
    if (diff >= TUNE.hardAngle) {
      const k = (diff - TUNE.hardAngle) / (TUNE.crashAngle - TUNE.hardAngle);
      bike.speed *= 1 - 0.42 * k;
      shake = Math.max(shake, 0.35 + k * 0.45);
      audio.land(true);
      burst(bike.x, g.h, lane, '#ffb020', 8, 0.35);
    } else {
      audio.land(false);
      burst(bike.x, g.h, lane, '#3dffe8', 5, 0.3);
      if (diff <= TUNE.cleanAngle && bike.airTime > 0.28) {
        bike.speed = Math.min(TUNE.turboSpeed, bike.speed + 36);
        cleans += 1;
        bike.cleanFlash = 0.28;
        bike.juice = 1.28;
        toast('CLEAN', 'good');
      }
    }
  }

  function swept(a0, a1, b0, b1) {
    return Math.max(a0, a1) >= b0 && Math.min(a0, a1) <= b1;
  }

  function collide(lane) {
    if (bike.invuln > 0 || bike.crashing) return;
    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.lane !== lane) continue;
      if (h.x > bike.x + 40) break;
      if (!swept(bike.prevX, bike.x, h.x, h.x + h.w)) continue;
      if (bike.y > h.clear) continue;
      if (h.kind === 'debris') {
        if (bike.debrisHit === h) continue;
        bike.debrisHit = h;
        bike.speed *= 0.58;
        shake = Math.max(shake, 0.5);
        audio.land(true);
        burst(bike.x, bike.y, lane, '#ffb020', 8, 0.3);
        toast('SCRAPE', 'bad');
      } else {
        startCrash(h.x + h.w + 80);
        return;
      }
    }
    if (bike.debrisHit) {
      const h = bike.debrisHit;
      if (lane !== h.lane || bike.x > h.x + h.w + 12) bike.debrisHit = null;
    }
  }

  function nearestOpen(x, lane) {
    function blocked(ln) {
      const hazards = track.hazards;
      for (let i = 0; i < hazards.length; i++) {
        const h = hazards[i];
        if (h.kind !== 'fence' || h.clear < 200 || h.lane !== ln) continue;
        if (x >= h.x && x <= h.x + h.w) return true;
      }
      return false;
    }
    if (!blocked(lane)) return lane;
    for (let d = 1; d <= 3; d++) {
      if (lane - d >= 0 && !blocked(lane - d)) return lane - d;
      if (lane + d <= 3 && !blocked(lane + d)) return lane + d;
    }
    return lane;
  }

  function updateCallout() {
    const el = $('callout');
    if (phase !== 'play' || bike.crashing || portrait) {
      el.textContent = '';
      el.className = '';
      return;
    }
    if (toastUntil > performance.now()) {
      el.textContent = '';
      return;
    }
    if (bike.air) {
      const nose = wrapAngle(bike.pitch);
      if (nose > TUNE.cleanAngle) {
        el.textContent = 'LEAN FWD';
        el.className = 'bad';
      } else if (nose < -TUNE.cleanAngle) {
        el.textContent = 'LEAN BACK';
        el.className = 'bad';
      } else if (bike.airTime > 0.12) {
        el.textContent = 'LEVEL';
        el.className = 'good';
      } else {
        el.textContent = '';
      }
      return;
    }
    const lane = clamp(Math.round(bike.lane), 0, 3);
    let text = '';
    let kind = '';
    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.lane !== lane || h.kind !== 'fence') continue;
      if (h.x + h.w < bike.x) continue;
      if (h.x > bike.x + 1200) break;
      if (h.clear < 80) {
        text = 'JUMP';
        kind = 'bad';
      } else {
        const open = nearestOpen(h.x + 8, lane);
        if (open < lane) text = 'LANE UP';
        else if (open > lane) text = 'LANE DOWN';
        kind = 'bad';
      }
      break;
    }
    el.textContent = text;
    el.className = kind;
  }

  function physics(dt) {
    if (bike.crashing) {
      bike.crashT += dt;
      bike.pitch += dt * 8;
      bike.y += dt * 36;
      if (bike.crashT >= 0.82) respawn();
      return;
    }

    const inp = readInput();
    const boosting = inp.turbo && !bike.overheated;
    const thrusting = inp.throttle || boosting;

    if (bike.overheated) {
      bike.heat = Math.max(0, bike.heat - TUNE.heatLock * dt);
      if (bike.heat <= TUNE.heatClear) bike.overheated = false;
    } else if (boosting) {
      bike.heat += TUNE.heatOn * dt;
      if (bike.heat >= 1) {
        bike.heat = 1;
        bike.overheated = true;
        shake = Math.max(shake, 0.55);
        audio.overheat();
        toast('OVERHEAT', 'bad');
      }
    } else {
      bike.heat = Math.max(0, bike.heat - TUNE.heatOff * dt);
    }

    const cap = bike.overheated ? TUNE.heatSpeed : (boosting ? TUNE.turboSpeed : TUNE.maxSpeed);
    if (bike.speed > cap) {
      bike.speed += (cap - bike.speed) * Math.min(1, dt * 4.5);
    } else if (thrusting) {
      const a = (boosting ? TUNE.turboAccel : TUNE.accel) * (bike.air ? 0.45 : 1);
      bike.speed += a * dt;
      if (bike.speed > cap) bike.speed = cap;
    } else {
      bike.speed -= TUNE.coast * dt;
    }
    bike.speed -= bike.speed * TUNE.drag * dt;
    if (bike.speed < 0) bike.speed = 0;
    if (bike.speed > topSpeed) topSpeed = bike.speed;

    chaseLane(dt);
    raceTime += dt;
    bike.prevX = bike.x;
    bike.x += bike.speed * dt;
    if (bike.x < 80) bike.x = 80;

    const lane = clamp(Math.round(bike.lane), 0, 3);
    if (bike.air) {
      if (inp.leanFwd && !inp.leanBack) bike.pitch -= TUNE.leanRate * dt;
      else if (inp.leanBack && !inp.leanFwd) bike.pitch += TUNE.leanRate * dt;
      const spun = Math.floor(Math.abs(bike.pitch - (bike.takeoffPitch || 0)) / (Math.PI * 2));
      if (spun > (bike.flips || 0)) {
        bike.flips = spun;
        bike.juice = 1.34;
        toast('FLIP', 'good');
      }
      bike.vy -= TUNE.gravity * dt;
      bike.y += bike.vy * dt;
      bike.airTime += dt;
      const g = queryGround(lane, bike.x);
      if (bike.airTime > 0.1 && bike.vy <= 0 && bike.y <= g.h) land(g, lane);
    } else {
      const g = queryGround(lane, bike.x);
      const drop = bike.prevH - g.h;
      const lip = drop > 16 && bike.prevH > 16 && bike.speed > TUNE.launchMin;
      if (lip) {
        launch(Math.max(0.08, bike.prevSlope));
      } else {
        bike.y = g.h;
        bike.vy = 0;
        const target = Math.atan(clamp(g.slope, -1.2, 1.2));
        bike.pitch += (target - bike.pitch) * Math.min(1, dt * 12);
        bike.prevH = g.h;
        bike.prevSlope = g.slope;
        bike.prevLane = lane;
      }
    }

    if (bike.invuln > 0) bike.invuln -= dt;
    if (bike.cleanFlash > 0) bike.cleanFlash -= dt;
    if (bike.juice > 1) bike.juice += (1 - bike.juice) * Math.min(1, dt * 8);
    collide(lane);

    let onPad = false;
    if (!bike.crashing) {
      const ground = queryGround(lane, bike.x).h;
      if (bike.y <= ground + 22) {
        const pads = track.pads;
        for (let i = 0; i < pads.length; i++) {
          const p = pads[i];
          if (p.lane === lane && bike.x >= p.x && bike.x <= p.x + p.len) {
            onPad = true;
            break;
          }
        }
      }
    }
    if (onPad) {
      if (!bike.onPad) {
        audio.cool();
        toast('HEAT DUMP', 'good');
      }
      bike.heat = 0;
      bike.overheated = false;
    }
    bike.onPad = onPad;

    spawnT += dt;
    if (spawnT > 0.045 && bike.speed > 160 && !bike.crashing) {
      spawnT = 0;
      burst(bike.x - 24, bike.y + 2, lane, boosting ? '#ff2bd6' : '#ffb020', 1, 0.22);
    }

    if (!bike.crashing && bike.x >= FINISH_X) finishRace();
  }

function updateCountdown(dt) {
  const inp = readInput();
  chaseLane(dt);
    if (inp.throttle || inp.turbo) rev = Math.min(1, rev + dt * 0.42);
    else rev = Math.max(0, rev - dt * 0.65);
    countLeft -= dt;
    if (countLeft > 0) return;
    countStage += 1;
    if (countStage === 1) {
      countLeft = 0.7;
      setCountdown('2');
      audio.beep(false);
    } else if (countStage === 2) {
      countLeft = 0.7;
      setCountdown('1');
      audio.beep(false);
    } else {
      beginPlay();
    }
  }

  function updateDemo(dt) {
    demo.x += dt * 150;
    if (demo.x > FINISH_X + 200) demo.x = 480;
    const g = queryGround(1, demo.x);
    const targetY = g.h + 12 + Math.sin(time * 2.1) * 5;
    demo.y += (targetY - demo.y) * Math.min(1, dt * 3);
    const targetP = Math.atan(clamp(g.slope, -1, 1)) * 0.6;
    demo.pitch += (targetP - demo.pitch) * Math.min(1, dt * 4);
    const targetCam = demo.x - W * 0.64;
    cameraX += (targetCam - cameraX) * Math.min(1, dt * 2.4);
  }

  function updateParticles(dt) {
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.wx += p.vx * dt;
      p.wy += p.vy * dt;
      p.vy -= 280 * dt;
    }
  }

  function toast(text, kind) {
    const el = $('toast');
    el.textContent = text;
    el.className = 'show ' + (kind || '');
    toastUntil = performance.now() + 850;
  }

  // ---------------------------------------------------------------------------
// Cartoon renderer. World units stay CSS pixels. Shapes are smooth, outlined, and flat.
  const PAL = {
    ink: '#120818', night: '#140820', plum: '#3a1460', dusk: '#6a1878', rose: '#e23a78', ember: '#ff7a68',
    wood0: '#0c0616', wood1: '#1a1034', wood2: '#2a1850', wood3: '#5ef6ff', wood4: '#ff8ab8', cream: '#ffe4f4',
    stone0: '#100818', stone1: '#241444', stone2: '#32185a', stone3: '#4a2878', stone4: '#6a4098',
    cyan: '#5ef6ff', mag: '#ff4ad0', amber: '#ffb347', lamp: '#ffe08a', orange: '#ff8c42',
  };

  let art = null;

  function roundPath(x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function paint(fill, strokeW) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = strokeW || 4;
    ctx.strokeStyle = PAL.ink;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function glyph(g, x, y, w, h, color) {
    g.fillStyle = '#160824';
    g.beginPath();
    const r = 4;
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = color;
    const style = (x + y) & 3;
    if (style === 0) {
      g.fillRect(x + 4, y + 4, w - 8, 3);
      g.fillRect(x + 4, y + h - 7, (w >> 1), 3);
    } else if (style === 1) {
      g.beginPath();
      g.arc(x + w * 0.35, y + h * 0.5, 3, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x + w * 0.5, y + 4, w * 0.35, 3);
    } else if (style === 2) {
      g.beginPath();
      g.moveTo(x + 4, y + h - 4);
      g.lineTo(x + w * 0.5, y + 4);
      g.lineTo(x + w - 4, y + h - 4);
      g.fill();
    } else {
      for (let i = 4; i < w - 4; i += 5) g.fillRect(x + i, y + 4 + (i % 6), 3, 3);
    }
  }

  function spire(g, x, ground, w, h, body, edge, rand) {
    const top = ground - h;
    const grd = g.createLinearGradient(x, top, x + w, ground);
    grd.addColorStop(0, edge || '#6a4098');
    grd.addColorStop(0.18, body);
    grd.addColorStop(1, '#100818');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x + w * 0.15, ground);
    g.lineTo(x + w * 0.28, top + h * 0.18);
    g.lineTo(x + w * 0.42, top);
    g.lineTo(x + w * 0.58, top + h * 0.08);
    g.lineTo(x + w * 0.72, top + h * 0.22);
    g.lineTo(x + w * 0.88, ground);
    g.closePath();
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = PAL.ink;
    g.stroke();
    g.strokeStyle = edge || PAL.cyan;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x + w * 0.2, ground - 4);
    g.lineTo(x + w * 0.42, top + 4);
    g.stroke();
    g.fillStyle = PAL.cyan;
    for (let wy = top + 14; wy < ground - 8; wy += 7) {
      for (let k = 0; k < 2; k++) {
        const wx = x + w * (0.38 + k * 0.16);
        if (((wy + k * 3) % 11) < 6) g.fillRect(wx, wy, 2, 2);
      }
    }
    if (rand() > 0.5) {
      const bw = Math.min(w * 0.7, 36);
      const bh = 16;
      glyph(g, x + (w - bw) / 2, top + h * 0.28, bw, bh, rand() > 0.5 ? PAL.mag : (rand() > 0.5 ? PAL.amber : PAL.cyan));
    }
    if (rand() > 0.65) {
      g.fillStyle = '#1a1038';
      g.fillRect(x + w * 0.7, top + 18, 22, 6);
      g.strokeStyle = PAL.cyan;
      g.strokeRect(x + w * 0.7, top + 18, 22, 6);
    }
  }

  function buildLayer(seed, parallax, opt) {
    const width = opt.width;
    const h = opt.ground;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = h + 8;
    const g = c.getContext('2d');
    const rand = mulberry32(seed);
    let x = 0;
    while (x < width - 10) {
      const w = opt.minW + rand() * opt.varW;
      const bh = h * (opt.minH + rand() * opt.varH);
      spire(g, x, h, w, bh, opt.body, opt.edge, rand);
      x += w + opt.gap + rand() * opt.gap;
    }
    return { canvas: c, width: width, parallax: parallax };
  }

  function buildSky(hy) {
    const c = document.createElement('canvas');
    c.width = Math.max(2, W);
    c.height = hy + 30;
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, c.height);
    sky.addColorStop(0, '#1a0830');
    sky.addColorStop(0.35, '#6a1870');
    sky.addColorStop(0.62, '#e23a78');
    sky.addColorStop(0.82, '#ff6a86');
    sky.addColorStop(1, '#ff9a78');
    g.fillStyle = sky;
    g.fillRect(0, 0, c.width, c.height);
    const rand = mulberry32(11);
    const tones = ['#ff4d88', '#ff7aa8', '#e03078', '#ff6a58', '#c45ad4', '#ffb090'];
    for (let i = 0; i < 16; i++) {
      const cx = rand() * c.width;
      const cy = rand() * c.height * 0.85;
      const rx = 28 + rand() * 70;
      const ry = 12 + rand() * 22;
      const grd = g.createRadialGradient(cx, cy, 4, cx, cy, rx);
      grd.addColorStop(0, tones[(rand() * tones.length) | 0]);
      grd.addColorStop(1, 'rgba(255,80,140,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
    return c;
  }

  function buildArt() {
    const layout = layoutMetrics();
    const hy = Math.max(80, layout.horizon);
    art = {
      hy: hy,
      w: W,
      sky: buildSky(hy),
      layers: [
        buildLayer(101, 0.08, { width: 1400, ground: hy, minW: 18, varW: 16, minH: 0.22, varH: 0.28, gap: 10, body: '#6a4a90', edge: null }),
        buildLayer(151, 0.16, { width: 1600, ground: hy, minW: 22, varW: 18, minH: 0.32, varH: 0.3, gap: 8, body: '#3a2468', edge: '#b794f0' }),
        buildLayer(202, 0.3, { width: 1800, ground: hy, minW: 28, varW: 22, minH: 0.4, varH: 0.34, gap: 8, body: '#241448', edge: '#7ae8ff' }),
        buildLayer(303, 0.48, { width: 1600, ground: hy, minW: 34, varW: 26, minH: 0.46, varH: 0.32, gap: 12, body: '#160c30', edge: '#5ef6ff' }),
      ],
    };
  }

  function buildCity() {
    buildArt();
  }

  function drawStrip(layer) {
    const w = layer.width;
    let off = (cameraX * layer.parallax) % w;
    if (off < 0) off += w;
    let x = -off;
    const y = art.hy - layer.canvas.height + 8;
    while (x < W) {
      ctx.drawImage(layer.canvas, x, y);
      x += w;
    }
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a0830');
    g.addColorStop(0.45, '#c42878');
    g.addColorStop(1, '#140820');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(art.sky, 0, 0, W, art.hy + 24);
  }

  function drawCity() {
    for (let i = 0; i < art.layers.length; i++) drawStrip(art.layers[i]);
    const y = art.hy - 2;
    const scroll = cameraX * 0.6;
    const cols = [PAL.cyan, PAL.mag, PAL.amber, '#ff7a9a'];
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 7; i++) {
      const span = W + 80;
      let x = ((i * 90 - scroll) % span + span) % span - 40;
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(x, y - (i % 2) * 3, 18 + (i % 3) * 10, 3);
    }
    ctx.globalAlpha = 1;
  }

  function laneSamples(layout, lane) {
    const pts = [];
    for (let x = cameraX - 30; x <= cameraX + W + 30; x += 12) {
      pts.push({ x: x - cameraX, y: laneBase(lane, layout) - queryGround(lane, x).h });
    }
    return pts;
  }

  function traceRibbon(pts, depth) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y + depth);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y + depth);
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  function drawLanes(layout) {
    const bedTop = layout.trackTop - 8;
    const bed = ctx.createLinearGradient(0, bedTop, 0, H);
    bed.addColorStop(0, '#3a2068');
    bed.addColorStop(0.2, '#241448');
    bed.addColorStop(1, '#100818');
    ctx.fillStyle = bed;
    ctx.fillRect(0, bedTop, W, H - bedTop);
    for (let lane = 3; lane >= 0; lane--) {
      const pts = laneSamples(layout, lane);
      if (pts.length < 2) continue;
      const color = lane % 2 ? PAL.mag : PAL.cyan;
      traceRibbon(pts, 26);
      const shade = ctx.createLinearGradient(0, pts[0].y, 0, pts[0].y + 26);
      shade.addColorStop(0, lane % 2 ? '#5a2878' : '#2a4a78');
      shade.addColorStop(0.35, '#1a1034');
      shade.addColorStop(1, '#100818');
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = PAL.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineWidth = 6;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.stroke();
    }
  }

  function drawShoulder() { /* the lane bed already fills the lower screen */ }

  function drawEnergyWall(h, layout) {
    const lane = h.lane;
    const color = lane % 2 ? PAL.mag : PAL.cyan;
    const pts = laneSamples(layout, lane);
    let roadY = laneBase(lane, layout);
    for (let i = 0; i < pts.length; i++) {
      if (Math.abs((pts[i].x + cameraX) - h.x) < 20) { roadY = pts[i].y; break; }
    }
    const sx = h.x - cameraX;
    const tall = h.clear > 200;
    const slot = Math.max(28, layout.laneGap - 6);
    const wallH = tall ? slot : 18;
    const lead = 240;
    const glow = ctx.createLinearGradient(sx - lead, 0, sx, 0);
    glow.addColorStop(0, 'rgba(0,0,0,0)');
    glow.addColorStop(1, color);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = glow;
    ctx.fillRect(sx - lead, roadY + 4, lead, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(8,4,16,0.55)';
    roundPath(sx - 6, roadY + 8, h.w + 12, 14, 7);
    ctx.fill();
    const body = ctx.createLinearGradient(0, roadY - wallH, 0, roadY + 18);
    body.addColorStop(0, 'rgba(255,255,255,0.2)');
    body.addColorStop(0.2, color);
    body.addColorStop(1, '#100818');
    roundPath(sx, roadY - wallH, h.w, wallH + 18, 8);
    paint(body, 4);
    ctx.fillStyle = PAL.ink;
    ctx.font = '800 16px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(lane + 1), sx + h.w / 2, roadY - wallH * 0.45);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx - 28, roadY + 14);
    ctx.lineTo(sx - 14, roadY + 6);
    ctx.lineTo(sx - 28, roadY - 2);
    ctx.stroke();
  }

  function drawDebris(h, layout) {
    const y = laneBase(h.lane, layout) - queryGround(h.lane, h.x).h;
    const x = h.x - cameraX;
    roundPath(x, y - 16, h.w, 18, 6);
    paint('#3a2858', 3);
    ctx.fillStyle = PAL.amber;
    ctx.beginPath();
    ctx.arc(x + h.w * 0.3, y - 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDecals(layout) {
    for (let lane = 0; lane < 4; lane++) {
      const list = track.ramps[lane];
      ctx.fillStyle = PAL.amber;
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (r.x > cameraX + W + 40 || r.x + r.len < cameraX - 40) continue;
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          const x = r.x + r.len * t - cameraX;
          const y = laneBase(lane, layout) - r.h * Math.pow(t, r.p);
          ctx.beginPath();
          ctx.moveTo(x - 8, y + 8);
          ctx.lineTo(x, y - 2);
          ctx.lineTo(x + 8, y + 8);
          ctx.fill();
        }
      }
    }
    const pads = track.pads;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (p.x > cameraX + W || p.x + p.len < cameraX) continue;
      const y = laneBase(p.lane, layout) - queryGround(p.lane, p.x).h;
      roundPath(p.x - cameraX, y + 2, p.len, 14, 7);
      ctx.fillStyle = 'rgba(94,246,255,0.45)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = PAL.cyan;
      ctx.stroke();
    }
    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.x > cameraX + W + 40 || h.x + h.w < cameraX - 40) continue;
      if (h.kind === 'debris') drawDebris(h, layout);
      else drawEnergyWall(h, layout);
    }
    ctx.font = '800 13px Nunito, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = PAL.cream;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 3;
    for (let i = 0; i < track.hints.length; i++) {
      const h = track.hints[i];
      const x = h.x - cameraX;
      if (x < -160 || x > W) continue;
      const y = laneBase(1, layout) - queryGround(1, h.x).h - 18;
      ctx.strokeText(h.text, x, y);
      ctx.fillText(h.text, x, y);
    }
  }

  function drawBike(x, y, pitch, juice, heat, boosting, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-pitch);
    const s = 1.55 * (juice || 1);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const glow = heat > 0.82 ? PAL.mag : heat > 0.45 ? PAL.amber : PAL.cyan;
    const under = ctx.createRadialGradient(0, 8, 4, 0, 10, 48);
    under.addColorStop(0, glow);
    under.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = under;
    ctx.globalAlpha = alpha * 0.65;
    ctx.beginPath();
    ctx.ellipse(0, 10, 46, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4;
    ctx.strokeStyle = PAL.ink;
    ctx.fillStyle = '#241448';
    ctx.beginPath();
    ctx.ellipse(-22, 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(24, 4, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(-22, 6, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(24, 6, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2068';
    ctx.beginPath();
    ctx.moveTo(-40, 2);
    ctx.lineTo(-18, -16);
    ctx.lineTo(8, -18);
    ctx.lineTo(48, -6);
    ctx.lineTo(52, 4);
    ctx.lineTo(20, 8);
    ctx.lineTo(-28, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAL.amber;
    ctx.fillRect(-6, -10, 28, 5);
    ctx.strokeRect(-6, -10, 28, 5);
    ctx.fillStyle = '#ffe4f4';
    ctx.beginPath();
    ctx.ellipse(6, -28, 16, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a1458';
    ctx.beginPath();
    ctx.ellipse(12, -28, 9, 8, 0.2, -1.2, 1.2);
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(14, -28, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-2, -16);
    ctx.lineTo(2, -18);
    ctx.stroke();
    if (boosting || heat > 0.15) {
      ctx.fillStyle = boosting ? PAL.mag : PAL.orange;
      ctx.beginPath();
      ctx.ellipse(-48, 2, boosting ? 16 : 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawActor(layout, actor, heat, boosting) {
    const lane = actor.lane;
    const laneIdx = clamp(Math.round(lane), 0, 3);
    const gnd = queryGround(laneIdx, actor.x).h;
    const sy = laneBase(lane, layout) - visualHeight(actor.y, layout, lane);
    const sx = actor.x - cameraX;
    const shadowY = laneBase(laneIdx, layout) - gnd + 6;
    const lift = Math.max(0, actor.y - gnd);
    const sw = Math.max(10, 28 - lift * 0.08);
    ctx.fillStyle = 'rgba(8,4,16,0.45)';
    ctx.beginPath();
    ctx.ellipse(sx, shadowY, sw, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (actor.air) {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(94,246,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, shadowY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    let alpha = 1;
    if (actor.invuln > 0 && Math.sin(time * 30) > 0) alpha = 0.45;
    drawBike(sx, sy, actor.pitch, actor.juice || bike.juice || 1, heat, boosting, alpha);
  }

  function drawParticles(layout) {
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      const a = Math.max(0, p.life / p.max);
      const rad = 3 + (1 - a) * 7;
      const x = p.wx - cameraX;
      const y = laneBase(p.lane, layout) - p.wy;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = PAL.ink;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawSpeedLines() {
    if (phase !== 'play' || bike.speed < 760) return;
    ctx.globalAlpha = Math.min(0.35, (bike.speed - 760) / 700);
    ctx.strokeStyle = PAL.cream;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const y = 80 + ((i * 37 + cameraX * 0.2) % (H * 0.45));
      ctx.beginPath();
      ctx.moveTo(W * 0.62, y);
      ctx.lineTo(W * 0.62 + 30 + i * 8, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    const layout = layoutMetrics();
    if (!art || art.hy !== layout.horizon || art.w !== W) buildArt();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.clearRect(0, 0, W, H);
    if (shake > 0.02) {
      const mag = shake * 8;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    drawSky();
    drawCity();
    drawLanes(layout);
    drawDecals(layout);
    if (phase === 'title' || phase === 'help') {
      drawActor(layout, {
        x: demo.x, y: demo.y, lane: demo.lane, pitch: demo.pitch,
        air: demo.y > queryGround(1, demo.x).h + 18,
        vy: 0, speed: 150, invuln: 0, juice: 1,
      }, 0.25, false);
    } else {
      const inp = readInput();
      drawActor(layout, bike, bike.heat, inp.turbo && !bike.overheated && phase === 'play');
      drawParticles(layout);
    }
    drawSpeedLines();
    if (flash > 0) {
      ctx.globalAlpha = Math.min(0.35, flash * 2);
      ctx.fillStyle = '#ffe4f4';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }


  function syncHud() {
    const live = phase === 'play' || phase === 'countdown' || phase === 'pause';
    if (!live) return;
    setText($('time-val'), fmt(raceTime));
    $('time-val').classList.toggle('penalty', penaltyFlash > 0);
    setText($('best-val'), 'BEST ' + fmt(best));
    const shown = phase === 'countdown' ? Math.round(rev * 420) : bike.speed;
    setText($('speed-val'), String(kmh(shown)));
    const heat = $('heat');
    const ratio = bike.overheated ? Math.max(bike.heat, 0.08) : bike.heat;
    $('heat-fill').style.transform = 'scaleX(' + ratio.toFixed(3) + ')';
    heat.classList.toggle('locked', bike.overheated);
    heat.setAttribute('aria-valuenow', String(Math.round(bike.heat * 100)));
    const label = bike.overheated ? 'LOCK' : bike.heat > 0.82 ? 'HOT' : 'HEAT';
    setText($('heat-label'), label);
    $('heat-label').classList.toggle('hot', bike.heat > 0.82 || bike.overheated);
    const lane = clamp(Math.round(bike.lane), 0, 3);
    const pips = $('pips').children;
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', i === lane);
    const nose = wrapAngle(bike.pitch);
    const deg = (-nose * 180 / Math.PI).toFixed(2);
    $('horizon-line').style.transform = 'translateY(-50%) rotate(' + deg + 'deg)';
    const attitude = $('attitude');
    const bad = bike.air && Math.abs(nose) > TUNE.hardAngle;
    const good = bike.air && Math.abs(nose) <= TUNE.cleanAngle;
    attitude.classList.toggle('bad', bad);
    attitude.classList.toggle('good', good);
    const air = phase === 'play' && bike.air && !bike.crashing;
    $('btn-lean-back').classList.toggle('lit', air);
    $('btn-lean-fwd').classList.toggle('lit', air);
    $('btn-turbo').classList.toggle('locked', bike.overheated);
    $('app').classList.toggle('overheat', bike.overheated && phase === 'play');
  }

  function showOnly(name) {
    const ids = ['title', 'help', 'pause', 'results'];
    for (let i = 0; i < ids.length; i++) {
      $('overlay-' + ids[i]).classList.toggle('hidden', ids[i] !== name);
    }
  }

  function applyChrome() {
    const helpOpen = !$('overlay-help').classList.contains('hidden');
    const live = phase === 'play' || phase === 'countdown' || phase === 'pause';
    $('hud').classList.toggle('hidden', !live || helpOpen);
    $('touch').classList.toggle('hidden', !(phase === 'play' || phase === 'countdown') || helpOpen);
    $('btn-pause').classList.toggle('hidden', !(phase === 'play' || phase === 'countdown'));
    if (phase !== 'play') $('app').classList.remove('overheat');
  }

  function setCountdown(text) {
    const el = $('countdown');
    el.textContent = text;
    el.classList.remove('hidden');
  }

  function hideCountdown() {
    $('countdown').classList.add('hidden');
  }

  function resetRace() {
    bike.x = 520;
    bike.prevX = 520;
    bike.lane = 1;
    laneTarget = 1;
    bike.y = 0;
    bike.vy = 0;
    bike.pitch = 0;
    bike.speed = 0;
    bike.air = false;
    bike.airTime = 0;
    bike.prevH = 0;
    bike.prevSlope = 0;
    bike.prevLane = 1;
    bike.heat = 0;
    bike.overheated = false;
    bike.invuln = 0;
    bike.crashing = false;
    bike.crashT = 0;
    bike.onPad = false;
    bike.debrisHit = null;
    bike.cleanFlash = 0;
    bike.juice = 1;
    raceTime = 0;
    crashes = 0;
    cleans = 0;
    topSpeed = 0;
    rev = 0;
    shake = 0;
    penaltyFlash = 0;
    spawnT = 0;
    cameraX = 520 - W * 0.3;
    for (let i = 0; i < pool.length; i++) pool[i].alive = false;
  }

  function startCountdown() {
    resetRace();
    phase = 'countdown';
    countStage = 0;
    countLeft = 0.7;
    goLeft = 0;
    showOnly('');
    applyChrome();
    setCountdown('3');
    audio.beep(false);
    unlockAudio();
  }

  function beginPlay() {
    phase = 'play';
    raceTime = 0;
    bike.speed = rev * 420;
    setCountdown('GO');
    goLeft = 0.48;
    audio.beep(true);
    applyChrome();
  }

  function finishRace() {
    if (phase === 'results') return;
    phase = 'results';
    const record = best == null || raceTime < best;
    if (record) {
      best = raceTime;
      saveNum(BEST_KEY, best);
    }
    setText($('result-kicker'), record ? 'NEW RECORD' : 'SECTOR CLEAR');
    setText($('result-time'), fmt(raceTime));
    setText($('result-best'), fmt(best));
    setText($('result-faults'), String(crashes));
    setText($('result-cleans'), String(cleans));
    setText($('result-top'), String(kmh(topSpeed)));
    setText($('title-best'), 'BEST ' + fmt(best));
    showOnly('results');
    hideCountdown();
    applyChrome();
    audio.finish();
  }

  function openHelp(back) {
    helpBack = back;
    setText($('btn-help-ride'), back === 'pause' ? 'BACK' : 'RIDE');
    showOnly('help');
    if (back !== 'pause') phase = 'help';
    applyChrome();
  }

  function closeHelp() {
    if (helpBack === 'pause') {
      showOnly('pause');
      phase = 'pause';
      applyChrome();
      return;
    }
    phase = 'title';
    showOnly('title');
    applyChrome();
  }

  function onHelpPrimary() {
    uiBlip();
    if (helpBack === 'pause') {
      closeHelp();
      return;
    }
    seenHelp = true;
    try { localStorage.setItem(HELP_KEY, '1'); } catch (err) { /* ignore */ }
    startCountdown();
  }

  function onRide() {
    unlockAudio();
    uiBlip();
    if (!seenHelp) openHelp('start');
    else startCountdown();
  }

  let pausedFrom = 'play';
  function pauseGame() {
    if (phase !== 'play' && phase !== 'countdown') return;
    pausedFrom = phase;
    phase = 'pause';
    showOnly('pause');
    applyChrome();
  }
  function resumeGame() {
    if (phase !== 'pause') return;
    phase = pausedFrom;
    showOnly('');
    if (phase !== 'countdown') hideCountdown();
    else if (goLeft <= 0 && countStage < 3) setCountdown(String(3 - countStage));
    applyChrome();
    audio.resumeCtx();
  }

  function toTitle() {
    phase = 'title';
    pausedFrom = 'play';
    hideCountdown();
    showOnly('title');
    applyChrome();
    setText($('title-best'), 'BEST ' + fmt(best));
    demo.x = Math.max(480, cameraX + W * 0.64);
  }

  function unlockAudio() {
    try { audio.unlock(); } catch (err) { /* ignore */ }
  }

  function uiBlip() {
    try { audio.ui(); } catch (err) { /* ignore */ }
  }

  // Menu buttons: fire on touchend / pointerup (reliable on iOS Safari and the
  // home-screen app, where body has touch-action:none), with click as the fallback
  // for mouse and keyboard. A short global guard stops double-firing.
  const PRESS_GUARD_MS = 450;
  let lastPressAt = -1e9;
  let lastPressEl = null;
  function bindPress(el, fn) {
    if (!el) return;
    const fire = (src) => {
      const now = performance.now();
      // A click right after a handled touch is the iOS ghost click: drop it.
      if (src === 'click' && now - lastPressAt < PRESS_GUARD_MS) return;
      // touchend and pointerup both arrive for one tap: run it once.
      if (src !== 'click' && lastPressEl === el && now - lastPressAt < 300) return;
      if (el.offsetParent === null) return; // hidden
      if (src !== 'click') {
        lastPressAt = now;
        lastPressEl = el;
        try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (err) { /* ignore */ }
      }
      try { fn(); } catch (err) { reportFault(err); }
    };
    const inside = (x, y) => {
      const r = el.getBoundingClientRect();
      const s = 18;
      return x >= r.left - s && x <= r.right + s && y >= r.top - s && y <= r.bottom + s;
    };
    let touchArmed = false;
    let pointerArmed = null;
    el.addEventListener('touchstart', () => {
      touchArmed = true;
      el.classList.add('pressed');
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      el.classList.remove('pressed');
      if (!touchArmed) return;
      touchArmed = false;
      const t = e.changedTouches && e.changedTouches[0];
      if (t && !inside(t.clientX, t.clientY)) return;
      if (e.cancelable) e.preventDefault(); // stops the delayed synthetic click
      fire('touch');
    }, { passive: false });
    el.addEventListener('touchcancel', () => { touchArmed = false; el.classList.remove('pressed'); });
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      pointerArmed = e.pointerId;
      el.classList.add('pressed');
    });
    el.addEventListener('pointerup', (e) => {
      el.classList.remove('pressed');
      if (e.pointerType === 'mouse' || pointerArmed !== e.pointerId) return;
      pointerArmed = null;
      if (!inside(e.clientX, e.clientY)) return;
      fire('pointer');
    });
    el.addEventListener('pointercancel', () => { pointerArmed = null; el.classList.remove('pressed'); });
    el.addEventListener('click', (e) => {
      e.preventDefault();
      fire('click');
    });
  }

  function reportFault(err) {
    try {
      const el = $('boot-error');
      el.hidden = false;
      el.textContent = 'VOLT ALLEY hit a fault: ' + ((err && err.message) || err || 'unknown');
    } catch (e) { /* ignore */ }
  }

  function bindHold(el, flag) {
    const down = (e) => {
      e.preventDefault();
      touch[flag] = true;
      el.classList.add('held');
      if (e.pointerId != null) {
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      unlockAudio();
    };
    const up = () => {
      touch[flag] = false;
      el.classList.remove('held');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function bindTap(el, fn) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.classList.add('held');
      unlockAudio();
      fn();
    });
    const up = () => el.classList.remove('held');
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function bindUi() {
    bindHold($('btn-throttle'), 'throttle');
    bindHold($('btn-turbo'), 'turbo');
    bindTap($('btn-lane-up'), () => nudgeLane(-1));
    bindTap($('btn-lane-down'), () => nudgeLane(1));
    bindHold($('btn-lean-back'), 'leanBack');
    bindHold($('btn-lean-fwd'), 'leanFwd');

    bindPress($('btn-ride'), onRide);
    bindPress($('btn-howto'), () => { unlockAudio(); uiBlip(); openHelp('title'); });
    bindPress($('btn-help-close'), () => { uiBlip(); closeHelp(); });
    bindPress($('btn-help-ride'), onHelpPrimary);
    bindPress($('btn-pause'), () => { uiBlip(); pauseGame(); });
    bindPress($('btn-resume'), () => { uiBlip(); resumeGame(); });
    bindPress($('btn-pause-retry'), () => { uiBlip(); startCountdown(); });
    bindPress($('btn-pause-howto'), () => { uiBlip(); openHelp('pause'); });
    bindPress($('btn-pause-title'), () => { uiBlip(); toTitle(); });
    bindPress($('btn-retry'), () => { uiBlip(); startCountdown(); });
    bindPress($('btn-result-title'), () => { uiBlip(); toTitle(); });
    bindPress($('btn-mute'), () => {
      unlockAudio();
      audio.muted = !audio.muted;
      try { localStorage.setItem(MUTE_KEY, audio.muted ? '1' : '0'); } catch (err) { /* ignore */ }
      syncMute();
      uiBlip();
    });

    // Swallow the synthetic "ghost" click iOS sends right after a touch we already handled,
    // so it can't land on a button that just appeared under the finger.
    document.addEventListener('click', (e) => {
      if (performance.now() - lastPressAt < PRESS_GUARD_MS && e.detail !== 0) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    // iOS only counts touchend / pointerup / click as a user activation for audio.
    document.addEventListener('pointerdown', unlockAudio, { passive: true });
    document.addEventListener('pointerup', unlockAudio, { passive: true });
    document.addEventListener('touchend', unlockAudio, { passive: true });
    document.addEventListener('click', unlockAudio, true);
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
      }
      if (e.repeat && (e.code === 'Enter' || e.code === 'KeyP' || e.code === 'Escape' || e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'ArrowUp' || e.code === 'ArrowDown')) return;
      keys.add(e.code);
      unlockAudio();
      if (!e.repeat && (e.code === 'KeyW' || e.code === 'ArrowUp')) nudgeLane(-1);
      if (!e.repeat && (e.code === 'KeyS' || e.code === 'ArrowDown')) nudgeLane(1);
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (phase === 'pause') resumeGame();
        else pauseGame();
      } else if (e.code === 'Enter') {
        if (phase === 'title') onRide();
        else if (phase === 'help') onHelpPrimary();
        else if (phase === 'pause') resumeGame();
        else if (phase === 'results') startCountdown();
      }
    });
    document.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
    document.addEventListener('touchmove', (e) => {
      // Let the help/pause panels scroll on short screens; block page bounce everywhere else.
      const panel = e.target && e.target.closest ? e.target.closest('.panel') : null;
      if (panel && panel.scrollHeight > panel.clientHeight + 1) return;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (phase === 'play' || phase === 'countdown') pauseGame();
        audio.suspend();
      } else {
        audio.resumeCtx();
      }
    });
    window.addEventListener('pagehide', () => audio.suspend());
    window.addEventListener('pageshow', () => { if (!document.hidden) audio.resumeCtx(); });
  }

  function syncMute() {
    const btn = $('btn-mute');
    btn.textContent = audio.muted ? 'MUTED' : 'SOUND ON';
    btn.classList.toggle('off', !!audio.muted);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, window.innerWidth);
    H = Math.max(240, window.innerHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    if (art) buildArt();
    portrait = window.matchMedia('(orientation: portrait)').matches || H > W;
  }

  function registerSW() {
    const badge = $('offline-badge');
    const markUpdated = () => {
      badge.textContent = 'UPDATED';
      badge.classList.add('on');
    };
    try {
      if (sessionStorage.getItem('volt-alley-updated') === '1' || new URLSearchParams(location.search).get('updated') === '1') {
        sessionStorage.removeItem('volt-alley-updated');
        markUpdated();
        const url = new URL(location.href);
        if (url.searchParams.has('updated')) {
          url.searchParams.delete('updated');
          history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
      }
    } catch (err) { /* private mode */ }
    if (!('serviceWorker' in navigator)) {
      if (badge.textContent !== 'UPDATED') badge.textContent = 'NO SERVICE WORKER';
      return;
    }
    // When an updated worker takes over an already-running copy, reload once so the new files load.
    // Mid-race stays put so a background update cannot wipe a run.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      if (phase === 'play' || phase === 'countdown') return;
      reloaded = true;
      markUpdated();
      try { sessionStorage.setItem('volt-alley-updated', '1'); } catch (err) { /* ignore */ }
      window.location.reload();
    });
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then((reg) => {
      try { reg.update(); } catch (err) { /* ignore */ }
      navigator.serviceWorker.ready.then(() => {
        if (badge.textContent !== 'UPDATED') {
          badge.textContent = 'OFFLINE READY';
          badge.classList.add('on');
        }
      });
    }).catch(() => {
      badge.textContent = 'CACHE FAILED';
    });
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - loop.last) / 1000 || 0);
    loop.last = now;
    frameDt = dt;
    time += dt;
    if (dt > 0) fpsSmoothed = fpsSmoothed * 0.9 + (1 / dt) * 0.1;
    if (shake > 0) shake = Math.max(0, shake - dt * 1.7);
    if (penaltyFlash > 0) penaltyFlash -= dt;
    if (toastUntil && performance.now() > toastUntil) {
      $('toast').className = '';
      toastUntil = 0;
    }
    if (!reduceMotion) {
      nextFlash -= dt;
      if (nextFlash <= 0) {
        flash = 0.08;
        nextFlash = 8 + Math.random() * 9;
      }
      if (flash > 0) flash -= dt;
    }
    if (goLeft > 0) {
      goLeft -= dt;
      if (goLeft <= 0) hideCountdown();
    }

    if (!portrait) {
      if (phase === 'play') {
        accum += dt;
        let guard = 0;
        while (accum >= STEP && guard++ < 8 && phase === 'play') {
          physics(STEP);
          accum -= STEP;
        }
      } else {
        accum = 0;
        if (phase === 'countdown') updateCountdown(dt);
        else if (phase === 'title' || phase === 'help') updateDemo(dt);
      }
      updateParticles(dt);
      const drive = phase === 'play' || phase === 'countdown';
      const inp = readInput();
      const fake = phase === 'countdown' ? rev * 420 : phase === 'title' || phase === 'help' ? 180 : bike.speed;
      audio.tick(fake, inp.turbo && phase === 'play' && !bike.overheated, drive && (inp.throttle || inp.turbo || bike.speed > 40));
      if (phase === 'play' || phase === 'countdown' || phase === 'pause') {
        const anchor = bike.speed > 760 ? 0.26 : 0.3;
        const target = (phase === 'pause' && pausedFrom === 'countdown' ? bike.x : bike.x) - W * anchor;
        if (!(bike.crashing)) cameraX += (target - cameraX) * Math.min(1, dt * 7);
      }
      updateCallout();
    }

    try {
      const inten = phase === 'play' ? Math.min(1, bike.speed / 980 * 0.75 + bike.heat * 0.35) : phase === 'countdown' ? 0.2 : 0;
      audio.scene(phase, inten);
    } catch (err) { /* music is optional */ }

    render();
    syncHud();
    requestAnimationFrame(loop);
  }

  function boot() {
    window.addEventListener('error', (e) => reportFault(e.message || 'unknown'));
    track = buildTrack();
    best = loadNum(BEST_KEY);
    seenHelp = false;
    try { seenHelp = localStorage.getItem(HELP_KEY) === '1'; } catch (err) { seenHelp = false; }
    try {
      if (localStorage.getItem(MUTE_KEY) === '1') audio.muted = true;
    } catch (err) { /* ignore */ }
    setText($('title-best'), 'BEST ' + fmt(best));
    setText($('best-val'), 'BEST ' + fmt(best));
    syncMute();
    initPool();
    resize();
    buildCity();
    cameraX = demo.x - W * 0.64;
    bindUi();
    registerSW();
    window.addEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 60));
    loop.last = performance.now();
    requestAnimationFrame(loop);

    window.__VOLT = {
      get phase() { return phase; },
      get x() { return bike.x; },
      get speed() { return bike.speed; },
      get heat() { return bike.heat; },
      get air() { return bike.air; },
      get pitch() { return bike.pitch; },
      get lane() { return bike.lane; },
      get crashes() { return crashes; },
      get time() { return raceTime; },
      get fps() { return fpsSmoothed; },
      get best() { return best; },
      get overheated() { return bike.overheated; },
      get cleans() { return cleans; },
      get y() { return bike.y; },
    };
  }

  boot();
})();
