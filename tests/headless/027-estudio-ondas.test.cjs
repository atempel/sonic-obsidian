// Teste headless da spec 027, fatia 2 (Estúdio: Ondas e Formas). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-ondas.test.cjs`). Vale para estados, teclado, erros com bloco e linha
// e o que o motor ligou (lido de volta no HUD); a onda aparecendo na tela só se vê no Windows.
// Preset: "Martin - liquid arrows" (ondas todas desligadas, só a Forma 3 ligada; Onda 1 com espectro).
const H = require('./harness.cjs')
const path = require('path')
const srv = H.serve(5232)
const R = H.createResults('027-estudio-ondas'); const ok = R.ok

;(async () => {
  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await H.mockSo(page, { settings: { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false }, startupPreset: 'last', lastPreset: 'Martin - liquid arrows' } })
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
  await page.goto('http://localhost:5232/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1000)
  const selected = () => page.$$eval('.studio [role=tab]', es => es.filter(e => e.getAttribute('aria-selected') === 'true').map(e => e.textContent.trim()))
  const status = () => page.$eval('.cstat', e => e.textContent.trim())
  const waitStatus = (re, timeout = 10000) => H.poll(page, (src) => new RegExp(src).test(document.querySelector('.cstat')?.textContent.trim() ?? ''), { timeout, arg: re.source })
  const hudLine = () => page.$eval('#hud', e => e.textContent.split('\n').find(l => l.startsWith('studio: live waves')) || '')

  ok('0a preset certo tocando', /liquid arrows/.test(await page.$eval('.now-title', e => e.getAttribute('title'))))
  await page.keyboard.press('Control+Shift+d')
  await page.mouse.move(700, 400)
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 5000 })
  await waitStatus(/^Compilado$/)

  // 1. Abas novas e teclado
  const tabs = await page.$$eval('.studio [role=tablist] [role=tab]', es => es.map(e => e.textContent.trim()))
  ok('1a abas Básico, Equações, Ondas, Formas, Shaders (ordem do protótipo)', tabs.join() === 'Básico,Equações,Ondas,Formas,Shaders', tabs.join())
  await page.keyboard.press('Control+3')
  ok('1b Ctrl+3 vai para Ondas', (await selected()).join() === 'Ondas' && (await page.isVisible('#studio-tp-waves')))
  await page.keyboard.press('Control+4')
  ok('1c Ctrl+4 vai para Formas', (await selected()).join() === 'Formas' && (await page.isVisible('#studio-tp-shapes')) && !(await page.isVisible('#studio-tp-waves')))
  await page.focus('#studio-tab-shapes'); await page.keyboard.press('Home'); await page.keyboard.press('End')
  ok('1d End vai para a última (Shaders)', (await selected()).join() === 'Shaders')

  // 2. Ondas: 4 slots, sanfona, desligado = só leitura
  await page.keyboard.press('Control+3')
  const slots = await page.$$eval('#studio-tp-waves .slot', es => es.map(e => ({ t: e.querySelector('.slot-t').textContent.trim(), x: e.querySelector('.slot-t').getAttribute('aria-expanded'), off: e.classList.contains('off'), on: e.querySelector('.slot-h input').checked })))
  ok('2a 4 ondas, a primeira aberta', slots.length === 4 && slots.map(s => s.t).join() === 'Onda 1,Onda 2,Onda 3,Onda 4' && slots.map(s => s.x).join() === 'true,false,false,false', JSON.stringify(slots))
  ok('2b todas desligadas neste preset ("Ativa" desmarcada)', slots.every(s => s.off && !s.on))
  ok('2c parâmetros da onda: samples, sep, spectrum (nome em .num)', (await page.$$eval('#studio-slot-wave0 .ctl .pn', es => es.map(e => e.textContent))).join() === 'samples,sep,spectrum')
  ok('2d slot desligado: controles desabilitados e editores só leitura', await page.$eval('#studio-slot-wave0', e => [...e.querySelectorAll('.ctl input')].every(i => i.disabled) && [...e.querySelectorAll('.ed-ta')].every(t => t.readOnly) && e.querySelectorAll('.ed-ta').length === 2))
  ok('2e valor do preset no controle (Onda 1 com espectro)', await page.$eval('#studio-s-wave0-spectrum', e => e.checked))
  ok('2f blocos per_frame e per_point, com o nome no .milk ao lado', (await page.$$eval('#studio-slot-wave0 .ed-label', es => es.map(e => e.textContent))).join() === 'per_framewave_0_per_frame,per_pointwave_0_per_point')
  ok('2g interruptor com nome acessível do slot', (await page.$eval('#studio-tp-waves .slot >> nth=1', e => e.querySelector('.slot-h input').getAttribute('aria-label'))) === 'Onda 2: ativa')
  await page.click('#studio-tp-waves .slot >> nth=1 >> .slot-t')
  ok('2h abrir a Onda 2 fecha a Onda 1', (await page.$$eval('#studio-tp-waves .slot-t', es => es.map(e => e.getAttribute('aria-expanded')))).join() === 'false,true,false,false')

  // 3. Critério 2: ligar a Onda 2 e escrever um per_point válido → o motor liga a onda
  await page.click('#studio-tp-waves .slot >> nth=1 >> .slot-h .switch')
  ok('3a "Ativa" libera os controles e os editores', await page.$eval('#studio-slot-wave1', e => [...e.querySelectorAll('.ctl input')].every(i => !i.disabled) && [...e.querySelectorAll('.ed-ta')].every(t => !t.readOnly)))
  await page.fill('#studio-slot-wave1 .ed-ta >> nth=1', 'x = sample;\ny = 0.5 + value1*0.4;')
  await page.$eval('#studio-s-wave1-samples', (e) => { e.value = '256'; e.dispatchEvent(new Event('input', { bubbles: true })) })
  const compiled = await waitStatus(/^Compilado$/)
  const live = await H.poll(page, () => /studio: live waves 2 /.test(document.getElementById('hud').textContent), { timeout: 8000 })
  ok('3b compila e o motor fica com a Onda 2 ligada (HUD lê do motor)', compiled && live, `${await status()} · ${await hudLine()}`)
  await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', '027-estudio-ondas.png') }).catch(() => {})

  // 4. Erro no per_point: bloco, linha, versão anterior continua
  await page.fill('#studio-slot-wave1 .ed-ta >> nth=1', 'x = sample;\ny = sin(time;')
  const errd = await waitStatus(/^1 erro$/)
  const msg = await page.$eval('.perr p', e => e.textContent).catch(() => '')
  ok('4a erro mostra o bloco e a linha (wave_1_per_point, linha 2)', errd && /^wave_1_per_point, linha 2: /.test(msg), `${await status()} · ${msg}`)
  ok('4b a prévia segue na última versão válida', (await page.isVisible('.chip.tr.warn')) && /studio: live waves 2 /.test(await hudLine()))
  ok('4c a linha do erro marcada no editor da onda', await page.$eval('#studio-slot-wave1', e => !!e.querySelector('.ed-gut .err')))
  // "Ir para a linha" de outra aba abre a aba e o slot certos
  await page.keyboard.press('Control+1')
  await page.click('.perr .btn')
  const focused = await H.poll(page, () => document.activeElement === document.querySelectorAll('#studio-slot-wave1 .ed-ta')[1], { timeout: 3000, every: 100 })
  ok('4d "Ir para a linha" volta a Ondas com a Onda 2 aberta e focada', focused && (await selected()).join() === 'Ondas', `foco=${focused} aba=${await selected()}`)
  await page.fill('#studio-slot-wave1 .ed-ta >> nth=1', 'x = sample;\ny = 0.5 + value1*0.4;')
  ok('4e corrigido, volta a compilar', await waitStatus(/^Compilado$/))

  // 5. Laço sem fim numa forma não congela: o Worker para e acusa o bloco
  await page.keyboard.press('Control+4')
  ok('5a Formas: Forma 3 ligada no preset, parâmetros sides/rad/ang/textured', (await page.$$eval('#studio-tp-shapes .slot', es => es.map(e => e.querySelector('.slot-h input').checked))).join() === 'false,false,true,false' && (await page.$$eval('#studio-slot-shape0 .ctl .pn', es => es.map(e => e.textContent))).join() === 'sides,rad,ang,textured')
  await page.click('#studio-tp-shapes .slot >> nth=2 >> .slot-t')
  const before = await page.inputValue('#studio-slot-shape2 .ed-ta')
  await page.fill('#studio-slot-shape2 .ed-ta', 'loop(100000000, rad = rad + 0.0000001);\n' + before)
  const slowErr = await waitStatus(/^1 erro$/, 15000)
  const slowMsg = await page.$eval('.perr p', e => e.textContent).catch(() => '')
  ok('5b per_frame lento demais na forma: recusado no bloco da forma', slowErr && /^shape_2_per_frame/.test(slowMsg), `${await status()} · ${slowMsg}`)
  await page.fill('#studio-slot-shape2 .ed-ta', before)
  await waitStatus(/^Compilado$/)
  await page.$eval('#studio-s-shape2-sides', (e) => { e.value = '999'; e.dispatchEvent(new Event('input', { bubbles: true })) })
  ok('5c lados fora da faixa ficam presos a ela (erro impossível)', (await page.$eval('#studio-s-shape2-sides', e => e.closest('.ctl').querySelector('output').textContent)) === '100')
  await page.$eval('#studio-s-shape2-sides', (e) => { e.value = '7'; e.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.click('#studio-tp-shapes .slot >> nth=2 >> .slot-h .switch')
  await waitStatus(/^Compilado$/)
  const off = await H.poll(page, () => /studio: live waves 2 · shapes -/.test(document.getElementById('hud').textContent), { timeout: 8000 })
  ok('5d desligar a Forma 3 tira a forma do motor', off, await hudLine())

  // 6. Salvar leva ondas e formas, sem perder o resto do slot
  await page.keyboard.press('Control+s')
  await H.poll(page, () => (window.__mineCalls || []).length >= 1, { timeout: 10000 })
  const p = ((await page.evaluate(() => window.__mineCalls))[0] || {}).preset || {}
  const w1 = p.waves?.[1] || {}, w0 = p.waves?.[0] || {}, s2 = p.shapes?.[2] || {}
  ok('6a Onda 2 salva ligada, com samples e per_point', w1.baseVals?.enabled === 1 && w1.baseVals?.samples === 256 && /value1\*0\.4/.test(w1.point_eqs_eel || ''), JSON.stringify(w1).slice(0, 200))
  ok('6b Forma 3 salva desligada com 7 lados, equação original', s2.baseVals?.enabled === 0 && s2.baseVals?.sides === 7 && s2.frame_eqs_eel === before, JSON.stringify(s2).slice(0, 200))
  ok('6c resto da Onda 1 intacto (usedots, scaling)', w0.baseVals?.usedots === 1 && w0.baseVals?.scaling === 0.5033 && p.waves.length === 4 && p.shapes.length === 4)

  // 7. Fim
  await page.evaluate(() => document.activeElement?.blur())
  ok('7a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
