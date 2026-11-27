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
    // runner lento pode fazer a troca perder uma batida e sair na seguinte (813 ms a 35 fps no CI): até 2 batidas,
    // com folga de 2 quadros + 120 ms (609 ms contra 606 no CI, #178).
    ok('1f agora → espera a batida, com tracejado', r2.wait >= 0 && r2.wait <= 2 * BEAT_S * 1000 + 2 * 1000 / fps + 120 && r2.dashed, `${JSON.stringify(r2)} a ${fps} fps`)
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
    // Spec 048 (design fb12): a linha mora em Captura, logo abaixo de "Atrasar o visual".
    const where = await page.evaluate(() => {
      const lead = document.getElementById('st-lead'), delay = document.getElementById('st-delay')
      const lr = lead.closest('.row'), dr = delay.closest('.row')
      return { panel: lead.closest('[data-panel]')?.dataset.panel, next: dr.nextElementSibling === lr, visual: !!document.querySelector('[data-panel="visual"] #st-lead'),
        value: lead.value, min: lead.min, max: lead.max, step: lead.step, help: lr.querySelector('.help')?.textContent, val: lr.textContent }
    })
    ok('2g "Adiantar o visual" em Captura, logo abaixo de "Atrasar o visual"; fora de Visual', where.panel === 'captura' && where.next && !where.visual, JSON.stringify(where))
    ok('2h 0 a 200 ms em passos de 10, 70 ms, ajuda nova', where.value === '70' && where.min === '0' && where.max === '200' && where.step === '10' && where.help === 'Compensa o atraso entre o som e a imagem. Aumente se o visual parecer atrasado.' && /70 ms/.test(where.val), JSON.stringify(where))
    for (const q of ['adiantar', 'lead', 'latency']) {
      await page.fill('#st-search', q)
      ok(`2i a busca acha a linha por "${q}" em Captura`, await H.poll(page, () => !!document.querySelector('[data-panel="captura"]:not([hidden]) #st-lead')?.closest('.row')?.classList.contains('hit'), { timeout: 3000 }))
    }
    await page.fill('#st-search', '')
    await page.click('[data-sec="captura"]')
    await page.$eval('#st-lead', (e) => { e.value = '120'; e.dispatchEvent(new Event('input', { bubbles: true })) })
    ok('2j o slider no lugar novo salva beatLeadMs = 120', await H.poll(page, () => window.__saves.at(-1)?.rotation?.beatLeadMs === 120, { timeout: 3000 }))
    ok('2k o detector usa o valor novo (linha sync do HUD: lead 120)', await H.poll(page, () => / lead 120 /.test(document.getElementById('hud')?.textContent || ''), { timeout: 4000 }))
    // Com as duas opções de beat desligadas: desabilitada e a ajuda diz quando vale.
    await page.click('[data-sec="visual"]')
    await page.click('label.switch:has(#st-mbeat)')
    await page.click('[data-sec="captura"]')
    const off = await H.poll(page, () => { const e = document.getElementById('st-lead'); return e.disabled && /Vale com "Trocar no beat" ou "Trocas manuais no beat"/.test(e.closest('.row').querySelector('.help').textContent) }, { timeout: 3000 })
    ok('2l sem as duas opções de beat: desabilitada, com a ajuda de quando vale', off, await page.$eval('#st-lead', (e) => `${e.disabled} ${e.closest('.row').querySelector('.help').textContent}`))
    await page.keyboard.press('Escape')
    // Painel `?`: a linha do Esc da espera, junto de "Fechar painel ou gaveta".
    await H.poll(page, () => !document.querySelector('.settings'), { timeout: 3000 })
    await page.keyboard.press('Shift+Slash')
    const kp = await H.poll(page, () => { const t = document.body.innerText; return t.includes('Fechar painel ou gaveta') && t.includes('Cancelar a troca que espera o beat') }, { timeout: 3000 })
    ok('2m painel ?: linha "Cancelar a troca que espera o beat"', kp)
    await page.keyboard.press('Escape')
    ok('2f sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()

    // 3. Esc na espera do beat (spec 048): desiste da troca e não faz mais nada nesse toque.
    ;({ page, errs, locked } = await open(b, 5258, { enabled: false, onBeat: false, manualOnBeat: true }))
    ok('3a batida travada', locked)
    // Tela cheia simulada (a janela do tamanho da tela) e o pedido de sair contado.
    await page.evaluate(() => {
      window.__fs = 0; window.so.window.toggleFullScreen = async () => { window.__fs++ }
      Object.defineProperty(screen, 'width', { get: () => window.innerWidth }); Object.defineProperty(screen, 'height', { get: () => window.innerHeight })
    })
    await page.keyboard.press('Comma')
    await H.poll(page, () => document.body.classList.contains('sheet-open'), { timeout: 3000 })
    // → e Esc assim que o tracejado aparece; se a batida chegou antes do Esc, tenta de novo.
    const escInWait = () => page.evaluate(() => new Promise((res) => {
      const before = window.__changes.length; const sel = 'button[aria-label="Próximo preset"].wait'
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }))
      const t0 = performance.now()
      const id = setInterval(() => {
        if (window.__changes.length > before) { clearInterval(id); res({ raced: true }); return }
        if (document.querySelector(sel)) {
          clearInterval(id)
          document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))
          const n = window.__changes.length
          setTimeout(() => res({ raced: false, changed: window.__changes.length > n, dashed: !!document.querySelector(sel), sheet: document.body.classList.contains('sheet-open'), fs: window.__fs }), 2 * 60000 / 124 + 300)
          return
        }
        if (performance.now() - t0 > 3000) { clearInterval(id); res({ raced: false, noWait: true }) }
      }, 2)
    }))
    let e1 = await escInWait()
    for (let i = 0; i < 3 && e1.raced; i++) e1 = await escInWait()
    ok('3b → e Esc antes da batida: o preset não troca e o tracejado some', !e1.raced && !e1.noWait && !e1.changed && !e1.dashed, JSON.stringify(e1))
    ok('3c os Ajustes rápidos continuam abertos', e1.sheet === true, JSON.stringify(e1))
    await page.keyboard.press('Escape')
    ok('3d sem espera, Esc fecha os Ajustes como antes', await H.poll(page, () => !document.body.classList.contains('sheet-open'), { timeout: 3000 }))
    await page.mouse.move(640, 400)
    let e2 = await escInWait()
    for (let i = 0; i < 3 && e2.raced; i++) e2 = await escInWait()
    ok('3e na tela cheia: → e Esc na espera não saem da tela cheia nem trocam', !e2.raced && !e2.noWait && !e2.changed && !e2.dashed && e2.fs === 0, JSON.stringify(e2))
    await page.keyboard.press('Escape')
    ok('3f sem espera, Esc sai da tela cheia como antes', await H.poll(page, () => window.__fs === 1, { timeout: 3000 }))
    ok('3g sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
