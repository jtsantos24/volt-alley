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

  const REWARD = {
    flip: 0.5,
    multi: 0.5,
    bigAirTime: 0.65,
    bigAir: 0.5,
    boost: 80,
    boostFlip: 40,
    heat: 0.25,
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
  let cameraY = 42;
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
  let boostFlash = 0;
  let rewardFlash = 0;
  let bolt = 0;
  let boltX = 120;
  let nextBolt = 2.2;
  const trail = [];

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
    const keys = [{ x: 0, h: 42 }, { x: 1280, h: 46 }];
    const hazards = [];
    const pads = [];
    const hints = [
      { x: 980, text: 'EASE IN' },
      { x: FINISH_X - 900, text: 'SECTOR GATE' },
    ];
    const rand = mulberry32(77);
    let x = 1280;
    let piece = 0;
    while (x < FINISH_X - 400) {
      const roll = piece % 6;
      if (roll === 0 || roll === 2) {
        x += 560 + rand() * 260;
        keys.push({ x: x, h: 24 + rand() * 78 });
      } else if (roll === 1) {
        x += 420 + rand() * 140;
        keys.push({ x: x, h: 10 + rand() * 16 });
        if (rand() > 0.55) hazards.push({ kind: 'debris', x: x - 80, w: 86, clear: 18 });
      } else if (roll === 3 || roll === 5) {
        const base = 16 + rand() * 18;
        x += 180;
        keys.push({ x: x, h: base });
        const rise = 250 + rand() * 70;
        const peak = base + 108 + rand() * 46;
        x += rise;
        keys.push({ x: x, h: peak, ramp: true, pow: 1.7 });
        const valley = 8 + rand() * 12;
        x += 300 + rand() * 180;
        keys.push({ x: x, h: valley });
        if (rand() > 0.4) hazards.push({ kind: 'bar', x: x - 36, w: 34, clear: 52 });
        if (piece === 3) hints.push({ x: x - rise - 220, text: 'SEND IT' });
      } else {
        x += 160;
        keys.push({ x: x, h: 36 });
        x += 210;
        keys.push({ x: x, h: 108, ramp: true, pow: 1.55 });
        x += 260;
        keys.push({ x: x, h: 22 });
        hazards.push({ kind: 'gate', x: x - 90, w: 22, clear: 78 });
        if (piece === 4) hints.push({ x: x - 460, text: 'JUMP THE GATE' });
        x += 200;
        keys.push({ x: x, h: 24 });
        pads.push({ x: x, len: 460 });
        if (pads.length === 1) hints.push({ x: x + 40, text: 'HEAT DUMP' });
        x += 460;
        keys.push({ x: x, h: 30 });
      }
      piece += 1;
    }
    keys.push({ x: FINISH_X - 200, h: 36 });
    keys.push({ x: FINISH_X + 900, h: 36 });
    keys.sort((a, b) => a.x - b.x);
    for (let i = 1; i < keys.length; i++) {
      if (keys[i].x <= keys[i - 1].x) keys[i].x = keys[i - 1].x + 8;
    }
    hazards.sort((a, b) => a.x - b.x);
    return { keys: keys, hazards: hazards, pads: pads, hints: hints };
  }

  function queryGround(x) {
    const keys = track && track.keys;
    if (!keys || !keys.length) return { h: 42, slope: 0 };
    if (x <= keys[0].x) return { h: keys[0].h, slope: 0 };
    const last = keys[keys.length - 1];
    if (x >= last.x) return { h: last.h, slope: 0 };
    let lo = 0;
    let hi = keys.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (keys[mid].x <= x) lo = mid;
      else hi = mid;
    }
    const a = keys[lo];
    const b = keys[hi];
    const dx = b.x - a.x || 1;
    const t = clamp((x - a.x) / dx, 0, 1);
    if (b.ramp) {
      const p = b.pow || 1.65;
      const tn = Math.pow(t, p);
      const h = a.h + (b.h - a.h) * tn;
      const slope = (b.h - a.h) * p * Math.pow(Math.max(t, 0.001), p - 1) / dx;
      return { h: h, slope: slope };
    }
    const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const h = a.h + (b.h - a.h) * s;
    const slope = (b.h - a.h) * (Math.PI * 0.5 * Math.sin(Math.PI * t)) / dx;
    return { h: h, slope: slope };
  }

  function layoutMetrics() {
    const horizon = Math.round(Math.max(108, Math.min(168, H * 0.36)));
    return { horizon: horizon, trackTop: horizon + 8, laneGap: 0 };
  }

  function initPool() {
    pool.length = 0;
    for (let i = 0; i < 80; i++) pool.push({ alive: false });
  }
  function burst(wx, wy, color, n, life) {
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
      n -= 1;
    }
  }

  function readInput() {
    return {
      throttle: touch.throttle || keys.has('Space') || keys.has('KeyD') || keys.has('ArrowRight'),
      turbo: touch.turbo || keys.has('ShiftLeft') || keys.has('ShiftRight'),
      leanBack: touch.leanBack || keys.has('KeyA') || keys.has('ArrowLeft') || keys.has('ArrowUp'),
      leanFwd: touch.leanFwd || keys.has('KeyQ') || keys.has('KeyZ') || keys.has('ArrowDown'),
    };
  }

  function wrapAngle(a) {
    const turn = Math.PI * 2;
    let x = (a + Math.PI) % turn;
    if (x < 0) x += turn;
    return x - Math.PI;
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
    burst(bike.x, bike.y, '#ff2bd6', 14, 0.5);
    toast('+3.0s', 'bad');
  }

  function respawn() {
    bike.crashing = false;
    bike.x = bike.pastX;
    bike.prevX = bike.x;
    const g = queryGround(bike.x);
    bike.y = g.h;
    bike.vy = 0;
    bike.air = false;
    bike.pitch = Math.atan(clamp(g.slope, -1.2, 1.2));
    bike.speed = 280;
    bike.prevH = g.h;
    bike.prevSlope = g.slope;
    bike.airTime = 0;
    bike.invuln = 1.15;
    bike.debrisHit = null;
    bike.flips = 0;
    cameraX = bike.x - W * 0.32;
    cameraY = g.h;
  }

  function trickSave(flips, airTime) {
    let save = 0;
    if (flips >= 1) save += flips * REWARD.flip;
    if (flips >= 2) save += REWARD.multi;
    if (airTime >= REWARD.bigAirTime) save += REWARD.bigAir;
    return Math.round(save * 10) / 10;
  }

  function land(g) {
    const groundAngle = Math.atan(clamp(g.slope, -1.2, 1.2));
    const diff = Math.abs(wrapAngle(bike.pitch - groundAngle));
    const flips = bike.flips || 0;
    const airTime = bike.airTime;
    const back = (bike.pitch - (bike.takeoffPitch || 0)) > 0;
    bike.air = false;
    bike.vy = 0;
    bike.y = g.h;
    bike.prevH = g.h;
    bike.prevSlope = g.slope;
    if (diff >= TUNE.crashAngle) {
      startCrash(bike.x + 160);
      return;
    }
    bike.pitch = groundAngle;
    if (diff >= TUNE.hardAngle) {
      const k = (diff - TUNE.hardAngle) / (TUNE.crashAngle - TUNE.hardAngle);
      bike.speed *= 1 - 0.42 * k;
      shake = Math.max(shake, 0.35 + k * 0.45);
      audio.land(true);
      burst(bike.x, g.h, '#ffb020', 8, 0.35);
      return;
    }
    audio.land(false);
    burst(bike.x, g.h, '#5ef6ff', 8, 0.32);
    const save = trickSave(flips, airTime);
    if (save > 0) {
      raceTime = Math.max(0, raceTime - save);
      bike.speed = Math.min(TUNE.turboSpeed, bike.speed + REWARD.boost + flips * REWARD.boostFlip);
      bike.heat = Math.max(0, bike.heat - REWARD.heat);
      if (bike.heat <= TUNE.heatClear) bike.overheated = false;
      cleans += 1;
      bike.cleanFlash = 0.28;
      bike.juice = 1.18;
      boostFlash = 0.55;
      rewardFlash = 0.7;
      let name = 'BIG AIR';
      if (flips >= 3) name = 'TRIPLE';
      else if (flips === 2) name = 'DOUBLE';
      else if (flips === 1) name = back ? 'BACKFLIP' : 'FLIP';
      toast(name + ' -' + save.toFixed(1) + 's', 'good');
      return;
    }
    if (airTime > 0.28) {
      bike.speed = Math.min(TUNE.turboSpeed, bike.speed + 36);
      bike.juice = 1.08;
      toast('CLEAN', 'good');
    }
  }

  function swept(a0, a1, b0, b1) {
    return Math.max(a0, a1) >= b0 && Math.min(a0, a1) <= b1;
  }

  function collide() {
    if (bike.invuln > 0 || bike.crashing || bike.air && bike.y > queryGround(bike.x).h + 80 && bike.vy > 0) {
      /* still test gates; the early-out above is only for rising far above everything */
    }
    if (bike.invuln > 0 || bike.crashing) return;
    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.x > bike.x + 48) break;
      if (!swept(bike.prevX, bike.x, h.x, h.x + h.w)) continue;
      const ground = queryGround(h.x + h.w * 0.5).h;
      const clearance = bike.y - ground;
      if (clearance >= h.clear) continue;
      if (h.kind === 'debris') {
        if (bike.debrisHit === h) continue;
        bike.debrisHit = h;
        bike.speed *= 0.62;
        shake = Math.max(shake, 0.45);
        audio.land(true);
        burst(bike.x, bike.y, '#ffb020', 8, 0.3);
        toast('SCRAPE', 'bad');
      } else {
        startCrash(h.x + h.w + 90);
        return;
      }
    }
    if (bike.debrisHit && bike.x > bike.debrisHit.x + bike.debrisHit.w + 16) bike.debrisHit = null;
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
    let text = '';
    let kind = '';
    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.kind === 'debris') continue;
      if (h.x + h.w < bike.x) continue;
      if (h.x > bike.x + 980) break;
      text = h.kind === 'gate' ? 'JUMP THE GATE' : 'JUMP';
      kind = 'bad';
      break;
    }
    el.textContent = text;
    el.className = kind;
  }

  function physics(dt) {
    if (bike.crashing) {
      bike.crashT += dt;
      bike.pitch += dt * 7;
      bike.y += dt * 20;
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
    if (!bike.air) {
      const climb = queryGround(bike.x).slope;
      bike.speed -= Math.max(0, climb) * 110 * dt;
      bike.speed += Math.max(0, -climb) * 46 * dt;
    }
    bike.speed -= bike.speed * TUNE.drag * dt;
    if (bike.speed < 0) bike.speed = 0;
    if (bike.speed > topSpeed) topSpeed = bike.speed;

    raceTime += dt;
    bike.prevX = bike.x;
    bike.x += bike.speed * dt;
    if (bike.x < 80) bike.x = 80;

    if (bike.air) {
      if (inp.leanFwd && !inp.leanBack) bike.pitch -= TUNE.leanRate * dt;
      else if (inp.leanBack && !inp.leanFwd) bike.pitch += TUNE.leanRate * dt;
      const spun = Math.floor(Math.abs(bike.pitch - (bike.takeoffPitch || 0)) / (Math.PI * 2));
      if (spun > (bike.flips || 0)) {
        bike.flips = spun;
        bike.juice = 1.16;
      }
      bike.vy -= TUNE.gravity * dt;
      bike.y += bike.vy * dt;
      bike.airTime += dt;
      const g = queryGround(bike.x);
      if (bike.airTime > 0.1 && bike.vy <= 40 && bike.y <= g.h) land(g);
    } else {
      const g = queryGround(bike.x);
      const dx = Math.max(0, bike.x - bike.prevX);
      const glide = bike.prevH + bike.prevSlope * dx;
      const gap = glide - g.h;
      const steepLip = bike.prevSlope > 0.42 && (bike.prevSlope - g.slope) > 0.34;
      const fellAway = gap > 26 && bike.prevSlope > 0.2;
      if ((steepLip || fellAway) && bike.speed > TUNE.launchMin) {
        launch(Math.max(0.08, bike.prevSlope));
        bike.y = Math.max(g.h, glide);
      } else {
        bike.y = g.h;
        bike.vy = 0;
        const target = Math.atan(clamp(g.slope, -1.3, 1.3));
        bike.pitch += (target - bike.pitch) * Math.min(1, dt * 16);
        bike.prevH = g.h;
        bike.prevSlope = g.slope;
      }
    }

    if (bike.invuln > 0) bike.invuln -= dt;
    if (bike.cleanFlash > 0) bike.cleanFlash -= dt;
    if (bike.juice > 1) bike.juice += (1 - bike.juice) * Math.min(1, dt * 8);
    collide();

    let onPad = false;
    if (!bike.crashing && !bike.air) {
      const pads = track.pads;
      for (let i = 0; i < pads.length; i++) {
        const p = pads[i];
        if (bike.x >= p.x && bike.x <= p.x + p.len) {
          onPad = true;
          break;
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
    if (spawnT > 0.04 && bike.speed > 180 && !bike.crashing && !bike.air) {
      spawnT = 0;
      burst(bike.x - 28, bike.y + 4, boosting ? '#ff4ad0' : '#5ef6ff', 1, 0.22);
    }
    if (bike.speed > 240 && !bike.crashing) {
      const last = trail[trail.length - 1];
      if (!last || bike.x - last.x > 10) {
        trail.push({ x: bike.x - 46, y: bike.y + 10 });
        if (trail.length > 22) trail.shift();
      }
    } else if (trail.length) {
      trail.shift();
    }

    if (!bike.crashing && bike.x >= FINISH_X) finishRace();
  }

function updateCountdown(dt) {
  const inp = readInput();
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
    demo.x += dt * 220;
    if (demo.x > 5200) demo.x = 480;
    const g = queryGround(demo.x);
    demo.y = g.h;
    demo.pitch = Math.atan(clamp(g.slope, -1.2, 1.2));
    demo.air = false;
    const targetCam = demo.x - W * 0.72;
    cameraX += (targetCam - cameraX) * Math.min(1, dt * 2.4);
    cameraY += (g.h - cameraY) * Math.min(1, dt * 2.4);
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
    c.height = hy + 36;
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, c.height);
    sky.addColorStop(0, '#03020a');
    sky.addColorStop(0.38, '#0c0818');
    sky.addColorStop(0.68, '#1a1030');
    sky.addColorStop(0.86, '#321440');
    sky.addColorStop(1, '#4a2058');
    g.fillStyle = sky;
    g.fillRect(0, 0, c.width, c.height);
    const rand = mulberry32(19);
    for (let i = 0; i < 14; i++) {
      const cx = rand() * c.width;
      const cy = 8 + rand() * c.height * 0.72;
      const rx = 90 + rand() * 150;
      const ry = 26 + rand() * 34;
      g.fillStyle = i % 3 === 0 ? '#1a1030' : '#0c0818';
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = '#07040e';
      g.stroke();
      g.strokeStyle = 'rgba(255, 74, 208, 0.28)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(cx, cy + ry * 0.35, rx * 0.72, ry * 0.28, 0, 0, Math.PI);
      g.stroke();
    }
    return c;
  }

  function buildCloudLayer() {
    const width = 1500;
    const h = 150;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = h;
    const g = c.getContext('2d');
    const rand = mulberry32(41);
    for (let i = 0; i < 8; i++) {
      const x = rand() * width;
      const y = 20 + rand() * 70;
      const rx = 80 + rand() * 90;
      const ry = 18 + rand() * 16;
      g.fillStyle = 'rgba(8, 6, 18, 0.92)';
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = '#120818';
      g.stroke();
    }
    return c;
  }

  function buildArt() {
    const layout = layoutMetrics();
    const hy = Math.max(90, layout.horizon);
    art = {
      hy: hy,
      w: W,
      sky: buildSky(hy),
      clouds: buildCloudLayer(),
      layers: [
        buildLayer(101, 0.06, { width: 1400, ground: hy, minW: 18, varW: 16, minH: 0.28, varH: 0.3, gap: 8, body: '#3a3458', edge: '#6a5888' }),
        buildLayer(151, 0.14, { width: 1600, ground: hy, minW: 24, varW: 18, minH: 0.38, varH: 0.28, gap: 8, body: '#241838', edge: '#c45ad4' }),
        buildLayer(202, 0.26, { width: 1700, ground: hy, minW: 28, varW: 20, minH: 0.46, varH: 0.3, gap: 10, body: '#160c28', edge: '#5ef6ff' }),
        buildLayer(303, 0.42, { width: 1500, ground: hy, minW: 34, varW: 22, minH: 0.52, varH: 0.28, gap: 14, body: '#0c0618', edge: '#ff4ad0' }),
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
    g.addColorStop(0, '#05030c');
    g.addColorStop(0.42, '#1a1030');
    g.addColorStop(1, '#100818');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(art.sky, 0, 0, W, art.hy + 28);
    const cw = art.clouds.width;
    let off = (cameraX * 0.04) % cw;
    if (off < 0) off += cw;
    let x = -off;
    while (x < W) {
      ctx.drawImage(art.clouds, x, 8);
      x += cw;
    }
  }

  function drawCity() {
    for (let i = 0; i < art.layers.length; i++) drawStrip(art.layers[i]);
    if (bolt > 0.12) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.55, bolt * 0.6);
      for (let i = 0; i < art.layers.length; i++) drawStrip(art.layers[i]);
      ctx.restore();
    }
    const y = art.hy - 4;
    const scroll = cameraX * 0.55;
    const cols = [PAL.cyan, PAL.mag, '#7ae8ff', '#ff7ad0'];
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 8; i++) {
      const span = W + 90;
      const sx = ((i * 110 - scroll) % span + span) % span - 40;
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(sx, y, 16 + (i % 3) * 12, 3);
    }
    ctx.globalAlpha = 1;
  }

  function drawBolt() {
    if (bolt < 0.08) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, bolt);
    ctx.strokeStyle = '#f4fbff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'miter';
    ctx.shadowColor = '#9ae7ff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    let x = boltX;
    let y = 4;
    ctx.moveTo(x, y);
    const end = art.hy - 6;
    while (y < end) {
      x += (Math.random() - 0.48) * 26;
      y += 16 + Math.random() * 10;
      ctx.lineTo(x, Math.min(end, y));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.min(0.28, bolt * 0.35);
    ctx.fillStyle = '#c9b6ff';
    ctx.fillRect(0, 0, W, art.hy);
    ctx.restore();
  }

  function focusY() {
    return Math.round(H * 0.56);
  }

  function toScreen(wx, wy) {
    return { x: wx - cameraX, y: focusY() - (wy - cameraY) };
  }

  function drawGround() {
    const pts = [];
    for (let x = cameraX - 40; x <= cameraX + W + 40; x += 10) {
      const s = toScreen(x, queryGround(x).h);
      pts.push(s);
    }
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, H + 40);
    ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[pts.length - 1].x, H + 40);
    ctx.closePath();
    const shade = ctx.createLinearGradient(0, pts[0].y - 10, 0, H);
    shade.addColorStop(0, '#5a3488');
    shade.addColorStop(0.12, '#2a1848');
    shade.addColorStop(0.4, '#140c24');
    shade.addColorStop(1, '#07040e');
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineWidth = 8;
    ctx.strokeStyle = PAL.ink;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = bolt > 0.35 ? '#f4fbff' : PAL.cyan;
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.stroke();
  }

  function drawHazards() {
    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.x > cameraX + W + 80 || h.x + h.w < cameraX - 80) continue;
      const base = queryGround(h.x + h.w * 0.5);
      const foot = toScreen(h.x, base.h);
      const top = toScreen(h.x, base.h + h.clear);
      const far = toScreen(h.x + h.w, base.h);
      if (h.kind === 'debris') {
        roundPath(foot.x, foot.y - 16, h.w, 16, 5);
        paint('#2a1848', 3);
        ctx.fillStyle = PAL.amber;
        ctx.beginPath();
        ctx.arc(foot.x + 16, foot.y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (h.kind === 'gate') {
        const beam = toScreen(h.x, base.h + h.clear);
        const postH = Math.max(24, foot.y - beam.y);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = PAL.cyan;
        ctx.fillRect(foot.x - 8, beam.y, far.x - foot.x + 24, postH);
        ctx.globalAlpha = 1;
        roundPath(foot.x - 10, beam.y, 14, postH, 4);
        paint(PAL.mag, 3);
        roundPath(far.x - 2, beam.y, 14, postH, 4);
        paint(PAL.mag, 3);
        roundPath(foot.x - 14, beam.y - 10, far.x - foot.x + 32, 18, 8);
        const grd = ctx.createLinearGradient(0, beam.y - 10, 0, beam.y + 8);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(0.45, PAL.cyan);
        grd.addColorStop(1, '#123040');
        paint(grd, 4);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = PAL.cyan;
        ctx.fillRect(foot.x - 78, foot.y - 7, 64, 6);
        ctx.globalAlpha = 1;
      } else {
        const wallH = Math.max(18, foot.y - top.y);
        roundPath(foot.x, top.y, Math.max(22, far.x - foot.x), wallH, 6);
        const grd = ctx.createLinearGradient(0, top.y, 0, foot.y);
        grd.addColorStop(0, '#ffd6f2');
        grd.addColorStop(0.35, PAL.mag);
        grd.addColorStop(1, '#2a0830');
        paint(grd, 4);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = PAL.mag;
        ctx.fillRect(foot.x - 64, foot.y - 5, 56, 5);
        ctx.globalAlpha = 1;
      }
    }
    const pads = track.pads;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (p.x > cameraX + W || p.x + p.len < cameraX) continue;
      const a = toScreen(p.x, queryGround(p.x).h);
      const b = toScreen(p.x + p.len, queryGround(p.x + p.len).h);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(94, 246, 255, 0.35)';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = PAL.cyan;
      ctx.stroke();
    }
    if (FINISH_X < cameraX + W + 40 && FINISH_X > cameraX - 40) {
      const g = queryGround(FINISH_X);
      const foot = toScreen(FINISH_X, g.h);
      const cap = toScreen(FINISH_X, g.h + 78);
      roundPath(foot.x - 8, cap.y, 12, foot.y - cap.y, 4);
      paint(PAL.cyan, 3);
      roundPath(foot.x + 36, cap.y, 12, foot.y - cap.y, 4);
      paint(PAL.cyan, 3);
      roundPath(foot.x - 10, cap.y, 58, 16, 6);
      paint(PAL.lamp, 3);
    }
    ctx.font = '800 14px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = PAL.ink;
    ctx.fillStyle = PAL.cream;
    for (let i = 0; i < track.hints.length; i++) {
      const h = track.hints[i];
      if (h.x < cameraX - 40 || h.x > cameraX + W + 20) continue;
      const s = toScreen(h.x, queryGround(h.x).h + 36);
      ctx.strokeText(h.text, s.x, s.y);
      ctx.fillText(h.text, s.x, s.y);
    }
  }

  function drawTrail() {
    if (trail.length < 2 || bike.speed < 240) return;
    ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = toScreen(trail[i - 1].x, trail[i - 1].y);
      const b = toScreen(trail[i].x, trail[i].y);
      const t = i / trail.length;
      ctx.globalAlpha = t * 0.8;
      ctx.strokeStyle = i % 2 ? PAL.cyan : PAL.mag;
      ctx.lineWidth = 2 + t * 5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawBike(x, y, pitch, juice, heat, boosting, alpha, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-pitch);
    const s = 1.85 * (juice || 1);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const glow = heat > 0.82 ? PAL.mag : PAL.cyan;
    function wheel(wx) {
      ctx.beginPath();
      ctx.arc(wx, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#07040e';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = PAL.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wx, 0, 10.5, 0, Math.PI * 2);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = glow;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wx, 0, 4.5, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.mag;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(wx, 0);
      ctx.rotate(spin);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
      ctx.restore();
    }
    wheel(-38);
    wheel(34);
    ctx.beginPath();
    ctx.moveTo(-52, 5);
    ctx.lineTo(-46, -7);
    ctx.lineTo(-12, -13);
    ctx.lineTo(16, -15);
    ctx.lineTo(52, -5);
    ctx.lineTo(64, 1);
    ctx.lineTo(46, 7);
    ctx.lineTo(-40, 8);
    ctx.closePath();
    const body = ctx.createLinearGradient(0, -16, 0, 8);
    body.addColorStop(0, '#241848');
    body.addColorStop(0.55, '#100818');
    body.addColorStop(1, '#07040e');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-44, -6);
    ctx.lineTo(-10, -12);
    ctx.lineTo(18, -13);
    ctx.lineTo(56, -3);
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-36, 6);
    ctx.lineTo(44, 5);
    ctx.strokeStyle = PAL.mag;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(4, -11, 16, 7.5, -0.2, Math.PI, 0);
    ctx.fillStyle = '#062028';
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -9, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = '#d5e4f2';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(2.4, -9, 2.6, 1.8, 0.3, -1.1, 1.1);
    ctx.fillStyle = '#123044';
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(60, -1, 2.4, 0, Math.PI * 2);
    ctx.fill();
    if (boosting) {
      ctx.beginPath();
      ctx.ellipse(-62, 1, 16, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAL.mag;
      ctx.fill();
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawActor(actor, heat, boosting) {
    const gnd = queryGround(actor.x).h;
    const p = actor.pitch || 0;
    const lift = 24;
    const axle = toScreen(actor.x - Math.sin(p) * lift, actor.y + Math.cos(p) * lift);
    const shadow = toScreen(actor.x, gnd);
    const liftPx = Math.max(0, actor.y - gnd);
    ctx.fillStyle = 'rgba(4, 2, 10, 0.45)';
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y + 4, Math.max(12, 34 - liftPx * 0.08), 6, 0, 0, Math.PI * 2);
    ctx.fill();
    let alpha = 1;
    if (actor.invuln > 0 && Math.sin(time * 30) > 0) alpha = 0.45;
    const spin = (actor.x || 0) * 0.08;
    drawBike(axle.x, axle.y, p, actor.juice || 1, heat, boosting, alpha, spin);
  }

  function drawParticles() {
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      const a = Math.max(0, p.life / p.max);
      const s = toScreen(p.wx, p.wy);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3 + (1 - a) * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = PAL.ink;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawSpeedLines() {
    if (phase !== 'play' || bike.speed < 760) return;
    ctx.globalAlpha = Math.min(0.28, (bike.speed - 760) / 800);
    ctx.strokeStyle = PAL.cyan;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = 70 + ((i * 41 + cameraX * 0.15) % (H * 0.35));
      ctx.beginPath();
      ctx.moveTo(W * 0.55, y);
      ctx.lineTo(W * 0.55 + 24 + i * 10, y);
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
      const mag = shake * 7;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    drawSky();
    drawBolt();
    drawCity();
    drawGround();
    drawHazards();
    drawTrail();
    if (phase === 'title' || phase === 'help') {
      drawActor(demo, 0.2, false);
    } else {
      const inp = readInput();
      drawActor(bike, bike.heat, inp.turbo && !bike.overheated && phase === 'play');
      drawParticles();
    }
    drawSpeedLines();
    if (boostFlash > 0) {
      ctx.globalAlpha = Math.min(0.28, boostFlash);
      ctx.fillStyle = '#5ef6ff';
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
    $('time-val').classList.toggle('saved', rewardFlash > 0);
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
    const g = queryGround(bike.x);
    bike.y = g.h;
    bike.vy = 0;
    bike.pitch = Math.atan(clamp(g.slope, -1.2, 1.2));
    bike.speed = 0;
    bike.air = false;
    bike.airTime = 0;
    bike.prevH = g.h;
    bike.prevSlope = g.slope;
    bike.heat = 0;
    bike.overheated = false;
    bike.invuln = 0;
    bike.crashing = false;
    bike.crashT = 0;
    bike.onPad = false;
    bike.debrisHit = null;
    bike.cleanFlash = 0;
    bike.juice = 1;
    bike.flips = 0;
    raceTime = 0;
    crashes = 0;
    cleans = 0;
    topSpeed = 0;
    rev = 0;
    shake = 0;
    penaltyFlash = 0;
    rewardFlash = 0;
    boostFlash = 0;
    spawnT = 0;
    cameraX = 520 - W * 0.32;
    cameraY = g.h;
    trail.length = 0;
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
      if (e.repeat && (e.code === 'Enter' || e.code === 'KeyP' || e.code === 'Escape')) return;
      keys.add(e.code);
      unlockAudio();
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
      nextBolt -= dt;
      if (nextBolt <= 0) {
        bolt = 1;
        boltX = 40 + Math.random() * Math.max(80, W - 80);
        nextBolt = 2.6 + Math.random() * 4.2;
      }
      if (bolt > 0) bolt = Math.max(0, bolt - dt * 1.7);
    }
    if (boostFlash > 0) boostFlash -= dt;
    if (rewardFlash > 0) rewardFlash -= dt;
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
        const ground = queryGround(bike.x);
        const follow = phase === 'play' && bike.air ? ground.h * 0.7 + bike.y * 0.3 : ground.h;
        cameraY += (follow - cameraY) * Math.min(1, dt * 3.2);
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
