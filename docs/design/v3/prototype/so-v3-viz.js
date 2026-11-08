// so-v3-viz.js — visual simulado no espírito do MilkDrop (feedback + warp) para os protótipos v3.
// No app real isto é o Butterchurn; aqui só dá vida ao fundo e expõe nível, beat e blend.
(function () {
  function create(canvas, opts) {
    opts = opts || {};
    const scale = opts.scale || 0.5;
    const ctx = canvas.getContext('2d');
    const buf = document.createElement('canvas');
    const bctx = buf.getContext('2d');
    let w = 0, h = 0, raf = 0, t0 = performance.now();
    let cur = { hue: 260, style: 0 }, prev = null, blendStart = 0, blendMs = 2000;
    let silent = false, beat = 0, nextBeat = 600, lvl = 0, peak = 0, peakAt = 0;
    const beatCbs = [];

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(2, Math.floor(r.width * scale));
      h = Math.max(2, Math.floor(r.height * scale));
      canvas.width = w; canvas.height = h; buf.width = w; buf.height = h;
      ctx.fillStyle = '#080809'; ctx.fillRect(0, 0, w, h);
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    function shape(c, st, hue, t, k, a) {
      const cx = w / 2, cy = h / 2, m = Math.min(w, h);
      c.globalAlpha = a;
      c.lineWidth = Math.max(1, m / 260);
      if (st === 0) { // radial
        const n = 96;
        for (let i = 0; i < n; i++) {
          const f = i / n, ang = f * Math.PI * 2 + t * 0.2;
          const amp = (0.5 + 0.5 * Math.sin(t * 2.1 + f * 18)) * (0.4 + k);
          const r0 = m * 0.16, r1 = r0 + amp * m * 0.22;
          c.strokeStyle = `hsl(${hue + f * 80},95%,${55 + k * 20}%)`;
          c.beginPath(); c.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); c.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); c.stroke();
        }
      } else if (st === 1) { // túnel
        for (let r = 1; r <= 6; r++) {
          const rad = ((r / 6 + t * 0.15) % 1) * m * 0.6;
          c.strokeStyle = `hsl(${hue + r * 18},90%,${50 + k * 25}%)`;
          c.beginPath();
          for (let s = 0; s <= 6; s++) { const a2 = s / 6 * Math.PI * 2 + t * 0.3 + r; const x = cx + Math.cos(a2) * rad, y = cy + Math.sin(a2) * rad; s ? c.lineTo(x, y) : c.moveTo(x, y); }
          c.stroke();
        }
      } else if (st === 2) { // onda
        for (let L = 0; L < 3; L++) {
          c.strokeStyle = `hsl(${hue + L * 40},100%,${58 + k * 20}%)`;
          c.beginPath();
          for (let x = 0; x <= w; x += 3) {
            const f = x / w;
            const y = cy + Math.sin(f * 10 + t * (1.6 + L * 0.4)) * m * (0.08 + k * 0.12) + Math.sin(f * 27 - t * 3) * m * 0.03;
            x ? c.lineTo(x, y + (L - 1) * m * 0.06) : c.moveTo(x, y);
          }
          c.stroke();
        }
      } else { // manchas
        for (let i = 0; i < 5; i++) {
          const x = cx + Math.cos(t * 0.7 + i * 1.3) * m * 0.28, y = cy + Math.sin(t * 0.9 + i * 2.1) * m * 0.22;
          const g = c.createRadialGradient(x, y, 0, x, y, m * (0.06 + k * 0.08));
          g.addColorStop(0, `hsla(${hue + i * 25},100%,65%,0.9)`); g.addColorStop(1, `hsla(${hue + i * 25},100%,50%,0)`);
          c.fillStyle = g; c.beginPath(); c.arc(x, y, m * (0.06 + k * 0.08), 0, Math.PI * 2); c.fill();
        }
      }
      c.globalAlpha = 1;
    }

    function frame(now) {
      const t = (now - t0) / 1000;
      // beat simulado (~124 bpm com variação)
      if (!silent && now - t0 > nextBeat) { beat = 1; nextBeat = now - t0 + 440 + Math.random() * 140; beatCbs.forEach(f => f()); }
      beat *= 0.86;
      const target = silent ? 0 : 0.45 + 0.25 * Math.sin(t * 1.3) + beat * 0.4;
      lvl += (target - lvl) * 0.35;
      if (lvl >= peak || now - peakAt > 1500) { peak = lvl; peakAt = now; }
      const k = silent ? 0.05 : beat * 0.6 + lvl * 0.4;

      // feedback: zoom + rotação leve do quadro anterior
      bctx.drawImage(canvas, 0, 0);
      ctx.fillStyle = silent ? 'rgba(8,8,9,0.06)' : 'rgba(8,8,9,0.10)';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((silent ? 0.0008 : 0.003) + beat * 0.004);
      const z = silent ? 1.004 : 1.012 + beat * 0.02;
      ctx.scale(z, z);
      ctx.globalAlpha = silent ? 0.95 : 0.92;
      ctx.drawImage(buf, -w / 2, -h / 2);
      ctx.restore();

      const speed = silent ? 0.25 : 1;
      if (prev) {
        const p = Math.min(1, (now - blendStart) / blendMs);
        shape(ctx, prev.style, prev.hue, t * speed, k, (1 - p) * 0.9);
        shape(ctx, cur.style, cur.hue, t * speed, k, p * 0.9);
        if (p >= 1) prev = null;
      } else {
        shape(ctx, cur.style, cur.hue, t * speed, k, silent ? 0.25 : 0.9);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      setPreset(p, ms) { prev = { ...cur }; cur = { hue: p.hue, style: p.style }; blendMs = ms == null ? 2000 : ms; blendStart = performance.now(); },
      setSilent(v) { silent = !!v; },
      level() { return lvl; },
      peak() { return peak; },
      onBeat(f) { beatCbs.push(f); },
      destroy() { cancelAnimationFrame(raf); ro.disconnect(); },
    };
  }

  // Desenha um medidor segmentado em `el` (cria 20 <i>), atualiza com nível 0..1 e pico.
  function meter(el, n) {
    n = n || 20;
    el.innerHTML = '';
    const segs = Array.from({ length: n }, () => el.appendChild(document.createElement('i')));
    return function update(level, peak) {
      const on = Math.round(Math.min(1, level) * n), pk = Math.min(n - 1, Math.round(Math.min(1, peak) * n) - 1);
      segs.forEach((s, i) => {
        s.className = i < on ? (i >= n - 2 ? 'clip' : i >= n * 0.7 ? 'hot' : 'on') : (i === pk ? 'peak' : '');
      });
    };
  }

  window.SOViz = { create, meter };
})();
