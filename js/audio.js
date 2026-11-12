/* VOLT ALLEY procedural audio. Oscillators and noise only — no samples. */
(function () {
  'use strict';

  const NOTES = [146.83, 0, 220, 0, 174.61, 98, 0, 130.81];
  const HATS = [1, 0, 1, 0, 1, 0, 1, 1];

  let ctx = null;
  let master = null;
  let engine = null;
  let engineFilter = null;
  let engineGain = null;
  let rainGain = null;
  let musicGain = null;
  let sub = null;
  let subGain = null;
  let noiseBuf = null;
  let muted = false;
  let started = false;
  let step = 0;
  let nextAt = 0;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (err) { ctx = null; return false; }
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);

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
    engineGain.connect(master);
    engine.start();

    sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 46;
    subGain = ctx.createGain();
    subGain.gain.value = 0;
    sub.connect(subGain);
    subGain.connect(master);
    sub.start();

    const seconds = 1.2;
    const n = Math.floor(ctx.sampleRate * seconds);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;

    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuf;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1000;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.9;
    musicGain.connect(master);
    return true;
  }

  function applyMute() {
    if (!master || !ctx) return;
    master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.03);
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
    amp.connect(master);
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
    amp.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') {
      try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
    }
    if (!started) {
      started = true;
      nextAt = ctx.currentTime + 0.08;
    }
    applyMute();
  }

  function tick(speed, turbo, driveOn, raining) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const norm = Math.max(0, Math.min(1, speed / 980));
    engine.frequency.setTargetAtTime(46 + norm * 84 + (turbo ? 18 : 0), t, 0.05);
    engineFilter.frequency.setTargetAtTime(200 + norm * 1500 + (turbo ? 800 : 0), t, 0.06);
    engineGain.gain.setTargetAtTime(!driveOn || muted ? 0 : 0.03 + norm * 0.05, t, 0.05);
    sub.frequency.setTargetAtTime(40 + norm * 22, t, 0.08);
    subGain.gain.setTargetAtTime(!driveOn || muted ? 0 : 0.028 + norm * 0.02, t, 0.08);
    rainGain.gain.setTargetAtTime(!raining || muted ? 0 : 0.016, t, 0.25);
    if (!started || muted) return;
    if (nextAt < t - 0.25) nextAt = t;
    let guard = 0;
    while (nextAt < t + 0.12 && guard++ < 4) {
      const freq = NOTES[step % NOTES.length];
      if (freq > 0) {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, nextAt);
        amp.gain.setValueAtTime(0.0001, nextAt);
        amp.gain.exponentialRampToValueAtTime(0.045, nextAt + 0.02);
        amp.gain.exponentialRampToValueAtTime(0.0008, nextAt + 0.26);
        osc.connect(amp);
        amp.connect(musicGain);
        osc.start(nextAt);
        osc.stop(nextAt + 0.28);
      }
      if (HATS[step % HATS.length]) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 4800;
        const amp = ctx.createGain();
        amp.gain.setValueAtTime(0.028, nextAt);
        amp.gain.exponentialRampToValueAtTime(0.0008, nextAt + 0.04);
        src.connect(filter);
        filter.connect(amp);
        amp.connect(musicGain);
        src.start(nextAt);
        src.stop(nextAt + 0.05);
      }
      nextAt += 0.36;
      step += 1;
    }
  }

  window.VoltAudio = {
    get muted() { return muted; },
    set muted(value) {
      muted = !!value;
      applyMute();
    },
    unlock: unlock,
    tick: tick,
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
      if (ctx && ctx.state === 'running') {
        try { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
      }
    },
    resumeCtx: function () {
      if (ctx && ctx.state === 'suspended') {
        try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ }
      }
    },
  };
})();
