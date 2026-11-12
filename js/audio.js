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
    // One cry "note": a voice source (two slightly detuned sawtooth waves, like vocal folds) whose pitch
    // rises sharply then sags, with a wobble and random jitter, shaped by vowel-like resonances ("waaah").
    cryNote({ dur = 1.0, f0 = 440, peak = 1.7, delay = 0, level = 1 } = {}) {
      if (!this.ctx) return;
      const c = this.ctx, t0 = c.currentTime + delay + 0.02;
      const N = 64, arr = new Float32Array(N), pk = f0 * peak;
      for (let i = 0; i < N; i++) {
        const k = i / (N - 1);
        const base = k < 0.22 ? f0 + (pk - f0) * Math.sin((k / 0.22) * Math.PI / 2)
                              : pk - (pk - f0 * 1.1) * Math.pow((k - 0.22) / 0.78, 0.8);
        const wobble = Math.sin(k * dur * 2 * Math.PI * 6.5) * pk * 0.035 * Math.min(1, k * 4);
        arr[i] = base + wobble + (Math.random() - 0.5) * pk * 0.02;
      }
      const o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = o2.type = 'sawtooth';
      o1.frequency.setValueCurveAtTime(arr, t0, dur);
      o2.frequency.setValueCurveAtTime(arr.map(v => v * 1.011), t0, dur);
      const src = c.createGain(); src.gain.value = 0.5;
      o1.connect(src); o2.connect(src);

      // vowel resonances; the mouth opens (formants rise) as the cry peaks
      const mix = c.createGain();
      [[800, 1150, 7, 1.0], [2300, 2800, 9, 0.55], [3700, 3900, 10, 0.28]].forEach(([fa, fb, q, gn]) => {
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
        f.frequency.setValueAtTime(fa, t0); f.frequency.linearRampToValueAtTime(fb, t0 + dur * 0.3); f.frequency.linearRampToValueAtTime(fa * 1.05, t0 + dur);
        const g = c.createGain(); g.gain.value = gn;
        src.connect(f); f.connect(g); g.connect(mix);
      });
      // breathy noise through the same throat
      const nb = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const ns = c.createBufferSource(); ns.buffer = nb;
      const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2400; nf.Q.value = 0.8;
      const ng = c.createGain(); ng.gain.value = 0.12;
      ns.connect(nf); nf.connect(ng); ng.connect(mix);

      // loudness: sharp attack, trembling sustain, quick release
      const amp = c.createGain();
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.linearRampToValueAtTime(1.0 * level, t0 + 0.05);
      amp.gain.setValueAtTime(0.85 * level, t0 + dur * 0.55);
      amp.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      const trem = c.createOscillator(), tg = c.createGain();
      trem.frequency.value = 7; tg.gain.value = 0.12;
      trem.connect(tg); tg.connect(amp.gain);
      const comp = c.createDynamicsCompressor();
      const out = c.createGain(); out.gain.value = 2.6;
      mix.connect(amp); amp.connect(out); out.connect(comp); comp.connect(this._bus());
      [o1, o2, ns, trem].forEach(n => { n.start(t0); n.stop(t0 + dur + 0.05); });
    },
    _bus() { // all cry sounds go through one node so stopCry() can cut them off instantly
      if (!this._busNode) { this._busNode = this.ctx.createGain(); this._busNode.connect(this.master); }
      return this._busNode;
    },
    // the shaky breath in between wails, with a little squeak
    cryInhale(delay = 0) {
      this.noise({ dur: 0.38, vol: 0.16, delay, freq: 1700, q: 1.1 });
      this.tone({ f: 620, f2: 1050, dur: 0.3, type: 'sine', vol: 0.05, delay: delay + 0.04, vib: 30, vibRate: 13 });
    },
    babyWail() { // kept for compatibility: one wail + breath
      this.cryNote({ dur: 1.1, f0: 450 });
      this.cryInhale(1.2);
    },
    startBabyCry() {
      this.stopCry();
      if (!this.ctx) return;
      let phrase = 0;
      const next = () => {
        if (this._cry === null) return;
        let wait;
        const f0 = 420 + Math.random() * 70;
        if (phrase % 3 === 2) { // sobbing hiccups: ah-ah-ah
          for (let i = 0; i < 3; i++) this.cryNote({ dur: 0.26, f0: f0 * 1.1, peak: 1.45, delay: i * 0.33, level: 0.9 });
          this.cryInhale(1.05);
          wait = 1.65;
        } else {
          const dur = 0.95 + Math.random() * 0.5;
          this.cryNote({ dur, f0, peak: 1.5 + Math.random() * 0.35 });
          this.cryInhale(dur + 0.08);
          wait = dur + 0.62;
        }
        phrase++;
        if (phrase > 18) return this.stopCry();
        this._cry = setTimeout(next, wait * 1000);
      };
      this._cry = 0;
      this._cry = setTimeout(next, 0);
    },
    stopCry() { if (this._cry !== null && this._cry !== undefined) { clearTimeout(this._cry); clearInterval(this._cry); } this._cry = null; if (this._busNode) { try { this._busNode.disconnect(); } catch (e) {} this._busNode = null; } },
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
