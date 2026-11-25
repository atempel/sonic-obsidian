// Teste headless da spec 045 (queda do contexto WebGL do motor principal).
// Uso: `npm run build` e `npm run test:ui` (ou `node tests/headless/045-contexto-webgl.test.cjs`).
// O Butterchurn 3 desenha num OffscreenCanvas interno: o teste guarda o contexto webgl2 dele, derruba com
// WEBGL_lose_context e confere o log, a espera de ~1,5 s, o recarregamento e o contador da sessão.
// O segundo motor do Estúdio (critério 3) segue no `027-estudio-comparar` (A17–A19). TDR de verdade: só no Windows.
const H = require('./harness.cjs')
const srv = H.serve(5262)
const R = H.createResults('045-contexto-webgl'); const ok = R.ok

;(async () => {
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1200, height: 760 } }); R.attach(page)
    const errs = []; page.on('pageerror', e => errs.push(String(e)))
    // O log simulado zera a cada carga (addInitScript); o console da página não: guarda tudo com a hora.
    const logs = []; page.on('console', m => { const t = m.text(); if (t.startsWith('[so.log] ')) logs.push([Date.now(), t.slice(9)]) })
    let loads = 0; const loadT = []; page.on('load', () => { loads++; loadT.push(Date.now()) })
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false } } })
    // settings.json simulado que sobrevive ao reload (sessionStorage), para conferir o último preset.
    await page.addInitScript(() => {
      window.so.settings = {
        load: async () => JSON.parse(sessionStorage.getItem('t.settings') || 'null') || { welcomeSeen: true, rotation: { enabled: false } },
        save: async (d) => { sessionStorage.setItem('t.settings', JSON.stringify(d)) }
      }
      window.__gls = []
      const get = OffscreenCanvas.prototype.getContext
      OffscreenCanvas.prototype.getContext = function (type, ...a) { const c = get.call(this, type, ...a); if (type === 'webgl2' && c) window.__gls.push(c); return c }
    })
    await H.mockAudio(page)
    const ready = async () => {
      await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
      return page.$eval('.now-title', e => e.getAttribute('title'))
    }
    await page.goto('http://localhost:5262/')
    const first = await ready()
    const saved = await H.poll(page, (n) => JSON.parse(sessionStorage.getItem('t.settings') || '{}').lastPreset === n, { timeout: 8000, arg: first })
    ok('0 settings simulado guardou o preset atual', saved, first)
    ok('4 abertura normal sem "not watched"', !logs.some(([, l]) => /not watched/.test(l)))
    ok('0b o motor criou um contexto webgl2 num OffscreenCanvas', await page.evaluate(() => window.__gls.length >= 1), String(await page.evaluate(() => window.__gls.length)))

    // Queda 1
    const lose = () => page.evaluate(() => { window.__gls[0].getExtension('WEBGL_lose_context').loseContext() })
    const l0 = loads
    const t1 = Date.now(); await lose()
    await page.waitForEvent('load', { timeout: 15000 }).catch(() => null)
    const lost1 = logs.find(([, l]) => /^WebGL context lost/.test(l))
    ok('1a log: "WebGL context lost (#1 this session); reloading in 1.5 s"', lost1?.[1] === 'WebGL context lost (#1 this session); reloading in 1.5 s', lost1?.[1] || '(nada)')
    const waited = (loadT[l0] ?? 0) - t1
    ok('1b recarrega depois de ~1,5 s (não antes de 1 s)', loads === l0 + 1 && waited >= 1000, `${waited} ms`)
    const after = await ready()
    ok('1c volta a desenhar o mesmo preset (último salvo)', after === first, `${first} → ${after}`)
    ok('1d o motor novo tem contexto próprio', await page.evaluate(() => window.__gls.length >= 1 && !window.__gls[0].isContextLost()))

    // Queda 2: o contador sobrevive ao reload
    await lose()
    await page.waitForEvent('load', { timeout: 15000 }).catch(() => null)
    const lost2 = logs.filter(([, l]) => /^WebGL context lost/.test(l))[1]
    ok('2 segunda queda registra #2', lost2?.[1] === 'WebGL context lost (#2 this session); reloading in 1.5 s', lost2?.[1] || '(nada)')
    await ready()
    ok('4b nenhuma abertura registrou "not watched"', !logs.some(([, l]) => /not watched/.test(l)))
    ok('5 sem erros na página', errs.length === 0, errs.join(' | '))
  } catch (e) {
    console.error(e); ok('execução sem exceção', false, String(e))
  } finally {
    await b.close(); srv.close()
    process.exit(await R.finish())
  }
})()
