/* Neon Arcade — procedural sound engine (WebAudio, zero asset files).
   Exposes window.Sound. Call Sound.init() from a user gesture first. */
(function () {
  const S = {
    ctx: null,
    master: null,
    muted: false,
    _engine: null,
    _skid: null,
    _noiseBuf: null,

    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this._noiseBuf = this._makeNoise();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.9;
    },

    _makeNoise() {
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      let v = 0;
      for (let i = 0; i < len; i++) { v = (v + (Math.random() * 2 - 1) * 0.6) * 0.92; d[i] = v; }
      return buf;
    },

    // ---- continuous engine (freq scales with speed 0..1) ----
    startEngine() {
      if (!this.ctx || this._engine) return;
      const o1 = this.ctx.createOscillator(); o1.type = 'sawtooth';
      const o2 = this.ctx.createOscillator(); o2.type = 'square'; o2.detune.value = -12;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = this.ctx.createGain(); g.gain.value = 0.0;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.master);
      o1.start(); o2.start();
      this._engine = { o1, o2, g, lp };
      this.setEngine(0);
    },
    setEngine(speed01) {
      if (!this._engine) return;
      const f = 55 + speed01 * 210;
      const t = this.ctx.currentTime;
      this._engine.o1.frequency.setTargetAtTime(f, t, 0.05);
      this._engine.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
      this._engine.lp.frequency.setTargetAtTime(700 + speed01 * 2600, t, 0.08);
      this._engine.g.gain.setTargetAtTime(0.05 + speed01 * 0.06, t, 0.1);
    },
    stopEngine() {
      if (!this._engine) return;
      const e = this._engine; this._engine = null;
      e.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => { try { e.o1.stop(); e.o2.stop(); } catch (_) {} }, 300);
    },

    // ---- tyre skid (looping filtered noise; intensity 0..1) ----
    startSkid() {
      if (!this.ctx || this._skid) return;
      const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf; src.loop = true;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.8;
      const g = this.ctx.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start();
      this._skid = { src, g, bp };
    },
    setSkid(intensity) {
      if (!this._skid) return;
      this._skid.g.gain.setTargetAtTime(0.16 * Math.max(0, Math.min(1, intensity)), this.ctx.currentTime, 0.05);
    },
    stopSkid() {
      if (!this._skid) return;
      const s = this._skid; this._skid = null;
      s.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      setTimeout(() => { try { s.src.stop(); } catch (_) {} }, 250);
    },

    // ---- one-shots ----
    _tone(freq, dur, type, vol, slideTo) {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator(); o.type = type || 'sine';
      const g = this.ctx.createGain();
      const t = this.ctx.currentTime;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    },

    beep(freq) { this._tone(freq || 880, 0.12, 'triangle', 0.18); },
    countTone() { this._tone(440, 0.18, 'square', 0.2); },
    goTone() { this._tone(660, 0.1, 'square', 0.22); this._tone(990, 0.25, 'square', 0.22); },

    crash() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // noise burst
      const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 1800;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.5);
      // low thud
      this._tone(120, 0.4, 'sine', 0.4, 40);
    },

    whoosh() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(500, t);
      bp.frequency.exponentialRampToValueAtTime(2500, t + 0.18); bp.Q.value = 1.2;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.3);
    },

    lap() { this._tone(784, 0.12, 'triangle', 0.2); setTimeout(() => this._tone(1047, 0.14, 'triangle', 0.2), 90); },

    record() {
      // triumphant arpeggio
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.22), i * 110));
    }
  };

  window.Sound = S;
})();
