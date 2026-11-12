/* VOLT ALLEY procedural audio. Oscillators and noise only - no samples.
   Sound effects plus an original, generative 80s analogue-synth score:
   detuned saw pads, a delayed vibrato lead, a sub drone, a generated-impulse
   reverb, and (in races) a soft kick with an arpeggiated bass. */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Score data (original). D minor, slow changes: two bars per chord.
  // ---------------------------------------------------------------------------
  const BPM = 72;
  const EIGHTH = 60 / BPM / 2;
  const STEPS_PER_CHORD = 16;
  const CHORDS = [
    { pad: [50, 53, 57, 64], root: 38 }, // Dm9
    { pad: [46, 50, 53, 57], root: 34 }, // Bbmaj7
    { pad: [43, 50, 53, 58], root: 31 }, // Gm7
    { pad: [45, 50, 52, 57], root: 33 }, // Asus4
    { pad: [50, 53, 57, 64], root: 38 }, // Dm9
    { pad: [48, 52, 53, 57], root: 41 }, // Fmaj7
    { pad: [48, 52, 55, 62], root: 36 }, // Cadd9
    { pad: [45, 50, 55, 57], root: 33 }, // A7sus4
  ];
  const SCALE = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77]; // D natural minor, D4..F5
  const ARP = [0, 12, 7, 12, 0, 12, 10, 7];
  const MAX_VOICES = 26;
  const VOLUME = 0.26; // keeps the score well under the sound effects

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeImpulse(ac, seconds, decay) {
    const rate = ac.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ac.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const k = 0.55 + t * 0.4; // tail gets darker
        lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
        d[i] = lp * Math.pow(1 - t, decay) * 2.2;
      }
    }
    return buf;
  }

  // ---------------------------------------------------------------------------
  // Music engine. Works on a live AudioContext or an OfflineAudioContext.
  // ---------------------------------------------------------------------------
  function createMusic(ac, out) {
    const hasPanner = typeof ac.createStereoPanner === 'function';
    let voices = 0;
    const r = rng(9090);

    const volume = ac.createGain();
    volume.gain.value = VOLUME;
    volume.connect(out);
    const duck = ac.createGain();
    duck.gain.value = 1;
    duck.connect(volume);
    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 7000;
    tone.connect(duck);

    const reverb = ac.createConvolver();
    reverb.buffer = makeImpulse(ac, 3.4, 2.6);
    const reverbOut = ac.createGain();
    reverbOut.gain.value = 0.55;
    reverb.connect(reverbOut);
    reverbOut.connect(tone);

    const delay = ac.createDelay(2);
    delay.delayTime.value = EIGHTH * 1.5;
    const fb = ac.createGain();
    fb.gain.value = 0.38;
    const fbTone = ac.createBiquadFilter();
    fbTone.type = 'lowpass';
    fbTone.frequency.value = 2200;
    delay.connect(fbTone);
    fbTone.connect(fb);
    fb.connect(delay);
    const delayOut = ac.createGain();
    delayOut.gain.value = 0.45;
    fbTone.connect(delayOut);
    delayOut.connect(tone);
    delayOut.connect(reverb);

    function bus(dry, rev, del) {
      const g = ac.createGain();
      if (dry) { const d = ac.createGain(); d.gain.value = dry; g.connect(d); d.connect(tone); }
      if (rev) { const s = ac.createGain(); s.gain.value = rev; g.connect(s); s.connect(reverb); }
      if (del) { const s = ac.createGain(); s.gain.value = del; g.connect(s); s.connect(delay); }
      return g;
    }
    const padBus = bus(0.7, 0.8, 0);
    const leadBus = bus(0.6, 0.7, 0.55);
    const bassBus = bus(1, 0.12, 0);
    const pulseBus = bus(1, 0.18, 0);
    const stabBus = bus(0.6, 0.6, 0.25);
    pulseBus.gain.value = 0;

    // Sub drone: sine + soft triangle an octave up (audible on phone speakers).
    const droneA = ac.createOscillator();
    droneA.type = 'sine';
    const droneB = ac.createOscillator();
    droneB.type = 'triangle';
    const droneLP = ac.createBiquadFilter();
    droneLP.type = 'lowpass';
    droneLP.frequency.value = 380;
    const droneAG = ac.createGain();
    droneAG.gain.value = 0.16;
    const droneBG = ac.createGain();
    droneBG.gain.value = 0.05;
    droneA.connect(droneAG);
    droneB.connect(droneLP);
    droneLP.connect(droneBG);
    droneAG.connect(bassBus);
    droneBG.connect(bassBus);
    droneA.frequency.value = mtof(38);
    droneB.frequency.value = mtof(50);
    droneA.start();
    droneB.start();

    // Lead: one persistent voice (saw + detuned square) with delayed vibrato and glide.
    const leadA = ac.createOscillator();
    leadA.type = 'sawtooth';
    const leadB = ac.createOscillator();
    leadB.type = 'square';
    leadB.detune.value = -6;
    const vib = ac.createOscillator();
    vib.frequency.value = 5.2;
    const vibDepth = ac.createGain();
    vibDepth.gain.value = 0;
    vib.connect(vibDepth);
    vibDepth.connect(leadA.detune);
    vibDepth.connect(leadB.detune);
    const leadLP = ac.createBiquadFilter();
    leadLP.type = 'lowpass';
    leadLP.frequency.value = 900;
    leadLP.Q.value = 3.5;
    const leadMixB = ac.createGain();
    leadMixB.gain.value = 0.45;
    const leadAmp = ac.createGain();
    leadAmp.gain.value = 0;
    leadA.connect(leadLP);
    leadB.connect(leadMixB);
    leadMixB.connect(leadLP);
    leadLP.connect(leadAmp);
    leadAmp.connect(leadBus);
    leadA.frequency.value = mtof(69);
    leadB.frequency.value = mtof(69);
    leadA.start();
    leadB.start();
    vib.start();

    // Arpeggiated bass: one persistent saw through a resonant lowpass.
    const arp = ac.createOscillator();
    arp.type = 'sawtooth';
    const arpLP = ac.createBiquadFilter();
    arpLP.type = 'lowpass';
    arpLP.frequency.value = 520;
    arpLP.Q.value = 7;
    const arpAmp = ac.createGain();
    arpAmp.gain.value = 0;
    arp.connect(arpLP);
    arpLP.connect(arpAmp);
    arpAmp.connect(pulseBus);
    arp.frequency.value = mtof(50);
    arp.start();

    let mood = 'title';
    let ducked = false;
    let intensity = 0;
    let step = 0;
    let nextTime = 0;
    let melody = [];
    let running = false;

    function track(node, stopAt) {
      voices += 1;
      node.onended = function () { voices -= 1; };
      node.start(Math.max(0, stopAt[0]));
      node.stop(stopAt[1]);
    }

    function padChord(t, chord, dur) {
      const bright = mood === 'race' ? 1700 + intensity * 900 : 1250;
      const sides = hasPanner ? [-0.55, 0.55] : [0];
      const notes = voices > MAX_VOICES - 8 ? chord.pad.slice(0, 3) : chord.pad;
      const attack = 1.7;
      const release = 2.6;
      for (let s = 0; s < sides.length; s++) {
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 1.6;
        lp.frequency.setValueAtTime(260, t);
        lp.frequency.exponentialRampToValueAtTime(bright, t + dur * 0.45);
        lp.frequency.exponentialRampToValueAtTime(520, t + dur + release * 0.6);
        const amp = ac.createGain();
        amp.gain.setValueAtTime(0.0001, t);
        amp.gain.exponentialRampToValueAtTime(sides.length > 1 ? 0.05 : 0.07, t + attack);
        amp.gain.setValueAtTime(sides.length > 1 ? 0.05 : 0.07, t + dur);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
        lp.connect(amp);
        if (hasPanner) {
          const pan = ac.createStereoPanner();
          pan.pan.value = sides[s];
          amp.connect(pan);
          pan.connect(padBus);
        } else {
          amp.connect(padBus);
        }
        for (let i = 0; i < notes.length; i++) {
          const o = ac.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = mtof(notes[i]);
          o.detune.value = (s === 0 ? -9 : 9) + (r() - 0.5) * 6;
          o.connect(lp);
          track(o, [t, t + dur + release + 0.05]);
        }
      }
    }

    function stab(t, chord) {
      if (voices > MAX_VOICES - 4) return;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.exponentialRampToValueAtTime(2600, t + 0.09);
      lp.frequency.exponentialRampToValueAtTime(500, t + 0.9);
      const amp = ac.createGain();
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(0.045, t + 0.06);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      lp.connect(amp);
      amp.connect(stabBus);
      const top = chord.pad.slice(1);
      for (let i = 0; i < top.length; i++) {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(top[i] + 12);
        o.detune.value = (r() - 0.5) * 14;
        o.connect(lp);
        track(o, [t, t + 1.4]);
      }
    }

    function kick(t, level) {
      if (voices > MAX_VOICES) return;
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(115, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g);
      g.connect(pulseBus);
      track(o, [t, t + 0.36]);
    }

    function arpNote(t, midi, len, level) {
      arp.frequency.setValueAtTime(mtof(midi), t);
      arpAmp.gain.setValueAtTime(0.0001, t);
      arpAmp.gain.linearRampToValueAtTime(level, t + 0.008);
      arpAmp.gain.setTargetAtTime(0.0001, t + 0.03, len * 0.35);
    }

    function leadNote(t, midi, dur) {
      const f = mtof(midi);
      leadA.frequency.setTargetAtTime(f, t, 0.07);
      leadB.frequency.setTargetAtTime(f, t, 0.07);
      leadAmp.gain.setTargetAtTime(0.085, t, 0.09);
      leadAmp.gain.setTargetAtTime(0.0001, t + dur, 0.45);
      leadLP.frequency.setTargetAtTime(2400, t, 0.18);
      leadLP.frequency.setTargetAtTime(1100, t + 0.5, 0.6);
      vibDepth.gain.setValueAtTime(0, t);
      vibDepth.gain.linearRampToValueAtTime(18, t + Math.min(1.1, dur * 0.8));
    }

    function planMelody(chord) {
      melody = [];
      const chance = mood === 'race' ? 0.5 : 0.62;
      if (r() > chance) return;
      const count = 2 + ((r() * 3) | 0);
      let pos = [0, 2, 3, 4][(r() * 4) | 0];
      const tones = chord.pad.map(function (m) { return m + 12; }).filter(function (m) { return m >= 62 && m <= 77; });
      let idx = SCALE.indexOf(tones.length ? tones[(r() * tones.length) | 0] : 69);
      if (idx < 0) idx = 4;
      for (let i = 0; i < count && pos < STEPS_PER_CHORD - 1; i++) {
        const last = i === count - 1;
        const len = last ? 4 + ((r() * 5) | 0) : 1 + ((r() * 3) | 0);
        melody.push({ at: pos, len: Math.min(len, STEPS_PER_CHORD - pos), midi: SCALE[idx] });
        pos += len;
        const move = r();
        idx += move < 0.35 ? -1 : move < 0.6 ? 1 : move < 0.75 ? -2 : move < 0.87 ? 2 : 0;
        idx = Math.max(0, Math.min(SCALE.length - 1, idx));
      }
      if (melody.length) {
        const end = melody[melody.length - 1];
        let best = end.midi;
        let bestD = 99;
        for (let i = 0; i < tones.length; i++) {
          const d = Math.abs(tones[i] - end.midi);
          if (d < bestD) { bestD = d; best = tones[i]; }
        }
        end.midi = best;
      }
    }

    function scheduleStep(s, t) {
      const inChord = s % STEPS_PER_CHORD;
      const chord = CHORDS[Math.floor(s / STEPS_PER_CHORD) % CHORDS.length];
      if (inChord === 0) {
        padChord(t, chord, STEPS_PER_CHORD * EIGHTH);
        droneA.frequency.setTargetAtTime(mtof(chord.root), t, 0.6);
        droneB.frequency.setTargetAtTime(mtof(chord.root + 12), t, 0.6);
        planMelody(chord);
        if (mood === 'race' && (Math.floor(s / STEPS_PER_CHORD) % 2 === 1 || intensity > 0.6)) stab(t, chord);
      }
      for (let i = 0; i < melody.length; i++) {
        if (melody[i].at === inChord) leadNote(t, melody[i].midi, melody[i].len * EIGHTH);
      }
      const pulseOn = mood === 'race' || pulseBus.gain.value > 0.02;
      if (pulseOn) {
        if (s % 2 === 0) kick(t, 0.32 + intensity * 0.12);
        const base = chord.root + 12;
        const lvl = 0.07 + intensity * 0.035;
        if (intensity > 0.55) {
          arpNote(t, base + ARP[(s * 2) % ARP.length], EIGHTH / 2, lvl);
          arpNote(t + EIGHTH / 2, base + ARP[(s * 2 + 1) % ARP.length], EIGHTH / 2, lvl * 0.8);
        } else {
          arpNote(t, base + ARP[s % ARP.length], EIGHTH, lvl);
        }
      }
    }

    function schedule(until) {
      if (!running) return;
      if (nextTime < ac.currentTime - 0.2) nextTime = ac.currentTime + 0.06;
      let guard = 0;
      while (nextTime < until && guard++ < 64) {
        scheduleStep(step, nextTime);
        step += 1;
        nextTime += EIGHTH;
      }
    }

    function applyMood(t, tau) {
      pulseBus.gain.setTargetAtTime(mood === 'race' ? 1 : 0, t, tau);
      padBus.gain.setTargetAtTime(mood === 'race' ? 0.85 : 1, t, tau);
      droneAG.gain.setTargetAtTime(mood === 'race' ? 0.12 : 0.16, t, tau);
      duck.gain.setTargetAtTime(ducked ? 0.3 : 1, t, ducked ? 0.25 : 0.6);
    }

    return {
      start: function (t) {
        if (running) return;
        running = true;
        nextTime = (t == null ? ac.currentTime : t) + 0.08;
        volume.gain.setValueAtTime(0.0001, ac.currentTime);
        volume.gain.exponentialRampToValueAtTime(VOLUME, ac.currentTime + 2.5);
      },
      schedule: schedule,
      setMood: function (m, duckIt, immediate) {
        const changed = m !== mood || !!duckIt !== ducked;
        mood = m;
        ducked = !!duckIt;
        if (changed || immediate) applyMood(ac.currentTime, immediate ? 0.01 : 1.1);
      },
      setIntensity: function (x) {
        const v = Math.max(0, Math.min(1, x));
        if (Math.abs(v - intensity) < 0.04) return;
        intensity = v;
        arpLP.frequency.setTargetAtTime(420 + v * 1500, ac.currentTime, 0.4);
      },
      get voices() { return voices; },
    };
  }

  // ---------------------------------------------------------------------------
  // Live context, sound effects and engine hum
  // ---------------------------------------------------------------------------
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let engine = null;
  let engineFilter = null;
  let engineGain = null;
  let started = false;
  let sub = null;
  let subGain = null;
  let noiseBuf = null;
  let music = null;
  let musicTimer = null;
  let muted = false;
  let hiddenPause = false;
  let suspendTimer = null;
  let lastMood = '';

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (err) { ctx = null; return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);

    engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 52;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 280;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engine.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(sfxBus);
    engine.start();

    sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 46;
    subGain = ctx.createGain();
    subGain.gain.value = 0;
    sub.connect(subGain);
    subGain.connect(sfxBus);
    sub.start();

    const n = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;

    try {
      music = createMusic(ctx, master);
    } catch (err) {
      music = null;
    }
    return true;
  }

  function startMusicClock() {
    if (!music || musicTimer) return;
    music.start();
    const pump = function () {
      if (!ctx || ctx.state !== 'running') return;
      try { music.schedule(ctx.currentTime + 0.35); } catch (err) { /* keep the game running */ }
    };
    pump();
    musicTimer = setInterval(pump, 60);
  }

  function safeResume() {
    if (!ctx || muted) return;
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
    }
  }
  function safeSuspend() {
    if (ctx && ctx.state === 'running') {
      try { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
    }
  }

  function applyMute() {
    if (!master || !ctx) return;
    if (suspendTimer) { clearTimeout(suspendTimer); suspendTimer = null; }
    if (muted) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      // Fully idle the audio thread while muted (saves battery); unmute is a tap, so resume is allowed.
      suspendTimer = setTimeout(safeSuspend, 250);
    } else {
      safeResume();
      master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.03);
    }
  }

  function blip(freq, dur, type, gain, slide, when) {
    if (!ctx || muted) return;
    const t = when == null ? ctx.currentTime : when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(amp);
    amp.connect(sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function burst(freq, dur, gain) {
    if (!ctx || muted || !noiseBuf) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = 0.7;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function unlock() {
    if (!ensure()) return;
    hiddenPause = false;
    safeResume();
    if (!started) {
      started = true;
      startMusicClock();
    }
    applyMute();
  }

  function tick(speed, turbo, driveOn) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const norm = Math.max(0, Math.min(1, speed / 980));
    engine.frequency.setTargetAtTime(46 + norm * 84 + (turbo ? 18 : 0), t, 0.05);
    engineFilter.frequency.setTargetAtTime(200 + norm * 1500 + (turbo ? 800 : 0), t, 0.06);
    engineGain.gain.setTargetAtTime(!driveOn || muted ? 0 : 0.03 + norm * 0.05, t, 0.05);
    sub.frequency.setTargetAtTime(40 + norm * 22, t, 0.08);
    subGain.gain.setTargetAtTime(!driveOn || muted ? 0 : 0.028 + norm * 0.02, t, 0.08);
  }

  // phase: title | help | countdown | play | pause | results
  function setScene(phase, intensity) {
    if (!music) return;
    const race = phase === 'play' || phase === 'countdown' || phase === 'pause';
    const ducked = phase === 'pause' || phase === 'results';
    const key = (race ? 'race' : 'title') + (ducked ? '-duck' : '');
    if (key !== lastMood) {
      lastMood = key;
      music.setMood(race ? 'race' : 'title', ducked);
    }
    if (race) music.setIntensity(intensity || 0);
  }

  // Offline preview render (used for sharing a sample, not by the game).
  function renderPreview(mood, seconds, intensity) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const rate = 44100;
    const oac = new OAC(2, Math.floor(rate * seconds), rate);
    const m = createMusic(oac, oac.destination);
    m.setMood(mood, false, true);
    if (mood === 'race') m.setIntensity(intensity == null ? 0.5 : intensity);
    m.start(0);
    m.schedule(seconds);
    return oac.startRendering();
  }

  window.VoltAudio = {
    get muted() { return muted; },
    set muted(value) {
      muted = !!value;
      applyMute();
    },
    unlock: unlock,
    tick: tick,
    scene: setScene,
    renderPreview: renderPreview,
    get musicVoices() { return music ? music.voices : 0; },
    get state() { return ctx ? ctx.state : 'none'; },
    jump: function () {
      blip(240, 0.16, 'sawtooth', 0.045, 80);
      burst(900, 0.14, 0.035);
    },
    land: function (hard) {
      burst(hard ? 160 : 340, hard ? 0.2 : 0.1, hard ? 0.07 : 0.035);
      if (hard) blip(80, 0.14, 'square', 0.04, 46);
    },
    crash: function () {
      burst(120, 0.42, 0.09);
      blip(160, 0.34, 'sawtooth', 0.05, 40);
    },
    overheat: function () {
      blip(540, 0.12, 'square', 0.045, 130);
      blip(120, 0.28, 'square', 0.035, 60);
    },
    cool: function () {
      blip(680, 0.09, 'sine', 0.04, 1040);
    },
    beep: function (go) {
      blip(go ? 880 : 500, go ? 0.16 : 0.08, 'square', 0.045);
    },
    finish: function () {
      if (!ctx) return;
      const t = ctx.currentTime;
      blip(523.25, 0.12, 'square', 0.045, null, t);
      blip(659.25, 0.12, 'square', 0.045, null, t + 0.12);
      blip(783.99, 0.22, 'square', 0.05, null, t + 0.24);
    },
    ui: function () {
      blip(760, 0.045, 'square', 0.03);
    },
    suspend: function () {
      hiddenPause = true;
      safeSuspend();
    },
    resumeCtx: function () {
      hiddenPause = false;
      safeResume();
    },
    get hiddenPaused() { return hiddenPause; },
  };
})();
