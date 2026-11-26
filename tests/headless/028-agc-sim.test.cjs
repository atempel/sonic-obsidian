// Normalizar áudio (spec 028 P1, revisto pela spec 046: por faixa) com a faixa sintética de
// tests/sim/agc-sim.cjs, sem navegador: limites de regressão para o que as specs cobram. O nível de
// referência real e o break × drop com música de verdade se conferem no Windows (HUD).
const { cases, AGC } = require('../sim/agc-sim.cjs')
const r = cases()
const results = []
const ok = (n, c, extra = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? ` (${extra})` : ''}`)
const f = (v) => v.toFixed(2)
const pct = (v) => `${Math.round(v * 100)} %`
ok('constantes da spec 046: janela 45 s, ataque 4 s, soltura 10 s, estouro +4 dB em 3 s (0,7 s), pausa 1,5 s',
  AGC.windowS === 45 && AGC.attackS === 4 && AGC.releaseS === 10 && AGC.shortS === 3 && AGC.burstDb === 4 && AGC.burstS === 0.7 && AGC.trackGapS === 1.5)
ok('mesma faixa a −20 e −8 dBFS chega ao motor com ≤ 2 dB de diferença em 15 s', r.diff15 <= 2, `${f(r.loIn)} e ${f(r.hiIn)} dBFS`)
ok('break de 16 s depois de 60 s: ganho sobe ≤ 1,5 dB (≥ 80 % do contraste)', r.break16Rise <= 1.5 && r.break16Kept >= 0.8, `+${f(r.break16Rise)} dB num break ${f(r.breakDepth)} dB abaixo, sobra ${pct(r.break16Kept)}`)
ok('break de 32 s: sobra ≥ 60 % do contraste', r.break32Kept >= 0.6, pct(r.break32Kept))
ok('break de 8 s: sobra ≥ 80 % do contraste', r.break8Kept >= 0.8, pct(r.break8Kept))
ok('o drop depois do break de 16 s: ganho varia ≤ 1,5 dB nele', r.dropSwing <= 1.5, `${f(r.dropSwing)} dB`)
ok('baixa → alta sem silêncio: ≤ 3 dB acima da referência em 5 s e ≤ 1 dB em 15 s', r.upOver5 <= 3 && r.upOver15 <= 1, `${f(r.upOver5)} e ${f(r.upOver15)} dB`)
ok('alta → baixa com 2 s de silêncio: ≤ 3 dB em 15 s e ≤ 1 dB em 30 s', r.gapOff15 <= 3 && r.gapOff30 <= 1, `${f(r.gapOff15)} e ${f(r.gapOff30)} dB`)
ok('alta → baixa sem silêncio (mixagem contínua): ≤ 1,5 dB em 60 s', r.mixOff60 <= 1.5, `${f(r.mixOff60)} dB`)
ok('silêncio congela o ganho', r.silenceDrift < 1e-9, `${r.silenceDrift} dB`)
ok('Respiro congela o ganho sem recomeçar a janela', r.breathDrift < 1e-9 && r.breathRestarts === 0 && r.breathWin > 30, `${r.breathDrift} dB, ${r.breathRestarts} recomeços, janela ${f(r.breathWin)} s`)
ok('teto de +18 dB (spec 033)', AGC.maxDb === 18 && r.ceiling <= 18 + 1e-9 && r.ceiling > 17, `${f(r.ceiling)} dB`)
ok('faixa a −30 dBFS chega a ≤ 2 dB da referência em 30 s (spec 033)', Math.abs(r.low30In - AGC.targetDb) <= 2, `${f(r.low30In)} dBFS`)
ok('não segue o bumbo (sem compressão): oscilação < 1 dB com a faixa assentada', r.ripple < 1, `${f(r.ripple)} dB`)
console.log(results.join('\n')); console.log(`${results.filter((x) => x.startsWith('PASS')).length}/${results.length}`)
process.exit(results.some((x) => x.startsWith('FAIL')) ? 1 : 0)
