// Spec 040 (#112): Curva por frequência (EQ de 16 bandas na Expressividade).
// Parte 1, sem navegador: `src/renderer/src/freq-curve.ts` transpilado (razões, interpolação,
// sanitização) e o gancho de `expression.ts` sobre um motor falso com o `freqArray` do Butterchurn.
// Parte 2, no navegador: Ajustes rápidos (segmentado, EQ, Personalizada, teclado, Usar Fixa), HUD,
// `settings.json`, busca rápida e Configurações › Visual. O efeito com música, só no Windows.
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const H = require('./harness.cjs')
const R = H.createResults('040-curva-frequencia')
const ok = R.ok

function loadTs(name) {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'renderer', 'src', `${name}.ts`), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = new Module(`${name}.js`)
  m.require = (id) => (id.startsWith('./') ? loadTs(id.slice(2)) : require(id))
  m._compile(js, `${name}.js`)
  return m.exports
}
const C = loadTs('freq-curve')
const { hookExpression } = loadTs('expression')

// ── Parte 1: o módulo ─────────────────────────────────────────
const SR = 48000
const FFT = 4096
const BIN = SR / FFT
const BINS = FFT / 2
const Z = C.engineZones(SR)
// Espectro com tons puros (magnitude 1 na raia do tom) e um piso opcional.
const spectrum = (tones, floor = 0) => {
  const m = new Float32Array(BINS).fill(floor)
  for (const [hz, a = 1] of tones) m[Math.round(hz / BIN)] += a
  return m
}
const ratios = (curve, mags) => Array.from(C.zoneRatios(mags, C.buildWeights(curve, Z, BIN, BINS)))
const P = C.CURVE_PRESET_VALUES
const gain = (db) => 10 ** (db / 20)
/** Frequência da raia do analisador onde um tom cai. */
const binHz = (hz) => Math.round(hz / BIN) * BIN

{
  const z44 = C.engineZones(44100)
  ok('1a zonas do motor a 44,1 kHz: raias [0, 6, 64) → [6, 64, 255)', JSON.stringify([z44.starts, z44.stops]) === JSON.stringify([[0, 6, 64], [6, 64, 255]]), JSON.stringify([z44.starts, z44.stops]))
  const noise = new Float32Array(BINS).map(() => Math.random())
  const flat = ratios(P.flat, noise)
  ok('1b curva plana: razões exatamente 1, 1, 1', flat.every((r) => r === 1), JSON.stringify(flat))
  ok('1c interpolação: nos centros vale a banda (Sorriso)', C.CURVE_BANDS.every((hz, i) => Math.abs(C.gainDbAt(P.smile, hz) - P.smile[i]) < 1e-9))
  ok('1d interpolação: constante abaixo de 20 Hz e acima de 20 kHz', C.gainDbAt(P.lows, 10) === 6 && C.gainDbAt(P.highs, 22000) === 5)
  const r60 = ratios(P.lows, spectrum([[60]]))
  ok('1e Graves, tom de 60 Hz: r_bass = ganho da curva em 60 Hz (+4,6 dB ≈ 1,70 ×)', Math.abs(r60[0] - gain(C.gainDbAt(P.lows, binHz(60)))) < 1e-4 && r60[0] > 1.6, r60[0].toFixed(3))
  const r40 = ratios(P.lows, spectrum([[40]]))
  ok('1f Graves, tom de 40 Hz: r_bass > 1,8', r40[0] > 1.8, r40[0].toFixed(3))
  const rh = ratios(P.highs, spectrum([[60]]))
  ok('1g Agudos, tom de 60 Hz: r_bass < 0,8', rh[0] < 0.8, rh[0].toFixed(3))
  const top = [...P.flat]; top[14] = 6; top[15] = 6
  const rt = ratios(top, spectrum([[14000], [1000], [60]]))
  ok('1h +6 dB em 12,5k/20k, tom de 14 kHz: r_treb > 1,5 (acima de 11 kHz conta para o treb); bass e mid ficam 1', rt[2] > 1.5 && Math.abs(rt[0] - 1) < 1e-6 && Math.abs(rt[1] - 1) < 1e-6, JSON.stringify(rt))
  const rm = ratios(P.smile, spectrum([[60]]))
  ok('1i zona muda (só grave tocando): mid e treb = 1', rm[1] === 1 && rm[2] === 1, JSON.stringify(rm))
  // O corte entre bass e mid segue as raias do motor (um tom cai na zona da raia mais perto).
  const w = C.buildWeights(P.flat, Z, BIN, BINS)
  const zoneOf = (hz) => w.zone[Math.round(hz / BIN)]
  ok('1j tom de 150 Hz no bass, 400 Hz no mid, 5 kHz no treb', zoneOf(150) === 0 && zoneOf(400) === 1 && zoneOf(5000) === 2)
  ok('1k sanitização: tamanho errado ou texto → plana; fora da faixa → preso e arredondado',
    C.sanitizeCurve([1, 2]).every((v) => v === 0) && C.sanitizeCurve([...P.flat.slice(0, 15), 'x']).every((v) => v === 0) &&
    JSON.stringify(C.sanitizeCurve([50, -50, 2.6, ...P.flat.slice(3)]).slice(0, 3)) === '[12,-12,3]')
  const st = (c, p) => C.sanitizeCurveState(c, p)
  ok('1l predefinição salva: a que bate fica; a que não bate vira Personalizada; Personalizada igual a uma predefinição continua Personalizada; lista ruim → Plana',
    st([...P.lows], 'lows').curvePreset === 'lows' && st([...P.lows], 'smile').curvePreset === 'lows' && st([...P.lows], 'custom').curvePreset === 'custom' &&
    st([1, 2, 3], 'custom').curvePreset === 'flat' && st([...P.mids], undefined).curvePreset === 'mids' && st([...P.mids.map((v) => v + 1)], 'mids').curvePreset === 'custom')
}

// ── Parte 1b: o gancho sobre um motor falso ───────────────────
{
  // Motor falso: o `freqArray` refeito a cada `sampleAudio()` e as zonas somadas como o Butterchurn.
  class FakeEngine {
    constructor() {
      this.audio = { freqArray: new Float32Array(512), audioContext: { sampleRate: SR } }
      const z = C.engineZones(SR)
      this.levels = {
        starts: [...z.starts], stops: [...z.stops],
        imm: new Float32Array(3), avg: new Float32Array(3).fill(1), longAvg: new Float32Array(3).fill(1), val: new Float32Array(3), att: new Float32Array(3),
        updateAudioLevels: (fps, frame) => {
          const L = this.levels
          L.imm.fill(0)
          for (let t = 0; t < 3; t++) for (let i = L.starts[t]; i < L.stops[t]; i++) L.imm[t] += this.audio.freqArray[i]
          for (let t = 0; t < 3; t++) { L.val[t] = L.imm[t] / L.longAvg[t]; L.att[t] = L.avg[t] / L.longAvg[t] }
        }
      }
    }
    // Um tom: energia na raia do motor e na do analisador.
    sample(hz) {
      const fa = new Float32Array(512)
      fa[Math.round(hz / (SR / 1024))] = 10
      this.audio.freqArray = fa
    }
  }
  const run = (curve16, hz, frames = 3) => {
    const eng = new FakeEngine()
    const viz = { renderer: { audioLevels: eng.levels, audio: eng.audio } }
    const db = new Float32Array(BINS).fill(-Infinity)
    db[Math.round(hz / BIN)] = -20
    const analyser = { frequencyBinCount: BINS, fftSize: FFT, context: { sampleRate: SR }, getFloatFrequencyData: (out) => out.set(db) }
    // O gancho guarda a referência a `renderer.audio`: o motor falso troca só o `freqArray` dele.
    const probe = hookExpression(viz, () => ({ level: 0, curve: 'b', adaptation: 'normal', curve16 }), undefined, { analyser })
    let before = null, after = null
    for (let f = 0; f < frames; f++) {
      eng.sample(hz)
      before = Array.from(eng.audio.freqArray)
      eng.levels.updateAudioLevels(60, 100 + f)
      after = Array.from(eng.audio.freqArray)
      // Chamar de novo sem `sampleAudio()` não pesa duas vezes.
      eng.levels.updateAudioLevels(60, 200 + f)
    }
    return { probe, before, after, imm: Array.from(eng.levels.imm) }
  }
  const flat = run(C.flatCurve(), 60)
  ok('2a gancho, curva plana: freqArray do motor intocado e razões 1', JSON.stringify(flat.before) === JSON.stringify(flat.after) && Array.from(flat.probe.ratios).every((r) => r === 1))
  const lows = run([...P.lows], 60)
  const g60 = gain(C.gainDbAt(P.lows, binHz(60)))
  ok('2b gancho, Graves com tom de 60 Hz: imm do bass = 10 × ganho da curva (pesado uma vez só)', Math.abs(lows.imm[0] - 10 * g60) < 1e-3 && Math.abs(lows.probe.ratios[0] - g60) < 1e-4, JSON.stringify([lows.imm[0], 10 * g60]))
}

// ── Parte 2: a interface ──────────────────────────────────────
const RENDER = { meshWidth: 32, meshHeight: 24, pixelRatio: 1, textureRatio: 0.5, fxaa: false, canvasScale: 0.5, extraImages: false }
const recordToasts = () => {
  window.__toasts = []
  const watch = () => {
    const span = document.querySelector('.gtoast span')
    if (!span) return void setTimeout(watch, 100)
    new MutationObserver(() => window.__toasts.push(span.textContent)).observe(span, { childList: true, characterData: true, subtree: true })
  }
  watch()
}
const has = (cls) => document.body.classList.contains(cls)
const segText = () => document.querySelector('#eqCurve [aria-checked="true"]')?.firstChild?.textContent ?? null
const lastSave = (page) => page.evaluate(() => window.__saves.at(-1)?.expression ?? null)
const hudCurve = () => (document.getElementById('hud')?.textContent.match(/^curve .*$/m) || [''])[0]

async function openPage(b, settings) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } })
  R.attach(page)
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e)))
  await H.mockSo(page, { saveSettings: true, settings: { welcomeSeen: true, rotation: { enabled: false }, render: RENDER, ...settings } })
  await H.mockAudio(page)
  await page.addInitScript(recordToasts)
  await page.goto('http://localhost:5240/')
  await page.waitForSelector('.strip [data-sheet-btn]', { timeout: 30000 })
  await page.mouse.move(640, 300)
  return { page, errs }
}
async function openQuick(page) {
  if (!(await page.evaluate(has, 'sheet-open'))) await page.keyboard.press(',')
  await H.poll(page, has, { timeout: 10000, arg: 'sheet-open' })
  await page.locator('#eqPlot').scrollIntoViewIfNeeded()
}

;(async () => {
  if (process.env.SKIP_UI === '1') {
    const code = await R.finish()
    process.exit(code)
  }
  const srv = H.serve(5240)
  const b = await H.launch()
  try {
    let { page, errs } = await openPage(b, {})
    await page.keyboard.press('Control+Shift+KeyD')
    ok('3a HUD: "curve flat" com a curva plana', await H.poll(page, () => /^curve flat$/m.test(document.getElementById('hud')?.textContent || ''), { timeout: 15000 }), await page.evaluate(hudCurve))
    await openQuick(page)
    const segs = await page.$$eval('#eqCurve button', (es) => es.map((e) => e.firstChild.textContent))
    ok('3b segmentado: Plana · Graves · Médios · Agudos · Sorriso, Plana marcada', JSON.stringify(segs) === JSON.stringify(['Plana', 'Graves', 'Médios', 'Agudos', 'Sorriso']) && (await page.evaluate(segText)) === 'Plana', JSON.stringify(segs))
    ok('3c sem a linha da Fixa com a curva plana', !(await page.$('#eqWarn')))

    // Graves: a razão do bass no HUD sobe acima de 1 (o bumbo simulado é de 55 Hz).
    await page.click('#eqCurve button[data-v="lows"]')
    ok('4a toast "Curva: Graves"', await H.poll(page, () => window.__toasts.includes('Curva: Graves'), { timeout: 5000 }))
    ok('4b HUD: "curve lows r <bass> <mid> <treb>" com r_bass > 1,3', await H.poll(page, () => {
      const m = (document.getElementById('hud')?.textContent || '').match(/^curve lows r ([\d.]+) ([\d.]+) ([\d.]+)$/m)
      return !!m && +m[1] > 1.3
    }, { timeout: 15000 }), await page.evaluate(hudCurve))
    const s4 = await lastSave(page)
    ok('4c settings.json: curvePreset "lows" e os valores dela', s4?.curvePreset === 'lows' && JSON.stringify(s4.curve16) === JSON.stringify(P.lows), JSON.stringify(s4))
    ok('4d Memória Curta e curva fora do plano: aparece a linha da Fixa', await H.poll(page, () => /Com a memória Fixa, a curva age por inteiro/.test(document.getElementById('eqWarn')?.textContent || ''), { timeout: 3000 }))

    // Clicar numa barra: Personalizada + balão "<banda> · <valor> dB".
    const box = await page.locator('#eqPlot canvas').boundingBox()
    const slot = box.width / 16
    const bandX = (i) => box.x + (i + 0.5) * slot
    const dbY = (v) => box.y + 8 + ((12 - v) / 24) * (box.height - 16)
    await page.mouse.move(bandX(3), dbY(10))
    await page.mouse.down()
    const bub = await page.evaluate(() => ({ on: document.getElementById('eqBub').classList.contains('on'), text: document.getElementById('eqBub').textContent }))
    await page.mouse.up()
    ok('5a clicar na barra de 80 Hz a +10 dB: balão "80 Hz · +10 dB"', bub.on && bub.text === '80 Hz · +10 dB', JSON.stringify(bub))
    ok('5b o segmentado mostra "Personalizada", marcada', await H.poll(page, () => document.querySelector('#eqCurve [aria-checked="true"]')?.firstChild?.textContent === 'Personalizada', { timeout: 3000 }))
    const s5 = await lastSave(page)
    ok('5c settings.json: curvePreset "custom", 80 Hz = +10', s5?.curvePreset === 'custom' && s5.curve16[3] === 10, JSON.stringify(s5))
    // Voltar a barra ao valor da predefinição não tira a "Personalizada".
    await page.mouse.move(bandX(3), dbY(4))
    await page.mouse.down(); await page.mouse.up()
    ok('5d curva de novo igual a Graves: continua "Personalizada"', await H.poll(page, () => window.__saves.at(-1)?.expression?.curve16?.[3] === 4, { timeout: 3000 }) && (await page.evaluate(segText)) === 'Personalizada' && (await lastSave(page)).curvePreset === 'custom')
    // Duplo clique volta a 0 dB.
    await page.mouse.dblclick(bandX(6), dbY(-8))
    ok('5e duplo clique na barra de 315 Hz: volta a 0 dB', await H.poll(page, () => window.__saves.at(-1)?.expression?.curve16?.[6] === 0, { timeout: 3000 }), JSON.stringify((await lastSave(page))?.curve16))
    // Arrastar pela horizontal muda as barras do caminho.
    await page.mouse.move(bandX(9), dbY(-6)); await page.mouse.down()
    await page.mouse.move(bandX(12), dbY(6), { steps: 1 }); await page.mouse.up()
    const s5f = (await lastSave(page)).curve16
    ok('5f arrasto de 1,25k (−6) a 5k (+6): as barras do meio seguem a reta', JSON.stringify(s5f.slice(9, 13)) === '[-6,-2,2,6]', JSON.stringify(s5f.slice(9, 13)))
    await page.click('#eqCurve button[data-v="smile"]')
    ok('5g só uma predefinição tira a "Personalizada": Sorriso', await H.poll(page, () => document.querySelector('#eqCurve [aria-checked="true"]')?.firstChild?.textContent === 'Sorriso', { timeout: 3000 }) && JSON.stringify((await lastSave(page)).curve16) === JSON.stringify(P.smile))

    // Teclado com o EQ em foco.
    await page.click('#eqCurve button[data-v="flat"]')
    await page.focus('#eqPlot')
    // O foco volta à última banda mexida; a primeira fica a 15 setas à esquerda (presa na borda).
    for (let i = 0; i < 16; i++) await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowUp')
    const k1 = await H.poll(page, () => window.__saves.at(-1)?.expression?.curve16?.[2] === 1, { timeout: 3000 })
    await page.keyboard.press('Shift+ArrowUp')
    const k2 = await H.poll(page, () => window.__saves.at(-1)?.expression?.curve16?.[2] === 4, { timeout: 3000 })
    ok('6a ←/→ escolhem a banda; ↑ +1 dB e Shift+↑ +3 dB (50 Hz: 0 → 1 → 4)', k1 && k2, JSON.stringify((await lastSave(page))?.curve16))
    const live = await page.$eval('#eqLive', (e) => e.textContent)
    ok('6b leitor de tela: "50 Hz, +4 dB"', live === '50 Hz, +4 dB', live)
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowUp')
    ok('6c preso em +12', await H.poll(page, () => window.__saves.at(-1)?.expression?.curve16?.[2] === 12, { timeout: 3000 }))
    await page.keyboard.press('ArrowLeft')
    for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowDown')
    ok('6d preso em −12 (31,5 Hz)', await H.poll(page, () => window.__saves.at(-1)?.expression?.curve16?.[1] === -12, { timeout: 3000 }))
    await page.keyboard.press('Home')
    ok('6e Home volta a banda a 0 dB', await H.poll(page, () => window.__saves.at(-1)?.expression?.curve16?.[1] === 0, { timeout: 3000 }))
    ok('6f o painel continua aberto (as setas não foram para os atalhos do palco)', await page.evaluate(has, 'sheet-open'))

    // Usar Fixa.
    ok('7a curva fora do plano com Memória Curta: linha da Fixa', !!(await page.$('#eqWarn')))
    await page.click('#eqWarnBtn')
    ok('7b "Usar Fixa" troca a Memória para Fixa e a linha some', await H.poll(page, () => window.__saves.at(-1)?.expression?.adaptation === 'locked' && !document.getElementById('eqWarn'), { timeout: 3000 }) &&
      (await page.evaluate(() => document.querySelector('#exprMemory [aria-checked="true"]')?.firstChild?.textContent)) === 'Fixa')

    // Busca rápida.
    await page.keyboard.press('Escape')
    await H.poll(page, () => !document.body.classList.contains('sheet-open'), { timeout: 3000 })
    await page.keyboard.press('/')
    await H.poll(page, has, { timeout: 5000, arg: 'palette-open' })
    await page.keyboard.type('curva')
    await H.poll(page, () => !!document.querySelector('.prow.cmd'), { timeout: 3000 })
    const cmds = await page.$$eval('.prow.cmd .r-title', (es) => es.map((e) => e.textContent))
    ok('8a busca "curva": os cinco comandos "Curva por frequência: <predefinição>"', ['Plana', 'Graves', 'Médios', 'Agudos', 'Sorriso'].every((n) => cmds.includes(`Curva por frequência: ${n}`)), JSON.stringify(cmds))
    await page.locator('.prow.cmd', { hasText: 'Curva por frequência: Sorriso' }).locator('button').click()
    ok('8b Enter aplica o Sorriso', await H.poll(page, () => window.__saves.at(-1)?.expression?.curvePreset === 'smile', { timeout: 3000 }))

    // Configurações › Visual: o EQ grande e "Restaurar plana".
    await page.keyboard.press('Control+Comma')
    await page.waitForSelector('.settings', { timeout: 5000 })
    await page.click('[data-sec="visual"], .settings nav button:has-text("Visual")').catch(() => {})
    const big = await H.poll(page, () => { const c = document.querySelector('#st-eqPlot canvas'); return !!c && c.getBoundingClientRect().height === 160 }, { timeout: 5000 })
    ok('9a Configurações › Visual: EQ de 160 px com a escala', big)
    const labels = await page.$$eval('#st-eqPlot ~ .eq-freq span', (es) => es.map((e) => e.textContent))
    // Com espaço (≥ 34 px por banda) vão os 16 rótulos; sem, um sim, um não (o runner do CI tem a janela mais estreita).
    ok('9b rótulos de frequência embaixo (vírgula em pt-BR; 16 ou 8)', labels.includes('12,5k') && (labels.length === 16 || (labels.length === 8 && labels[0] === '20')), JSON.stringify(labels))
    ok('9c "Restaurar plana" habilitado com o Sorriso', !(await page.$eval('#st-eqReset', (e) => e.disabled)))
    await page.click('#st-eqReset')
    ok('9d "Restaurar plana" volta à Plana e desabilita', await H.poll(page, () => window.__saves.at(-1)?.expression?.curvePreset === 'flat' && document.getElementById('st-eqReset').disabled, { timeout: 3000 }))
    ok('9e sem erros na página', errs.length === 0, errs.join(' | '))
    const saved = await lastSave(page)
    await page.close()

    // Reabrir: a curva e a predefinição voltam iguais.
    const custom = [...P.mids]; custom[0] = 9
    ;({ page, errs } = await openPage(b, { expression: { ...saved, curve16: custom, curvePreset: 'custom', adaptation: 'normal' } }))
    await openQuick(page)
    ok('10a reaberto com uma Personalizada: segmentado em "Personalizada" e a linha da Fixa', (await page.evaluate(segText)) === 'Personalizada' && !!(await page.$('#eqWarn')))
    await page.keyboard.press('Control+Shift+KeyD')
    ok('10b HUD: "curve custom r …"', await H.poll(page, () => /^curve custom r [\d.]+ [\d.]+ [\d.]+$/m.test(document.getElementById('hud')?.textContent || ''), { timeout: 15000 }), await page.evaluate(hudCurve))
    ok('10c log da abertura com a curva', await page.evaluate(() => window.__logs.some((l) => /expressiveness loaded: .* curve custom \[9 /.test(l))))
    await page.close()
    ;({ page, errs } = await openPage(b, { expression: { level: 0, curve: 'b', adaptation: 'normal', curve16: [3, 'x'], curvePreset: 'lows' } }))
    await openQuick(page)
    ok('10d settings.json com curve16 inválido abre com a curva Plana', (await page.evaluate(segText)) === 'Plana' && !(await page.$('#eqWarn')))
    ok('10e sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  } catch (e) {
    ok(`exceção: ${e && e.stack}`, false)
  } finally {
    await b.close()
    srv.close()
  }
  const code = await R.finish()
  process.exit(code)
})()
