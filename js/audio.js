// All sound is synthesised with the Web Audio API, so there are no audio files to ship.
(function (G) {
  const A = (G.Audio = {
    ctx: null,
    master: null,
    muted: false,
    _cry: null,
    _amb: null,

    init() {
      if (!this.ctx) {
        try {
          const C = window.AudioContext || window.webkitAudioContext;
          this.ctx = new C();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.muted ? 0 : 0.9;
          this.master.connect(this.ctx.destination);
        } catch (e) { this.ctx = null; }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.9;
      if (m && 'speechSynthesis' in window) speechSynthesis.cancel();
    },

    tone({ f = 440, f2 = null, dur = 0.3, type = 'sine', vol = 0.15, delay = 0, vib = 0, vibRate = 6, lp = 0 }) {
      if (!this.ctx) return;
      const c = this.ctx, t0 = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      if (f2) o.frequency.linearRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.04, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let node = o;
      if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
      node.connect(g); g.connect(this.master);
      if (vib) {
        const l = c.createOscillator(), lg = c.createGain();
        l.frequency.value = vibRate; lg.gain.value = vib;
        l.connect(lg); lg.connect(o.frequency);
        l.start(t0); l.stop(t0 + dur + 0.05);
      }
      o.start(t0); o.stop(t0 + dur + 0.05);
    },

    noise({ dur = 0.1, vol = 0.1, delay = 0, freq = 3000, q = 1, type = 'bandpass' }) {
      if (!this.ctx) return;
      const c = this.ctx, t0 = c.currentTime + delay;
      const n = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(); s.buffer = buf;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(fl); fl.connect(g); g.connect(this.master);
      s.start(t0);
    },

    // ---- game sounds ----
    tick() { this.noise({ dur: 0.04, vol: 0.05, freq: 2600, q: 2 }); },
    stir() {
      this.tone({ f: 170, f2: 120, dur: 0.9, vol: 0.14, vib: 6, vibRate: 5, lp: 600 });
      this.noise({ dur: 0.5, vol: 0.05, freq: 500, q: 0.7, type: 'lowpass' }); // sheets rustle
    },
    look() { this.tone({ f: 330, f2: 260, dur: 0.25, vol: 0.12, lp: 900 }); },
    fakeout() { this.tone({ f: 130, f2: 100, dur: 0.6, vol: 0.08, lp: 500 }); },
    sting() {
      this.tone({ f: 220, dur: 1.2, type: 'sawtooth', vol: 0.1, lp: 900 });
      this.tone({ f: 233, dur: 1.2, type: 'sawtooth', vol: 0.1, lp: 900 });
      this.tone({ f: 110, f2: 70, dur: 1.4, type: 'triangle', vol: 0.18 });
    },
    sob() {
      this.tone({ f: 560, f2: 380, dur: 0.38, type: 'sawtooth', vol: 0.07, vib: 14, vibRate: 11, lp: 1300 });
      this.tone({ f: 840, f2: 600, dur: 0.3, type: 'sine', vol: 0.03, vib: 12, vibRate: 11, delay: 0.02 });
      this.noise({ dur: 0.18, vol: 0.08, delay: 0.42, freq: 2200, q: 0.8 }); // sniffle
    },
    startCry() {
      this.stopCry();
      this.sob();
      let n = 0;
      this._cry = setInterval(() => {
        this.sob();
        if (++n > 9) this.stopCry();
      }, 780);
    },
    babyFuss() {
      this.tone({ f: 620, f2: 520, dur: 0.45, type: 'triangle', vol: 0.09, vib: 10, vibRate: 9, lp: 1500 });
      this.tone({ f: 700, f2: 560, dur: 0.4, type: 'sine', vol: 0.04, delay: 0.5, vib: 8, vibRate: 9 });
    },
    babyWail() {
      this.tone({ f: 650, f2: 980, dur: 0.35, type: 'sawtooth', vol: 0.08, vib: 16, vibRate: 12, lp: 2200 });
      this.tone({ f: 980, f2: 640, dur: 0.45, type: 'sawtooth', vol: 0.08, delay: 0.35, vib: 16, vibRate: 12, lp: 2200 });
    },
    startBabyCry() {
      this.stopCry();
      this.babyWail();
      let n = 0;
      this._cry = setInterval(() => { this.babyWail(); if (++n > 6) this.stopCry(); }, 900);
    },
    stopCry() { if (this._cry) { clearInterval(this._cry); this._cry = null; } },
    speak(text, pitch = 0.6, queue = false) {
      if (this.muted || !('speechSynthesis' in window)) return;
      try {
        if (!queue) speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.pitch = pitch; u.rate = 1.0; u.volume = 1;
        speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },
    stopSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
    win() {
      const notes = [523, 659, 784, 659, 523, 659, 784, 1047];
      notes.forEach((f, i) => this.tone({ f, dur: 0.9, vol: 0.09, delay: i * 0.38, lp: 2500 }));
    },
    startAmbient() {
      this.stopAmbient();
      this._amb = setInterval(() => {
        const f = 4200 + Math.random() * 300;
        this.tone({ f, dur: 0.05, vol: 0.012 });
        this.tone({ f, dur: 0.05, vol: 0.012, delay: 0.09 });
        this.tone({ f, dur: 0.05, vol: 0.012, delay: 0.18 });
      }, 1500);
    },
    stopAmbient() { if (this._amb) { clearInterval(this._amb); this._amb = null; } },
    silenceAll() { this.stopCry(); this.stopSpeech(); },
  });
})(window.Game = window.Game || {});
