// Spec 030 (idiomas), base + faixa, toasts, estados, Ajustes rápidos, Biblioteca e busca, Configurações, painel `?`: Windows em inglês abre em English, a troca em
// Configurações › Geral vale na hora e fica salva, números pelo idioma, nada cortado nos dois idiomas,
// e nenhuma chave do catálogo sem uso. A chave faltando no pt-BR é pega pelo typecheck, não aqui.
const H = require('./harness.cjs')
const fs = require('fs'), path = require('path')
const R = H.createResults('030-idiomas'); const ok = R.ok

// ── Catálogos: chaves sem uso ─────────────────────────────
const src = path.join(__dirname, '..', '..', 'src', 'renderer', 'src')
const cat = (f) => Object.fromEntries([...fs.readFileSync(path.join(src, 'i18n', f), 'utf8').matchAll(/^\s*'([\w.]+)':\s*(['"“])(.*)\2,?$/gm)].map(m => [m[1], m[3]]))
const en = cat('en.ts'), pt = cat('pt-BR.ts')
const code = []
;(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'i18n') walk(p) } else if (/\.tsx?$/.test(f)) code.push(fs.readFileSync(p, 'utf8')) } })(src)
const all = code.join('\n')
// Chaves montadas no código (`blend.type.${type}`) e plurais (`tn('base', n)`).
const dynamic = ['blend.type.', 'expression.curve.', 'expression.memory.']
const unused = Object.keys(en).filter(k => {
  if (dynamic.some(p => k.startsWith(p))) return false
  const base = k.replace(/\.(one|other)$/, '')
  return !all.includes(`'${k}'`) && !all.includes(`'${base}'`)
})
ok('0a catálogos lidos (en e pt-BR com as mesmas chaves)', Object.keys(en).length > 50 && Object.keys(en).join() === Object.keys(pt).join(), `${Object.keys(en).length} chaves`)
ok('0b nenhuma chave sem uso', unused.length === 0, unused.join(', '))

// Textos da faixa (rótulos, dicas e texto visível), sem o nome do preset (créditos não se traduzem).
const stripTexts = () => {
  const out = []
  for (const el of document.querySelectorAll('.strip-wrap *, .winctl *, .edge')) {
    if (el.closest('.now-title, .now-author')) continue
    for (const a of ['aria-label', 'title']) if (el.getAttribute(a)) out.push(el.getAttribute(a))
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) out.push(n.textContent.trim())
  }
  return out
}
// Botões e rótulos cortados (critério 6): scrollWidth > clientWidth.
const clipped = () => {
  const sel = '.strip button, .strip .rot span, .breath-tag, .chip, .gtoast span, .settings .lbl, .settings .help, .settings button, .sheet h2, .sheet h3, .sheet label, .sheet .line > span, .sheet button, .sheet .val, .sheet select'
  return [...document.querySelectorAll(sel)]
    .filter(e => e.offsetParent && !e.closest('.now-title, .now-author') && e.scrollWidth > e.clientWidth + 1)
    .map(e => `${e.className || e.tagName}: ${e.textContent.trim().slice(0, 40)}`)
}
// Textos dos Ajustes rápidos (rótulos, dicas, opções e texto visível).
const sheetTexts = () => {
  const out = []
  for (const el of document.querySelectorAll('.sheet, .sheet *')) {
    for (const a of ['aria-label', 'title']) if (el.getAttribute(a)) out.push(el.getAttribute(a))
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) out.push(n.textContent.trim())
  }
  return out
}
const quickOnly = (from, to) => Object.entries(from).filter(([k, v]) => /^quick\./.test(k) && v !== to[k]).map(([, v]) => v.replace(/\{\w+\}/g, '').trim()).filter(v => v.length > 3)
// Palavra inteira ("Neutra" não conta dentro de "Neutral").
const hasWord = (s, p) => new RegExp(`(^|[^\\p{L}])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u').test(s)
// Abre os Ajustes, liga o "Trocar no beat" e o Normalizar (mostram as dicas), devolve os textos e os cortados.
async function checkSheet(page) {
  await page.keyboard.press('Comma'); await page.waitForTimeout(400)
  if (!(await page.isChecked('#beatSwitch'))) await page.click('#beatSwitch + .track')
  if (!(await page.isChecked('#autoGain'))) await page.click('#autoGain + .track')
  await page.waitForTimeout(250)
  const texts = await page.evaluate(sheetTexts)
  const cut = await page.evaluate(clipped)
  const title = await page.textContent('.sheet h2')
  const bars = await page.$$eval('#interval option', (o) => o.map((e) => e.textContent))
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  return { texts, cut, title, bars }
}
const toastText = (page) => page.$eval('.gtoast span', e => e.textContent)

// Biblioteca e busca: textos da interface, sem nomes/autores de preset (créditos) nem nomes de coleção.
const libTexts = () => {
  const out = []
  for (const el of document.querySelectorAll('.lib, .lib *, .palette, .palette *')) {
    if (el.closest('.tt, .r-title, .au, .r-author, .p-coll > span:first-child')) continue
    for (const a of ['aria-label', 'title', 'placeholder']) {
      const v = el.getAttribute(a)
      if (v && !el.matches('.row-main, .r-btn, .crow, .lib .row .ibtn')) out.push(v)
    }
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) out.push(n.textContent.trim())
  }
  return out
}
const clippedLib = () => [...document.querySelectorAll('.lib .brand, .lib .ltabs button, .lib .chips button, .lib .hiddenbar span, .lib .hiddenbar button, .lib .empty .h, .lib .newcoll, .palette .p-tabs button, .palette .p-foot span, .palette .r-hint')]
  .filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => `${e.className || e.tagName}: ${e.textContent.trim().slice(0, 40)}`)
const libOnly = (from, to) => Object.entries(from).filter(([k, v]) => /^(library|palette)\./.test(k) && v !== to[k]).map(([, v]) => v.replace(/\{\w+\}/g, '').replace(/[“”]/g, '').trim()).filter(v => v.length > 3)
// Abre a Biblioteca (Todos e Coleções) e a busca rápida com "flêxi" (sem acento no nome: a busca ignora acentos).
async function checkLib(page) {
  await page.mouse.click(640, 200); await page.keyboard.press('KeyL'); await page.waitForTimeout(500)
  const tabs = await page.$$eval('.lib [role=tab]', (b) => b.map((e) => e.childNodes[0].textContent.trim()))
  const chips = await page.$$eval('.lib .chips button', (b) => b.map((e) => e.textContent.trim()))
  let texts = await page.evaluate(libTexts)
  let cut = await page.evaluate(clippedLib)
  await page.click('.lib [role=tab]:nth-of-type(4)'); await page.waitForTimeout(300)
  texts = texts.concat(await page.evaluate(libTexts))
  cut = cut.concat(await page.evaluate(clippedLib))
  await page.click('.lib [role=tab]:nth-of-type(1)'); await page.waitForTimeout(200)
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  await page.keyboard.press('Control+KeyK'); await page.waitForTimeout(500)
  await page.keyboard.type('flêxi'); await page.waitForTimeout(300)
  const hits = await page.$$eval('.palette .prow:not(.cmd)', (r) => r.length)
  const marked = await page.$$eval('.palette .prow mark', (m) => m.map((e) => e.textContent))
  texts = texts.concat(await page.evaluate(libTexts))
  cut = cut.concat(await page.evaluate(clippedLib))
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  return { tabs, chips, texts, cut, hits, marked }
}

// Configurações: textos de todas as seções (rótulos, ajudas, opções, aria), sem nomes de preset/autor/coleção.
// A tabela de atalhos entra (rótulos de shortcuts.ts); as teclas (`kbd`) não.
const settingsTexts = () => {
  const out = []
  for (const el of document.querySelectorAll('.settings, .settings *')) {
    if (el.closest('.hrow .nm, .hrow .by, #st-col, #st-fav, .cap-top span span, .par, kbd')) continue
    for (const a of ['aria-label', 'title', 'placeholder']) if (el.getAttribute(a) && !el.closest('.hrow')) out.push(el.getAttribute(a))
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) out.push(n.textContent.trim())
  }
  return out
}
const clippedSettings = () => [...document.querySelectorAll('.settings .lbl, .settings .help, .settings button, .settings h2, .settings h3, .settings .seg span, .settings .phase, .settings .count, .settings .testres')]
  .filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => `${e.className || e.tagName}: ${e.textContent.trim().slice(0, 40)}`)
const settingsOnly = (from, to) => Object.entries(from).filter(([k, v]) => /^(settings|quick|credit|shortcuts)\./.test(k) && !/^shortcuts\.(group|cmd|key|or$|title$|filter$|close|empty$|customize$|lib)/.test(k) && v !== to[k]).map(([, v]) => v.replace(/\{\w+\}/g, '').replace(/[“”]/g, '').trim()).filter(v => v.length > 3)
// Percorre as seções pelo menu (com a lista de ocultos aberta e o teste de captura rodado) e devolve textos, cortados e nomes do menu.
async function checkSettings(page) {
  const nav = await page.$$eval('.settings nav button', (b) => b.map((e) => e.textContent.trim()))
  let texts = [], cut = []
  for (let i = 0; i < nav.length; i++) {
    await page.click(`.settings nav li:nth-child(${i + 1}) button`); await page.waitForTimeout(120)
    if (await page.isVisible('[data-panel="biblioteca"]')) {
      const btn = page.locator('[data-panel="biblioteca"] button[aria-expanded]')
      if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click()
      await page.waitForTimeout(100)
    }
    texts = texts.concat(await page.evaluate(settingsTexts))
    cut = cut.concat(await page.evaluate(clippedSettings))
  }
  await page.click('.settings nav li:nth-child(1) button'); await page.waitForTimeout(100)
  return { nav, texts, cut }
}
// Busca das Configurações: devolve as seções que sobram no menu.
async function settingsSearch(page, q) {
  await page.fill('#st-search', q); await page.waitForTimeout(200)
  const vis = await page.$$eval('.settings nav li:not([hidden]) button', (b) => b.map((e) => e.textContent.trim()))
  const hits = await page.$$eval('.settings .hit', (e) => e.length)
  await page.fill('#st-search', ''); await page.waitForTimeout(100)
  await page.click('.settings nav li:nth-child(1) button'); await page.waitForTimeout(100)
  return { vis, hits }
}

// Painel `?`: textos (títulos, rótulos, aria, placeholder, teclas), cortados, o filtro e o estado vazio.
const panelTexts = () => {
  const out = []
  for (const el of document.querySelectorAll('.kpanel, .kpanel *')) {
    for (const a of ['aria-label', 'title', 'placeholder']) if (el.getAttribute(a)) out.push(el.getAttribute(a))
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) out.push(n.textContent.trim())
  }
  return out
}
const clippedPanel = () => [...document.querySelectorAll('.kpanel h2, .kpanel h3, .kpanel .k-row > span:first-child, .kpanel kbd, .kpanel .k-foot a, .kpanel input')]
  .filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => `${e.className || e.tagName}: ${e.textContent.trim().slice(0, 40)}`)
const panelOnly = (from, to) => Object.entries(from).filter(([k, v]) => /^shortcuts\./.test(k) && !/^shortcuts\.cmd\./.test(k) && v !== to[k]).map(([, v]) => v.replace(/\{\w+\}/g, '').replace(/[“”]/g, '').trim()).filter(v => v.length > 3)
async function checkPanel(page, filter) {
  await page.mouse.click(640, 200); await page.keyboard.press('Shift+Slash'); await page.waitForTimeout(400)
  const title = await page.textContent('.kpanel h2')
  const groups = await page.$$eval('.kpanel h3', (h) => h.map((e) => e.textContent))
  const texts = await page.evaluate(panelTexts)
  const cut = await page.evaluate(clippedPanel)
  await page.fill('.kpanel input', filter); await page.waitForTimeout(200)
  const rows = await page.$$eval('.kpanel .k-row', (r) => r.map((e) => e.innerText.replace(/\s+/g, ' ')))
  await page.fill('.kpanel input', 'zzzz'); await page.waitForTimeout(150)
  const empty = await page.textContent('.kpanel .k-empty')
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  // Comandos da busca rápida.
  await page.keyboard.press('Control+KeyK'); await page.waitForTimeout(400)
  await page.keyboard.type(filter); await page.waitForTimeout(250)
  const cmds = await page.$$eval('.palette .prow.cmd', (r) => r.map((e) => e.innerText.replace(/\s+/g, ' ')))
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  return { title, groups, texts, cut, rows, empty, cmds }
}

const srv = H.serve(5230)
;(async () => {
  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e)))
  // Windows em inglês, idioma em Automático (o padrão).
  await H.mockSo(page, { systemLanguage: 'en', saveSettings: true, settings: { welcomeSeen: true, blend: { manual: { type: 'random', seconds: 0.5 } } } })
  await H.mockAudio(page)
  await page.goto('http://localhost:5230/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(800)
  await page.mouse.move(640, 400)

  // 1. Windows em inglês → English.
  ok('1a Windows em inglês abre em English (faixa)', (await page.getAttribute('.strip', 'aria-label')) === 'Visual controls' && (await page.textContent('.rot span')) === 'Rotation')
  ok('1b <html lang="en">', (await page.getAttribute('html', 'lang')) === 'en')
  const ptOnly = Object.entries(pt).filter(([k, v]) => /^(strip|window|credit|collection)\./.test(k) && v !== en[k]).map(([, v]) => v.replace(/\{\w+\}/g, '').trim()).filter(v => v.length > 3)
  const stripEn = await page.evaluate(stripTexts)
  ok('3a faixa em English sem texto em português', stripEn.every(s => !ptOnly.some(p => p && s.includes(p))), stripEn.filter(s => ptOnly.some(p => p && s.includes(p))).join(' | '))

  // 4. Toasts e números no idioma do app.
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150)
  const tEn = await toastText(page)
  ok('4a toast em English com ponto decimal', /^Transition: .+, 0\.25 s/.test(tEn), tEn)
  await page.keyboard.press('KeyR'); await page.waitForTimeout(150)
  ok('4b toast da rotação em English', (await toastText(page)) === 'Rotation off.', await toastText(page))
  await page.keyboard.press('KeyR'); await page.waitForTimeout(150)
  ok('4c "Rotation every 30 s."', (await toastText(page)) === 'Rotation every 30 s.', await toastText(page))
  const clipEnStrip = await page.evaluate(clipped)
  ok('6a nada cortado na faixa e no toast (en)', clipEnStrip.length === 0, clipEnStrip.join(' | '))

  // Ajustes rápidos em English.
  const qEn = await checkSheet(page)
  const ptQuick = quickOnly(pt, en)
  ok('3c Ajustes rápidos em English ("Quick settings", "4 bars")', qEn.title === 'Quick settings' && qEn.bars.includes('4 bars') && qEn.bars.includes('1 bar'), `${qEn.title} · ${qEn.bars.join(', ')}`)
  ok('3d Ajustes rápidos sem texto em português', qEn.texts.every(s => !ptQuick.some(p => hasWord(s, p))), qEn.texts.filter(s => ptQuick.some(p => hasWord(s, p))).join(' | '))
  ok('6e nada cortado nos Ajustes rápidos (en)', qEn.cut.length === 0, qEn.cut.join(' | '))
  await page.mouse.move(600, 380); await page.mouse.move(640, 400)

  // Biblioteca e busca em English.
  const lEn = await checkLib(page)
  const ptLib = libOnly(pt, en)
  ok('3g Biblioteca em English (abas e filtros)', lEn.tabs.join() === 'All,Favorites,Recent,Collections' && lEn.chips.join() === 'Imported,Mine', `${lEn.tabs} · ${lEn.chips}`)
  ok('3h Biblioteca e busca sem texto em português', lEn.texts.every(s => !ptLib.some(p => hasWord(s, p))), lEn.texts.filter(s => ptLib.some(p => hasWord(s, p))).join(' | '))
  ok('3i busca ignora acentos ("flêxi" acha Flexi, com destaque)', lEn.hits > 0 && lEn.marked.length > 0 && lEn.marked.every(m => m.toLowerCase() === 'flexi'), `${lEn.hits} · ${lEn.marked.slice(0, 3)}`)
  ok('6g nada cortado na Biblioteca e na busca (en)', lEn.cut.length === 0, lEn.cut.join(' | '))
  await page.mouse.move(600, 380); await page.mouse.move(640, 400)

  // Painel `?` e comandos da busca em English ("space" acha o aleatório pela tecla traduzida).
  const kEn = await checkPanel(page, 'space')
  const ptPanel = panelOnly(pt, en)
  ok('3q painel ? em English (título e grupos)', kEn.title === 'Shortcuts' && kEn.groups.join() === 'Now · Stage,Playback,Expressiveness,Navigation,Text and controls,Window,Diagnostics', `${kEn.title} · ${kEn.groups}`)
  ok('3r painel ? sem texto em português', kEn.texts.every(s => !ptPanel.some(p => hasWord(s, p))), kEn.texts.filter(s => ptPanel.some(p => hasWord(s, p))).join(' | '))
  ok('3s filtro "space" acha "Random preset" com a tecla Space', kEn.rows.some(r => r.startsWith('Random preset') && r.includes('Space')), kEn.rows.join(' | '))
  ok('3t estado vazio do painel em English', kEn.empty === 'No shortcuts for “zzzz”.', kEn.empty)
  ok('3u comandos da busca em English', kEn.cmds.some(c => c.includes('Random preset') && c.includes('Space')), kEn.cmds.join(' | '))
  ok('6k nada cortado no painel ? (en)', kEn.cut.length === 0, kEn.cut.join(' | '))
  await page.mouse.move(600, 380); await page.mouse.move(640, 400)

  // 2. Configurações › Geral › Idioma: no topo, ajuda do Automático, troca na hora.
  await page.keyboard.press('Control+Comma'); await page.waitForTimeout(500)
  const first = await page.$eval('.settings [data-panel="geral"] .row .lbl', e => e.textContent)
  ok('2a Idioma é a primeira linha de Geral', first === 'Language', first)
  const helpAuto = await page.$eval('.settings [data-panel="geral"] .row .help', e => e.textContent)
  ok('2b ajuda do Automático cita o idioma do Windows', helpAuto === 'Now: English, the Windows language.', helpAuto)
  const clipEnSet = await page.evaluate(clipped)
  ok('6b nada cortado em Configurações › Geral (en)', clipEnSet.length === 0, clipEnSet.join(' | '))
  // Configurações inteiras em English (passo 4 da migração).
  const sEn = await checkSettings(page)
  const ptSet = settingsOnly(pt, en)
  ok('3m Configurações em English (menu)', sEn.nav.join() === 'General,Capture,Visual,Rendering,Performance,Library,Shortcuts,About', sEn.nav.join())
  ok('3n Configurações sem texto em português', sEn.texts.every(s => !ptSet.some(p => hasWord(s, p))), sEn.texts.filter(s => ptSet.some(p => hasWord(s, p))).join(' | '))
  ok('6i nada cortado nas Configurações (en)', sEn.cut.length === 0, sEn.cut.join(' | '))
  const qGain = await settingsSearch(page, 'gain'), qGanho = await settingsSearch(page, 'ganho'), qNone = await settingsSearch(page, 'zzzz')
  ok('2f busca das Configurações em English ("gain" acha Capture; "ganho" também)', qGain.vis.includes('Capture') && qGain.hits > 0 && qGanho.vis.includes('Capture'), `${qGain.vis} · ${qGanho.vis}`)
  ok('2g busca sem resultado mostra "Nothing found"', qNone.vis.length === 0, qNone.vis.join())
  await page.fill('#st-search', 'zzzz'); await page.waitForTimeout(150)
  ok('2h estado vazio em English', (await page.textContent('.settings .wrap .panel:not([hidden]) h2')) === 'Nothing found')
  await page.fill('#st-search', ''); await page.waitForTimeout(150)
  await page.click('.settings nav li:nth-child(1) button'); await page.waitForTimeout(100)
  await page.selectOption('#st-lang', 'pt-BR'); await page.waitForTimeout(300)
  ok('2c a troca vale na hora (faixa em português)', (await page.getAttribute('.strip', 'aria-label')) === 'Controles do visual' && (await page.textContent('.rot span')) === 'Rotação')
  const lbl = await page.$eval('.settings [data-panel="geral"] .row .lbl', e => e.textContent)
  const help = await page.$eval('.settings [data-panel="geral"] .row .help', e => e.textContent)
  ok('2d as Configurações redesenham (Idioma · "Muda na hora, sem reiniciar.")', lbl === 'Idioma' && help === 'Muda na hora, sem reiniciar.', `${lbl} · ${help}`)
  const saved = await page.evaluate(() => window.__saves.at(-1)?.language)
  ok('2e a escolha fica salva (settings.language = pt-BR)', saved === 'pt-BR', String(saved))
  ok('1c <html lang="pt-BR">', (await page.getAttribute('html', 'lang')) === 'pt-BR')
  const clipPtSet = await page.evaluate(clipped)
  ok('6c nada cortado em Configurações › Geral (pt-BR)', clipPtSet.length === 0, clipPtSet.join(' | '))
  const sPt = await checkSettings(page)
  const enSet = settingsOnly(en, pt)
  ok('3o Configurações em português (menu)', sPt.nav.join() === 'Geral,Captura,Visual,Renderização,Desempenho,Biblioteca,Atalhos,Sobre', sPt.nav.join())
  ok('3p Configurações sem texto em inglês', sPt.texts.every(s => !enSet.some(p => hasWord(s, p))), sPt.texts.filter(s => enSet.some(p => hasWord(s, p))).join(' | '))
  ok('6j nada cortado nas Configurações (pt-BR)', sPt.cut.length === 0, sPt.cut.join(' | '))
  const qGanhoPt = await settingsSearch(page, 'ganho padrao')
  ok('2i busca em pt-BR ignora acento ("ganho padrao" acha Captura)', qGanhoPt.vis.join() === 'Captura' && qGanhoPt.hits > 0, qGanhoPt.vis.join())
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  await page.mouse.move(600, 380); await page.mouse.move(640, 400)

  // 3 e 4 em pt-BR.
  const enOnly = Object.entries(en).filter(([k, v]) => /^(strip|window|credit|collection)\./.test(k) && v !== pt[k]).map(([, v]) => v.replace(/\{\w+\}/g, '').trim()).filter(v => v.length > 3)
  const stripPt = await page.evaluate(stripTexts)
  ok('3b faixa em português sem texto em inglês', stripPt.every(s => !enOnly.some(p => p && s.includes(p))), stripPt.filter(s => enOnly.some(p => p && s.includes(p))).join(' | '))
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150)
  const tPt = await toastText(page)
  ok('4d toast em português com vírgula decimal', /^Transição: .+, 0,5 s/.test(tPt), tPt)
  await page.keyboard.press('KeyR'); await page.waitForTimeout(150)
  ok('4e toast da rotação em português', (await toastText(page)) === 'Rotação desligada.', await toastText(page))
  const clipPtStrip = await page.evaluate(clipped)
  ok('6d nada cortado na faixa e no toast (pt-BR)', clipPtStrip.length === 0, clipPtStrip.join(' | '))

  // Ajustes rápidos em pt-BR (a troca vale também para eles).
  const qPt = await checkSheet(page)
  const enQuick = quickOnly(en, pt)
  ok('3e Ajustes rápidos em português ("Ajustes rápidos", "4 compassos")', qPt.title === 'Ajustes rápidos' && qPt.bars.includes('4 compassos') && qPt.bars.includes('1 compasso'), `${qPt.title} · ${qPt.bars.join(', ')}`)
  ok('3f Ajustes rápidos sem texto em inglês', qPt.texts.every(s => !enQuick.some(p => hasWord(s, p))), qPt.texts.filter(s => enQuick.some(p => hasWord(s, p))).join(' | '))
  ok('6f nada cortado nos Ajustes rápidos (pt-BR)', qPt.cut.length === 0, qPt.cut.join(' | '))

  // Biblioteca e busca em pt-BR.
  await page.mouse.move(600, 380); await page.mouse.move(640, 400)
  const lPt = await checkLib(page)
  const enLib = libOnly(en, pt)
  ok('3j Biblioteca em português (abas e filtros)', lPt.tabs.join() === 'Todos,Favoritos,Recentes,Coleções' && lPt.chips.join() === 'Importados,Meus', `${lPt.tabs} · ${lPt.chips}`)
  ok('3k Biblioteca e busca sem texto em inglês', lPt.texts.every(s => !enLib.some(p => hasWord(s, p))), lPt.texts.filter(s => enLib.some(p => hasWord(s, p))).join(' | '))
  ok('3l busca ignora acentos em pt-BR também', lPt.hits === lEn.hits && lPt.marked.length > 0, `${lPt.hits}`)
  ok('6h nada cortado na Biblioteca e na busca (pt-BR)', lPt.cut.length === 0, lPt.cut.join(' | '))

  // Painel `?` e comandos em pt-BR ("espaco" sem acento acha o aleatório).
  await page.mouse.move(600, 380); await page.mouse.move(640, 400)
  const kPt = await checkPanel(page, 'espaco')
  const enPanel = panelOnly(en, pt)
  ok('3v painel ? em português (título e grupos)', kPt.title === 'Atalhos' && kPt.groups.join() === 'Agora · Palco,Reprodução,Expressividade,Navegação,Texto e controles,Janela,Diagnóstico', `${kPt.title} · ${kPt.groups}`)
  ok('3w painel ? sem texto em inglês', kPt.texts.every(s => !enPanel.some(p => hasWord(s, p))), kPt.texts.filter(s => enPanel.some(p => hasWord(s, p))).join(' | '))
  ok('3x filtro "espaco" acha "Preset aleatório" com a tecla Espaço', kPt.rows.some(r => r.startsWith('Preset aleatório') && r.includes('Espaço')), kPt.rows.join(' | '))
  ok('3y estado vazio do painel em português', kPt.empty === 'Nenhum atalho para “zzzz”.', kPt.empty)
  ok('3z comandos da busca em português', kPt.cmds.some(c => c.includes('Preset aleatório') && c.includes('Espaço')), kPt.cmds.join(' | '))
  ok('6l nada cortado no painel ? (pt-BR)', kPt.cut.length === 0, kPt.cut.join(' | '))
  ok('sem erros na página', errs.length === 0, JSON.stringify(errs.slice(0, 5)))

  // 1. Windows em português (outra página) → pt-BR; idioma salvo em English vence o Windows.
  await page.close()
  const p2 = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await H.mockSo(p2, { systemLanguage: 'pt-BR', settings: { welcomeSeen: true, language: 'en' } }); await H.mockAudio(p2)
  await p2.goto('http://localhost:5230/')
  await p2.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  ok('1d idioma salvo (English) vence o do Windows', (await p2.getAttribute('.strip', 'aria-label')) === 'Visual controls')
  await p2.close()
  const p3 = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await H.mockSo(p3, { systemLanguage: 'pt-BR' }); await H.mockAudio(p3)
  await p3.goto('http://localhost:5230/')
  await p3.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  ok('1e Windows em português abre em pt-BR', (await p3.getAttribute('.strip', 'aria-label')) === 'Controles do visual')

  const code = await R.finish()
  await b.close(); srv.close(); process.exit(code)
})().catch(e => { R.dump(); console.error(e); process.exit(1) })
