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
    { id: 'nite-pier', name: 'NITE PIER', tier: 'NOVICE', accent: '#5ef6ff', theme: 'pier', star2: 30, star3: 23, seed: 101, unlock: null },
    { id: 'amp-spine', name: 'AMP SPINE', tier: 'INTERMEDIATE', accent: '#ff4ad0', theme: 'spine', star2: 36, star3: 29, seed: 202, unlock: 'nite-pier' },
    { id: 'static-cut', name: 'STATIC CUT', tier: 'ADVANCED', accent: '#ffe08a', theme: 'cut', star2: 46, star3: 37, seed: 303, unlock: 'amp-spine' },
    { id: 'void-well', name: 'VOID WELL', tier: 'EXPERT', accent: '#b08cff', theme: 'well', star2: 39, star3: 31, seed: 404, unlock: 'static-cut' },
    { id: 'ash-veil', name: 'ASH VEIL', tier: 'MASTER', accent: '#ff6a4a', theme: 'veil', star2: 50, star3: 40, seed: 505, unlock: 'void-well' },
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
    function cp() { checkpoints.push(x); }
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
      startPad();
      rollers(4, 24, 16);
      cp();
      gap(16, 16, 'SEND IT');
      rollers(3, 22, 14);
      stretch(700);
      cp();
      tabletop();
      tabletop();
      heat(28);
      cp();
      stretch(1200);
      whoops(3);
      rollers(2, 24, 18);
      cp();
      gap(15, 18, 'CHANNEL');
      heat(22);
      cp();
      gate();
      stretch(1650);
    } else if (map.id === 'amp-spine') {
      startPad();
      rollers(2, 20, 12);
      stretch(500);
      cp();
      stepUp();
      whoops(4);
      hazards.push({ kind: 'debris', x: x - M(18), w: 64, clear: 16 });
      heat(26);
      cp();
      tunnel(26, 100);
      cp();
      kicker(120, 'EXIT LIP');
      valley(14, 18);
      landing();
      bar();
      stretch(1200);
      cp();
      sweeper();
      stepUp();
      stepDown();
      heat(24);
      cp();
      stretch(1700);
      cp();
      kicker(136, 'JUMP');
      valley(12, 18);
      landing();
      gate();
    } else if (map.id === 'static-cut') {
      startPad();
      rollers(3, 26, 20);
      stretch(550);
      cp();
      gap(18, 12, 'GAP');
      cp();
      gap(22, 10, 'GAP');
      heat(24);
      stretch(1400);
      cp();
      kicker(168, 'CUT LINE');
      coin(120);
      coin(120);
      valley(18, 14);
      landing();
      rollers(2, 18, 12);
      cp();
      sweeper();
      stretch(2000);
      gap(16, 16, 'SEND IT');
      cp();
      gate();
    } else if (map.id === 'void-well') {
      startPad();
      rollers(3, 18, 18);
      stretch(480);
      to(18, 78);
      to(22, 26);
      to(16, 64);
      to(20, 30);
      heat(30);
      cp();
      loopRing();
      cp();
      landing();
      stepUp();
      bar();
      stretch(1400);
      cp();
      tunnel(24, 78);
      heat(22);
      cp();
      kicker(118, 'SEND IT');
      valley(14, 16);
      landing();
      stretch(1900);
      to(20, 64);
    } else {
      startPad();
      rollers(3, 16, 14);
      stretch(450);
      cp();
      tunnel(22, 96);
      cp();
      kicker(124, 'EXIT LIP');
      valley(14, 16);
      landing();
      cp();
      gap(16, 14, 'VEIL');
      coin(112);
      landing();
      gap(20, 12, 'SPAN');
      coin(116);
      heat(26);
      stretch(1500);
      cp();
      loopRing();
      flat(28);
      cp();
      tunnel(26, 118);
      heat(22);
      stretch(2300);
      cp();
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

    return {
      id: map.id,
      name: map.name,
      tier: map.tier,
      accent: map.accent,
      theme: map.theme,
      star2: map.star2,
      star3: map.star3,
      finishX: finishAt,
      keys: keys,
      hazards: hazards,
      pads: pads,
      hints: hints,
      coins: coins,
      ceilings: ceilings,
      checkpoints: checkpoints,
      loops: loops,
    };
  }

  root.VoltMaps = {
    list: LIST,
    compile: compile,
  };
})(typeof window !== 'undefined' ? window : globalThis);
