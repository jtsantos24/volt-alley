/* VOLT ALLEY — original hover-bike lane racer.
   All graphics are canvas draws. No external art, fonts, or audio files. */
(function () {
  'use strict';

  const BEST_KEY = 'volt-alley-best';
  const MUTE_KEY = 'volt-alley-mute';
  const HELP_KEY = 'volt-alley-help';
  const FINISH_X = 49200;
  const STEP = 1 / 120;
  const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
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
  let layers = [];
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

  function buildCity() {
    layers = [];
    for (let i = 0; i < 3; i++) {
      const rand = mulberry32(100 + i * 17);
      const list = [];
      let x = 0;
      while (x < 5400) {
        const w = 34 + rand() * (i === 2 ? 54 : 86);
        const h = (i === 0 ? 70 : 48) + rand() * (i === 0 ? 80 : 150);
        const sign = i === 1 && rand() > 0.74 ? SIGNS[(rand() * SIGNS.length) | 0] : '';
        list.push({ x: x, w: w, h: h, sign: sign, seed: (rand() * 1000) | 0 });
        x += w + 4 + rand() * (i === 2 ? 8 : 18);
      }
      layers.push({
        list: list,
        width: x,
        parallax: [0.1, 0.26, 0.46][i],
        alpha: [0.5, 0.9, 1][i],
      });
    }
  }

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

  function drawSky(layout) {
    const g = ctx.createLinearGradient(0, 0, 0, layout.horizon + 24);
    g.addColorStop(0, '#07060f');
    g.addColorStop(0.55, '#160818');
    g.addColorStop(1, '#3a1028');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, layout.horizon + 28);
    const mx = W * 0.82 - cameraX * 0.004;
    const my = layout.horizon * 0.42;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.arc(mx, my, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#ff2bd6';
    ctx.beginPath();
    ctx.arc(mx + 6, my + 1, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const fog = ctx.createLinearGradient(0, layout.horizon - 28, 0, layout.horizon + 8);
    fog.addColorStop(0, 'rgba(255,43,214,0)');
    fog.addColorStop(1, 'rgba(255,43,214,0.14)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, layout.horizon - 28, W, 36);
  }

  function drawCity(layout) {
    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      const par = cameraX * layer.parallax;
      const base = layout.horizon + 1;
      const color = li === 0 ? '#140a18' : li === 1 ? '#120c16' : '#09070e';
      ctx.globalAlpha = layer.alpha;
      const tile0 = Math.floor(par / layer.width) - 1;
      for (let tile = tile0; tile <= tile0 + 2; tile++) {
        const origin = tile * layer.width - par;
        const list = layer.list;
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          const sx = origin + b.x;
          if (sx > W + 8 || sx + b.w < -8) continue;
          const bh = b.h;
          ctx.fillStyle = color;
          ctx.fillRect(sx, base - bh, b.w, bh);
          if (li === 1) {
            const cols = Math.max(1, (b.w / 8) | 0);
            const rows = Math.max(1, (bh / 11) | 0);
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                const n = hash(b.seed + r * 19 + c * 7);
                if (n < 0.52) continue;
                ctx.fillStyle = n > 0.86 ? '#ffb020' : n > 0.74 ? '#ff2bd6' : 'rgba(190,220,255,0.32)';
                ctx.fillRect(sx + 3 + c * 8, base - bh + 4 + r * 11, 2, 3);
              }
            }
            if (b.sign) {
              const signColor = b.seed % 3 === 0 ? '#3dffe8' : b.seed % 3 === 1 ? '#ff2bd6' : '#ffb020';
              ctx.fillStyle = 'rgba(0,0,0,0.55)';
              ctx.fillRect(sx + 4, base - bh - 16, Math.min(b.w - 8, 54), 14);
              ctx.fillStyle = signColor;
              ctx.font = '700 11px ' + FONT;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(b.sign, sx + b.w * 0.5, base - bh - 3);
            }
          } else if (li === 2 && bh > 70) {
            ctx.fillStyle = '#07060c';
            ctx.fillRect(sx + b.w * 0.45, base - bh - 18, 2, 18);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawShoulder(layout) {
    const y = laneBase(3, layout) + 10;
    if (y >= H) return;
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, '#101018');
    g.addColorStop(1, '#07060c');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, H - y);
    ctx.strokeStyle = 'rgba(61,255,232,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const scroll = ((cameraX * 1.15) % 52 + 52) % 52;
    for (let x = -scroll; x < W; x += 52) {
      ctx.moveTo(x, y + 16);
      ctx.lineTo(x + 22, y + 16);
    }
    ctx.stroke();
  }

  function drawLanes(layout) {
    const x0 = cameraX - 24;
    const x1 = cameraX + W + 48;
    const deckTop = layout.trackTop - 16;
    const deckBot = laneBase(3, layout) + 18;
    ctx.fillStyle = '#0c0e16';
    ctx.fillRect(0, deckTop, W, Math.max(20, deckBot - deckTop));

    for (let lane = 0; lane < 4; lane++) {
      const samples = [];
      for (let x = x0; x <= x1; x += 16) {
        samples.push({
          x: x - cameraX,
          y: laneBase(lane, layout) - queryGround(lane, x).h,
        });
      }
      if (samples.length < 2) continue;
      const thick = 11;
      ctx.beginPath();
      ctx.moveTo(samples[0].x, samples[0].y);
      for (let i = 1; i < samples.length; i++) ctx.lineTo(samples[i].x, samples[i].y);
      for (let i = samples.length - 1; i >= 0; i--) ctx.lineTo(samples[i].x, samples[i].y + thick);
      ctx.closePath();
      ctx.fillStyle = lane % 2 ? '#17141e' : '#141824';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = lane % 2 ? 'rgba(255,43,214,0.72)' : 'rgba(61,255,232,0.72)';
      ctx.stroke();

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      const stainStart = Math.floor(x0 / 130) * 130;
      for (let x = stainStart; x < x1; x += 130) {
        const n = hash(lane * 80 + x * 0.05);
        if (n < 0.55) continue;
        const y = laneBase(lane, layout) - queryGround(lane, x).h;
        ctx.beginPath();
        ctx.ellipse(x - cameraX, y + 4, 7 + n * 12, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = lane % 2 ? 'rgba(255,43,214,0.55)' : 'rgba(61,255,232,0.55)';
      ctx.font = '700 11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const mark = Math.floor(x0 / 520) * 520;
      for (let x = mark; x < x1; x += 520) {
        const y = laneBase(lane, layout) - queryGround(lane, x).h;
        ctx.fillText(String(lane + 1), x - cameraX, y - 3);
      }
    }
  }

  function drawDecals(layout) {
    const ramps = track.ramps;
    ctx.strokeStyle = 'rgba(255,176,32,0.75)';
    ctx.lineWidth = 1.5;
    for (let lane = 0; lane < 4; lane++) {
      const list = ramps[lane];
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (r.x + r.len < cameraX - 20 || r.x > cameraX + W + 20) continue;
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          const x = r.x + r.len * t;
          const h = r.h * Math.pow(t, r.p);
          const sx = x - cameraX;
          const sy = laneBase(lane, layout) - h;
          ctx.beginPath();
          ctx.moveTo(sx - 7, sy + 5);
          ctx.lineTo(sx, sy - 3);
          ctx.lineTo(sx + 7, sy + 5);
          ctx.stroke();
        }
      }
    }

    const pads = track.pads;
    ctx.font = '700 10px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      const sx = p.x - cameraX;
      if (sx > W || sx + p.len < 0) continue;
      const y = laneBase(p.lane, layout) - queryGround(p.lane, p.x + 8).h;
      ctx.globalAlpha = 0.28 + Math.sin(time * 5 + p.x * 0.01) * 0.1;
      ctx.fillStyle = '#3dffe8';
      ctx.fillRect(sx, y - 4, p.len, 5);
      ctx.globalAlpha = 0.9;
      ctx.fillText('COOL', sx + 6, y - 6);
      ctx.globalAlpha = 1;
    }

    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      const sx = h.x - cameraX;
      if (sx > W + 30 || sx + h.w < -30) continue;
      const base = laneBase(h.lane, layout) - queryGround(h.lane, h.x).h;
      if (h.kind === 'debris') {
        ctx.fillStyle = '#2a241c';
        ctx.strokeStyle = '#ffb020';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx, base);
        ctx.lineTo(sx + h.w * 0.22, base - 9);
        ctx.lineTo(sx + h.w * 0.48, base - 3);
        ctx.lineTo(sx + h.w * 0.72, base - 12);
        ctx.lineTo(sx + h.w, base - 1);
        ctx.lineTo(sx + h.w, base);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const tall = h.clear > 200;
        const top = base - (tall ? 86 : 26);
        const grd = ctx.createLinearGradient(0, top, 0, base);
        if (tall) {
          grd.addColorStop(0, 'rgba(255,43,214,0.02)');
          grd.addColorStop(0.35, 'rgba(255,43,214,0.18)');
          grd.addColorStop(1, 'rgba(61,255,232,0.55)');
        } else {
          grd.addColorStop(0, 'rgba(255,176,32,0.05)');
          grd.addColorStop(1, 'rgba(255,176,32,0.75)');
        }
        ctx.fillStyle = grd;
        ctx.fillRect(sx, top, h.w, base - top);
        ctx.strokeStyle = tall ? 'rgba(255,43,214,0.85)' : 'rgba(255,176,32,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 0.5, top + 0.5, h.w - 1, base - top - 1);
      }
    }

    ctx.fillStyle = 'rgba(255,176,32,0.88)';
    ctx.font = '700 13px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const hints = track.hints;
    for (let i = 0; i < hints.length; i++) {
      const h = hints[i];
      const sx = h.x - cameraX;
      if (sx < -180 || sx > W + 10) continue;
      ctx.fillText(h.text, sx, laneBase(1, layout) - queryGround(1, h.x).h - 16);
    }

    drawGate(360, 'SECTOR 9', '#3dffe8', layout);
    drawGate(FINISH_X, 'FINISH', '#ff2bd6', layout);

    ctx.fillStyle = 'rgba(255,176,32,0.55)';
    ctx.font = '700 11px ' + FONT;
    for (let x = 5000; x < FINISH_X; x += 5000) {
      const sx = x - cameraX;
      if (sx < -20 || sx > W + 20) continue;
      ctx.strokeStyle = 'rgba(255,176,32,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, laneBase(3, layout) + 6);
      ctx.lineTo(sx, layout.horizon - 6);
      ctx.stroke();
      ctx.fillText((x / 10000).toFixed(1) + ' KM', sx + 6, layout.horizon + 12);
    }
  }

  function drawGate(x, label, color, layout) {
    const sx = x - cameraX;
    if (sx < -40 || sx > W + 40) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, laneBase(3, layout) + 8);
    ctx.lineTo(sx, layout.horizon - 6);
    ctx.moveTo(sx + 16, laneBase(3, layout) + 8);
    ctx.lineTo(sx + 16, layout.horizon - 6);
    ctx.moveTo(sx, layout.horizon - 6);
    ctx.lineTo(sx + 16, layout.horizon - 6);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '700 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, sx + 8, layout.horizon - 10);
  }

  function drawBike(x, y, pitch, scale, heat, boosting, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-pitch);
    ctx.scale(scale, scale);
    const glow = heat > 0.82 ? '#ff2bd6' : heat > 0.45 ? '#ffb020' : '#3dffe8';

    const grd = ctx.createRadialGradient(4, 2, 2, 4, 4, 48);
    grd.addColorStop(0, glow);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(4, 4, 44, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;

    ctx.lineWidth = 2;
    ctx.strokeStyle = glow;
    ctx.fillStyle = '#0a0c12';
    ctx.beginPath();
    ctx.ellipse(-16, 1, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(24, 1, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2a3348';
    ctx.beginPath();
    ctx.moveTo(-38, -1);
    ctx.lineTo(-26, -13);
    ctx.lineTo(-4, -15);
    ctx.lineTo(14, -17);
    ctx.lineTo(46, -7);
    ctx.lineTo(50, -1);
    ctx.lineTo(22, 4);
    ctx.lineTo(-30, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffb020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(22, -6);
    ctx.stroke();

    ctx.fillStyle = '#ff2bd6';
    ctx.beginPath();
    ctx.moveTo(-26, -12);
    ctx.lineTo(-44, -28);
    ctx.lineTo(-20, -10);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = glow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, -15);
    ctx.lineTo(6, -28);
    ctx.lineTo(22, -26);
    ctx.lineTo(24, -14);
    ctx.stroke();

    ctx.fillStyle = '#e8eef6';
    ctx.beginPath();
    ctx.moveTo(-1, -13);
    ctx.lineTo(3, -23);
    ctx.lineTo(16, -24);
    ctx.lineTo(26, -15);
    ctx.lineTo(18, -12);
    ctx.lineTo(6, -12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#12151c';
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(14, -30, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff2bd6';
    ctx.beginPath();
    ctx.ellipse(17, -30, 4.2, 2.6, 0.3, -1.1, 1.15);
    ctx.fill();

    if (boosting || heat > 0.12) {
      ctx.globalAlpha = alpha * (0.4 + Math.sin(time * 30) * 0.18);
      ctx.fillStyle = boosting ? '#ff2bd6' : '#ffb020';
      ctx.beginPath();
      ctx.ellipse(-46, 0, boosting ? 16 : 9, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawActor(layout, actor, heat, boosting) {
    const lane = actor.lane;
    const laneIdx = clamp(Math.round(lane), 0, 3);
    const scale = 0.96 + (laneIdx / 3) * 0.16;
    const sx = actor.x - cameraX;
    const sy = laneBase(lane, layout) - actor.y;
    const g = queryGround(laneIdx, actor.x);
    const shadowY = laneBase(laneIdx, layout) - g.h;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    const sw = 22 * (1 - Math.min(0.65, Math.max(0, actor.y - g.h) / 160));
    ctx.ellipse(sx, shadowY + 2, Math.max(8, sw), 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (actor.air) {
      ctx.strokeStyle = 'rgba(61,255,232,0.35)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, shadowY);
      ctx.stroke();
      ctx.setLineDash([]);
      const pred = predict(actor, laneIdx);
      if (pred) {
        const px = pred.x - cameraX;
        const py = laneBase(pred.lane, layout) - pred.y;
        ctx.strokeStyle = '#3dffe8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py - 10);
        ctx.lineTo(px + 7, py);
        ctx.lineTo(px, py + 6);
        ctx.lineTo(px - 7, py);
        ctx.closePath();
        ctx.stroke();
      }
    }
    let alpha = 1;
    if (actor.invuln > 0 && Math.sin(time * 36) > 0) alpha = 0.4;
    if (actor.cleanFlash > 0) alpha = 1;
    drawBike(sx, sy, actor.pitch, scale, heat, boosting, alpha);
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
    ctx.lineWidth = 1;
    for (let i = 0; i < rain.length; i++) {
      const d = rain[i];
      const isFront = d.s > 0.78;
      if (isFront !== front) continue;
      ctx.strokeStyle = 'rgba(180,220,230,' + d.a + ')';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 6 * d.s, d.y + d.len);
      ctx.stroke();
    }
  }

  function drawParticles(layout) {
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      const x = p.wx - cameraX;
      const y = laneBase(p.lane, layout) - p.wy;
      ctx.fillRect(x, y, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
  }

  function drawSpeedLines() {
    if (phase !== 'play' || bike.speed < 760) return;
    const a = Math.min(0.28, (bike.speed - 760) / 900);
    ctx.strokeStyle = 'rgba(180,255,250,' + a + ')';
    ctx.lineWidth = 1;
    const y0 = 70;
    for (let i = 0; i < 8; i++) {
      const y = y0 + ((i * 97 + Math.floor(cameraX)) % (H * 0.5));
      ctx.beginPath();
      ctx.moveTo(W * 0.55, y);
      ctx.lineTo(W * 0.55 + 40 + (i % 3) * 16, y);
      ctx.stroke();
    }
  }

  function render() {
    const layout = layoutMetrics();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (shake > 0.02) {
      const mag = shake * 8;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    drawSky(layout);
    drawCity(layout);
    drawRain(false);
    drawShoulder(layout);
    drawLanes(layout);
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
      ctx.globalAlpha = flash * 2.2;
      ctx.fillStyle = '#d7e7ff';
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
    audio.ui();
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
    audio.ui();
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

    $('btn-ride').addEventListener('click', onRide);
    $('btn-howto').addEventListener('click', () => { unlockAudio(); audio.ui(); openHelp('title'); });
    $('btn-help-close').addEventListener('click', () => { audio.ui(); closeHelp(); });
    $('btn-help-ride').addEventListener('click', onHelpPrimary);
    $('btn-pause').addEventListener('click', () => { audio.ui(); pauseGame(); });
    $('btn-resume').addEventListener('click', () => { audio.ui(); resumeGame(); });
    $('btn-pause-retry').addEventListener('click', () => { audio.ui(); startCountdown(); });
    $('btn-pause-howto').addEventListener('click', () => { audio.ui(); openHelp('pause'); });
    $('btn-pause-title').addEventListener('click', () => { audio.ui(); toTitle(); });
    $('btn-retry').addEventListener('click', () => { audio.ui(); startCountdown(); });
    $('btn-result-title').addEventListener('click', () => { audio.ui(); toTitle(); });
    $('btn-mute').addEventListener('click', () => {
      unlockAudio();
      audio.muted = !audio.muted;
      try { localStorage.setItem(MUTE_KEY, audio.muted ? '1' : '0'); } catch (err) { /* ignore */ }
      syncMute();
      audio.ui();
    });

    document.addEventListener('pointerdown', unlockAudio);
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
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (phase === 'play' || phase === 'countdown') pauseGame();
        audio.suspend();
      }
    });
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
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(() => {
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

    render();
    syncHud();
    requestAnimationFrame(loop);
  }

  function boot() {
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
    window.addEventListener('error', (e) => {
      const el = $('boot-error');
      el.hidden = false;
      el.textContent = 'VOLT ALLEY hit a fault: ' + (e.message || 'unknown');
    });
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
