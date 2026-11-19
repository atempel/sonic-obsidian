// Sincronia do visual com o som (spec 032), no Chromium headless com o bumbo simulado:
// linha `sync` do HUD (oito campos; `frame` segue o limite de fps), log `[sync]` na captura,
// Configurações › Captura › Sincronia › "Atrasar o visual" (faixa, busca, comando, sanitização,
// salvar) e o atraso aplicado no DelayNode lido de volta pelo HUD. Som e tela de verdade só no Windows.
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const H = require('./harness.cjs')
const R = H.createResults('032-sincronia')
const ok = R.ok

// Conta do `frame` e da linha sync sem navegador: src/renderer/src/sync.ts transpilado.
function loadSync() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'renderer', 'src', 'sync.ts'), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = new Module('sync.js')
  m._compile(js, 'sync.js')
  return m.exports
}
function unitTests() {
  const { FrameStats, syncLine, estimateMs } = loadSync()
  const fs30 = new FrameStats()
  for (let i = 0, t = 0; i < 400; i++, t += 1000 / 30) fs30.frame(t)
  ok('u1 30 fps: média ≈ 33,3 ms', Math.abs(fs30.avg - 33.33) < 0.1, String(fs30.avg))
  const st = new FrameStats()
  let t = 0
  for (let i = 0; i < 300; i++) st.frame((t += 16.7))
  st.frame((t += 120)) // uma queda
  st.frame((t += 60000)) // janela oculta: pausa, não queda
  st.frame((t += 16.7))
  const long = st.takeLong()
  ok('u2 maior intervalo = a queda de 120 ms; a pausa de 60 s fica fora', Math.abs(long.max - 120) < 0.01 && long.n === 301, JSON.stringify(long))
  ok('u3 takeLong recomeça a contagem', st.takeLong().n === 0)
  const p = { captureMs: NaN, ctxMs: 10, windowMs: 10.7, frameAvgMs: 16.7, frameP95Ms: 18, cap: 'cap 60', delayMs: 300, leadMs: 70 }
  ok('u4 est = ctx + janela + 1,5 quadro + atraso (captura desconhecida = 0)', Math.abs(estimateMs(p) - (10 + 10.7 + 25.05 + 300)) < 0.01)
  ok('u5 captura desconhecida aparece como "?"', /capture \? ms/.test(syncLine(p)), syncLine(p))
}

const syncLine = (page) => page.$eval('#hud', (e) => (e.textContent.split('\n').find((l) => l.startsWith('sync')) || ''))
const field = (line, name) => Number((line.match(new RegExp(`${name} ([\\d.]+)`)) || [])[1])

;(async () => {
  unitTests()
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: pulando a parte do navegador'); process.exit(await R.finish()) }
  const srv = H.serve(5254)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1400, height: 860 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    // Valor salvo fora da faixa e fora do passo: a sanitização arredonda e limita.
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false }, visualDelayMs: 9999 }, saveSettings: true })
    await H.mockAudio(page)
    await page.goto('http://localhost:5254/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })

    // 2. Log `[sync]` quando a captura começa.
    const logOk = await H.poll(page, () => window.__logs.some((l) => l.startsWith('[sync] capture started · sync · capture')), { timeout: 10000 })
    ok('2 log: "[sync] capture started" com a linha sync', logOk, JSON.stringify((await page.evaluate(() => window.__logs)).filter((l) => l.includes('sync'))))

    // 1. HUD: os oito campos.
    await page.keyboard.press('Control+Shift+D')
    await H.poll(page, () => /^sync .* frame [\d.]+\//m.test(document.querySelector('#hud').textContent), { timeout: 8000 })
    let line = await syncLine(page)
    const fields = ['capture', 'ctx', 'window', 'frame', 'cap', 'delay', 'lead', 'est']
    ok('1a HUD: linha sync com os oito campos', fields.every((f) => line.includes(` ${f} `)), line)
    ok('1b window ≈ 11 ms (metade de 1024 amostras)', [10, 11, 12].includes(field(line, 'window')), line)
    ok('1c lead = 70 ms (padrão da 024)', field(line, 'lead') === 70, line)
    ok('1d valor salvo 9999 vira 500 (sanitização)', field(line, 'delay') === 500, line)

    // 3. Configurações › Captura › Sincronia.
    await page.keyboard.press('Control+Comma'); await page.waitForTimeout(500)
    await page.click('[data-sec="captura"]'); await page.waitForTimeout(300)
    const rng = await page.$eval('#st-delay', (e) => ({ min: e.min, max: e.max, step: e.step, value: e.value }))
    ok('3a "Atrasar o visual": 0 a 500 ms em passos de 10', rng.min === '0' && rng.max === '500' && rng.step === '10' && rng.value === '500', JSON.stringify(rng))
    const grp = await page.evaluate(() => document.querySelector('#st-delay').closest('.grp, section, fieldset')?.textContent || document.body.innerText)
    ok('3b no grupo "Sincronia"', /Sincronia/.test(grp))
    for (const q of ['bluetooth', 'latency', 'atraso']) {
      await page.fill('#st-search', q); await page.waitForTimeout(250)
      const hit = await page.evaluate(() => !!document.querySelector('#st-delay')?.closest('.row')?.classList.contains('hit'))
      ok(`3c a busca acha a linha por "${q}"`, hit)
    }
    await page.fill('#st-search', ''); await page.waitForTimeout(150)
    await page.click('[data-sec="captura"]'); await page.waitForTimeout(200)

    // 4 (parte headless). 300 ms na faixa: salvo e aplicado no DelayNode (lido de volta pelo HUD).
    await page.$eval('#st-delay', (e) => { e.value = '300'; e.dispatchEvent(new Event('input', { bubbles: true })) })
    await page.waitForTimeout(300)
    ok('3d salva visualDelayMs = 300', (await page.evaluate(() => window.__saves.at(-1)?.visualDelayMs)) === 300)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    const at300 = await H.poll(page, () => /^sync .* delay 300 ms/m.test(document.querySelector('#hud').textContent), { timeout: 5000 })
    line = await syncLine(page)
    ok('4a HUD: delay 300 ms aplicado no motor', at300, line)
    ok('4b est inclui o atraso (≥ 300 + window)', field(line, 'est') >= 300 + field(line, 'window'), line)
    await page.keyboard.press('Control+Comma'); await page.waitForTimeout(400)
    await page.click('[data-sec="captura"]'); await page.waitForTimeout(200)
    await page.$eval('#st-delay', (e) => { e.value = '0'; e.dispatchEvent(new Event('input', { bubbles: true })) })
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    ok('4c de volta a 0: delay 0 ms', await H.poll(page, () => /^sync .* delay 0 ms/m.test(document.querySelector('#hud').textContent), { timeout: 5000 }), await syncLine(page))

    // 1e. `frame` acompanha o limite de fps: 30 → média perto de 33 ms. A média só se confere se o
    // runner desenha mais que 30 fps no limite de 60 (o Chromium headless sem GPU fica em poucos fps).
    const fast = field(await syncLine(page), 'frame') < 25
    await page.keyboard.press('Control+Comma'); await page.waitForTimeout(400)
    await page.click('[data-sec="render"]'); await page.waitForTimeout(200)
    await page.selectOption('#st-fps', '30')
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    ok('1e limite 30 fps aparece no campo cap', await H.poll(page, () => /^sync .* cap 30 /m.test(document.querySelector('#hud').textContent), { timeout: 5000 }), await syncLine(page))
    if (fast) {
      await page.waitForTimeout(6000)
      line = await syncLine(page)
      const avg = field(line, 'frame')
      ok('1f com limite 30 fps, frame médio perto de 33 ms', avg > 28 && avg < 40, line)
    } else console.log('1f pulado: o runner desenha menos que 40 fps (frame médio ≥ 25 ms)')

    ok('sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
