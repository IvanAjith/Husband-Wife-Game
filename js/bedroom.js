// Scenario 1: Bedroom, 10 PM. Husband sneaks his phone while the wife sleeps.
// A scenario is any object with: id, title, time, intro, levels[], reset(i), update(dt, holding), draw(ctx, t)
// plus `result` ('won' | 'lost' | null), `endT` (seconds since the result) and `progress` (0..1).
(function (G) {
  const W = 960, H = 540;
  const WIFE_X = 350, HUS_X = 610, HEAD_Y = 272;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  const LEVELS = [
    { name: 'A quick scroll',        rate: 0.100, decay: 0.05, gap: [2.6, 4.6], stir: 1.3, look: 1.1, fake: 0 },
    { name: 'One more reel…',        rate: 0.085, decay: 0.07, gap: [1.9, 3.6], stir: 1.0, look: 1.0, fake: 0.25 },
    { name: 'Just one more video',   rate: 0.075, decay: 0.09, gap: [1.3, 2.9], stir: 0.8, look: 0.9, fake: 0.35 },
  ];

  const S = {
    id: 'bedroom',
    title: 'The Midnight Scroll',
    time: '10:00 PM',
    intro: 'It is 10 PM. You are both in bed, about to sleep.\nYour wife is asleep… but your phone is calling you.',
    levels: LEVELS,
    result: null,
    endT: 0,
    progress: 0,
    hintT: 0,
  };

  let L, st, particles;

  S.reset = function (i) {
    L = LEVELS[i];
    S.level = i;
    S.result = null;
    S.endT = 0;
    S.progress = 0;
    S.hintT = S.hintT || 0;
    particles = [];
    st = {
      t: 0,
      phone: 0,           // 0 = hidden under blanket, 1 = held up in front of face
      tickT: 0,
      mode: 'sleep',      // wife: sleep | stir | look
      timer: rand(1.5, 2.5),
      willLook: true,
      eyes: 0,            // wife eye openness 0..1
      turn: 0,            // wife head turn toward husband 0..1
      away: 0,            // lost: wife turning her back 0..1
      cryStarted: false,
      winPhone: 0,        // win: phone travelling to nightstand 0..1
      hug: 0,             // win: wife snuggles in 0..1
      heartT: 0,
      tearT: 0,
    };
    G.Audio.silenceAll();
  };

  S.update = function (dt, holding) {
    st.t += dt;
    if (S.result) return endUpdate(dt);

    st.phone += ((holding ? 1 : 0) - st.phone) * Math.min(1, dt * 10);
    if (holding) {
      S.hintT += dt;
      S.progress = Math.min(1, S.progress + L.rate * dt);
      st.tickT -= dt;
      if (st.tickT <= 0) { G.Audio.tick(); st.tickT = 0.32 + Math.random() * 0.25; }
    } else {
      S.progress = Math.max(0, S.progress - L.decay * dt);
    }

    // Wife's sleep cycle
    st.timer -= dt;
    if (st.mode === 'sleep' && st.timer <= 0) {
      st.mode = 'stir';
      st.timer = L.stir;
      st.willLook = Math.random() >= L.fake;
      st.willLook ? G.Audio.stir() : G.Audio.fakeout();
    } else if (st.mode === 'stir' && st.timer <= 0) {
      if (st.willLook) { st.mode = 'look'; st.timer = L.look; G.Audio.look(); }
      else { st.mode = 'sleep'; st.timer = rand(L.gap[0], L.gap[1]); }
    } else if (st.mode === 'look') {
      if (st.phone > 0.35) return lose();
      if (st.timer <= 0) { st.mode = 'sleep'; st.timer = rand(L.gap[0], L.gap[1]); }
    }

    const eyeT = st.mode === 'look' ? 1 : st.mode === 'stir' ? (st.willLook ? 0.25 + 0.2 * Math.sin(st.t * 14) : 0.1) : 0;
    const turnT = st.mode === 'look' ? 1 : st.mode === 'stir' ? (st.willLook ? 0.55 : 0.25) : 0;
    st.eyes += (eyeT - st.eyes) * Math.min(1, dt * 12);
    st.turn += (turnT - st.turn) * Math.min(1, dt * 6);

    if (S.progress >= 1) win();
  };

  function lose() {
    S.result = 'lost';
    S.endT = 0;
    st.mode = 'look';
    G.Audio.stopAmbient();
    G.Audio.sting();
    G.Audio.speak('Oh shit!');
  }

  function win() {
    S.result = 'won';
    S.endT = 0;
    G.Audio.stopAmbient();
    G.Audio.win();
  }

  function endUpdate(dt) {
    S.endT += dt;
    const e = S.endT;
    if (S.result === 'lost') {
      st.phone += (0 - st.phone) * Math.min(1, dt * 6);
      st.eyes = 1; st.turn = 1;
      st.away = clamp((e - 0.7) / 0.7, 0, 1);
      if (e > 1.4 && !st.cryStarted) { st.cryStarted = true; G.Audio.startCry(); }
      if (e > 1.6) {
        st.tearT -= dt;
        if (st.tearT <= 0) {
          st.tearT = 0.12;
          particles.push({ x: WIFE_X - 40 + rand(-25, 25), y: HEAD_Y + 10, vx: rand(-20, 10), vy: rand(20, 60), life: 1.2, type: 'tear' });
        }
      }
    } else {
      st.phone += (0 - st.phone) * Math.min(1, dt * 6);
      st.winPhone = clamp(e / 1.3, 0, 1);
      st.hug = clamp((e - 1.4) / 1.4, 0, 1);
      st.eyes += (0 - st.eyes) * Math.min(1, dt * 8);
      st.turn += (0 - st.turn) * Math.min(1, dt * 6);
      if (st.hug > 0.6) {
        st.heartT -= dt;
        if (st.heartT <= 0) {
          st.heartT = 0.45;
          particles.push({ x: (WIFE_X + HUS_X) / 2 + rand(-40, 40), y: HEAD_Y - 60, vx: rand(-10, 10), vy: rand(-40, -25), life: 2.2, type: 'heart' });
        }
      }
    }
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.type === 'tear') p.vy += 160 * dt; }
    particles = particles.filter(p => p.life > 0);
  }

  // -------------------------------------------------------------- drawing helpers
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function eye(c, x, y, open, lx, ly) {
    if (open < 0.2) {
      c.strokeStyle = '#2a1a1a'; c.lineWidth = 2.6; c.lineCap = 'round';
      c.beginPath(); c.arc(x, y - 3, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      return;
    }
    const h = 8.5 * open + 1.5;
    c.fillStyle = '#f8f8fa'; c.beginPath(); c.ellipse(x, y, 8.5, h, 0, 0, 7); c.fill();
    c.fillStyle = '#2a1a1a'; c.beginPath(); c.ellipse(x + lx, y + ly, 3.8, Math.min(3.8, h), 0, 0, 7); c.fill();
  }

  // opts: {eyes, lx, ly, mouth, turn, blush, long, skin, hair}
  function head(c, x, y, o) {
    const fx = (o.turn || 0) * 9; // face features slide sideways when the head turns
    if (o.long) { c.fillStyle = o.hair; c.beginPath(); c.ellipse(x - 4, y + 14, 60, 64, 0, 0, 7); c.fill(); }
    c.fillStyle = o.skin; c.beginPath(); c.ellipse(x, y, 45, 51, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(x - 44, y + 4, 8, 0, 7); c.arc(x + 44, y + 4, 8, 0, 7); c.fill();
    c.fillStyle = o.hair; c.beginPath(); c.ellipse(x, y - 10, 47, 43, 0, Math.PI, 2 * Math.PI); c.fill();
    c.beginPath(); c.ellipse(x + (o.long ? 18 : 6), y - 22, 34, 18, -0.2, 0, 7); c.fill();
    if (o.blush) { c.fillStyle = 'rgba(255,110,130,.35)'; c.beginPath(); c.ellipse(x - 26 + fx, y + 20, 10, 6, 0, 0, 7); c.ellipse(x + 26 + fx, y + 20, 10, 6, 0, 0, 7); c.fill(); }
    eye(c, x - 17 + fx, y + 2, o.eyes, o.lx || 0, o.ly || 0);
    eye(c, x + 17 + fx, y + 2, o.eyes, o.lx || 0, o.ly || 0);
    c.strokeStyle = o.hair; c.lineWidth = 3; c.lineCap = 'round';
    const bo = o.brow || 0; // negative = worried
    c.beginPath(); c.moveTo(x - 27 + fx, y - 14 - bo); c.lineTo(x - 9 + fx, y - 16 + bo); c.moveTo(x + 9 + fx, y - 16 + bo); c.lineTo(x + 27 + fx, y - 14 - bo); c.stroke();
    c.strokeStyle = '#6b2f2f'; c.lineWidth = 2.6; c.fillStyle = '#4a1c1c';
    const mx = x + fx, my = y + 30;
    c.beginPath();
    if (o.mouth === 'o') { c.ellipse(mx, my + 2, 8, 11, 0, 0, 7); c.fill(); }
    else if (o.mouth === 'smile') { c.arc(mx, my - 6, 11, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else if (o.mouth === 'frown') { c.arc(mx, my + 8, 9, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
    else { c.moveTo(mx - 7, my); c.lineTo(mx + 7, my); c.stroke(); }
  }

  function backOfHead(c, x, y, hair) {
    c.fillStyle = hair;
    c.beginPath(); c.ellipse(x, y + 14, 62, 66, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,200,170,.18)'; c.lineWidth = 3;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 14, y - 30); c.quadraticCurveTo(x + i * 20, y + 20, x + i * 16, y + 70); c.stroke(); }
  }

  function zzz(c, x, y, t) {
    c.fillStyle = 'rgba(190,200,255,.75)'; c.font = 'bold 22px system-ui';
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.45 + i / 3) % 1);
      c.globalAlpha = Math.sin(k * Math.PI) * 0.8;
      c.font = `bold ${14 + i * 6}px system-ui`;
      c.fillText('z', x + k * 34 + i * 6, y - k * 54);
    }
    c.globalAlpha = 1;
  }

  function bubble(c, x, y, text, tx, ty) {
    c.font = 'bold 30px system-ui';
    const w = c.measureText(text).width + 36, h = 52;
    c.fillStyle = '#fff'; rr(c, x - w / 2, y - h / 2, w, h, 16); c.fill();
    c.beginPath(); c.moveTo(x - 10, y + h / 2 - 2); c.lineTo(tx, ty); c.lineTo(x + 14, y + h / 2 - 2); c.closePath(); c.fill();
    c.fillStyle = '#c0172b'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, x, y + 2); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }

  function phoneShape(c, x, y, rot, screenUp) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = '#15171f'; rr(c, -24, -42, 48, 84, 8); c.fill();
    if (screenUp) { c.fillStyle = '#bfe3ff'; rr(c, -20, -37, 40, 74, 5); c.fill(); }
    else { c.fillStyle = '#262a38'; c.beginPath(); c.arc(-10, -30, 5, 0, 7); c.fill(); c.beginPath(); c.arc(4, -30, 5, 0, 7); c.fill(); }
    c.restore();
  }

  // -------------------------------------------------------------- main draw
  S.draw = function (c, time) {
    const t = st.t;
    const lost = S.result === 'lost', won = S.result === 'won';
    const hugK = st.hug, winP = st.winPhone;
    const phoneUp = st.phone;
    const glowK = won ? (1 - winP) * 0.5 : phoneUp;

    // wall + floor
    let g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1230'); g.addColorStop(1, '#1b2050');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#171227'; c.fillRect(0, 462, W, H - 462);
    c.fillStyle = '#0f0b1c'; c.fillRect(0, 462, W, 5);

    // window + moon
    c.fillStyle = '#070a1f'; rr(c, 70, 70, 190, 220, 6); c.fill();
    g = c.createLinearGradient(0, 70, 0, 290); g.addColorStop(0, '#13214f'); g.addColorStop(1, '#2a3a78');
    c.fillStyle = g; rr(c, 78, 78, 174, 204, 4); c.fill();
    c.fillStyle = '#f3efd0'; c.beginPath(); c.arc(190, 140, 28, 0, 7); c.fill();
    c.fillStyle = '#13214f'; c.beginPath(); c.arc(200, 132, 24, 0, 7); c.fill();
    c.fillStyle = '#dfe6ff';
    [[110, 110], [150, 100], [222, 190], [120, 220], [180, 240], [100, 170]].forEach(([sx, sy], i) => {
      c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); c.fillRect(sx, sy, 3, 3);
    });
    c.globalAlpha = 1;
    c.strokeStyle = '#070a1f'; c.lineWidth = 5; c.beginPath(); c.moveTo(165, 78); c.lineTo(165, 282); c.moveTo(78, 180); c.lineTo(252, 180); c.stroke();
    c.fillStyle = '#3b2a5c'; c.fillRect(48, 60, 34, 250); c.fillRect(248, 60, 34, 250);

    // wall clock (10:00)
    c.fillStyle = '#e9e6dc'; c.beginPath(); c.arc(480, 78, 40, 0, 7); c.fill();
    c.strokeStyle = '#2b2233'; c.lineWidth = 5; c.stroke();
    c.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(480 + Math.sin(a) * 33, 78 - Math.cos(a) * 33); c.lineTo(480 + Math.sin(a) * 37, 78 - Math.cos(a) * 37); c.stroke(); }
    c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(480, 78); c.lineTo(480 + Math.sin(-Math.PI / 3) * 20, 78 - Math.cos(-Math.PI / 3) * 20); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(480, 78); c.lineTo(480, 46); c.stroke();

    // headboard + bed frame
    c.fillStyle = '#4a2c1c'; rr(c, 190, 150, 580, 200, 26); c.fill();
    c.fillStyle = '#5a3824'; rr(c, 205, 165, 550, 170, 20); c.fill();
    c.fillStyle = '#3d2417'; rr(c, 150, 450, 660, 52, 8); c.fill();

    // nightstand + lamp
    c.fillStyle = '#34201a'; rr(c, 820, 360, 110, 110, 6); c.fill();
    c.fillStyle = '#251612'; c.fillRect(830, 405, 90, 4);
    c.fillStyle = '#6a5a8f'; c.fillRect(868, 318, 8, 42);
    c.fillStyle = '#8a79b5'; c.beginPath(); c.moveTo(840, 322); c.lineTo(904, 322); c.lineTo(892, 278); c.lineTo(852, 278); c.closePath(); c.fill();

    // pillows
    c.fillStyle = '#d9ddf2'; c.beginPath(); c.ellipse(WIFE_X, 318, 110, 52, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(HUS_X, 318, 110, 52, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(80,90,160,.18)'; c.beginPath(); c.ellipse(WIFE_X, 332, 100, 30, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(HUS_X, 332, 100, 30, 0, 0, 7); c.fill();

    // --- husband head
    const husbandLit = phoneUp > 0.25 && !won;
    const hFace = { skin: '#dfae86', hair: '#1c1a1f', eyes: 0, mouth: 'flat' };
    if (lost) {
      Object.assign(hFace, { eyes: 1.2, lx: -1, ly: 0, mouth: 'o', brow: 6 });
    } else if (won) {
      const wk = clamp(S.endT / 1.5, 0, 1);
      Object.assign(hFace, { eyes: 1 - wk, lx: -6, ly: 0, mouth: wk > 0.6 ? 'smile' : 'flat' });
    } else if (husbandLit) {
      Object.assign(hFace, { eyes: 1, lx: 2, ly: 5, mouth: 'flat' });
    } else {
      Object.assign(hFace, { eyes: st.phone > 0.1 ? 0.5 : 0, mouth: 'flat' });
    }
    head(c, HUS_X, HEAD_Y, hFace);
    if (lost) { // sweat drops
      c.fillStyle = '#8fd0ff';
      for (let i = 0; i < 3; i++) { const yy = HEAD_Y - 50 + ((t * 70 + i * 30) % 90); c.beginPath(); c.ellipse(HUS_X + 52 + i * 8, yy, 4, 7, 0, 0, 7); c.fill(); }
    }

    // --- wife head
    const wx = WIFE_X + hugK * 62;
    if (lost && st.away > 0.5) {
      const sh = st.away >= 1 ? Math.sin(S.endT * 28) * 2.2 : 0;
      backOfHead(c, wx - 6 + sh, HEAD_Y, '#5c3329');
    } else {
      c.save();
      if (lost) { const sx = Math.max(0.05, Math.cos(st.away * Math.PI)); c.translate(wx, 0); c.scale(sx, 1); c.translate(-wx, 0); }
      const wf = { skin: '#f1c6a4', hair: '#5c3329', long: true, turn: st.turn, eyes: st.eyes, lx: 5 * st.turn, ly: 1, mouth: 'flat', blush: hugK > 0.3 };
      if (lost) { wf.mouth = 'frown'; wf.brow = -5; wf.eyes = 1; }
      else if (won) { wf.mouth = hugK > 0.3 ? 'smile' : 'flat'; wf.eyes = Math.min(wf.eyes, 0); }
      else if (st.mode === 'stir') wf.mouth = 'frown';
      if (st.mode === 'look' && !lost) wf.brow = -2;
      head(c, wx, HEAD_Y, wf);
      c.restore();
    }

    // blanket
    c.fillStyle = '#3d5aa8'; rr(c, 150, 346, 660, 130, 30); c.fill();
    c.fillStyle = '#4b6bc0'; c.beginPath(); c.ellipse(wx, 350, 105, 30, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(HUS_X, 350, 105, 30, 0, 0, 7); c.fill();
    c.fillStyle = '#e8ecff'; rr(c, 150, 346, 660, 26, 13); c.fill();
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(150, 372, 660, 4);
    c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 3;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(190 + i * 140, 390); c.quadraticCurveTo(210 + i * 140, 430, 190 + i * 140, 470); c.stroke(); }

    // wife's hugging arm
    if (hugK > 0) {
      const ex = lerp(wx + 50, HUS_X - 20, hugK), ey = 366;
      c.lineCap = 'round'; c.strokeStyle = '#9a6ab5'; c.lineWidth = 30;
      c.beginPath(); c.moveTo(wx + 40, 372); c.quadraticCurveTo((wx + ex) / 2, 350, ex, ey); c.stroke();
      c.fillStyle = '#f1c6a4'; c.beginPath(); c.arc(ex + 8, ey + 2, 15, 0, 7); c.fill();
    }

    // husband arm + phone
    if (!won || winP < 1) {
      let px, py, rot = 0.12, show = true, screenUp = false;
      if (won) { // travel to the nightstand
        const k = winP;
        px = lerp(660, 876, k); py = lerp(300, 336, k) - Math.sin(k * Math.PI) * 50; rot = lerp(0.12, 1.5, k); screenUp = k > 0.8;
      } else { px = 660; py = 392 - st.phone * 92; screenUp = true; show = st.phone > 0.04; }
      if (show) {
        if (!won) { // forearm
          c.lineCap = 'round'; c.strokeStyle = '#8a6fb0'; c.lineWidth = 26;
          c.beginPath(); c.moveTo(752, 440); c.lineTo(px + 18, py + 40); c.stroke();
          c.fillStyle = '#dfae86'; c.beginPath(); c.arc(px + 16, py + 38, 13, 0, 7); c.fill();
        }
        phoneShape(c, px, py, rot, screenUp && !won || (won && winP > 0.8 ? false : screenUp));
      }
    }
    if (won && winP >= 1) { // phone resting beside the bed, screen dark
      c.fillStyle = '#15171f'; rr(c, 850, 350, 56, 11, 4); c.fill();
    }

    // light from the screen
    if (glowK > 0.02) {
      const gx = won ? lerp(660, 876, winP) : 660, gy = won ? 320 : 392 - st.phone * 92;
      c.globalCompositeOperation = 'lighter';
      g = c.createRadialGradient(gx, gy, 10, gx, gy, 330);
      g.addColorStop(0, `rgba(150,200,255,${0.42 * glowK})`); g.addColorStop(1, 'rgba(150,200,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
    }

    // night shade (lifts a little when the phone is on)
    c.fillStyle = `rgba(4,6,22,${(0.28 - glowK * 0.08).toFixed(3)})`; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 620);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // z's / speech / particles
    if (!S.result && st.mode === 'sleep') zzz(c, WIFE_X - 10, HEAD_Y - 62, t);
    if (won && hugK > 0.5) { zzz(c, wx - 10, HEAD_Y - 62, t); zzz(c, HUS_X - 5, HEAD_Y - 62, t + 0.5); }
    if (st.mode === 'stir' && !S.result) { c.fillStyle = 'rgba(230,200,255,.9)'; c.font = 'italic bold 24px system-ui'; c.fillText('mmm…', WIFE_X - 30 + Math.sin(t * 9) * 3, HEAD_Y - 70); }
    if (lost && S.endT > 0.3) bubble(c, HUS_X + 40, HEAD_Y - 112, 'Oh sh*t!', HUS_X + 5, HEAD_Y - 62);
    if (lost && S.endT > 1.7) { c.fillStyle = 'rgba(190,210,255,.9)'; c.font = 'italic bold 22px system-ui'; c.fillText(Math.floor(S.endT * 2) % 2 ? '*sob*' : '*sniff*', WIFE_X - 130, HEAD_Y - 52 + Math.sin(S.endT * 20) * 2); }
    for (const p of particles) {
      c.globalAlpha = clamp(p.life, 0, 1);
      if (p.type === 'heart') { c.fillStyle = '#ff5a8a'; c.font = '30px system-ui'; c.fillText('❤', p.x, p.y); }
      else { c.fillStyle = '#8fd0ff'; c.beginPath(); c.ellipse(p.x, p.y, 3.5, 6, 0, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;

    drawHud(c);
  };

  function drawHud(c) {
    c.fillStyle = 'rgba(10,12,35,.65)'; rr(c, 14, 14, 250, 38, 10); c.fill();
    c.fillStyle = '#dfe4ff'; c.font = 'bold 16px system-ui'; c.textBaseline = 'middle';
    c.fillText(`Level ${S.level + 1}/${LEVELS.length} · ${L.name}`, 26, 33);
    c.textBaseline = 'alphabetic';

    const bw = 420, bx = (W - bw) / 2, by = H - 52;
    c.fillStyle = 'rgba(10,12,35,.7)'; rr(c, bx - 14, by - 30, bw + 28, 60, 14); c.fill();
    c.fillStyle = '#c9cffb'; c.font = 'bold 14px system-ui'; c.fillText('📱 PHONE TIME', bx, by - 10);
    c.fillStyle = '#242a5e'; rr(c, bx, by, bw, 16, 8); c.fill();
    const k = clamp(S.progress, 0, 1);
    if (k > 0.01) {
      const gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#5ad1ff'); gr.addColorStop(1, '#8c6bff');
      c.fillStyle = gr; rr(c, bx, by, Math.max(16, bw * k), 16, 8); c.fill();
    }
    if (!S.result && S.hintT < 4) {
      c.fillStyle = `rgba(255,255,255,${(0.5 + 0.5 * Math.sin(st.t * 5)).toFixed(2)})`;
      c.font = 'bold 20px system-ui'; c.textAlign = 'center';
      c.fillText('HOLD LEFT MOUSE to scroll · RELEASE to hide the phone', W / 2, 130);
      c.textAlign = 'left';
    }
  }

  (G.scenarios = G.scenarios || []).push(S);
})(window.Game = window.Game || {});
