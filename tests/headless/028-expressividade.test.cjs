// Teste da spec 028 (P0): a Memória da Expressividade, o silêncio = zero e o Respiro, sem navegador.
// Transpila src/renderer/src/expression.ts (como o 026 faz com mine.ts) e roda o gancho sobre um
// `audioLevels` falso com a fórmula do motor (AudioLevels.updateAudioLevels do Butterchurn).
// Vale para a lógica; o nível real do áudio e o piso de `imm` só se medem no Windows (HUD).
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')

function loadExpression() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'renderer', 'src', 'expression.ts'), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = new Module('expression.js')
  m._compile(js, 'expression.js')
  return m.exports
}
const { hookExpression } = loadExpression()
const origWarn = console.warn

// ── Motor falso: a mesma conta do Butterchurn ─────────────────
class FakeLevels {
  constructor() {
    this.imm = new Float32Array(3); this.avg = new Float32Array(3).fill(1); this.longAvg = new Float32Array(3).fill(1)
    this.val = new Float32Array(3); this.att = new Float32Array(3)
    this.input = [0, 0, 0]
  }
  updateAudioLevels(fps, frame) {
    const f = Math.min(144, Math.max(15, fps))
    const adj = (r) => r ** (30 / f)
    for (let i = 0; i < 3; i++) {
      this.imm[i] = this.input[i]
      let rate = adj(this.imm[i] > this.avg[i] ? 0.2 : 0.5)
      this.avg[i] = this.avg[i] * rate + this.imm[i] * (1 - rate)
      rate = adj(frame < 50 ? 0.9 : 0.992)
      this.longAvg[i] = this.longAvg[i] * rate + this.imm[i] * (1 - rate)
      if (this.longAvg[i] < 0.001) { this.val[i] = 1; this.att[i] = 1 } else { this.val[i] = this.imm[i] / this.longAvg[i]; this.att[i] = this.avg[i] / this.longAvg[i] }
    }
  }
}

// Música: bumbo a 124 BPM sobre uma base (as somas das raias do motor ficam na casa das dezenas).
const music = (t, loud = 1) => {
  const ph = (t * 124 / 60) % 1
  const kick = Math.exp(-ph * 9)
  return [loud * (25 + 90 * kick), loud * (30 + 25 * Math.abs(Math.sin(t * 7.1))), loud * (12 + 10 * Math.abs(Math.sin(t * 13.7)))]
}

/**
 * Roda um roteiro: lista de trechos { kind: 'silence' | 'music' | 'breath', s, loud? }.
 * Devolve o bassOut de cada quadro com o tempo e o trecho.
 */
function run(script, expr, fps = 60) {
  const fake = new FakeLevels()
  const viz = { renderer: { audioLevels: fake } }
  const env = { quiet: false, resting: false, breath: false }
  let quietFor = 0
  const params = typeof expr === 'function' ? expr : () => expr
  const probe = hookExpression(viz, params, () => env)
  const out = []
  let frame = 0, t = 0
  for (const seg of script) {
    for (let k = 0; k < Math.round(seg.s * fps); k++) {
      const dt = 1 / fps
      const silent = seg.kind === 'silence'
      quietFor = silent ? quietFor + dt : 0
      env.quiet = silent; env.resting = silent && quietFor >= 3; env.breath = seg.kind === 'breath'
      // Silêncio: ruído de ±1 LSB que o motor normalizaria em pulso; Respiro: ganho 0 → nada chega.
      fake.input = seg.kind === 'music' ? music(t, seg.loud ?? 1) : silent ? [Math.random() * 0.6, Math.random() * 0.6, Math.random() * 0.6] : [0, 0, 0]
      fake.updateAudioLevels(fps, frame)
      out.push({ t, seg: seg.kind, bass: fake.val[0], att: fake.att[0], mid: fake.val[1] })
      frame++; t += dt
    }
  }
  return { out, probe }
}
const between = (out, a, b) => out.filter((o) => o.t >= a && o.t < b).map((o) => o.bass)
const sd = (xs) => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) }
const longestRun = (out, pred, fps = 60) => { let best = 0, cur = 0; for (const o of out) { cur = pred(o) ? cur + 1 : 0; best = Math.max(best, cur) } return best / fps }

const results = []
const ok = (n, c, extra = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? ` (${extra})` : ''}`)
const E = (adaptation, level = 0, curve = 'b') => ({ level, curve, adaptation })
const NAMES = { normal: 'Curta', slow: 'Longa', locked: 'Fixa' }

// Gancho ausente → null, sem quebrar.
console.warn = () => {}
ok('0 motor sem audioLevels: gancho devolve null', hookExpression({ renderer: {} }, () => E('normal')) === null)
console.warn = origWarn

for (const a of ['normal', 'slow', 'locked']) {
  // Critério 2: abrir em silêncio, dar play.
  const { out } = run([{ kind: 'silence', s: 6 }, { kind: 'music', s: 20 }], E(a))
  const w = between(out, 6 + 5, 6 + 15)
  ok(`2 ${NAMES[a]}: aberto em silêncio, bass varia com a música em ≤ 5 s`, sd(w) > 0.1, `desvio ${sd(w).toFixed(2)}`)
  ok(`2 ${NAMES[a]}: sem 1,00 fixo`, longestRun(out.filter((o) => o.t >= 6), (o) => Math.abs(o.bass - 1) < 1e-3) < 0.5)
  // Critério 3: abrir com música.
  const r3 = run([{ kind: 'music', s: 20 }], E(a))
  const sat = longestRun(r3.out, (o) => o.bass >= 3.99)
  ok(`3 ${NAMES[a]}: aberto com música, bass não fica em 4 por mais de 2 s`, sat <= 2, `${sat.toFixed(2)} s em 4`)
  ok(`3 ${NAMES[a]}: aberto com música, reage (desvio > 0,1)`, sd(between(r3.out, 5, 20)) > 0.1)
  // Critério 4: pausar → zero em ≤ 4 s e ficar em zero por 5 min; volta em ~1 s, sem degrau.
  const r4 = run([{ kind: 'music', s: 10 }, { kind: 'silence', s: 300 }, { kind: 'music', s: 10 }], E(a, 2))
  const afterPause = r4.out.filter((o) => o.t >= 14 && o.t < 310)
  ok(`4 ${NAMES[a]}: em ≤ 4 s de silêncio, bass/att/mid = 0 e continua em 0 por 5 min`, afterPause.every((o) => o.bass === 0 && o.att === 0 && o.mid === 0))
  const back = r4.out.filter((o) => o.t >= 310)
  const firstBack = back.slice(0, 3).map((o) => o.bass)
  ok(`4 ${NAMES[a]}: a volta sai do zero sem degrau`, Math.max(...firstBack) < 0.25, firstBack.map((x) => x.toFixed(2)).join(' '))
  ok(`4 ${NAMES[a]}: a reação volta em ~1 s`, sd(between(r4.out, 311.2, 316)) > 0.1)
  // Critério 5: Respiro e volta.
  const r5 = run([{ kind: 'music', s: 10 }, { kind: 'breath', s: 15 }, { kind: 'music', s: 15 }], E(a, 3, 'c'))
  ok(`5 ${NAMES[a]}: Respiro e volta, nunca acima de 4`, r5.out.every((o) => o.bass <= 4 && o.att <= 4))
  ok(`5 ${NAMES[a]}: depois do Respiro, não fica travado`, sd(between(r5.out, 27, 40)) > 0.1 && longestRun(r5.out.filter((o) => o.t >= 26), (o) => o.bass >= 3.99) <= 2)
}

// Fixa escolhida no meio da música (numa faixa mais baixa) semeia de novo e compara com ela.
{
  let frames = 0
  const res = run([{ kind: 'music', s: 10 }, { kind: 'music', s: 20, loud: 0.3 }], () => E(frames++ >= 11 * 60 ? 'locked' : 'normal'))
  const w = between(res.out, 15, 30)
  const mean = w.reduce((s, x) => s + x, 0) / w.length
  ok('Fixa escolhida numa faixa baixa: reage e a média fica perto de 1', sd(w) > 0.1 && Math.abs(mean - 1) < 0.5, `média ${mean.toFixed(2)}, desvio ${sd(w).toFixed(2)}`)
}
// Nível 0: saída limitada a 0–4 mesmo com o motor passando disso (um degrau de volume).
{
  const { out } = run([{ kind: 'music', s: 6, loud: 0.05 }, { kind: 'music', s: 6, loud: 3 }], E('normal'))
  ok('Nível 0: saída limitada a 4', out.every((o) => o.bass <= 4))
}
// HUD/log: o probe traz imm, as médias e os acumuladores.
{
  const { probe } = run([{ kind: 'music', s: 6 }], E('locked'))
  ok('6 probe com imm, média do motor e da Memória', probe.imm > 0 && Number.isFinite(probe.engineLongAvg) && Number.isFinite(probe.memLongAvg) && !probe.seeding)
  ok('6 probe acumula bass para o log', probe.n > 0 && probe.sum > 0)
}

// ── Interface (4b, 6): padrão visível, toast, HUD e log, no Chromium headless ──
async function ui() {
  const H = require('./harness.cjs')
  const srv = H.serve(5228)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1400, height: 860 } })
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false } } })
    await H.mockAudio(page)
    await page.goto('http://localhost:5228/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
    const logs = await page.evaluate(() => window.__logs)
    ok('6 log da abertura com a Expressividade carregada', logs.some((l) => /^expressividade carregada: nível 0 · caráter b · memória normal/.test(l)))
    await page.keyboard.press(',')
    await page.waitForSelector('#exprCurve', { state: 'attached', timeout: 5000 })
    const opt = (id) => page.$$eval(`#${id} option`, (os) => os.map((o) => o.textContent))
    ok('4b Caráter: "Energia · padrão"', (await opt('exprCurve')).includes('Energia · padrão'), JSON.stringify(await opt('exprCurve')))
    ok('4b Memória: "Curta · padrão"', (await opt('exprMemory')).includes('Curta · padrão'))
    const sheetText = () => page.$eval('.sheet', (e) => e.textContent)
    ok('4b Nível 0 marcado e Caráter "sem efeito no nível 0"', /Neutra · padrão/.test(await sheetText()) && /Sem efeito no nível 0/.test(await sheetText()))
    ok('4b "Restaurar padrão" desligado no padrão', await page.$eval('#exprReset', (e) => e.disabled))
    await page.keyboard.press('Escape')
    await page.keyboard.press('+'); await page.keyboard.press('Shift+X')
    await page.keyboard.press('x')
    const toast = await page.$eval('.gtoast', (e) => e.textContent)
    ok('4b toast do X sem "(padrão)" fora do padrão', /Caráter: Nervo/.test(toast) && !/padrão/.test(toast), toast)
    await page.keyboard.press('x'); await page.keyboard.press('x')
    ok('4b toast do X diz "(padrão)" ao voltar a Energia', /Energia.*\(padrão\)/.test(await page.$eval('.gtoast', (e) => e.textContent)))
    await page.keyboard.press(',')
    await page.waitForFunction(() => !document.querySelector('#exprReset').disabled, null, { timeout: 3000 })
    await page.$eval('#exprReset', (e) => e.click())
    await page.waitForTimeout(200)
    const v = await page.evaluate(() => [document.querySelector('#exprCurve').value, document.querySelector('#exprMemory').value, document.querySelector('#exprReset').disabled])
    ok('4b "Restaurar padrão" volta Nível, Caráter e Memória', v[0] === 'b' && v[1] === 'normal' && v[2] === true, JSON.stringify(v))
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+Shift+D')
    await page.waitForTimeout(1500)
    const hud = await page.$eval('#hud', (e) => e.textContent)
    ok('6 HUD com imm, média do motor, RMS/pico em dBFS e ganho em vigor', /imm [\d.]+ · média motor [\d.—]+/.test(hud) && /RMS [−\-\d.∞]+ dBFS · pico [−\-\d.∞]+ dBFS/.test(hud) && /ganho em vigor/.test(hud), hud.split('\n').slice(3, 5).join(' | '))
    ok('sem erros na página', errs.length === 0, errs.join(' '))
  } finally {
    await b.close(); srv.close()
  }
}

;(async () => {
  if (process.env.SKIP_UI !== '1') await ui().catch((e) => ok('interface carregou', false, String(e).split('\n')[0]))
  console.log(results.join('\n')); console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length}`)
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
})()
