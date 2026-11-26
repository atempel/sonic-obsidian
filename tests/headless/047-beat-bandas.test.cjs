// Spec 047 (#185): detecção em três bandas e fase pelo bumbo/caixa, com as músicas sintéticas de
// tests/sim/beat-sim.cjs (lista `hard`), sem navegador. Critérios 1–4 da spec; os casos da 024 ficam
// em 024-beat-sim.test.cjs (o critério 4 roda os dois). Os valores reais vêm do teste no Windows.
const { run } = require('../sim/beat-sim.cjs')
const results = []
const ok = (n, c, extra = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${extra}`)
const num = (v) => Number(v)
// BPM a ±tol % do real, do dobro ou da metade.
const near = (got, bpm, tol) => [1, 2, 0.5].some((r) => Math.abs(got / (bpm * r) - 1) <= tol)

// 1. Trance/psy: baixo seco no contratempo não puxa a fase.
const off = run({ kind: 'offbass', bpm: 138 })
ok('1 offbass 138: fase mediana entre −20 e +60 ms', num(off.phaseMedMs) >= -20 && num(off.phaseMedMs) <= 60, `${off.phaseMedMs} ms (antes da 047: −194)`)
ok('1 offbass 138: BPM 138 ± 1', Math.abs(num(off.bpmOut) - 138) <= 1, off.bpmOut)
ok('1 offbass 138: HUD termina em "phase on"', off.phase === 'on', `${off.phase}, margem ${off.margin}`)

// 2. Baixo em semicolcheias com notas mudando: andamento certo (ou dobro/metade), fase firme.
for (const bpm of [124, 100]) {
  const r = run({ kind: 'bassline', bpm })
  ok(`2 bassline ${bpm}: BPM a ±2 % (ou 2×/½)`, near(num(r.bpmOut), bpm, 0.02), `${r.bpmOut} (antes da 047: ${bpm === 124 ? 161 : 137})`)
  ok(`2 bassline ${bpm}: p90 da fase ≤ 80 ms`, num(r.phaseP90Ms) <= 80, `${r.phaseP90Ms} ms`)
}

// 3. Batida clara trava mais cedo, sem mudar BPM nem fase (medianas de antes da 047 entre parênteses).
for (const [c, before] of [[{ kind: 'house', bpm: 124 }, 34], [{ kind: 'techno', bpm: 132 }, 20], [{ kind: 'cymbal', bpm: 128 }, 24], [{ kind: 'rock', bpm: 110 }, 18]]) {
  const r = run(c)
  const tag = `3 ${c.kind} ${c.bpm}`
  ok(`${tag}: trava em ≤ 2,5 s`, num(r.lockS) <= 2.5, `${r.lockS} s (antes: ~3,1 s)`)
  ok(`${tag}: BPM ± 1`, Math.abs(num(r.bpmOut) - c.bpm) <= 1, r.bpmOut)
  ok(`${tag}: fase mediana como antes (± 15 ms)`, Math.abs(num(r.phaseMedMs) - before) <= 15, `${r.phaseMedMs} ms (antes: ${before})`)
  ok(`${tag}: nenhuma troca de meia batida`, r.shifts === 0, `${r.shifts}`)
}

// 4. A trava da 024 rev. 3 não muda (o resto está em 024-beat-sim.test.cjs).
for (const kind of ['ambient', 'silence']) ok(`4 ${kind}: nunca trava`, run({ kind, bpm: 0 }).lockedPct === 0)
const br = run({ kind: 'house', bpm: 124, breakdown: { at: 15, len: 8 } })
ok('4 break de 8 s: não solta', br.flips === 1, `${br.flips} mudanças de estado`)
const sil = run({ kind: 'house', bpm: 124, swap: { kind: 'silence', bpm: 0, at: 20 } })
ok('4 silêncio: solta em ≤ 4,5 s', num(sil.loseS) <= 4.5, `${sil.loseS} s`)
const ch = run({ kind: 'house', bpm: 124, sec: 50, swap: { kind: 'techno', bpm: 140, at: 20 } })
ok('4 124 → 140: troca em ≤ 7 s', num(ch.changeS) <= 7 && Math.abs(num(ch.endBpm) - 140) <= 2, `${ch.changeS} s, ${ch.endBpm} BPM`)

console.log(results.join('\n')); console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length}`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
