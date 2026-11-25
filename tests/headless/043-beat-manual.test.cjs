// Spec 043: "Trocas manuais no beat" separado de "Trocar no beat" (rotação automática).
// O bumbo sintético a 124 BPM do harness trava a batida; mede se a seta espera a batida ou troca na hora.
// Áudio real e a sensação de atraso, só no Windows.
const H = require('./harness.cjs')
const R = H.createResults('043-beat-manual'); const ok = R.ok
const BPM = 124, BEAT_S = 60 / BPM
const LIGHT_LIB = { version: 1, favorites: [], hidden: [], hiddenPerf: [], recents: [], presetFps: {}, collections: [
  { id: 'leves', name: 'Leves', intervalSeconds: 30, presets: ['Rovastar - Oozing Resistance', 'Aderrasi - Potion of Spirits', 'Cope - The Neverending Explosion of Red Liquid Fire'] }] }
const RENDER = { meshWidth: 32, meshHeight: 24, pixelRatio: 1, textureRatio: 0.5, fxaa: false, canvasScale: 0.5, extraImages: false }

const track = () => {
  window.__changes = []
  new MutationObserver(() => {
    const t = document.querySelector('.now-title')?.getAttribute('title')
    if (t && t !== window.__changes.at(-1)?.name) window.__changes.push({ name: t, at: performance.now() })
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['title'] })
}
// Aperta → e devolve quanto a troca demorou (ms) e se o botão ficou tracejado no meio.
const pressNext = (page) => page.evaluate(() => new Promise((res) => {
  const t = performance.now(); let dashed = false
  const sel = 'button[aria-label="Próximo preset"].wait'
  const seen = () => { if (!dashed && document.querySelector(sel)) dashed = true }
  const mo = new MutationObserver(seen)
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
  const done = (r) => { clearInterval(id); seen(); mo.disconnect(); res(r) }
  document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }))
  seen()
  const id = setInterval(() => {
    seen()
    const n = window.__changes.at(-1)
    if (n && n.at > t) { done({ wait: n.at - t, dashed }); return }
    if (performance.now() - t > 3000) done({ wait: -1, dashed })
  }, 5)
}))

async function open(b, port, rotation) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); R.attach(page)
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
  await H.mockSo(page, { saveSettings: true, library: LIGHT_LIB, settings: { welcomeSeen: true, rotation: { enabled: true, intervalSeconds: 30, bars: 4, order: 'collection', collectionId: 'leves', ...rotation }, render: RENDER } })
  await H.mockAudio(page, { bpm: BPM })
  await page.addInitScript(track)
  await page.goto(`http://localhost:${port}/`)
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.keyboard.press('Control+Shift+KeyD')
  const locked = await H.poll(page, () => /beat locked/.test(document.getElementById('hud')?.textContent || ''), { timeout: 15000 })
  await page.mouse.move(640, 400)
  return { page, errs, locked }
}

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(5258)
  const b = await H.launch()
  try {
    // 1. Rotação no beat ligada, trocas manuais no beat desligadas: a seta troca na hora.
    let { page, errs, locked } = await open(b, 5258, { onBeat: true, manualOnBeat: false })
    ok('1a batida travada', locked)
    const fps = Number(/^(\d+) fps/.exec(await page.$eval('#hud', (e) => e.textContent))?.[1]) || 60
    const r1 = await pressNext(page)
    ok('1b → troca sem esperar a batida (sem tracejado)', r1.wait >= 0 && !r1.dashed, JSON.stringify(r1))
    ok('1c ponto de beat visível (rotação no beat)', await page.isVisible('.strip .bdot'))
    // Ajustes rápidos: os dois switches, independentes.
    await page.keyboard.press('Comma')
    await H.poll(page, () => document.body.classList.contains('sheet-open'), { timeout: 3000 })
    ok('1d Ajustes: "Trocar no beat" ligado e "Trocas manuais no beat" desligado', await page.evaluate(() => document.getElementById('beatSwitch').checked && !document.getElementById('manualBeatSwitch').checked))
    await page.click('label.switch:has(#manualBeatSwitch)')
    ok('1e ligar "Trocas manuais no beat" salva sem mexer no outro', await H.poll(page, () => { const r = window.__saves.at(-1)?.rotation; return !!r && r.manualOnBeat === true && r.onBeat === true }, { timeout: 3000 }))
    await page.keyboard.press('Escape')
    await H.poll(page, () => !document.body.classList.contains('sheet-open'), { timeout: 3000 })
    await page.mouse.move(640, 400)
    const r2 = await pressNext(page)
    // Espera a batida (tracejado) em vez de trocar na hora. Logo depois de fechar os Ajustes, um quadro longo no
    // runner lento pode fazer a troca perder uma batida e sair na seguinte (813 ms a 35 fps no CI): até 2 batidas.
    ok('1f agora → espera a batida, com tracejado', r2.wait >= 0 && r2.wait <= 2 * BEAT_S * 1000 + 1000 / fps + 80 && r2.dashed, `${JSON.stringify(r2)} a ${fps} fps`)
    ok('1g sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()

    // 2. Só as trocas manuais no beat (rotação automática desligada): a seta espera; Configurações mostram as duas linhas.
    ;({ page, errs, locked } = await open(b, 5258, { enabled: false, onBeat: false, manualOnBeat: true }))
    ok('2a batida travada', locked)
    const r3 = await pressNext(page)
    ok('2b → espera a batida com a rotação desligada', r3.wait >= 0 && r3.dashed, JSON.stringify(r3))
    ok('2c ponto de beat visível só com as trocas manuais no beat', await H.poll(page, () => !!document.querySelector('.strip .bdot'), { timeout: 3000 }))
    await page.keyboard.press('Control+Comma')
    await page.waitForSelector('#st-mbeat', { state: 'attached', timeout: 5000 })
    ok('2d Configurações: "Trocar no beat" desligado, "Trocas manuais no beat" ligado', await page.evaluate(() => !document.getElementById('st-beat').checked && document.getElementById('st-mbeat').checked))
    ok('2e "Adiantar o visual" habilitado com qualquer um dos dois', await page.$eval('#st-lead', (e) => !e.disabled))
    ok('2f sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
