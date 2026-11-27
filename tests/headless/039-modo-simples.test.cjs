// Spec 039: Modo Simples. Padrão Completo, troca nas Configurações e na busca, faixa curta,
// Ajustes rápidos, Biblioteca e painel `?` reduzidos, todo atalho valendo e nada de estado perdido.
// O visual não piscar na troca e a faixa sumindo como antes, só no Windows.
const H = require('./harness.cjs')
const R = H.createResults('039-modo-simples'); const ok = R.ok
const PORT = 5239
const RENDER = { meshWidth: 32, meshHeight: 24, pixelRatio: 1, textureRatio: 0.5, fxaa: false, canvasScale: 0.5, extraImages: false }
const COLS = [{ id: 'leves', name: 'Leves', intervalSeconds: 15, presets: ['Rovastar - Oozing Resistance', 'Aderrasi - Potion of Spirits', 'Cope - The Neverending Explosion of Red Liquid Fire'] }]
const lib = (collections = []) => ({ version: 1, favorites: [], hidden: [], hiddenPerf: [], recents: [], presetFps: {}, collections })

async function open(b, settings, library = lib()) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); R.attach(page)
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
  await H.mockSo(page, { saveSettings: true, library, settings: { welcomeSeen: true, render: RENDER, ...settings } })
  await H.mockAudio(page)
  await page.goto(`http://localhost:${PORT}/`)
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.mouse.move(640, 400)
  return { page, errs }
}
// O que a faixa mostra, na ordem do DOM: nome/autor, botões pelo rótulo e o medidor.
const stripItems = (page) => page.$$eval('.strip .now-text, .strip button, .strip .level', (es) => es.map((e) => (e.classList.contains('now-text') ? 'nome' : e.classList.contains('level') ? 'medidor' : e.getAttribute('aria-label') || e.textContent.trim())))
const lastSave = (page) => page.evaluate(() => window.__saves.at(-1) || null)
const quickSections = (page) => page.$$eval('.sheet .body section h3 span', (es) => es.map((e) => e.textContent))
const tabs = (page) => page.$$eval('.lib .ltabs [role=tab]', (es) => es.map((e) => e.firstChild.textContent.trim()))
const hud = (page) => page.$eval('#hud', (e) => e.textContent)
const closeAll = async (page) => {
  for (let i = 0; i < 3; i++) await page.keyboard.press('Escape')
  await H.poll(page, () => !document.body.classList.contains('sheet-open') && !document.body.classList.contains('lib-open') && !document.querySelector('.palette:not([hidden])')?.offsetParent && !document.querySelector('.kpanel'), { timeout: 3000 })
  await page.mouse.move(640, 400)
}

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(PORT)
  const b = await H.launch()
  try {
    // 1. Perfil novo: Completo, faixa de hoje. Configurações › Geral › Interface › Simples salva e vale na hora.
    let { page, errs } = await open(b, {})
    const full = await stripItems(page)
    ok('1a perfil novo abre em Completo', await page.evaluate(() => document.body.dataset.mode === 'full'))
    ok('1b faixa do Completo como hoje (Biblioteca, busca, atalhos, Ajustes, rotação)', ['Abrir biblioteca', 'Buscar presets', 'Atalhos', 'Ajustes rápidos'].every((l) => full.includes(l)) && full.some((l) => /Rotação/.test(l)), JSON.stringify(full))
    await page.keyboard.press('Control+Comma')
    await page.waitForSelector('input[name=uiMode]', { state: 'attached', timeout: 5000 })
    const radios = await page.$$eval('input[name=uiMode]', (es) => es.map((e) => [e.nextElementSibling.textContent, e.checked, e.disabled]))
    ok('1c linha Interface: Simples · Completo · Rack, Completo marcado, Rack desabilitado (Fase 5), segmentado sem esmaecer', JSON.stringify(radios) === JSON.stringify([['Simples', false, false], ['Completo', true, false], ['Rack', false, true]]) && /Fase 5/.test(await page.evaluate(() => document.querySelector('input[name=uiMode]').closest('.row').textContent)) && (await page.evaluate(() => getComputedStyle(document.querySelector('input[name=uiMode]').closest('.ctl')).opacity)) === '1', JSON.stringify(radios))
    ok('1d a linha "Abrir em" saiu', !(await page.evaluate(() => document.body.innerText.includes('Tela mostrada quando o app inicia'))))
    await page.check('input[name=uiMode] >> nth=0')
    ok('1e settings.json grava uiMode: "simple"', await H.poll(page, () => window.__saves.at(-1)?.uiMode === 'simple', { timeout: 3000 }))
    ok('1f toast "Modo simples"', await H.poll(page, () => /Modo simples/.test(document.querySelector('.gtoast')?.textContent || ''), { timeout: 3000 }))
    ok('1g sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()

    // 2. Reabrir com o settings.json salvo: continua Simples; faixa curta, na ordem, ≤ 760 px.
    ;({ page, errs } = await open(b, { uiMode: 'simple', rotation: { enabled: true, intervalSeconds: 30 } }))
    ok('2a reaberto: continua Simples', await page.evaluate(() => document.body.dataset.mode === 'simple'))
    // O rótulo da tela cheia muda com o estado da janela ("Tela cheia" / "Sair da tela cheia").
    const simple = (await stripItems(page)).map((l) => (/tela cheia/i.test(l) ? 'Tela cheia' : l))
    ok('2b faixa: nome/autor, favoritar, anterior, aleatório, próximo, tela cheia, medidor', JSON.stringify(simple) === JSON.stringify(['nome', 'Favoritar', 'Preset anterior', 'Preset aleatório', 'Próximo preset', 'Tela cheia', 'medidor']), JSON.stringify(simple))
    const w = await page.$eval('.strip', (e) => e.getBoundingClientRect().width)
    ok('2c faixa ≤ 760 px numa janela de 1280 px', w <= 760, `${w} px`)
    ok('2d a aba da borda que abre a Biblioteca continua', (await page.$$('.edge')).length === 1)

    // 3. Todo atalho vale no Simples.
    await page.keyboard.press('Control+Shift+KeyD')
    await H.poll(page, () => /expressiveness/.test(document.getElementById('hud')?.textContent || ''), { timeout: 15000 })
    await page.keyboard.press('r')
    ok('3a R desliga a rotação', await H.poll(page, () => window.__saves.at(-1)?.rotation?.enabled === false, { timeout: 3000 }))
    const before = await page.$eval('.now-title', (e) => e.getAttribute('title'))
    await page.keyboard.press('ArrowRight')
    ok('3b → troca de preset', await H.poll(page, (b) => document.querySelector('.now-title')?.getAttribute('title') !== b, { timeout: 5000, arg: before }))
    await page.keyboard.press('l')
    ok('3c L abre a Biblioteca', await H.poll(page, () => document.body.classList.contains('lib-open'), { timeout: 3000 }))
    await closeAll(page)
    await page.keyboard.press('Slash')
    ok('3d / abre a busca', await page.waitForSelector('.palette', { state: 'visible', timeout: 3000 }).then(() => true, () => false))
    await closeAll(page)
    await page.keyboard.press('Comma')
    ok('3e , abre os Ajustes rápidos', await H.poll(page, () => document.body.classList.contains('sheet-open'), { timeout: 3000 }))
    await closeAll(page)
    await page.keyboard.press('Shift+Slash')
    ok('3f ? abre o painel de atalhos', await page.waitForSelector('.kpanel', { timeout: 3000 }).then(() => true, () => false))
    await closeAll(page)
    await page.keyboard.press('e')
    ok('3g E abre o Estúdio', await page.waitForSelector('.studio', { timeout: 15000 }).then(() => true, () => false))
    await closeAll(page)
    await page.keyboard.press('Equal')
    ok('3h + muda a Expressividade (HUD)', await H.poll(page, () => /expressiveness \+1/.test(document.getElementById('hud')?.textContent || ''), { timeout: 5000 }), (await hud(page)).split('\n').find((l) => /expressiveness/.test(l)))
    await page.keyboard.press('Digit0')
    await page.keyboard.press('Control+Shift+KeyD')

    // 4. Ajustes rápidos: três seções; "Todos os ajustes…" mostra as cinco; fechar e reabrir volta às três.
    await page.keyboard.press('Comma')
    await H.poll(page, () => document.body.classList.contains('sheet-open'), { timeout: 3000 })
    const q3 = await quickSections(page)
    ok('4a três seções: Sinal, Rotação, Texto sobre o visual', JSON.stringify(q3) === JSON.stringify(['Sinal', 'Rotação', 'Texto sobre o visual']), JSON.stringify(q3))
    ok('4b Sinal só com o Ganho (sem Normalizar)', await page.evaluate(() => !!document.getElementById('gain') && !document.getElementById('autoGain')))
    ok('4c Rotação com duas linhas (sem "Trocar no beat")', await page.evaluate(() => !!document.getElementById('rotSwitch') && !!document.getElementById('interval') && !document.getElementById('beatSwitch') && !document.getElementById('manualBeatSwitch')))
    ok('4d sem a barra de Perfil', (await page.$$('.sheet .pbar, .sheet .profile-bar')).length === 0 && !(await page.evaluate(() => /Perfil/.test(document.querySelector('.sheet').innerText))))
    await page.click('#quickMore')
    const q5 = await quickSections(page)
    ok('4e "Todos os ajustes…" mostra as cinco', JSON.stringify(q5) === JSON.stringify(['Sinal', 'Expressividade', 'Rotação', 'Transições', 'Texto sobre o visual']), JSON.stringify(q5))
    await closeAll(page)
    await page.keyboard.press('Comma')
    await H.poll(page, () => document.body.classList.contains('sheet-open'), { timeout: 3000 })
    ok('4f fechar e reabrir volta às três', JSON.stringify(await quickSections(page)) === JSON.stringify(q3))
    await closeAll(page)

    // 5. Biblioteca: Favoritos e Todos; Coleções aparece ao criar uma; sem Recentes, filtros nem "Novo preset".
    await page.keyboard.press('l')
    await H.poll(page, () => document.body.classList.contains('lib-open'), { timeout: 3000 })
    ok('5a abas Todos e Favoritos (sem Recentes nem Coleções)', JSON.stringify(await tabs(page)) === JSON.stringify(['Todos', 'Favoritos']), JSON.stringify(await tabs(page)))
    ok('5b sem filtros nem "Novo preset"', (await page.$$('.lib .chips, .lib .lib-new')).length === 0)
    await page.click('.lib .rows > li >> nth=0 >> button[aria-haspopup=menu]')
    await page.click('[role=menuitem]:has-text("Adicionar à coleção")')
    await page.click('[role=menuitem]:has-text("Nova coleção")')
    ok('5c criar uma coleção: a aba Coleções aparece', await H.poll(page, () => [...document.querySelectorAll('.lib .ltabs [role=tab]')].some((e) => /Coleções/.test(e.textContent)), { timeout: 3000 }), JSON.stringify(await tabs(page)))
    ok('5d sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()

    // 5e. Recentes guardada como aba no Completo: no Simples, a Biblioteca abre em Todos.
    ;({ page, errs } = await open(b, {}))
    await page.keyboard.press('l')
    await H.poll(page, () => document.body.classList.contains('lib-open'), { timeout: 3000 })
    await page.click('.lib .ltabs [role=tab]:has-text("Recentes")')
    await closeAll(page)
    await page.evaluate(() => document.querySelector('.palette') && null)
    await page.keyboard.press('Control+KeyK')
    await page.waitForSelector('.palette', { state: 'visible', timeout: 3000 })
    await page.keyboard.type('modo simples')
    await page.click('.palette .prow.cmd:has-text("Modo simples")')
    await H.poll(page, () => document.body.dataset.mode === 'simple', { timeout: 3000 })
    await closeAll(page)
    await page.keyboard.press('l')
    await H.poll(page, () => document.body.classList.contains('lib-open'), { timeout: 3000 })
    ok('5e Recentes guardada: no Simples abre em Todos', await page.$eval('.lib .ltabs [role=tab][aria-selected=true]', (e) => /Todos/.test(e.textContent)))
    await closeAll(page)

    // 6. Painel `?`: 10 linhas na ordem e "Ver todos"; no Completo, todos os grupos direto.
    await page.keyboard.press('Shift+Slash')
    await page.waitForSelector('.kpanel', { timeout: 3000 })
    const rows = await page.$$eval('.kpanel .k-row > span:first-child', (es) => es.map((e) => e.textContent))
    const want = ['Aleatório', 'Anterior', 'Próximo', 'Rotação', 'Segurar', 'Esconder', 'Biblioteca', 'Busca', 'Ajustes rápidos', 'Tela cheia']
    ok('6a 10 linhas na ordem da spec', rows.length === 10 && want.every((w, i) => rows[i]?.toLowerCase().includes(w.toLowerCase())), JSON.stringify(rows))
    const groupsShort = await page.$$eval('.kpanel .k-g', (es) => es.length)
    await page.click('.kpanel .k-all')
    const groupsAll = await page.$$eval('.kpanel .k-g h3', (es) => es.map((e) => e.textContent))
    ok('6b "Ver todos" mostra todos os grupos', groupsShort === 1 && groupsAll.length >= 7 && groupsAll.includes('Diagnóstico'), JSON.stringify(groupsAll))
    await closeAll(page)

    // 7. Troca sem perder estado (pela busca); o comando do modo ativo não aparece.
    await page.close()
    ;({ page, errs } = await open(b, { rotation: { enabled: true, intervalSeconds: 30, order: 'collection', collectionId: 'leves' }, expression: { level: 2, curve: 'b', adaptation: 'normal' } }, lib(COLS)))
    await page.keyboard.press('Shift+Slash')
    await page.waitForSelector('.kpanel', { timeout: 3000 })
    const fullGroups = await page.$$eval('.kpanel .k-g', (es) => es.length)
    ok('6c no Completo, todos os grupos direto (sem "Ver todos")', fullGroups >= 7 && (await page.$$('.kpanel .k-all')).length === 0, String(fullGroups))
    await closeAll(page)
    await page.keyboard.press('Control+Shift+KeyD')
    await H.poll(page, () => /expressiveness \+2/.test(document.getElementById('hud')?.textContent || ''), { timeout: 15000 })
    const snap = async () => {
      const h = await hud(page)
      return { preset: await page.$eval('.now-title', (e) => e.getAttribute('title')), rotation: /rotation ([^·]+)/.exec(h)?.[1].trim(), expr: /expressiveness ([^ ]+)/.exec(h)?.[1], col: await page.evaluate(() => window.__saves.at(-1)?.rotation?.collectionId ?? 'leves') }
    }
    await page.evaluate(() => {
      window.__swaps = 0
      new MutationObserver(() => window.__swaps++).observe(document.querySelector('.now-title'), { attributes: true, attributeFilter: ['title'] })
    })
    const s0 = await snap()
    // A rotação (15 s) pode trocar no meio: o preset só conta se nenhuma troca aconteceu (window.__swaps).
    const same = async (a, b) => {
      const swapped = await page.evaluate(() => window.__swaps > 0)
      return JSON.stringify({ ...a, preset: swapped ? '' : a.preset }) === JSON.stringify({ ...b, preset: swapped ? '' : b.preset })
    }
    const palette = async (q) => {
      await page.keyboard.press('Control+KeyK')
      await page.waitForSelector('.palette', { state: 'visible', timeout: 3000 })
      await page.keyboard.type(q)
      await page.waitForTimeout(150)
      return page.$$eval('.palette .prow.cmd .r-title', (es) => es.map((e) => e.textContent))
    }
    const c1 = await palette('modo')
    ok('7a no Completo, a busca mostra só "Modo simples"', c1.includes('Modo simples') && !c1.includes('Modo completo'), JSON.stringify(c1))
    await page.click('.palette .prow.cmd:has-text("Modo simples")')
    ok('7b troca pela busca e mostra o toast', await H.poll(page, () => document.body.dataset.mode === 'simple' && /Modo simples/.test(document.querySelector('.gtoast')?.textContent || ''), { timeout: 3000 }))
    const s1 = await snap()
    ok('7c preset, coleção, rotação (15 s) e Expressividade +2 iguais', (await same(s1, s0)) && s0.rotation === '15 s' && s0.expr === '+2', `${JSON.stringify(s0)} → ${JSON.stringify(s1)}`)
    await closeAll(page)
    const c2 = await palette('modo')
    ok('7d no Simples, a busca mostra só "Modo completo"', c2.includes('Modo completo') && !c2.includes('Modo simples'), JSON.stringify(c2))
    await page.click('.palette .prow.cmd:has-text("Modo completo")')
    ok('7e volta ao Completo com o toast', await H.poll(page, () => document.body.dataset.mode === 'full' && /Modo completo/.test(document.querySelector('.gtoast')?.textContent || ''), { timeout: 3000 }))
    ok('7f estado igual depois de voltar', await same(await snap(), s0))
    ok('7g settings.json volta a uiMode: "full"', (await lastSave(page))?.uiMode === 'full')
    ok('7h sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
