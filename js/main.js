(function (G) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const card = overlay.querySelector('.card');
  const ovTitle = document.getElementById('ovTitle');
  const ovText = document.getElementById('ovText');
  const ovButtons = document.getElementById('ovButtons');
  const muteBtn = document.getElementById('muteBtn');

  // crisp rendering on high-DPI screens
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 960 * dpr; canvas.height = 540 * dpr;
  ctx.scale(dpr, dpr);

  let scIdx = 0, lvIdx = 0;
  let mode = 'menu'; // menu | playing | ending | result
  let holding = false;
  let shownAt = 0;
  const scene = () => G.scenarios[scIdx];

  // ---- overlay ----
  // While hidden the overlay is `inert`, so its buttons can never take focus or be triggered by
  // a held Space key (that used to restart the level right after you got caught).
  function setOverlay(visible) {
    overlay.classList.toggle('hidden', !visible);
    overlay.inert = !visible;
    if (visible) shownAt = performance.now();
    else if (document.activeElement && overlay.contains(document.activeElement)) document.activeElement.blur();
  }

  // Ignore presses in the first moments after a screen appears (e.g. a key still held from gameplay).
  function guarded(fn) {
    return () => {
      if (performance.now() - shownAt < 700) return;
      G.Audio.init();
      fn();
    };
  }

  function showOverlay(title, text, buttons) {
    card.classList.remove('wide');
    ovTitle.textContent = title;
    ovText.textContent = text;
    ovButtons.className = 'buttons';
    ovButtons.innerHTML = '';
    buttons.forEach(([label, fn, cls]) => {
      const b = document.createElement('button');
      b.textContent = label; if (cls) b.className = cls;
      b.onclick = guarded(fn);
      ovButtons.appendChild(b);
    });
    setOverlay(true);
  }

  function startLevel() {
    scene().reset(lvIdx);
    setOverlay(false);
    mode = 'playing';
    holding = false;
    G.Audio.startAmbient();
  }

  // ---- title screen with a picture for each scenario ----
  const thumbs = [];
  function makeThumbs() {
    const off = document.createElement('canvas');
    off.width = 480; off.height = 270;
    const c = off.getContext('2d');
    G.scenarios.forEach((sc, i) => {
      c.setTransform(0.5, 0, 0, 0.5, 0, 0);
      sc.hintT = 99; sc.reset(0); sc.draw(c, 0); sc.hintT = 0;
      thumbs[i] = off.toDataURL('image/jpeg', 0.85);
    });
  }

  function showMenu() {
    mode = 'menu';
    holding = false;
    scene().reset(0);
    card.classList.add('wide');
    ovTitle.textContent = "Don't Get Caught 📱";
    ovText.textContent = 'Hold the LEFT MOUSE BUTTON (or SPACE) to sneak. Release it when someone stirs!\nChoose a game:';
    ovButtons.className = 'choices';
    ovButtons.innerHTML = '';
    G.scenarios.forEach((sc, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `<img alt="" src="${thumbs[i]}"><strong></strong><span></span>`;
      b.querySelector('strong').textContent = sc.title;
      b.querySelector('span').textContent = sc.blurb;
      b.onclick = guarded(() => { scIdx = i; lvIdx = 0; startLevel(); });
      ovButtons.appendChild(b);
    });
    setOverlay(true);
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
  const overlayVisible = () => !overlay.classList.contains('hidden');
  const setHold = v => { holding = v; };
  canvas.addEventListener('pointerdown', e => { if (e.button === 0) { G.Audio.init(); setHold(true); e.preventDefault(); } });
  window.addEventListener('pointerup', () => setHold(false));
  window.addEventListener('pointercancel', () => setHold(false));
  window.addEventListener('blur', () => setHold(false));
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      G.Audio.init();
      if (!overlayVisible()) { e.preventDefault(); if (mode === 'playing') setHold(true); }
    }
    if (e.code === 'KeyM' && !e.repeat) muteBtn.click();
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space') { setHold(false); if (!overlayVisible()) e.preventDefault(); }
  });

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
    s.update(dt, mode === 'playing' && holding);
    s.draw(ctx, now / 1000);
    if (mode === 'playing' && s.result) mode = 'ending';
    if (mode === 'ending' && s.endT > (s.result === 'lost' ? (s.loseDelay || 3.6) : (s.winDelay || 5.2))) showResult();
    requestAnimationFrame(frame);
  }

  makeThumbs();
  showMenu();
  shownAt = -1e9; // no click-protection needed on the very first screen
  requestAnimationFrame(frame);
  G.debug = { scene, get mode() { return mode; } };
})(window.Game);
