// Scenario 2: Bedroom, 11:30 PM. Dharma and his wife whisper in bed while their 1-year-old sleeps between them.
// Hold = they whisper (fills the bar). Release = they pretend to sleep. If the baby opens her eyes while they talk, she wails.
(function (G) {
  const W = 960, H = 540;
  const WIFE_X = 270, BABY_X = 480, HUS_X = 690, HEAD_Y = 272, BABY_Y = 306;
  const { rr, head, zzz, bubble, hud } = G.draw;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  const LEVELS = [
    { name: 'A quick whisper',     rate: 0.100, decay: 0.05, gap: [2.6, 4.6], stir: 1.3, look: 1.1, fake: 0 },
    { name: 'The long story',      rate: 0.085, decay: 0.07, gap: [1.9, 3.6], stir: 1.0, look: 1.0, fake: 0.25 },
    { name: 'One more thing…',     rate: 0.075, decay: 0.09, gap: [1.3, 2.9], stir: 0.8, look: 0.9, fake: 0.35 },
  ];

  const S = {
    id: 'nursery',
    title: 'Silent Baby',
    time: '11:30 PM',
    intro: 'Dharma and his wife are in bed with their baby girl asleep between them.\nThey really need to finish their talk…',
    blurb: 'Whisper with your wife without waking the baby.',
    levels: LEVELS,
    result: null, endT: 0, progress: 0, hintT: 0,
    loseDelay: 9.5,
    loseTitle: 'Waaah! 👶💔',
    loseText: 'The baby woke up and saw you chatting.\nNow it is a long night…',
    winTitle: 'Shhh… all asleep ❤',
    winText: 'You finished talking and the baby slept on.\nAll three of you drift off peacefully.',
    endWinTitle: 'Best parents ever 🏆',
    endWinText: 'You finished every level and the baby never woke up.',
    controls: 'Hold the LEFT MOUSE BUTTON (or SPACE) to whisper.\nWhen the baby stirs, RELEASE and pretend to sleep!',
  };

  let L, st, particles;

  S.reset = function (i) {
    L = LEVELS[i];
    S.level = i; S.result = null; S.endT = 0; S.progress = 0; S.hintT = S.hintT || 0;
    particles = [];
    st = {
      t: 0, talk: 0, talkT: 0, mode: 'sleep', timer: rand(1.5, 2.5), willLook: true,
      eyes: 0, wriggle: 0, wailStarted: false, hug: 0, heartT: 0, tearT: 0,
    };
    G.Audio.silenceAll();
  };

  S.update = function (dt, holding) {
    st.t += dt;
    if (S.result) return endUpdate(dt);

    st.talk += ((holding ? 1 : 0) - st.talk) * Math.min(1, dt * 10);
    if (holding) {
      S.hintT += dt;
      st.talkT += dt;
      S.progress = Math.min(1, S.progress + L.rate * dt);
    } else {
      S.progress = Math.max(0, S.progress - L.decay * dt);
    }

    st.timer -= dt;
    if (st.mode === 'sleep' && st.timer <= 0) {
      st.mode = 'stir'; st.timer = L.stir;
      st.willLook = Math.random() >= L.fake;
      st.willLook ? G.Audio.babyFuss() : G.Audio.fakeout();
    } else if (st.mode === 'stir' && st.timer <= 0) {
      if (st.willLook) { st.mode = 'look'; st.timer = L.look; G.Audio.look(); }
      else { st.mode = 'sleep'; st.timer = rand(L.gap[0], L.gap[1]); }
    } else if (st.mode === 'look') {
      if (st.talk > 0.35) return lose();
      if (st.timer <= 0) { st.mode = 'sleep'; st.timer = rand(L.gap[0], L.gap[1]); }
    }

    const eyeT = st.mode === 'look' ? 1 : st.mode === 'stir' ? (st.willLook ? 0.25 + 0.2 * Math.sin(st.t * 14) : 0.1) : 0;
    st.eyes += (eyeT - st.eyes) * Math.min(1, dt * 12);
    st.wriggle += ((st.mode === 'stir' ? 1 : 0) - st.wriggle) * Math.min(1, dt * 8);

    if (S.progress >= 1) win();
  };

  function lose() {
    S.result = 'lost'; S.endT = 0; st.mode = 'look';
    G.Audio.stopAmbient();
    G.Audio.sting();
  }

  function win() {
    S.result = 'won'; S.endT = 0;
    G.Audio.stopAmbient();
    G.Audio.win();
  }

  function endUpdate(dt) {
    S.endT += dt;
    const e = S.endT;
    st.talk += (0 - st.talk) * Math.min(1, dt * 6);
    if (S.result === 'lost') {
      st.eyes = 1;
      if (e > 0.9 && !st.wailStarted) { st.wailStarted = true; G.Audio.startBabyCry(); }
      if (e > 0.9) {
        st.tearT -= dt;
        if (st.tearT <= 0) {
          st.tearT = 0.07;
          for (const dx of [-14, 14]) particles.push({ x: BABY_X + dx, y: BABY_Y - 16, vx: dx * 3 + rand(-15, 15), vy: rand(-70, -20), life: 1.1, type: 'tear' });
        }
      }
    } else {
      st.eyes += (0 - st.eyes) * Math.min(1, dt * 8);
      st.hug = clamp((e - 0.8) / 1.4, 0, 1);
      if (st.hug > 0.6) {
        st.heartT -= dt;
        if (st.heartT <= 0) { st.heartT = 0.45; particles.push({ x: BABY_X + rand(-60, 60), y: HEAD_Y - 60, vx: rand(-10, 10), vy: rand(-40, -25), life: 2.2, type: 'heart' }); }
      }
    }
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.type === 'tear') p.vy += 260 * dt; }
    particles = particles.filter(p => p.life > 0);
  }

  function whisperBubble(c, x, y, text, alpha) {
    c.globalAlpha = alpha;
    c.font = 'italic bold 18px system-ui';
    const w = c.measureText(text).width + 28;
    c.fillStyle = 'rgba(245,247,255,.95)'; rr(c, x - w / 2, y - 20, w, 38, 14); c.fill();
    c.beginPath(); c.moveTo(x - 6, y + 17); c.lineTo(x, y + 30); c.lineTo(x + 8, y + 17); c.fill();
    c.fillStyle = '#3a3f6e'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, x, y); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.globalAlpha = 1;
  }

  S.draw = function (c, time) {
    const t = st.t, lost = S.result === 'lost', won = S.result === 'won', e = S.endT;
    const talkK = st.talk, hugK = st.hug;
    let g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1230'); g.addColorStop(1, '#1b2050');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#171227'; c.fillRect(0, 462, W, H - 462);
    c.fillStyle = '#0f0b1c'; c.fillRect(0, 462, W, 5);

    // window + moon
    c.fillStyle = '#070a1f'; rr(c, 40, 60, 150, 190, 6); c.fill();
    g = c.createLinearGradient(0, 60, 0, 250); g.addColorStop(0, '#13214f'); g.addColorStop(1, '#2a3a78');
    c.fillStyle = g; rr(c, 47, 67, 136, 176, 4); c.fill();
    c.fillStyle = '#f3efd0'; c.beginPath(); c.arc(130, 115, 24, 0, 7); c.fill();
    c.fillStyle = '#13214f'; c.beginPath(); c.arc(139, 108, 21, 0, 7); c.fill();
    c.strokeStyle = '#070a1f'; c.lineWidth = 5; c.beginPath(); c.moveTo(115, 67); c.lineTo(115, 243); c.moveTo(47, 155); c.lineTo(183, 155); c.stroke();

    // clock 11:30
    c.fillStyle = '#e9e6dc'; c.beginPath(); c.arc(480, 78, 40, 0, 7); c.fill();
    c.strokeStyle = '#2b2233'; c.lineWidth = 5; c.stroke();
    c.lineCap = 'round'; c.lineWidth = 4; c.beginPath(); c.moveTo(480, 78); c.lineTo(480 + Math.sin(-Math.PI / 12) * 20, 78 - Math.cos(-Math.PI / 12) * 20); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(480, 78); c.lineTo(480, 110); c.stroke();

    // star mobile above the baby
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const sx = 820 + i * 46, sy = 130 + (i % 2) * 28 + Math.sin(t * 1.6 + i) * 4;
      c.beginPath(); c.moveTo(sx, 60); c.lineTo(sx, sy); c.stroke();
      c.fillStyle = '#ffe17a'; c.font = '26px system-ui'; c.fillText('★', sx - 12, sy + 20);
    }

    // headboard + frame (wide family bed)
    c.fillStyle = '#4a2c1c'; rr(c, 120, 150, 720, 200, 26); c.fill();
    c.fillStyle = '#5a3824'; rr(c, 135, 165, 690, 170, 20); c.fill();
    c.fillStyle = '#3d2417'; rr(c, 80, 450, 800, 52, 8); c.fill();

    // pillows
    c.fillStyle = '#d9ddf2';
    c.beginPath(); c.ellipse(WIFE_X, 318, 110, 52, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(HUS_X, 318, 110, 52, 0, 0, 7); c.fill();
    c.fillStyle = '#f6dce9'; c.beginPath(); c.ellipse(BABY_X, 336, 62, 30, 0, 0, 7); c.fill();

    // ---- parents
    const talking = talkK > 0.25 && !S.result;
    const wifeSpeaks = Math.floor(st.talkT / 1.1) % 2 === 0; // they take turns; only the mouth moves
    const wf = { skin: '#f1c6a4', hair: '#5c3329', long: true, eyes: 0, mouth: 'flat', t: st.t };
    const hf = { skin: '#dfae86', hair: '#1c1a1f', eyes: 0, mouth: 'flat', t: st.t };
    if (lost) {
      if (e < 2.3) for (const f of [wf, hf]) Object.assign(f, { eyes: 1.2, mouth: 'o', brow: 6 });
      else { // confused: eyes dart around, one brow up, wobbly mouth
        const glance = Math.sin(e * 2.6);
        Object.assign(wf, { eyes: 1, lx: 4 * glance, ly: -1, mouth: 'wavy', raiseL: 6, raiseR: 0, turn: 0.3 });
        Object.assign(hf, { eyes: 1, lx: -4 * glance, ly: -1, mouth: 'wavy', raiseL: 0, raiseR: 6, turn: -0.3 });
      }
    } else if (won) {
      const wk = clamp(e / 1.5, 0, 1);
      for (const f of [wf, hf]) Object.assign(f, { eyes: 1 - wk, mouth: wk > 0.6 ? 'smile' : 'flat', blush: hugK > 0.3 });
    } else if (talking) {
      Object.assign(wf, { eyes: 1, lx: 5, ly: 1, mouth: wifeSpeaks ? 'talk' : 'flat', turn: 0.6, ph: 0 });
      Object.assign(hf, { eyes: 1, lx: -5, ly: 1, mouth: wifeSpeaks ? 'flat' : 'talk', turn: -0.6, ph: 1.3 });
    } else if (st.talk > 0.08) { wf.eyes = 0.5; hf.eyes = 0.5; }
    head(c, WIFE_X, HEAD_Y, wf);
    head(c, HUS_X, HEAD_Y, hf);
    if (lost) {
      c.fillStyle = '#8fd0ff';
      for (let i = 0; i < 3; i++) {
        const yy = HEAD_Y - 50 + ((t * 70 + i * 30) % 90);
        c.beginPath(); c.ellipse(WIFE_X - 54 - i * 8, yy, 4, 7, 0, 0, 7); c.fill();
        c.beginPath(); c.ellipse(HUS_X + 54 + i * 8, yy, 4, 7, 0, 0, 7); c.fill();
      }
    }

    // ---- baby (small head, big eyes)
    const shake = lost && e > 0.9 ? Math.sin(e * 34) * 2.5 : 0;
    const wig = Math.sin(t * 16) * 2.5 * st.wriggle;
    c.save();
    const up = lost ? clamp((e - 0.5) / 0.8, 0, 1) : 0; // baby sits up when she wakes
    c.translate(BABY_X + shake + wig, BABY_Y - 22 * up); c.scale(0.68 + 0.14 * up, 0.68 + 0.14 * up);
    const bf = { skin: '#f7d3b4', hair: '#3a2420', eyes: st.eyes, lx: Math.sin(t * 3) * 2, ly: 1, mouth: 'flat', blush: true, t };
    if (lost) { bf.eyes = e > 0.3 ? 1 : st.eyes; bf.mouth = e > 0.9 ? 'wail' : 'o'; bf.brow = -7; }
    else if (won) { bf.eyes = 0; bf.mouth = hugK > 0.4 ? 'smile' : 'flat'; }
    else if (st.mode === 'stir') bf.mouth = 'frown';
    head(c, 0, 0, bf);
    c.restore();

    // blankets
    c.fillStyle = '#3d5aa8'; rr(c, 80, 346, 800, 130, 30); c.fill();
    c.fillStyle = '#4b6bc0'; c.beginPath(); c.ellipse(WIFE_X, 350, 105, 30, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(HUS_X, 350, 105, 30, 0, 0, 7); c.fill();
    c.fillStyle = '#e8ecff'; rr(c, 80, 346, 800, 26, 13); c.fill();
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(80, 372, 800, 4);
    // baby's pink swaddle (rises/falls with breathing)
    const br = Math.sin(t * 2.2) * 2 + (lost ? Math.sin(e * 34) * 3 : 0);
    c.fillStyle = '#f08fb4'; c.beginPath(); c.ellipse(BABY_X, 372 + br, 84, 40, 0, Math.PI, 2 * Math.PI); c.rect(BABY_X - 84, 372 + br, 168, 100); c.fill();
    c.fillStyle = '#f7a9c7'; c.beginPath(); c.ellipse(BABY_X, 372 + br, 84, 14, 0, 0, 7); c.fill();

    // parents' arms reaching over the baby
    if (hugK > 0) {
      c.lineCap = 'round'; c.strokeStyle = '#9a6ab5'; c.lineWidth = 28;
      const ex = lerp(WIFE_X + 70, BABY_X - 24, hugK);
      c.beginPath(); c.moveTo(WIFE_X + 60, 380); c.quadraticCurveTo((WIFE_X + ex) / 2, 358, ex, 372); c.stroke();
      c.fillStyle = '#f1c6a4'; c.beginPath(); c.arc(ex + 6, 374, 14, 0, 7); c.fill();
      c.strokeStyle = '#8a6fb0';
      const ex2 = lerp(HUS_X - 70, BABY_X + 24, hugK);
      c.beginPath(); c.moveTo(HUS_X - 60, 380); c.quadraticCurveTo((HUS_X + ex2) / 2, 358, ex2, 372); c.stroke();
      c.fillStyle = '#dfae86'; c.beginPath(); c.arc(ex2 - 6, 374, 14, 0, 7); c.fill();
    }

    // night shade + vignette
    c.fillStyle = 'rgba(4,6,22,.28)'; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 620);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // ---- bubbles, z's, particles
    if (!S.result && st.mode === 'sleep') zzz(c, BABY_X, BABY_Y - 40, t);
    if (st.mode === 'stir' && !S.result) { c.fillStyle = 'rgba(255,200,230,.95)'; c.font = 'italic bold 24px system-ui'; c.fillText(st.willLook ? 'uhh…' : 'mm…', BABY_X - 24 + Math.sin(t * 9) * 3, BABY_Y - 62); }
    if (lost && e > 0.25 && e < 2.4) bubble(c, HUS_X + 20, HEAD_Y - 112, 'Oh sh*t!', HUS_X - 5, HEAD_Y - 62);
    if (lost && e > 0.4 && e < 2.4) bubble(c, WIFE_X - 20, HEAD_Y - 112, 'Oh sh*t!', WIFE_X + 5, HEAD_Y - 62);
    if (lost && e > 2.6) {
      const a = clamp((e - 2.6) / 0.4, 0, 1);
      whisperBubble(c, WIFE_X, HEAD_Y - 100, 'Shh shh… why?!', a);
      whisperBubble(c, HUS_X, HEAD_Y - 100, 'Now what?!', a);
      c.fillStyle = '#ffe17a'; c.font = 'bold 40px system-ui';
      c.globalAlpha = a;
      c.fillText('?', WIFE_X + 60, HEAD_Y - 40 + Math.sin(e * 4) * 4);
      c.fillText('?', HUS_X - 76, HEAD_Y - 40 + Math.sin(e * 4 + 1) * 4);
      c.globalAlpha = 1;
    }
    if (lost && e > 0.9) {
      c.fillStyle = '#ffd1e6'; c.font = `bold ${34 + Math.sin(e * 20) * 3}px system-ui`; c.textAlign = 'center';
      c.fillText('WAAAH!', BABY_X, BABY_Y - 104 + Math.sin(e * 25) * 3); c.textAlign = 'left';
    }
    if (won && hugK > 0.5) { zzz(c, WIFE_X - 10, HEAD_Y - 62, t); zzz(c, HUS_X - 5, HEAD_Y - 62, t + 0.5); zzz(c, BABY_X + 10, BABY_Y - 44, t + 0.25); }
    for (const p of particles) {
      c.globalAlpha = clamp(p.life, 0, 1);
      if (p.type === 'heart') { c.fillStyle = '#ff5a8a'; c.font = '30px system-ui'; c.fillText('❤', p.x, p.y); }
      else { c.fillStyle = '#8fd0ff'; c.beginPath(); c.ellipse(p.x, p.y, 3.5, 6, 0, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;

    hud(c, { level: S.level, total: LEVELS.length, name: L.name, progress: S.progress, label: '💬 WHISPERING',
      hint: 'HOLD LEFT MOUSE to whisper · RELEASE to pretend to sleep', showHint: !S.result && S.hintT < 4, t });
  };

  (G.scenarios = G.scenarios || []).push(S);
})(window.Game = window.Game || {});
