// Detecção de batida com músicas sintéticas (tests/sim/beat-sim.cjs), sem navegador: limites de
// regressão para os casos que o algoritmo precisa acertar. Os valores reais vêm do teste no Windows.
const { run } = require('../sim/beat-sim.cjs')
const results = []
const ok = (n, c, extra = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${extra}`)
const num = (v) => Number(v)
for (const c of [{ kind: 'house', bpm: 124 }, { kind: 'house', bpm: 128, fps: 30 }, { kind: 'techno', bpm: 132 }, { kind: 'house', bpm: 122, fps: 20, jitter: 0.5 }]) {
  const r = run(c)
  const tag = `${c.kind} ${c.bpm} BPM a ${c.fps ?? 60} fps`
  ok(`${tag}: trava em até 4 s`, num(r.lockS) <= 4, `${r.lockS} s`)
  ok(`${tag}: BPM a ±2`, Math.abs(num(r.bpmOut) - c.bpm) <= 2, r.bpmOut)
  ok(`${tag}: batidas a até 80 ms da real (mediana)`, Math.abs(num(r.phaseMedMs)) <= 80, `${r.phaseMedMs} ms`)
  ok(`${tag}: não perde a batida no meio`, r.flips === 1, `${r.flips} mudanças de estado`)
}
for (const kind of ['ambient', 'silence']) ok(`${kind}: nunca trava`, run({ kind, bpm: 0 }).lockedPct === 0)
const sw = run({ kind: 'house', bpm: 124, swap: { kind: 'ambient', bpm: 0, at: 20 } })
ok('house → ambiente: perde a batida em até 4,5 s', num(sw.loseS) <= 4.5, `${sw.loseS} s`)
console.log(results.join('\n')); console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length}`)
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
