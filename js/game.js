/* VOLT ALLEY — original hover-bike lane racer.
   All graphics are canvas draws. No external art, fonts, or audio files. */
(function () {
  'use strict';

  const BEST_KEY = 'volt-alley-best';
  const MUTE_KEY = 'volt-alley-mute';
  const HELP_KEY = 'volt-alley-help';
  const COIN_KEY = 'volt-alley-coins';
  const MARK_GAP = 1400;
  let finishX = 21600;
  let currentMap = null;
  const STEP = 1 / 120;
  const SIGNS = ['NOODLE', 'WETWARE', '24H', 'KILO', 'STATIC', 'ASH CO', 'BYTE', 'VOLT', 'LOW', 'GRID', 'NITE', 'AMP', 'RADIO', 'SODA'];

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
    padTime: 0.9,
  };
  TUNE.rivalMax = 0.95 * TUNE.turboSpeed;

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
  const GARAGE_KEY = 'volt-alley-garage';
  const SHELLS = [
    { id: 'stock', name: 'STOCK', color: null, stars: 0 },
    { id: 'pier', name: 'PIER', color: '#5ef6ff', stars: 3 },
    { id: 'spine', name: 'SPINE', color: '#ff4ad0', stars: 6 },
    { id: 'cut', name: 'CUT', color: '#ffe08a', stars: 9 },
    { id: 'well', name: 'WELL', color: '#b08cff', stars: 12 },
    { id: 'veil', name: 'VEIL', color: '#ff6a4a', stars: 15 },
  ];
  const TUNES = [
    { id: 'vent', name: 'CORE VENT', cost: 8, blurb: 'Heat builds slower' },
    { id: 'spring', name: 'ARC SPRING', cost: 12, blurb: 'Hard landings lose less speed' },
    { id: 'coil', name: 'DRIVE COIL', cost: 16, blurb: 'Climbs sap less speed' },
  ];
  let garage = { shell: 'stock', tunes: {}, stock: true, haptics: !reduceMotion };
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
  let richOn = !reduceMotion;
  let richLow = 0;
  let richHigh = 0;
  let richFlips = 0;
  let cameraX = 0;
  let cameraY = 42;
  let shake = 0;
  let phase = 'title';
  let helpBack = 'title';
  let seenHelp = false;
  let updatePending = false;
  let updateReloading = false;
  function setPhase(next) {
    phase = next;
    if (!updatePending || updateReloading) return;
    if (next !== 'title' && next !== 'maps') return;
    updateReloading = true;
    updatePending = false;
    try { sessionStorage.setItem('volt-alley-updated', '1'); } catch (err) { /* private */ }
    window.location.reload();
  }
  let debugOn = false;
  try { debugOn = /(?:\?|&)debug=1(?:&|$)/.test(location.search); } catch (err) { debugOn = false; }
  let best = null;
  let coinBank = 0;
  let coinsDirty = false;
  const runStats = { saved: 0, hops: 0, blocksSuffered: 0, scrapes: 0, padVisits: 0, overheats: 0, flips: 0, dragDist: 0, faults: { gate: 0, bar: 0, ceiling: 0, landing: 0, wall: 0, rear: 0 } };
  const fpsHist = new Uint16Array(64);
  let fpsSamples = 0;
  let richTime = 0;
  let playTime = 0;
  const cpTimes = new Float32Array(16);
  let cpN = 0;
  let runOpen = false;
  let blockI = 0;
  let blockT0 = 0;
  let blockP0 = 0;
  let physT = 0;
  let splitT = null;
  let splitPhys = null;
  let entrySpeed = null;
  let blockFaults = null;
  let blockRival = null;
  let lastRun = null;
  const runLog = [];
  let runCoins = 0;
  let mapProgress = {};
  const ghostSlots = [];
  for (let gi = 0; gi < 4000; gi++) ghostSlots.push({ t: 0, x: 0, y: 0, p: 0, l: 0 });
  let ghostN = 0;
  let ghostAcc = 0;
  let ghostRun = null;
  let ghostOn = true;
  let selectedMapId = 'nite-pier';
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
  const TR_N = 24;
  const trX = new Float32Array(TR_N);
  const trY = new Float32Array(TR_N);
  const trFX = new Float32Array(TR_N);
  const trFY = new Float32Array(TR_N);
  const trL = new Float32Array(TR_N);
  let trLen = 0;
  let trHead = 0;
  let paintGlow = null;
  let paintBeam = true;
  const shellPacks = Object.create(null);
  const rivals = [
    { name: 'NYX', glow: '#5ef6ff', pace: 600, x: 1100, phase: 0.4, doneAt: null, scale: 1 },
    { name: 'VEX', glow: '#ff4ad0', pace: 545, x: 760, phase: 1.6, doneAt: null, scale: 1 },
    { name: 'ION', glow: '#ffe08a', pace: 490, x: 340, phase: 2.5, doneAt: null, scale: 1 },
  ];

  const bike = {
    x: 520,
    prevX: 520,
    lane: 0,
    laneF: 0,
    hopT: 1,
    hopFrom: 0,
    laneQueue: 0,
    laneGrace: 0,
    airLanePress: 0,
    airLanePred: 0,
    airLaneAt: 0,
    ringMode: 0,
    ringT: 0,
    ringFrom: 0,
    ringBack: 0,
    wasBoost: false,
    boostArm: 0,
    padT: 0,
    inDrag: 0,
    guardLanding: false,
    rivalImmune: 0,
    crashCause: '',
    leanFlight: false,
    leanAnnounced: 0,
    dragRipple: 0,
    dragExit: 0,
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

  const demo = { x: 900, y: 12, pitch: 0, lane: 0, laneF: 0, scale: 1 };
  const keys = new Set();
  const touch = { throttle: false, turbo: false, up: false, down: false, upPress: 0, downPress: 0, leanBack: false, leanFwd: false };
  /* the alley stays dry; Static Cut uses short sparks, not falling streaks */
  const pool = [];
  let track = null;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function kmh(speed) { return Math.round(speed * 0.3); }
  function ordinal(n) {
    return n + (n === 1 ? 'ST' : n === 2 ? 'ND' : n === 3 ? 'RD' : 'TH');
  }
  const pctText = new Array(1001);
  for (let pi = 0; pi <= 1000; pi++) pctText[pi] = (pi / 10) + '%';
  const FMT_N = 18000;
  const fmtCache = new Array(FMT_N);
  for (let fi = 0; fi < FMT_N; fi++) {
    const m = Math.floor(fi / 6000);
    const s = Math.floor(fi / 100) % 60;
    const c = fi % 100;
    fmtCache[fi] = m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
  }
  function fmt(t) {
    if (t == null || !isFinite(t)) return '--:--.--';
    const total = Math.round(Math.max(0, t) * 100);
    if (total < FMT_N) return fmtCache[total];
    const m = Math.floor(total / 6000);
    const s = Math.floor(total / 100) % 60;
    const c = total % 100;
    return m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
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
  function tuningOn(id) {
    return !garage.stock && garage.tunes && garage.tunes[id];
  }
  function buzz(pattern) {
    if (!garage.haptics || reduceMotion) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (err) { /* ignore */ }
  }
  function loadGarage() {
    try {
      const raw = JSON.parse(localStorage.getItem(GARAGE_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        garage.shell = raw.shell || 'stock';
        garage.tunes = raw.tunes || {};
        garage.stock = raw.stock !== false;
        garage.haptics = raw.haptics != null ? !!raw.haptics : !reduceMotion;
      }
    } catch (err) { /* ignore */ }
  }
  function saveGarage() {
    try { localStorage.setItem(GARAGE_KEY, JSON.stringify(garage)); } catch (err) { /* ignore */ }
  }
  function shellColor() {
    if (garage.shell === 'stock') return null;
    for (let i = 0; i < SHELLS.length; i++) if (SHELLS[i].id === garage.shell) return SHELLS[i].color;
    return null;
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

function buildTrack(mapId) {
    const built = window.VoltMaps.compile(mapId || (currentMap && currentMap.id) || 'nite-pier');
    finishX = built.finishX;
    currentMap = built;
    return built;
  }

  const G0 = { h: 42, slope: 0 };
  let groundDepth = 0;
  let allocProbe = 0;
  let allocFrame = 0;
  const allocSites = { trail: 0, ground: 0, bike: 0, physics: 0, rivals: 0, background: 0, dressing: 0, hazards: 0, glowRing: 0, glowDot: 0 };
  const heapWin = new Float32Array(720);
  let heapN = 0;
  let heapI = 0;
  function noteHeap() {
    if (phase !== 'play' || raceTime < 2) {
      heapN = 0;
      heapI = 0;
      allocProbe = 0;
      return;
    }
    const mem = performance.memory && performance.memory.usedJSHeapSize;
    if (!mem) return;
    heapWin[heapI] = mem;
    heapI = (heapI + 1) % heapWin.length;
    if (heapN < heapWin.length) heapN += 1;
    let lo = heapWin[0];
    let hi = heapWin[0];
    for (let i = 1; i < heapN; i++) {
      const v = heapWin[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    allocProbe = hi - lo;
  }
  function queryGround(x) {
    groundDepth += 1;
    const keys = track && track.keys;
    if (!keys || !keys.length) { G0.h = 42; G0.slope = 0; groundDepth -= 1; return G0; }
    if (x <= keys[0].x) { G0.h = keys[0].h; G0.slope = 0; groundDepth -= 1; return G0; }
    const last = keys[keys.length - 1];
    if (x >= last.x) { G0.h = last.h; G0.slope = 0; groundDepth -= 1; return G0; }
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
      G0.h = a.h + (b.h - a.h) * tn;
      G0.slope = (b.h - a.h) * p * Math.pow(Math.max(t, 0.001), p - 1) / dx;
      groundDepth -= 1;
      return G0;
    }
    const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
    G0.h = a.h + (b.h - a.h) * s;
    G0.slope = (b.h - a.h) * (Math.PI * 0.5 * Math.sin(Math.PI * t)) / dx;
    groundDepth -= 1;
    return G0;
  }

  const layoutBox = { horizon: 140, trackTop: 148, laneGap: 22 };
  let laneGap = 22;
  function layoutMetrics() {
    layoutBox.horizon = Math.round(Math.max(108, Math.min(168, H * 0.36)));
    layoutBox.trackTop = layoutBox.horizon + 8;
    layoutBox.laneGap = Math.max(20, Math.min(26, Math.round(H * 0.058)));
    laneGap = layoutBox.laneGap;
    return layoutBox;
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
      p.w = 1.2 + Math.random() * 1.5;
      n -= 1;
    }
  }

  const inputNow = { throttle: false, turbo: false, leanBack: false, leanFwd: false };
  function readInput() {
    inputNow.throttle = touch.throttle || keys.has('Space') || keys.has('KeyD') || keys.has('ArrowRight');
    inputNow.turbo = touch.turbo || keys.has('ShiftLeft') || keys.has('ShiftRight');
    inputNow.leanBack = touch.leanBack || keys.has('KeyA') || keys.has('ArrowLeft');
    inputNow.leanFwd = touch.leanFwd || keys.has('KeyQ') || keys.has('KeyZ');
    return inputNow;
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
    bike.leanFlight = false;
    if (track && track.leanLips) {
      const lips = track.leanLips;
      for (let li = 0; li < lips.length; li++) {
        if (Math.abs(lips[li].lip - bike.x) < 90) { bike.leanFlight = true; break; }
      }
    }
    bike.pitch = Math.atan(clamp(slope, 0, 1.2));
    bike.takeoffPitch = bike.pitch;
    bike.flips = 0;
    audio.jump();
    rx('jump');
  }

  function startCrash(fromHazard, cause) {
    if (bike.crashing) return;
    if (!fromHazard && bike.guardLanding) return;
    bike.crashing = true;
    bike.crashT = 0;
    bike.crashX = bike.x;
    bike.crashCause = cause || (fromHazard ? 'hazard' : 'landing');
    bike.looping = null;
    shake = 1;
    crashes += 1;
    const bucket = runStats.faults;
    if (bucket[bike.crashCause] != null) bucket[bike.crashCause] += 1;
    else bucket.landing += 1;
    if (blockI >= 0 && blockFaults && blockI < blockFaults.length) {
      blockFaults[blockI] += 1;
      if (bike.crashCause === 'rear') blockRival[blockI] = 1;
    }
    audio.crash();
    buzz(46);
    burst(bike.x, bike.y, '#ff2bd6', 14, 0.5);
    toast(bike.crashCause === 'rear' ? 'REAR WHEEL' : 'FAULT', 'bad');
    rx('crash');
  }

  function checkpointBehind() {
    const list = (track && track.checkpoints) || [0];
    let cp = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i] <= bike.x - 24) cp = list[i];
    }
    return cp;
  }

  function spotBlocked(x) {
    const zones = (track && track.zones) || [];
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (x >= z.x0 && x <= z.x1 && (z.kind === 'tunnel' || z.kind === 'lip')) return true;
    }
    const ceilings = (track && track.ceilings) || [];
    for (let i = 0; i < ceilings.length; i++) {
      const c = ceilings[i];
      if (x >= c.x && x <= c.x + c.w) return true;
    }
    return false;
  }
  function respawnLane(nextX) {
    const crashLane = bike.lane || 0;
    const order = [crashLane, 1, crashLane === 0 ? 2 : 0, crashLane === 2 ? 0 : 2];
    let fallback = null;
    const closures = (track && track.closures) || [];
    for (let d = 0; d <= 640; d += 80) {
      const x = nextX + d;
      for (let i = 0; i < closures.length; i++) {
        const c = closures[i];
        if (x < c.x0 || x > c.x1) continue;
        fallback = c.open;
        break;
      }
      if (fallback != null) break;
    }
    for (let i = 0; i < order.length; i++) {
      const lane = order[i];
      let blocked = false;
      for (let r = 0; r < rivals.length; r++) {
        if ((rivals[r].lane || 0) === lane && rivals[r].x > nextX && rivals[r].x < nextX + 160) blocked = true;
      }
      const hazards = (track && track.hazards) || [];
      for (let h = 0; h < hazards.length; h++) {
        const item = hazards[h];
        const itemLane = item.lane == null ? 'all' : item.lane;
        if (itemLane !== 'all' && itemLane !== lane) continue;
        if (item.x > nextX && item.x < nextX + 160) blocked = true;
      }
      if (!blocked) {
        let horizon = (track && track.finishX) || (nextX + 640);
        const cps = (track && track.checkpoints) || [];
        for (let cpi = 0; cpi < cps.length; cpi++) {
          if (cps[cpi] > nextX + 80) { horizon = cps[cpi]; break; }
        }
        for (let d = 0; d <= horizon - nextX; d += 80) {
          if (laneClosed(nextX + d, lane)) blocked = true;
        }
        for (let h = 0; h < hazards.length; h++) {
          const item = hazards[h];
          if (item.kind !== 'wall') continue;
          const itemLane = item.lane == null ? 'all' : item.lane;
          if (itemLane !== 'all' && itemLane !== lane) continue;
          if (item.x > nextX && item.x <= horizon) blocked = true;
        }
      }
      if (!blocked) return lane;
    }
    if (fallback != null) return fallback;
    return crashLane === 1 ? 0 : (crashLane === 0 ? 1 : 0);
  }
  function respawn() {
    bike.crashing = false;
    bike.looping = null;
    const cp = checkpointBehind();
    let nextX = Math.max(90, cp + 40);
    if (bike.crashCause === 'rear') {
      nextX = Math.max(cp + 40, (bike.crashX || bike.x) - 60);
      if (spotBlocked(nextX)) nextX = Math.max(90, cp + 40);
      bike.rivalImmune = 1;
      bike.debugLock = false;
    }
    bike.x = nextX;
    bike.prevX = bike.x;
    const lane = respawnLane(nextX);
    bike.lane = lane;
    bike.laneF = lane;
    bike.hopT = 1;
    bike.hopFrom = lane;
    bike.laneQueue = 0;
    clearMergeQueue();
    const g = queryGround(bike.x);
    bike.y = g.h;
    bike.vy = 0;
    bike.air = false;
    bike.pitch = Math.atan(clamp(g.slope, -1.2, 1.2));
    bike.speed = 420;
    bike.padT = 0;
    bike.inDrag = 0;
    bike.leanFlight = false;
    bike.leanAnnounced = 0;
    bike.prevH = g.h;
    bike.prevSlope = g.slope;
    bike.airTime = 0;
    bike.invuln = 0.45;
    bike.guardLanding = true;
    bike.debrisHit = null;
    bike.flips = 0;
    cameraX = bike.x - W * 0.32;
    cameraY = g.h;
  }

  const poseBox = { x: 0, y: 0, pitch: 0 };
  function loopPose(loop, u) {
    const span = loop.a0 - loop.a1;
    const a = loop.a0 - span * u;
    const x = loop.cx + Math.cos(a) * loop.r;
    const y = loop.cy + Math.sin(a) * loop.r;
    const pitch = a - Math.PI * 0.5;
    poseBox.x = x;
    poseBox.y = y;
    poseBox.pitch = pitch;
    return poseBox;
  }

  function tryEnterLoop(inp) {
    if (bike.looping || bike.air || !track || !track.loops) return;
    for (let i = 0; i < track.loops.length; i++) {
      const loop = track.loops[i];
      if (bike.loopSkip === loop) continue;
      if (bike.prevX < loop.entry && bike.x >= loop.entry) {
        if (bike.speed >= loop.entryMin && inp.throttle) {
          bike.looping = loop;
          bike.loopU = 0;
          bike.ringFrom = 1;
          bike.ringBack = bike.lane || 0;
          bike.ringT = 1;
          bike.ringMode = 1;
          bike.lane = 1;
          bike.laneF = 1;
          rx('loop');
          audio.jump();
        } else {
          bike.loopSkip = loop;
        }
      }
    }
  }

  function advanceLoop(dt) {
    if (bike.speed < 360) bike.speed = 360;
    const loop = bike.looping;
    const span = loop.a0 - loop.a1;
    const arc = Math.max(80, loop.r * span);
    bike.loopU += (bike.speed * dt) / arc;
    if (bike.loopU >= 1) {
      bike.looping = null;
      bike.loopSkip = loop;
      bike.x = loop.exit + 56;
      bike.prevX = bike.x;
      const g = queryGround(bike.x);
      bike.y = g.h + 10;
      bike.air = true;
      bike.vy = 24;
      bike.pitch = 0.06;
      bike.takeoffPitch = bike.pitch;
      bike.flips = 0;
      bike.airTime = 0.08;
      bike.prevH = g.h;
      bike.prevSlope = g.slope;
      bike.ringT = 0;
      bike.ringMode = 2;
      return;
    }
    const pose = loopPose(loop, bike.loopU);
    bike.prevX = bike.x;
    bike.x = Math.max(bike.x, pose.x);
    bike.y = pose.y;
    bike.pitch = pose.pitch;
    bike.air = false;
    bike.vy = 0;
  }

  function recordGhost(dt) {
    if (phase !== 'play') return;
    ghostAcc += dt || 0;
    if (ghostAcc < 0.05) return;
    ghostAcc = 0;
    if (ghostN >= ghostSlots.length) return;
    const slot = ghostSlots[ghostN];
    slot.t = Math.round(raceTime * 100) / 100;
    slot.x = Math.round(bike.x);
    slot.y = Math.round(bike.y);
    slot.p = Math.round(bike.pitch * 100) / 100;
    slot.l = hitLaneBike();
    ghostN += 1;
  }

  const ghostBox = { x: 0, y: 0, p: 0 };
  function ghostPose(t) {
    const g = ghostRun;
    if (!g || g.length < 2) return null;
    if (t <= g[0].t) {
      ghostBox.x = g[0].x;
      ghostBox.y = g[0].y;
      ghostBox.p = g[0].p;
      ghostBox.l = g[0].l || 0;
      return ghostBox;
    }
    if (t >= g[g.length - 1].t) return null;
    let lo = 0;
    let hi = g.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (g[mid].t <= t) lo = mid;
      else hi = mid;
    }
    const a = g[lo];
    const b = g[hi];
    const u = (t - a.t) / Math.max(0.001, b.t - a.t);
    ghostBox.x = a.x + (b.x - a.x) * u;
    ghostBox.y = a.y + (b.y - a.y) * u;
    ghostBox.p = a.p + (b.p - a.p) * u;
    ghostBox.l = a.l == null ? 0 : a.l;
    return ghostBox;
  }

  function loadMapProgress() {
    try {
      mapProgress = JSON.parse(localStorage.getItem('volt-alley-maps') || '{}') || {};
    } catch (err) {
      mapProgress = {};
    }
    try { ghostOn = localStorage.getItem('volt-alley-ghost') !== '0'; } catch (err) { ghostOn = true; }
  }

  function saveMapProgress() {
    try { localStorage.setItem('volt-alley-maps', JSON.stringify(mapProgress)); } catch (err) { /* private */ }
  }

  function mapRecord(id) {
    return mapProgress[id] || { best: null, stars: 0, clean: false, circuit: false };
  }

  function totalStars() {
    const list = window.VoltMaps.list;
    let n = 0;
    for (let i = 0; i < list.length; i++) n += mapRecord(list[i].id).stars || 0;
    return n;
  }

  function mapUnlocked(meta, index) {
    if (index === 0) return true;
    const prev = window.VoltMaps.list[index - 1];
    if ((mapRecord(prev.id).stars || 0) >= 1) return true;
    if (meta.id === 'ash-veil' && totalStars() >= 9) return true;
    return false;
  }

  function nyxTime(dist, pace, phase, cap) {
    let x = 0;
    let t = 0;
    const dt = 1 / 120;
    while (x < dist && t < 90) {
      const wobble = 0.9 + 0.1 * Math.sin(t * 0.85 + phase);
      let speed = pace * wobble;
      if (speed > cap) speed = cap;
      x += speed * dt;
      t += dt;
    }
    return t;
  }

  function nyxPace(dist, target, phase, cap) {
    const floor = dist / cap;
    let lo = 200;
    let hi = cap / 0.8 + 40;
    if (target <= floor) return hi;
    for (let n = 0; n < 28; n++) {
      const mid = (lo + hi) * 0.5;
      if (nyxTime(dist, mid, phase, cap) > target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) * 0.5;
  }

  function placeRivals() {
    const times = currentMap && currentMap.rivalT;
    const starts = [980, 680, 400];
    const cap = TUNE.rivalMax;
    if (times && times.length === 3) {
      rivals[0].pace = nyxPace(finishX - starts[0], times[0], rivals[0].phase || 0, cap);
      for (let i = 1; i < 3; i++) rivals[i].pace = (finishX - starts[i]) / (0.9 * Math.max(8, times[i]));
    } else {
      const target = (currentMap && currentMap.star2) || 60;
      const base = finishX / Math.max(36, target);
      rivals[0].pace = base * 1.04;
      rivals[1].pace = base * 0.94;
      rivals[2].pace = base * 0.84;
    }
    rivals[0].x = 980;
    rivals[1].x = 680;
    rivals[2].x = 400;
    rivals[0].lane = 2;
    rivals[1].lane = 1;
    rivals[2].lane = 1;
    rivals[0].laneF = 2;
    rivals[1].laneF = 1;
    rivals[2].laneF = 1;
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      r.hopT = 1;
      r.hopFrom = r.lane;
      r.signalT = 0;
      r.signalDir = 0;
      r.stallT = 0;
      r.blockCd = 1 + i;
      r.pickT = 4 + i;
      r.warn = 0;
      r.hold = false;
      r.funnel = false;
      r.arc = 0;
      r.arcT = null;
      r.speed = r.pace;
      r.rng = ((currentMap && currentMap.seed) || 1) * (i + 3);
    }
    rivals[0].doneAt = null;
    rivals[1].doneAt = null;
    rivals[2].doneAt = null;
  }

  function applyDebug(spec) {
    if (!debugOn || phase !== 'play' || !track) return null;
    const lane = spec.lane == null ? (bike.lane || 0) : (spec.lane | 0);
    const x = spec.x == null ? 1900 : spec.x;
    const gap = spec.gap == null ? 150 : spec.gap;
    const idx = spec.i == null ? 1 : spec.i;
    bike.x = x;
    bike.prevX = x;
    bike.lane = lane;
    bike.laneF = lane;
    bike.hopT = 1;
    bike.hopFrom = lane;
    bike.laneQueue = 0;
    bike.laneGrace = 0;
    bike.air = false;
    bike.airTime = 0;
    bike.vy = 0;
    bike.crashing = false;
    bike.crashT = 0;
    bike.crashCause = '';
    bike.invuln = 0;
    bike.rivalImmune = 0;
    bike.looping = null;
    bike.guardLanding = false;
    bike.padT = 0;
    bike.inDrag = 0;
    bike.leanFlight = false;
    bike.speed = spec.speed == null ? 480 : spec.speed;
    bike.debugSpeed = bike.speed;
    bike.debugLock = spec.lock !== false;
    const g = queryGround(x);
    bike.y = g.h;
    bike.prevH = g.h;
    bike.prevSlope = g.slope;
    bike.pitch = Math.atan(clamp(g.slope, -1.2, 1.2));
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      r.hold = true;
      r.doneAt = null;
      r.funnel = false;
      r.signalT = 0;
      r.signalDir = 0;
      r.stallT = 0;
      r.warn = 0;
      r.hopT = 1;
      r.blockCd = 30;
      r.pickT = 30;
      if (i === idx) {
        r.x = x + gap;
        r.lane = lane;
        r.laneF = lane;
        r.hopFrom = lane;
        r.pace = spec.rivalSpeed == null ? 160 : spec.rivalSpeed;
        r.speed = r.pace;
      } else {
        r.x = 160;
        r.lane = (lane + 1 + i) % 3;
        r.laneF = r.lane;
        r.hopFrom = r.lane;
        r.pace = 0;
        r.speed = 0;
      }
    }
    cameraX = bike.x - W * 0.32;
    cameraY = g.h;
    crashes = spec.keepCrashes ? crashes : 0;
    return {
      x: Math.round(bike.x),
      lane: lane,
      rival: rivals[idx].name,
      rx: Math.round(rivals[idx].x),
      zone: inNoContact(x),
    };
  }

  function loadGhost(id) {
    ghostRun = null;
    if (!ghostOn) return;
    try {
      const raw = localStorage.getItem('volt-alley-ghost-' + id);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.length > 1) ghostRun = data;
    } catch (err) { ghostRun = null; }
  }

  function hitCeiling() {
    if (bike.invuln > 0 || !track || !track.ceilings) return;
    const top = bike.y + 44;
    for (let i = 0; i < track.ceilings.length; i++) {
      const c = track.ceilings[i];
      if (bike.x < c.x || bike.x > c.x + c.w) continue;
      const limit = queryGround(bike.x).h + c.clear;
        if (top > limit) {
        startCrash(true, 'ceiling');
        return;
      }
    }
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
      if (bike.guardLanding) {
        bike.guardLanding = false;
        bike.pitch = groundAngle;
        return;
      }
      bike.airLanePress = 0;
      startCrash(false);
      return;
    }
    runStats.flips += flips;
    bike.guardLanding = false;
    bike.pitch = groundAngle;
    if (diff >= TUNE.hardAngle) {
      const k = (diff - TUNE.hardAngle) / (TUNE.crashAngle - TUNE.hardAngle);
      const soften = tuningOn('spring') ? 0.7 : 1;
      bike.speed *= 1 - 0.42 * k * soften;
      shake = Math.max(shake, 0.35 + k * 0.45);
      audio.land(true);
      burst(bike.x, g.h, '#ffb020', 8, 0.35);
      takeAirLane();
      return;
    }
    audio.land(false);
    burst(bike.x, g.h, '#5ef6ff', 8, 0.32);
    rx('land', { clean: true, airTime: airTime, flips: flips });
    takeAirLane();
    const save = trickSave(flips, airTime);
    if (save > 0) {
      runStats.saved += save;
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
      buzz(18);
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
    if (bike.crashing) return;
    const hazards = track.hazards;
    const playerLane = hitLaneBike();
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.x > bike.x + 80) break;
      if (!laneMatches(h.lane, playerLane)) continue;
      if (!swept(bike.prevX, bike.x, h.x, h.x + h.w)) continue;
      const ground = queryGround(h.x + h.w * 0.5).h;
      const clearance = bike.y - ground;
      if (clearance >= h.clear) { if (h.kind !== 'debris' && clearance - h.clear < 12) rx('nearMiss'); continue; }
      if (h.kind === 'debris') {
        if (bike.debrisHit === h) continue;
        bike.debrisHit = h;
        runStats.scrapes += 1;
        bike.speed *= 0.62;
        shake = Math.max(shake, 0.45);
        audio.land(true);
        burst(bike.x, bike.y, '#ffb020', 8, 0.3);
        toast('SCRAPE', 'bad');
      } else {
        startCrash(true, h.kind === 'wall' ? 'wall' : h.kind === 'gate' ? 'gate' : 'bar');
        return;
      }
    }
    if (bike.debrisHit && bike.x > bike.debrisHit.x + bike.debrisHit.w + 16) bike.debrisHit = null;
    rearWheelCheck();
  }
  function laneMatches(itemLane, lane) {
    const value = itemLane == null ? 'all' : itemLane;
    return value === 'all' || value === lane;
  }
  function hitLaneBike() {
    if ((bike.hopT || 1) < 0.4) return bike.hopFrom | 0;
    return bike.lane | 0;
  }
  function inNoContact(x) {
    const zones = (track && track.zones) || [];
    for (let i = 0; i < zones.length; i++) {
      if (x >= zones[i].x0 && x <= zones[i].x1) return true;
    }
    return false;
  }
  function rearWheelCheck() {
    if (bike.looping || bike.crashing) return;
    const lane = hitLaneBike();
    const grounded = !bike.air && bike.laneGrace <= 0 && bike.rivalImmune <= 0 && bike.invuln <= 0 && !inNoContact(bike.x);
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      if (r.doneAt != null || r.funnel) continue;
      if ((r.hopT < 0.4 ? r.hopFrom : r.lane) !== lane) continue;
      const closing = bike.speed - (r.speed || 0);
      const over = (bike.x + 43) - (r.x - 49);
      const behind = (r.x - 49) - (bike.x + 43);
      const range = Math.max(90, closing * 0.7);
      if (behind > 0 && behind < range && closing > 0) {
        if (!(r.warn > 0)) buzz(6);
        r.warn = 0.2;
      }
      if (!grounded) continue;
      queryGround(bike.x);
      if (Math.abs(bike.y - G0.h) >= 14) continue;
      if (over >= 0 && over <= 18 && closing > 60) {
        startCrash(true, 'rear');
        return;
      }
      if ((r.signalT || 0) > 0 || inNoContact(r.x)) continue;
      const ontoRival = (r.x + 43) - (bike.x - 49);
      if (ontoRival >= 0 && ontoRival <= 18 && (r.speed || 0) > bike.speed) {
        r.stallT = 1.2;
        r.blockCd = Math.max(r.blockCd || 0, 4);
      }
    }
  }

  let queuedMerge = '';
  let queuedMergeWall = 0;
  let queuedMergeLane = -1;
  function clearMergeQueue() {
    queuedMerge = '';
    queuedMergeWall = 0;
    queuedMergeLane = -1;
  }
  function nextLeanLip() {
    const lips = track && track.leanLips;
    if (!lips) return null;
    const look = Math.max(960, (bike.speed || 0) * 1.25);
    let best = null;
    for (let i = 0; i < lips.length; i++) {
      const item = lips[i];
      if (item.lip <= bike.x) continue;
      if (item.lip - bike.x > look) continue;
      if (!best || item.lip < best.lip) best = item;
    }
    return best;
  }

  function updateCallout() {
    const el = $('callout');
    if (phase !== 'play' || bike.crashing || portrait) {
      el.textContent = '';
      el.className = '';
      return;
    }
    let text = '';
    let kind = '';
    let jump = '';
    let jumpNear = false;
    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.kind === 'debris' || h.kind === 'wall') continue;
      if (!laneMatches(h.lane, bike.lane || 0)) continue;
      if (h.x + h.w < bike.x) continue;
      if (h.x > bike.x + 980) break;
      if (!jump) jump = h.kind === 'gate' ? 'JUMP THE GATE' : 'JUMP';
      if (h.x < bike.x + 400) {
        jumpNear = true;
        break;
      }
    }
      let splitText = '';
      let mergeText = '';
      let mergeWall = 0;
      let mergeLane = -1;
    const look = Math.max(960, (bike.speed || 0) * 1.25);
    const closures = (track && track.closures) || [];
    const mine = bike.lane || 0;
    for (let i = 0; i < closures.length; i++) {
      const c = closures[i];
      const wall = c.wall != null ? c.wall : c.x1;
      if (bike.x >= wall) continue;
      const dist = wall - bike.x;
      if (dist > look) continue;
      if (c.split) {
        if (mine !== c.open && !splitText) splitText = c.open > mine ? 'SPLIT: GO ▲' : 'SPLIT: GO ▼';
      } else if (mine === c.closed && !mergeText) {
        mergeText = c.open > mine ? 'MERGE ▲' : 'MERGE ▼';
        mergeWall = wall;
        mergeLane = c.closed;
      }
    }
    if (mergeText) {
      queuedMerge = mergeText;
      queuedMergeWall = mergeWall;
      queuedMergeLane = mergeLane;
    } else if (bike.x >= queuedMergeWall || mine !== queuedMergeLane) {
      clearMergeQueue();
    }
    if (jumpNear) {
      if (bike.air) {
        const nose = wrapAngle(bike.pitch);
        if (nose > TUNE.hardAngle) text = bike.leanFlight ? 'LEAN FWD · TAP' : 'LEAN FWD';
        else if (nose < -TUNE.hardAngle) text = 'LEAN BACK';
        else text = 'LEVEL';
        kind = text === 'LEVEL' ? 'good' : 'bad';
      } else {
        text = jump;
        kind = 'bad';
      }
    } else if (queuedMerge && bike.x < queuedMergeWall && mine === queuedMergeLane) {
      text = queuedMerge;
      kind = 'bad';
    } else if (!bike.air && nextLeanLip()) {
      const lean = nextLeanLip();
      text = 'LEAN ▸';
      kind = 'bad';
      if (bike.leanAnnounced !== lean.lip) {
        bike.leanAnnounced = lean.lip;
        try { audio.leanTick(); } catch (err) { /* optional */ }
      }
    } else if (splitText) {
      text = splitText;
      kind = 'bad';
    }
    if (!text && jump && !bike.air) {
      text = jump;
      kind = 'bad';
    }
    if (!text && bike.air && bike.airTime > 0.12) {
      const nose = wrapAngle(bike.pitch);
      if (nose > TUNE.hardAngle) text = bike.leanFlight ? 'LEAN FWD · TAP' : 'LEAN FWD';
      else if (nose < -TUNE.hardAngle) text = 'LEAN BACK';
      else text = 'LEVEL';
      kind = text === 'LEVEL' ? 'good' : 'bad';
    }
    el.textContent = text;
    el.className = kind;
  }

  let globalBlockCd = 0;
  function rivalRand(r) {
    r.rng = (r.rng + 0x6D2B79F5) | 0;
    let t = Math.imul(r.rng ^ (r.rng >>> 15), 1 | r.rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function laneClosed(x, lane) {
    const list = (track && track.closures) || [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (x < c.x0 || x > c.x1) continue;
      if (c.split) {
        if (lane !== c.open) return true;
      } else if (c.closed === lane) return true;
    }
    return false;
  }
  function hazardInLane(x, lane, dist) {
    const hazards = (track && track.hazards) || [];
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.x + (h.w || 0) < x) continue;
      if (h.x > x + dist) break;
      if (!laneMatches(h.lane, lane)) continue;
      if (h.kind === 'debris' || h.kind === 'wall' || h.kind === 'bar' || h.kind === 'gate') return true;
    }
    return false;
  }
  function rivalHop(r, dir) {
    if (r.stallT > 0) return;
    const target = Math.max(0, Math.min(2, (r.lane || 0) + dir));
    if (target === r.lane) return;
    if (laneClosed(r.x, target)) return;
    const gap = r.x - bike.x;
    const closing = Math.max(0, bike.speed - (r.speed || 0));
    if (target === (bike.lane || 0)) {
      if (gap < Math.max(160, closing)) return;
      if (inNoContact(r.x) || inNoContact(bike.x)) return;
      if (bike.air || bike.looping || bike.crashing || bike.rivalImmune > 0) return;
      const closures = (track && track.closures) || [];
      for (let i = 0; i < closures.length; i++) {
        const c = closures[i];
        if (bike.x < c.x0 || bike.x > c.x1) continue;
        if ((bike.lane || 0) === c.open && target === c.open) return;
      }
      runStats.blocksSuffered += 1;
      globalBlockCd = 6;
      r.blockCd = 4;
    }
    r.hopFrom = r.lane;
    r.lane = target;
    r.hopT = 0;
    r.signalT = 0;
    r.signalDir = 0;
  }
  function signalRival(r, dir) {
    if (!dir || r.signalT > 0 || (r.hopT != null && r.hopT < 1) || r.stallT > 0) return;
    const target = (r.lane || 0) + dir;
    if (target < 0 || target > 2) return;
    if (laneClosed(r.x + 80, target)) return;
    if (target === (bike.lane || 0)) {
      const gap = r.x - bike.x;
      const closing = Math.max(0, bike.speed - (r.speed || 0));
      if (gap < Math.max(160, closing)) return;
      if (inNoContact(r.x) || inNoContact(bike.x)) return;
    }
    r.signalDir = dir;
    r.signalT = 0.45;
  }
  function updateRivals(dt) {
    if (globalBlockCd > 0) globalBlockCd -= dt;
    const pier = currentMap && currentMap.id === 'nite-pier';
    const loops = (track && track.loops) || [];
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      if (r.doneAt != null) continue;
      if (r.hold) {
        r.speed = r.pace || 0;
        if (r.speed > TUNE.rivalMax) r.speed = TUNE.rivalMax;
        r.x += r.speed * dt;
        r.laneF = r.lane || 0;
        r.hopT = 1;
        r.funnel = false;
        r.signalT = 0;
        if (r.warn > 0) r.warn -= dt;
        if (r.stallT > 0) r.stallT -= dt;
        continue;
      }
      if (r.hopT == null) r.hopT = 1;
      if (r.warn > 0) r.warn -= dt;
      if (r.stallT > 0) r.stallT -= dt;
      if (r.blockCd > 0) r.blockCd -= dt;
      const wobble = 0.9 + 0.1 * Math.sin(time * 0.85 + r.phase);
      const paceMul = (currentMap && currentMap.pace) || 1;
      r.speed = r.pace * paceMul * wobble * (r.stallT > 0 ? 0.4 : 1);
      if (r.speed > TUNE.rivalMax) r.speed = TUNE.rivalMax;
      r.x += r.speed * dt;
      if (r.x >= finishX) {
        r.x = finishX;
        r.doneAt = raceTime;
      }
      if (r.hopT < 1) {
        r.hopT = Math.min(1, r.hopT + dt / 0.16);
        const u = r.hopT * r.hopT * (3 - 2 * r.hopT);
        r.laneF = r.hopFrom + (r.lane - r.hopFrom) * u;
      } else {
        r.laneF = r.lane || 0;
      }
      r.funnel = false;
      for (let L = 0; L < loops.length; L++) {
        const loop = loops[L];
        if (r.x >= loop.entry - 180 && r.x <= loop.exit + 40) r.funnel = true;
      }
      let inGate = false;
      const zones = (track && track.zones) || [];
      for (let z = 0; z < zones.length; z++) {
        const zone = zones[z];
        if (r.x >= zone.x0 && r.x <= zone.x1 && (zone.kind === 'gate' || zone.kind === 'bar')) inGate = true;
      }
      if (inGate) {
        if (r.arcT == null) r.arcT = 0;
        r.arcT += dt;
        const u = Math.min(1, r.arcT / 0.5);
        r.arc = Math.sin(u * Math.PI) * 70;
      } else {
        r.arcT = null;
        r.arc = 0;
      }
      if (r.signalT > 0) {
        r.signalT -= dt;
        const intoPlayer = (r.lane || 0) + (r.signalDir || 0) === (bike.lane || 0);
        if (intoPlayer && (bike.hopT || 1) < 1) {
          r.signalT = 0;
          r.signalDir = 0;
        } else if (r.signalT <= 0 && r.signalDir) {
          rivalHop(r, r.signalDir);
          r.signalDir = 0;
        }
      }
      r.pickT = (r.pickT || 0) - dt;
      const look = Math.max(600, (r.speed || 0) * 0.9);
      const threatened = hazardInLane(r.x, r.lane || 0, look);
      if (r.pickT <= 0 || threatened) {
        r.pickT = 3 + rivalRand(r) * 3;
        let dir = 0;
        if (threatened) dir = rivalRand(r) < 0.5 ? -1 : 1;
        else if (rivalRand(r) < 0.45) dir = rivalRand(r) < 0.5 ? -1 : 1;
        const next = (r.lane || 0) + dir;
        if (dir && next >= 0 && next <= 2 && !laneClosed(r.x, next)) signalRival(r, dir);
      }
      if (!pier && r.blockCd <= 0 && globalBlockCd <= 0 && r.signalT <= 0 && r.hopT >= 1) {
        const gap = r.x - bike.x;
        if (gap >= 160 && gap <= 260 && Math.abs((bike.lane || 0) - (r.lane || 0)) === 1) {
          const toward = (bike.lane || 0) > (r.lane || 0) ? 1 : -1;
          if (!laneClosed(r.x, (r.lane || 0) + toward)) signalRival(r, toward);
        }
      }
    }
  }

  const standRows = [
    { id: 'you', x: 0, done: 0 },
    { id: 'NYX', x: 0, done: 0 },
    { id: 'VEX', x: 0, done: 0 },
    { id: 'ION', x: 0, done: 0 },
  ];
  function standings() {
    standRows[0].id = 'you';
    standRows[0].x = bike.x;
    standRows[0].done = bike.x >= finishX ? raceTime : 1e9;
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      standRows[i + 1].id = r.name;
      standRows[i + 1].x = r.x;
      standRows[i + 1].done = r.doneAt == null ? 1e9 : r.doneAt;
    }
    for (let i = 1; i < standRows.length; i++) {
      const row = standRows[i];
      let j = i;
      while (j > 0) {
        const a = standRows[j - 1];
        const af = a.done < 1e8;
        const bf = row.done < 1e8;
        const swap = (af && bf) ? row.done < a.done : (bf !== af ? bf : row.x > a.x);
        if (!swap) break;
        standRows[j] = a;
        j -= 1;
      }
      standRows[j] = row;
    }
    return standRows;
  }

  function collectCoins() {
    const coins = track.coins;
    if (!coins) return;
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (c.got) continue;
      if (!laneMatches(c.lane, hitLaneBike())) continue;
      const dx = bike.x - c.x;
      if (dx > 80 || dx < -80) continue;
      const gy = queryGround(c.x).h + c.lift;
      const dy = (bike.y + 16) - gy;
      if (dx * dx + dy * dy > 74 * 74) continue;
      c.got = true;
      runCoins += 1;
      if (!debugOn) {
        coinBank += 1;
        coinsDirty = true;
      }
      const sparkLane = (c.lane === 'all' || c.lane == null) ? hitLaneBike() : c.lane;
      burst(c.x, gy + sparkLane * laneGap, '#5ef6ff', 6, 0.28);
      try { audio.coin(); } catch (err) { /* ignore */ }
      rx('coin', { sx: toScreen(c.x, 0).x });
      buzz(12);
    }
  }

  function nearRing() {
    if (bike.looping) return true;
    if (!track || !track.loops) return false;
    for (let i = 0; i < track.loops.length; i++) {
      const loop = track.loops[i];
      if (bike.x >= loop.entry - 180 && bike.x <= loop.exit + 40) return true;
    }
    return false;
  }

  function predictLand() {
    let y = bike.y;
    let vy = bike.vy;
    let x = bike.x;
    const pull = TUNE.gravity;
    const spd = Math.max(40, bike.speed);
    let t = 0;
    for (let i = 0; i < 3; i++) {
      vy -= pull * 0.1;
      y += vy * 0.1;
      x += spd * 0.1;
      t += 0.1;
      queryGround(x);
      if (y <= G0.h) return t;
    }
    return 9;
  }

  function requestLane(dir) {
    if (!dir || bike.crashing) return;
    if (bike.looping || nearRing()) {
      buzz(4);
      return;
    }
    const fromLane = bike.lane || 0;
    const targetLane = Math.max(0, Math.min(2, fromLane + dir));
    if (laneClosed(bike.x, targetLane) || laneClosed(bike.x + (bike.speed || 0) * 0.25, targetLane)) {
      buzz(4);
      return;
    }
    if (bike.air) {
      const pred = predictLand();
      if (pred <= 0.3) {
        bike.airLanePress = dir;
        bike.airLanePred = pred;
        bike.airLaneAt = bike.airTime || 0;
      }
      return;
    }
    if (bike.hopT < 1) {
      bike.laneQueue = dir;
      return;
    }
    const target = Math.max(0, Math.min(2, (bike.lane || 0) + dir));
    if (target === bike.lane) {
      buzz(4);
      bike.juice = 1.04;
      return;
    }
    bike.hopFrom = bike.laneF || 0;
    bike.lane = target;
    bike.hopT = 0;
    bike.laneGrace = 0.25;
    runStats.hops += 1;
    bike.juice = 1.08;
    burst(bike.x, bike.y, '#5ef6ff', 4, 0.18);
    buzz(8);
    rx('lane');
  }

  function consumeLanePress() {
    let dir = 0;
    if (touch.upPress > 0) { dir = 1; touch.upPress -= 1; }
    else if (touch.downPress > 0) { dir = -1; touch.downPress -= 1; }
    if (dir) requestLane(dir);
  }

  let ringEaseFrom = -1;
  function ringLead() {
    if (bike.looping || !track || !track.loops) return 0;
    const loops = track.loops;
    for (let i = 0; i < loops.length; i++) {
      const dist = loops[i].entry - bike.x;
      const win = bike.speed * 0.25;
      if (win > 8 && dist > 0 && dist <= win) return 1 - dist / win;
    }
    return 0;
  }
  function stepLanes(dt) {
    if (bike.laneGrace > 0) bike.laneGrace -= dt;
    if (!bike.looping && bike.ringMode === 0 && bike.hopT >= 1) {
      const lead = ringLead();
      if (lead > 0) {
        if (ringEaseFrom < 0) ringEaseFrom = bike.laneF || 0;
        bike.laneF = ringEaseFrom + (1 - ringEaseFrom) * lead;
        return;
      }
      ringEaseFrom = -1;
    }
    if (bike.ringMode === 1) {
      bike.ringT = Math.min(1, bike.ringT + dt / 0.12);
      const u = bike.ringT * bike.ringT * (3 - 2 * bike.ringT);
      bike.laneF = bike.ringFrom + (1 - bike.ringFrom) * u;
      return;
    }
    if (bike.ringMode === 2) {
      bike.ringT = Math.min(1, bike.ringT + dt / 0.12);
      const u = bike.ringT * bike.ringT * (3 - 2 * bike.ringT);
      bike.laneF = 1 + (bike.ringBack - 1) * u;
      if (bike.ringT >= 1) {
        bike.ringMode = 0;
        bike.lane = bike.ringBack;
        bike.laneF = bike.ringBack;
        bike.hopT = 1;
      }
      return;
    }
    if (bike.hopT < 1) {
      bike.hopT = Math.min(1, bike.hopT + dt / 0.16);
      const u = bike.hopT * bike.hopT * (3 - 2 * bike.hopT);
      bike.laneF = bike.hopFrom + ((bike.lane || 0) - bike.hopFrom) * u;
      if (bike.hopT >= 1 && bike.laneQueue) {
        const queued = bike.laneQueue;
        bike.laneQueue = 0;
        requestLane(queued);
      }
    } else {
      bike.laneF = bike.lane || 0;
    }
  }

  function takeAirLane() {
    const dir = bike.airLanePress || 0;
    bike.airLanePress = 0;
    if (!dir) return;
    const actual = (bike.airTime || 0) - (bike.airLaneAt || 0);
    if (Math.abs(actual - (bike.airLanePred || 0)) > 0.1) return;
    const before = bike.lane || 0;
    requestLane(dir);
    if (bike.lane === before) bike.laneGrace = 0;
  }

  function tickBlocks() {
    const blocks = track && track.blocks;
    if (!blocks || !splitT) return;
    while (blockI < blocks.length && bike.x >= blocks[blockI].x1) {
      splitT[blockI] = raceTime - blockT0;
      splitPhys[blockI] = physT - blockP0;
      blockT0 = raceTime;
      blockP0 = physT;
      blockI += 1;
      if (entrySpeed && blockI < entrySpeed.length) entrySpeed[blockI] = bike.speed;
    }
  }
  function resetRunStats() {
    runStats.saved = 0;
    runStats.hops = 0;
    runStats.flips = 0;
    runStats.blocksSuffered = 0;
    runStats.scrapes = 0;
    runStats.padVisits = 0;
    runStats.overheats = 0;
    runStats.dragDist = 0;
    fpsHist.fill(0);
    fpsSamples = 0;
    richTime = 0;
    playTime = 0;
    cpN = 0;
    runOpen = true;
    const faults = runStats.faults;
    faults.gate = 0;
    faults.bar = 0;
    faults.ceiling = 0;
    faults.landing = 0;
    faults.wall = 0;
    faults.rear = 0;
    const n = (track && track.blocks && track.blocks.length) || 1;
    splitT = new Float32Array(n);
    splitPhys = new Float32Array(n);
    entrySpeed = new Float32Array(n);
    blockFaults = new Uint8Array(n);
    blockRival = new Uint8Array(n);
    blockI = 0;
    blockT0 = 0;
    blockP0 = 0;
    physT = 0;
    entrySpeed[0] = bike.speed || 0;
  }
  function fpsMedian() {
    if (!fpsSamples) return 0;
    const mid = (fpsSamples + 1) >> 1;
    let acc = 0;
    for (let i = 0; i < fpsHist.length; i++) {
      acc += fpsHist[i];
      if (acc >= mid) return i;
    }
    return 60;
  }
  function saveRunLog() {
    try {
      localStorage.setItem('volt-alley-runlog', JSON.stringify(runLog));
    } catch (err) {
      if (runLog.length > 20) runLog.splice(0, 20);
      try { localStorage.setItem('volt-alley-runlog', JSON.stringify(runLog)); } catch (err2) { /* full */ }
    }
  }
  function loadRunLog() {
    try {
      const raw = localStorage.getItem('volt-alley-runlog');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.length) return;
      const start = Math.max(0, parsed.length - 60);
      for (let i = start; i < parsed.length; i++) runLog.push(parsed[i]);
    } catch (err) { /* ignore */ }
  }
  function commitRun(finished) {
    if (!runOpen) return;
    tickBlocks();
    const blocks = (track && track.blocks) || [];
    const rows = [];
    for (let i = 0; i < blocks.length; i++) {
      rows.push({
        name: blocks[i].name,
        x0: blocks[i].x0,
        x1: blocks[i].x1,
        sig: !!blocks[i].sig,
        t: splitT ? splitT[i] : 0,
        phys: splitPhys ? splitPhys[i] : 0,
        v0: entrySpeed ? entrySpeed[i] : 0,
        faults: blockFaults ? blockFaults[i] : 0,
        rivalFault: !!(blockRival && blockRival[i]),
      });
    }
    const splitsCp = [];
    for (let i = 0; i < cpN; i++) splitsCp.push(cpTimes[i]);
    const faults = runStats.faults;
    lastRun = {
      v: 14,
      map: currentMap ? currentMap.id : '',
      mode: 'campaign',
      date: new Date().toISOString(),
      stock: !!(garage && garage.stock),
      seed: currentMap ? currentMap.seed : 0,
      theme: currentMap ? currentMap.theme : '',
      finished: !!finished,
      raceTime: raceTime,
      crashes: crashes,
      cleans: cleans,
      saved: runStats.saved,
      hops: runStats.hops,
      blocksSuffered: runStats.blocksSuffered,
      flips: runStats.flips || 0,
      debug: !!debugOn,
      topSpeed: topSpeed,
      overheats: runStats.overheats,
      padVisits: runStats.padVisits,
      scrapes: runStats.scrapes,
      fpsMedian: fpsMedian(),
      richFrac: playTime > 0 ? richTime / playTime : 0,
      faults: { gate: faults.gate, bar: faults.bar, ceiling: faults.ceiling, landing: faults.landing, wall: faults.wall, rear: faults.rear },
      splitsCp: splitsCp,
      blocks: rows,
    };
    if (debugOn) lastRun.dragDist = runStats.dragDist;
    runOpen = false;
    runLog.push(lastRun);
    while (runLog.length > 60) runLog.shift();
    saveRunLog();
  }
  function physics(dt) {
    physT += dt;
    if (bike.rivalImmune > 0) bike.rivalImmune -= dt;
    tickBlocks();
    stepLanes(dt);
    if (bike.crashing) {
      touch.up = false;
      touch.down = false;
      touch.upPress = 0;
      touch.downPress = 0;
    } else {
      consumeLanePress();
    }
    updateRivals(dt);
    if (bike.crashing) {
      raceTime += dt;
      bike.crashT += dt;
      bike.pitch += dt * 7;
      bike.y += dt * 20;
      if (bike.crashT >= 0.82) respawn();
      return;
    }

    const inp = readInput();
    const boosting = inp.turbo && !bike.overheated;
    if (bike.boostArm > 0) bike.boostArm -= dt;
    if (boosting && !bike.wasBoost && bike.boostArm <= 0) {
      rx('boostStart');
      bike.boostArm = 0.5;
    }
    bike.wasBoost = boosting;
    const thrusting = inp.throttle || boosting;

    if (bike.overheated) {
      bike.heat = Math.max(0, bike.heat - TUNE.heatLock * dt);
      if (bike.heat <= TUNE.heatClear) bike.overheated = false;
    } else if (boosting) {
      bike.heat += TUNE.heatOn * (tuningOn('vent') ? 0.82 : 1) * dt;
      if (bike.heat >= 1) {
        bike.heat = 1;
        bike.overheated = true;
        runStats.overheats += 1;
        shake = Math.max(shake, 0.55);
        audio.overheat();
        buzz(32);
        toast('OVERHEAT', 'bad');
        rx('overheat');
      }
    } else {
      bike.heat = Math.max(0, bike.heat - TUNE.heatOff * (tuningOn('vent') ? 1.28 : 1) * dt);
    }

    if (bike.padT > 0) bike.padT -= dt;
    const padOn = bike.padT > 0;
    let cap = bike.overheated ? TUNE.heatSpeed : (boosting ? TUNE.turboSpeed : TUNE.maxSpeed);
    if (padOn) cap = TUNE.turboSpeed;
    if (bike.speed > cap) {
      bike.speed += (cap - bike.speed) * Math.min(1, dt * 4.5);
    } else if (thrusting || padOn) {
      const a = ((boosting || padOn) ? TUNE.turboAccel : TUNE.accel) * (bike.air ? 0.45 : 1);
      bike.speed += a * dt;
      if (bike.speed > cap) bike.speed = cap;
    } else {
      bike.speed -= TUNE.coast * dt;
    }
    if (!bike.air) {
      const climb = queryGround(bike.x).slope;
      const climbCut = tuningOn('coil') ? 0.8 : 1;
      bike.speed -= Math.max(0, climb) * 110 * climbCut * dt;
      bike.speed += Math.max(0, -climb) * 46 * dt;
    }
    bike.speed -= bike.speed * TUNE.drag * dt;
    bike.inDrag = 0;
    if (!bike.air && !bike.looping && track && track.drags) {
      const dl = hitLaneBike();
      const drags = track.drags;
      for (let di = 0; di < drags.length; di++) {
        const d = drags[di];
        if (bike.x >= d.x0 && bike.x <= d.x1 && laneMatches(d.lane, dl)) {
          bike.speed -= bike.speed * d.k * dt;
          bike.inDrag = d.k;
          if (debugOn) runStats.dragDist += bike.speed * dt;
          break;
        }
      }
    }
    if (!bike.air && !bike.looping && track && track.boosts) {
      const dl = hitLaneBike();
      const pads = track.boosts;
      for (let pi = 0; pi < pads.length; pi++) {
        const p = pads[pi];
        if (bike.x >= p.x && bike.x <= p.x + p.len && laneMatches(p.lane, dl)) {
          if (!(bike.padT > 0)) {
            try { audio.pad(); } catch (err) { /* optional */ }
          }
          bike.padT = TUNE.padTime;
          break;
        }
      }
    }
    if (bike.speed < 0) bike.speed = 0;
    if (debugOn && bike.debugLock) bike.speed = bike.debugSpeed;
    if (bike.speed > topSpeed) topSpeed = bike.speed;

    raceTime += dt;
    bike.prevX = bike.x;
    if (bike.looping) {
      advanceLoop(dt);
      if (bike.looping) {
        recordGhost(dt);
        return;
      }
    } else {
      bike.x += bike.speed * dt;
      if (bike.x < 80) bike.x = 80;
      tryEnterLoop(inp);
      if (bike.looping) {
        recordGhost(dt);
        return;
      }
    }

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

    hitCeiling();
    if (bike.invuln > 0) bike.invuln -= dt;
    if (bike.cleanFlash > 0) bike.cleanFlash -= dt;
    if (bike.juice > 1) bike.juice += (1 - bike.juice) * Math.min(1, dt * 8);
    collide();

    let onPad = false;
    if (!bike.crashing && !bike.air) {
      const pads = track.pads;
      for (let i = 0; i < pads.length; i++) {
        const p = pads[i];
        if (!laneMatches(p.lane, hitLaneBike())) continue;
        if (bike.x >= p.x && bike.x <= p.x + p.len) {
          onPad = true;
          break;
        }
      }
    }
    if (onPad) {
      if (!bike.onPad) {
        runStats.padVisits += 1;
        audio.cool();
        toast('HEAT DUMP', 'good');
        rx('pad');
      }
      bike.heat = 0;
      bike.overheated = false;
    }
    bike.onPad = onPad;

    spawnT += dt;
    if (spawnT > 0.04 && bike.speed > 180 && !bike.crashing && !bike.air) {
      spawnT = 0;
      if (fxRich()) {
        const spark = bike.inDrag ? PAL.drag : (boosting ? '#ff4ad0' : ((track && track.accent) || '#5ef6ff'));
        burst(bike.x - 28, bike.y + 4, spark, 1, 0.22);
      }
    }
    if (bike.speed > 240 && !bike.crashing) {
      const prev = trLen ? trX[(trHead + TR_N - 1) % TR_N] : -1e9;
      if (!trLen || bike.x - prev > 10) {
        const wheels = wheelPoints(bike);
        trX[trHead] = wheels.rear.x;
        trY[trHead] = wheels.rear.y;
        trFX[trHead] = wheels.front.x;
        trFY[trHead] = wheels.front.y;
        trL[trHead] = bike.laneF || 0;
        trHead = (trHead + 1) % TR_N;
        const cap = fxRich() ? 18 : 8;
        if (trLen < cap) trLen += 1;
        else if (trLen > cap) trLen = cap;
      }
    } else if (trLen) {
      trLen -= 1;
    }

    if (!bike.crashing && track && track.checkpoints) {
      for (let i = 0; i < track.checkpoints.length; i++) {
        const cp = track.checkpoints[i];
        if (bike.prevX < cp && bike.x >= cp && cp > 80) {
          if (cpN < cpTimes.length) {
            cpTimes[cpN] = raceTime;
            cpN += 1;
          }
          try { audio.checkpoint(); } catch (err) { /* ignore */ }
          buzz([8, 20, 8]);
          rx('checkpoint');
        }
      }
    }
    if (!bike.crashing) collectCoins();
    if (bg && bg.theme === 'veil') {
      let maxR = rivals[0].x;
      if (rivals[1].x > maxR) maxR = rivals[1].x;
      if (rivals[2].x > maxR) maxR = rivals[2].x;
      const lead = bike.x >= maxR;
      if (lead && !bike.wasLead) rx('lead');
      bike.wasLead = lead;
    }
    if (bike.loopSkip && bike.x > bike.loopSkip.exit + 80) bike.loopSkip = null;
    recordGhost(dt);
    if (!bike.crashing && bike.x >= finishX) finishRace();
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
    drag: '#3ce6b0',
    boost: '#fff1a8',
  };

  let bg = null;

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

  function fxRich() {
    return richOn && !reduceMotion;
  }
  function stepRich(dt) {
    if (reduceMotion) {
      if (richOn) { richOn = false; richFlips += 1; }
      richLow = 0;
      richHigh = 0;
      return;
    }
    if (richOn) {
      richHigh = 0;
      if (fpsSmoothed < 48) richLow += dt;
      else richLow = 0;
      if (richLow >= 1) { richOn = false; richFlips += 1; richLow = 0; }
    } else {
      richLow = 0;
      if (fpsSmoothed > 56) richHigh += dt;
      else richHigh = 0;
      if (richHigh >= 2.5) { richOn = true; richFlips += 1; richHigh = 0; }
    }
  }

  const hexACache = Object.create(null);
  function hexA(hex, a) {
    const q = (a * 32 + 0.5) | 0;
    let bucket = hexACache[hex];
    if (!bucket) bucket = hexACache[hex] = Object.create(null);
    const hit = bucket[q];
    if (hit) return hit;
    let h = hex && hex.charAt(0) === '#' ? hex.slice(1) : 'ffffff';
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    const n = parseInt(h, 16) || 0;
    const built = 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + (q / 32) + ')';
    bucket[q] = built;
    return built;
  }

  const POLY_FAIR = [[-42, -6], [-12, -6], [-4, 4], [-14, 6], [-30, 0]];
  const POLY_NOSE = [[-50, -10], [-44, -14], [-24, -14], [-18, -9], [-6, -10], [-12, -5], [-40, -6]];
  const POLY_BROW = [[-24, -14], [-10, -12.5], [-8, -10.5], [-20, -11]];
  const POLY_TANK = [[-8, -11], [4, -17], [16, -15], [13, -8], [-4, -8]];
  const POLY_SHELL = [[2, -7], [12, -15], [20, -21], [30, -20], [27, -15], [41, -8.5], [33, -4], [16, 1], [7, 9], [4, 0]];
  const POLY_CHEEK = [[8, -3], [22, -8], [33, -4], [16, 1], [7, 9]];
  const POLY_TIP = [[20, -21], [30, -20], [27, -15], [19, -17]];
  function poly(pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i) ctx.lineTo(pts[i][0], pts[i][1]);
      else ctx.moveTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
  }

  const glowRings = [];
  const glowDots = [];
  function glowRing(color, r, width, blur) {
    const rq = Math.round(r);
    const wq = Math.round(width * 10);
    const bq = Math.round(blur * 10);
    for (let i = 0; i < glowRings.length; i++) {
      const row = glowRings[i];
      if (row.color === color && row.r === rq && row.w === wq && row.b === bq) return row.spr;
    }
    allocSites.glowRing += 1;
    const pad = blur * 2 + width;
    const size = Math.ceil((rq + pad) * 2);
    const c = document.createElement('canvas');
    c.width = size * 2;
    c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    g.translate(size / 2, size / 2);
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.strokeStyle = color;
    g.lineWidth = width;
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.arc(0, 0, rq, 0, Math.PI * 2);
      g.stroke();
    }
    g.shadowBlur = 0;
    g.strokeStyle = '#ffffff';
    g.lineWidth = width * 0.5;
    g.beginPath();
    g.arc(0, 0, rq, 0, Math.PI * 2);
    g.stroke();
    const spr = { c: c, size: size };
    glowRings.push({ color: color, r: rq, w: wq, b: bq, spr: spr });
    return spr;
  }
  function glowDot(color, r) {
    const rq = Math.round(r);
    for (let i = 0; i < glowDots.length; i++) {
      const row = glowDots[i];
      if (row.color === color && row.r === rq) return row.spr;
    }
    allocSites.glowDot += 1;
    const size = Math.ceil(rq * 2);
    const c = document.createElement('canvas');
    c.width = size * 2;
    c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    const rg = g.createRadialGradient(rq, rq, 0, rq, rq, rq);
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(0.18, color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, size, size);
    const spr = { c: c, size: size };
    glowDots.push({ color: color, r: rq, spr: spr });
    return spr;
  }
  function stamp(spr, x, y) {
    ctx.drawImage(spr.c, x - spr.size / 2, y - spr.size / 2, spr.size, spr.size);
  }

  const wpRear = { x: 0, y: 0 };
  const wpFront = { x: 0, y: 0 };
  const wpPair = { rear: wpRear, front: wpFront };
  function wheelPoints(actor) {
    const sc = actor.scale || 1;
    const s = 1.35 * (actor.juice || 1) * sc;
    const p = actor.pitch || 0;
    const lift = 15 * 1.35 * sc;
    const ox = actor.x - Math.sin(p) * lift;
    const oy = actor.y + Math.cos(p) * lift;
    wpRear.x = ox + (-36 * Math.cos(p)) * s;
    wpRear.y = oy + (-36 * Math.sin(p)) * s;
    wpFront.x = ox + (32 * Math.cos(p) + 2 * Math.sin(p)) * s;
    wpFront.y = oy + (32 * Math.sin(p) - 2 * Math.cos(p)) * s;
    return wpPair;
  }

  // Per-map backgrounds. One map resident at a time. No per-frame shadowBlur.
  function bgMakeCanvas(w, h) {
    const c = (typeof document !== 'undefined' && document.createElement) ? document.createElement('canvas') : null;
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function bgRand(seed) { // mulberry32 (same as game.js)
    let a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const bgACache = Object.create(null);
  function bgA(hex, a) {
    const q = (a * 32 + 0.5) | 0;
    let bucket = bgACache[hex];
    if (!bucket) bucket = bgACache[hex] = Object.create(null);
    const hit = bucket[q];
    if (hit) return hit;
    const n = parseInt(String(hex || '#ffffff').slice(1), 16) || 0;
    const built = 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + (q / 32) + ')';
    bucket[q] = built;
    return built;
  }

  // ---------------------------------------------------------------------------
  // Per-theme config. Keys are the literal `theme` values in js/maps.js.
  const BG_THEMES = {
    pier: {   // NITE PIER  accent '#5ef6ff'
      seed: 101,
      sky: [[0, '#02060f'], [0.45, '#041a2e'], [0.78, '#0a3550'], [1, '#1b6b82']],
      base: '#02060f', accent: '#5ef6ff', warm: '#ffe08a', hot: '#ff4a5a',
      // name, parallax, tile width (CSS px), height as fraction of hy, bake scale cap
      layers: [['headland', 0.04, 1300, 0.42, 1], ['cranes', 0.10, 1180, 0.80, 1], ['towers', 0.20, 1060, 0.70, 2], ['boardwalk', 0.36, 980, 0.40, 2]],
      near: { kind: 'sea', parallax: 0.56, w: 900, fill: '#031322', edge: '#ffd27a', top: 0.86 },
      ambient: { glints: 22, rise: 0, fall: 0, motes: 0 }, beams: 'lighthouse', bolt: [9, 15], boltColor: '#bff6ff',
    },
    spine: {  // AMP SPINE  accent '#ff4ad0'
      seed: 202,
      sky: [[0, '#06010b'], [0.40, '#170628'], [0.72, '#3a0c4a'], [1, '#7a1866']],
      base: '#06010b', accent: '#ff4ad0', warm: '#ffb347', cool: '#5ef6ff',
      layers: [['ridge', 0.05, 1320, 0.62, 1], ['speakers', 0.12, 1140, 0.78, 1], ['signs', 0.24, 1040, 0.74, 2], ['pylons', 0.40, 960, 0.66, 2]],
      near: { kind: 'grid', parallax: 0.6, w: 880, fill: '#0c0216', edge: '#7af6ff', top: 0.88 },
      ambient: { glints: 0, rise: 18, fall: 0, motes: 0 }, beams: 'lasers', eq: 14, bolt: [3, 7], boltColor: '#ffd6f2',
    },
    cut: {    // STATIC CUT  accent '#ffe08a'
      seed: 303,
      sky: [[0, '#040302'], [0.42, '#141006'], [0.75, '#2e220c'], [1, '#5a3f14']],
      base: '#040302', accent: '#ffe08a', warm: '#ffb347', cool: '#9ae7ff', hot: '#ff4a5a',
      layers: [['storm', 0.04, 1400, 0.55, 1], ['mesas', 0.09, 1200, 0.60, 1], ['lattice', 0.20, 1080, 0.86, 2], ['substation', 0.38, 960, 0.42, 2]],
      near: { kind: 'rock', parallax: 0.58, w: 900, fill: '#0a0704', edge: '#ff6a4a', top: 0.87 },
      ambient: { glints: 0, rise: 0, fall: 40, motes: 0, fallKind: 'spark' }, arcs: true, bolt: [1.6, 3.6], boltColor: '#fff4c8',
    },
    well: {   // VOID WELL  accent '#b08cff'
      seed: 404,
      sky: [[0, '#010005'], [0.45, '#07031a'], [0.78, '#140832'], [1, '#2a1458']],
      base: '#010005', accent: '#b08cff', pale: '#e0d0ff', cool: '#5ef6ff',
      layers: [['ring', 0.02, 1500, 1.0, 1], ['leaning', 0.08, 1200, 0.62, 1], ['arches', 0.18, 1080, 0.50, 2], ['crystals', 0.34, 960, 0.40, 2]],
      near: { kind: 'lip', parallax: 0.55, w: 900, fill: '#06021a', edge: '#5ef6ff', top: 0.88 },
      ambient: { glints: 0, rise: 0, fall: 0, motes: 30 }, shards: 5, bolt: null, ringPulse: true,
    },
    veil: {   // ASH VEIL  accent '#ff6a4a'
      seed: 505,
      sky: [[0, '#050202'], [0.42, '#160806'], [0.74, '#34100c'], [1, '#7a2414']],
      base: '#050202', accent: '#ff6a4a', warm: '#ffb347', ash: '#8a7a78',
      layers: [['volcano', 0.03, 1500, 1.0, 1], ['plume', 0.08, 1260, 0.70, 1], ['ruins', 0.20, 1080, 0.74, 2], ['girders', 0.38, 960, 0.52, 2]],
      near: { kind: 'ashdune', parallax: 0.58, w: 900, fill: '#0e0605', edge: '#ffe08a', top: 0.87 },
      ambient: { glints: 0, rise: 22, fall: 34, motes: 0, fallKind: 'ash' }, flare: true, bolt: [6, 11], boltColor: '#ffb0a0',
    },
  };

  // ---------------------------------------------------------------------------
  // Glow sprites: built once per bg (radial gradients, no shadowBlur), drawn with 'lighter'.
  function bgGlowDot(bg, color, r) {
    let bucket = bg.glow[color];
    if (!bucket) {
      bucket = Object.create(null);
      bg.glow[color] = bucket;
    }
    const hit = bucket[r];
    if (hit) return hit;
    const s = bg.scale, c = bgMakeCanvas(r * 2 * s, r * 2 * s), g = c.getContext('2d');
    const rg = g.createRadialGradient(r * s, r * s, 0, r * s, r * s, r * s);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(0.15, bgA(color, 0.85)); rg.addColorStop(0.45, bgA(color, 0.25)); rg.addColorStop(1, bgA(color, 0));
    g.fillStyle = rg; g.fillRect(0, 0, c.width, c.height);
    return (bucket[r] = { c: c, r: r });
  }
  function bgStamp(ctx, spr, x, y, scale) { const r = spr.r * (scale || 1); ctx.drawImage(spr.c, x - r, y - r, r * 2, r * 2); }
  // cone sprite for beams (pointing +x), drawn rotated
  function bgCone(bg, color, len, spread) {
    const key = 'cone' + color + len; if (bg.glow[key]) return bg.glow[key];
    const s = bg.scale, c = bgMakeCanvas(len * s, spread * 2 * s), g = c.getContext('2d');
    g.scale(s, s);
    const lg = g.createLinearGradient(0, 0, len, 0); lg.addColorStop(0, bgA(color, 0.55)); lg.addColorStop(1, bgA(color, 0));
    g.fillStyle = lg; g.beginPath(); g.moveTo(0, spread - 2); g.lineTo(len, 0); g.lineTo(len, spread * 2); g.lineTo(0, spread + 2); g.closePath(); g.fill();
    return (bg.glow[key] = { c, len, spread });
  }

  // ---------------------------------------------------------------------------
  // Silhouette painters. g = 2D context of a strip already scaled to CSS px. w,h = strip CSS size; ground = h.
  const P = {};
  function bgPoly(g, pts) { g.beginPath(); for (let i = 0; i < pts.length; i++) i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]); g.closePath(); }
  function tileable(fn, w) { fn(0); } // overflow is wrapped once by bakeSeam, not painted again here
  function windows(g, x, y, w, h, color, rand, density, step) {
    g.fillStyle = color; step = step || 6;
    for (let yy = y + 6; yy < y + h - 4; yy += step) for (let xx = x + 4; xx < x + w - 5; xx += 5) if (rand() < density) g.fillRect(xx, yy, 2, 2);
  }
  function edgeLine(g, pts, color, wdt) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.strokeStyle = color; g.lineWidth = wdt || 1.5; g.stroke(); }
  function bakedGlow(g, x, y, r, color, a) { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, bgA(color, a)); rg.addColorStop(1, bgA(color, 0)); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }

  // ---- NITE PIER ----
  P.headland = (g, w, h, T, rand, L) => {
    const pts = [[0, h]]; for (let x = 0; x <= w; x += 20) pts.push([x, h - 22 - 18 * Math.sin(x / w * Math.PI * 2) - 10 * Math.sin(x / w * Math.PI * 6)]); pts.push([w, h]);
    bgPoly(g, pts); g.fillStyle = '#05182a'; g.fill(); edgeLine(g, pts.slice(1, -1), '#0f3a52', 1.5);
    // lighthouse (beam anchor recorded)
    const lx = w * 0.62, ly = h - 30 - 18 * Math.sin(0.62 * Math.PI * 2) - 10 * Math.sin(0.62 * Math.PI * 6);
    bgPoly(g, [[lx - 6, ly + 4], [lx - 3, ly - 44], [lx + 3, ly - 44], [lx + 6, ly + 4]]); g.fillStyle = '#0a2a40'; g.fill();
    g.fillStyle = '#d8f6ff'; g.fillRect(lx - 4, ly - 52, 8, 7); bakedGlow(g, lx, ly - 48, 16, '#bff6ff', 0.6);
    L.anchors.push({ kind: 'lighthouse', x: lx, y: ly - 48 });
  };
  P.cranes = (g, w, h, T, rand, L) => {
    let x = 20;
    while (x < w - 60) {
      if (rand() < 0.5) { // container stacks
        const cols = ['#0d2a40', '#123247', '#0a2236', '#163a50'];
        const n = 3 + (rand() * 4 | 0);
        for (let i = 0; i < n; i++) for (let k = 0; k < 1 + (rand() * 3 | 0); k++) { g.fillStyle = cols[(i + k) % 4]; g.fillRect(x + i * 15, h - 9 - k * 9, 14, 8); }
        x += n * 15 + 20;
      } else { // gantry crane: legs + boom pointing at the water
        const ch = h * (0.55 + rand() * 0.3), top = h - ch;
        g.strokeStyle = '#0c2840'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x, h); g.lineTo(x + 6, top + 14); g.moveTo(x + 26, h); g.lineTo(x + 20, top + 14); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(x - 20, top + 14); g.lineTo(x + 70, top + 14); g.stroke();
        g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 13, top); g.lineTo(x - 20, top + 14); g.moveTo(x + 13, top); g.lineTo(x + 70, top + 14); g.moveTo(x + 13, top); g.lineTo(x + 13, top + 14); g.stroke();
        g.strokeStyle = '#1d5a78'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 20, top + 13); g.lineTo(x + 70, top + 13); g.stroke();
        L.anchors.push({ kind: 'blink', x: x + 13, y: top - 1, color: T.hot, phase: rand() * 6 }); L.anchors.push({ kind: 'blink', x: x + 69, y: top + 13, color: T.hot, phase: rand() * 6 });
        x += 100 + rand() * 40;
      }
    }
  };
  P.towers = (g, w, h, T, rand) => {
    let x = 0;
    while (x < w - 20) {
      const bw = 26 + rand() * 30, bh = h * (0.35 + rand() * 0.6), top = h - bh;
      g.fillStyle = '#0a1828'; g.fillRect(x, top, bw, bh);
      if (rand() < 0.4) { g.fillRect(x + bw * 0.4, top - 14, 2, 14); }
      g.fillStyle = bgA('#5ef6ff', 0.9); g.fillRect(x, top, bw, 1.5);
      windows(g, x, top, bw, bh, bgA(rand() < 0.75 ? '#5ef6ff' : '#ffe08a', 0.75), rand, 0.28);
      x += bw + 4 + rand() * 14;
    }
  };
  P.boardwalk = (g, w, h, T, rand) => {
    const deck = h - 16;
    g.fillStyle = '#071626'; g.fillRect(0, deck, w, 5);
    for (let x = 6; x < w; x += 22) { g.fillRect(x, deck, 3, 16); }
    g.strokeStyle = '#0f3a52'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, deck - 8); g.lineTo(w, deck - 8); g.stroke(); // rail
    const posts = []; for (let x = 30; x < w; x += 120) posts.push(x);
    posts.forEach(x => { g.fillStyle = '#0a2033'; g.fillRect(x - 1.5, deck - 42, 3, 42); g.fillRect(x - 6, deck - 44, 12, 3); bakedGlow(g, x, deck - 40, 22, '#ffe08a', 0.45); g.fillStyle = '#fff3c4'; g.fillRect(x - 3, deck - 42, 6, 2); });
    // string lights between posts (catenary)
    for (let i = 0; i < posts.length; i++) {
      const a = posts[i], b = (posts[i + 1] || posts[0] + w);
      for (let k = 1; k < 12; k++) { const u = k / 12, x = a + (b - a) * u, y = deck - 40 + Math.sin(u * Math.PI) * 12; g.fillStyle = k % 3 ? '#ffe08a' : '#5ef6ff'; g.fillRect(x - 1, y - 1, 2.2, 2.2); bakedGlow(g, x, y, 5, k % 3 ? '#ffe08a' : '#5ef6ff', 0.35); }
    }
  };
  // ---- AMP SPINE ----
  P.ridge = (g, w, h, T, rand) => {
    // Integer cycles so the silhouette meets itself at the tile edge.
    const n = Math.max(1, Math.round(w / 34));
    const pts = [[0, h]];
    for (let i = 0; i <= n; i++) {
      const x = w * i / n;
      const v = h * (0.25 + 0.55 * Math.abs(Math.sin((i / n) * Math.PI * 3)));
      if (i === n) { pts.push([w, h - v * 0.6]); break; }
      const dx = w / n;
      pts.push([x, h - v * 0.6]);
      pts.push([x + dx * (14 / 34), h - v]);
      pts.push([x + dx * (26 / 34), h - v * 0.7]);
    }
    pts.push([w, h]);
    bgPoly(g, pts); g.fillStyle = '#1a0628'; g.fill(); edgeLine(g, pts.slice(1, -1), bgA('#ff4ad0', 0.55), 1.4);
  };
  P.speakers = (g, w, h, T, rand, L) => {
    let x = 10;
    while (x < w - 50) {
      const bw = 34 + rand() * 16, stacks = 2 + (rand() * 3 | 0), cell = bw;
      for (let k = 0; k < stacks; k++) {
        const y = h - (k + 1) * cell;
        g.fillStyle = '#12051e'; g.fillRect(x, y, bw, cell - 2); g.strokeStyle = '#2a0c3e'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, bw - 1, cell - 3);
        g.beginPath(); g.arc(x + bw / 2, y + cell / 2, cell * 0.32, 0, Math.PI * 2); g.strokeStyle = '#6a1878'; g.lineWidth = 2; g.stroke();
        g.beginPath(); g.arc(x + bw / 2, y + cell / 2, cell * 0.1, 0, Math.PI * 2); g.fillStyle = '#ff4ad0'; g.fill();
      }
      L.anchors.push({ kind: 'laser', x: x + bw / 2, y: h - stacks * cell, color: rand() < 0.5 ? '#ff4ad0' : '#5ef6ff', phase: rand() * 6 });
      x += bw + 50 + rand() * 80;
    }
  };
  P.signs = (g, w, h, T, rand) => {
    let x = 0; const edges = ['#ff4ad0', '#5ef6ff', '#ffb347'];
    while (x < w - 20) {
      const bw = 22 + rand() * 22, bh = h * (0.3 + rand() * 0.6), top = h - bh;
      g.fillStyle = '#14061f'; bgPoly(g, [[x, h], [x + bw * 0.2, top + 8], [x + bw * 0.5, top], [x + bw * 0.8, top + 8], [x + bw, h]]); g.fill();
      g.strokeStyle = edges[(rand() * 3) | 0]; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + bw * 0.2, top + 8); g.lineTo(x + bw * 0.5, top); g.stroke();
      windows(g, x + bw * 0.25, top + 10, bw * 0.5, bh - 10, bgA('#5ef6ff', 0.7), rand, 0.22, 7);
      if (rand() < 0.45) { const c = edges[(rand() * 3) | 0], sw = Math.min(30, bw), sy = top + bh * 0.3; g.fillStyle = '#1a0828'; g.fillRect(x + (bw - sw) / 2, sy, sw, 12); g.strokeStyle = c; g.lineWidth = 1.5; g.strokeRect(x + (bw - sw) / 2, sy, sw, 12); g.fillStyle = c; g.fillRect(x + (bw - sw) / 2 + 4, sy + 5, sw - 8, 2); }
      x += bw + 3 + rand() * 10;
    }
  };
  P.pylons = (g, w, h, T, rand, L) => {
    const tops = []; for (let x = 40; x < w; x += 190) { const top = h * 0.12; tops.push([x, top]); g.fillStyle = '#0e0318'; bgPoly(g, [[x - 9, h], [x - 2, top], [x + 2, top], [x + 9, h]]); g.fill(); g.fillRect(x - 16, top + 4, 32, 3); bakedGlow(g, x, top, 8, '#ff4ad0', 0.6); }
    g.strokeStyle = bgA('#ff4ad0', 0.35); g.lineWidth = 1;
    for (let i = 0; i < tops.length; i++) { const a = tops[i], b = tops[i + 1] || [tops[0][0] + w, tops[0][1]]; for (const off of [-14, 14]) { g.beginPath(); g.moveTo(a[0] + off, a[1] + 5); g.quadraticCurveTo((a[0] + b[0]) / 2, a[1] + 34, b[0] + off, b[1] + 5); g.stroke(); } }
    // stage frame for EQ bars between pylons
    const sx = tops[1] ? (tops[0][0] + tops[1][0]) / 2 : w / 2;
    g.fillStyle = '#0e0318'; g.fillRect(sx - 60, h - 10, 120, 10); L.anchors.push({ kind: 'eq', x: sx, y: h - 10 });
  };
  // ---- STATIC CUT ----
  P.storm = (g, w, h, T, rand) => {
    for (let i = 0; i < 26; i++) {
      const x = rand() * w, y = h * (0.2 + rand() * 0.5), rx = 50 + rand() * 90, ry = 14 + rand() * 18;
      tileable(o => { g.beginPath(); g.ellipse(x + o, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = '#1a140a'; g.fill();
        g.beginPath(); g.ellipse(x + o, y + ry * 0.4, rx * 0.8, ry * 0.4, 0, 0, Math.PI); g.strokeStyle = bgA('#ffb347', 0.18); g.lineWidth = 2; g.stroke(); }, w);
    }
  };
  P.mesas = (g, w, h, T, rand) => {
    let x = -20;
    while (x < w + 20) {
      const bw = 90 + rand() * 120, top = h * (0.25 + rand() * 0.45);
      bgPoly(g, [[x, h], [x + 14, top + 6], [x + 22, top], [x + bw - 22, top], [x + bw - 10, top + 8], [x + bw, h]]); g.fillStyle = '#20160a'; g.fill();
      g.strokeStyle = '#3a2a12'; g.lineWidth = 1; for (let y = top + 8; y < h; y += 7) { g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + bw - 12, y + (rand() - 0.5) * 3); g.stroke(); }
      g.strokeStyle = bgA('#ffe08a', 0.35); g.beginPath(); g.moveTo(x + 22, top); g.lineTo(x + bw - 22, top); g.stroke();
      x += bw - 10 + rand() * 30;
    }
  };
  P.lattice = (g, w, h, T, rand, L) => {
    const tops = [];
    for (let x = 50; x < w; x += 160 + (rand() * 40 | 0)) {
      const th = h * (0.7 + rand() * 0.25), top = h - th; tops.push([x, top]);
      g.strokeStyle = '#140e06'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - 14, h); g.lineTo(x - 3, top); g.lineTo(x + 3, top); g.lineTo(x + 14, h); g.stroke();
      g.lineWidth = 1; for (let y = top + 10; y < h; y += 12) { const k = (y - top) / th, hw = 3 + 11 * k; g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x + hw, y + 12); g.moveTo(x + hw, y); g.lineTo(x - hw, y + 12); g.stroke(); }
      g.lineWidth = 2; g.beginPath(); g.moveTo(x - 20, top + 10); g.lineTo(x + 20, top + 10); g.moveTo(x - 14, top + 22); g.lineTo(x + 14, top + 22); g.stroke();
      L.anchors.push({ kind: 'blink', x, y: top - 2, color: '#ff4a5a', phase: rand() * 6 });
      L.anchors.push({ kind: 'tip', x: x - 20, y: top + 10 }); L.anchors.push({ kind: 'tip', x: x + 20, y: top + 10 });
    }
    g.strokeStyle = bgA('#ffe08a', 0.22); g.lineWidth = 0.8;
    for (let i = 0; i < tops.length; i++) { const a = tops[i], b = tops[i + 1] || [tops[0][0] + w, tops[0][1]]; for (const off of [-20, 20]) { g.beginPath(); g.moveTo(a[0] + off, a[1] + 10); g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 30, b[0] + off, b[1] + 10); g.stroke(); } }
  };
  P.substation = (g, w, h, T, rand) => {
    g.strokeStyle = '#2a2010'; g.lineWidth = 1; for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, h - 14); g.lineTo(x, h); g.stroke(); } g.beginPath(); g.moveTo(0, h - 14); g.lineTo(w, h - 14); g.stroke();
    for (let x = 20; x < w; x += 70 + rand() * 50) {
      g.fillStyle = '#100b05'; g.fillRect(x, h - 26, 26, 26); g.fillRect(x + 4, h - 34, 4, 8); g.fillRect(x + 18, h - 34, 4, 8);
      g.fillStyle = bgA('#ffe08a', 0.7); g.fillRect(x + 3, h - 20, 20, 1.5);
    }
    for (let x = 60; x < w; x += 200) { g.fillStyle = '#100b05'; g.fillRect(x, h - 50, 2, 50); g.fillRect(x, h - 50, 10, 2); bakedGlow(g, x + 9, h - 47, 26, '#ffb347', 0.5); }
  };
  // ---- VOID WELL ----
  P.ring = (g, w, h, T, rand, L) => {
    const cx = w * 0.45, cy = h * 0.56, rx = h * 1.1, ry = h * 0.36;
    // baked glow via concentric strokes (build time only)
    for (let i = 8; i >= 1; i--) { g.beginPath(); g.ellipse(cx, cy, rx + i * 2, ry + i * 1.2, -0.08, 0, Math.PI * 2); g.strokeStyle = bgA('#b08cff', 0.05); g.lineWidth = i * 3; g.stroke(); }
    g.beginPath(); g.ellipse(cx, cy, rx, ry, -0.08, 0, Math.PI * 2); g.strokeStyle = '#d6c4ff'; g.lineWidth = 2.5; g.stroke();
    g.beginPath(); g.ellipse(cx, cy, rx * 0.9, ry * 0.86, -0.08, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill();
    g.beginPath(); g.ellipse(cx, cy, rx * 0.9, ry * 0.86, -0.08, Math.PI * 1.05, Math.PI * 1.95); g.strokeStyle = bgA('#5ef6ff', 0.5); g.lineWidth = 1.2; g.stroke();
    L.anchors.push({ kind: 'well', x: cx, y: cy, rx, ry });
  };
  P.leaning = (g, w, h, T, rand) => {
    let x = 0;
    while (x < w - 20) {
      const bw = 18 + rand() * 18, bh = h * (0.35 + rand() * 0.55), lean = (rand() - 0.5) * 0.35;
      g.save(); g.translate(x + bw / 2, h); g.rotate(lean);
      g.fillStyle = '#0c0620'; g.fillRect(-bw / 2, -bh, bw, bh);
      bgPoly(g, [[-bw / 2, -bh], [bw / 2, -bh], [bw / 2, -bh + 6], [0, -bh - 6 + rand() * 8], [-bw / 2, -bh + 4]]); g.fill();
      g.fillStyle = bgA('#b08cff', 0.8); g.fillRect(-bw / 2, -bh, 1.5, bh);
      for (let y = -bh + 8; y < -6; y += 9) if (rand() < 0.3) { g.fillStyle = bgA('#e0d0ff', 0.6); g.fillRect(-bw / 2 + 4, y, 2, 2); }
      g.restore(); x += bw + 10 + rand() * 30;
    }
  };
  P.arches = (g, w, h, T, rand) => {
    for (let x = 40; x < w; x += 150 + rand() * 60) {
      const r = 18 + rand() * 18, base = h;
      g.beginPath(); g.ellipse(x, base, r, r * 1.5, 0, Math.PI, Math.PI * 2); g.strokeStyle = '#100828'; g.lineWidth = 9; g.stroke();
      g.strokeStyle = bgA('#b08cff', 0.9); g.lineWidth = 1.4; g.stroke();
      for (let k = 0; k < 5; k++) { const a = Math.PI + k / 4 * Math.PI; bakedGlow(g, x + Math.cos(a) * r, base + Math.sin(a) * r * 1.5, 6, '#b08cff', 0.6); }
    }
  };
  P.crystals = (g, w, h, T, rand) => {
    const pts = [[0, h]]; for (let x = 0; x <= w; x += 14) pts.push([x, h - 8 - 5 * (1 + Math.sin((x / w) * Math.PI * 8))]); pts.push([w, h]); bgPoly(g, pts); g.fillStyle = '#0a0420'; g.fill();
    for (let x = 20; x < w; x += 40 + rand() * 60) for (let k = 0; k < 3; k++) {
      const cx = x + k * 6, ch = 10 + rand() * 18, lean = (k - 1) * 0.3;
      g.save(); g.translate(cx, h - 10); g.rotate(lean); bgPoly(g, [[-3, 0], [0, -ch], [3, 0]]); g.fillStyle = '#3a1a6a'; g.fill(); g.strokeStyle = '#e0d0ff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -ch); g.lineTo(-2, -2); g.stroke(); g.restore();
      bakedGlow(g, cx, h - 10 - ch * 0.6, 8, '#b08cff', 0.35);
    }
  };
  // ---- ASH VEIL ----
  P.volcano = (g, w, h, T, rand, L) => {
    const cx = w * 0.4, top = h * 0.18;
    bakedGlow(g, cx, top, 70, '#ff6a4a', 0.35);
    bgPoly(g, [[cx - 260, h], [cx - 26, top + 4], [cx - 12, top + 10], [cx + 12, top + 8], [cx + 28, top], [cx + 280, h]]); g.fillStyle = '#1a0806'; g.fill();
    g.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const sx = cx - 16 + i * 7; let x = sx, y = top + 8; g.beginPath(); g.moveTo(x, y); while (y < h - 10) { x += (rand() - 0.5) * 10 + (i - 2.5) * 2.2; y += 8 + rand() * 6; g.lineTo(x, y); } g.strokeStyle = bgA('#ff6a4a', 0.35 + rand() * 0.4); g.stroke(); }
    L.anchors.push({ kind: 'crater', x: cx, y: top + 4 });
    // a second, far smaller cone for tiling variety
    bgPoly(g, [[w * 0.85 - 120, h], [w * 0.85, h * 0.5], [w * 0.85 + 130, h]]); g.fillStyle = '#140605'; g.fill();
  };
  P.plume = (g, w, h, T, rand) => {
    for (let i = 0; i < 30; i++) {
      const x = rand() * w, y = h * (0.15 + rand() * 0.6), r = 30 + rand() * 60;
      tileable(o => { g.beginPath(); g.arc(x + o, y, r, 0, Math.PI * 2); g.fillStyle = bgA(i % 3 ? '#2a1614' : '#3a1e18', 0.55); g.fill(); }, w);
    }
    g.fillStyle = bgA('#ff6a4a', 0.08); g.fillRect(0, h * 0.7, w, h * 0.3);
  };
  P.ruins = (g, w, h, T, rand) => {
    let x = 0;
    while (x < w - 20) {
      const bw = 24 + rand() * 30, bh = h * (0.22 + rand() * 0.42), top = h - bh;
      const pts = [[x, h], [x, top + rand() * 10]]; for (let k = 1; k < 5; k++) pts.push([x + bw * k / 5, top + rand() * 22]); pts.push([x + bw, top + rand() * 14], [x + bw, h]);
      bgPoly(g, pts); g.fillStyle = '#120706'; g.fill(); edgeLine(g, pts.slice(1, -1), bgA('#ff6a4a', 0.45), 1);
      for (let y = top + 18; y < h - 6; y += 8) for (let xx = x + 4; xx < x + bw - 4; xx += 6) if (rand() < 0.07) { g.fillStyle = '#ff8c42'; g.fillRect(xx, y, 2, 2); bakedGlow(g, xx + 1, y + 1, 4, '#ff6a4a', 0.4); }
      x += bw + 4 + rand() * 18;
    }
  };
  P.girders = (g, w, h, T, rand) => {
    for (let x = 10; x < w; x += 50 + rand() * 70) {
      const hh = h * (0.3 + rand() * 0.6), lean = (rand() - 0.5) * 0.6;
      g.save(); g.translate(x, h); g.rotate(lean); g.fillStyle = '#0e0504'; g.fillRect(-2.5, -hh, 5, hh);
      if (rand() < 0.6) { g.fillRect(-12, -hh + 6, 24, 3); } g.strokeStyle = bgA('#ff6a4a', 0.4); g.lineWidth = 0.8; g.beginPath(); g.moveTo(2.5, -hh); g.lineTo(2.5, 0); g.stroke(); g.restore();
    }
  };
  // ---- near bands: thin baked silhouette strip; the area below is a plain fillRect per frame ----
  function paintNear(g, w, h, T, rand) {
    const N = T.near; const cyc = (x, k) => Math.sin(x / w * Math.PI * 2 * k); // integer cycles => seamless tile
    const yAt = (x) => {
      if (N.kind === 'sea') return h * 0.55;
      if (N.kind === 'grid') return h * 0.42 + cyc(x, 2) * 10 + cyc(x, 5) * 5;
      if (N.kind === 'rock') return h * 0.4 + cyc(x, 3) * 10 + cyc(x, 11) * 2.5;
      if (N.kind === 'lip') return h * 0.45 + cyc(x, 2) * 8 + cyc(x, 7) * 3;
      return h * 0.42 + cyc(x, 2) * 12 + cyc(x, 6) * 4;
    };
    const pts = [[0, h]];
    for (let x = 0; x < w; x += 8) pts.push([x, yAt(x)]);
    pts.push([w, yAt(w)]);
    pts.push([w, h]);
    bgPoly(g, pts); g.fillStyle = N.fill; g.fill();
    edgeLine(g, pts.slice(1, -1), N.edge, 2.2); edgeLine(g, pts.slice(1, -1), bgA(N.edge, 0.25), 6);
    if (N.kind === 'sea') { for (let i = 0; i < 70; i++) { const x = rand() * w, y = h * 0.6 + rand() * h * 0.38, l = 6 + rand() * 22; g.fillStyle = bgA(rand() < 0.7 ? '#5ef6ff' : '#ffe08a', 0.15 + rand() * 0.25); g.fillRect(x, y, l, 1.2); } }
    if (N.kind === 'grid') { g.strokeStyle = bgA('#ff4ad0', 0.28); g.lineWidth = 1; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, h * 0.6); g.lineTo(x - 30, h); g.stroke(); } for (let y = h * 0.62; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
    if (N.kind === 'lip') { for (let i = 0; i < 40; i++) { g.fillStyle = bgA('#e0d0ff', 0.2 + rand() * 0.4); g.fillRect(rand() * w, h * 0.55 + rand() * h * 0.4, 1.5, 1.5); } }
  }

  // ---------------------------------------------------------------------------
  function buildBackground(map, W, H, hy, dpr) {
    const theme = (map && map.theme) || 'pier';
    const T = BG_THEMES[theme] || BG_THEMES.pier;
    const scale = Math.min(dpr || 1, 2);
    const bg = { theme, T, hy, W: W, H: H, scale, glow: {}, layers: [], anchors: [], pool: [], cones: [], bolt: 0, boltCanvas: null, boltX: 0, nextBolt: T.bolt ? T.bolt[0] : 0, mem: 0 };
    bg.rx = { flash: 0, blackout: 0, flare: 0, pull: 0, wind: 0, dry: 0, cool: 0, eqKick: 0, boltCd: 0, flashCd: 0, washCd: 0, lhAng: Math.PI };
    bg.fx = []; for (let i = 0; i < 24; i++) bg.fx.push({ life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, g: 0, r: 1, color: '#ffffff', kind: 'glow' }); // [RX] fixed pool, never grows
    // sky: screen-space, W x (hy+40), baked at scale; moon / sun / stars baked in
    const sh = hy + 40, sky = bgMakeCanvas(W * scale, sh * scale), g = sky.getContext('2d'); g.scale(scale, scale);
    const grd = g.createLinearGradient(0, 0, 0, sh); T.sky.forEach(s => grd.addColorStop(s[0], s[1])); g.fillStyle = grd; g.fillRect(0, 0, W, sh);
    const r = bgRand(T.seed);
    const starN = theme === 'well' ? 140 : theme === 'pier' ? 50 : theme === 'veil' ? 0 : 24;
    for (let i = 0; i < starN; i++) { g.fillStyle = bgA(theme === 'well' ? '#e0d0ff' : '#ffffff', 0.2 + r() * 0.6); g.fillRect(r() * W, r() * hy * 0.8, r() < 0.1 ? 2 : 1, r() < 0.1 ? 2 : 1); }
    if (theme === 'pier') { bakedGlow(g, W * 0.78, hy * 0.28, 60, '#bff6ff', 0.35); g.beginPath(); g.arc(W * 0.78, hy * 0.28, 16, 0, Math.PI * 2); g.fillStyle = '#e4fbff'; g.fill(); }
    if (theme === 'spine') { // striped synth sun on the horizon
      const cx = W * 0.5, cy = hy * 0.8, rr = hy * 0.42; bakedGlow(g, cx, cy, rr * 1.8, '#ff4ad0', 0.35);
      g.save(); g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.clip(); const sg = g.createLinearGradient(0, cy - rr, 0, cy + rr); sg.addColorStop(0, '#ffe08a'); sg.addColorStop(0.5, '#ff7ab8'); sg.addColorStop(1, '#ff4ad0'); g.fillStyle = sg; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      g.fillStyle = '#3a0c4a'; for (let k = 0; k < 6; k++) { const y = cy + k * rr * 0.16, t = 1 + k * 0.8; g.fillRect(cx - rr, y, rr * 2, t); } g.restore();
    }
    if (theme === 'cut') { bakedGlow(g, W * 0.3, hy, 160, '#ffb347', 0.18); }
    if (theme === 'well') { for (let i = 0; i < 5; i++) bakedGlow(g, r() * W, r() * hy * 0.7, 60 + r() * 80, i % 2 ? '#3a1a6a' : '#1a2a6a', 0.35); }
    if (theme === 'veil') { for (let i = 0; i < 9; i++) { const y = hy * (0.35 + r() * 0.55), rw = 140 + r() * 260, x = r() * W; const lg = g.createLinearGradient(x - rw, 0, x + rw, 0); lg.addColorStop(0, 'rgba(90,40,30,0)'); lg.addColorStop(0.5, 'rgba(90,40,30,0.35)'); lg.addColorStop(1, 'rgba(90,40,30,0)'); g.fillStyle = lg; g.fillRect(x - rw, y, rw * 2, 4 + r() * 8); } bakedGlow(g, W * 0.4, hy, 220, '#ff6a4a', 0.25); }
    bg.sky = { c: sky, w: W, h: sh }; bg.mem += sky.width * sky.height * 4;
    // parallax strips. Paint into a padded canvas, then copy overflow onto the opposite edge
    // so a tower or ruin that crosses the repeat boundary is whole on both sides.
    function bakeSeam(paint, tw, lh, s, pad) {
      const big = bgMakeCanvas((tw + pad * 2) * s, lh * s);
      const lg = big.getContext('2d');
      lg.setTransform(s, 0, 0, s, 0, 0);
      lg.translate(pad, 0);
      paint(lg);
      const c = bgMakeCanvas(tw * s, lh * s);
      const og = c.getContext('2d');
      const ps = pad * s, tws = tw * s, lhs = lh * s;
      og.drawImage(big, ps, 0, tws, lhs, 0, 0, tws, lhs);
      og.drawImage(big, ps + tws, 0, ps, lhs, 0, 0, ps, lhs);
      og.drawImage(big, 0, 0, ps, lhs, tws - ps, 0, ps, lhs);
      big.width = 1; big.height = 1;
      return c;
    }
    T.layers.forEach((spec, i) => {
      const name = spec[0], parallax = spec[1], tw = spec[2], hf = spec[3], cap = spec[4];
      const lh = Math.round(hy * hf) + 8, s = Math.min(scale, cap);
      const L = { name: name, canvas: null, w: tw, h: lh, y: hy + 8 - lh, parallax: parallax, anchors: [], tips: [] };
      const c = bakeSeam((lg) => { P[name](lg, tw, lh, T, bgRand(T.seed * 31 + i), L); }, tw, lh, s, 320);
      L.canvas = c;
      for (let ai = 0; ai < L.anchors.length; ai++) if (L.anchors[ai].kind === 'tip') L.tips.push(L.anchors[ai]);
      bg.layers.push(L); bg.mem += c.width * c.height * 4;
    });
    // near band (dunes replacement), same seam copy for dashes that cross the tile
    const N = T.near, nh = Math.round(H * 0.16);
    const nc = bakeSeam((ng) => { paintNear(ng, N.w, nh, T, bgRand(T.seed * 7)); }, N.w, nh, scale, 48);
    bg.near = { canvas: nc, w: N.w, h: nh, y: Math.round(hy * N.top), parallax: N.parallax, fill: N.fill };
    bg.mem += nc.width * nc.height * 4;
    // particle pool (fixed size; never grows)
    const A = T.ambient;
    let n = (A.glints || 0) + (A.rise || 0) + (A.fall || 0) + (A.motes || 0);
    if (n > 56) n = 56;
    const glintN = A.glints || 0, riseN = A.rise || 0, fallN = A.fall || 0;
    for (let i = 0; i < n; i++) bg.pool.push({ kind: i < glintN ? 'glint' : i < glintN + riseN ? 'rise' : i < glintN + riseN + fallN ? (A.fallKind || 'ash') : 'mote', x: r() * W, y: r() * H, v: 0.3 + r() * 0.7, p: r() * 6 });
    // pre-warm glow sprites so draw never allocates
    [T.accent, T.warm || T.accent, T.hot || T.accent, T.pale || T.accent, T.cool || T.accent, '#ffffff'].forEach(cl => { bgGlowDot(bg, cl, 6); bgGlowDot(bg, cl, 14); });
    if (T.beams) bgCone(bg, T.beams === 'lighthouse' ? '#bff6ff' : T.accent, 260, 22), bgCone(bg, T.cool || T.accent, 260, 22);
    const glowKeys = Object.keys(bg.glow);
    for (let gi = 0; gi < glowKeys.length; gi++) {
      const entry = bg.glow[glowKeys[gi]];
      if (entry && entry.c) {
        bg.mem += entry.c.width * entry.c.height * 4;
        if (glowKeys[gi].indexOf('cone') === 0) bg.cones.push(entry);
      } else if (entry) {
        const radii = Object.keys(entry);
        for (let ri = 0; ri < radii.length; ri++) {
          const spr = entry[radii[ri]];
          if (spr && spr.c) bg.mem += spr.c.width * spr.c.height * 4;
        }
      }
    }
    return bg;
  }

  function releaseBackground(bg) {
    if (!bg) return;
    const kill = (c) => { if (c) { c.width = 1; c.height = 1; } };
    kill(bg.sky && bg.sky.c); bg.layers.forEach(L => kill(L.canvas)); kill(bg.near && bg.near.canvas); kill(bg.boltCanvas);
    const glowKeys = Object.keys(bg.glow);
    for (let gi = 0; gi < glowKeys.length; gi++) {
      const entry = bg.glow[glowKeys[gi]];
      if (entry && entry.c) kill(entry.c);
      else if (entry) {
        const radii = Object.keys(entry);
        for (let ri = 0; ri < radii.length; ri++) if (entry[radii[ri]] && entry[radii[ri]].c) kill(entry[radii[ri]].c);
      }
    }
  }

  // lightning: bake one small canvas per strike (3 widening strokes, 'lighter'); no shadowBlur
  function bgStrike(bg, W, atX) {
    const T = bg.T, hh = bg.hy, w = 120, s = bg.scale;
    if (!bg.boltCanvas) bg.boltCanvas = bgMakeCanvas(w * s, hh * s);
    const c = bg.boltCanvas, g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, w, hh);
    const pts = []; let x = w / 2, y = 2; pts.push([x, y]); while (y < hh - 6) { x += (Math.random() - 0.48) * 26; x = Math.max(6, Math.min(w - 6, x)); y += 14 + Math.random() * 10; pts.push([x, Math.min(hh - 6, y)]); }
    g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
    [[9, 0.12], [4, 0.35], [1.8, 1]].forEach(([lw, a]) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.strokeStyle = a === 1 ? '#ffffff' : bgA(T.boltColor || '#bff6ff', a); g.lineWidth = lw; g.stroke(); });
    bg.boltX = atX != null ? atX : 40 + Math.random() * Math.max(80, W - 160); bg.bolt = 1;
  }

  function updateBackground(bg, dt, W, H, cameraX, fx, S) {
    const T = bg.T, R = bg.rx;
    if (R.flash > 0) R.flash = Math.max(0, R.flash - dt);
    if (R.blackout > 0) R.blackout = Math.max(0, R.blackout - dt);
    if (R.flare > 0) R.flare = Math.max(0, R.flare - dt);
    if (R.pull > 0) R.pull = Math.max(0, R.pull - dt);
    if (R.wind > 0) R.wind = Math.max(0, R.wind - dt);
    if (R.dry > 0) R.dry = Math.max(0, R.dry - dt);
    if (R.cool > 0) R.cool = Math.max(0, R.cool - dt);
    if (R.eqKick > 0) R.eqKick = Math.max(0, R.eqKick - dt);
    if (R.boltCd > 0) R.boltCd = Math.max(0, R.boltCd - dt);
    if (R.flashCd > 0) R.flashCd = Math.max(0, R.flashCd - dt);
    if (R.washCd > 0) R.washCd = Math.max(0, R.washCd - dt);
    if (T.bolt && fx && R.flashCd <= 0 && !bgMuted(true)) { bg.nextBolt -= dt; if (bg.nextBolt <= 0) { bgStrike(bg, W); R.flashCd = 0.334; bg.nextBolt = T.bolt[0] + Math.random() * (T.bolt[1] - T.bolt[0]); } }
    if (bg.bolt > 0) bg.bolt = Math.max(0, bg.bolt - dt * 1.7);
    if (!fx) return;
    for (let i = 0; i < bg.fx.length; i++) { const f = bg.fx[i]; if (f.life <= 0) continue; f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += f.g * dt; } // [RX]
    const hy = bg.hy, wellA = bg.layers[0].anchors[0];
    for (let i = 0; i < bg.pool.length; i++) {
      const p = bg.pool[i];
      if (p.kind === 'glint') { p.p += dt * (2 + p.v * 3); if (p.p > 6.28) { p.p = 0; p.x = Math.random() * W; p.y = bg.near.y + bg.near.h * (0.6 + Math.random() * 0.35); } }
      else if (p.kind === 'rise') { p.y -= dt * 30 * p.v; p.x += Math.sin(p.p += dt) * dt * 10; if (p.y < 10) { p.y = H * 0.75; p.x = Math.random() * W; } }
      else if (p.kind === 'ash') { p.y += dt * 22 * p.v; p.x -= dt * (14 + 10 * p.v) * (1 + (R.wind > 0 ? 6 : 0) + (S && S.boost ? 2 : 0)); if (p.y > H * 0.8 || p.x < -4) { p.y = -4; p.x = Math.random() * (W + 80); } }
      else if (p.kind === 'spark') { if (R.dry > 0) continue; p.y += dt * 28 * p.v; p.x -= dt * 14 * p.v; if (p.y > H * 0.8 || p.x < -4) { p.y = -4; p.x = Math.random() * (W + 80); } }
      else if (p.kind === 'mote') { // spiral toward the well centre on screen
        const L = bg.layers[0]; const off = ((cameraX * L.parallax) % L.w + L.w) % L.w; let cx = wellA ? wellA.x - off : W / 2, cy = wellA ? L.y + wellA.y : hy * 0.6;
        if (S && (S.air || R.pull > 0)) { cx = S.bx; cy = S.by; } // [RX]
        const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) || 1; p.x += (dx / d * 18 - dy / d * 26) * dt * p.v; p.y += (dy / d * 18 + dx / d * 26) * dt * p.v;
        if (d < 12) { p.x = Math.random() * W; p.y = hy + Math.random() * (H * 0.3); }
      }
    }
  }

  function bgStrip(ctx, L, cameraX, W) {
    let off = (cameraX * L.parallax) % L.w; if (off < 0) off += L.w;
    for (let x = -off; x < W; x += L.w) ctx.drawImage(L.canvas, x, L.y, L.w, L.h);
    return off;
  }
  function bgEachAnchor(L, off, W, fn) { for (let i = 0; i < L.anchors.length; i++) { const a = L.anchors[i]; for (let x = a.x - off; x < W + 40; x += L.w) if (x > -40) fn(a, x, L.y + a.y); } }
  const glowJob = { ctx: null, bg: null, R: null, T: null, t: 0, S: null, spd: 0 };
  function paintBgAnchor(a, x, y) {
    const ctx = glowJob.ctx;
    const bg = glowJob.bg;
    const R = glowJob.R;
    const T = glowJob.T;
    const t = glowJob.t;
    const S = glowJob.S;
    const spd = glowJob.spd;
    if (a.kind === 'blink') { const fl = R.flash > 0; const on = fl ? Math.sin(t * 18) > 0 : Math.sin(t * 3 + a.phase) > 0.2; if (on) bgStamp(ctx, bgGlowDot(bg, fl ? '#ffe08a' : a.color, 6), x, y, fl ? 2 : 1); }
    else if (a.kind === 'lighthouse') { const cone = bg.glow['cone#bff6ff260']; let ang = Math.PI + Math.sin(t * 0.5) * 1.2; if (S && S.speed > 200) { R.lhAng += (Math.atan2(S.by - y, S.bx - x) - R.lhAng) * 0.08; ang = R.lhAng; } else R.lhAng = ang; if (cone) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = 0.35; ctx.drawImage(cone.c, 0, -cone.spread, cone.len, cone.spread * 2); ctx.restore(); } bgStamp(ctx, bgGlowDot(bg, '#ffffff', 14), x, y); }
    else if (a.kind === 'laser' && bg.cones.length && !(R.blackout > 0)) { const cone = bg.cones[(a.phase * 10 | 0) % bg.cones.length]; const lock = S && S.boost; const ang = lock ? Math.atan2(S.by - y, S.bx - x) : -Math.PI / 2 + Math.sin(t * (0.6 + 1.4 * spd) + a.phase) * 0.9; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = lock ? (Math.sin(t * 18) > 0 ? 0.45 : 0.12) : 0.28; ctx.scale(1, 0.3); ctx.drawImage(cone.c, 0, -cone.spread, cone.len, cone.spread * 2); ctx.restore(); }
    else if (a.kind === 'eq' && T.eq) { for (let k = 0; k < T.eq; k++) { const bh = 4 + (10 + 18 * spd + (S && S.boost ? 10 : 0) + R.eqKick * 30) * Math.abs(Math.sin(t * (3 + k * 0.7) + k)); ctx.globalAlpha = 0.8; ctx.fillStyle = k % 2 ? T.accent : (T.cool || T.accent); ctx.fillRect(x - 56 + k * 8, y - bh, 6, bh); ctx.globalAlpha = 1; } }
    else if (a.kind === 'well' && T.ringPulse) { const airK = S && S.air ? Math.min(1, (S.airTime || 0) / 0.8) : 0; ctx.globalAlpha = Math.min(1, 0.25 + 0.2 * Math.sin(t * 1.3) + 0.35 * airK + 0.5 * R.flare); bgStamp(ctx, bgGlowDot(bg, T.accent, 14), x, y, a.ry / 14 * (1 + 0.15 * airK + 0.2 * R.flare)); ctx.globalAlpha = 1; }
    else if (a.kind === 'crater' && T.flare) { ctx.globalAlpha = Math.min(1, 0.5 + 0.35 * Math.sin(t * 2.1) * Math.sin(t * 0.7) + R.flare); bgStamp(ctx, bgGlowDot(bg, T.accent, 14), x, y, 3.2 * (1 + 0.5 * R.flare)); ctx.globalAlpha = 1; }
  }

  function drawBackground(ctx, bg, cameraX, t, W, H, fx, S) {
    const T = bg.T, R = bg.rx, spd = S ? Math.min(1, S.speed / 980) : 0.5;
    ctx.fillStyle = T.base; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(bg.sky.c, 0, 0, bg.sky.w, bg.sky.h);
    if (fx && bg.bolt > 0.08 && bg.boltCanvas) { // bolt + sky flash
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, bg.bolt); ctx.drawImage(bg.boltCanvas, bg.boltX - 60, 0, 120, bg.hy);
      ctx.globalAlpha = Math.min(0.22, bg.bolt * 0.3); ctx.fillStyle = bgA(T.boltColor, 1); ctx.fillRect(0, 0, W, bg.hy); ctx.restore();
    }
    for (let li = 0; li < bg.layers.length; li++) {
      const L = bg.layers[li], off = bgStrip(ctx, L, cameraX, W);
      if (li === 0 && bg.bolt > 0.12 && fx) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(0.45, bg.bolt * 0.5); bgStrip(ctx, L, cameraX, W); ctx.restore(); }
      if (fx) {
        glowJob.ctx = ctx; glowJob.bg = bg; glowJob.R = R; glowJob.T = T; glowJob.t = t; glowJob.S = S; glowJob.spd = spd;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; bgEachAnchor(L, off, W, paintBgAnchor); ctx.restore();
      }
      if (T.arcs && L.name === 'lattice' && fx) { // electric arc between two neighbouring tower tips, ~every 2.3 s
        const k = Math.floor(t / 2.3), u = t / 2.3 - k; if (u < 0.12 && L.tips.length) {
          const tips = L.tips; const i0 = (k * 2) % tips.length; const a = tips[i0], b = tips[(i0 + 1) % tips.length];
          let ax = a.x - off; while (ax < -40) ax += L.w; const bx = ax + (b.x - a.x);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(ax, L.y + a.y); for (let s = 1; s < 8; s++) ctx.lineTo(ax + (bx - ax) * s / 8, L.y + a.y + (Math.random() - 0.5) * 10); ctx.lineTo(bx, L.y + b.y);
          ctx.globalAlpha = 0.15; ctx.strokeStyle = T.cool || '#ffe08a'; ctx.lineWidth = 6; ctx.stroke();
          ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.stroke();
          bgStamp(ctx, bgGlowDot(bg, T.cool || '#ffe08a', 14), ax, L.y + a.y); bgStamp(ctx, bgGlowDot(bg, T.cool || '#ffe08a', 14), bx, L.y + b.y); ctx.restore();
        }
      }
    }
    // near band + flat fill below it
    const N = bg.near; bgStrip(ctx, N, cameraX, W); ctx.fillStyle = N.fill; ctx.fillRect(0, N.y + N.h - 1, W, H - N.y - N.h + 1);
    // ambient particles (pooled)
    if (fx) {
      for (let i = 0; i < bg.pool.length; i++) {
        const p = bg.pool[i];
        if (p.kind === 'glint') { const a = Math.sin(p.p) * 0.6; if (a > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = '#ffe08a'; ctx.fillRect(p.x, p.y, 8 * p.v + 3, 1.2); ctx.globalAlpha = 1; } }
        else if (p.kind === 'rise') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(p.p * 3); bgStamp(ctx, bgGlowDot(bg, T.warm || '#ffb347', 6), p.x, p.y, 0.6 + p.v * 0.5); ctx.globalAlpha = 1; }
        else if (p.kind === 'ash') { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.35 + 0.3 * p.v; ctx.fillStyle = T.ash || '#8a7a78'; ctx.fillRect(p.x, p.y, 1.5 + p.v, 1.5 + p.v); ctx.globalAlpha = 1; }
        else if (p.kind === 'spark') { if (R.dry > 0) continue; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.fillStyle = '#ffb347'; ctx.fillRect(p.x, p.y, 2.2, 2.2); ctx.globalAlpha = 1; }
        else if (p.kind === 'mote') { ctx.globalCompositeOperation = 'lighter'; bgStamp(ctx, bgGlowDot(bg, i % 3 ? T.accent : T.pale, 6), p.x, p.y, 0.5 + 0.4 * p.v); }
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (T.shards) { // floating rock shards (stamped polygons, bobbing)
        for (let i = 0; i < T.shards; i++) { const sx = ((i * 211 - cameraX * 0.12) % (W + 120) + W + 120) % (W + 120) - 60, sy = bg.hy * (0.35 + 0.12 * (i % 3)) + Math.sin(t * 0.8 + i) * 6;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 0.3 + i) * 0.2 + R.flare * t * 6); ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(4, -9); ctx.lineTo(12, 0); ctx.lineTo(2, 10); ctx.lineTo(-8, 5); ctx.closePath(); ctx.fillStyle = '#0c0620'; ctx.fill(); ctx.strokeStyle = bgA(T.accent, 0.8); ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
      }
      // [RX] reaction particles (24 pooled slots) and single-rect washes; no blur
      for (let i = 0; i < bg.fx.length; i++) { const f = bg.fx[i]; if (f.life <= 0) continue; const k = f.life / f.max;
        if (f.kind === 'puff') { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.35 * k; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, Math.min(6, f.r), 0, Math.PI * 2); ctx.fill(); }
        else { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; bgStamp(ctx, bgGlowDot(bg, f.color, 6), f.x, f.y, Math.min(1.05, f.r)); } }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
      if (R.flash > 0) { ctx.fillStyle = bgA(T.boltColor || '#ffe08a', Math.min(0.12, 0.1 * Math.min(1, R.flash / 0.4))); ctx.fillRect(0, 0, W, bg.hy); }
      if (R.cool > 0) { ctx.fillStyle = bgA('#5ef6ff', Math.min(0.12, 0.12 * R.cool / 0.8)); ctx.fillRect(0, 0, W, bg.hy); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // [RX] Reactions. Each call only touches bg.rx timers and the fixed 24-slot bg.fx pool; cooldowns stop spam.
  function chipColor(color) {
    const c = String(color || '').toLowerCase();
    if (c === '#5ef6ff' || c === '#bff6ff' || c === '#9ae7ff' || c === '#e9fbff' || c === '#7af6ff') return '#ffb347';
    return color || '#ffb347';
  }
  function bgBurst(bg, x, y, color, n, o) {
    o = o || {};
    let left = Math.min(8, n);
    const tint = chipColor(color);
    for (let i = 0; i < bg.fx.length && left > 0; i++) { const f = bg.fx[i]; if (f.life > 0) continue;
      const a = (o.spread != null ? o.dir + (Math.random() - 0.5) * o.spread : Math.random() * Math.PI * 2), v = (o.speed || 120) * (0.5 + Math.random() * 0.7);
      f.x = x; f.y = y; f.vx = Math.cos(a) * v; f.vy = Math.sin(a) * v; f.g = o.g || 0; f.max = f.life = Math.min(0.9, (o.life || 0.6) * (0.7 + Math.random() * 0.5)); f.color = tint; f.r = Math.min(o.kind === 'puff' ? 6 : 1.05, o.r || 1); f.kind = o.kind || 'glow'; left--; }
  }
  function bgMuted(strike) {
    if (!track || !track.zones || phase !== 'play') return false;
    const zones = track.zones;
    const speed = bike.speed || 0;
    const lead = Math.max(strike ? 240 : 40, speed * 0.5 + speed / 60);
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (z.kind !== 'lip' && z.kind !== 'gate') continue;
      const lip = z.lip != null ? z.lip : z.x0 + 480;
      if (bike.x <= lip && lip - bike.x <= lead) return true;
      if (bike.x > lip && bike.x - lip <= 240) return true;
    }
    return false;
  }
  function armWash(R, key, seconds) {
    if (bgMuted(false) || R.flashCd > 0 || R.washCd > 0) return false;
    R[key] = Math.min(0.9, seconds);
    R.flashCd = 0.334;
    R.washCd = 3;
    return true;
  }

  function bgReact(bg, type, d, S, W) {
    const T = bg.T, R = bg.rx, th = bg.theme; d = d || {};
    const big = type === 'land' && d.clean && ((d.airTime || 0) >= 0.65 || (d.flips || 0) >= 1);
    if (th === 'pier') {
      if (big) armWash(R, 'flash', 0.9);
      if (type === 'coin') for (let i = 0; i < bg.pool.length && i < 6; i++) { const p = bg.pool[i]; p.x = d.sx + (Math.random() - 0.5) * 60; p.y = bg.near.y + bg.near.h * (0.6 + Math.random() * 0.3); p.p = 0.2; }
      if (type === 'finish' && d.place === 1) bgBurst(bg, W * 0.5, bg.hy * 0.35, T.warm, 8, { speed: 90, g: 40, life: 0.8, r: 0.9 });
    } else if (th === 'spine') {
      if (big) R.eqKick = 0.6;
      if (type === 'crash') R.blackout = 0.7;
      if (type === 'lane') R.eqKick = Math.max(R.eqKick, 0.25);
      if (type === 'boostStart' && S) bgBurst(bg, S.bx, S.by - 20, '#ffb347', 6, { dir: -Math.PI / 2, spread: 1.6, speed: 140, life: 0.5, r: 0.7 });
    } else if (th === 'cut') {
      if ((type === 'boostStart' || type === 'nearMiss') && R.boltCd <= 0 && R.flashCd <= 0 && S && !bgMuted(true)) { bgStrike(bg, W, S.bx); R.boltCd = 2.5; R.flashCd = 0.334; }
      if (type === 'overheat' && S) { armWash(R, 'flash', 0.6); bgBurst(bg, S.bx, S.by - 30, T.warm, 8, { dir: -Math.PI / 2, spread: 2, speed: 160, g: 300, life: 0.7, r: 0.6 }); }
      if (type === 'pad') { R.dry = 1.2; armWash(R, 'cool', 0.8); }
    } else if (th === 'well') {
      if (type === 'land') R.pull = 0;
      if (type === 'loop') R.flare = 1.0;
      if (type === 'crash' && S) bgBurst(bg, S.bx, S.by, '#2a1848', 6, { speed: 40, life: 0.5, r: 5, kind: 'puff' });
      if (type === 'jump') R.pull = 0.2;
    } else if (th === 'veil') {
      if (type === 'land' && S) bgBurst(bg, S.bx, S.by + 4, T.warm, 8, { dir: -Math.PI / 2, spread: 1.8, speed: 150, g: 220, life: 0.8, r: 0.8 });
      if (type === 'boostStart') R.wind = 0.8;
      if (type === 'lead' || type === 'checkpoint') R.flare = 0.9;
      if (type === 'crash' && S) bgBurst(bg, S.bx, S.by, '#3a302c', 5, { speed: 30, life: 0.7, r: 5, kind: 'puff' });
    }
  }

  function focusY() {
    return Math.round(H * 0.60);
  }

  const screenPool = [];
  for (let si = 0; si < 16; si++) screenPool.push({ x: 0, y: 0 });
  let screenI = 0;
  function toScreen(wx, wy) {
    const o = screenPool[screenI];
    screenI = (screenI + 1) % screenPool.length;
    o.x = wx - cameraX;
    o.y = focusY() - (wy - cameraY);
    return o;
  }

  let gpCap = 256;
  let gpX = new Float32Array(gpCap);
  let gpY = new Float32Array(gpCap);
  let gpN = 0;
  let shadeGrad = null;
  let shadeFor = -1;
  function buildGroundPts() {
    gpN = 0;
    const x1 = cameraX + W + 40;
    for (let x = cameraX - 40; x <= x1 && gpN < gpCap; x += 10) {
      queryGround(x);
      const s = toScreen(x, G0.h);
      gpX[gpN] = s.x | 0;
      gpY[gpN] = s.y | 0;
      gpN += 1;
    }
    if (!shadeGrad || shadeFor !== H) {
      shadeFor = H;
      shadeGrad = ctx.createLinearGradient(0, 0, 0, Math.max(1, H));
      shadeGrad.addColorStop(0, '#5a3488');
      shadeGrad.addColorStop(0.12, '#2a1848');
      shadeGrad.addColorStop(0.4, '#140c24');
      shadeGrad.addColorStop(1, '#07040e');
    }
  }

  function drawDeck(k) {
    if (gpN < 2) return;
    const top = -k * laneGap;
    const bot = -(k - 1) * laneGap + 2;
    ctx.beginPath();
    ctx.moveTo(gpX[0], gpY[0] + top);
    for (let i = 1; i < gpN; i++) ctx.lineTo(gpX[i], gpY[i] + top);
    for (let i = gpN - 1; i >= 0; i--) ctx.lineTo(gpX[i], gpY[i] + bot);
    ctx.closePath();
    ctx.fillStyle = k === 2 ? '#12081c' : '#24143c';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(gpX[0], gpY[0] + top);
    for (let i = 1; i < gpN; i++) ctx.lineTo(gpX[i], gpY[i] + top);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#120818';
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = (track && track.accent) || PAL.cyan;
    ctx.globalAlpha = k === 2 ? 0.45 : 0.75;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    if (gpN < 2) buildGroundPts();
    if (gpN < 2) return;
    ctx.beginPath();
    ctx.moveTo(gpX[0], H + 40);
    ctx.lineTo(gpX[0], gpY[0]);
    for (let i = 1; i < gpN; i++) ctx.lineTo(gpX[i], gpY[i]);
    ctx.lineTo(gpX[gpN - 1], H + 40);
    ctx.closePath();
    ctx.fillStyle = shadeGrad || '#140c24';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(gpX[0], gpY[0]);
    for (let i = 1; i < gpN; i++) ctx.lineTo(gpX[i], gpY[i]);
    ctx.lineWidth = 8;
    ctx.strokeStyle = PAL.ink;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = (track && track.accent) || PAL.cyan;
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gpX[0], gpY[0] + 8);
    for (let i = 1; i < gpN; i++) ctx.lineTo(gpX[i], gpY[i] + 8);
    for (let i = gpN - 1; i >= 0; i--) ctx.lineTo(gpX[i], gpY[i] + 26);
    ctx.closePath();
    ctx.fillStyle = '#c43a88';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(gpX[0], gpY[0] + 16);
    for (let i = 1; i < gpN; i++) ctx.lineTo(gpX[i], gpY[i] + 16);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(94, 246, 255, 0.85)';
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawHazards(band) {
    const hazards = track.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.x > cameraX + W + 80 || h.x + h.w < cameraX - 80) continue;
      const laned = h.kind === 'debris' || h.kind === 'wall' || h.kind === 'gate' || h.kind === 'bar';
      const lane = h.lane == null ? 'all' : h.lane;
      if (laned) {
        if (lane !== 'all' && lane !== band) continue;
      } else if (band !== 0) continue;
      const dy = laned ? -((lane === 'all' ? band : lane) * laneGap) : 0;
      const base = queryGround(h.x + h.w * 0.5);
      const footS = toScreen(h.x, base.h);
      const fx = footS.x;
      const fy = footS.y + dy;
      const topS = toScreen(h.x, base.h + h.clear);
      const tx = topS.x;
      const ty = topS.y + dy;
      const farS = toScreen(h.x + h.w, base.h);
      const farx = farS.x;
      if (h.kind === 'debris') {
        roundPath(fx, fy - 16, h.w, 16, 5);
        paint('#2a1848', 3);
        ctx.fillStyle = PAL.amber;
        ctx.beginPath();
        ctx.arc(fx + 16, fy - 8, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (h.kind === 'gate') {
        const postH = Math.max(24, fy - ty);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = PAL.cyan;
        ctx.fillRect(fx - 8, ty, farx - fx + 24, postH);
        ctx.globalAlpha = 1;
        roundPath(fx - 10, ty, 14, postH, 4);
        paint(PAL.mag, 3);
        roundPath(farx - 2, ty, 14, postH, 4);
        paint(PAL.mag, 3);
        roundPath(fx - 14, ty - 10, farx - fx + 32, 18, 8);
        paint(PAL.cyan, 4);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = PAL.cyan;
        ctx.fillRect(fx - 78, fy - 7, 64, 6);
        ctx.globalAlpha = 1;
        if (fxRich()) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          stamp(glowDot(PAL.cyan, 18), (fx + farx) * 0.5, ty + 4);
          ctx.restore();
        }
      } else {
        const wallH = Math.max(18, fy - ty);
        roundPath(fx, ty, Math.max(22, farx - fx), wallH, 6);
        paint(PAL.mag, 4);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = PAL.mag;
        ctx.fillRect(fx - 64, fy - 5, 56, 5);
        ctx.globalAlpha = 1;
      }
    }
    if (band !== 0) return;
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
      if (fxRich()) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(94, 246, 255, 0.35)';
        ctx.stroke();
        ctx.restore();
      }
    }
    if (finishX < cameraX + W + 40 && finishX > cameraX - 40) {
      const g = queryGround(finishX);
      const foot = toScreen(finishX, g.h);
      const cap = toScreen(finishX, g.h + 78);
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

  function drawRimTrail(pts, color, width) {
    if (pts.length < 2) return;
    const rich = fxRich();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const step = rich ? 1 : 2;
    for (let i = step; i < pts.length; i += step) {
      const k = i / (pts.length - 1);
      ctx.strokeStyle = hexA(color, (rich ? 0.08 : 0.04) + (rich ? 0.5 : 0.26) * k);
      ctx.lineWidth = width * (0.25 + k) * (rich ? 1 : 0.65);
      ctx.beginPath();
      ctx.moveTo(pts[i - step].x, pts[i - step].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTrail() {
    if (trLen < 2 || bike.speed < 240) return;
    const rich = fxRich();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const step = rich ? 1 : 2;
    const start = (trHead - trLen + TR_N) % TR_N;
    for (let n = step; n < trLen; n += step) {
      const i0 = (start + n - step) % TR_N;
      const i1 = (start + n) % TR_N;
      const k = n / (trLen - 1);
      const lift0 = -(trL[i0] || 0) * laneGap;
      const lift1 = -(trL[i1] || 0) * laneGap;
      const a = toScreen(trX[i0], trY[i0]);
      const ax = a.x;
      const ay = a.y + lift0;
      const b = toScreen(trFX[i0], trFY[i0]);
      const bx = b.x;
      const by = b.y + lift0;
      const c = toScreen(trX[i1], trY[i1]);
      const cx = c.x;
      const cy = c.y + lift1;
      const d = toScreen(trFX[i1], trFY[i1]);
      const dx = d.x;
      const dy = d.y + lift1;
      ctx.globalAlpha = (rich ? 0.08 : 0.04) + (rich ? 0.5 : 0.26) * k;
      ctx.strokeStyle = bike.heat > 0.82 ? '#ff4ad0' : '#ff3048';
      ctx.lineWidth = 3.2 * (0.25 + k) * (rich ? 1 : 0.65);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.globalAlpha = (rich ? 0.08 : 0.04) + (rich ? 0.45 : 0.22) * k;
      ctx.strokeStyle = '#5ef6ff';
      ctx.lineWidth = 2.2 * (0.25 + k) * (rich ? 1 : 0.65);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(dx, dy);
      ctx.stroke();
    }
    ctx.restore();
  }

  let shellPlayer = false;
  let shellRivalNow = '';
  let shellTintNow = '';
  function shellGrad(y0) {
    const id = shellRivalNow || shellTintNow || 'stock';
    let pack = shellPacks[id];
    if (!pack) {
      allocSites.bike += 1;
      const stops = shellRivalNow
        ? [[0, '#ffffff'], [0.25, shellRivalNow], [1, '#1a1222']]
        : shellTintNow
          ? [[0, '#ffffff'], [0.35, shellTintNow], [1, '#2a2e3a']]
          : [[0, '#ffffff'], [0.45, '#e4ebf3'], [0.8, '#aab4c3'], [1, '#6d7788']];
      const make = function (a, b) {
        const g = ctx.createLinearGradient(0, a, 0, b);
        for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
        return g;
      };
      pack = { a: make(-14, -5), b: make(-17, -8), c: make(-21, 9) };
      shellPacks[id] = pack;
    }
    if (y0 === -17) return pack.b;
    if (y0 === -14) return pack.a;
    return pack.c;
  }
  function strokeShell() {
    if (shellPlayer) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.6;
      ctx.stroke();
    }
    ctx.strokeStyle = '#120818';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  function drawBike(x, y, pitch, juice, heat, boosting, alpha, spin, scaleMul) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-pitch);
    const s = 1.35 * (juice || 1) * (scaleMul || 1);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const rival = paintGlow;
    const hot = !rival && heat > 0.82;
    const rim = rival || (hot ? '#ff4ad0' : '#f4fbff');
    const accent = rival || shellColor() || '#5ef6ff';
    const shellTint = shellColor();
    const rich = fxRich();
    const INK = '#120818';
    shellPlayer = !rival && alpha > 0.85;
    if (paintBeam && rich) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rival ? '#bff6ff' : 'rgba(190,240,255,0.38)';
      ctx.beginPath();
      ctx.moveTo(39, -9);
      ctx.lineTo(130, -18);
      ctx.lineTo(130, 5);
      ctx.lineTo(39, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (rich) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      stamp(glowDot(hot ? '#ff4ad0' : '#ff3048', 14), -47, -9);
      ctx.restore();
    }
    ctx.strokeStyle = '#1a1f2b';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(-10, 3);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#262c3a';
    ctx.beginPath();
    ctx.moveTo(-26, -8);
    ctx.lineTo(-6, 5);
    ctx.lineTo(12, -8);
    ctx.stroke();
    poly(POLY_FAIR);
    ctx.fillStyle = '#10131c';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = '#2c3344';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-38, -4);
    ctx.lineTo(-16, 3);
    ctx.moveTo(-30, -5);
    ctx.lineTo(-12, -1);
    ctx.stroke();
    ctx.strokeStyle = '#3a4252';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.lineTo(21, -14);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(31, 0);
    ctx.lineTo(21.5, -13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(6, -7);
    ctx.lineTo(10, 4);
    ctx.lineTo(-2, 8);
    ctx.lineTo(-12, 5);
    ctx.closePath();
    ctx.fillStyle = '#141824';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = hexA(accent, 0.9);
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-9 + i * 5, -3);
      ctx.lineTo(-11 + i * 5, 5);
      ctx.stroke();
    }
    wheelV2(-36, 0, 15, rim, spin, rich);
    wheelV2(32, 2, 13, rim, spin, rich);
    shellRivalNow = rival || '';
    shellTintNow = shellTint || '';
    poly(POLY_NOSE);
    ctx.fillStyle = shellGrad(-14);
    ctx.fill();
    strokeShell();
    poly(POLY_BROW);
    ctx.fillStyle = '#1b2030';
    ctx.fill();
    poly(POLY_TANK);
    ctx.fillStyle = shellGrad(-17);
    ctx.fill();
    strokeShell();
    poly(POLY_SHELL);
    ctx.fillStyle = shellGrad(-21);
    ctx.fill();
    strokeShell();
    poly(POLY_CHEEK);
    ctx.fillStyle = rival ? 'rgba(18,8,24,0.45)' : 'rgba(70,84,104,0.55)';
    ctx.fill();
    poly(POLY_TIP);
    ctx.fillStyle = 'rgba(30,40,60,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-44, -13.5);
    ctx.lineTo(-25, -13.5);
    ctx.moveTo(5, -16);
    ctx.lineTo(15, -14.5);
    ctx.moveTo(13, -14);
    ctx.lineTo(20, -20);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = rich ? 'lighter' : 'source-over';
    ctx.strokeStyle = hexA(accent, 0.95);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-38, -7);
    ctx.lineTo(-14, -6);
    ctx.moveTo(6, -5);
    ctx.lineTo(30, -6);
    ctx.stroke();
    if (rich) stamp(glowDot(rival || '#bff6ff', 9), 39, -8);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(36, -9.4, 4, 1.6);
    ctx.fillStyle = hot ? '#ff4ad0' : '#ff3048';
    ctx.fillRect(-50, -11, 3, 2.4);
    if (boosting && !rival) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(94,246,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(-48, -6);
      ctx.lineTo(-80, -3);
      ctx.lineTo(-48, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function wheelV2(wx, wy, r, rim, spin, rich) {
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0e15';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#05060a';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wx, wy, r - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#151a25';
    ctx.fill();
    if (rich) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      stamp(glowRing(rim, Math.round(r - 3), 1.6, 5), wx, wy);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(wx, wy, r - 3, 0, Math.PI * 2);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = rim;
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(spin);
    ctx.strokeStyle = 'rgba(200,220,255,0.28)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(r * 0.22, 0);
      ctx.lineTo(r * 0.62, 0);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(wx, wy, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#3a4252';
    ctx.fill();
  }

  function drawActor(actor, heat, boosting) {
    const gnd = queryGround(actor.x).h;
    const p = actor.pitch || 0;
    const sc = actor.scale || 1;
    const lift = 15 * 1.35 * sc;
    const axle = toScreen(actor.x - Math.sin(p) * lift, actor.y + Math.cos(p) * lift);
    const shadow = toScreen(actor.x, gnd);
    const liftPx = Math.max(0, actor.y - gnd);
    ctx.fillStyle = 'rgba(4, 2, 10, 0.45)';
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y + 3, Math.max(8, 22 * sc - liftPx * 0.06), 4, 0, 0, Math.PI * 2);
    ctx.fill();
    let alpha = actor.alpha == null ? 1 : actor.alpha;
    if (actor.invuln > 0 && Math.sin(time * 30) > 0) alpha = 0.45;
    const spin = (actor.x || 0) * 0.08;
    paintGlow = actor.glow || null;
    paintBeam = actor.alpha == null || actor.alpha > 0.8;
    drawBike(axle.x, axle.y, p, actor.juice || 1, heat, boosting, alpha, spin, sc);
    if ((actor.laneF || 0) > 1.5) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#050308';
      ctx.beginPath();
      ctx.ellipse(axle.x, axle.y - 4, 48, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }
    paintGlow = null;
    paintBeam = true;
  }

  function drawParticles() {
    const rich = fxRich();
    let drawn = 0;
    const cap = rich ? 80 : 24;
    if (rich) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
    }
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      if (drawn >= cap) break;
      drawn += 1;
      const a = Math.max(0, p.life / p.max);
      const s = toScreen(p.wx, p.wy);
      if (rich) {
        const tail = toScreen(p.wx - p.vx * 0.028, p.wy - p.vy * 0.028);
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w || 1.6;
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
      }
    }
    if (rich) ctx.restore();
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

  function drawArch(x) {
    const g = queryGround(x);
    const left = toScreen(x, g.h);
    const top = toScreen(x, g.h + 120);
    const right = toScreen(x + 70, g.h);
    roundPath(left.x, top.y, 16, left.y - top.y, 4);
    paint('#1a1034', 4);
    roundPath(right.x, top.y, 16, right.y - top.y, 4);
    paint('#1a1034', 4);
    const bw = right.x - left.x + 20;
    const bh = 28;
    roundPath(left.x - 4, top.y, bw, bh, 4);
    paint('#241448', 4);
    const checks = 8;
    const cw = bw / checks;
    for (let i = 0; i < checks; i++) {
      ctx.fillStyle = (i % 2) ? PAL.cyan : PAL.mag;
      ctx.fillRect(left.x - 2 + i * cw, top.y + 4, cw - 1, 9);
      ctx.fillStyle = (i % 2) ? PAL.mag : '#120818';
      ctx.fillRect(left.x - 2 + i * cw, top.y + 14, cw - 1, 9);
    }
  }

  function drawDressing() {
    if (!track) return;
    const span0 = Math.floor((cameraX - 40) / MARK_GAP) * MARK_GAP;
    for (let x = span0; x < cameraX + W + 80; x += MARK_GAP) {
      if (x < 400 || x > finishX) continue;
      const g = queryGround(x);
      const foot = toScreen(x, g.h);
      const cap = toScreen(x, g.h + 28);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(foot.x - 2, cap.y, 4, foot.y - cap.y);
      ctx.fillStyle = PAL.lamp;
      ctx.fillRect(foot.x - 7, cap.y - 8, 14, 10);
    }
    if (200 > cameraX - 120 && 280 < cameraX + W) drawArch(200);
    const cps = track.checkpoints || [];
    for (let i = 0; i < cps.length; i++) {
      if (cps[i] < cameraX - 40 || cps[i] > cameraX + W + 40) continue;
      const g = queryGround(cps[i]);
      const foot = toScreen(cps[i], g.h);
      const top = toScreen(cps[i], g.h + 64);
      ctx.strokeStyle = (track && track.accent) || PAL.cyan;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(foot.x, foot.y);
      ctx.lineTo(foot.x, top.y);
      ctx.stroke();
      ctx.fillStyle = (track && track.accent) || PAL.cyan;
      ctx.fillRect(foot.x - 7, top.y, 14, 5);
    }
    const ceilings = track.ceilings || [];
    for (let i = 0; i < ceilings.length; i++) {
      const c = ceilings[i];
      if (c.x + c.w < cameraX || c.x > cameraX + W) continue;
      const a = toScreen(c.x, queryGround(c.x).h + c.clear);
      const ax = a.x;
      const ay = a.y - 2 * laneGap;
      const b = toScreen(c.x + c.w, queryGround(c.x + c.w).h + c.clear);
      const bx = b.x;
      const by = b.y - 2 * laneGap;
      const x0 = Math.min(ax, bx);
      const x1 = Math.max(ax, bx);
      const yRoof = Math.min(ay, by);
      ctx.fillStyle = '#120818';
      ctx.fillRect(x0, yRoof, Math.abs(x1 - x0), 14);
      ctx.fillStyle = (track && track.accent) || PAL.mag;
      ctx.fillRect(x0, yRoof + 7, Math.abs(x1 - x0), 4);
      ctx.fillStyle = '#120818';
      for (let post = 0; post < 3; post++) {
        const px = x0 + (x1 - x0) * (post / 2);
        ctx.fillRect(px - 3, yRoof, 6, 2 * laneGap + 18);
      }
    }
    const loops = track.loops || [];
    for (let i = 0; i < loops.length; i++) {
      const loop = loops[i];
      ctx.beginPath();
      for (let s = 0; s <= 32; s++) {
        const pose = loopPose(loop, s / 32);
        const p = toScreen(pose.x, pose.y);
        const py = p.y - laneGap;
        if (s === 0) ctx.moveTo(p.x, py);
        else ctx.lineTo(p.x, py);
      }
      ctx.strokeStyle = (track && track.accent) || '#b08cff';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
  }

  const LEAN_LABEL = 'LEAN \u25b8';

  function bandStrip(band, i0, i1) {
    const top = -band * laneGap;
    ctx.beginPath();
    ctx.moveTo(gpX[i0], gpY[i0] + top);
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(gpX[i], gpY[i] + top);
    for (let i = i1; i >= i0; i--) ctx.lineTo(gpX[i], gpY[i] + top + laneGap - 2);
    ctx.closePath();
  }

  function spanIdx(x0, x1) {
    const gx0 = cameraX - 40;
    let i0 = Math.ceil((x0 - gx0) / 10);
    let i1 = Math.floor((x1 - gx0) / 10);
    if (i0 < 0) i0 = 0;
    if (i1 > gpN - 1) i1 = gpN - 1;
    return i1 > i0 ? (i0 + i1 * 100000) : -1;
  }

  function drawFields(band) {
    const drags = track && track.drags;
    if (!drags || gpN < 2) return;
    const st = track.style || { spacing: 40, lines: 2, alpha: 0.3, hz: 0, amp: 0 };
    const motion = !reduceMotion;
    for (let d = 0; d < drags.length; d++) {
      const f = drags[d];
      const lane = f.lane == null ? 'all' : f.lane;
      if (lane !== 'all' && lane !== band) continue;
      if (f.x1 < cameraX - 40 || f.x0 > cameraX + W + 40) continue;
      const packed = spanIdx(f.x0, f.x1);
      if (packed < 0) continue;
      const i0 = packed % 100000;
      const i1 = (packed / 100000) | 0;
      bandStrip(band, i0, i1);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = PAL.drag;
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(gpX[i0], gpY[i0] - band * laneGap);
      for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(gpX[i], gpY[i] - band * laneGap);
      ctx.strokeStyle = PAL.drag;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (fxRich() && motion && st.lines) {
        const pulse = st.hz ? (1 + Math.sin(time * st.hz * 6.2832) * st.amp) : 1;
        ctx.globalAlpha = st.alpha * pulse;
        ctx.strokeStyle = PAL.drag;
        const step = Math.max(2, (i1 - i0) / st.lines);
        for (let n = 1; n <= st.lines; n++) {
          const i = i0 + ((n * step) | 0);
          if (i >= i1) break;
          const bow = motion ? Math.sin(time * 2 + n) * 6 : 0;
          ctx.beginPath();
          ctx.moveTo(gpX[i], gpY[i] - band * laneGap + 3);
          ctx.lineTo(gpX[i] - bow, gpY[i] - band * laneGap + laneGap * 0.5);
          ctx.lineTo(gpX[i], gpY[i] - band * laneGap + laneGap - 4);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawBoosts(band) {
    const pads = track && track.boosts;
    if (!pads || gpN < 2) return;
    for (let p = 0; p < pads.length; p++) {
      const pad = pads[p];
      const lane = pad.lane == null ? 'all' : pad.lane;
      if (lane !== 'all' && lane !== band) continue;
      const x1 = pad.x + pad.len;
      if (x1 < cameraX - 40 || pad.x > cameraX + W + 40) continue;
      const packed = spanIdx(pad.x, x1);
      if (packed < 0) continue;
      const i0 = packed % 100000;
      const i1 = (packed / 100000) | 0;
      bandStrip(band, i0, i1);
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = PAL.boost;
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = PAL.boost;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (band !== 0) return;
    ctx.font = '800 11px Nunito, sans-serif';
    const arrows = track && track.arrows;
    if (arrows) {
      ctx.fillStyle = PAL.lamp;
      for (let a = 0; a < arrows.length; a++) {
        const ar = arrows[a];
        if (ar.x1 < cameraX || ar.x0 > cameraX + W) continue;
        for (let n = 0; n < 3; n++) {
          const x = ar.x0 + (ar.x1 - ar.x0) * ((n + 1) / 4);
          const s = toScreen(x, queryGround(x).h);
          ctx.fillText('\u25b8', s.x, s.y - laneGap - 6);
        }
      }
    }
    const lips = track && track.leanLips;
    if (lips) {
      ctx.fillStyle = PAL.lamp;
      ctx.font = '800 11px Nunito, sans-serif';
      for (let i = 0; i < lips.length; i++) {
        const sign = lips[i].signX;
        if (sign < cameraX - 20 || sign > cameraX + W + 20) continue;
        const s = toScreen(sign, queryGround(sign).h);
        ctx.fillRect(s.x - 2, s.y - 2 * laneGap - 18, 3, 2 * laneGap + 18);
        ctx.fillText(LEAN_LABEL, s.x + 6, s.y - laneGap);
      }
    }
  }

  function drawCoins(band) {
    const coins = track.coins || [];
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (c.got || c.x < cameraX - 40 || c.x > cameraX + W + 40) continue;
      const lane = c.lane == null ? 'all' : c.lane;
      if (lane === 'all') {
        if (band !== 0) continue;
      } else if (lane !== band) continue;
      const s = toScreen(c.x, queryGround(c.x).h + c.lift);
      const sx = s.x;
      const sy = s.y - (lane === 'all' ? laneGap : lane * laneGap);
      if (lane === 'all') {
        ctx.strokeStyle = PAL.cyan;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, s.y - 2 * laneGap);
        ctx.lineTo(sx, s.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (fxRich()) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        stamp(glowDot(PAL.cyan, 22), sx, sy);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(sx, sy, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#e9fbff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = PAL.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.cyan;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = PAL.mag;
      ctx.fillRect(sx - 1.5, sy - 5, 3, 10);
    }
  }

  function rivalGlow(glow) {
    const shell = shellColor();
    if (!shell || shell !== glow) return glow;
    if (glow === '#5ef6ff') return '#7aa2ff';
    if (glow === '#ff4ad0') return '#ff8a3a';
    if (glow === '#ffe08a') return '#b6ff6a';
    if (glow === '#b08cff') return '#7af6ff';
    if (glow === '#ff6a4a') return '#ffe08a';
    return '#d0d4e0';
  }

  function drawRivals() {
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      if (r.x < cameraX - 80 || r.x > cameraX + W + 80) continue;
      const g = queryGround(r.x);
      const ghost = {
        x: r.x,
        y: g.h,
        pitch: Math.atan(clamp(g.slope, -1.2, 1.2)),
        scale: r.scale,
        glow: rivalGlow(r.glow),
        juice: 1,
        invuln: 0,
      };
      drawActor(ghost, 0.2, false);
      const tag = toScreen(r.x, g.h + 72);
      ctx.font = '800 14px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = PAL.ink;
      ctx.fillStyle = r.glow;
      ctx.strokeText(r.name, tag.x, tag.y);
      ctx.fillText(r.name, tag.x, tag.y);
    }
  }

  // [RX] per-frame state the background reacts to (screen-space rider). One reused object.
  const bgS = { bx: 0, by: 0, speed: 0, boost: false, air: false, airTime: 0, heat: 0 };
  function bgState() {
    if (phase !== 'play' && phase !== 'countdown') return null;
    const p = toScreen(bike.x, bike.y + 20);
    bgS.bx = p.x; bgS.by = p.y - (bike.laneF || 0) * laneGap; bgS.speed = bike.speed; bgS.boost = !!bike.wasBoost; bgS.air = bike.air; bgS.airTime = bike.airTime; bgS.heat = bike.heat;
    return bgS;
  }
  function rx(type, d) { if (bg && fxRich() && !portrait) bgReact(bg, type, d, bgState(), W); }

  function laneBand(lf) {
    return lf > 1.5 ? 2 : lf > 0.5 ? 1 : 0;
  }
  function drawLaned(actor, heat, boosting) {
    const lf = actor.laneF || 0;
    ctx.save();
    ctx.translate(0, -lf * laneGap);
    const prev = actor.scale;
    actor.scale = (prev == null ? 1 : prev) * (1 - 0.09 * lf);
    drawActor(actor, heat, boosting);
    actor.scale = prev;
    ctx.restore();
  }
  const rivalActor = { x: 0, y: 0, pitch: 0, scale: 1, glow: null, juice: 1, invuln: 0, laneF: 0, alpha: 1 };
  const ghostActor = { x: 0, y: 0, pitch: 0, scale: 1, glow: '#d5e8ff', alpha: 0.38, juice: 1, invuln: 0, laneF: 0 };
  function drawBand(band, boosting) {
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      const lf = r.laneF || 0;
      if (laneBand(lf) !== band) continue;
      if (r.x < cameraX - 80 || r.x > cameraX + W + 80) continue;
      queryGround(r.x);
      rivalActor.x = r.x;
      rivalActor.y = G0.h - (r.arc || 0);
      rivalActor.pitch = Math.atan(clamp(G0.slope, -1.2, 1.2));
      rivalActor.glow = rivalGlow(r.glow);
      rivalActor.laneF = lf;
      rivalActor.scale = 1;
      rivalActor.alpha = r.funnel ? 0.5 : 1;
      drawLaned(rivalActor, 0.2, false);
      const tag = toScreen(r.x, G0.h + 72);
      const tx = tag.x;
      const ty = tag.y - lf * laneGap;
      ctx.font = '800 14px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = PAL.ink;
      ctx.fillStyle = r.warn > 0 ? '#ff3048' : r.glow;
      ctx.strokeText(r.name, tx, ty);
      ctx.fillText(r.name, tx, ty);
      if (r.warn > 0) {
        const tail = toScreen(r.x - 49, G0.h - (r.arc || 0));
        ctx.fillStyle = '#ff3048';
        ctx.beginPath();
        ctx.arc(tail.x, tail.y - lf * laneGap, 6, 0, 6.3);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#14080c';
        ctx.fillStyle = '#ff3048';
        ctx.strokeText('!', tx, ty - 16);
        ctx.fillText('!', tx, ty - 16);
      } else if (r.signalT > 0) {
        ctx.fillStyle = '#ffe08a';
        ctx.fillText(r.signalDir > 0 ? '▲' : '▼', tx, ty - 16);
      }
    }
    if (ghostOn && phase === 'play') {
      const pose = ghostPose(raceTime);
      const gl = pose && pose.l ? pose.l : 0;
      if (pose && laneBand(gl) === band) {
        ghostActor.x = pose.x;
        ghostActor.y = pose.y;
        ghostActor.pitch = pose.p;
        ghostActor.laneF = gl;
        ghostActor.scale = 1;
        drawLaned(ghostActor, 0, false);
      }
    }
    if (laneBand(bike.laneF || 0) === band) {
      drawLaned(bike, bike.heat, boosting);
      const you = toScreen(bike.x, bike.y + 64);
      let yx = you.x + 46;
      let yy = you.y - (bike.laneF || 0) * laneGap;
      if (muteR > muteL && yx + 18 > muteL && yx - 18 < muteR && yy > muteT && yy - 16 < muteB) {
        const under = toScreen(bike.x, bike.y - 30);
        yx = under.x + 46;
        yy = under.y - (bike.laneF || 0) * laneGap;
      }
      ctx.font = '800 13px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#120818';
      ctx.fillStyle = '#ffffff';
      ctx.strokeText('YOU', yx, yy);
      ctx.fillText('YOU', yx, yy);
    }
  }

  function render() {
    const layout = layoutMetrics();
    const themeId = (currentMap && currentMap.theme) || 'pier';
    const hy = layout.horizon;
    if (!bg || bg.hy !== hy || bg.W !== W || bg.H !== H || bg.theme !== themeId) {
      releaseBackground(bg);
      bg = buildBackground(currentMap || { theme: themeId }, W, H, hy, dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.clearRect(0, 0, W, H);
    if (shake > 0.02 && !reduceMotion) {
      const mag = shake * 7;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    buildGroundPts();
    drawBackground(ctx, bg, cameraX, time, W, H, fxRich(), bgState());
    if (phase === 'title' || phase === 'help') {
      drawDeck(2);
      drawFields(2);
      drawBoosts(2);
      drawCoins(2);
      drawHazards(2);
      drawDeck(1);
      drawFields(1);
      drawBoosts(1);
      drawCoins(1);
      drawHazards(1);
      drawGround();
      drawFields(0);
      drawBoosts(0);
      drawCoins(0);
      drawHazards(0);
      drawDressing();
      drawLaned(demo, 0.2, false);
    } else {
      const boosting = readInput().turbo && !bike.overheated && phase === 'play';
      drawDeck(2);
      drawFields(2);
      drawBoosts(2);
      drawCoins(2);
      drawHazards(2);
      drawBand(2, boosting);
      drawDeck(1);
      drawFields(1);
      drawBoosts(1);
      drawCoins(1);
      drawHazards(1);
      drawBand(1, boosting);
      drawGround();
      drawFields(0);
      drawBoosts(0);
      drawCoins(0);
      drawHazards(0);
      drawDressing();
      drawTrail();
      drawBand(0, boosting);
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

  const markEls = Object.create(null);
  function placeMark(id, x) {
    const el = markEls[id] || (markEls[id] = $(id));
    if (!el) return;
    const pct = (clamp(x / finishX, 0, 1) * 1000) | 0;
    if (el._pct === pct) return;
    el._pct = pct;
    el.style.left = pctText[pct] || ((pct / 10) + '%');
  }
  let hudCent = -1;
  let hudSpeed = -1;
  let hudHeat = -1;
  let hudGap = -1;
  let hudCoins = -1;
  let hudPlace = -1;
  let hudMap = '';
  let hudLabel = '';
  let hudNose = '';
  const PLACE_TEXT = ['', '1ST', '2ND', '3RD', '4TH'];
  function syncHud() {
    const live = phase === 'play' || phase === 'countdown' || phase === 'pause';
    if (!live) return;
    const cent = Math.round(raceTime * 100);
    if (cent !== hudCent) {
      hudCent = cent;
      setText($('time-val'), fmt(raceTime));
    }
    $('time-val').classList.toggle('penalty', penaltyFlash > 0);
    $('time-val').classList.toggle('saved', rewardFlash > 0);
    if (coinBank !== hudCoins) {
      hudCoins = coinBank;
      setText($('coin-val'), String(coinBank));
    }
    const mapName = currentMap ? currentMap.name : '';
    if (mapName !== hudMap) {
      hudMap = mapName;
      setText($('map-name'), mapName);
    }
    const shown = phase === 'countdown' ? Math.round(rev * 420) : bike.speed;
    const speedK = kmh(shown) | 0;
    if (speedK !== hudSpeed) {
      hudSpeed = speedK;
      setText($('speed-val'), String(speedK));
      const speedNeedle = -120 + clamp(speedK / 300, 0, 1) * 240;
      $('speed-needle').style.transform = 'rotate(' + speedNeedle.toFixed(0) + 'deg)';
    }
    const heat = $('heat');
    const ratio = bike.overheated ? Math.max(bike.heat, 0.08) : bike.heat;
    const heatPct = Math.round(ratio * 100);
    if (heatPct !== hudHeat) {
      hudHeat = heatPct;
      heat.setAttribute('aria-valuenow', String(heatPct));
      $('heat-needle').style.transform = 'rotate(' + (-120 + ratio * 240).toFixed(0) + 'deg)';
    }
    heat.classList.toggle('locked', bike.overheated);
    const label = bike.overheated ? 'LOCK' : bike.heat > 0.82 ? 'HOT' : 'HEAT';
    if (label !== hudLabel) {
      hudLabel = label;
      setText($('heat-label'), label);
    }
    $('heat-label').classList.toggle('hot', bike.heat > 0.82 || bike.overheated);
    const rows = standings();
    let place = 1;
    for (let i = 0; i < rows.length; i++) if (rows[i].id === 'you') place = i + 1;
    const placeEl = $('place');
    if (place !== hudPlace) {
      hudPlace = place;
      setText(placeEl, PLACE_TEXT[place] || ordinal(place));
    }
    placeEl.classList.toggle('lead', place === 1);
    placeEl.classList.toggle('mid', place === 2 || place === 3);
    const pip = $('lane-pip');
    if (pip) {
      const active = Math.max(0, Math.min(2, Math.round(bike.laneF || 0)));
      for (let i = 0; i < pip.children.length; i++) pip.children[i].classList.toggle('on', i === active);
    }
    placeMark('mark-you', bike.x);
    placeMark('mark-nyx', rivals[0].x);
    placeMark('mark-vex', rivals[1].x);
    placeMark('mark-ion', rivals[2].x);
    const post = Math.min(finishX, Math.ceil((bike.x + 8) / MARK_GAP) * MARK_GAP);
    const gapM = Math.max(0, Math.round((post - bike.x) / 12));
    if (gapM !== hudGap) {
      hudGap = gapM;
      setText($('gap-val'), gapM + ' M');
    }
    const nose = wrapAngle(bike.pitch);
    const deg = String(Math.round(-nose * 180 / Math.PI));
    if (deg !== hudNose) {
      hudNose = deg;
      $('horizon-line').style.transform = 'translateY(-50%) rotate(' + deg + 'deg)';
    }
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
    const ids = ['title', 'help', 'pause', 'results', 'maps', 'garage'];
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
    const sheet = ['help', 'pause', 'results', 'maps', 'garage'].some(function (id) {
      const el = $('overlay-' + id);
      return el && !el.classList.contains('hidden');
    });
    $('btn-mute').classList.toggle('under-sheet', sheet);
    if (phase !== 'play') $('app').classList.remove('overheat');
    document.body.classList.toggle('racing', phase === 'play');
    cacheEdgeRects();
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
    bike.debugLock = false;
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
    bike.lane = 0;
    bike.laneF = 0;
    bike.hopT = 1;
    bike.hopFrom = 0;
    bike.laneQueue = 0;
    bike.laneGrace = 0;
    bike.airLanePress = 0;
    bike.wasBoost = false;
    bike.boostArm = 0;
    bike.padT = 0;
    bike.inDrag = 0;
    bike.guardLanding = false;
    bike.rivalImmune = 0;
    bike.crashCause = '';
    bike.leanFlight = false;
    bike.leanAnnounced = 0;
    clearMergeQueue();
    bike.ringMode = 0;
    richFlips = 0;
    richLow = 0;
    richHigh = 0;
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
    trLen = 0;
    trHead = 0;
    runCoins = 0;
    ghostN = 0;
    ghostAcc = 0;
    bike.looping = null;
    bike.loopSkip = null;
    bike.loopU = 0;
    placeRivals();
    resetRunStats();
    if (track && track.coins) {
      for (let i = 0; i < track.coins.length; i++) track.coins[i].got = false;
    }
    for (let i = 0; i < pool.length; i++) pool[i].alive = false;
  }

  function startCountdown() {
    resetRace();
    if (currentMap) loadGhost(currentMap.id);
    phase = 'countdown';
    countStage = 0;
    countLeft = 0.7;
    goLeft = 0;
    showOnly('');
    applyChrome();
    setCountdown('3');
    if (garage && garage.stock === false) toast('TUNED RUN', '');
    unlockAudio();
    audio.beep(false);
  }

  function beginPlay() {
    phase = 'play';
    touch.upPress = 0;
    touch.downPress = 0;
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
    rx('finish', { place: standings().findIndex((r) => r.id === 'you') + 1 });
    const id = currentMap ? currentMap.id : 'nite-pier';
    const prev = mapRecord(id);
    const debugRun = !!debugOn;
    const medalRun = !!garage.stock && !debugRun;
    const record = medalRun && (prev.best == null || raceTime < prev.best);
    let stars = 1;
    if (currentMap && raceTime <= currentMap.star2) stars = 2;
    if (currentMap && raceTime <= currentMap.star3) stars = 3;
    const coinTotal = (track.coins || []).length;
    const allCoins = coinTotal > 0 && runCoins >= coinTotal;
    lastResult = { stars: stars, circuit: allCoins, clean: crashes === 0, time: raceTime, crashes: crashes, coins: runCoins, coinTotal: coinTotal };
    if (medalRun) {
      mapProgress[id] = {
        best: record ? raceTime : prev.best,
        stars: Math.max(prev.stars || 0, stars),
        clean: prev.clean || crashes === 0,
        circuit: prev.circuit || allCoins,
      };
      saveMapProgress();
      if (record && ghostN > 1) {
        try { localStorage.setItem('volt-alley-ghost-' + id, JSON.stringify(ghostSlots.slice(0, ghostN))); } catch (err) { /* full */ }
      }
    }
    best = mapRecord(id).best;
    if (medalRun && best != null) saveNum(BEST_KEY, best);
    setText($('result-kicker'), debugRun ? 'DEBUG RUN' : (!medalRun ? 'TUNED RUN' : (record ? 'NEW RECORD' : (stars >= 3 ? '3 STARS' : 'SECTOR CLEAR'))));
    setText($('result-time'), fmt(raceTime));
    setText($('result-best'), fmt(best));
    const provTag = currentMap && currentMap.provisional ? ' \u00b7 PROVISIONAL' : '';
    setText($('result-stars'), debugRun ? 'DEBUG RUN · NOT SAVED' : ((!medalRun ? 'TUNED RUN · NO RECORDS OR UNLOCKS' : '') + (medalRun ? (stars + ' STAR' + (stars > 1 ? 'S' : '') + (allCoins ? ' · CIRCUIT' : '') + (crashes === 0 ? ' · CLEAN' : '') + provTag) : '')));
    setText($('result-run'), 'SAVED ' + runStats.saved.toFixed(1) + 's · HOPS ' + runStats.hops + ' · BLOCKS ' + runStats.blocksSuffered + ' · REAR ' + runStats.faults.rear);
    setText($('result-faults'), String(crashes));
    setText($('result-cleans'), String(cleans));
    setText($('result-top'), String(kmh(topSpeed)));
    const rows = standings();
    let place = 1;
    for (let i = 0; i < rows.length; i++) if (rows[i].id === 'you') place = i + 1;
    setText($('result-place'), ordinal(place));
    setText($('result-coins'), String(coinBank));
    setText($('title-coins'), 'COINS ' + coinBank);
    setText($('title-best'), 'BEST ' + fmt(best));
    const list = window.VoltMaps.list;
    let idx = 0;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) idx = i;
    const next = list[idx + 1];
    const nextBtn = $('btn-next-map');
    if (nextBtn) nextBtn.classList.toggle('hidden', !(next && mapUnlocked(next, idx + 1)));
    tickBlocks();
    commitRun(true);
    flushCoins();
    showOnly('results');
    hideCountdown();
    applyChrome();
    audio.finish();
  }

  function openHelp(back) {
    helpBack = back;
    setText($('btn-help-ride'), back === 'pause' ? 'BACK' : 'MAPS');
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
    setPhase('title');
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
    openMaps();
  }

  function onRide() {
    unlockAudio();
    uiBlip();
    if (!seenHelp) openHelp('start');
    else openMaps();
  }

  function starGlyph(n) {
    return (n >= 1 ? '★' : '☆') + (n >= 2 ? '★' : '☆') + (n >= 3 ? '★' : '☆');
  }

  function medalText(rec) {
    let text = '';
    if (rec.clean) text += 'CLEAN';
    if (rec.circuit) text += (text ? ' ' : '') + 'CIRCUIT';
    return text;
  }
  function paintTuned() {
    const on = garage && garage.stock === false;
    const btn = $('btn-map-race');
    const line = $('tuned-line');
    if (btn) btn.classList.toggle('tuned', on);
    if (line) line.classList.toggle('hidden', !on);
  }
  function renderMapCards() {
    const row = $('map-row');
    if (!row || !window.VoltMaps) return;
    const list = window.VoltMaps.list;
    if (row.children.length !== list.length) {
      let html = '';
      for (let i = 0; i < list.length; i++) {
        html += '<button type="button" class="map-card" data-id="' + list[i].id + '"><i></i><b></b><small></small><em></em><span class="stars"></span><span class="medal"></span></button>';
      }
      row.innerHTML = html;
    }
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const card = row.children[i];
      const open = mapUnlocked(m, i);
      const rec = mapRecord(m.id);
      card.className = 'map-card' + (open ? '' : ' locked') + (m.id === selectedMapId ? ' selected' : '');
      card.disabled = !open;
      card.style.borderColor = '';
      card.children[0].style.background = m.accent;
      card.children[1].textContent = m.name;
      card.children[2].textContent = m.tier;
      if (!open) {
        const rule = m.id === 'ash-veil' ? 'FINISH VOID WELL OR 9 STARS' : ('FINISH ' + String(m.unlock || '').replace(/-/g, ' ').toUpperCase());
        card.children[3].textContent = 'LOCK · ' + rule;
        card.children[4].textContent = '';
        card.children[5].textContent = '';
      } else {
        card.children[3].textContent = rec.best == null ? 'NO TIME' : fmt(rec.best);
        card.children[4].textContent = starGlyph(rec.stars || 0);
        const medal = medalText(rec);
        const prov = m.provisional ? ('3\u2605 ' + m.star3 + ' \u00b7 2\u2605 ' + m.star2 + ' PROV') : '';
        card.children[5].textContent = medal && prov ? (medal + ' \u00b7 ' + prov) : (medal || prov);
      }
    }
    paintTuned();
    setText($('maps-stars'), totalStars() + '/15');
    setText($('maps-coins'), String(coinBank));
    setText($('btn-map-ghost'), ghostOn ? 'GHOST ON' : 'GHOST OFF');
    const shells = totalStars() >= 15 ? 5 : totalStars() >= 12 ? 4 : totalStars() >= 9 ? 3 : totalStars() >= 6 ? 2 : totalStars() >= 3 ? 1 : 0;
    setText($('maps-shells'), 'SHELLS ' + shells + '/5');
  }

  function renderGarage() {
    const coins = $('garage-coins');
    if (coins) coins.textContent = coinBank + ' COINS';
    const shells = $('shell-row');
    const tunes = $('tune-row');
    if (shells) {
      let html = '';
      const stars = totalStars();
      for (let i = 0; i < SHELLS.length; i++) {
        const s = SHELLS[i];
        const owned = stars >= s.stars;
        const on = garage.shell === s.id;
        html += '<button type="button" class="garage-chip' + (on ? ' on' : '') + (owned ? '' : ' locked') + '" data-shell="' + s.id + '"' + (owned ? '' : ' disabled') + '>';
        html += s.name + (owned ? '' : ' · ' + s.stars) + '</button>';
      }
      shells.innerHTML = html;
    }
    if (tunes) {
      let html = '';
      for (let i = 0; i < TUNES.length; i++) {
        const t = TUNES[i];
        const owned = !!(garage.tunes && garage.tunes[t.id]);
        html += '<button type="button" class="garage-chip' + (owned ? ' on' : '') + '" data-tune="' + t.id + '">';
        html += t.name + (owned ? ' · OWNED' : ' · ' + t.cost) + '</button>';
      }
      tunes.innerHTML = html;
    }
    setText($('btn-stock'), garage.stock ? 'STOCK ON' : 'STOCK OFF');
    paintTuned();
    setText($('btn-haptics'), garage.haptics ? 'HAPTICS ON' : 'HAPTICS OFF');
  }

  function openGarage() {
    phase = 'garage';
    renderGarage();
    showOnly('garage');
    applyChrome();
  }

  function openMaps() {
    setPhase('maps');
    renderMapCards();
    showOnly('maps');
    applyChrome();
  }

  function startSelectedMap() {
    const list = window.VoltMaps.list;
    let index = 0;
    for (let i = 0; i < list.length; i++) if (list[i].id === selectedMapId) index = i;
    if (!mapUnlocked(list[index], index)) return;
    track = buildTrack(selectedMapId);
    loadGhost(selectedMapId);
    setText($('map-name'), currentMap ? currentMap.name : '');
    startCountdown();
  }

  let pausedFrom = 'play';
  function clearTouch() {
    touch.throttle = false;
    touch.turbo = false;
    touch.up = false;
    touch.down = false;
    touch.upPress = 0;
    touch.downPress = 0;
    touch.leanBack = false;
    touch.leanFwd = false;
  }
  function flushCoins() {
    if (debugOn) { coinsDirty = false; return; }
    if (!coinsDirty) return;
    coinsDirty = false;
    saveNum(COIN_KEY, coinBank);
  }
  function pauseGame() {
    if (phase !== 'play' && phase !== 'countdown') return;
    pausedFrom = phase;
    phase = 'pause';
    clearTouch();
    flushCoins();
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
    if (runOpen && (phase === 'pause' || phase === 'play' || phase === 'countdown')) commitRun(false);
    setPhase('title');
    pausedFrom = 'play';
    hideCountdown();
    showOnly('title');
    applyChrome();
    setText($('title-best'), 'BEST ' + fmt(best));
    setText($('title-coins'), 'COINS ' + coinBank);
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
      if (flag === 'up') touch.upPress = Math.min(2, touch.upPress + 1);
      if (flag === 'down') touch.downPress = Math.min(2, touch.downPress + 1);
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
    el.addEventListener('lostpointercapture', up);
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
    bindHold($('btn-lane-up'), 'up');
    bindHold($('btn-lane-down'), 'down');
    bindHold($('btn-lean-back'), 'leanBack');
    bindHold($('btn-lean-fwd'), 'leanFwd');

    bindPress($('btn-ride'), onRide);
    bindPress($('btn-maps-back'), () => { uiBlip(); toTitle(); });
    bindPress($('btn-map-race'), () => { unlockAudio(); uiBlip(); startSelectedMap(); });
    bindPress($('btn-open-garage'), () => { uiBlip(); openGarage(); });
    bindPress($('btn-garage-back'), () => { uiBlip(); openMaps(); });
    bindPress($('btn-stock'), () => { garage.stock = !garage.stock; saveGarage(); uiBlip(); renderGarage(); });
    bindPress($('btn-haptics'), () => { garage.haptics = !garage.haptics; saveGarage(); uiBlip(); renderGarage(); });
    const shellRow = $('shell-row');
    if (shellRow) {
      shellRow.addEventListener('click', (e) => {
        const chip = e.target.closest ? e.target.closest('[data-shell]') : null;
        if (!chip || chip.disabled) return;
        garage.shell = chip.getAttribute('data-shell');
        saveGarage();
        uiBlip();
        renderGarage();
      });
    }
    const tuneRow = $('tune-row');
    if (tuneRow) {
      tuneRow.addEventListener('click', (e) => {
        const chip = e.target.closest ? e.target.closest('[data-tune]') : null;
        if (!chip) return;
        const id = chip.getAttribute('data-tune');
        if (garage.tunes && garage.tunes[id]) return;
        const spec = TUNES.filter(function (t) { return t.id === id; })[0];
        if (!spec || coinBank < spec.cost) {
          const need = spec ? Math.max(0, spec.cost - coinBank) : 0;
          chip.classList.remove('shake');
          void chip.offsetWidth;
          chip.classList.add('shake');
          toast('NEED ' + need + ' MORE COINS', 'bad');
          uiBlip();
          return;
        }
        coinBank -= spec.cost;
        saveNum(COIN_KEY, coinBank);
        garage.tunes[id] = true;
        saveGarage();
        uiBlip();
        renderGarage();
      });
    }
    bindPress($('btn-map-ghost'), () => {
      ghostOn = !ghostOn;
      try { localStorage.setItem('volt-alley-ghost', ghostOn ? '1' : '0'); } catch (err) { /* ignore */ }
      uiBlip();
      renderMapCards();
    });
    const mapRow = $('map-row');
    if (mapRow) {
      mapRow.addEventListener('click', (e) => {
        const card = e.target.closest ? e.target.closest('.map-card') : null;
        if (!card || card.disabled) return;
        selectedMapId = card.getAttribute('data-id');
        uiBlip();
        renderMapCards();
      });
    }
    bindPress($('btn-next-map'), () => {
      const list = window.VoltMaps.list;
      let index = 0;
      for (let i = 0; i < list.length; i++) if (currentMap && list[i].id === currentMap.id) index = i;
      const next = list[index + 1];
      if (!next) return;
      selectedMapId = next.id;
      uiBlip();
      startSelectedMap();
    });
    bindPress($('btn-result-maps'), () => { uiBlip(); openMaps(); });
    bindPress($('btn-howto'), () => { unlockAudio(); uiBlip(); openHelp('title'); });
    bindPress($('btn-help-close'), () => { uiBlip(); closeHelp(); });
    bindPress($('btn-help-ride'), onHelpPrimary);
    bindPress($('btn-pause'), () => { uiBlip(); pauseGame(); });
    bindPress($('btn-resume'), () => { uiBlip(); resumeGame(); });
    bindPress($('btn-pause-retry'), () => { uiBlip(); startCountdown(); });
    bindPress($('btn-pause-howto'), () => { uiBlip(); openHelp('pause'); });
    bindPress($('btn-pause-title'), () => { uiBlip(); toTitle(); });
    bindPress($('btn-retry'), () => { uiBlip(); startCountdown(); });
    bindPress($('btn-copy-run'), () => {
      const text = JSON.stringify(lastRun || {});
      const btn = $('btn-copy-run');
      if (btn) btn.dataset.copied = text;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
      } catch (err) { /* ignore */ }
    });
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
      if (e.repeat && (e.code === 'Enter' || e.code === 'KeyP' || e.code === 'Escape' || e.code === 'KeyW' || e.code === 'KeyX' || e.code === 'ArrowUp' || e.code === 'ArrowDown')) return;
      if (!e.repeat && phase === 'play') {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') requestLane(1);
        else if (e.code === 'KeyX' || e.code === 'ArrowDown') requestLane(-1);
      }
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
    window.addEventListener('blur', () => { keys.clear(); clearTouch(); });
    document.addEventListener('touchmove', (e) => {
      // Let the help/pause panels scroll on short screens; block page bounce everywhere else.
      const panel = e.target && e.target.closest ? e.target.closest('.panel') : null;
      if (panel && panel.scrollHeight > panel.clientHeight + 1) return;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTouch();
        flushCoins();
        if (phase === 'play' || phase === 'countdown') pauseGame();
        audio.suspend();
      } else {
        audio.resumeCtx();
      }
    });
    window.addEventListener('pagehide', () => { flushCoins(); audio.suspend(); });
    window.addEventListener('pageshow', () => { if (!document.hidden) audio.resumeCtx(); });
  }

  function syncMute() {
    const btn = $('btn-mute');
    btn.textContent = audio.muted ? 'MUTED' : 'SOUND ON';
    btn.classList.toggle('off', !!audio.muted);
  }

  let sizedW = 0;
  let sizedH = 0;
  let sizedDpr = 0;
  let resizeTimer = 0;
  let safeAreaBottom = 0;
  let btnFwdEl = null;
  let btnBackEl = null;
  let btnBoostEl = null;
  let fwdL = 0;
  let fwdT = 0;
  let fwdR = 0;
  let fwdB = 0;
  let boostL = 0;
  let boostT = 0;
  let boostR = 0;
  let boostB = 0;
  let muteL = 0;
  let muteT = 0;
  let muteR = 0;
  let muteB = 0;
  let backL = 0;
  let backT = 0;
  let backR = 0;
  let backB = 0;
  let fwdDim = false;
  let backDim = false;
  let boostDim = false;
  function cacheEdgeRects() {
    if (!btnFwdEl) btnFwdEl = $('btn-lean-fwd');
    if (!btnBackEl) btnBackEl = $('btn-lean-back');
    if (!btnBoostEl) btnBoostEl = $('btn-turbo');
    const mute = $('btn-mute');
    if (btnFwdEl) {
      const box = btnFwdEl.getBoundingClientRect();
      fwdL = box.left;
      fwdT = box.top;
      fwdR = box.right;
      fwdB = box.bottom;
    }
    if (btnBackEl) {
      const box = btnBackEl.getBoundingClientRect();
      backL = box.left;
      backT = box.top;
      backR = box.right;
      backB = box.bottom;
    }
    if (btnBoostEl) {
      const box = btnBoostEl.getBoundingClientRect();
      boostL = box.left;
      boostT = box.top;
      boostR = box.right;
      boostB = box.bottom;
    }
    if (mute) {
      const box = mute.getBoundingClientRect();
      muteL = box.left;
      muteT = box.top;
      muteR = box.right;
      muteB = box.bottom;
    }
  }
  function riderCovers(left, top, right, bottom) {
    const player = toScreen(bike.x, bike.y);
    const px = player.x;
    const py = player.y - (bike.laneF || 0) * laneGap;
    if (px + 42 > left && px - 40 < right && py + 18 > top && py - 36 < bottom) return true;
    for (let i = 0; i < rivals.length; i++) {
      const rv = rivals[i];
      if (rv.x < cameraX - 100 || rv.x > cameraX + W + 100) continue;
      queryGround(rv.x);
      const spot = toScreen(rv.x, G0.h);
      const rx = spot.x;
      const ry = spot.y - (rv.laneF || 0) * laneGap;
      if (rx + 42 > left && rx - 40 < right && ry + 18 > top && ry - 36 < bottom) return true;
    }
    return false;
  }
  function fadeEdgeButtons() {
    if (!btnFwdEl || !btnBoostEl || !btnBackEl) return;
    if (phase !== 'play') {
      if (fwdDim) { fwdDim = false; btnFwdEl.style.opacity = ''; }
      if (backDim) { backDim = false; btnBackEl.style.opacity = ''; }
      if (boostDim) { boostDim = false; btnBoostEl.style.opacity = ''; }
      return;
    }
    const coverFwd = riderCovers(fwdL, fwdT, fwdR, fwdB);
    if (coverFwd !== fwdDim) {
      fwdDim = coverFwd;
      btnFwdEl.style.opacity = coverFwd ? '0.45' : '0.85';
    }
    const coverBack = riderCovers(backL, backT, backR, backB);
    if (coverBack !== backDim) {
      backDim = coverBack;
      btnBackEl.style.opacity = coverBack ? '0.45' : '0.85';
    }
    const coverBoost = riderCovers(boostL, boostT, boostR, boostB);
    if (coverBoost !== boostDim) {
      boostDim = coverBoost;
      btnBoostEl.style.opacity = coverBoost ? '0.45' : '0.85';
    }
  }
  function resizeNow() {
    try { safeAreaBottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0; } catch (err) { safeAreaBottom = 0; }
    cacheEdgeRects();
    const nd = Math.min(window.devicePixelRatio || 1, 2);
    const nw = Math.max(320, window.innerWidth);
    const nh = Math.max(240, window.innerHeight);
    portrait = window.matchMedia('(orientation: portrait)').matches || nh > nw;
    if (nd === sizedDpr && nw === sizedW && nh === sizedH) return;
    sizedDpr = nd;
    sizedW = nw;
    sizedH = nh;
    dpr = nd;
    W = nw;
    H = nh;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    if (bg) bg.H = -1;
    const need = Math.ceil((W + 120) / 10) + 4;
    if (need > gpCap) {
      allocSites.ground += 1;
      gpCap = need;
      gpX = new Float32Array(need);
      gpY = new Float32Array(need);
    }
  }
  function resize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeNow, 150);
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
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || updateReloading) return;
      if (phase === 'play' || phase === 'countdown' || phase === 'pause' || phase === 'help') {
        updatePending = true;
        return;
      }
      updatePending = true;
      setPhase(phase);
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
    if (phase === 'play') {
      const bin = Math.max(0, Math.min(63, fpsSmoothed | 0));
      fpsHist[bin] += 1;
      fpsSamples += 1;
      playTime += dt;
      if (richOn && !reduceMotion) richTime += dt;
    }
    if (phase !== 'play') {
      touch.upPress = 0;
      touch.downPress = 0;
    }
    stepRich(dt);
    noteHeap();
    allocFrame = allocProbe;
    if (shake > 0) shake = Math.max(0, shake - dt * 1.7);
    if (penaltyFlash > 0) penaltyFlash -= dt;
    if (toastUntil && performance.now() > toastUntil) {
      $('toast').className = '';
      toastUntil = 0;
    }
    if (!portrait && bg) updateBackground(bg, dt, W, H, cameraX, fxRich(), bgState());
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
      audio.field(bike.inDrag || 0, bike.speed || 0);
      if (phase === 'play' || phase === 'countdown' || phase === 'pause') {
        const anchor = bike.speed > 760 ? 0.26 : 0.3;
        const target = (phase === 'pause' && pausedFrom === 'countdown' ? bike.x : bike.x) - W * anchor;
        if (!(bike.crashing)) cameraX += (target - cameraX) * Math.min(1, dt * 7);
        const ground = queryGround(bike.x);
        let lanePeak = bike.laneF || 0;
        if ((bike.hopFrom || 0) > lanePeak) lanePeak = bike.hopFrom;
        if ((bike.lane || 0) > lanePeak) lanePeak = bike.lane;
        const laneLift = lanePeak * laneGap;
        const follow = (phase === 'play' && bike.air ? ground.h * 0.45 + bike.y * 0.55 : ground.h) + laneLift;
        cameraY += (follow - cameraY) * Math.min(1, dt * 3.2);
        const drawnTop = bike.y + 48 + laneLift + 16 + 8;
        const minCam = drawnTop + 96 - focusY();
        if (cameraY < minCam) cameraY = minCam;
      }
      updateCallout();
    }

    try {
      const inten = phase === 'play' ? Math.min(1, bike.speed / 980 * 0.75 + bike.heat * 0.35) : phase === 'countdown' ? 0.2 : 0;
      audio.scene(phase, inten);
    } catch (err) { /* music is optional */ }

    render();
    fadeEdgeButtons();
    syncHud();
    requestAnimationFrame(loop);
  }

  const SCHEMA_KEY = 'volt-alley-schema';
  const GHOST_IDS = ['nite-pier', 'amp-spine', 'static-cut', 'void-well', 'ash-veil'];
  let tracksRebuilt = false;
  let lastResult = null;

  function migrateSave(store) {
    const SCHEMA_KEY = 'volt-alley-schema';
    const BEST_KEY = 'volt-alley-best';
    const GHOST_IDS = ['nite-pier', 'amp-spine', 'static-cut', 'void-well', 'ash-veil'];
    try {
      if (Number(store.getItem(SCHEMA_KEY)) >= 14) return false;
      let prior = store.getItem('volt-alley-maps') != null || store.getItem(BEST_KEY) != null;
      if (!prior) {
        for (let i = 0; i < GHOST_IDS.length; i++) {
          if (store.getItem('volt-alley-ghost-' + GHOST_IDS[i]) != null) prior = true;
        }
      }
      if (!prior) {
        store.setItem(SCHEMA_KEY, '14');
        return false;
      }
      let records = {};
      try {
        records = JSON.parse(store.getItem('volt-alley-maps') || '{}') || {};
      } catch (err) {
        records = {};
      }
      if (!records || typeof records !== 'object') records = {};
      const next = {};
      const keys = Object.keys(records);
      for (let i = 0; i < keys.length; i++) {
        const rec = records[keys[i]] || {};
        let stars = rec.stars | 0;
        if (stars < 0) stars = 0;
        if (stars > 3) stars = 3;
        next[keys[i]] = { best: null, stars: stars, clean: false, circuit: false };
      }
      store.setItem('volt-alley-maps', JSON.stringify(next));
      for (let i = 0; i < GHOST_IDS.length; i++) store.removeItem('volt-alley-ghost-' + GHOST_IDS[i]);
      store.removeItem(BEST_KEY);
      store.setItem(SCHEMA_KEY, '14');
      return true;
    } catch (err) {
      return false;
    }
  }

  function boot() {
    tracksRebuilt = migrateSave(localStorage);
    loadRunLog();
    window.addEventListener('error', (e) => reportFault(e.message || 'unknown'));
    loadMapProgress();
    loadGarage();
    track = buildTrack('nite-pier');
    best = loadNum(BEST_KEY);
    coinBank = loadNum(COIN_KEY) || 0;
    seenHelp = false;
    try { seenHelp = localStorage.getItem(HELP_KEY) === '1'; } catch (err) { seenHelp = false; }
    try {
      if (localStorage.getItem(MUTE_KEY) === '1') audio.muted = true;
    } catch (err) { /* ignore */ }
    setText($('title-best'), tracksRebuilt ? 'TRACKS REBUILT \u00b7 BESTS RESET \u00b7 STARS KEPT' : ('BEST ' + fmt(best)));
    setText($('title-coins'), 'COINS ' + coinBank);
    syncMute();
    initPool();
    resizeNow();
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
      get laneF() { return bike.laneF; },
      get laneGap() { return laneGap; },
      get allocProbe() { return allocFrame; },
      get allocSites() { return allocSites; },
      get crashes() { return crashes; },
      get coins() { return runCoins; },
      get coinPlan() {
        const rows = [];
        const list = (track && track.coins) || [];
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          rows.push({ i: i, x: c.x | 0, lane: c.lane, got: !!c.got, lift: c.lift | 0, role: c.role || '' });
        }
        return rows;
      },
      get walls() {
        const rows = [];
        const list = (track && track.hazards) || [];
        for (let i = 0; i < list.length; i++) {
          const h = list[i];
          if (h.kind !== 'wall') continue;
          rows.push({ x: h.x | 0, lane: h.lane, w: h.w | 0 });
        }
        return rows;
      },
      get closures() {
        return ((track && track.closures) || []).map(function (c) {
          return { x0: c.x0 | 0, x1: c.x1 | 0, wall: c.wall | 0, closed: c.closed, open: c.open, split: !!c.split };
        });
      },
      get time() { return raceTime; },
      get fps() { return fpsSmoothed; },
      get rich() { return richOn && !reduceMotion; },
      get richFlips() { return richFlips; },
      get richToggles() { return richFlips; },
      get best() { return best; },
      get overheated() { return bike.overheated; },
      get cleans() { return cleans; },
      get y() { return bike.y; },
      get rivals() { return rivals.map((r) => r.x); },
      get rivalLanes() { return [rivals[0].lane, rivals[1].lane, rivals[2].lane]; },
      get lastRun() { return lastRun; },
      get runLog() { return runLog; },
      get blocks() { return track && track.blocks; },
      get hops() { return runStats.hops; },
      get flips() { return runStats.flips; },
      get spin() { return bike.flips || 0; },
      get blocksSuffered() { return runStats.blocksSuffered; },
      get laneTarget() { return bike.lane; },
      get warn() {
        let n = 0;
        for (let i = 0; i < rivals.length; i++) if (rivals[i].warn > 0) n += 1;
        return n;
      },
      get rivalState() {
        const out = [];
        for (let i = 0; i < rivals.length; i++) {
          const r = rivals[i];
          out.push({ n: r.name, x: r.x | 0, lane: r.lane | 0, warn: r.warn > 0 ? 1 : 0, stall: r.stallT > 0 ? 1 : 0, sig: r.signalT > 0 ? 1 : 0, spd: r.speed | 0 });
        }
        return out;
      },
      get padT() { return bike.padT || 0; },
      get inDrag() { return bike.inDrag || 0; },
      get leanLips() { return (track && track.leanLips) || []; },
      get lastResult() { return lastResult; },
      get crashCause() { return bike.crashCause || ''; },
      get crashX() { return bike.crashX || 0; },
      get immune() { return bike.rivalImmune || 0; },
      get invuln() { return bike.invuln || 0; },
      debug(spec) { if (!debugOn) return null; return applyDebug(spec || {}); },
      get callout() {
        const el = $('callout');
        return el ? el.textContent : '';
      },
      get bgFlash() { return bg && bg.rx ? bg.rx.flash : 0; },
      get bgCool() { return bg && bg.rx ? bg.rx.cool : 0; },
      get bgBolt() { return bg && bg.bolt ? bg.bolt : 0; },
      get muted() { return bgMuted(); },
      tryReact() {
        if (!debugOn) return null;
        if (!bg) return { flash: 0, cool: 0, bolt: 0 };
        bg.rx.flash = 0;
        bg.rx.cool = 0;
        bg.bolt = 0;
        bg.rx.flashCd = 0;
        bg.rx.washCd = 0;
        bg.rx.boltCd = 0;
        const S = { bx: 120, by: 80, speed: bike.speed || 0, air: false, boost: true };
        bgReact(bg, 'land', { clean: true, airTime: 1, flips: 1 }, S, W);
        bgReact(bg, 'boostStart', {}, S, W);
        bgReact(bg, 'pad', {}, S, W);
        bgReact(bg, 'nearMiss', {}, S, W);
        return { flash: bg.rx.flash || 0, cool: bg.rx.cool || 0, bolt: bg.bolt || 0 };
      },
      hold(gas, boost) {
        if (!debugOn) return;
        touch.throttle = !!gas;
        touch.turbo = !!boost;
      },
      lean(fwd) {
        if (!debugOn) return;
        touch.leanFwd = !!fwd;
        if (fwd) touch.leanBack = false;
      },
      tap(dir) {
        if (!debugOn) return;
        if (dir > 0) touch.upPress = Math.min(2, touch.upPress + 1);
        else if (dir < 0) touch.downPress = Math.min(2, touch.downPress + 1);
      },
      step(n) {
        if (!debugOn) return phase;
        const count = n > 0 ? n : 1;
        for (let i = 0; i < count; i++) {
          if (phase !== 'play') break;
          physics(STEP);
        }
        return phase;
      },
    };
  }

  boot();
})();
