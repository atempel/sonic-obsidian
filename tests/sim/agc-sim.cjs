// Simulador offline do "Normalizar áudio" (spec 028 P1, revisto pela spec 046): roda `src/renderer/src/agc.ts` em Node com
// uma faixa sintética (bumbo, baixo, chimbal, pad) em níveis diferentes, lida como no app: a cada
// 100 ms, o RMS das últimas 1024 amostras antes do ganho. Não substitui o teste com música real no
// Windows (critério 7); serve para calibrar `AGC` e pegar regressões. Uso: `node tests/sim/agc-sim.cjs`.
const ts = require('typescript'), fs = require('fs'), path = require('path')
const src = fs.readFileSync(path.join(__dirname, '../../src/renderer/src/agc.ts'), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }; new Function('module', 'exports', js)(mod, mod.exports)
const { AutoGain, AGC, manualDb } = mod.exports

const SR = 48000, FRAME = 1024, TICK = 0.1, SILENCE_RMS = 0.0005
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1

/** Uma amostra da faixa no tempo t. `part`: 'full' (tudo), 'break' (só pad e chimbal), 'silence'. */
function sample(t, part) {
  if (part === 'silence') return 0
  const P = 60 / 124, ph = (t % P) / P
  const pad = 0.12 * (Math.sin(2 * Math.PI * 220 * t) + 0.6 * Math.sin(2 * Math.PI * 277.2 * t) + 0.4 * Math.sin(2 * Math.PI * 329.6 * t))
  const hat = 0.05 * rnd() * Math.exp(-((t % (P / 4)) / (P / 4)) * 8)
  if (part === 'break') return pad + hat
  const kick = 0.9 * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-ph * P * 35)) * ph * P) * Math.exp(-ph * P * 9)
  const bass = 0.3 * Math.sin(2 * Math.PI * 55 * t) * (0.6 + 0.4 * Math.exp(-(((t + P / 2) % P) / P) * 5))
  return kick + bass + pad + hat
}

/** RMS (dBFS) da parte 'full' sem ganho, para normalizar a faixa ao nível pedido. */
const FULL_DB = (() => { let s = 0, n = 0; for (let t = 0; t < 8; t += 1 / SR) { const v = sample(t, 'full'); s += v * v; n++ } return 10 * Math.log10(s / n) })()

/**
 * Roda um roteiro: lista de trechos { part, s, db?, breath? } (db = nível RMS da parte 'full' naquele
 * trecho; breath = Respiro ligado: o som segue, o AGC congela).
 * Devolve uma linha por leitura (100 ms): tempo, trecho, RMS lido (dBFS) e ganho automático (dB).
 */
function run(script, { fine = 0 } = {}) {
  const agc = new AutoGain()
  const out = []
  let t = 0
  for (const seg of script) {
    const k = 10 ** (((seg.db ?? -14) - FULL_DB) / 20)
    const ticks = Math.round(seg.s / TICK)
    for (let i = 0; i < ticks; i++) {
      t += TICK
      let sq = 0
      for (let j = FRAME - 1; j >= 0; j--) { const v = k * sample(t - j / SR, seg.part); sq += v * v }
      const rms = Math.sqrt(sq / FRAME)
      const g = agc.step(rms, TICK, { quiet: rms < SILENCE_RMS, breath: !!seg.breath })
      out.push({ t, part: seg.part, breath: !!seg.breath, db: seg.db ?? null, rmsDb: rms > 0 ? 20 * Math.log10(rms) : -Infinity, gain: g, total: g + manualDb(fine, true), level: agc.levelDb, win: agc.windowDur, restarts: agc.restarts })
    }
  }
  return { out, agc }
}

const at = (out, t) => out.reduce((best, o) => (Math.abs(o.t - t) < Math.abs(best.t - t) ? o : best))

/** Nível médio (dBFS) de um conjunto de leituras. */
const meanDb = (xs) => 10 * Math.log10(xs.reduce((s, o) => s + 10 ** (o.rmsDb / 10), 0) / xs.length)

/** Break (só pad e chimbal) de `s` segundos depois de 60 s de música a −14, e 20 s de drop. */
function breakCase(s) {
  const br = run([{ part: 'full', s: 60, db: -14 }, { part: 'break', s, db: -14 }, { part: 'full', s: 20, db: -14 }]).out
  const g0 = at(br, 60).gain
  const rise = Math.max(...br.filter((o) => o.part === 'break').map((o) => o.gain)) - g0
  const depth = meanDb(br.filter((o) => o.part === 'full' && o.t > 40 && o.t <= 60)) - meanDb(br.filter((o) => o.part === 'break'))
  const drop = br.filter((o) => o.part === 'full' && o.t > 60 + s).map((o) => o.gain)
  return { rise, depth, kept: (depth - rise) / depth, dropSwing: Math.max(...drop) - Math.min(...drop) }
}

/** Os casos que o teste (tests/headless/028-agc-sim.test.cjs) cobra. */
function cases() {
  const r = {}
  const off = (out, t, db) => db + at(out, t).gain - AGC.targetDb
  // Mesma faixa a −20 e a −8 dBFS, abrindo o app com ela: nível que chega ao motor depois de 15 s.
  const lo = run([{ part: 'full', s: 15, db: -20 }]).out, hi = run([{ part: 'full', s: 15, db: -8 }]).out
  r.loIn = -20 + at(lo, 15).gain
  r.hiIn = -8 + at(hi, 15).gain
  r.diff15 = Math.abs(r.loIn - r.hiIn)
  // Troca baixa (−20, 30 s) → alta (−8) sem silêncio: quanto passa da referência 5 e 15 s depois.
  const down = run([{ part: 'full', s: 30, db: -20 }, { part: 'full', s: 15, db: -8 }]).out
  r.upOver5 = off(down, 35, -8)
  r.upOver15 = off(down, 45, -8)
  // Troca alta (−8, 30 s) → baixa (−20), com 2 s de silêncio entre as duas: distância da referência.
  const gap = run([{ part: 'full', s: 30, db: -8 }, { part: 'silence', s: 2 }, { part: 'full', s: 30, db: -20 }]).out
  r.gapOff15 = Math.abs(off(gap, 47, -20))
  r.gapOff30 = Math.abs(off(gap, 62, -20))
  // A mesma troca sem silêncio (mixagem contínua): indistinguível de um break longo, leva ~1 min.
  const mix = run([{ part: 'full', s: 30, db: -8 }, { part: 'full', s: 60, db: -20 }]).out
  r.mixOff60 = Math.abs(off(mix, 90, -20))
  // Break depois de 60 s de música: quanto o ganho sobe e quanto do contraste sobra.
  const b8 = breakCase(8), b16 = breakCase(16), b32 = breakCase(32)
  r.breakDepth = b16.depth
  r.break8Kept = b8.kept
  r.break16Rise = b16.rise
  r.break16Kept = b16.kept
  r.break32Kept = b32.kept
  r.dropSwing = b16.dropSwing
  // Silêncio de 60 s no meio: o ganho não se mexe.
  const si = run([{ part: 'full', s: 15, db: -20 }, { part: 'silence', s: 60 }]).out
  const gs = si.filter((o) => o.part === 'silence').map((o) => o.gain)
  r.silenceDrift = Math.max(...gs) - Math.min(...gs)
  // Respiro de 10 s com a música tocando: o ganho e a janela não se mexem, e a janela não recomeça.
  const rb = run([{ part: 'full', s: 30, db: -20 }, { part: 'full', s: 10, db: -20, breath: true }, { part: 'full', s: 1, db: -20 }]).out
  const rg = rb.filter((o) => o.breath).map((o) => o.gain)
  r.breathDrift = Math.max(...rg) - Math.min(...rg)
  r.breathRestarts = rb.at(-1).restarts - at(rb, 30).restarts
  r.breathWin = rb.at(-1).win
  // Faixa muito baixa: o teto (+18 dB, spec 033) segura.
  r.ceiling = Math.max(...run([{ part: 'full', s: 60, db: -40 }]).out.map((o) => o.gain))
  // Volume do Windows baixo (log do bloco v0.6.0): faixa a −30 dBFS, nível que chega ao motor em 30 s.
  r.low30In = -30 + at(run([{ part: 'full', s: 30, db: -30 }]).out, 30).gain
  // Dentro da faixa, o ganho não segue o bumbo: oscilação depois de assentar.
  const st = run([{ part: 'full', s: 60, db: -14 }]).out.filter((o) => o.t > 20).map((o) => o.gain)
  r.ripple = Math.max(...st) - Math.min(...st)
  return r
}

module.exports = { run, cases, AGC, FULL_DB }

if (require.main === module) {
  const r = cases()
  const f = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v))
  console.log(`referência ${AGC.targetDb} dBFS · janela ${AGC.windowS} s · ataque ${AGC.attackS} s · soltura ${AGC.releaseS} s · teto +${AGC.maxDb} dB · estouro +${AGC.burstDb} dB em ${AGC.shortS} s (${AGC.burstS} s) · troca de faixa após ${AGC.trackGapS} s de silêncio`)
  for (const [k, v] of Object.entries(r)) console.log(`${k.padEnd(12)} ${f(v)}`)
}
