// Normalizar áudio (spec 028, P1) com a faixa sintética de tests/sim/agc-sim.cjs, sem navegador:
// limites de regressão para o que a spec cobra. O nível de referência real se acerta no Windows (HUD).
const { cases } = require('../sim/agc-sim.cjs')
const r = cases()
const results = []
const ok = (n, c, extra = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? ` (${extra})` : ''}`)
const f = (v) => v.toFixed(2)
ok('mesma faixa a −20 e −8 dBFS chega ao motor com ≤ 2 dB de diferença em 15 s', r.diff15 <= 2, `${f(r.loIn)} e ${f(r.hiIn)} dBFS`)
ok('break de 8 s não sobe o ganho mais de 3 dB', r.breakRise <= 3, `+${f(r.breakRise)} dB num break ${f(r.breakDepth)} dB abaixo`)
ok('silêncio congela o ganho', r.silenceDrift < 1e-9, `${r.silenceDrift} dB`)
ok('teto de +12 dB', r.ceiling <= 12 + 1e-9, `${f(r.ceiling)} dB`)
ok('não segue o bumbo (sem compressão): oscilação < 1 dB com a faixa assentada', r.ripple < 1, `${f(r.ripple)} dB`)
ok('faixa baixa → alta: ≤ 2 dB em 15 s (ataque de ~1 s)', r.swapDown <= 2, `${f(r.swapDown)} dB`)
// Alta → baixa sobe devagar de propósito (janela de 10 s + soltura de 8 s): só confere que vai no rumo.
ok('faixa alta → baixa: já corrigiu mais da metade em 15 s', r.swapUp < 6, `${f(r.swapUp)} dB de 12`)
console.log(results.join('\n')); console.log(`${results.filter((x) => x.startsWith('PASS')).length}/${results.length}`)
process.exit(results.some((x) => x.startsWith('FAIL')) ? 1 : 0)
