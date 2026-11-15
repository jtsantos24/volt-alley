/* VOLT ALLEY map compiler. Named segments become a heightmap.
   A later Storm Cup could rotate a seeded mix of these segments offline. */
(function (root) {
  'use strict';

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

  const M = function (meters) { return meters * 12; };

  const LIST = [
    { id: 'nite-pier', name: 'NITE PIER', tier: 'NOVICE', accent: '#5ef6ff', theme: 'pier', star2: 27, star3: 19, rivalT: [19.5, 22.5, 27], seed: 101, unlock: null, pace: 1, provisional: true },
    // Amp NYX 20.6 is the 20.58 s cap floor, rounded up to 0.1 s. The solved pace still finishes on 20.6.
    { id: 'amp-spine', name: 'AMP SPINE', tier: 'INTERMEDIATE', accent: '#ff4ad0', theme: 'spine', star2: 29, star3: 18, rivalT: [20.6, 23.5, 29], seed: 202, unlock: 'nite-pier', pace: 1, provisional: true },
    { id: 'static-cut', name: 'STATIC CUT', tier: 'ADVANCED', accent: '#ffe08a', theme: 'cut', star2: 32.5, star3: 20.5, rivalT: [21, 26.5, 32.5], seed: 303, unlock: 'amp-spine', pace: 1, provisional: true },
    { id: 'void-well', name: 'VOID WELL', tier: 'EXPERT', accent: '#b08cff', theme: 'well', star2: 35, star3: 22.5, rivalT: [24.5, 29, 35], seed: 404, unlock: 'static-cut', pace: 1, provisional: true },
    { id: 'ash-veil', name: 'ASH VEIL', tier: 'MASTER', accent: '#ff6a4a', theme: 'veil', star2: 41, star3: 26.5, rivalT: [27, 34, 41], seed: 505, unlock: 'void-well', pace: 1, provisional: true },
  ];
  const FIELD_STYLE = {
    'nite-pier': { spacing: 48, lines: 2, alpha: 0.25, hz: 0, amp: 0 },
    'amp-spine': { spacing: 40, lines: 3, alpha: 0.35, hz: 0.5, amp: 0.1 },
    'static-cut': { spacing: 32, lines: 3, alpha: 0.45, hz: 0.8, amp: 0.15 },
    'void-well': { spacing: 26, lines: 4, alpha: 0.55, hz: 1.2, amp: 0.2 },
    'ash-veil': { spacing: 20, lines: 5, alpha: 0.7, hz: 1.6, amp: 0.3 },
  };

  function compile(id) {
    const def = null;
    let map = null;
    for (let i = 0; i < LIST.length; i++) if (LIST[i].id === id) map = LIST[i];
    if (!map) map = LIST[0];
    const rand = mulberry32(map.seed);
    const keys = [{ x: 0, h: 42 }];
    const hazards = [];
    const pads = [];
    const hints = [];
    const coins = [];
    const ceilings = [];
    const checkpoints = [0];
    const loops = [];
    const blocks = [];
    const drags = [];
    const boosts = [];
    const arrows = [];
    const leanLips = [];
    function block(name, sig) {
      if (blocks.length) blocks[blocks.length - 1].x1 = x;
      blocks.push({ name: name, x0: x, x1: 0, sig: !!sig });
    }
    let x = 0;
    let h = 42;
    let coinN = 0;

    function pushKey(nx, nh, extra) {
      if (nx <= keys[keys.length - 1].x) nx = keys[keys.length - 1].x + 12;
      const row = { x: nx, h: nh };
      if (extra) {
        row.ramp = extra.ramp;
        row.pow = extra.pow;
      }
      keys.push(row);
      x = nx;
      h = nh;
    }
    function flat(meters) { pushKey(x + M(meters), h); }
    function to(meters, nh) { pushKey(x + M(meters), nh); }
    function cp() {
      const last = checkpoints[checkpoints.length - 1];
      if (last != null && x - last < M(20)) return;
      checkpoints.push(x);
    }
    function hint(text) { hints.push({ x: x + 40, text: text }); }
    function coin(lift) {
      coins.push({ x: x, lift: lift || 36, got: false, risk: (lift || 0) > 70 });
      coinN += 1;
    }
    function sprinkle(meters) {
      const end = x + M(meters);
      let cx = x + M(18);
      while (cx < end - M(8)) {
        const risk = coinN % 4 === 3;
        coins.push({ x: cx, lift: risk ? 108 : 38, got: false, risk: risk });
        coinN += 1;
        cx += M(52 + rand() * 12);
      }
    }

    let v14Pad = false;
    function startPad() {
      flat(100);
      hint('EASE IN');
      if (!v14Pad) sprinkle(80);
    }
    function rollers(n, widthM, amp) {
      for (let i = 0; i < n; i++) {
        const jitter = (rand() - 0.5) * 5;
        to(widthM * 0.5, 42 + amp * (0.6 + rand() * 0.4) + jitter);
        to(widthM * 0.5, 40 + jitter * 0.25);
      }
    }
    function whoops(n) {
      for (let i = 0; i < n; i++) {
        to(5.5, 50);
        to(5.5, 34);
      }
    }
    function kicker(peak, label) {
      to(8, h);
      pushKey(x + M(16), peak, { ramp: true, pow: 1.62 });
      if (label) hint(label);
    }
    function valley(meters, floor) {
      to(meters * 0.45, floor);
      to(meters * 0.55, floor + 4);
    }
    function landing() {
      to(14, 48);
      flat(12);
    }
    function tabletop() {
      kicker(110, 'TABLE');
      flat(14);
      to(12, 28);
      to(12, 44);
      flat(10);
    }
    function stepUp() {
      to(4, h);
      pushKey(x + M(11), h + 58, { ramp: true, pow: 1.45 });
      flat(16);
    }
    function stepDown() {
      to(14, Math.max(24, h - 50));
      to(12, 42);
      flat(8);
    }
    function gap(meters, floor, label) {
      kicker(128, label || 'SEND IT');
      valley(meters, floor);
      if (rand() > 0.3) hazards.push({ kind: 'debris', x: x - M(meters * 0.45), w: 70, clear: 18 });
      landing();
    }
    function heat(lenM) {
      const x0 = x + M(4);
      flat(lenM);
      pads.push({ x: x0, len: M(lenM - 6) });
      hint('HEAT DUMP');
    }
    function tunnel(lenM, clear) {
      const x0 = x;
      hint('LEVEL');
      flat(lenM);
      ceilings.push({ x: x0 + 20, w: M(lenM) - 40, clear: clear });
    }
    function sweeper() {
      to(16, 78);
      to(18, 30);
      to(16, 86);
      to(16, 40);
    }
    function gate() {
      kicker(124, 'JUMP');
      const gx = x + M(3);
      valley(11, 18);
      hazards.push({ kind: 'gate', x: gx, w: 22, clear: 64 });
      landing();
    }
    function bar() {
      kicker(108, 'JUMP');
      const bx = x + M(3);
      valley(9, 20);
      hazards.push({ kind: 'bar', x: bx, w: 28, clear: 42 });
      landing();
    }
    function loopRing() {
      const r = 112;
      const a0 = Math.PI;
      const a1 = 0;
      const entry = x + M(10);
      const base = 42;
      const cy = base - Math.sin(a0) * r;
      const cx = entry - Math.cos(a0) * r;
      const exit = cx + Math.cos(a1) * r;
      pushKey(entry, base);
      const span = exit - entry;
      pushKey(entry + span * 0.28, 14);
      pushKey(entry + span * 0.62, 12);
      pushKey(exit, 36);
      flat(14);
      loops.push({
        entry: entry,
        exit: exit,
        cx: cx,
        cy: cy,
        r: r,
        a0: a0,
        a1: a1,
        entryMin: 470,
      });
      hint('RING');
    }

    function stretch(untilM) {
      const until = M(untilM);
      let since = x;
      while (x < until) {
        rollers(2, 22, 12 + rand() * 6);
        sprinkle(36);
        if (x - since > M(260)) {
          cp();
          since = x;
        }
      }
    }

    function ramp(lenM, peak, label, lean) {
      to(6, h);
      pushKey(x + M(lenM), peak, { ramp: true, pow: 1.62 });
      if (label) hint(label);
      if (lean) leanLips.push({ lip: x, signX: x - 960, label: label || 'LEAN' });
    }
    function arrow(peak, label) {
      to(4, h);
      const x0 = x;
      pushKey(x + M(10), peak, { ramp: true, pow: 1.5 });
      hint(label || 'ARROW');
      arrows.push({ x0: x0, x1: x });
    }
    function drag(lenM, k, lane) {
      const x0 = x;
      flat(lenM);
      drags.push({ x0: x0, x1: x, k: k, lane: lane == null ? 'all' : lane });
    }
    function boost(lenM, lane) {
      boosts.push({ x: x, len: M(lenM), lane: lane == null ? 'all' : lane });
      flat(lenM);
    }
    function hill(lenM, height) {
      const startH = h;
      to(lenM * 0.5, startH + height);
      to(lenM * 0.5, startH);
    }
    function dragLane(m, lenM, k, lane) {
      drags.push({ x0: M(m), x1: M(m + lenM), k: k, lane: lane, painted: true });
    }
    function buildV14() {
      v14Pad = true;
      if (map.id === 'nite-pier') {
      block('START');
      startPad();
      rollers(4, 24, 10);
      drag(24, 0.5);
      flat(16);
      arrow(78);
      flat(110);
      to(30, 42);
      rollers(3, 24, 12);
      drag(22, 0.8);
      ramp(18, 100, 'TABLE');
      flat(100);
      to(26, 42);
      flat(10);
      drag(22, 0.8);
      ramp(18, 100, 'TABLE');
      flat(100);
      to(26, 42);
      heat(22);
      whoops(3);
      rollers(4, 24, 12);
      boost(10);
      flat(30);
      rollers(3, 24, 12);
      drag(24, 0.6);
      flat(14);
      arrow(80);
      flat(110);
      to(30, 42);
      rollers(4, 24, 12);
      drag(30, 0.6, 0);
      flat(30);
      }
      else if (map.id === 'amp-spine') {
      block('START');
      startPad();
      rollers(3, 20, 12);
      boost(8);
      drag(22, 0.9);
      arrow(80);
      flat(96);
      arrow(120);
      flat(100);
      to(40, 42);
      whoops(4);
      rollers(3, 20, 12);
      heat(22);
      boost(8);
      tunnel(26, 100);
      drag(16, 0.9);
      ramp(22, 112, 'EXIT LIP');
      flat(104);
      to(40, 42);
      hill(40, 40);
      hill(40, 50);
      rollers(3, 20, 12);
      drag(20, 0.9);
      ramp(20, 112, 'STEP');
      flat(100);
      to(40, 42);
      rollers(3, 20, 12);
      drag(20, 0.9);
      arrow(80);
      flat(96);
      to(24, 42);
      boost(8);
      drag(20, 0.9);
      arrow(80);
      flat(96);
      to(24, 42);
      rollers(4, 20, 12);
      flat(20);
      dragLane(1130, 30, 0.9, 2);
      }
      else if (map.id === 'static-cut') {
      block('START');
      startPad();
      rollers(3, 24, 16);
      drag(24, 1.0);
      hill(64, 80);
      drag(24, 1.0);
      hill(76, 100);
      drag(20, 1.0);
      heat(20);
      drag(22, 1.2);
      arrow(80);
      flat(100);
      to(30, 42);
      rollers(2, 22, 14);
      drag(24, 1.2);
      ramp(16, 180, 'CUT LINE', true);
      flat(100);
      to(50, 42);
      hill(70, 90);
      drag(24, 1.0);
      hill(70, 90);
      drag(20, 1.0);
      rollers(3, 22, 14);
      drag(22, 1.2);
      ramp(16, 176, 'LEAN', true);
      flat(100);
      to(50, 42);
      heat(20);
      rollers(4, 22, 14);
      hill(76, 100);
      drag(22, 1.2);
      arrow(80);
      flat(100);
      to(30, 42);
      flat(20);
      dragLane(480, 30, 1.2, 0);
      dragLane(710, 30, 1.2, 2);
      }
      else if (map.id === 'void-well') {
      block('START');
      startPad();
      rollers(3, 20, 16);
      boost(8);
      arrow(80);
      flat(70);
      boost(8);
      arrow(120);
      flat(110);
      to(40, 42);
      drag(26, 1.4);
      boost(10);
      flat(10);
      loopRing();
      flat(30);
      drag(22, 1.2);
      ramp(16, 182, 'LEAN', true);
      flat(100);
      to(50, 42);
      tunnel(24, 78);
      heat(20);
      rollers(3, 20, 14);
      boost(8);
      arrow(80);
      flat(70);
      boost(8);
      ramp(12, 186, 'LEAN', true);
      flat(100);
      to(50, 42);
      drag(24, 1.2);
      hill(70, 100);
      drag(24, 1.2);
      hill(64, 90);
      rollers(4, 20, 14);
      boost(8);
      arrow(80);
      flat(70);
      boost(8);
      ramp(12, 186, 'LEAN', true);
      flat(100);
      to(50, 42);
      drag(24, 1.2);
      hill(70, 100);
      rollers(3, 20, 14);
      drag(30, 1.2, 0);
      rollers(3, 20, 14);
      flat(20);
      dragLane(1020, 30, 1.2, 1);
      dragLane(1240, 30, 1.2, 2);
      dragLane(1540, 30, 1.2, 1);
      dragLane(1700, 30, 1.2, 1);
      }
      else if (map.id === 'ash-veil') {
      block('START');
      startPad();
      rollers(3, 16, 14);
      tunnel(22, 96);
      drag(16, 1.4);
      ramp(16, 184, 'EXIT LIP', true);
      flat(96);
      to(40, 42);
      drag(24, 1.4);
      hill(70, 100);
      drag(24, 1.4);
      hill(76, 110);
      drag(20, 1.4);
      heat(20);
      drag(22, 1.4);
      ramp(16, 182, 'VEIL', true);
      flat(96);
      to(40, 42);
      boost(8);
      drag(22, 1.4);
      ramp(16, 182, 'SPAN', true);
      flat(96);
      to(40, 42);
      drag(26, 1.6);
      boost(10);
      flat(10);
      loopRing();
      flat(28);
      tunnel(26, 118);
      heat(20);
      drag(30, 1.4, 2);
      rollers(5, 18, 16);
      drag(30, 1.4, 0);
      hill(70, 100);
      drag(20, 1.4);
      boost(8);
      arrow(80);
      flat(70);
      boost(8);
      ramp(12, 186, 'LEAN', true);
      flat(100);
      to(50, 42);
      drag(24, 1.4);
      hill(76, 110);
      drag(30, 1.4, 1);
      rollers(5, 18, 16);
      drag(22, 1.4);
      ramp(16, 186, 'VEIL', true);
      flat(96);
      to(40, 42);
      flat(20);
      dragLane(1520, 30, 1.4, 2);
      }
    }
    buildV14();

    const finishAt = x + M(74);
    flat(74);
    pushKey(finishAt + M(80), 42);
    let flag = finishAt - M(48);
    let crowded = false;
    for (let i = 0; i < hazards.length; i++) {
      const hz = hazards[i];
      if (flag > hz.x - M(28) && flag < hz.x + (hz.w || 24) + M(28)) crowded = true;
    }
    if (crowded) flag = finishAt - M(16);
    const lastCp = checkpoints[checkpoints.length - 1];
    if (!crowded && flag - lastCp > M(36)) checkpoints.push(flag);

    const zones = [];
    const closures = [];
    function zone(x0, x1, kind) { zones.push({ x0: x0, x1: x1, kind: kind, lip: x0 + M(40) }); }
    function inAny(x, pad) {
      const p = pad || 0;
      for (let i = 0; i < zones.length; i++) {
        if (x >= zones[i].x0 - p && x <= zones[i].x1 + p) return true;
      }
      return false;
    }
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.lane == null) h.lane = 'all';
      if (h.kind === 'gate' || h.kind === 'bar') zone(h.x - M(40), h.x + (h.w || 24) + M(30), h.kind);
    }
    for (let i = 0; i < ceilings.length; i++) {
      const c = ceilings[i];
      zone(c.x - M(40), c.x + c.w + M(20), 'tunnel');
    }
    for (let i = 0; i < loops.length; i++) {
      const loop = loops[i];
      zone(loop.entry - M(40), loop.exit + M(20), 'ring');
    }
    for (let i = 0; i < hints.length; i++) {
      const hintRow = hints[i];
      zone(hintRow.x - M(40), hintRow.x + M(30), 'lip');
    }
    for (let i = 0; i < pads.length; i++) pads[i].lane = 'all';
    const skin = (map.id === 'nite-pier' || map.id === 'amp-spine') ? 'debris' : 'wall';
    function farFromNew(hx) {
      for (let i = 0; i < hazards.length; i++) {
        const h = hazards[i];
        if (h.lane === 'all' || h.lane == null) continue;
        if (Math.abs(h.x - hx) < M(90)) return false;
      }
      return true;
    }
    function afterCp(hx) {
      let prev = 0;
      for (let i = 0; i < checkpoints.length; i++) if (checkpoints[i] <= hx) prev = checkpoints[i];
      return hx - prev >= M(20);
    }
    function addLane(kind, meters, lane, widthM) {
      let hx = M(meters);
      if (inAny(hx, M(40)) || !farFromNew(hx) || !afterCp(hx)) {
        hx += M(50);
        if (inAny(hx, M(40)) || !farFromNew(hx)) return null;
      }
      const row = { kind: kind, x: hx, w: M(widthM || 6), clear: kind === 'debris' ? 16 : 48, lane: lane };
      hazards.push(row);
      return row;
    }
    function closeLane(meters, spanM, lane, openLane) {
      const row = addLane(skin, meters, lane, spanM);
      if (!row) return;
      closures.push({ x0: row.x - M(80), x1: row.x + row.w, wall: row.x, closed: lane, open: openLane, split: false });
    }
    const V14 = {
      'nite-pier': {
        cps: [0, 2352, 5544, 10056, 12948, 15252, 17436],
        taps: [{ x: 1800, lane: 1, dir: 1 }, { x: 4320, lane: 2, dir: 1 }, { x: 7680, lane: 1, dir: -1 }, { x: 9312, lane: 0, dir: -1 }, { x: 11556, lane: 1, dir: 1 }, { x: 12672, lane: 2, dir: 1 }, { x: 14592, lane: 1, dir: -1 }, { x: 16272, lane: 0, dir: -1 }],
        place: function () {
        hazards.push({ kind: 'debris', x: 11472, w: 72, clear: 16, lane: 1 });
        hazards.push({ kind: 'debris', x: 15072, w: 72, clear: 16, lane: 0 });
        },
        fill: function () {
        coins.push({ x: 1140, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 1680, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 2220, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 2760, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 4140, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 4680, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 5220, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 5760, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 7056, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 7596, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 8136, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 9516, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 10056, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 10596, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 11136, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 11772, lift: 38, got: false, risk: true, lane: 1, role: 'hazard' });
        coins.push({ x: 12096, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 12876, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 13416, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 14508, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 15048, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 15588, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 16128, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 16560, lift: 38, got: false, risk: true, lane: 0, role: 'drag' });
        coins.push({ x: 16884, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 17424, lift: 38, got: false, risk: false, lane: 0, role: '' });
        },
      },
      'amp-spine': {
        cps: [0, 1920, 5448, 6960, 9624, 11304, 14256, 18048, 19560],
        taps: [{ x: 1680, lane: 1, dir: 1 }, { x: 5040, lane: 0, dir: -1 }, { x: 5856, lane: 1, dir: 1 }, { x: 7680, lane: 2, dir: 1 }, { x: 9864, lane: 1, dir: -1 }, { x: 12960, lane: 0, dir: -1 }, { x: 17640, lane: 1, dir: 1 }, { x: 18300, lane: 2, dir: 1 }],
        place: function () {
        hazards.push({ kind: 'debris', x: 5760, w: 72, clear: 16, lane: 2 });
        hazards.push({ kind: 'debris', x: 10200, w: 72, clear: 16, lane: 2 });
        closures.push({ x0: 9240, x1: 10272, wall: 10200, closed: 2, open: 1, split: false });
        hazards.push({ kind: 'debris', x: 13440, w: 72, clear: 16, lane: 1 });
        hazards.push({ kind: 'debris', x: 18720, w: 72, clear: 16, lane: 0 });
        },
        fill: function () {
        coins.push({ x: 1128, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 1884, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 3660, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 4968, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 5496, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 6060, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 6588, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 7116, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 7644, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 9108, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 9660, lift: 38, got: false, risk: true, lane: 2, role: 'closure' });
        coins.push({ x: 10068, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 10596, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 11124, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 11652, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 12268, lift: 170, got: false, risk: true, lane: 'all', role: 'arc' });
        coins.push({ x: 12792, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 13320, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 13932, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 14460, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 15588, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 16116, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 17844, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 18504, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 19032, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 19560, lift: 38, got: false, risk: false, lane: 2, role: '' });
        },
      },
      'static-cut': {
        cps: [0, 2064, 4800, 7320, 9672, 12672, 16296, 19752],
        taps: [{ x: 3300, lane: 1, dir: 1 }, { x: 4080, lane: 2, dir: 1 }, { x: 6360, lane: 1, dir: -1 }, { x: 9120, lane: 2, dir: 1 }, { x: 10800, lane: 1, dir: -1 }, { x: 12480, lane: 0, dir: -1 }, { x: 14160, lane: 1, dir: 1 }, { x: 14580, lane: 2, dir: 1 }, { x: 16224, lane: 1, dir: -1 }, { x: 18840, lane: 2, dir: 1 }],
        place: function () {
        hazards.push({ kind: 'wall', x: 3600, w: 72, clear: 48, lane: 0 });
        closures.push({ x0: 2640, x1: 3672, wall: 3600, closed: 0, open: 1, split: false });
        hazards.push({ kind: 'wall', x: 6720, w: 48, clear: 48, lane: 2 });
        hazards.push({ kind: 'wall', x: 9960, w: 48, clear: 48, lane: 1 });
        hazards.push({ kind: 'debris', x: 11400, w: 72, clear: 16, lane: 0 });
        hazards.push({ kind: 'wall', x: 16560, w: 72, clear: 48, lane: 2 });
        closures.push({ x0: 15600, x1: 16632, wall: 16560, closed: 2, open: 1, split: false });
        hazards.push({ kind: 'wall', x: 19200, w: 48, clear: 48, lane: 1 });
        },
        fill: function () {
        coins.push({ x: 1104, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 1608, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 2112, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 2616, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 3120, lift: 38, got: false, risk: true, lane: 0, role: 'closure' });
        coins.push({ x: 3504, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 4008, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 4512, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 5016, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 6288, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 6792, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 7296, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 8148, lift: 170, got: false, risk: true, lane: 'all', role: 'arc' });
        coins.push({ x: 9036, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 9540, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 10044, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 10548, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 11052, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 11556, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 12060, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 12684, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 14364, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 14868, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 15372, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 16080, lift: 38, got: false, risk: true, lane: 2, role: 'closure' });
        coins.push({ x: 16428, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 16932, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 17436, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 18768, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 19272, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 19776, lift: 38, got: false, risk: false, lane: 2, role: '' });
        },
      },
      'void-well': {
        cps: [0, 1920, 5088, 6512, 8840, 10088, 11192, 13304, 16448, 17552, 19664, 21512, 23144],
        taps: [{ x: 4560, lane: 1, dir: 1 }, { x: 7980, lane: 2, dir: 1 }, { x: 13944, lane: 1, dir: -1 }, { x: 15720, lane: 0, dir: -1 }, { x: 19200, lane: 1, dir: 1 }, { x: 19440, lane: 2, dir: 1 }, { x: 21312, lane: 1, dir: -1 }, { x: 21432, lane: 0, dir: -1 }, { x: 22560, lane: 1, dir: 1 }],
        place: function () {
        hazards.push({ kind: 'debris', x: 4260, w: 72, clear: 16, lane: 2 });
        hazards.push({ kind: 'debris', x: 12780, w: 72, clear: 16, lane: 0 });
        hazards.push({ kind: 'wall', x: 14160, w: 72, clear: 48, lane: 2 });
        closures.push({ x0: 13200, x1: 14232, wall: 14160, closed: 2, open: 1, split: false });
        hazards.push({ kind: 'wall', x: 15480, w: 48, clear: 48, lane: 0 });
        hazards.push({ kind: 'debris', x: 18840, w: 72, clear: 16, lane: 2 });
        hazards.push({ kind: 'debris', x: 20160, w: 72, clear: 16, lane: 0 });
        hazards.push({ kind: 'wall', x: 21240, w: 48, clear: 48, lane: 1 });
        hazards.push({ kind: 'wall', x: 22980, w: 72, clear: 48, lane: 0 });
        closures.push({ x0: 22020, x1: 23052, wall: 22980, closed: 0, open: 1, split: false });
        },
        fill: function () {
        coins.push({ x: 1080, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 1560, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 2040, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 4764, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 5244, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 5724, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 6372, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 6852, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 7316, lift: 170, got: false, risk: true, lane: 'all', role: 'arc' });
        coins.push({ x: 8184, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 8664, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 9144, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 9624, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 10104, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 12708, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 13188, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 13680, lift: 38, got: false, risk: true, lane: 2, role: 'closure' });
        coins.push({ x: 14148, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 14628, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 15252, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 15924, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 16404, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 19068, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 19644, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 20124, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 20772, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 21720, lift: 38, got: false, risk: true, lane: 0, role: 'drag' });
        coins.push({ x: 22008, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 22488, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 22968, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 23448, lift: 38, got: false, risk: false, lane: 1, role: '' });
        },
      },
      'ash-veil': {
        cps: [0, 1776, 4128, 6936, 9096, 11352, 12752, 13304, 16184, 17288, 19400, 22040, 24752],
        taps: [{ x: 4560, lane: 1, dir: 1 }, { x: 5640, lane: 2, dir: 1 }, { x: 8580, lane: 1, dir: -1 }, { x: 13800, lane: 0, dir: -1 }, { x: 18960, lane: 1, dir: 1 }, { x: 19200, lane: 2, dir: 1 }, { x: 21336, lane: 1, dir: -1 }, { x: 23520, lane: 0, dir: -1 }],
        place: function () {
        hazards.push({ kind: 'debris', x: 3600, w: 72, clear: 16, lane: 2 });
        hazards.push({ kind: 'wall', x: 4800, w: 96, clear: 48, lane: 0 });
        closures.push({ x0: 3840, x1: 4896, wall: 4800, closed: 0, open: 1, split: false });
        hazards.push({ kind: 'wall', x: 5940, w: 48, clear: 48, lane: 1 });
        hazards.push({ kind: 'debris', x: 8460, w: 72, clear: 16, lane: 0 });
        hazards.push({ kind: 'debris', x: 10800, w: 72, clear: 16, lane: 2 });
        hazards.push({ kind: 'wall', x: 14220, w: 48, clear: 48, lane: 2 });
        hazards.push({ kind: 'wall', x: 15480, w: 48, clear: 48, lane: 1 });
        hazards.push({ kind: 'debris', x: 18540, w: 72, clear: 16, lane: 1 });
        hazards.push({ kind: 'debris', x: 19680, w: 72, clear: 16, lane: 1 });
        hazards.push({ kind: 'wall', x: 21600, w: 72, clear: 48, lane: 2 });
        closures.push({ x0: 20640, x1: 21672, wall: 21600, closed: 2, open: 1, split: false });
        hazards.push({ kind: 'debris', x: 24000, w: 72, clear: 16, lane: 1 });
        },
        fill: function () {
        coins.push({ x: 1104, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 1608, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 2112, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 3708, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 4440, lift: 38, got: false, risk: true, lane: 0, role: 'closure' });
        coins.push({ x: 4764, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 5268, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 5844, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 6348, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 6852, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 7356, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 7804, lift: 170, got: false, risk: true, lane: 'all', role: 'arc' });
        coins.push({ x: 8784, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 9288, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 10896, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 11400, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 11904, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 12636, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 13140, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 13644, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 14148, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 14940, lift: 38, got: false, risk: true, lane: 0, role: 'drag' });
        coins.push({ x: 15240, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 15744, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 16248, lift: 38, got: false, risk: false, lane: 'all', role: '' });
        coins.push({ x: 18804, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 19404, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 19908, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 20412, lift: 38, got: false, risk: false, lane: 2, role: '' });
        coins.push({ x: 21240, lift: 38, got: false, risk: true, lane: 2, role: 'closure' });
        coins.push({ x: 21540, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 22044, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 23436, lift: 38, got: false, risk: false, lane: 1, role: '' });
        coins.push({ x: 23940, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 24444, lift: 38, got: false, risk: false, lane: 0, role: '' });
        coins.push({ x: 24948, lift: 38, got: false, risk: false, lane: 0, role: '' });
        },
      },
    };
    const spec = V14[map.id];
    if (spec) {
      hazards.length = 0;
      spec.place();
      coins.length = 0;
      spec.fill();
      checkpoints.length = 0;
      for (let ci = 0; ci < spec.cps.length; ci++) checkpoints.push(spec.cps[ci]);
    }
    hazards.sort(function (a, b) { return a.x - b.x; });
    if (blocks.length) {
      blocks[0].x0 = 0;
      blocks[blocks.length - 1].x1 = finishAt;
    }
    const tally = laneTally(coins);
    const laneCoins = tally[0] + tally[1] + tally[2];
    const reach = {
      before: tally,
      after: tally,
      share: [0, 1, 2].map(function (lane) { return laneCoins ? tally[lane] / laneCoins : 0; }),
      before108: 0,
      lift108: 0,
      moved: 0,
      lowered: 0,
      missed: [],
      knife: [],
      hops: spec ? spec.taps : [],
      roles: [],
      lines: [],
      gasOff: [],
      coins: coins.length,
      taps: spec ? spec.taps : [],
    };
    for (let ri = 0; ri < coins.length; ri++) {
      const coin = coins[ri];
      if (coin.lift > 70) reach.lift108 += 1;
      if (coin.role) reach.roles.push({ i: ri, x: coin.x, lane: coin.lane, lift: coin.lift, role: coin.role });
    }

    return {
      id: map.id,
      name: map.name,
      tier: map.tier,
      accent: map.accent,
      theme: map.theme,
      star2: map.star2,
      star3: map.star3,
      rivalT: map.rivalT || null,
      pace: map.pace || 1,
      finishX: finishAt,
      zones: zones,
      closures: closures,
      blocks: blocks,
      keys: keys,
      hazards: hazards,
      pads: pads,
      hints: hints,
      coins: coins,
      ceilings: ceilings,
      checkpoints: checkpoints,
      loops: loops,
      reach: reach,
      drags: drags,
      boosts: boosts,
      arrows: arrows,
      leanLips: leanLips,
      style: FIELD_STYLE[map.id] || FIELD_STYLE['nite-pier'],
      provisional: !!map.provisional,
    };
  }

  function groundAt(keys, x) {
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
    const t = Math.max(0, Math.min(1, (x - a.x) / dx));
    if (b.ramp) {
      const p = b.pow || 1.65;
      const tn = Math.pow(t, p);
      return { h: a.h + (b.h - a.h) * tn, slope: (b.h - a.h) * p * Math.pow(Math.max(t, 0.001), p - 1) / dx };
    }
    const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
    return { h: a.h + (b.h - a.h) * s, slope: (b.h - a.h) * (Math.PI * 0.5 * Math.sin(Math.PI * t)) / dx };
  }

  function closureAt(track, x, lane) {
    const list = track.closures || [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (x < c.x0 || x > c.x1) continue;
      if (c.split) {
        if (lane !== c.open) return c;
      } else if (c.closed === lane) return c;
    }
    return null;
  }


  function laneTally(coins) {
    const n = { 0: 0, 1: 0, 2: 0, all: 0 };
    for (let i = 0; i < coins.length; i++) {
      const lane = coins[i].lane;
      if (lane === 0 || lane === 1 || lane === 2) n[lane] += 1;
      else n.all += 1;
    }
    return n;
  }

  function validate(id) {
    const t = compile(id);
    const errors = [];
    const coins = { 'nite-pier': 26, 'amp-spine': 26, 'static-cut': 31, 'void-well': 31, 'ash-veil': 36 };
    if (t.coins.length !== coins[id]) errors.push('coins ' + t.coins.length);
    for (let i = 0; i < t.pads.length; i++) if (t.pads[i].lane !== 'all') errors.push('pad lane');
    for (let i = 1; i < t.blocks.length; i++) {
      if (t.blocks[i].x0 !== t.blocks[i - 1].x1) errors.push('block gap');
    }
    if (!t.blocks.length || t.blocks[0].x0 !== 0 || t.blocks[t.blocks.length - 1].x1 !== t.finishX) errors.push('block ends');
    const laneHaz = [];
    for (let i = 0; i < t.hazards.length; i++) {
      const h = t.hazards[i];
      if (h.lane === 'all' || h.lane == null) continue;
      laneHaz.push(h);
      for (let z = 0; z < t.zones.length; z++) {
        const zone = t.zones[z];
        if (zone.kind === 'lip') continue;
        if (h.x >= zone.x0 && h.x <= zone.x1 && (zone.kind === 'gate' || zone.kind === 'bar' || zone.kind === 'tunnel' || zone.kind === 'ring')) {
          errors.push('lane hazard in zone ' + Math.round(h.x / 12));
        }
      }
    }
    laneHaz.sort(function (a, b) { return a.x - b.x; });
    for (let i = 1; i < laneHaz.length; i++) {
      const gap = laneHaz[i].x - laneHaz[i - 1].x;
      if (gap > 120 && gap < M(90)) errors.push('spacing ' + Math.round(laneHaz[i].x / 12));
    }
    if (t.reach && t.reach.missed.length) errors.push('unreachable ' + t.reach.missed.join(','));
    if (t.reach) {
      const boostLine = t.reach.lines.filter(function (line) { return line.name === 'boost'; })[0];
      if (boostLine && boostLine.got !== t.coins.length) errors.push('circuit ' + boostLine.got + '/' + t.coins.length);
      if (boostLine && boostLine.rears) errors.push('rear ' + boostLine.rears);
      if (boostLine && boostLine.badTaps) errors.push('air tap ' + boostLine.badTaps);
      const roles = t.reach.roles || [];
      if (!roles.some(function (r) { return r.role === 'hazard' || r.role === 'rival' || r.role === 'closure' || r.role === 'split' || r.role === 'arc'; })) errors.push('no risk coin');
      if (!t.coins.some(function (c) { return c.lane === 2; })) errors.push('no top lane');
    }
    if (t.reach && t.reach.knife.length) errors.push('one-speed ' + t.reach.knife.join(','));
    if (t.reach) {
      const laneCoins = t.reach.after[0] + t.reach.after[1] + t.reach.after[2];
      for (let lane = 0; lane < 3; lane++) {
        if (laneCoins && t.reach.after[lane] / laneCoins < 0.2) errors.push('lane share ' + lane);
      }
    }
    for (let i = 0; i < t.coins.length; i++) {
      const coin = t.coins[i];
      if (coin.lane !== 'all' && coin.lane != null && closureAt(t, coin.x, coin.lane)) {
        const hit = closureAt(t, coin.x, coin.lane);
        if (hit && coin.x >= hit.wall && coin.x <= hit.x1) errors.push('closed coin ' + i);
      }
      for (let j = i + 1; j < t.coins.length; j++) {
        const other = t.coins[j];
        if (other.lane !== coin.lane || coin.lane === 'all') continue;
        if (Math.abs(other.x - coin.x) < 48) errors.push('overlap ' + i + ',' + j);
      }
    }

    const drags = t.drags || [];
    for (let i = 0; i < drags.length; i++) {
      const d = drags[i];
      const ceilings = t.ceilings || [];
      for (let c = 0; c < ceilings.length; c++) {
        const body0 = ceilings[c].x;
        const body1 = ceilings[c].x + ceilings[c].w;
        if (d.x1 > body0 && d.x0 < body1) errors.push('drag over tunnel');
      }
      const loops = t.loops || [];
      for (let c = 0; c < loops.length; c++) {
        if (d.x1 > loops[c].entry && d.x0 < loops[c].exit) errors.push('drag over ring');
      }
    }
    const taps = (t.reach && t.reach.taps) || [];
    const rampLips = [];
    for (let i = 0; i < t.keys.length; i++) if (t.keys[i].ramp) rampLips.push(t.keys[i].x);
    for (let i = 0; i < taps.length; i++) {
      for (let r = 0; r < rampLips.length; r++) {
        const past = taps[i].x - rampLips[r];
        if (past > 0 && past < 780) errors.push('tap in air ' + taps[i].x);
      }
    }
    function gasTouch(lip, speed0, boost, coast) {
      const keys = t.keys;
      const dt = 1 / 120;
      let x = lip - 900;
      let g = groundAt(keys, x);
      let y = g.h;
      let vy = 0;
      let air = false;
      let prevH = g.h;
      let prevSlope = g.slope;
      let speed = speed0;
      let padT = 0;
      let airTime = 0;
      const pads = t.boosts || [];
      for (let n = 0; n < 120 * 8 && x < lip + 1800; n++) {
        if (padT > 0) padT -= dt;
        let touching = false;
        if (!air) {
          for (let p = 0; p < pads.length; p++) {
            if (x >= pads[p].x && x <= pads[p].x + pads[p].len) touching = true;
          }
        }
        if (touching) padT = 0.9;
        const padOn = padT > 0;
        const thrusting = !coast || padOn;
        const cap = (padOn || boost) ? 980 : 720;
        if (!thrusting) speed -= 150 * dt;
        else if (speed > cap) speed += (cap - speed) * Math.min(1, dt * 4.5);
        else {
          const a = ((boost || padOn) ? 560 : 340) * (air ? 0.45 : 1);
          speed += a * dt;
          if (speed > cap) speed = cap;
        }
        if (!air) {
          const climb = groundAt(keys, x).slope;
          speed -= Math.max(0, climb) * 110 * dt;
          speed += Math.max(0, -climb) * 46 * dt;
        }
        speed -= speed * 0.08 * dt;
        if (speed < 0) speed = 0;
        if (!air) {
          for (let di = 0; di < drags.length; di++) {
            const field = drags[di];
            if (x >= field.x0 && x <= field.x1 && (field.lane === 'all' || field.lane == null)) {
              speed -= speed * field.k * dt;
              break;
            }
          }
        }
        const prevX = x;
        x += speed * dt;
        if (air) {
          vy -= 760 * dt;
          y += vy * dt;
          airTime += dt;
          g = groundAt(keys, x);
          if (airTime > 0.1 && vy <= 40 && y <= g.h) return x;
        } else {
          g = groundAt(keys, x);
          const dx = Math.max(0, x - prevX);
          const glide = prevH + prevSlope * dx;
          const gap = glide - g.h;
          const steep = prevSlope > 0.42 && (prevSlope - g.slope) > 0.34;
          const fell = gap > 26 && prevSlope > 0.2;
          if ((steep || fell) && speed > 200 && x > lip - 220) {
            const slope = Math.max(0.08, prevSlope);
            vy = Math.min(410, Math.max(170, speed * Math.max(0.05, slope) * 3.3));
            air = true;
            airTime = 0;
            y = Math.max(g.h, glide);
          } else {
            y = g.h;
            prevH = g.h;
            prevSlope = g.slope;
          }
        }
      }
      return 0;
    }
    const landings = [];
    for (let i = 0; i < rampLips.length; i++) {
      const lip = rampLips[i];
      let lo = 0;
      let hi = 0;
      for (let sp = 250; sp <= 980; sp += 50) {
        for (let b = 0; b < 2; b++) {
          const landed = gasTouch(lip, sp, b === 1, false);
          if (!landed) continue;
          if (!lo || landed < lo) lo = landed;
          if (landed > hi) hi = landed;
        }
      }
      const topped = gasTouch(lip, 980, true, false);
      if (topped && (!lo || topped < lo)) lo = topped;
      if (topped > hi) hi = topped;
      if (!(lo > lip)) errors.push('gas touch ' + Math.round(lip));
      landings.push({ lip: lip, x0: lo, x1: hi + 110, early: lo });
    }
    function overlaps(x0, x1, band) {
      return x1 > band.x0 && x0 < band.x1;
    }
    const warnings = [];
    const laneItems = [];
    const closures = t.closures || [];
    for (let i = 0; i < t.hazards.length; i++) {
      const h = t.hazards[i];
      if (h.lane === 'all' || h.lane == null) continue;
      let closure = false;
      for (let c = 0; c < closures.length; c++) {
        if (closures[c].wall === h.x && closures[c].closed === h.lane) closure = true;
      }
      laneItems.push({
        x0: h.x,
        x1: h.x + (h.w || 0),
        hard: h.kind === 'wall' || closure,
        label: (closure ? 'closure ' : (h.kind || 'hazard') + ' ') + Math.round(h.x),
      });
    }
    for (let i = 0; i < drags.length; i++) {
      const d = drags[i];
      if (d.lane === 'all' || d.lane == null) continue;
      laneItems.push({ x0: d.x0, x1: d.x1, hard: false, label: 'lane drag ' + Math.round(d.x0) });
    }
    const lipZones = [];
    const zones = t.zones || [];
    for (let z = 0; z < zones.length; z++) {
      if (zones[z].kind !== 'lip') continue;
      let real = false;
      for (let r = 0; r < rampLips.length; r++) {
        if (rampLips[r] >= zones[z].x0 && rampLips[r] <= zones[z].x1) real = true;
      }
      if (real) lipZones.push(zones[z]);
    }
    for (let i = 0; i < laneItems.length; i++) {
      const item = laneItems[i];
      for (let z = 0; z < lipZones.length; z++) {
        if (overlaps(item.x0, item.x1, lipZones[z])) errors.push(item.label + ' in lip');
      }
      for (let s = 0; s < landings.length; s++) {
        const band = landings[s];
        if (item.x0 >= band.lip && item.x1 <= band.early) errors.push(item.label + ' overflown ' + Math.round(band.lip));
        if (overlaps(item.x0, item.x1, band)) {
          if (item.hard) errors.push(item.label + ' in landing ' + Math.round(band.lip));
          else warnings.push(item.label + ' in landing ' + Math.round(band.lip));
        }
      }
    }
    errors.warnings = warnings;
    const want = {
      'nite-pier': 2, 'amp-spine': 4, 'static-cut': 6, 'void-well': 8, 'ash-veil': 11,
    };
    let laneN = 0;
    for (let i = 0; i < t.hazards.length; i++) if (t.hazards[i].lane !== 'all') laneN += 1;
    if (laneN !== want[id]) errors.push('lane hazards ' + laneN);
    const leans = t.leanLips || [];
    for (let i = 0; i < leans.length; i++) {
      if (leans[i].signX < 0) errors.push('lean sign ' + leans[i].lip);
      if (leans[i].lip - leans[i].signX < 960) errors.push('lean runup ' + leans[i].lip);
    }
    for (let i = 0; i < (t.boosts || []).length; i++) if (t.boosts[i].lane !== 'all') errors.push('boost lane');
    return errors;
  }

  root.VoltMaps = {
    list: LIST,
    compile: compile,
    validate: validate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
