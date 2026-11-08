// so-visualizer.jsx — Animated canvas background for Sonic Obsidian

function Visualizer({ mode }) {
  const canvasRef = React.useRef(null);
  const animRef = React.useRef(null);
  const beatRef = React.useRef(false);
  const beatTimerRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let w, h;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const scheduleBeat = () => {
      beatRef.current = true;
      setTimeout(() => { beatRef.current = false; }, 120);
      beatTimerRef.current = setTimeout(scheduleBeat, 480 + Math.random() * 360);
    };
    beatTimerRef.current = setTimeout(scheduleBeat, 700);

    const draw = (ts) => {
      const t = ts / 1000;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;

      // Trail fade
      ctx.fillStyle = 'rgba(8, 8, 9, 0.18)';
      ctx.fillRect(0, 0, w, h);

      if (mode === 'bars' || mode === 'shader') drawBars(ctx, w, h, t, beatRef.current, mode === 'shader');
      else if (mode === 'circular') drawCircular(ctx, w, h, t, beatRef.current);
      else if (mode === 'wave') drawWave(ctx, w, h, t, beatRef.current);
      else if (mode === 'trail') drawTrail(ctx, w, h, t, beatRef.current);
      else if (mode === 'warp') drawWarp(ctx, w, h, t, beatRef.current);
      else drawBars(ctx, w, h, t, beatRef.current, false);

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(beatTimerRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  return React.createElement('canvas', {
    ref: canvasRef,
    style: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }
  });
}

function getAmp(i, total, t, beat) {
  const f = i / total;
  const energy = Math.pow(1 - f * 0.7, 1.2);
  const w1 = Math.sin(t * 1.9 + f * 9) * 0.28 + 0.72;
  const w2 = Math.sin(t * 2.6 + f * 14 + 1.2) * 0.14 + 0.86;
  const w3 = Math.sin(t * 0.8 + f * 4.5 + 2.4) * 0.08 + 0.92;
  const base = energy * w1 * w2 * w3;
  return beat ? Math.min(1, base * 1.35) : base;
}

function drawBars(ctx, w, h, t, beat, shader) {
  const n = 72;
  const gap = 2;
  const bw = (w - gap * (n - 1)) / n;

  for (let i = 0; i < n; i++) {
    const amp = getAmp(i, n, t, beat);
    const bh = amp * h * 0.78;
    const x = i * (bw + gap);
    const y = h - bh;

    if (shader) {
      // More saturated GPU-style
      const grad = ctx.createLinearGradient(0, h, 0, y);
      grad.addColorStop(0, `rgba(0, 229, 255, ${0.55 + amp * 0.35})`);
      grad.addColorStop(0.4, `rgba(100, 60, 255, ${0.45 + amp * 0.3})`);
      grad.addColorStop(1, `rgba(255, 45, 107, ${0.3 + amp * 0.5})`);
      ctx.fillStyle = grad;
      // Glow
      ctx.shadowColor = `rgba(194, 68, 255, ${amp * 0.7})`;
      ctx.shadowBlur = 8;
    } else {
      const grad = ctx.createLinearGradient(0, h, 0, y);
      grad.addColorStop(0, `rgba(0, 229, 255, ${0.5 + amp * 0.3})`);
      grad.addColorStop(0.65, `rgba(150, 80, 255, ${0.4 + amp * 0.3})`);
      grad.addColorStop(1, `rgba(194, 68, 255, ${0.3 + amp * 0.35})`);
      ctx.fillStyle = grad;
      ctx.shadowBlur = 0;
    }

    ctx.fillRect(x, y, bw, bh);

    // Peak cap
    if (amp > 0.55) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(194, 68, 255, ${(amp - 0.55) * 0.9})`;
      ctx.fillRect(x, y - 2, bw, 2);
    }
  }
  ctx.shadowBlur = 0;
}

function drawWave(ctx, w, h, t, beat) {
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  const scale = beat ? 1.4 : 1;
  for (let x = 0; x < w; x++) {
    const f = x / w;
    const y = h / 2
      + Math.sin(f * 12 + t * 2.2) * 60 * scale
      + Math.sin(f * 7 + t * 1.4) * 30 * scale
      + Math.sin(f * 20 + t * 3.1) * 15 * scale;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(0, 229, 255, 0.7)`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawCircular(ctx, w, h, t, beat) {
  const cx = w / 2, cy = h / 2;
  const n = 90;
  const baseR = Math.min(w, h) * 0.22;

  for (let i = 0; i < n; i++) {
    const amp = getAmp(i, n, t, beat);
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const len = amp * Math.min(w, h) * 0.25;
    const x1 = cx + Math.cos(angle) * baseR;
    const y1 = cy + Math.sin(angle) * baseR;
    const x2 = cx + Math.cos(angle) * (baseR + len);
    const y2 = cy + Math.sin(angle) * (baseR + len);

    const f = i / n;
    ctx.strokeStyle = `hsla(${180 + f * 100}, 100%, 65%, ${0.5 + amp * 0.4})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsla(${180 + f * 100}, 100%, 65%, ${amp * 0.5})`;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // Center ring
  ctx.beginPath();
  ctx.arc(cx, cy, baseR - 2, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(194, 68, 255, 0.2)`;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.stroke();
}

function drawTrail(ctx, w, h, t, beat) {
  // Extra persistence - just draw bars with more ghosting
  const n = 64;
  const gap = 3;
  const bw = (w - gap * (n - 1)) / n;
  const beatScale = beat ? 1.3 : 1;

  for (let i = 0; i < n; i++) {
    const amp = getAmp(i, n, t, beat) * beatScale;
    const bh = Math.min(h * 0.9, amp * h * 0.85);
    const x = i * (bw + gap);
    const grad = ctx.createLinearGradient(0, h, 0, h - bh);
    grad.addColorStop(0, `rgba(0, 229, 255, 0.12)`);
    grad.addColorStop(1, `rgba(194, 68, 255, ${0.5 + amp * 0.4})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, h - bh, bw, bh);
  }
}

function drawWarp(ctx, w, h, t, beat) {
  // Pseudo-psychedelic: concentric rings with warp
  const cx = w / 2, cy = h / 2;
  const rings = 8;
  for (let r = 0; r < rings; r++) {
    const radius = (r + 1) * Math.min(w, h) / (rings * 2);
    const warp = beat ? 20 : 8;
    ctx.beginPath();
    const steps = 120;
    for (let s = 0; s <= steps; s++) {
      const a = (s / steps) * Math.PI * 2;
      const noise = Math.sin(a * 4 + t * 1.5 + r) * warp
                  + Math.sin(a * 7 - t * 2.2 + r * 0.7) * warp * 0.5;
      const rx = cx + Math.cos(a) * (radius + noise);
      const ry = cy + Math.sin(a) * (radius + noise);
      s === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    const hue = (r * 30 + t * 20) % 360;
    ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.15 + (beat ? 0.2 : 0)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

Object.assign(window, { Visualizer });
