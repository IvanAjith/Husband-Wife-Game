// Shared canvas drawing helpers used by every scenario.
(function (G) {
  const W = 960, H = 540;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
    const rl = o.raiseL || 0, rrr = o.raiseR || 0; // raise a brow = confused look
    c.beginPath(); c.moveTo(x - 27 + fx, y - 14 - bo - rl); c.lineTo(x - 9 + fx, y - 16 + bo - rl); c.moveTo(x + 9 + fx, y - 16 + bo - rrr); c.lineTo(x + 27 + fx, y - 14 - bo - rrr); c.stroke();
    c.strokeStyle = '#6b2f2f'; c.lineWidth = 2.6; c.fillStyle = '#4a1c1c';
    const mx = x + fx, my = y + 30;
    c.beginPath();
    if (o.mouth === 'o') { c.ellipse(mx, my + 2, 8, 11, 0, 0, 7); c.fill(); }
    else if (o.mouth === 'talk') { const th = 3 + Math.abs(Math.sin((o.t || 0) * 14 + (o.ph || 0))) * 7; c.ellipse(mx, my + 1, 6, th, 0, 0, 7); c.fill(); }
    else if (o.mouth === 'wavy') { c.moveTo(mx - 10, my + 1); c.quadraticCurveTo(mx - 5, my - 5, mx, my + 1); c.quadraticCurveTo(mx + 5, my + 7, mx + 10, my + 1); c.stroke(); }
    else if (o.mouth === 'wail') { const wh = 11 + Math.abs(Math.sin((o.t || 0) * 9)) * 8; c.ellipse(mx, my + 4, 11, wh, 0, 0, 7); c.fill(); }
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


  function hud(c, o) {
    c.fillStyle = 'rgba(10,12,35,.65)'; rr(c, 14, 14, 270, 38, 10); c.fill();
    c.fillStyle = '#dfe4ff'; c.font = 'bold 16px system-ui'; c.textBaseline = 'middle';
    c.fillText(`Level ${o.level + 1}/${o.total} · ${o.name}`, 26, 33);
    c.textBaseline = 'alphabetic';
    const bw = 420, bx = (W - bw) / 2, by = H - 52;
    c.fillStyle = 'rgba(10,12,35,.7)'; rr(c, bx - 14, by - 30, bw + 28, 60, 14); c.fill();
    c.fillStyle = '#c9cffb'; c.font = 'bold 14px system-ui'; c.fillText(o.label, bx, by - 10);
    c.fillStyle = '#242a5e'; rr(c, bx, by, bw, 16, 8); c.fill();
    const k = clamp(o.progress, 0, 1);
    if (k > 0.01) {
      const gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#5ad1ff'); gr.addColorStop(1, '#8c6bff');
      c.fillStyle = gr; rr(c, bx, by, Math.max(16, bw * k), 16, 8); c.fill();
    }
    if (o.showHint) {
      c.fillStyle = `rgba(255,255,255,${(0.5 + 0.5 * Math.sin(o.t * 5)).toFixed(2)})`;
      c.font = 'bold 20px system-ui'; c.textAlign = 'center';
      c.fillText(o.hint, W / 2, 130);
      c.textAlign = 'left';
    }
  }

  G.draw = { rr, eye, head, backOfHead, zzz, bubble, hud };
})(window.Game = window.Game || {});
