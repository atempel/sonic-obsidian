// Modo limpo sem avisos sobre o Palco (#142): com `T` ligado, só a confirmação do próprio T aparece.
// Somem os toasts do Enter/Shift+Enter, o cartão "Nenhum som chegando" e o painel de captura recusada;
// desligado, tudo volta como antes. Áudio real e o visual na tela só no Windows.
const H = require('./harness.cjs')
const R = H.createResults('142-modo-limpo')
const ok = R.ok

// Cada texto que entra no toast global (o span muda a cada aviso, mesmo repetido).
const recordToasts = () => {
  window.__toasts = []
  const watch = () => {
    const span = document.querySelector('.gtoast span')
    if (!span) return void setTimeout(watch, 100)
    new MutationObserver(() => window.__toasts.push(span.textContent)).observe(span, { childList: true, characterData: true, subtree: true })
  }
  watch()
}
const toasts = (page) => page.evaluate(() => window.__toasts.slice())
const shown = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(5242)
  const b = await H.launch()
  try {
    // 1. Modo limpo ligado: Enter, Shift+Enter e silêncio não mostram nada; T mostra a confirmação.
    let page = await b.newPage({ viewport: { width: 1280, height: 800 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false }, overlayText: { presetName: 'always', trackTitle: true, toasts: 'all', clean: true } } })
    await H.mockAudio(page)
    await page.addInitScript(recordToasts)
    await page.goto('http://localhost:5242/')
    await page.waitForSelector('.gtoast span', { state: 'attached', timeout: 30000 })
    await H.poll(page, () => document.body.classList.contains('clean'), { timeout: 15000 })
    ok('1a abre com o Modo limpo ligado', await shown(page, 'body.clean'))
    await page.mouse.move(640, 400)
    await page.keyboard.press('Enter'); await page.waitForTimeout(500)
    await page.keyboard.press('Enter'); await page.waitForTimeout(500)
    await page.keyboard.press('Shift+Enter'); await page.waitForTimeout(500)
    await page.keyboard.press('Shift+Enter'); await page.waitForTimeout(500)
    ok('1b Enter e Shift+Enter não mostram toast', (await toasts(page)).length === 0, JSON.stringify(await toasts(page)))
    // Silêncio por mais de 10 s: o cartão "Nenhum som chegando" não aparece.
    await page.evaluate(() => window.__audio('silence'))
    await page.waitForTimeout(12500)
    ok('1d silêncio de 12 s sem o cartão "Nenhum som chegando"', !(await shown(page, '.float.notice')))
    ok('1e e sem toast', (await toasts(page)).length === 0, JSON.stringify(await toasts(page)))
    // T desliga: a confirmação aparece, e o cartão de silêncio volta (o silêncio continua).
    await page.keyboard.press('t')
    ok('1f T mostra "Modo limpo desligado"', await H.poll(page, () => window.__toasts.includes('Modo limpo desligado'), { timeout: 3000 }), JSON.stringify(await toasts(page)))
    ok('1g desligado, o cartão de silêncio aparece', await H.poll(page, () => !!document.querySelector('.float.notice.in'), { timeout: 3000 }))
    await page.keyboard.press('Enter')
    ok('1h desligado, Enter volta a avisar', await H.poll(page, () => window.__toasts.some((x) => /segurado/.test(x)), { timeout: 3000 }), JSON.stringify(await toasts(page)))
    await page.keyboard.press('Enter')
    // T liga de novo: confirmação, e o cartão some.
    await page.keyboard.press('t')
    ok('1i T mostra "Modo limpo ligado"', await H.poll(page, () => window.__toasts.includes('Modo limpo ligado'), { timeout: 3000 }))
    ok('1j ligado, o cartão de silêncio some', await H.poll(page, () => !document.querySelector('.float.notice'), { timeout: 3000 }))
    ok('1k sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()

    // 2. Captura recusada com o Modo limpo ligado: sem painel; T desliga e o painel aparece.
    page = await b.newPage({ viewport: { width: 1280, height: 800 } })
    R.attach(page)
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false }, overlayText: { presetName: 'always', trackTitle: true, toasts: 'all', clean: true } }, testFlags: { captureFail: true } })
    await H.mockAudio(page)
    await page.addInitScript(recordToasts)
    await page.goto('http://localhost:5242/')
    await page.waitForSelector('.gtoast span', { state: 'attached', timeout: 30000 })
    await page.waitForTimeout(4000)
    ok('2a captura recusada, Modo limpo ligado: sem o painel', !(await shown(page, '.float.panel')))
    await page.mouse.move(640, 400)
    await page.keyboard.press('t')
    ok('2b T desliga e o painel "Não foi possível capturar o áudio" aparece', await H.poll(page, () => !!document.querySelector('.float.panel.in'), { timeout: 5000 }))
    await page.close()

    // 3. Sem Modo limpo, preferência "Avisos: nenhum": Enter continua avisando, como antes (forçado).
    page = await b.newPage({ viewport: { width: 1280, height: 800 } })
    R.attach(page)
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false }, overlayText: { presetName: 'always', trackTitle: true, toasts: 'none', clean: false } } })
    await H.mockAudio(page)
    await page.addInitScript(recordToasts)
    await page.goto('http://localhost:5242/')
    await page.waitForSelector('.gtoast span', { state: 'attached', timeout: 30000 })
    await page.waitForTimeout(1500)
    await page.mouse.move(640, 400)
    await page.keyboard.press('Enter')
    ok('3a "Avisos: nenhum" sem Modo limpo: Enter avisa como antes', await H.poll(page, () => window.__toasts.some((x) => /segurado/.test(x)), { timeout: 3000 }), JSON.stringify(await toasts(page)))
    await page.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
