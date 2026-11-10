// Simulador offline da detecção de batida (spec 024): roda `src/renderer/src/beat.ts` em Node com
// músicas sintéticas (house, techno, hip-hop, breakbeat, ambiente, silêncio) e mede tempo até
// travar, erro de BPM, erro de fase das batidas e tempo travado. Não substitui o teste com música
// real no Windows; serve para calibrar `BEAT` e pegar regressões. Uso: `node tests/sim/beat-sim.cjs`.
const ts = require('typescript'), fs = require('fs'), path = require('path')
const src = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/beat.ts'), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }; new Function('module', 'exports', 'performance', js)(mod, mod.exports, { now: () => Date.now() })
const { BeatTracker, BEAT } = mod.exports

const SR = 48000
let seed = 1; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1

/** Gera `sec` segundos. `beats` = tempos verdadeiros das batidas (s). */
function track(kind, bpm, sec) {
  const n = SR * sec, x = new Float32Array(n), beats = []
  const P = 60 / bpm
  const add = (t0, fn, len) => { const a = Math.floor(t0 * SR); for (let i = 0; i < len * SR && a + i < n; i++) x[a + i] += fn(i / SR) }
  const kick = (t) => 0.9 * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-t * 35)) * t) * Math.exp(-t * 9)
  const snare = (t) => 0.35 * (rnd() * Math.exp(-t * 25) + 0.5 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30))
  const hat = (t) => 0.08 * rnd() * Math.exp(-t * 60)
  const ohat = (t) => 0.1 * rnd() * Math.exp(-t * 12)
  if (kind === 'ambient') {
    for (let i = 0; i < n; i++) { const t = i / SR; const l = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / 7); x[i] = 0.2 * l * (Math.sin(2 * Math.PI * 55 * t) + 0.7 * Math.sin(2 * Math.PI * 82.4 * t + Math.sin(t)) + 0.5 * Math.sin(2 * Math.PI * 110 * t)) + 0.02 * rnd() }
    return { x, beats }
  }
  if (kind === 'silence') return { x, beats }
  const swing = kind === 'hiphop' ? 0.08 : 0
  for (let b = 0, t = 0.37; t < sec; b++, t = 0.37 + b * P) {
    beats.push(t)
    const bar = b % 4
    if (kind === 'house' || kind === 'techno') {
      add(t, kick, 0.4)
      add(t + P / 2, ohat, 0.2)
      if (bar === 1 || bar === 3) add(t, snare, 0.25)
      for (let k = 0; k < 4; k++) add(t + (k * P) / 4, hat, 0.05)
    } else if (kind === 'hiphop') {
      if (bar === 0 || (bar === 2 && b % 8 < 4)) add(t, kick, 0.4)
      if (bar === 2 && b % 8 >= 4) add(t + P * 0.5 + swing, kick, 0.4)
      if (bar === 1 || bar === 3) add(t, snare, 0.3)
      if (bar === 1) add(t + P * 0.75, kick, 0.3)
      for (let k = 0; k < 2; k++) add(t + (k * P) / 2 + (k ? swing * P : 0), hat, 0.05)
    } else if (kind === 'breaks') {
      const pat = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0] // kick em 16 avos, por compasso de 2 batidas
      for (let k = 0; k < 8; k++) if (pat[(b % 2) * 8 + k]) add(t + (k * P) / 8, kick, 0.3)
      if (b % 2 === 1) add(t, snare, 0.3)
      for (let k = 0; k < 4; k++) add(t + (k * P) / 4, hat, 0.04)
    }
  }
  // Baixo: contínuo e com "pumping" (sidechain) no house; rumble em 16 avos no techno; longo no hip-hop.
  const notes = [55, 55, 65.4, 49]
  for (let i = 0; i < n; i++) {
    const t = i / SR, ph = ((t - 0.37) / P) % 1, beatIdx = Math.floor((t - 0.37) / P)
    if (t < 0.37) continue
    const f = notes[Math.floor(beatIdx / 4) % 4]
    if (kind === 'house') x[i] += 0.35 * Math.min(1, ph * 4) * Math.sin(2 * Math.PI * f * t)
    if (kind === 'techno') { const s = ((t - 0.37) / (P / 4)) % 1; x[i] += 0.3 * Math.exp(-s * 6) * Math.sin(2 * Math.PI * 45 * t) }
    if (kind === 'hiphop') x[i] += 0.3 * Math.sin(2 * Math.PI * f * t) * (0.7 + 0.3 * Math.cos(2 * Math.PI * t / (4 * P)))
    if (kind === 'breaks') x[i] += 0.25 * Math.sin(2 * Math.PI * f * 0.5 * t)
    x[i] += 0.06 * Math.sin(2 * Math.PI * 220 * t) * Math.sin(2 * Math.PI * 330 * t) + 0.01 * rnd() // pad e ruído
  }
  // Compressão simples (master "alto", como música comercial).
  for (let i = 0; i < n; i++) x[i] = Math.tanh(x[i] * 1.5) / 1.2
  return { x, beats }
}

function run({ kind, bpm, sec = 40, fps = 60, jitter = 0.2, latencyMs = 0, swap, breakdown }) {
  let a = track(kind, bpm, sec)
  if (swap) { const b = track(swap.kind, swap.bpm, sec); const at = Math.floor(swap.at * SR); a.x.set(b.x.subarray(at), at); a.beats = a.beats.filter((t) => t < swap.at).concat(b.beats.filter((t) => t >= swap.at)) }
  // Break: de `breakdown.at` por `breakdown.len` s, sem bumbo nem baixo (só pad baixo e chimbal), como numa virada.
  if (breakdown) {
    const b = track('ambient', 0, sec), a0 = Math.floor(breakdown.at * SR), a1 = Math.floor((breakdown.at + breakdown.len) * SR)
    for (let i = a0; i < a1 && i < a.x.length; i++) a.x[i] = 0.4 * b.x[i] + 0.05 * rnd()
  }
  // Silêncio como o app vê: o medidor só declara silêncio depois de 3 s quietos.
  let quietSince = null
  const fft = 32768
  let cur = 0
  const tap = { fftSize: fft, getFloatTimeDomainData(buf) { const end = Math.floor(cur * SR); for (let i = 0; i < fft; i++) { const j = end - fft + i; buf[i] = j >= 0 && j < a.x.length ? a.x[j] : 0 } } }
  const ctx = { sampleRate: SR, get currentTime() { return cur } }
  const states = []
  const bt = new BeatTracker(tap, ctx, (locked, b) => states.push({ t: cur, locked, bpm: b }))
  const diag = { crest: [], comb: [], acf: [], attack: [] }
  const ticks = []; let lockedTime = 0, firstLock = null, bpms = []
  for (let t = 0; t < sec; ) {
    const dt = (1 / fps) * (1 + jitter * rnd())
    t += dt; cur = Math.round(t * SR) / SR
    let rms = 0; const j0 = Math.floor(cur * SR); for (let j = Math.max(0, j0 - 1024); j < j0; j++) rms += a.x[j] * a.x[j]; rms = Math.sqrt(rms / 1024)
    if (rms >= 0.0005) quietSince = null; else if (quietSince === null) quietSince = t
    const n = bt.update(t * 1000, quietSince !== null && t - quietSince >= 3)
    if (n > 0) ticks.push(cur - latencyMs / 1000)
    if (t > 6 && rnd() > 0.9) { diag.crest.push(bt.crest); diag.comb.push(bt.comb); diag.acf.push(bt.acfPeak); diag.attack.push(bt.attack) }
    if (bt.locked) { lockedTime += dt; if (firstLock === null) firstLock = t; if (t > sec / 2) bpms.push(bt.bpm) }
  }
  // Erro de fase: para cada tique depois da trava, distância até a batida verdadeira mais próxima.
  const errs = []
  for (const tk of ticks) { if (tk < (firstLock ?? 0) + 2) continue; let best = Infinity; for (const b of a.beats) { const d = (tk - b) * 1000; if (Math.abs(d) < Math.abs(best)) best = d } if (Number.isFinite(best)) errs.push(best) }
  const med = (v) => (v.length ? [...v].sort((p, q) => p - q)[Math.floor(v.length / 2)] : NaN)
  const absErrs = errs.map(Math.abs)
  return {
    kind: swap ? `${kind}→${swap.kind}` : kind, bpm, fps,
    lockS: firstLock === null ? '—' : firstLock.toFixed(1),
    lockedPct: Math.round((lockedTime / sec) * 100),
    bpmOut: bpms.length ? med(bpms).toFixed(1) : '—',
    phaseMedMs: errs.length ? med(errs).toFixed(0) : '—',
    phaseP90Ms: absErrs.length ? [...absErrs].sort((p, q) => p - q)[Math.floor(absErrs.length * 0.9)].toFixed(0) : '—',
    flips: states.length,
    loseS: swap ? ((states.find((st) => !st.locked && st.t >= swap.at)?.t ?? NaN) - swap.at).toFixed(1) : '',
    changeS: swap && swap.bpm ? ((states.find((st) => st.locked && st.t >= swap.at && Math.abs(st.bpm / swap.bpm - 1) < 0.03)?.t ?? NaN) - swap.at).toFixed(1) : '',
    endBpm: bt.bpm.toFixed(1),
    crest: med(diag.crest).toFixed(1), comb: med(diag.comb).toFixed(1), acf: med(diag.acf).toFixed(2), attack: med(diag.attack).toFixed(2)
  }
}

const cases = [
  { kind: 'house', bpm: 124 }, { kind: 'house', bpm: 128, fps: 30 }, { kind: 'techno', bpm: 132 },
  { kind: 'hiphop', bpm: 90 }, { kind: 'breaks', bpm: 172 }, { kind: 'house', bpm: 122, fps: 20, jitter: 0.5 },
  { kind: 'ambient', bpm: 0 }, { kind: 'silence', bpm: 0 },
  { kind: 'house', bpm: 124, swap: { kind: 'ambient', bpm: 0, at: 20 } }, { kind: 'ambient', bpm: 0, swap: { kind: 'techno', bpm: 128, at: 15 } },
  { kind: 'house', bpm: 124, swap: { kind: 'silence', bpm: 0, at: 20 } }, { kind: 'house', bpm: 124, breakdown: { at: 15, len: 8 } },
  { kind: 'house', bpm: 124, sec: 50, swap: { kind: 'techno', bpm: 140, at: 20 } }
]
if (require.main === module) console.table(cases.map((c) => run(c)))
module.exports = { run, track, BeatTracker, BEAT, SR }
