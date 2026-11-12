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
    gravity: 1120,
    accel: 340,
    turboAccel: 560,
    coast: 150,
    drag: 0.08,
    maxSpeed: 720,
    turboSpeed: 980,
    heatSpeed: 400,
    pop: 2.7,
    vyMax: 390,
    vyMin: 150,
    crashAngle: 0.36,
    hardAngle: 0.2,
    cleanAngle: 0.11,
    leanRate: 1.15,
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
  const rain = [];
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

  function initRain() {
    rain.length = 0;
    const count = reduceMotion ? 36 : 110;
    for (let i = 0; i < count; i++) rain.push(makeDrop(true));
  }
  function makeDrop(scatter) {
    return {
      x: Math.random() * (W + 80) - 40,
      y: scatter ? Math.random() * H : -20,
      s: 0.45 + Math.random() * 0.9,
      len: 8 + Math.random() * 16,
      a: 0.12 + Math.random() * 0.28,
    };
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
    const diff = Math.abs(bike.pitch - groundAngle);
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
      if (bike.pitch > 0.11) {
        el.textContent = 'LEAN FWD';
        el.className = 'bad';
      } else if (bike.pitch < -0.11) {
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
      bike.pitch = clamp(bike.pitch, -1.05, 1.15);
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

  function updateRain(dt) {
    const wind = phase === 'play' ? bike.speed * 0.12 : 70;
    for (let i = 0; i < rain.length; i++) {
      const d = rain[i];
      d.y += (380 + d.s * 420) * dt;
      d.x -= wind * dt * d.s;
      if (d.y > H + 10 || d.x < -60) {
        d.x = Math.random() * (W + 80) - 20;
        d.y = -20 - Math.random() * 40;
      }
    }
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
  // Pixel renderer. The game world still runs in CSS pixels; everything is drawn
  // into a low-resolution canvas (about 330-480 art pixels wide) and the browser
  // scales it up with nearest-neighbour filtering for a chunky 16-bit look.
  // All art is procedural, so nothing extra has to be downloaded.
  // ---------------------------------------------------------------------------
  const PAL = {
    ink: '#140c1c', night: '#1b1032', plum: '#2c1a46', dusk: '#4b2a5c', rose: '#8a3a62', ember: '#c75a4a',
    wood0: '#2e170d', wood1: '#5a2f17', wood2: '#8a4f24', wood3: '#c4813e', wood4: '#f0b76a', cream: '#f7e6c4',
    stone0: '#231c2b', stone1: '#3d3347', stone2: '#544660', stone3: '#6e5d78', stone4: '#8f7d98',
    leaf0: '#24432c', leaf1: '#3f7140', leaf2: '#79b04e',
    cyan: '#3de8e0', mag: '#ff3fa4', amber: '#ffc54d', lamp: '#ffe08a', orange: '#ff8c42', rust: '#b5532c',
  };
  const GLYPHS = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', '.': '000000000000010', '-': '000000111000000', ':': '000010000010000', '!': '010010010000010',
  };
  const SHOP_WORDS = ['NOODLE', 'TEA', 'BAO', 'SOBA', 'MOCHI', 'RAMEN', 'CAFE', 'SODA', '24H', 'BYTE', 'SEEDS', 'PIE'];

  let S = 2;
  let LW = 422;
  let LH = 195;
  let art = null;
  let bikeSprites = null;
  const textCache = new Map();

  function q(v) { return Math.round(v / S); }
  function rect(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  function textWidth(s) { return Math.max(0, s.length * 4 - 1); }
  function blitText(g, s, x, y, color) {
    g.fillStyle = color;
    for (let k = 0; k < s.length; k++) {
      const bits = GLYPHS[s[k]];
      if (bits) {
        for (let i = 0; i < 15; i++) if (bits.charCodeAt(i) === 49) g.fillRect(x + (i % 3), y + ((i / 3) | 0), 1, 1);
      }
      x += 4;
    }
  }
  function textSprite(s, color, shadow) {
    const key = s + '|' + color + '|' + (shadow || '');
    let t = textCache.get(key);
    if (t) return t;
    const [c, g] = makeCanvas(textWidth(s) + 1, 6);
    if (shadow) blitText(g, s, 1, 1, shadow);
    blitText(g, s, 0, 0, color);
    textCache.set(key, c);
    return c;
  }
  function drawText(s, x, y, color, shadow, center) {
    const t = textSprite(s, color, shadow);
    ctx.drawImage(t, Math.round(center ? x - (t.width >> 1) : x), Math.round(y));
  }

  // ---------- prerendered backdrop ----------
  function buildSky(hy) {
    const h = hy + 18;
    const [c, g] = makeCanvas(LW, h);
    const bands = [PAL.night, PAL.night, PAL.plum, PAL.dusk, PAL.rose, PAL.ember];
    const n = bands.length - 1;
    for (let y = 0; y < h; y++) {
      const t = Math.pow(y / h, 1.25) * n;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      g.fillStyle = f < 0.5 ? bands[i] : bands[i + 1];
      g.fillRect(0, y, LW, 1);
      if (f > 0.32 && f < 0.68) {
        g.fillStyle = f < 0.5 ? bands[i + 1] : bands[i];
        const step = f > 0.42 && f < 0.58 ? 2 : 4;
        for (let x = (y & 1) * (step >> 1); x < LW; x += step) g.fillRect(x, y, 1, 1);
      }
    }
    const rand = mulberry32(7);
    for (let i = 0; i < LW * 0.18; i++) {
      const x = (rand() * LW) | 0;
      const y = (rand() * hy * 0.62) | 0;
      g.fillStyle = rand() > 0.85 ? PAL.lamp : rand() > 0.5 ? '#c9b8e8' : '#7d6aa0';
      g.fillRect(x, y, 1, 1);
    }
    const twinkles = [];
    for (let i = 0; i < 14; i++) twinkles.push({ x: (rand() * LW) | 0, y: 2 + ((rand() * hy * 0.5) | 0), p: rand() * 6 });
    return { canvas: c, twinkles: twinkles };
  }

  function buildMoon() {
    const [c, g] = makeCanvas(15, 15);
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        const d = Math.hypot(x - 7, y - 7);
        if (d > 6.6) continue;
        g.fillStyle = d > 5.6 ? '#e8b866' : (x + y > 16 ? '#f6d48c' : '#fff0c2');
        g.fillRect(x, y, 1, 1);
      }
    }
    g.fillStyle = '#e2b56e';
    g.fillRect(4, 5, 2, 2);
    g.fillRect(8, 9, 3, 2);
    g.fillRect(9, 4, 1, 1);
    return c;
  }

  function buildFar(hy) {
    const width = 1400;
    const [c, g] = makeCanvas(width, hy + 1);
    const rand = mulberry32(101);
    let x = 0;
    while (x < width) {
      const w = 10 + ((rand() * 20) | 0);
      const h = Math.round(hy * (0.3 + rand() * 0.5));
      const top = hy - h;
      g.fillStyle = '#3a2152';
      g.fillRect(x, top, w, h + 1);
      g.fillStyle = '#46285e';
      g.fillRect(x, top, w, 1);
      if (rand() > 0.6) { g.fillStyle = '#3a2152'; g.fillRect(x + (w >> 1), top - 5, 1, 5); g.fillStyle = PAL.mag; g.fillRect(x + (w >> 1), top - 6, 1, 1); }
      for (let wy = top + 3; wy < hy - 2; wy += 4) {
        for (let wx = x + 2; wx < x + w - 2; wx += 3) {
          const r = rand();
          if (r > 0.86) { g.fillStyle = r > 0.97 ? PAL.mag : r > 0.93 ? '#e0a060' : '#6a3c6e'; g.fillRect(wx, wy, 1, 1); }
        }
      }
      x += w + ((rand() * 3) | 0);
    }
    return { canvas: c, width: width, parallax: 0.1, base: hy + 1 };
  }

  function neonSign(g, word, x, y, color, vertical) {
    if (vertical) {
      const h = word.length * 6 + 3;
      g.globalAlpha = 0.35;
      g.fillStyle = color;
      g.fillRect(x - 1, y - 1, 7, h + 2);
      g.globalAlpha = 1;
      g.fillStyle = PAL.ink;
      g.fillRect(x, y, 5, h);
      g.fillStyle = color;
      g.fillRect(x, y, 5, 1);
      g.fillRect(x, y + h - 1, 5, 1);
      for (let i = 0; i < word.length; i++) blitText(g, word[i], x + 1, y + 2 + i * 6, color);
      return;
    }
    const w = textWidth(word) + 4;
    g.globalAlpha = 0.35;
    g.fillStyle = color;
    g.fillRect(x - 1, y - 1, w + 2, 11);
    g.globalAlpha = 1;
    g.fillStyle = PAL.ink;
    g.fillRect(x, y, w, 9);
    g.fillStyle = color;
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + 8, w, 1);
    blitText(g, word, x + 2, y + 2, color);
  }

  function buildMid(hy) {
    const width = 1800;
    const [c, g] = makeCanvas(width, hy + 1);
    const rand = mulberry32(202);
    const bodies = ['#3a2440', '#4a2a3a', '#3d2c4c', '#52303a', '#43283f'];
    const neon = [PAL.cyan, PAL.mag, PAL.amber];
    let x = 0;
    while (x < width - 30) {
      const w = 16 + ((rand() * 24) | 0);
      const h = Math.round(hy * (0.28 + rand() * 0.6));
      const top = hy - h;
      g.fillStyle = bodies[(rand() * bodies.length) | 0];
      g.fillRect(x, top, w, h + 1);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(x + w - 2, top, 2, h + 1);
      g.fillStyle = '#6a4058';
      g.fillRect(x, top, w, 1);
      g.fillStyle = '#2a1830';
      g.fillRect(x, top + 1, w, 1);
      for (let wy = top + 4; wy < hy - 3; wy += 5) {
        for (let wx = x + 2; wx < x + w - 3; wx += 4) {
          const r = rand();
          let col = '#24162c';
          if (r > 0.55) col = r > 0.95 ? PAL.mag : r > 0.92 ? PAL.cyan : r > 0.74 ? '#ffd27a' : '#ffb347';
          g.fillStyle = col;
          g.fillRect(wx, wy, 2, 2);
          if (r > 0.55 && r <= 0.92) { g.fillStyle = 'rgba(255,200,120,0.18)'; g.fillRect(wx - 1, wy + 2, 4, 1); }
        }
      }
      const roof = rand();
      if (roof < 0.3 && w > 18) {
        const tx = x + 3 + ((rand() * (w - 10)) | 0);
        g.fillStyle = PAL.wood0;
        g.fillRect(tx, top - 3, 1, 3);
        g.fillRect(tx + 5, top - 3, 1, 3);
        g.fillStyle = PAL.wood2;
        g.fillRect(tx, top - 8, 6, 5);
        g.fillStyle = PAL.wood1;
        g.fillRect(tx, top - 6, 6, 1);
        g.fillStyle = PAL.wood3;
        g.fillRect(tx + 1, top - 9, 4, 1);
      } else if (roof < 0.6) {
        for (let k = 0; k < 3; k++) {
          const bx = x + 2 + ((rand() * (w - 5)) | 0);
          g.fillStyle = PAL.leaf1;
          g.fillRect(bx, top - 2, 3, 2);
          g.fillStyle = PAL.leaf2;
          g.fillRect(bx + 1, top - 3, 1, 1);
          if (rand() > 0.6) { g.fillStyle = PAL.mag; g.fillRect(bx, top - 3, 1, 1); }
        }
      } else if (roof < 0.8) {
        const ax = x + 2 + ((rand() * (w - 4)) | 0);
        g.fillStyle = '#5a4466';
        g.fillRect(ax, top - 7, 1, 7);
        g.fillRect(ax - 1, top - 5, 3, 1);
        g.fillStyle = PAL.mag;
        g.fillRect(ax, top - 8, 1, 1);
      }
      if (rand() > 0.62) {
        const word = SIGNS[(rand() * SIGNS.length) | 0];
        const color = neon[(rand() * neon.length) | 0];
        if (rand() > 0.55 && h > word.length * 6 + 10) neonSign(g, word, x + w - 4, top + 4, color, true);
        else if (textWidth(word) + 4 <= w + 10) neonSign(g, word, x + ((w - textWidth(word) - 4) >> 1), top + 3, color, false);
      }
      x += w + ((rand() * 4) | 0);
    }
    return { canvas: c, width: width, parallax: 0.26, base: hy + 1 };
  }

  function buildNear(base) {
    const width = 1600;
    const top = 44;
    const [c, g] = makeCanvas(width, base);
    const rand = mulberry32(303);
    const y0 = base;
    const awnings = [[PAL.mag, PAL.cream], [PAL.cyan, PAL.cream], [PAL.orange, PAL.cream], [PAL.leaf2, PAL.cream]];
    const roofs = [];
    let x = 2;
    function lantern(lx, ly) {
      g.fillStyle = PAL.wood0;
      g.fillRect(lx + 1, ly - 1, 1, 1);
      g.fillStyle = '#e04a3a';
      g.fillRect(lx, ly, 3, 4);
      g.fillStyle = PAL.lamp;
      g.fillRect(lx + 1, ly + 1, 1, 2);
      g.globalAlpha = 0.25;
      g.fillStyle = PAL.orange;
      g.fillRect(lx - 1, ly - 1, 5, 6);
      g.globalAlpha = 1;
    }
    function bush(bx, by) {
      g.fillStyle = PAL.wood2;
      g.fillRect(bx + 1, by - 3, 4, 3);
      g.fillStyle = PAL.wood1;
      g.fillRect(bx + 1, by - 3, 4, 1);
      g.fillStyle = PAL.leaf0;
      g.fillRect(bx, by - 8, 6, 5);
      g.fillStyle = PAL.leaf1;
      g.fillRect(bx + 1, by - 9, 4, 5);
      g.fillStyle = PAL.leaf2;
      g.fillRect(bx + 2, by - 9, 2, 2);
      if (rand() > 0.5) { g.fillStyle = rand() > 0.5 ? PAL.mag : PAL.lamp; g.fillRect(bx + 1, by - 7, 1, 1); g.fillRect(bx + 4, by - 6, 1, 1); }
    }
    while (x < width - 46) {
      const pick = rand();
      if (pick < 0.46) {
        const w = 26 + ((rand() * 16) | 0);
        const h = 20 + ((rand() * 12) | 0);
        const t = y0 - h;
        const plank = rand() > 0.45;
        g.fillStyle = plank ? PAL.wood1 : '#4a2a3a';
        g.fillRect(x, t, w, h);
        g.fillStyle = plank ? PAL.wood0 : '#3a2030';
        for (let ry = t + 2; ry < y0; ry += 3) g.fillRect(x, ry, w, 1);
        g.fillStyle = PAL.wood3;
        g.fillRect(x - 1, t - 1, w + 2, 2);
        const ww = w - 10;
        const wy = y0 - 10;
        g.fillStyle = PAL.wood0;
        g.fillRect(x + 2, wy - 1, ww + 2, 9);
        g.fillStyle = '#ffcf7a';
        g.fillRect(x + 3, wy, ww, 7);
        g.fillStyle = '#ffe9b0';
        g.fillRect(x + 3, wy, ww, 2);
        g.fillStyle = PAL.wood1;
        g.fillRect(x + 3 + (ww >> 1), wy, 1, 7);
        g.fillStyle = 'rgba(60,30,40,0.55)';
        g.fillRect(x + 5 + ((rand() * (ww - 6)) | 0), wy + 3, 2, 4);
        g.fillStyle = PAL.wood0;
        g.fillRect(x + w - 6, y0 - 9, 5, 9);
        g.fillStyle = PAL.wood2;
        g.fillRect(x + w - 5, y0 - 8, 3, 8);
        g.fillStyle = PAL.amber;
        g.fillRect(x + w - 3, y0 - 5, 1, 1);
        const [a, b] = awnings[(rand() * awnings.length) | 0];
        const ay = wy - 6;
        for (let k = 0; k < w + 2; k++) {
          g.fillStyle = ((k / 3) | 0) % 2 ? b : a;
          g.fillRect(x - 1 + k, ay, 1, 4);
          if (k % 2 === 0) g.fillRect(x - 1 + k, ay + 4, 1, 1);
        }
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x - 1, ay + 3, w + 2, 1);
        if (h > 24) {
          g.fillStyle = PAL.wood0;
          g.fillRect(x + 4, t + 3, 6, 5);
          g.fillStyle = rand() > 0.3 ? '#ffd27a' : PAL.mag;
          g.fillRect(x + 5, t + 4, 4, 3);
        }
        const word = SHOP_WORDS[(rand() * SHOP_WORDS.length) | 0];
        if (textWidth(word) + 4 <= w + 4) neonSign(g, word, x + ((w - textWidth(word) - 4) >> 1), t - 11, [PAL.cyan, PAL.mag, PAL.amber][(rand() * 3) | 0], false);
        roofs.push([x, t - 1, x + w, t - 1]);
        x += w + 1;
        if (rand() > 0.4) { bush(x, y0); x += 7; }
      } else if (pick < 0.64) {
        const w = 20;
        g.fillStyle = PAL.wood1;
        g.fillRect(x + 1, y0 - 3, 2, 3);
        g.fillRect(x + w - 3, y0 - 3, 2, 3);
        g.fillStyle = PAL.wood2;
        g.fillRect(x, y0 - 9, w, 6);
        g.fillStyle = PAL.wood3;
        g.fillRect(x, y0 - 9, w, 1);
        g.fillStyle = PAL.wood0;
        g.fillRect(x, y0 - 4, w, 1);
        g.fillStyle = PAL.wood0;
        g.fillRect(x + 1, y0 - 22, 1, 13);
        g.fillRect(x + w - 2, y0 - 22, 1, 13);
        const [a, b] = awnings[(rand() * awnings.length) | 0];
        for (let k = -1; k < w + 1; k++) {
          g.fillStyle = ((k + 1) >> 1) % 2 ? b : a;
          g.fillRect(x + k, y0 - 25, 1, 3);
          if (k % 2 === 0) g.fillRect(x + k, y0 - 22, 1, 1);
        }
        lantern(x + 3, y0 - 20);
        lantern(x + w - 6, y0 - 20);
        g.fillStyle = PAL.stone2;
        g.fillRect(x + 7, y0 - 12, 6, 3);
        g.fillStyle = 'rgba(240,230,220,0.45)';
        g.fillRect(x + 8, y0 - 15, 1, 2);
        g.fillRect(x + 10, y0 - 17, 1, 3);
        g.fillRect(x + 12, y0 - 15, 1, 2);
        x += w + 2;
      } else if (pick < 0.76) {
        g.fillStyle = PAL.stone3;
        g.fillRect(x + 1, y0 - 26, 1, 26);
        g.fillStyle = PAL.stone2;
        g.fillRect(x, y0 - 2, 3, 2);
        g.fillStyle = PAL.ink;
        g.fillRect(x, y0 - 28, 3, 2);
        g.fillStyle = PAL.lamp;
        g.fillRect(x, y0 - 26, 3, 2);
        g.globalAlpha = 0.18;
        g.fillStyle = PAL.lamp;
        g.fillRect(x - 2, y0 - 29, 7, 6);
        g.fillRect(x - 4, y0 - 4, 11, 4);
        g.globalAlpha = 1;
        x += 6;
      } else if (pick < 0.86) {
        g.fillStyle = PAL.ink;
        g.fillRect(x, y0 - 15, 9, 15);
        g.fillStyle = '#1f6f78';
        g.fillRect(x + 1, y0 - 14, 7, 13);
        g.fillStyle = PAL.cyan;
        g.fillRect(x + 1, y0 - 14, 7, 1);
        const cans = [PAL.mag, PAL.amber, PAL.cream, PAL.leaf2];
        for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { g.fillStyle = cans[(r + k) % 4]; g.fillRect(x + 2 + k * 2, y0 - 12 + r * 3, 1, 2); }
        g.fillStyle = PAL.ink;
        g.fillRect(x + 2, y0 - 3, 5, 1);
        x += 11;
      } else {
        bush(x, y0);
        x += 8;
        if (rand() > 0.5) { bush(x, y0); x += 8; }
      }
      x += (rand() * 4) | 0;
    }
    for (let i = 0; i + 1 < roofs.length; i++) {
      const [ax0, ay0, ax1] = roofs[i];
      const [bx0, by0] = roofs[i + 1];
      if (bx0 - ax1 > 60) continue;
      const sx0 = ax1 - 2;
      const sx1 = bx0 + 2;
      const span = sx1 - sx0;
      for (let k = 0; k <= span; k += 3) {
        const t = k / span;
        const yy = Math.round(ay0 + (by0 - ay0) * t + Math.sin(t * Math.PI) * 6) + 1;
        g.fillStyle = PAL.wood0;
        g.fillRect(sx0 + k, yy, 1, 1);
        g.fillStyle = (k / 3) % 3 === 0 ? PAL.mag : (k / 3) % 3 === 1 ? PAL.lamp : PAL.cyan;
        g.fillRect(sx0 + k, yy + 1, 1, 1);
      }
    }
    void top;
    return { canvas: c, width: width, parallax: 0.46, base: base };
  }

  function buildArt() {
    const layout = layoutMetrics();
    const hy = q(layout.horizon);
    const nearBase = q(layout.trackTop - 16) + 2;
    art = {
      hy: hy,
      sky: buildSky(hy),
      moon: art && art.moon ? art.moon : buildMoon(),
      layers: [buildFar(hy), buildMid(hy), buildNear(nearBase)],
      nearBase: nearBase,
    };
  }

  function buildCity() {
    buildArt();
    if (!bikeSprites) bikeSprites = buildBikeSprites();
  }

  // ---------- bike sprite ----------
  function bikeSprite(glow, frame) {
    const SW = 52;
    const SH = 27;
    const OX = 25;
    const OY = 21;
    const grid = new Array(SW * SH).fill(null);
    const set = (x, y, col) => {
      const X = x + OX;
      const Y = y + OY;
      if (X >= 0 && X < SW && Y >= 0 && Y < SH) grid[Y * SW + X] = col;
    };
    const row = (y, x0, x1, col) => { for (let x = x0; x <= x1; x++) set(x, y, col); };
    const pod = '#2a2232';
    row(1, -14, -3, pod); row(2, -13, -4, pod); row(1, 8, 16, pod); row(2, 9, 15, pod);
    row(3, -12, -5, glow); row(3, 10, 14, glow);
    row(-7, 1, 7, PAL.cream);
    row(-6, -3, 12, PAL.cream);
    row(-5, -9, 17, PAL.cream);
    row(-4, -14, 20, PAL.orange);
    row(-3, -16, 22, PAL.orange);
    row(-2, -17, 23, PAL.orange);
    row(-1, -16, 21, '#c4532e');
    row(0, -14, 18, '#6b2a2a');
    row(-3, -12, 18, glow);
    row(-5, -6, -2, '#ffd9a8');
    row(-9, 15, 16, '#9fe2ee'); row(-8, 14, 17, '#9fe2ee'); row(-7, 13, 18, '#7cc6d8'); row(-6, 13, 18, '#7cc6d8');
    set(-17, -5, PAL.mag); set(-18, -5, PAL.mag); set(-18, -6, PAL.mag); set(-19, -6, PAL.mag);
    set(-19, -7, PAL.mag); set(-20, -7, PAL.mag); set(-20, -8, PAL.mag); set(-21, -8, PAL.mag); set(-21, -9, PAL.mag);
    set(23, -3, '#fff2b0'); set(22, -3, '#fff2b0'); set(-16, -3, PAL.mag);
    row(-8, 0, 6, pod); row(-7, 1, 5, pod); set(6, -6, PAL.ink); set(7, -6, PAL.ink);
    const jacket = '#7b3fa0';
    row(-13, 2, 5, jacket); row(-12, 1, 6, jacket); row(-11, 1, 6, jacket); row(-10, 1, 6, jacket); row(-9, 1, 6, jacket);
    set(5, -12, '#a35cc8'); set(5, -11, '#a35cc8'); set(4, -12, '#a35cc8');
    row(-10, 7, 11, jacket); row(-9, 10, 12, jacket); set(13, -9, pod); set(14, -9, pod); set(14, -8, PAL.stone3);
    const helm = '#eef2f6';
    row(-18, 3, 7, helm); row(-17, 2, 8, helm); row(-16, 2, 9, helm); row(-15, 2, 9, helm); row(-14, 3, 8, helm);
    row(-16, 6, 9, glow); row(-15, 7, 9, glow);
    set(4, -17, PAL.mag); set(4, -16, PAL.mag); set(4, -15, PAL.mag);
    if (frame === 0) { row(-13, -2, 1, PAL.mag); row(-12, -5, -2, PAL.mag); set(-6, -11, PAL.mag); set(-7, -11, PAL.mag); }
    else { row(-13, -2, 1, PAL.mag); row(-14, -5, -2, PAL.mag); row(-13, -7, -6, PAL.mag); }
    const out = grid.slice();
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        if (grid[y * SW + x]) continue;
        const n = (x > 0 && grid[y * SW + x - 1]) || (x < SW - 1 && grid[y * SW + x + 1]) ||
          (y > 0 && grid[(y - 1) * SW + x]) || (y < SH - 1 && grid[(y + 1) * SW + x]);
        if (n) out[y * SW + x] = PAL.ink;
      }
    }
    const [c, g] = makeCanvas(SW, SH);
    for (let i = 0; i < out.length; i++) {
      if (!out[i]) continue;
      g.fillStyle = out[i];
      g.fillRect(i % SW, (i / SW) | 0, 1, 1);
    }
    return { canvas: c, ox: OX, oy: OY };
  }
  function buildBikeSprites() {
    const s = {};
    const glows = { cyan: PAL.cyan, amber: PAL.amber, mag: PAL.mag };
    for (const k in glows) for (let f = 0; f < 2; f++) s[k + f] = bikeSprite(glows[k], f);
    return s;
  }

  // ---------- per-frame drawing ----------
  function drawSky(layout) {
    void layout;
    ctx.drawImage(art.sky.canvas, 0, 0);
    for (let i = 0; i < art.sky.twinkles.length; i++) {
      const t = art.sky.twinkles[i];
      const v = Math.sin(time * 2.2 + t.p);
      if (v < 0.2) continue;
      rect(t.x, t.y, 1, 1, v > 0.8 ? '#ffffff' : PAL.lamp);
      if (v > 0.85) { ctx.globalAlpha = 0.6; rect(t.x - 1, t.y, 3, 1, PAL.lamp); rect(t.x, t.y - 1, 1, 3, PAL.lamp); ctx.globalAlpha = 1; }
    }
    const mx = Math.round(LW * 0.8 - (cameraX * 0.004) / S);
    const my = Math.round(art.hy * 0.3);
    ctx.globalAlpha = 0.18;
    rect(mx - 3, my - 3, 21, 21, PAL.lamp);
    ctx.globalAlpha = 1;
    ctx.drawImage(art.moon, mx, my);
  }

  function drawStrip(layer, y) {
    const w = layer.width;
    let off = Math.round((cameraX * layer.parallax) / S) % w;
    if (off < 0) off += w;
    let x = -off;
    while (x < LW) {
      ctx.drawImage(layer.canvas, x, y);
      x += w;
    }
  }

  function drawCity(layout) {
    void layout;
    drawStrip(art.layers[0], 0);
    drawStrip(art.layers[1], 0);
    ctx.globalAlpha = 0.16;
    rect(0, art.hy - 12, LW, 12, PAL.mag);
    ctx.globalAlpha = 1;
    drawStrip(art.layers[2], 0);
  }

  function drawShoulder(layout) {
    const y = q(laneBase(3, layout) + 18);
    if (y >= LH) return;
    rect(0, y, LW, LH - y, PAL.wood1);
    rect(0, y, LW, 2, PAL.leaf2);
    rect(0, y + 2, LW, 2, PAL.leaf1);
    rect(0, y + 4, LW, 1, PAL.leaf0);
    const scroll = Math.round((cameraX * 1.15) / S);
    for (let k = -1; k < LW / 9 + 1; k++) {
      const wx = k + Math.floor(scroll / 9);
      const x = wx * 9 - scroll;
      const n = hash(wx * 13.1);
      rect(x + 2, y - 1, 1, 1, PAL.leaf2);
      if (n > 0.6) rect(x + 5, y - 2, 1, 2, PAL.leaf1);
      if (n > 0.82) rect(x + 5, y - 3, 1, 1, n > 0.92 ? PAL.mag : PAL.lamp);
      if (n < 0.25) rect(x + 1, y + 7 + ((n * 20) | 0) % 6, 2, 1, PAL.wood2);
      if (n > 0.45 && n < 0.5) { ctx.globalAlpha = 0.5; rect(x, y + 6, 6, 1, PAL.cyan); ctx.globalAlpha = 1; }
    }
  }

  function drawDeck(layout) {
    const top = q(layout.trackTop - 16);
    const bot = q(laneBase(3, layout) + 18);
    rect(0, top, LW, bot - top, PAL.wood1);
    const camL = Math.round(cameraX / S);
    let r = 0;
    for (let y = top + 2; y < bot; y += 3, r++) {
      rect(0, y, LW, 1, PAL.wood0);
      const stagger = (r * 11) % 24;
      let sx = -((camL + stagger) % 24);
      if (sx > 0) sx -= 24;
      for (let x = sx; x < LW; x += 24) rect(x, y - 2, 1, 2, PAL.wood0);
    }
    ctx.globalAlpha = 0.35;
    rect(0, top, LW, 1, PAL.wood3);
    ctx.globalAlpha = 1;
  }

  function drawLanes(layout) {
    drawDeck(layout);
    const T = Math.max(4, q(11) + 1);
    const TILE = 16;
    for (let lane = 0; lane < 4; lane++) {
      const baseCss = laneBase(lane, layout);
      const flatY = q(baseCss);
      const edge = lane % 2 ? PAL.mag : PAL.cyan;
      const a = lane % 2 ? '#5d4d68' : PAL.stone2;
      const b = lane % 2 ? PAL.stone2 : '#5d4d68';
      let segStart = 0;
      let segY = null;
      let segTile = null;
      const flush = (c1) => {
        if (segY === null) return;
        const w = c1 - segStart;
        if (w <= 0) return;
        if (segY < flatY) {
          rect(segStart, segY + T, w, flatY - segY, PAL.wood1);
          for (let x = segStart; x < c1; x++) {
            const wx = Math.floor((cameraX + x * S) / 6);
            if (wx % 4 === 0) rect(x, segY + T, 1, flatY - segY, PAL.wood0);
          }
        }
        rect(segStart, segY, w, 1, edge);
        rect(segStart, segY + 1, w, 1, PAL.stone4);
        rect(segStart, segY + 2, w, T - 3, (segTile & 1) ? a : b);
        rect(segStart, segY + T - 1, w, 1, PAL.stone0);
        const tileX = Math.floor((cameraX + segStart * S) / TILE);
        if (tileX * TILE >= cameraX + (segStart - 1) * S) rect(segStart, segY + 2, 1, T - 3, PAL.stone1);
      };
      for (let c = 0; c <= LW; c++) {
        const wx = cameraX + c * S;
        const y = c < LW ? q(baseCss - queryGround(lane, wx).h) : null;
        const tile = Math.floor(wx / TILE);
        if (y !== segY || tile !== segTile) {
          flush(c);
          segStart = c;
          segY = y;
          segTile = tile;
        }
      }
      ctx.globalAlpha = 0.6;
      const mark = Math.floor((cameraX - 24) / 520) * 520;
      for (let x = mark; x < cameraX + W + 48; x += 520) {
        const yy = q(baseCss - queryGround(lane, x).h);
        drawText(String(lane + 1), q(x - cameraX), yy + 2 + ((T - 5) >> 1) - 1, edge, null, false);
      }
      ctx.globalAlpha = 1;
    }
  }

  function chevron(x, y, c) {
    rect(x - 2, y + 1, 1, 1, c);
    rect(x - 1, y, 1, 1, c);
    rect(x, y - 1, 1, 1, c);
    rect(x + 1, y, 1, 1, c);
    rect(x + 2, y + 1, 1, 1, c);
  }

  function drawDebris(h, sx, base) {
    const w = q(h.w);
    const rand = mulberry32(h.x | 0);
    let x = 0;
    while (x < w - 3) {
      const r = rand();
      const X = sx + x;
      if (r < 0.4) {
        rect(X, base - 7, 8, 7, PAL.wood0);
        rect(X + 1, base - 6, 6, 5, PAL.wood2);
        rect(X + 1, base - 6, 6, 1, PAL.wood3);
        rect(X + 3, base - 6, 1, 5, PAL.wood1);
        rect(X + 1, base - 4, 6, 1, PAL.wood1);
        x += 8;
      } else if (r < 0.7) {
        rect(X, base - 8, 6, 8, PAL.ink);
        rect(X + 1, base - 7, 4, 7, PAL.rust);
        rect(X + 1, base - 6, 4, 1, PAL.ink);
        rect(X + 1, base - 3, 4, 1, PAL.ink);
        rect(X + 2, base - 7, 1, 2, PAL.orange);
        x += 6;
      } else {
        rect(X, base - 5, 7, 5, PAL.ink);
        rect(X + 1, base - 4, 5, 4, '#3b4d3a');
        rect(X + 2, base - 4, 2, 1, '#5d7a52');
        rect(X + 3, base - 6, 1, 1, PAL.ink);
        x += 7;
      }
      x += (rand() * 2) | 0;
    }
    if (Math.sin(time * 8) > 0) rect(sx, base - 1, Math.max(2, w), 1, PAL.amber);
  }

  function drawFence(h, sx, base) {
    const w = Math.max(3, q(h.w));
    const tall = h.clear > 200;
    if (tall) {
      const ht = q(86);
      ctx.globalAlpha = 0.14;
      rect(sx, base - ht, w, ht, PAL.mag);
      ctx.globalAlpha = 1;
      const flick = 0.65 + 0.35 * Math.sin(time * 20 + h.x);
      for (let y = base - ht + 3; y < base - 1; y += 4) {
        ctx.globalAlpha = flick;
        rect(sx, y, w, 1, PAL.mag);
        ctx.globalAlpha = flick * 0.35;
        rect(sx, y - 1, w, 1, PAL.mag);
      }
      ctx.globalAlpha = 1;
      rect(sx, base - 2, w, 2, PAL.cyan);
      for (const px of [sx - 2, sx + w - 1]) {
        rect(px, base - ht - 2, 3, ht + 2, PAL.ink);
        rect(px + 1, base - ht - 1, 1, ht + 1, PAL.stone3);
        rect(px, base - ht - 3, 3, 1, Math.sin(time * 6) > 0 ? PAL.mag : PAL.lamp);
      }
      return;
    }
    const ht = q(26);
    for (let x = 0; x < w; x += 4) {
      rect(sx + x, base - ht, 2, ht, PAL.wood0);
      rect(sx + x, base - ht, 1, ht - 1, PAL.wood3);
    }
    rect(sx, base - ht + 3, w, 2, PAL.wood2);
    rect(sx, base - 5, w, 2, PAL.wood2);
    for (let x = 0; x < w; x++) rect(sx + x, base - ht, 1, 2, ((x >> 1) & 1) ? PAL.ink : PAL.amber);
    const on = Math.sin(time * 7) > 0;
    rect(sx - 1, base - ht - 2, 2, 2, on ? PAL.amber : PAL.wood0);
    rect(sx + w - 1, base - ht - 2, 2, 2, on ? PAL.wood0 : PAL.amber);
  }

  function signBoard(text, x, bottom, color) {
    const tw = textWidth(text);
    const w = tw + 6;
    const y = bottom - 9;
    rect(x + 2, bottom, 1, 4, PAL.wood0);
    rect(x - 1, y - 1, w + 2, 11, PAL.wood0);
    rect(x, y, w, 9, PAL.wood2);
    rect(x, y, w, 1, PAL.wood3);
    rect(x, y + 8, w, 1, PAL.wood1);
    drawText(text, x + 3, y + 2, color, PAL.wood0, false);
  }

  function drawDecals(layout) {
    const ramps = track.ramps;
    for (let lane = 0; lane < 4; lane++) {
      const list = ramps[lane];
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (r.x + r.len < cameraX - 20 || r.x > cameraX + W + 20) continue;
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          const x = r.x + r.len * t;
          const hh = r.h * Math.pow(t, r.p);
          chevron(q(x - cameraX), q(laneBase(lane, layout) - hh) + 3, PAL.amber);
        }
      }
    }

    const pads = track.pads;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      const sx = p.x - cameraX;
      if (sx > W || sx + p.len < 0) continue;
      const X = q(sx);
      const y = q(laneBase(p.lane, layout) - queryGround(p.lane, p.x + 8).h);
      ctx.globalAlpha = 0.45 + Math.sin(time * 5 + p.x * 0.01) * 0.2;
      rect(X, y + 1, q(p.len), 3, PAL.cyan);
      ctx.globalAlpha = 1;
      for (let k = 6; k < q(p.len); k += 14) {
        const tw = (Math.sin(time * 6 + k) > 0.3) ? '#ffffff' : '#b8fff8';
        rect(X + k, y + 2, 1, 1, tw);
      }
      drawText('COOL', X + 3, y - 7, PAL.cyan, PAL.ink, false);
    }

    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      const sx = h.x - cameraX;
      if (sx > W + 30 || sx + h.w < -30) continue;
      const base = q(laneBase(h.lane, layout) - queryGround(h.lane, h.x).h) + 1;
      if (h.kind === 'debris') drawDebris(h, q(sx), base);
      else drawFence(h, q(sx), base);
    }

    const hints = track.hints;
    for (let i = 0; i < hints.length; i++) {
      const h = hints[i];
      const sx = h.x - cameraX;
      if (sx < -220 || sx > W + 10) continue;
      signBoard(h.text, q(sx), q(laneBase(1, layout) - queryGround(1, h.x).h - 14), PAL.cream);
    }

    drawGate(360, 'SECTOR 9', PAL.cyan, layout);
    drawGate(FINISH_X, 'FINISH', PAL.mag, layout);

    for (let x = 5000; x < FINISH_X; x += 5000) {
      const sx = x - cameraX;
      if (sx < -40 || sx > W + 20) continue;
      const X = q(sx);
      const yTop = q(layout.horizon) - 2;
      const yBot = q(laneBase(3, layout) + 6);
      ctx.globalAlpha = 0.45;
      for (let y = yTop; y < yBot; y += 3) rect(X, y, 1, 1, PAL.amber);
      ctx.globalAlpha = 1;
      signBoard((x / 10000).toFixed(1) + ' KM', X + 2, yTop + 1, PAL.amber);
    }
  }

  function drawGate(x, label, color, layout) {
    const sx = x - cameraX;
    if (sx < -80 || sx > W + 80) return;
    const X = q(sx);
    const top = q(layout.horizon - 6);
    const bot = q(laneBase(3, layout) + 8);
    const X2 = X + Math.max(8, q(16));
    for (const px of [X - 1, X2 - 1]) {
      rect(px - 1, top, 4, bot - top, PAL.wood0);
      rect(px, top, 2, bot - top, PAL.wood2);
      rect(px + 1, top + 2, 1, bot - top - 4, color);
    }
    const tw = textWidth(label);
    const bw = tw + 8;
    const bx = Math.round((X + X2) / 2 - bw / 2);
    rect(bx - 3, top - 2, bw + 6, 3, PAL.wood0);
    rect(bx - 2, top - 1, bw + 4, 1, PAL.wood3);
    rect(bx - 1, top - 14, bw + 2, 12, PAL.ink);
    rect(bx, top - 13, bw, 10, PAL.wood1);
    ctx.globalAlpha = 0.3;
    rect(bx - 2, top - 15, bw + 4, 14, color);
    ctx.globalAlpha = 1;
    drawText(label, bx + 4, top - 11, color, PAL.ink, false);
    const lx0 = bx - 2;
    const lx1 = bx + bw - 1;
    for (const lx of [lx0, lx1]) {
      rect(lx + 1, top + 1, 1, 2, PAL.wood0);
      rect(lx, top + 3, 3, 4, '#e04a3a');
      rect(lx + 1, top + 4, 1, 2, PAL.lamp);
    }
  }

  function drawBike(x, y, pitch, scale, heat, boosting, alpha) {
    void scale;
    const key = (heat > 0.82 ? 'mag' : heat > 0.45 ? 'amber' : 'cyan') + ((Math.floor(time * 6) & 1));
    const spr = bikeSprites[key];
    const glow = heat > 0.82 ? PAL.mag : heat > 0.45 ? PAL.amber : PAL.cyan;
    const X = q(x);
    const Y = q(y);
    ctx.globalAlpha = alpha * 0.3;
    rect(X - 13, Y + 4, 30, 1, glow);
    ctx.globalAlpha = alpha * 0.15;
    rect(X - 10, Y + 5, 24, 1, glow);
    ctx.globalAlpha = alpha;
    const snap = Math.round(pitch / 0.13) * 0.13;
    ctx.save();
    ctx.translate(X, Y);
    if (snap) ctx.rotate(-snap);
    const bob = Math.sin(time * 9) > 0.6 ? -1 : 0;
    if (boosting || heat > 0.12) {
      const len = boosting ? 5 + ((time * 40) & 3) : 2 + ((time * 30) & 1);
      ctx.fillStyle = boosting ? PAL.mag : PAL.orange;
      ctx.fillRect(-18 - len, -4 + bob, len, 3);
      ctx.fillStyle = PAL.lamp;
      ctx.fillRect(-18 - Math.max(1, len - 2), -3 + bob, Math.max(1, len - 2), 1);
    }
    ctx.drawImage(spr.canvas, -spr.ox, -spr.oy + bob);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawActor(layout, actor, heat, boosting) {
    const lane = actor.lane;
    const laneIdx = clamp(Math.round(lane), 0, 3);
    const sx = actor.x - cameraX;
    const sy = laneBase(lane, layout) - actor.y;
    const g = queryGround(laneIdx, actor.x);
    const shadowY = q(laneBase(laneIdx, layout) - g.h) + 2;
    const sw = Math.max(5, Math.round(12 * (1 - Math.min(0.65, Math.max(0, actor.y - g.h) / 160))));
    const X = q(sx);
    ctx.globalAlpha = 0.5;
    rect(X - sw, shadowY, sw * 2, 2, PAL.ink);
    rect(X - sw + 2, shadowY - 1, sw * 2 - 4, 1, PAL.ink);
    ctx.globalAlpha = 1;
    if (actor.air) {
      const Y = q(sy);
      ctx.globalAlpha = 0.55;
      for (let y = Y + 4; y < shadowY - 1; y += 3) rect(X, y, 1, 1, PAL.cyan);
      ctx.globalAlpha = 1;
      const pred = predict(actor, laneIdx);
      if (pred) {
        const px = q(pred.x - cameraX);
        const py = q(laneBase(pred.lane, layout) - pred.y);
        for (let k = 0; k <= 3; k++) {
          rect(px - 3 + k, py - k, 1, 1, PAL.cyan);
          rect(px + 3 - k, py - k, 1, 1, PAL.cyan);
          rect(px - 3 + k, py + k, 1, 1, PAL.cyan);
          rect(px + 3 - k, py + k, 1, 1, PAL.cyan);
        }
      }
    }
    let alpha = 1;
    if (actor.invuln > 0 && Math.sin(time * 36) > 0) alpha = 0.4;
    if (actor.cleanFlash > 0) alpha = 1;
    drawBike(sx, sy, actor.pitch, 1, heat, boosting, alpha);
  }

  function predict(actor, lane) {
    let x = actor.x;
    let y = actor.y;
    let vy = actor.vy;
    for (let i = 0; i < 32; i++) {
      vy -= TUNE.gravity * 0.05;
      y += vy * 0.05;
      x += actor.speed * 0.05;
      const gh = queryGround(lane, x).h;
      if (vy < 0 && y <= gh) return { x: x, y: gh, lane: lane };
    }
    return null;
  }

  function drawRain(front) {
    ctx.fillStyle = front ? '#b9d8f0' : '#8a7ab0';
    for (let i = 0; i < rain.length; i++) {
      const d = rain[i];
      const isFront = d.s > 0.78;
      if (isFront !== front) continue;
      const x = q(d.x);
      const y = q(d.y);
      const l = Math.max(2, q(d.len));
      ctx.globalAlpha = Math.min(1, d.a * 2.2);
      ctx.fillRect(x, y, 1, l >> 1);
      ctx.fillRect(x - 1, y + (l >> 1), 1, l - (l >> 1));
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(layout) {
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      const sz = p.life / p.max > 0.5 ? 2 : 1;
      rect(q(p.wx - cameraX), q(laneBase(p.lane, layout) - p.wy), sz, sz, p.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawSpeedLines() {
    if (phase !== 'play' || bike.speed < 760) return;
    ctx.globalAlpha = Math.min(0.5, (bike.speed - 760) / 600);
    const y0 = q(70);
    for (let i = 0; i < 8; i++) {
      const y = y0 + ((i * 47 + Math.floor(cameraX / S)) % Math.max(1, (LH * 0.5) | 0));
      rect(Math.round(LW * 0.55), y, 18 + (i % 3) * 8, 1, PAL.cream);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    const layout = layoutMetrics();
    if (!art || art.hy !== q(layout.horizon)) buildArt();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    rect(0, 0, LW, LH, PAL.night);
    if (shake > 0.02) {
      const mag = Math.max(1, Math.round((shake * 8) / S));
      ctx.translate(Math.round((Math.random() - 0.5) * mag), Math.round((Math.random() - 0.5) * mag));
    }

    drawSky(layout);
    drawCity(layout);
    drawRain(false);
    drawLanes(layout);
    drawShoulder(layout);
    drawDecals(layout);

    if (phase === 'title' || phase === 'help') {
      drawActor(layout, {
        x: demo.x,
        y: demo.y,
        lane: demo.lane,
        pitch: demo.pitch,
        air: demo.y > queryGround(1, demo.x).h + 18,
        vy: 0,
        speed: 150,
        invuln: 0,
        cleanFlash: 0,
      }, 0.2, false);
    } else {
      const inp = readInput();
      drawActor(layout, bike, bike.heat, inp.turbo && !bike.overheated && phase === 'play');
      drawParticles(layout);
    }

    drawRain(true);
    drawSpeedLines();

    if (flash > 0) {
      ctx.globalAlpha = Math.min(1, flash * 2.2);
      rect(0, 0, LW, LH, '#d7e7ff');
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
    const deg = (-bike.pitch * 180 / Math.PI).toFixed(2);
    $('horizon-line').style.transform = 'translateY(-50%) rotate(' + deg + 'deg)';
    const attitude = $('attitude');
    const bad = bike.air && Math.abs(bike.pitch) > TUNE.crashAngle * 0.82;
    const good = bike.air && Math.abs(bike.pitch) <= TUNE.cleanAngle;
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
    S = clamp(Math.round(W / 420), 2, 4);
    LW = Math.ceil(W / S);
    LH = Math.ceil(H / S);
    canvas.width = LW;
    canvas.height = LH;
    canvas.style.width = (LW * S) + 'px';
    canvas.style.height = (LH * S) + 'px';
    ctx.imageSmoothingEnabled = false;
    if (art) buildArt();
    portrait = window.matchMedia('(orientation: portrait)').matches || H > W;
    if (rain.length) {
      for (let i = 0; i < rain.length; i++) {
        if (rain[i].x > W) rain[i].x = Math.random() * W;
      }
    }
  }

  function registerSW() {
    const badge = $('offline-badge');
    if (!('serviceWorker' in navigator)) {
      badge.textContent = 'NO SERVICE WORKER';
      return;
    }
    // When an updated worker takes over an already-running copy, reload once so the new files load.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      if (phase === 'play' || phase === 'countdown') return;
      reloaded = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then((reg) => {
      try { reg.update(); } catch (err) { /* ignore */ }
      navigator.serviceWorker.ready.then(() => {
        badge.textContent = 'OFFLINE READY';
        badge.classList.add('on');
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
      updateRain(dt);
      updateParticles(dt);
      const drive = phase === 'play' || phase === 'countdown';
      const inp = readInput();
      const fake = phase === 'countdown' ? rev * 420 : phase === 'title' || phase === 'help' ? 180 : bike.speed;
      audio.tick(fake, inp.turbo && phase === 'play' && !bike.overheated, drive && (inp.throttle || inp.turbo || bike.speed > 40), true);
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
    initRain();
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
