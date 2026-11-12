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

    tone({ f = 440, f2 = null, dur = 0.3, type = 'sine', vol = 0.15, delay = 0, vib = 0, vibRate = 6, lp = 0, formants = null }) {
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
      if (formants) { // vocal-tract style resonances -> sounds like a voice, not a beep
        const mix = c.createGain();
        for (const ff of formants) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = 5; o.connect(b); b.connect(mix); }
        node = mix;
      } else if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
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
      // one long "waaaah": pitch rises then sags, wobbling voice, then a ragged breath in
      const F = [900, 2700];
      this.tone({ f: 420, f2: 760, dur: 0.45, type: 'sawtooth', vol: 0.9, vib: 28, vibRate: 7, formants: F });
      this.tone({ f: 760, f2: 520, dur: 0.75, type: 'sawtooth', vol: 0.9, delay: 0.45, vib: 40, vibRate: 8, formants: F });
      this.noise({ dur: 0.35, vol: 0.12, delay: 1.25, freq: 1800, q: 1.2 });
      this.tone({ f: 380, f2: 560, dur: 0.3, type: 'sawtooth', vol: 0.5, delay: 1.25, vib: 30, vibRate: 12, formants: F });
    },
    startBabyCry() {
      this.stopCry();
      this.babyWail();
      let n = 0;
      this._cry = setInterval(() => { this.babyWail(); if (++n > 14) this.stopCry(); }, 1650);
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
    _voice(role) {
      const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
      const en = vs.filter(v => /^en/i.test(v.lang));
      const want = role === 'mum'
        ? /(natural.*(aria|jenny|sonia|neerja)|aria|jenny|sonia|neerja|samantha|zira|susan|karen|female|google (us|uk) english)/i
        : /(natural.*(guy|ryan|davis|prabhat)|guy|ryan|davis|prabhat|daniel|david|alex|mark|male)/i;
      const bad = role === 'mum' ? /male(?!.*female)|david|daniel|guy|ryan|mark|alex/i : /female|zira|samantha|aria|jenny|susan|karen|sonia/i;
      const nat = en.filter(v => /natural|online/i.test(v.name) && want.test(v.name) && !bad.test(v.name));
      return nat[0] || en.find(v => want.test(v.name) && !bad.test(v.name)) || en.find(v => !bad.test(v.name)) || en[0] || null;
    },
    // role: 'dad' | 'mum'. Plays audio/<role>_ohshit.mp3 if you add one, else speaks it with feeling.
    ohShit(role) {
      if (this.muted) return;
      const speakIt = () => {
        if (!('speechSynthesis' in window)) return;
        try {
          const v = this._voice(role), dad = role !== 'mum';
          const say = (text, o) => { const u = new SpeechSynthesisUtterance(text); if (v) u.voice = v; Object.assign(u, o); speechSynthesis.speak(u); };
          if (role === 'dad') speechSynthesis.cancel();
          this.noise({ dur: 0.25, vol: 0.14, freq: 1400, q: 0.7 }); // sharp gasp
          say('Ohhh!', { pitch: dad ? 0.7 : 1.5, rate: 0.7, volume: 1 });
          say('Shit!', { pitch: dad ? 0.55 : 1.8, rate: 1.35, volume: 1 });
        } catch (e) { /* ignore */ }
      };
      this._noClip = this._noClip || {};
      if (this._noClip[role]) return speakIt();
      const miss = () => { this._noClip[role] = true; speakIt(); };
      try {
        const a = new Audio(`audio/${role}_ohshit.mp3`);
        a.onerror = miss;
        a.play().catch(miss);
      } catch (e) { miss(); }
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
