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
    { id: 'nite-pier', name: 'NITE PIER', tier: 'NOVICE', accent: '#5ef6ff', theme: 'pier', star2: 30, star3: 23, rivalT: [23.5, 26.5, 30], seed: 101, unlock: null, pace: 1 },
    { id: 'amp-spine', name: 'AMP SPINE', tier: 'INTERMEDIATE', accent: '#ff4ad0', theme: 'spine', star2: 36, star3: 29, rivalT: [29.5, 32.5, 36], seed: 202, unlock: 'nite-pier', pace: 1 },
    { id: 'static-cut', name: 'STATIC CUT', tier: 'ADVANCED', accent: '#ffe08a', theme: 'cut', star2: 46, star3: 37, rivalT: [37.5, 41.5, 46], seed: 303, unlock: 'amp-spine', pace: 1 },
    { id: 'void-well', name: 'VOID WELL', tier: 'EXPERT', accent: '#b08cff', theme: 'well', star2: 39, star3: 31, rivalT: [31.5, 35, 39], seed: 404, unlock: 'static-cut', pace: 1 },
    { id: 'ash-veil', name: 'ASH VEIL', tier: 'MASTER', accent: '#ff6a4a', theme: 'veil', star2: 50, star3: 40, rivalT: [40.5, 45, 50], seed: 505, unlock: 'void-well', pace: 1 },
  ];

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

    function startPad() {
      flat(100);
      hint('EASE IN');
      sprinkle(80);
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
    if (map.id === 'nite-pier') {
      block('START');
      startPad();
      rollers(4, 24, 16);
      cp();
      block('SEND');
      gap(16, 16, 'SEND IT');
      rollers(3, 22, 14);
      stretch(700);
      cp();
      block('TABLES', true);
      tabletop();
      tabletop();
      heat(28);
      cp();
      block('WHOOP');
      stretch(1200);
      whoops(3);
      rollers(2, 24, 18);
      cp();
      block('SEND');
      gap(15, 18, 'CHANNEL');
      heat(22);
      cp();
      block('FINALE');
      gate();
      stretch(1650);
    } else if (map.id === 'amp-spine') {
      block('START');
      startPad();
      rollers(2, 20, 12);
      stretch(500);
      cp();
      block('WHOOP');
      stepUp();
      whoops(4);
      hazards.push({ kind: 'debris', x: x - M(18), w: 64, clear: 16 });
      heat(26);
      cp();
      block('TUNNEL LIP', true);
      tunnel(26, 100);
      cp();
      block('BEAM');
      kicker(120, 'EXIT LIP');
      valley(14, 18);
      landing();
      bar();
      stretch(1200);
      cp();
      block('SWEEP');
      sweeper();
      stepUp();
      stepDown();
      heat(24);
      cp();
      block('ROLL');
      stretch(1700);
      cp();
      block('FINALE');
      kicker(136, 'JUMP');
      valley(12, 18);
      landing();
      gate();
    } else if (map.id === 'static-cut') {
      block('START');
      startPad();
      rollers(3, 26, 20);
      stretch(550);
      cp();
      block('DOUBLE GAP', true);
      gap(18, 12, 'GAP');
      cp();
      block('ROLL');
      gap(22, 10, 'GAP');
      heat(24);
      stretch(1400);
      cp();
      block('CUT LINE', true);
      kicker(168, 'CUT LINE');
      coin(120);
      coin(120);
      valley(18, 14);
      landing();
      rollers(2, 18, 12);
      cp();
      block('SWEEP');
      sweeper();
      stretch(2000);
      gap(16, 16, 'SEND IT');
      cp();
      block('FINALE');
      gate();
    } else if (map.id === 'void-well') {
      block('START');
      startPad();
      rollers(3, 18, 18);
      stretch(480);
      to(18, 78);
      to(22, 26);
      to(16, 64);
      to(20, 30);
      heat(30);
      cp();
      block('RING', true);
      loopRing();
      cp();
      block('BEAM');
      landing();
      stepUp();
      bar();
      stretch(1400);
      cp();
      block('TUNNEL LIP', true);
      tunnel(24, 78);
      heat(22);
      cp();
      block('SEND');
      kicker(118, 'SEND IT');
      valley(14, 16);
      landing();
      stretch(1900);
      to(20, 64);
    } else {
      block('START');
      startPad();
      rollers(3, 16, 14);
      stretch(450);
      cp();
      block('TUNNEL LIP', true);
      tunnel(22, 96);
      cp();
      block('DOUBLE GAP', true);
      kicker(124, 'EXIT LIP');
      valley(14, 16);
      landing();
      cp();
      block('ROLL');
      gap(16, 14, 'VEIL');
      coin(112);
      landing();
      gap(20, 12, 'SPAN');
      coin(116);
      heat(26);
      stretch(1500);
      cp();
      block('RING', true);
      loopRing();
      flat(28);
      cp();
      block('ROLL');
      tunnel(26, 118);
      heat(22);
      stretch(2300);
      cp();
      block('FINALE');
      kicker(160, 'VEIL');
      valley(16, 18);
      landing();
      gate();
    }

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
    if (map.id === 'nite-pier') {
      addLane('debris', 420, 1, 6);
      addLane('debris', 1080, 0, 6);
    } else if (map.id === 'amp-spine') {
      for (let i = 0; i < hazards.length; i++) {
        const h = hazards[i];
        if (h.kind === 'debris' && Math.abs(h.x - M(593)) < M(30)) h.lane = 0;
      }
      closeLane(1080, 80, 2, 1);
      const splitX = M(1500);
      if (!inAny(splitX, M(40))) {
        hazards.push({ kind: 'wall', x: splitX, w: 36, clear: 48, lane: 0 });
        hazards.push({ kind: 'wall', x: splitX, w: 36, clear: 48, lane: 2 });
        closures.push({ x0: splitX - M(80), x1: splitX + 80, wall: splitX, closed: 0, open: 1, split: false });
        closures.push({ x0: splitX - M(80), x1: splitX + 80, wall: splitX, closed: 2, open: 1, split: false });
      }
    } else if (map.id === 'static-cut') {
      addLane('wall', 850, 1, 4);
      addLane('wall', 960, 2, 4);
      addLane('wall', 1650, 0, 4);
      addLane('wall', 1760, 2, 4);
      closeLane(1900, 70, 0, 1);
    } else if (map.id === 'void-well') {
      const s0 = M(900);
      if (!inAny(s0, M(40))) {
        hazards.push({ kind: 'debris', x: s0, w: 64, clear: 16, lane: 0 });
        hazards.push({ kind: 'debris', x: s0 + 90, w: 64, clear: 16, lane: 2 });
      }
      const s1 = M(1680);
      if (!inAny(s1, M(40))) {
        hazards.push({ kind: 'debris', x: s1, w: 64, clear: 16, lane: 1 });
        hazards.push({ kind: 'debris', x: s1 + 90, w: 64, clear: 16, lane: 2 });
      }
    } else if (map.id === 'ash-veil') {
      closeLane(1000, 160, 2, 1);
      closeLane(1700, 140, 0, 1);
      addLane('wall', 1950, 1, 4);
      addLane('wall', 2050, 2, 4);
    }
    const laneRand = mulberry32((map.seed ^ 0x1A4E) >>> 0);
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (inAny(c.x, 0)) c.lane = 'all';
      else if (c.risk) c.lane = 2;
      else c.lane = laneRand() * 3 | 0;
    }
    if (map.id === 'amp-spine') {
      for (let i = 0; i < hazards.length; i++) {
        const h = hazards[i];
        if (h.kind === 'debris' && h.x > 6900 && h.x < 7300) h.x = 6688;
      }
    }
    hazards.sort(function (a, b) { return a.x - b.x; });
    if (blocks.length) {
      blocks[0].x0 = 0;
      blocks[blocks.length - 1].x1 = finishAt;
    }

    const reach = layoutCoins({
      id: map.id,
      keys: keys,
      coins: coins,
      closures: closures,
      loops: loops,
      hazards: hazards,
      zones: zones,
      rivalT: map.rivalT || null,
      finishX: finishAt,
    });

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

  const NORA = {
    'nite-pier': { lanes: 'A,0,0,1,1,1,2,2,2,1,A,1,1,2,2,2,1,0,0,0,1,2,2', moves: { 3: 5360, 10: 8904 } },
    'amp-spine': { lanes: 'A,0,1,2,2,1,0,0,1,0,1,2,2,1,2,2,1,1,1,2,2,2,1,0,0,1,2,2,A', moves: { 22: 17684 } },
    'static-cut': { lanes: 'A,0,1,2,2,1,0,0,1,A,2,2,1,1,0,1,2,2,1,0,0,1,2,2,1,A,A,A,1,1,0,0,0,1,2,2,A', moves: { 26: 17472, 27: 17568 } },
    'void-well': { lanes: 'A,0,1,2,2,1,0,1,1,1,0,2,2,2,1,2,2,1,0,0,1,2,A,A,1,0,0,1,2,2,1,0,0', moves: { 11: 11208 } },
    'ash-veil': { lanes: 'A,0,1,2,2,1,1,A,A,A,A,2,2,0,1,2,1,1,0,1,0,1,2,2,1,0,1,A,A,0,1,2,2,1,1,0,1,1,2,2,1,0,0,A', moves: { 15: 11776 } },
  };
  const TAPS = {
    'nite-pier': [[5130, 1], [6500, 2], [8100, 1], [12280, 2], [13880, 1], [14400, 0], [18730, 1], [19260, 2]],
    'amp-spine': [[2250, 1], [2700, 2], [3750, 1], [4270, 0], [5330, 1], [5860, 0], [6350, 1], [9950, 2], [10970, 1], [11450, 2], [12500, 1], [14000, 2], [17520, 1], [18150, 0], [19160, 1], [19690, 2]],
    'static-cut': [[3140, 1], [3670, 2], [4730, 1], [5260, 0], [6300, 1], [9350, 2], [10300, 1], [11450, 0], [11980, 1], [12500, 2], [13560, 1], [14090, 0], [15140, 1], [15670, 2], [16730, 1], [20880, 0], [22350, 1], [23000, 2]],
    'void-well': [[2850, 1], [3380, 2], [4440, 1], [4970, 0], [5500, 1], [10250, 0], [10650, 1], [10980, 2], [12370, 1], [12900, 2], [13950, 1], [14480, 0], [15540, 1], [16060, 2], [19000, 1], [19500, 0], [20550, 1], [21080, 2], [22140, 1], [22660, 0]],
    'ash-veil': [[2280, 1], [2780, 2], [3840, 1], [9250, 2], [10200, 1], [10300, 0], [10820, 1], [11200, 2], [11850, 1], [12930, 0], [13460, 1], [13990, 0], [14500, 1], [15050, 2], [16100, 1], [16630, 0], [17160, 1], [19650, 0], [20600, 1], [21220, 2], [22280, 1], [23200, 0], [23850, 1], [24900, 2], [25980, 1], [26500, 0]],
  };
  const RISK = {
    'nite-pier': { 3: 'hazard' },
    'amp-spine': { 15: 'closure', 19: 'rival', 22: 'split' },
    'static-cut': { 21: 'rival', 32: 'closure' },
    'void-well': { 10: 'hazard', 11: 'hazard', 12: 'rival' },
    'ash-veil': { 10: 'arc', 15: 'closure', 29: 'closure' },
  };

  function tapPlan(id) {
    const rows = TAPS[id] || [];
    const out = [];
    for (let i = 0; i < rows.length; i++) out.push({ x: rows[i][0], lane: rows[i][1] });
    return out;
  }

  function layoutCoins(track) {
    const spec = NORA[track.id];
    const before = laneTally(track.coins);
    let before108 = 0;
    const lanes = spec.lanes.split(',');
    let moved = 0;
    for (let i = 0; i < track.coins.length; i++) {
      const coin = track.coins[i];
      if ((coin.lift || 0) > 70) before108 += 1;
      coin.lane = lanes[i] === 'A' ? 'all' : Number(lanes[i]);
      if (spec.moves[i] != null && coin.x !== spec.moves[i]) {
        coin.x = spec.moves[i];
        moved += 1;
      }
      if ((coin.lift || 0) > 70) {
        coin.lift = 38;
        coin.risk = false;
      }
      coin.role = '';
      coin.airCoin = false;
    }
    if (track.id === 'ash-veil') {
      track.coins[9].x = 6024;
      track.coins[9].lane = 'all';
      track.coins[9].lift = 38;
      track.coins[9].risk = false;
      track.coins[9].airCoin = false;
      track.coins[10].lift = 186;
      track.coins[10].risk = true;
      track.coins[10].airCoin = true;
    }
    const roles = RISK[track.id] || {};
    const keys = Object.keys(roles);
    for (let k = 0; k < keys.length; k++) {
      const coin = track.coins[Number(keys[k])];
      coin.role = roles[keys[k]];
      coin.risk = true;
    }
    const after = laneTally(track.coins);
    const laneCoins = after[0] + after[1] + after[2];
    const share = [0, 1, 2].map(function (lane) { return laneCoins ? after[lane] / laneCoins : 0; });
    let lift108 = 0;
    for (let i = 0; i < track.coins.length; i++) if ((track.coins[i].lift || 0) > 70) lift108 += 1;
    const roleRows = [];
    for (let i = 0; i < track.coins.length; i++) {
      const coin = track.coins[i];
      if (!coin.role) continue;
      roleRows.push({ i: i, x: Math.round(coin.x), lane: coin.lane, lift: coin.lift || 0, role: coin.role });
    }
    return {
      before: before,
      after: after,
      share: share,
      before108: before108,
      lift108: lift108,
      moved: moved,
      lowered: before108 - lift108,
      missed: [],
      knife: [],
      hops: tapPlan(track.id),
      roles: roleRows,
      lines: [],
      gasOff: (track.loops || []).map(function (loop) { return { x0: loop.entry - 60, x1: loop.entry + 16 }; }),
      coins: track.coins.length,
      taps: tapPlan(track.id),
    };
  }

  function validate(id) {
    const t = compile(id);
    const errors = [];
    const coins = { 'nite-pier': 23, 'amp-spine': 29, 'static-cut': 37, 'void-well': 33, 'ash-veil': 44 };
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
        if (h.x >= zone.x0 && h.x <= zone.x1 && (zone.kind === 'lip' || zone.kind === 'gate' || zone.kind === 'bar' || zone.kind === 'tunnel' || zone.kind === 'ring')) {
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
    return errors;
  }

  root.VoltMaps = {
    list: LIST,
    compile: compile,
    validate: validate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
