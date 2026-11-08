// so-v3-clips.js — clipes fictícios gerados por código + compositor por camadas (protótipos de vídeo/VJ).
// Nenhum vídeo real: cada "clipe" é uma animação abstrata procedural. No app real, cada camada é um <video>
// e o compositor é um shader WebGL 2 (ver docs/v3-video-vj.md); aqui usamos Canvas 2D com globalCompositeOperation.
(function () {
  const KINDS = ['gradiente', 'formas', 'ruido', 'tunel', 'particulas', 'listras', 'manchas', 'malha'];
  const TAGS = { gradiente: ['abstrato'], formas: ['formas', 'abstrato'], ruido: ['ruído', 'textura'], tunel: ['abstrato'], particulas: ['textura'], listras: ['formas'], manchas: ['abstrato', 'textura'], malha: ['formas'] };
  const clips = Array.from({ length: 16 }, (_, i) => {
    const kind = KINDS[i % KINDS.length];
    const dur = [8, 12, 6, 16, 10, 4, 14, 9][i % 8];
    const n = String(i + 1).padStart(2, '0');
    return {
      id: 'c' + n, n: i + 1, kind, dur,
      name: `Clip ${n} · ${TAGS[kind][0]} · 0:${String(dur).padStart(2, '0')}`,
      tags: TAGS[kind].slice(), hue: (i * 53 + 20) % 360,
      fav: [0, 3, 6, 9].includes(i),
      codec: i === 13 ? 'HEVC' : (i % 3 === 0 ? 'VP9' : 'H.264'),
      res: i % 4 === 0 ? '1920×1080' : '1280×720',
      loopIn: 0, loopOut: dur,
    };
  });
  clips.forEach(c => { c.supported = c.codec !== 'HEVC'; });
  const collections = [
    { id: 'k1', name: 'Abstrato', ids: ['c01', 'c04', 'c07', 'c09', 'c12', 'c15'] },
    { id: 'k2', name: 'Texturas', ids: ['c03', 'c05', 'c07', 'c11', 'c13'] },
    { id: 'k3', name: 'Formas', ids: ['c02', 'c06', 'c08', 'c10', 'c14', 'c16'] },
  ];

  // Desenha o quadro t (s) do clipe em ctx (w×h).
  function drawClip(ctx, w, h, clip, t) {
    const H = clip.hue, m = Math.min(w, h), cx = w / 2, cy = h / 2;
    ctx.save();
    switch (clip.kind) {
      case 'gradiente': {
        const g = ctx.createLinearGradient(0, 0, w, h);
        for (let i = 0; i <= 4; i++) g.addColorStop(i / 4, `hsl(${H + i * 35 + t * 30},85%,${30 + 25 * Math.sin(t + i)}%)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); break;
      }
      case 'formas': {
        ctx.fillStyle = `hsl(${H},40%,8%)`; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 6; i++) {
          ctx.save(); ctx.translate(cx + Math.cos(t * 0.6 + i) * m * 0.3, cy + Math.sin(t * 0.8 + i * 2) * m * 0.25);
          ctx.rotate(t * (0.5 + i * 0.2)); ctx.fillStyle = `hsl(${H + i * 30},90%,60%)`;
          const s = m * (0.08 + 0.04 * Math.sin(t * 2 + i)); ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore();
        }
        break;
      }
      case 'ruido': {
        const bs = Math.max(6, Math.round(m / 28));
        for (let y = 0; y < h; y += bs) for (let x = 0; x < w; x += bs) {
          const v = Math.abs(Math.sin(x * 12.9898 + y * 78.233 + Math.floor(t * 12) * 37.7) * 43758.5453) % 1;
          ctx.fillStyle = `hsl(${H + v * 40},70%,${v * 55}%)`; ctx.fillRect(x, y, bs, bs);
        }
        break;
      }
      case 'tunel': {
        ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, w, h); ctx.lineWidth = Math.max(2, m / 90);
        for (let r = 0; r < 10; r++) {
          const rad = ((r / 10 + t * 0.25) % 1) ** 2 * m * 0.9;
          ctx.strokeStyle = `hsl(${H + r * 15},95%,${40 + r * 4}%)`; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.stroke();
        }
        break;
      }
      case 'particulas': {
        ctx.fillStyle = `hsl(${H},50%,6%)`; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) {
          const a = i * 2.39996, r = ((i * 13 + t * 40) % (m * 0.7));
          ctx.fillStyle = `hsl(${H + i * 3},100%,70%)`; ctx.beginPath(); ctx.arc(cx + Math.cos(a + t * 0.2) * r, cy + Math.sin(a + t * 0.2) * r, m / 120 + 1, 0, 7); ctx.fill();
        }
        break;
      }
      case 'listras': {
        const n = 14, bw = w / n;
        for (let i = 0; i < n; i++) { ctx.fillStyle = `hsl(${H + (i % 2) * 180},80%,${(i + Math.floor(t * 4)) % 2 ? 55 : 12}%)`; ctx.fillRect(i * bw + Math.sin(t * 2) * bw, 0, bw + 1, h); }
        break;
      }
      case 'manchas': {
        ctx.fillStyle = `hsl(${H},60%,10%)`; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 6; i++) {
          const x = cx + Math.sin(t * 0.7 + i * 1.7) * w * 0.32, y = cy + Math.cos(t * 0.5 + i * 2.3) * h * 0.3, r = m * (0.15 + 0.05 * Math.sin(t + i));
          const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `hsla(${H + i * 40},100%,65%,1)`); g.addColorStop(1, `hsla(${H + i * 40},100%,50%,0)`);
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        }
        break;
      }
      default: { // malha
        ctx.fillStyle = '#06060b'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = `hsl(${H},90%,60%)`; ctx.lineWidth = Math.max(1, m / 200);
        const step = m / 10, off = (t * step) % step;
        for (let x = -step + off; x < w + step; x += step) { ctx.beginPath(); ctx.moveTo(x + Math.sin(t + x * 0.01) * 10, 0); ctx.lineTo(x - Math.sin(t + x * 0.01) * 10, h); ctx.stroke(); }
        for (let y = -step + off; y < h + step; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + Math.cos(t + y * 0.01) * 10); ctx.stroke(); }
      }
    }
    ctx.restore();
  }

  // Miniatura: desenha um quadro num canvas; se animate=true, anima enquanto houver hover (retorna stop()).
  function thumb(canvas, clip, animate) {
    const ctx = canvas.getContext('2d'); let raf = 0; const t0 = performance.now();
    const frame = () => { drawClip(ctx, canvas.width, canvas.height, clip, animate ? (performance.now() - t0) / 1000 : clip.dur * 0.37); if (animate) raf = requestAnimationFrame(frame); };
    frame(); return () => cancelAnimationFrame(raf);
  }

  const BLENDS = [
    { id: 'normal', label: 'Normal', op: 'source-over' },
    { id: 'screen', label: 'Tela', op: 'screen' },
    { id: 'add', label: 'Adição', op: 'lighter' },
    { id: 'multiply', label: 'Multiplicação', op: 'multiply' },
    { id: 'difference', label: 'Diferença', op: 'difference' },
    { id: 'overlay', label: 'Sobrepor', op: 'overlay' },
    { id: 'luma-mask', label: 'Luminosidade como máscara', op: 'luma-mask' },
    { id: 'luma-key', label: 'Chave de luminosidade', op: 'luma-key' },
  ];

  // Compositor: out = canvas de saída. stack = [{type:'canvas', el, blend, opacity} | {type:'clip', clip, blend, opacity, speed, enabled, reactions:{opacityByLevel, speedByEnergy, flashOnBass}}]
  function createCompositor(out, opts) {
    opts = opts || {};
    const scale = opts.scale || 0.5;
    const ctx = out.getContext('2d');
    const lay = document.createElement('canvas'), lctx = lay.getContext('2d', { willReadFrequently: true });
    let stack = [], raf = 0, last = performance.now(), audio = () => ({ level: 0.5, bass: 0.5, beat: 0 });
    const fx = { stutter: 0, strobe: 0, reverse: 0, freeze: 0, flash: 0 }; let stutterAt = null, freezeAt = null;
    let w = 2, h = 2;
    function resize() { const r = out.getBoundingClientRect(); w = Math.max(2, Math.floor(r.width * scale)); h = Math.max(2, Math.floor(r.height * scale)); out.width = w; out.height = h; lay.width = w; lay.height = h; }
    const ro = new ResizeObserver(resize); ro.observe(out); resize();

    function lumaPass(mode) { // converte a camada em alfa por luminância
      const img = lctx.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const L = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
        if (mode === 'mask') { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, L * 1.6 * 255); }
        else d[i + 3] = L < 0.18 ? 0 : Math.min(255, (L - 0.18) * 4 * 255);
      }
      lctx.putImageData(img, 0, 0);
    }

    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const a = audio();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#080809'; ctx.fillRect(0, 0, w, h);
      for (const L of stack) {
        if (L.enabled === false) continue;
        let alpha = L.opacity == null ? 1 : L.opacity;
        if (L.type === 'canvas') {
          ctx.globalAlpha = alpha; ctx.globalCompositeOperation = (BLENDS.find(b => b.id === L.blend) || BLENDS[0]).op;
          if (ctx.globalCompositeOperation.startsWith('luma')) ctx.globalCompositeOperation = 'screen';
          if (L.el.width > 2) ctx.drawImage(L.el, 0, 0, w, h);
          continue;
        }
        const c = L.clip; if (!c || c.supported === false) continue;
        const R = L.reactions || {};
        let speed = (L.speed || 1) * (R.speedByEnergy ? 0.5 + a.level * 1.5 : 1) * (fx.reverse ? -1 : 1);
        L._t = (L._t || 0) + dt * speed;
        const span = (c.loopOut - c.loopIn) || c.dur;
        let t = c.loopIn + (((L._t % span) + span) % span);
        if (fx.stutter) { if (stutterAt == null) stutterAt = t; t = stutterAt + ((now / 1000) % 0.12); } else stutterAt = null;
        if (fx.freeze) { if (freezeAt == null) freezeAt = t; t = freezeAt; } else freezeAt = null;
        if (R.opacityByLevel) alpha *= 0.25 + a.level * 0.9;
        if (fx.strobe && Math.floor(now / 70) % 2) alpha = 0;
        lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, w, h);
        drawClip(lctx, w, h, c, t);
        if (L.blend === 'luma-mask') { // MilkDrop só onde o vídeo é claro
          lumaPass('mask');
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(lay, 0, 0);
          ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#080809'; ctx.fillRect(0, 0, w, h);
          continue;
        }
        if (L.blend === 'luma-key') lumaPass('key');
        const op = L.blend === 'luma-key' ? 'source-over' : (BLENDS.find(b => b.id === L.blend) || BLENDS[0]).op;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); ctx.globalCompositeOperation = op; ctx.drawImage(lay, 0, 0);
        if ((R.flashOnBass && a.bass > 0.82) || fx.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(lay, 0, 0); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      setStack(s) { stack = s; },
      getStack() { return stack; },
      setAudio(fn) { audio = fn; },
      effect(name, on) { fx[name] = on ? 1 : 0; },
      pulse(name, ms) { fx[name] = 1; setTimeout(() => { fx[name] = 0; }, ms || 120); },
      destroy() { cancelAnimationFrame(raf); ro.disconnect(); },
    };
  }

  window.SO_CLIPS = { clips, collections, kinds: KINDS };
  window.SOClips = { drawClip, thumb, BLENDS, createCompositor };
})();
