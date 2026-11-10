// Detecção de batida com músicas sintéticas (tests/sim/beat-sim.cjs), sem navegador: limites de
// regressão para os casos que o algoritmo precisa acertar. Os valores reais vêm do teste no Windows.
const { run } = require('../sim/beat-sim.cjs')
const results = []
const ok = (n, c, extra = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${extra}`)
const num = (v) => Number(v)
for (const c of [{ kind: 'house', bpm: 124 }, { kind: 'house', bpm: 128, fps: 30 }, { kind: 'techno', bpm: 132 }, { kind: 'house', bpm: 122, fps: 20, jitter: 0.5 }]) {
  const r = run(c)
  const tag = `${c.kind} ${c.bpm} BPM a ${c.fps ?? 60} fps`
  ok(`${tag}: trava em até 4,5 s`, num(r.lockS) <= 4.5, `${r.lockS} s`)
  ok(`${tag}: BPM a ±2`, Math.abs(num(r.bpmOut) - c.bpm) <= 2, r.bpmOut)
  ok(`${tag}: batidas a até 80 ms da real (mediana)`, Math.abs(num(r.phaseMedMs)) <= 80, `${r.phaseMedMs} ms`)
  ok(`${tag}: não perde a batida no meio`, r.flips === 1, `${r.flips} mudanças de estado`)
}
for (const kind of ['ambient', 'silence']) ok(`${kind}: nunca trava`, run({ kind, bpm: 0 }).lockedPct === 0)
// Andamento travado (revisão 3): break, ambiente e virada não soltam; silêncio solta; andamento novo troca.
const br = run({ kind: 'house', bpm: 124, breakdown: { at: 15, len: 8 } })
ok('break de 8 s sem bumbo: continua travado', br.flips === 1, `${br.flips} mudanças de estado`)
ok('depois do break: batidas no lugar (mediana ≤ 80 ms)', Math.abs(num(br.phaseMedMs)) <= 80, `${br.phaseMedMs} ms`)
const amb = run({ kind: 'house', bpm: 124, swap: { kind: 'ambient', bpm: 0, at: 20 } })
ok('house → ambiente: mantém o andamento', amb.flips === 1 && Math.abs(num(amb.endBpm) - 124) <= 2, `${amb.flips} mudanças, ${amb.endBpm} BPM`)
const sil = run({ kind: 'house', bpm: 124, swap: { kind: 'silence', bpm: 0, at: 20 } })
ok('house → silêncio: solta em até 4,5 s', num(sil.loseS) <= 4.5, `${sil.loseS} s`)
const ch = run({ kind: 'house', bpm: 124, sec: 50, swap: { kind: 'techno', bpm: 140, at: 20 } })
ok('124 → 140 BPM: troca o andamento em até 7 s', num(ch.changeS) <= 7 && Math.abs(num(ch.endBpm) - 140) <= 2, `${ch.changeS} s, ${ch.endBpm} BPM`)
console.log(results.join('\n')); console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length}`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
