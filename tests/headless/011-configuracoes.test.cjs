// Spec 011: Ctrl+, abre as Configurações; o painel cabe na janela em 1280×800 e 1920×1080; Esc fecha.
const H = require('./harness.cjs')
const srv = H.serve(5202)
const R = H.createResults('011-configuracoes'); const ok = R.ok
;(async () => {
  const b = await H.launch()
  const errs = []
  for (const [w, h] of [[1280, 800], [1920, 1080]]) {
    const page = await b.newPage({ viewport: { width: w, height: h } }); R.attach(page)
    page.on('pageerror', e => errs.push(String(e)))
    await H.mockSo(page); await H.mockAudio(page)
    await page.goto('http://localhost:5202/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
    await page.waitForTimeout(1000)
    await page.mouse.move(w / 2, h / 2)
    await page.keyboard.press('Control+Comma'); await page.waitForTimeout(700)
    ok(`${w}x${h} Ctrl+, abre as Configurações`, await page.evaluate(() => document.body.classList.contains('settings-open')) && await page.isVisible('.settings .win'))
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s).getBoundingClientRect()
      const a = q('.settings'), c = q('.settings .win')
      const p = document.querySelector('section.panel:not([hidden])'); const g = p ? p.getBoundingClientRect() : null
      return { settings: [a.left, a.top, a.right, a.bottom], win: [c.left, c.top, c.right, c.bottom], panel: g && [g.width, g.height], vw: innerWidth, vh: innerHeight }
    })
    const inside = (bx) => bx[0] >= -0.5 && bx[1] >= -0.5 && bx[2] <= r.vw + 0.5 && bx[3] <= r.vh + 0.5
    ok(`${w}x${h} painel .settings inteiro dentro da viewport`, inside(r.settings) && inside(r.win), JSON.stringify(r))
    ok(`${w}x${h} primeiro grupo visível`, !!r.panel && r.panel[0] > 0 && r.panel[1] > 0 && await page.isVisible('section.panel:not([hidden])'), JSON.stringify(r.panel))
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
    ok(`${w}x${h} Esc fecha`, !(await page.evaluate(() => document.body.classList.contains('settings-open'))))
    await page.close()
  }
  ok('sem erros na página', errs.length === 0, JSON.stringify(errs.slice(0, 5)))
  const code = await R.finish()
  await b.close(); srv.close(); process.exit(code)
})().catch(e => { R.dump(); console.error(e); process.exit(1) })
