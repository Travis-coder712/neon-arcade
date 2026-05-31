/* Neon Arcade — procedural sound engine + music (WebAudio, zero asset files).
   window.Sound. Call Sound.init() from a user gesture first.
   Signal graph:  [engine + skid + sfx + music] -> musicGain/(direct) -> master -> destination
   master mute = ALL sound off.  musicMuted = music only. */
(function () {
  const S = {
    ctx: null, master: null, muted: false, musicMuted: false,
    _engine: null, _skid: null, _noiseBuf: null,
    _musicGain: null, _musicTimer: null, _mcfg: null, _step: 0, _nextNoteTime: 0,

    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        this._noiseBuf = this._makeNoise();
        this._musicGain = this.ctx.createGain();
        this._musicGain.gain.value = 0;
        this._musicGain.connect(this.master);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05); },

    _makeNoise() {
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      let v = 0; for (let i = 0; i < len; i++) { v = (v + (Math.random() * 2 - 1) * 0.6) * 0.92; d[i] = v; }
      return buf;
    },

    // ================= ENGINE (gear-shift model — no flat top-speed drone) =================
    startEngine() {
      if (!this.ctx || this._engine) return;
      const c = this.ctx;
      const o1 = c.createOscillator(); o1.type = 'sawtooth';
      const o2 = c.createOscillator(); o2.type = 'square';
      const o3 = c.createOscillator(); o3.type = 'sawtooth';
      // vibrato so the tone breathes instead of sitting dead still
      const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 6.5;
      const lfoGain = c.createGain(); lfoGain.gain.value = 8; lfo.connect(lfoGain); lfoGain.connect(o1.detune);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = c.createGain(); g.gain.value = 0;
      o1.connect(lp); o2.connect(lp); o3.connect(lp); lp.connect(g); g.connect(this.master);
      // engine rumble (filtered noise scaling with load)
      const noise = c.createBufferSource(); noise.buffer = this._noiseBuf; noise.loop = true;
      const nlp = c.createBiquadFilter(); nlp.type = 'lowpass'; nlp.frequency.value = 380;
      const ng = c.createGain(); ng.gain.value = 0;
      noise.connect(nlp); nlp.connect(ng); ng.connect(this.master);
      o1.start(); o2.start(); o3.start(); lfo.start(); noise.start();
      this._engine = { o1, o2, o3, lp, g, ng, nlp };
      this.setEngine(0);
    },
    setEngine(speed01) {
      if (!this._engine) return;
      const s = Math.max(0, Math.min(1, speed01)), t = this.ctx.currentTime;
      const GEARS = 5, gear = Math.min(GEARS - 1, Math.floor(s * GEARS)), within = s * GEARS - gear;
      const revs = 0.32 + within * 0.68;          // revs climb then drop on each shift
      const base = 56 + gear * 7, f = base + revs * 150;
      this._engine.o1.frequency.setTargetAtTime(f, t, 0.04);
      this._engine.o2.frequency.setTargetAtTime(f * 0.5, t, 0.04);
      this._engine.o3.frequency.setTargetAtTime(f * 2.01, t, 0.05);
      this._engine.lp.frequency.setTargetAtTime(600 + s * 2800, t, 0.08);
      this._engine.g.gain.setTargetAtTime(0.04 + s * 0.05, t, 0.1);
      this._engine.ng.gain.setTargetAtTime(0.02 + s * 0.055, t, 0.1);
      this._engine.nlp.frequency.setTargetAtTime(240 + s * 520, t, 0.1);
    },
    stopEngine() {
      if (!this._engine) return; const e = this._engine; this._engine = null;
      e.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); e.ng.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.o3.stop(); } catch (_) {} }, 300);
    },

    // ================= TYRE SKID =================
    startSkid() {
      if (!this.ctx || this._skid) return; const c = this.ctx;
      const src = c.createBufferSource(); src.buffer = this._noiseBuf; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.8;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start();
      this._skid = { src, g };
    },
    setSkid(i) { if (this._skid) this._skid.g.gain.setTargetAtTime(0.16 * Math.max(0, Math.min(1, i)), this.ctx.currentTime, 0.05); },
    stopSkid() { if (!this._skid) return; const s = this._skid; this._skid = null; s.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08); setTimeout(() => { try { s.src.stop(); } catch (_) {} }, 250); },

    // ================= ONE-SHOTS =================
    _tone(freq, dur, type, vol, slideTo) {
      if (!this.ctx) return; const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); o.type = type || 'sine'; const g = this.ctx.createGain();
      o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    },
    beep(f) { this._tone(f || 880, 0.12, 'triangle', 0.18); },
    countTone() { this._tone(440, 0.18, 'square', 0.2); },
    goTone() { this._tone(660, 0.1, 'square', 0.22); this._tone(990, 0.25, 'square', 0.22); },
    crash() {
      if (!this.ctx) return; const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 1800;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.5);
      this._tone(120, 0.4, 'sine', 0.4, 40);
    },
    whoosh() {
      if (!this.ctx) return; const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2500, t + 0.18); bp.Q.value = 1.2;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.3);
    },
    lap() { this._tone(784, 0.12, 'triangle', 0.2); setTimeout(() => this._tone(1047, 0.14, 'triangle', 0.2), 90); },
    record() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.22), i * 110)); },

    // ================= MUSIC (procedural sequencer: bass + pad + arp + lead + drums + echo) =================
    // 8-bar progressions; lead only enters in the 2nd half (section B) for build/variation.
    MUSIC: {
      drift: {
        bpm: 126, vol: 0.5,
        prog: [220.00, 164.81, 185.00, 146.83, 220.00, 164.81, 146.83, 164.81], // A E F#m D ...
        scale: [0, 2, 4, 7, 9],            // major pentatonic — bright
        bassType: 'sawtooth', arpType: 'triangle', leadType: 'sawtooth', padType: 'sawtooth',
        bassSteps: [0, 3, 6, 8, 11, 14], kick: [0, 4, 8, 12], snare: [4, 12], clap: [4, 12],
        hat: [2, 6, 10, 14], ohat: [2, 10],
        lead: [12, null, 9, 7, null, 9, 12, null, 14, null, 12, 9, 7, null, 4, null]
      },
      rush: {
        bpm: 102, vol: 0.5,
        prog: [130.81, 103.83, 155.56, 116.54, 130.81, 103.83, 116.54, 155.56], // Cm Ab Eb Bb ...
        scale: [0, 3, 5, 7, 10],           // minor pentatonic — moody
        bassType: 'sawtooth', arpType: 'square', leadType: 'square', padType: 'sawtooth',
        bassSteps: [0, 6, 8, 14], kick: [0, 8], snare: [8], clap: [8],
        hat: [2, 4, 6, 10, 12, 14], ohat: [6, 14],
        lead: [0, null, null, 3, null, 5, null, null, 7, null, 5, 3, null, null, 0, null]
      }
    },
    _ensureFx() {
      if (this._delay) return;
      const c = this.ctx;
      this._delay = c.createDelay(0.6); this._delay.delayTime.value = 0.26;
      this._fb = c.createGain(); this._fb.gain.value = 0.34;
      this._delayWet = c.createGain(); this._delayWet.gain.value = 0.5;
      this._delay.connect(this._fb); this._fb.connect(this._delay);
      this._delay.connect(this._delayWet); this._delayWet.connect(this._musicGain);
    },
    startMusic(cfg) {
      if (!this.ctx || !cfg) return;
      this.stopMusic(true); this._ensureFx();
      this._mcfg = cfg; this._step = 0; this._nextNoteTime = this.ctx.currentTime + 0.12;
      this._musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this._musicGain.gain.setTargetAtTime(this.musicMuted ? 0 : cfg.vol, this.ctx.currentTime, 0.6);
      this._musicTimer = setInterval(() => this._schedule(), 25);
    },
    stopMusic(silent) {
      if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
      if (this._musicGain && !silent) this._musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    },
    setMusicMuted(m) { this.musicMuted = m; if (this._musicGain) this._musicGain.gain.setTargetAtTime(m ? 0 : (this._mcfg ? this._mcfg.vol : 0.42), this.ctx.currentTime, 0.2); },
    isPlayingMusic() { return !!this._musicTimer; },
    _schedule() {
      const cfg = this._mcfg, stepDur = 60 / cfg.bpm / 4;
      while (this._nextNoteTime < this.ctx.currentTime + 0.2) { this._playStep(this._step, this._nextNoteTime, cfg, stepDur); this._nextNoteTime += stepDur; this._step++; }
    },
    _deg(root, scale, i) { const o = Math.floor(i / scale.length), d = ((i % scale.length) + scale.length) % scale.length; return root * Math.pow(2, (scale[d] + 12 * o) / 12); },
    _playStep(step, t, cfg, stepDur) {
      const bar = Math.floor(step / 16) % cfg.prog.length, s = step % 16, root = cfg.prog[bar], dest = this._musicGain;
      const sectionB = (Math.floor(step / 16) % 8) >= 4;   // lead enters in 2nd half
      // bass
      if (cfg.bassSteps.includes(s)) this._mvoice(cfg.bassType, root / 2, t, stepDur * 1.5, 0.34, 'lowpass', 520, dest, false);
      // sustained pad chord at the top of each bar (root + 3rd + 5th of the scale)
      if (s === 0) { [0, 2, 4].forEach(d => this._mvoice(cfg.padType, this._deg(root, cfg.scale, d), t, stepDur * 15, 0.05, 'lowpass', 1400, dest, false)); }
      // arpeggio (8th notes), with echo
      if (s % 2 === 0) { const f = this._deg(root, cfg.scale, ((step / 2) | 0) % 5); this._mvoice(cfg.arpType, f, t, stepDur * 1.0, 0.07, 'bandpass', 1700, dest, true); }
      // lead melody (section B only)
      if (sectionB && cfg.lead[s] != null) { const f = this._deg(root, cfg.scale, cfg.lead[s]) * 2; this._mvoice(cfg.leadType, f, t, stepDur * 1.6, 0.10, 'lowpass', 2600, dest, true); }
      // drums
      if (cfg.kick.includes(s)) this._kick(t, dest);
      if (cfg.snare.includes(s)) this._snare(t, dest);
      if (cfg.clap && cfg.clap.includes(s)) this._clap(t, dest);
      if (cfg.hat.includes(s)) this._hat(t, dest, false);
      if (cfg.ohat && cfg.ohat.includes(s)) this._hat(t, dest, true);
    },
    _mvoice(type, freq, t, dur, vol, ftype, ffreq, dest, echo) {
      const c = this.ctx, o = c.createOscillator(); o.type = type; o.frequency.value = freq;
      const f = c.createBiquadFilter(); f.type = ftype; f.frequency.value = ffreq;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(dest); if (echo && this._delay) g.connect(this._delay);
      o.start(t); o.stop(t + dur + 0.03);
    },
    _kick(t, dest) { const c = this.ctx, o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); const g = c.createGain(); g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.2); },
    _hat(t, dest, open) { const c = this.ctx, sN = c.createBufferSource(); sN.buffer = this._noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500; const g = c.createGain(); const dur = open ? 0.14 : 0.045; g.gain.setValueAtTime(open ? 0.09 : 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); sN.connect(f); f.connect(g); g.connect(dest); sN.start(t); sN.stop(t + dur + 0.02); },
    _snare(t, dest) { const c = this.ctx, sN = c.createBufferSource(); sN.buffer = this._noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = c.createGain(); g.gain.setValueAtTime(0.26, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); sN.connect(f); f.connect(g); g.connect(dest); sN.start(t); sN.stop(t + 0.2); },
    _clap(t, dest) { const c = this.ctx; for (let i = 0; i < 3; i++) { const sN = c.createBufferSource(); sN.buffer = this._noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; const g = c.createGain(); const tt = t + i * 0.012; g.gain.setValueAtTime(0.14, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.07); sN.connect(f); f.connect(g); g.connect(dest); sN.start(tt); sN.stop(tt + 0.09); } }
  };

  window.Sound = S;
})();
