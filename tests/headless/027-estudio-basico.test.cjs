// Teste headless da spec 027, fatia 1 (Estúdio: abas e Básico). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-basico.test.cjs`). Vale para estados, teclado e o valor que chega
// ao motor (lido de volta no HUD); o visual mudando enquanto arrasta só se vê no Windows.
const H = require('./harness.cjs')
const path = require('path')
const srv = H.serve(5227)
const R = H.createResults('027-estudio-basico'); const ok = R.ok

;(async () => {
  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await H.mockSo(page, { settings: { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false } } })
  await page.addInitScript(() => {
    window.__mineCalls = []
    let n = 0
    Object.assign(window.so.presets, {
      listMine: async () => [],
      saveMine: async (d) => { window.__mineCalls.push(JSON.parse(JSON.stringify(d))); return { id: String(++n).padStart(24, '0'), meta: { ...d.meta, createdAt: new Date().toISOString() } } },
      removeMine: async () => {}
    })
  })
  await H.mockAudio(page)
  await page.goto('http://localhost:5227/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1000)
  const text = () => page.evaluate(() => document.body.innerText)
  const selected = () => page.$$eval('.studio [role=tab]', es => es.filter(e => e.getAttribute('aria-selected') === 'true').map(e => e.textContent.trim()))
  const hud = () => page.$eval('#hud', e => e.textContent)

  await page.mouse.move(700, 400)
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 5000 })

  // 1. Abas com ARIA, Básico primeiro
  const tabs = await page.$$eval('.studio [role=tablist] [role=tab]', es => es.map(e => ({ t: e.textContent.trim(), c: e.getAttribute('aria-controls'), ti: e.tabIndex })))
  ok('1a abas Básico e Equações, na ordem do protótipo', tabs.map(x => x.t).join() === 'Básico,Equações', JSON.stringify(tabs))
  ok('1b abre no Básico', (await selected()).join() === 'Básico')
  ok('1c aba ligada ao painel (aria-controls) e só a ativa no Tab', tabs.every(x => x.c) && tabs.filter(x => x.ti === 0).length === 1)
  ok('1d painel do Básico visível, o das equações escondido', (await page.isVisible('#studio-tp-basic')) && !(await page.isVisible('#studio-tp-eq')))

  // 2. Os 18 parâmetros, com o nome em .num
  const names = await page.$$eval('#studio-tp-basic .ctl .pn', es => es.map(e => e.textContent))
  ok('2a 18 parâmetros', names.length === 18, names.join(' '))
  ok('2b grupos Movimento, Rastro, Onda principal, Efeitos', (await page.$$eval('#studio-tp-basic .grp h3', es => es.map(e => e.textContent))).join() === 'Movimento,Rastro,Onda principal,Efeitos')
  ok('2c nomes dos parâmetros em fonte mono', await page.$eval('#studio-tp-basic .pn', e => e.classList.contains('num')))
  ok('2d 8 formas de onda', (await page.$$eval('#studio-p-wave_mode option', es => es.length)) === 8)
  await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', '027-estudio-basico.png') }).catch(() => {})

  // 3. Teclado: Ctrl+2, setas, Home/End
  await page.keyboard.press('Control+2')
  ok('3a Ctrl+2 vai para Equações', (await selected()).join() === 'Equações' && (await page.isVisible('#studio-tp-eq')))
  await page.focus('#studio-tab-eq'); await page.keyboard.press('ArrowLeft')
  ok('3b seta para a esquerda volta ao Básico com o foco na aba', (await selected()).join() === 'Básico' && (await page.evaluate(() => document.activeElement?.id)) === 'studio-tab-basic')
  await page.keyboard.press('End')
  ok('3c End vai para a última', (await selected()).join() === 'Equações')
  await page.keyboard.press('Home')
  ok('3d Home volta para a primeira', (await selected()).join() === 'Básico')

  // 4. Slider: valor na hora, no motor, sem recompilar; erro impossível
  await page.keyboard.press('Control+Shift+d')
  await page.$eval('#studio-p-zoom', (e) => { e.value = '1.05'; e.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.waitForTimeout(150)
  ok('4a valor mostrado em ciano atualiza', (await page.$eval('#studio-p-zoom', e => e.closest('.ctl').querySelector('output').textContent)) === '1.050')
  ok('4b o motor recebe o valor (HUD lê do runner)', /studio: live zoom = 1\.050/.test(await hud()), (await hud()).split('\n').find(l => l.startsWith('studio')))
  await page.$eval('#studio-p-warp', (e) => { e.value = '99'; e.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.waitForTimeout(100)
  const warp = await page.$eval('#studio-p-warp', e => e.closest('.ctl').querySelector('output').textContent)
  ok('4c fora da faixa fica preso a ela', Number(warp) <= 5 && Number(warp) >= 0, warp)
  await page.check('#studio-p-invert', { force: true })
  await H.poll(page, () => /studio: live invert/.test(document.getElementById('hud').textContent), { timeout: 2000 })
  ok('4d switch vira 1 no motor', /studio: live invert = 1\.000/.test(await hud()), (await hud()).split('\n').find(l => l.startsWith('studio')))
  await page.selectOption('#studio-p-wave_mode', '6')
  await H.poll(page, () => /studio: live wave_mode/.test(document.getElementById('hud').textContent), { timeout: 2000 })
  ok('4e forma da onda vai para o motor', /studio: live wave_mode = 6\.000/.test(await hud()))
  ok('4f selo "Seu remix" com mudança', await page.isVisible('.chip.tl:has-text("Seu remix")'))
  await page.keyboard.press('Control+Shift+d')

  // 5. Salvar leva os parâmetros
  await page.keyboard.press('Control+s')
  await H.poll(page, () => (window.__mineCalls || []).length >= 1, { timeout: 10000 })
  const call = (await page.evaluate(() => window.__mineCalls))[0] || {}
  const bv = call.preset?.baseVals || {}
  ok('5a preset salvo com zoom, invert e wave_mode do Básico', bv.zoom === 1.05 && bv.invert === 1 && bv.wave_mode === 6, JSON.stringify(call).slice(0, 300) + ` ask=${await page.isVisible('.st-ask')} status=${await page.$eval('.cstat', e => e.textContent)} toast=${await page.$eval('.toast', e => e.textContent).catch(() => '-')}`)

  // 6. Ir para a linha troca de aba
  await page.keyboard.press('Control+2')
  await page.fill('.studio .ed-ta >> nth=1', 'rot = sin(time;')
  await H.poll(page, () => !!document.querySelector('.perr .btn'), { timeout: 4000 })
  await page.keyboard.press('Control+1')
  await page.click('.perr .btn')
  await page.waitForTimeout(200)
  ok('6a "Ir para a linha" abre Equações e foca o bloco', (await selected()).join() === 'Equações' && (await page.evaluate(() => document.activeElement === document.querySelectorAll('.studio .ed-ta')[1])))

  // 7. Fim
  await page.evaluate(() => document.activeElement?.blur())
  ok('7a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
