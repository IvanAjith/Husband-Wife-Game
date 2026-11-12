(function (G) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const ovTitle = document.getElementById('ovTitle');
  const ovText = document.getElementById('ovText');
  const ovButtons = document.getElementById('ovButtons');
  const muteBtn = document.getElementById('muteBtn');

  // crisp rendering on high-DPI screens
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 960 * dpr; canvas.height = 540 * dpr;
  ctx.scale(dpr, dpr);

  let scIdx = 0, lvIdx = 0;
  let mode = 'menu'; // menu | playing | result
  let holding = false;
  const scene = () => G.scenarios[scIdx];

  function showOverlay(title, text, buttons) {
    ovTitle.textContent = title;
    ovText.textContent = text;
    ovButtons.innerHTML = '';
    buttons.forEach(([label, fn, cls]) => {
      const b = document.createElement('button');
      b.textContent = label; if (cls) b.className = cls;
      b.onclick = () => { G.Audio.init(); fn(); };
      ovButtons.appendChild(b);
    });
    overlay.classList.remove('hidden');
  }
  const hideOverlay = () => overlay.classList.add('hidden');

  function startLevel() {
    scene().reset(lvIdx);
    hideOverlay();
    mode = 'playing';
    holding = false;
    G.Audio.startAmbient();
  }

  function showMenu() {
    mode = 'menu';
    scene().reset(0);
    const list = G.scenarios.map((sc, i) => `${i + 1}. ${sc.title}: ${sc.blurb}`).join('\n');
    showOverlay(
      "Don't Get Caught 📱",
      list + '\n\nHold the LEFT MOUSE BUTTON (or SPACE) to do your sneaky thing.\nWhen someone stirs, RELEASE it!',
      G.scenarios.map((sc, i) => [`▶ ${sc.title}`, () => { scIdx = i; lvIdx = 0; startLevel(); }, i ? 'secondary' : ''])
    );
  }

  function showResult() {
    mode = 'result';
    const s = scene();
    if (s.result === 'lost') {
      showOverlay(s.loseTitle, s.loseText, [['Try again', startLevel], ['Menu', showMenu, 'secondary']]);
    } else if (lvIdx < s.levels.length - 1) {
      showOverlay(s.winTitle, s.winText, [['Next level', () => { lvIdx++; startLevel(); }]]);
    } else {
      const btns = [['Play again', () => { lvIdx = 0; startLevel(); }]];
      if (scIdx < G.scenarios.length - 1) btns.unshift(['Next scenario', () => { scIdx++; lvIdx = 0; startLevel(); }]);
      btns.push(['Menu', showMenu, 'secondary']);
      showOverlay(s.endWinTitle, s.endWinText, btns);
    }
  }

  // ---- input ----
  const setHold = v => { holding = v; };
  canvas.addEventListener('pointerdown', e => { if (e.button === 0) { G.Audio.init(); setHold(true); e.preventDefault(); } });
  window.addEventListener('pointerup', () => setHold(false));
  window.addEventListener('pointercancel', () => setHold(false));
  window.addEventListener('blur', () => setHold(false));
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { G.Audio.init(); if (mode === 'playing') { setHold(true); e.preventDefault(); } }
    if (e.code === 'KeyM') muteBtn.click();
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') setHold(false); });

  muteBtn.onclick = () => {
    G.Audio.init();
    G.Audio.setMuted(!G.Audio.muted);
    muteBtn.textContent = G.Audio.muted ? '🔇' : '🔊';
    muteBtn.blur();
  };

  // ---- main loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const s = scene();
    if (mode !== 'menu') s.update(dt, mode === 'playing' && holding); else s.update(dt, false);
    s.draw(ctx, now / 1000);
    if (mode === 'playing' && s.result) mode = 'ending';
    if (mode === 'ending' && s.endT > (s.result === 'lost' ? (s.loseDelay || 3.6) : (s.winDelay || 5.2))) showResult();
    requestAnimationFrame(frame);
  }

  showMenu();
  requestAnimationFrame(frame);
  G.debug = { scene, get mode() { return mode; } };
})(window.Game);
