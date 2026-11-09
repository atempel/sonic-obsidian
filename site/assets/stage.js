/* Sonic Obsidian — landing: palco ao vivo.
 * Porte da classe Component do canvas (docs/design/landing/prototype/Main.dc.html, versão 1794165992-cb8e)
 * para DOM simples. Textos dinâmicos vêm de <script type="application/json" id="i18n"> de cada página.
 * Motor e presets são servidos de ../vendor (npm run site:vendor) e carregados depois da primeira pintura.
 */
(function () {
  'use strict';

  var T = JSON.parse(document.getElementById('i18n').textContent);
  var BASE = (document.currentScript && document.currentScript.src || '').replace(/assets\/stage\.js.*$/, '');
  var REPO = 'atempel/sonic-obsidian';
  var CYCLE_MS = 16000;
  var RENDER_SCALE = 1;
  var BPM = 122;
  var CH = [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]];
  var ROOTS = [33, 29, 36, 31];
  var CURATED = [
    'flexi + fishbrain - neon mindblob grafitti',
    'Flexi, martin + geiss - dedicated to the sherwin maxawow',
    'martin - mandelbox explorer - high speed demo version',
    'Geiss - Cauldron - painterly 2 (saturation remix)',
    'Rovastar + Loadus + Geiss - FractalDrop (Triple Mix)',
    'Flexi + Martin - cascading decay swing',
    'Zylot - True Visionary (Final Mix)',
    'martin - castle in the air',
    'Unchained - Rewop',
    'Eo.S. + Zylot - skylight (Stained Glass Majesty mix)',
    'Flexi - predator-prey-spirals',
    '_Geiss - Desert Rose 2',
    'martin - glass corridor',
    'Cope - The Neverending Explosion of Red Liquid Fire',
    'flexi - bouncing balls [double mindblob neon mix]',
    'Geiss - Reaction Diffusion 2',
    'martin - stormy sea (2010 update)',
    'Flexi - mindblob [shiny mix]',
    "TonyMilkdrop - Magellan's Nebula [Flexi - you enter first + multiverse]",
    'Unchained & Rovastar - Wormhole Pillars (Hall of Shadows mix)',
    'Martin - liquid arrows',
    'shifter - dark tides bdrv mix 2',
    'Geiss - Thumb Drum',
    'yin - 191 - Temporal singularities'
  ];

  /* ---------- movimento (spec 019: tokens e regras da v3) ---------- */
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)', T_FAST = 120, T_MED = 220;
  var RM = false;
  try { RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  // Anima só transform/opacity. Com movimento reduzido: fade ≤ 120 ms, sem deslocamento nem escala;
  // animações só de transform somem.
  function anim(el, frames, ms, delay) {
    if (!el || !el.animate) return null;
    if (RM) {
      var op = frames.map(function (f) { return f.opacity == null ? null : { opacity: f.opacity }; });
      if (op.some(function (f) { return f == null; })) return null;
      frames = op; ms = Math.min(ms, T_FAST); delay = 0;
    }
    return el.animate(frames, { duration: ms, delay: delay || 0, easing: EASE, fill: 'backwards' });
  }

  /* ---------- DOM ---------- */
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var R = {};
  qa('[data-ref]').forEach(function (el) { R[el.getAttribute('data-ref')] = el; });
  var cardTpl = q('#card-tpl');
  var cardGrid = cardTpl && cardTpl.parentNode;

  /* ---------- estado ---------- */
  var st = { cur: CURATED[0], source: 'idle', auto: true, muted: false, msg: '', page: 0, failed: false, total: 98 };
  var playlist = CURATED.slice();
  var all = null, viz = null, ctx = null, feed = null, analyser = null, buf = null;
  var w = 0, h = 0, frame = 0, lvl = 0, peak = 0, lastSwitch = 0, raf = 0;
  var visible = new Set(), motionGate = false;
  var comp = null, out = null, dly = null, noise = null, timer = null, nextTime = 0, stepN = 0;
  var micStream = null, micSrc = null;
  // Músicas da demo (Uppbeat). Só existem no site publicado (decifradas no deploy, spec 019);
  // sem elas, a demo usa a faixa sintetizada. Tocam em sequência.
  var TRACKS = [
    { file: 'demo-1.m4a', title: '24 Hrs In Tokyo', artist: 'Yawnathan', url: 'https://uppbeat.io/c/yawnathan' },
    { file: 'demo-2.m4a', title: 'Space Dancers', artist: '2050', url: 'https://uppbeat.io/c/2050-music' }
  ];
  var track = null, trackSrc = null, trackIdx = 0, hasTrack = false, usingTrack = false;
  var fbuf = null, bassAvg = 0, lastBeat = 0;
  var rotDrain = 0, lastPos = '';

  function set(patch) { for (var k in patch) st[k] = patch[k]; render(); }

  function splitName(n) {
    var clean = String(n || '').replace(/^[_$\s]+/, '');
    var i = clean.indexOf(' - ');
    if (i > 0) return { author: clean.slice(0, i), title: clean.slice(i + 3) };
    return { author: T.community, title: clean };
  }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function vals() {
    var p = splitName(st.cur);
    var L = playlist.length, idx = playlist.indexOf(st.cur);
    var total = all ? L : st.total;
    var per = 12, pages = Math.max(1, Math.ceil(L / per)), pg = st.page % pages;
    var isDemo = st.source === 'demo', isMic = st.source === 'mic';
    return {
      text: {
        demoLabel: isDemo ? T.demoOn : T.demoOff,
        micLabel: isMic ? T.micOn : T.micOff,
        soundLabel: st.muted ? T.muted : T.sound,
        sourceLabel: isDemo ? (usingTrack ? 'DEMO · ' + TRACKS[trackIdx].title.toUpperCase() : T.srcDemo) : (isMic ? T.srcMic : T.srcIdle),
        trackCredit: '‘' + TRACKS[trackIdx].title + '’' + T.creditBy + TRACKS[trackIdx].artist + T.creditOn,
        curAuthor: p.author, curTitle: p.title,
        curPos: pad2((idx < 0 ? 0 : idx) + 1) + ' / ' + total,
        presetCount: String(total),
        msg: st.msg,
        libPageLabel: (pg + 1) + ' / ' + pages
      },
      flag: {
        isDemo: isDemo, notDemo: !isDemo, isMuted: st.muted, notMuted: !st.muted,
        hasMsg: !!st.msg, engineFailed: st.failed, hasTrack: isDemo && usingTrack
      },
      pressed: {
        demoPressed: isDemo, micPressed: isMic, autoPressed: st.auto, soundPressed: !st.muted
      },
      lib: playlist.slice(pg * per, pg * per + per).map(function (n, i) {
        var s = splitName(n);
        return { name: n, num: pad2(pg * per + i + 1), author: s.author, title: s.title, on: n === st.cur };
      })
    };
  }

  // M02: o texto antigo sobe 4 px e some (t-fast); o novo entra de baixo (t-med).
  var SWAP = { curTitle: 0, curAuthor: 40 };
  function swapText(el, t, delay) {
    if (!el.textContent || !el.animate) { el.textContent = t; return; }
    var tok = (el._tok || 0) + 1; el._tok = tok;
    if (el._out) el._out.cancel();
    el.style.display = 'inline-block';
    el._out = RM ? null : el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: T_FAST, easing: EASE, fill: 'forwards' });
    var go = function () {
      if (el._tok !== tok) return;
      if (el._out) { el._out.cancel(); el._out = null; }
      el.textContent = t;
      anim(el, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], T_MED, delay);
    };
    if (el._out) el._out.onfinish = go; else go();
  }

  var libKey = '', libTok = 0, booted = false;
  function fillCard(el, c) {
    q('[data-card="num"]', el).textContent = c.num;
    q('[data-card="title"]', el).textContent = c.title;
    q('[data-card="author"]', el).textContent = c.author;
  }
  function setOn(el, on) {
    var badge = q('[data-card="on"]', el);
    if (on && badge.hidden && booted) anim(badge, [{ opacity: 0 }, { opacity: 1 }], T_MED);
    badge.hidden = !on;
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function buildLib(lib, animate) {
    qa('.so-card', cardGrid).forEach(function (el) { el.remove(); });
    lib.forEach(function (c, i) {
      var el = cardTpl.content.firstElementChild.cloneNode(true);
      el._name = c.name;
      fillCard(el, c);
      setOn(el, c.on);
      el.addEventListener('click', function () { pick(c.name); });
      cardGrid.appendChild(el);
      // M12: degrau de 15 ms só nos 8 primeiros.
      if (animate) anim(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], T_MED, i < 8 ? i * 15 : 120);
    });
  }

  function render() {
    var v = vals();
    qa('[data-text]').forEach(function (el) {
      var k = el.getAttribute('data-text'), t = v.text[k];
      if (t == null || el.textContent === t) return;
      if (booted && k in SWAP) swapText(el, t, SWAP[k]); else el.textContent = t;
    });
    if (booted && v.text.curPos !== lastPos && R.pos) {
      R.pos.classList.add('on');
      setTimeout(function () { R.pos.classList.remove('on'); }, T_FAST);
    }
    lastPos = v.text.curPos;
    qa('[data-if]').forEach(function (el) {
      var show = !!v.flag[el.getAttribute('data-if')];
      if (show && el.hidden && booted) {
        // troca de ícone (play/pause, som/mudo) com escala cruzada; mensagens com fade
        var kid = el.firstElementChild;
        if (kid) anim(kid, [{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], T_FAST);
      }
      el.hidden = !show;
    });
    qa('[data-pressed]').forEach(function (el) {
      el.setAttribute('aria-pressed', v.pressed[el.getAttribute('data-pressed')] ? 'true' : 'false');
    });
    if (R.rot) R.rot.parentNode.classList.toggle('off', !st.auto);
    if (!cardTpl) return;
    var key = v.lib.map(function (c) { return c.name; }).join('|');
    if (key === libKey) {
      qa('.so-card', cardGrid).forEach(function (el, i) { if (v.lib[i]) setOn(el, v.lib[i].on); });
      return;
    }
    var first = !libKey;
    libKey = key;
    if (first || !booted) { buildLib(v.lib, false); return; }
    // os antigos saem sem degrau (180 ms), os novos entram em degrau; interrompível
    var tok = ++libTok, old = qa('.so-card', cardGrid);
    if (RM || !old.length || !old[0].animate) { buildLib(v.lib, true); return; }
    var outs = old.map(function (el) { return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: EASE, fill: 'forwards' }); });
    outs[0].onfinish = function () { if (tok === libTok) buildLib(vals().lib, true); };
  }

  /* ---------- ações ---------- */
  var ACT = {
    demo: function () { if (st.source === 'demo') { stopDemo(); set({ source: 'idle' }); } else startDemo(); },
    mic: function () { if (st.source === 'mic') { stopMic(); set({ source: 'idle' }); } else startMic(); },
    next: function () { nudge('next', 2); step(1); },
    prev: function () { nudge('prev', -2); step(-1); },
    shuffle: function () {
      // M05: as setas trocam de lugar
      var b = q('[data-act="shuffle"]'); if (b) b.classList.toggle('sw');
      shuffle();
    },
    auto: function () {
      lastSwitch = performance.now();
      var on = !st.auto;
      // M06: ao ligar, o ícone gira 180°; ao desligar, só esmaece (CSS)
      if (on) anim(q('[data-act="auto"] svg'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], T_MED);
      set({ auto: on });
    },
    mute: toggleMute,
    more: function () { set({ page: st.page + 1 }); }
  };
  // M04: o ícone dá um passo de 2 px na direção
  function nudge(act, dx) {
    anim(q('[data-act="' + act + '"] svg'), [{ transform: 'none' }, { transform: 'translateX(' + dx + 'px)', offset: 0.35 }, { transform: 'none' }], T_MED);
  }
  qa('[data-act]').forEach(function (el) {
    var fn = ACT[el.getAttribute('data-act')];
    if (fn) el.addEventListener('click', fn);
  });
  // Teclado no palco, só com o foco no console (sem atalho global): ←/→ preset, R rotação, M mudo.
  var consoleEl = q('.so-console');
  if (consoleEl) consoleEl.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key, fn = null;
    if (k === 'ArrowRight') fn = ACT.next;
    else if (k === 'ArrowLeft') fn = ACT.prev;
    else if (k === 'r' || k === 'R') fn = ACT.auto;
    else if (k === 'm' || k === 'M') fn = ACT.mute;
    if (fn) { e.preventDefault(); fn(); }
  });

  function flash() {
    [R.beat, R.heart, R.mark].forEach(function (b) {
      if (!b) return;
      b.classList.add('on');
      setTimeout(function () { b.classList.remove('on'); }, 110);
    });
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!viz || visible.size === 0) return;
    drawMeter(); // informação: segue mesmo com movimento reduzido (cai até apagar)
    if (motionGate && st.source === 'idle') return;
    resize();
    viz.render();
    frame++;
    if (frame % 2 === 0) mirror();
    if (usingTrack && st.source === 'demo') detectBeat();
    var now = performance.now();
    // M03: a linha enche até a próxima troca automática
    if (R.rot && st.auto && now > rotDrain) R.rot.style.transform = 'scaleX(' + Math.min(1, (now - lastSwitch) / CYCLE_MS).toFixed(4) + ')';
    if (st.auto && now - lastSwitch > CYCLE_MS) step(1);
  }

  // Batida da música: energia dos graves (~40–170 Hz) acima da média recente.
  function detectBeat() {
    if (!fbuf) fbuf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fbuf);
    var e = (fbuf[1] + fbuf[2] + fbuf[3]) / 3;
    var now = performance.now();
    if (e > bassAvg * 1.18 && e > 140 && now - lastBeat > 280) { lastBeat = now; flash(); }
    bassAvg = bassAvg * 0.94 + e * 0.06;
  }

  /* ---------- motor ---------- */
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  function boot() {
    Promise.all([
      loadScript(BASE + 'vendor/butterchurn.min.js'),
      loadScript(BASE + 'vendor/butterchurnPresets.min.js')
    ]).then(init, function () { set({ failed: true }); });
  }

  function init() {
    var BC = window.butterchurn; BC = BC && (BC.default || BC);
    var BP = window.butterchurnPresets; BP = BP && (BP.default || BP);
    try {
      all = BP.getPresets();
      var names = Object.keys(all);
      var cur = CURATED.filter(function (n) { return all[n]; });
      var rest = names.filter(function (n) { return cur.indexOf(n) < 0; });
      playlist = cur.concat(rest);
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      feed = ctx.createGain();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      feed.connect(analyser);
      resize(true);
      viz = BC.createVisualizer(ctx, R.canvas, { width: w, height: h, pixelRatio: 1, textureRatio: 1 });
      viz.connectAudio(feed);
      var first = playlist[0];
      viz.loadPreset(all[first], 0);
      lastSwitch = performance.now();
      set({ cur: first, total: names.length });
    } catch (e) {
      viz = null;
      set({ failed: true });
      return;
    }
    try { motionGate = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { motionGate = false; }
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      }, { rootMargin: '120px' });
      if (R.hero) io.observe(R.hero);
      if (R.modes) io.observe(R.modes);
    } else {
      visible.add(R.canvas);
    }
    loop();
  }

  function resize(force) {
    var c = R.canvas; if (!c) return;
    var sc = RENDER_SCALE * Math.min(window.devicePixelRatio || 1, 1.5);
    var nw = Math.max(16, Math.round(c.clientWidth * sc));
    var nh = Math.max(16, Math.round(c.clientHeight * sc));
    if (!force && nw === w && nh === h) return;
    w = nw; h = nh;
    c.width = w; c.height = h;
    if (viz) viz.setRendererSize(w, h);
  }

  function mirror() {
    var src = R.canvas, list = [R.m1, R.m2, R.m3];
    if (!src || !src.width) return;
    for (var i = 0; i < list.length; i++) {
      var m = list[i]; if (!m) continue;
      var g = m.getContext('2d'); if (!g) continue;
      var W = m.width, H = m.height, sw = src.width, sh = src.height;
      var r = Math.max(W / sw, H / sh), cw = W / r, chh = H / r;
      g.drawImage(src, (sw - cw) / 2, (sh - chh) / 2, cw, chh, 0, 0, W, H);
    }
  }

  function drawMeter() {
    var m = R.meter; if (!m || !analyser) return;
    var g = m.getContext('2d'); if (!g) return;
    if (!buf) buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    var db = 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-6);
    var v = Math.max(0, Math.min(1, (db + 48) / 46));
    // M08: ataque imediato (~1 quadro), queda linear de ~1 s da escala cheia → no silêncio
    // os segmentos apagam em cascata, ~30 ms cada.
    var now = performance.now(), dt = Math.min(0.1, (now - (drawMeter.t || now)) / 1000);
    drawMeter.t = now;
    lvl = v > lvl ? v : Math.max(v, lvl - dt * 1.0);
    peak = v > peak ? v : Math.max(0, peak - dt * 0.45);
    var N = 32, W = m.width, H = m.height, gap = 2, sw = (W - gap * (N - 1)) / N;
    var lit = Math.round(lvl * N), pk = Math.min(N - 1, Math.round(peak * N));
    g.clearRect(0, 0, W, H);
    for (var k = 0; k < N; k++) {
      var col = k >= N - 3 ? '#FF2D6B' : (k >= N * 0.7 ? '#C244FF' : '#00E5FF');
      g.fillStyle = (k < lit || (k === pk && peak > 0.02)) ? col : '#1D1D28';
      g.fillRect(k * (sw + gap), 0, sw, H);
    }
  }

  function loadByName(n, blend) {
    if (viz && all && all[n]) {
      try { viz.loadPreset(all[n], blend == null ? 2.7 : blend); } catch (e) {}
    }
    // M03: a linha esvazia da direita para a esquerda e recomeça
    if (R.rot && st.auto && R.rot.animate) {
      var from = R.rot.style.transform || 'scaleX(0)';
      R.rot.style.transform = 'scaleX(0)';
      rotDrain = performance.now() + T_MED;
      anim(R.rot, [{ transform: from }, { transform: 'scaleX(0)' }], T_MED);
    }
    lastSwitch = performance.now();
    set({ cur: n });
  }
  function step(d) {
    var L = playlist.length, i = playlist.indexOf(st.cur);
    loadByName(playlist[((i < 0 ? 0 : i) + d + L) % L]);
  }
  function shuffle() {
    var L = playlist.length, i = playlist.indexOf(st.cur), j = i;
    while (j === i && L > 1) j = Math.floor(Math.random() * L);
    loadByName(playlist[j], 1.6);
  }
  function pick(n) {
    loadByName(n, 1.4);
    if (R.hero && R.hero.scrollIntoView) R.hero.scrollIntoView({ behavior: motionGate ? 'auto' : 'smooth', block: 'start' });
  }
  function toggleMute() {
    var m = !st.muted;
    if (out && ctx) out.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.03);
    set({ muted: m });
  }

  /* ---------- áudio: faixa sintetizada ---------- */
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensureOut() {
    if (out) return;
    out = ctx.createGain(); out.gain.value = st.muted ? 0 : 0.7;
    out.connect(ctx.destination);
  }

  function buildSynth() {
    var c = ctx;
    ensureOut();
    comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(out);
    comp.connect(feed);
    dly = c.createDelay(1.5); dly.delayTime.value = (60 / BPM) * 0.75;
    var fb = c.createGain(); fb.gain.value = 0.38;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    var wet = c.createGain(); wet.gain.value = 0.32;
    dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(wet); wet.connect(comp);
    var len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise = b;
  }

  function startDemo() {
    if (!ctx) { set({ msg: st.failed ? '' : T.loading }); return; }
    try { ctx.resume(); } catch (e) {}
    stopMic();
    lastSwitch = performance.now();
    if (hasTrack) {
      playTrack().then(function () {
        usingTrack = true;
        set({ source: 'demo', msg: '' });
      }, function () {
        hasTrack = false; startSynth();
      });
      return;
    }
    startSynth();
  }
  function startSynth() {
    usingTrack = false;
    if (!comp) buildSynth();
    if (!timer) {
      nextTime = ctx.currentTime + 0.08;
      stepN = 0;
      timer = setInterval(schedule, 25);
    }
    set({ source: 'demo', msg: '' });
  }
  function stopDemo() {
    if (timer) { clearInterval(timer); timer = null; }
    if (track) track.pause();
  }

  function loadTrack(i) {
    trackIdx = i;
    track.src = BASE + 'assets/audio/' + TRACKS[i].file;
    if (R.trackLink) R.trackLink.href = TRACKS[i].url;
  }
  function playTrack() {
    if (!track) {
      track = new Audio();
      track.preload = 'auto';
      track.addEventListener('ended', function () {
        // próxima faixa da lista, em sequência
        loadTrack((trackIdx + 1) % TRACKS.length);
        track.play().catch(function () {});
        render();
      });
      loadTrack(0);
      ensureOut();
      trackSrc = ctx.createMediaElementSource(track);
      trackSrc.connect(out);
      trackSrc.connect(feed);
    }
    var p = track.play();
    return p && p.then ? p : Promise.resolve();
  }

  // As músicas só existem no site publicado; aqui só se confere se a primeira está lá.
  function probeTrack() {
    if (!window.fetch) return;
    fetch(BASE + 'assets/audio/' + TRACKS[0].file, { method: 'HEAD' })
      .then(function (r) { hasTrack = r.ok; })
      .catch(function () { hasTrack = false; });
  }

  function startMic() {
    if (!ctx) { set({ msg: st.failed ? '' : T.loading }); return; }
    try { ctx.resume(); } catch (e) {}
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { set({ msg: T.noMic }); return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then(function (s) {
        stopDemo();
        micStream = s;
        micSrc = ctx.createMediaStreamSource(s);
        micSrc.connect(feed);
        set({ source: 'mic', msg: '' });
      })
      .catch(function () { set({ msg: T.micBlocked }); });
  }
  function stopMic() {
    if (micSrc) { try { micSrc.disconnect(); } catch (e) {} micSrc = null; }
    if (micStream) { micStream.getTracks().forEach(function (t) { t.stop(); }); micStream = null; }
  }

  function schedule() {
    var spb = 60 / BPM / 4;
    while (nextTime < ctx.currentTime + 0.12) {
      playStep(stepN, nextTime, spb);
      nextTime += spb;
      stepN = (stepN + 1) % 256;
    }
  }

  function playStep(s, t, spb) {
    var bar = Math.floor(s / 16), pos = s % 16, ci = bar % 4, ch = CH[ci], root = ROOTS[ci];
    var intro = bar < 4, brk = bar === 12 || bar === 13, build = bar >= 14, full = !intro && !brk && !build;
    if (pos === 0) pad(t, ch, 16 * spb);
    if ((full || build) && pos % 4 === 0) kick(t);
    if (bar === 15 && pos >= 8 && pos % 2 === 0 && pos % 4 !== 0) kick(t);
    if (full && (pos === 4 || pos === 12)) noiseHit(t, 'bandpass', 1500, 0.9, 0.5, 0.16);
    if ((bar >= 2 && !brk) && pos % 4 === 2) noiseHit(t, 'highpass', 7500, 0.7, 0.2, 0.09);
    if (full && pos % 2 === 1) noiseHit(t, 'highpass', 9500, 0.7, 0.06, 0.03);
    if ((full || build) && pos % 2 === 0) bass(t, root + (pos % 4 === 2 ? 12 : 0), spb * 1.8);
    var seq = [0, 1, 2, 1, 2, 0, 1, 2];
    if ((intro && pos % 2 === 0) || (!intro)) arp(t, ch[seq[pos % 8]] + 12 + (pos >= 8 ? 12 : 0));
    if (bar === 14 && pos === 0) riser(t, 32 * spb);
  }

  function kick(t) {
    var c = ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.5);
    setTimeout(flash, Math.max(0, (t - c.currentTime) * 1000));
  }
  function noiseHit(t, type, freq, qv, pk, dec) {
    var c = ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = qv;
    g.gain.setValueAtTime(pk, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
    s.connect(f); f.connect(g); g.connect(comp);
    s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.02);
  }
  function bass(t, m, d) {
    var c = ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(m);
    f.type = 'lowpass'; f.Q.value = 7;
    f.frequency.setValueAtTime(1100, t); f.frequency.exponentialRampToValueAtTime(160, t + d * 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(f); f.connect(g); g.connect(comp); o.start(t); o.stop(t + d + 0.02);
  }
  function pad(t, notes, d) {
    var c = ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1900, t + d * 0.5); f.frequency.linearRampToValueAtTime(800, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.055, t + 0.5);
    g.gain.setValueAtTime(0.055, t + d - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.4);
    f.connect(g); g.connect(comp);
    notes.forEach(function (m) {
      [-8, 8].forEach(function (dt) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
        o.connect(f); o.start(t); o.stop(t + d + 0.5);
      });
    });
  }
  function arp(t, m) {
    var c = ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(comp); g.connect(dly); o.start(t); o.stop(t + 0.25);
  }
  function riser(t, d) {
    var c = ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise; s.loop = true;
    f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + d); g.gain.setValueAtTime(0.0001, t + d + 0.01);
    s.connect(f); f.connect(g); g.connect(comp); s.start(t); s.stop(t + d + 0.05);
  }

  /* ---------- última release (api.github.com, com reserva) ---------- */
  function release() {
    if (!window.fetch) return;
    fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.tag_name) return;
        qa('[data-rel="version"]').forEach(function (el) { el.textContent = j.tag_name; });
        if (j.published_at) {
          var d = new Date(j.published_at);
          var txt;
          try { txt = d.toLocaleDateString(T.locale, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { txt = j.published_at.slice(0, 10); }
          qa('[data-rel="date"]').forEach(function (el) { el.textContent = txt.toUpperCase(); });
        }
        (j.assets || []).forEach(function (a) {
          var key = /\.exe$/i.test(a.name) ? 'sizeExe' : (/\.zip$/i.test(a.name) ? 'sizeZip' : '');
          if (!key || !a.size) return;
          qa('[data-rel="' + key + '"]').forEach(function (el) { el.textContent = ' · ' + (a.size / 1048576).toFixed(0) + ' MB'; });
        });
      })
      .catch(function () { /* reserva: mantém "Latest release" / "—" */ });
  }

  /* ---------- página: navegação, seções, perguntas ---------- */
  // M10: sublinhado da navegação desliza até a seção visível.
  function navSpy() {
    var bar = R.navbar, links = qa('.so-navlinks a[href^="#"]');
    if (!bar || !window.IntersectionObserver) return;
    var byId = {}, cur = null;
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    function place(a) {
      links.forEach(function (l) { l.classList.toggle('cur', l === a); });
      if (!a) { bar.style.opacity = '0'; return; }
      bar.style.transform = 'translateX(' + a.offsetLeft + 'px) scaleX(' + a.offsetWidth + ')';
      bar.style.opacity = '1';
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = byId[e.target.id];
        if (e.isIntersecting) cur = a; else if (cur === a) cur = null;
      });
      place(cur);
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    window.addEventListener('resize', function () { place(cur); });
  }

  // Entrada das seções ao rolar (regra da M01): uma vez, 6 px, degrau de 20 ms nos 8 primeiros.
  function reveal() {
    if (RM || !window.IntersectionObserver) return;
    var groups = [];
    qa('.so-sec').forEach(function (sec) {
      var items = qa(':scope > p.so-mono, :scope > div > p.so-mono, :scope .so-h2', sec);
      qa('.so-g3 > *, .so-tl > li, details', sec).forEach(function (el) { items.push(el); });
      if (items.length) groups.push({ sec: sec, items: items });
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target._items.forEach(function (el, i) {
          el.style.setProperty('--d', (i < 8 ? i * 20 : 160) + 'ms');
          el.classList.add('in');
        });
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    groups.forEach(function (g) {
      var r = g.sec.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) return; // já visível ao abrir: sem animação
      g.items.forEach(function (el) { el.classList.add('so-rv'); });
      g.sec._items = g.items;
      io.observe(g.sec);
    });
  }

  // Perguntas: o conteúdo aberto entra com fade e 4 px de subida.
  qa('.so details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      var body = d.querySelector(':scope > :not(summary)');
      anim(body, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], T_FAST);
    });
  });

  /* ---------- partida ---------- */
  render();
  booted = true;
  navSpy();
  reveal();
  function afterPaint() {
    var go = function () { boot(); release(); probeTrack(); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1200 });
    else setTimeout(go, 200);
  }
  if (document.readyState === 'complete') afterPaint();
  else window.addEventListener('load', afterPaint);
})();
