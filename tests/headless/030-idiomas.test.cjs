// Spec 030 (idiomas), base + faixa, toasts e estados: Windows em inglês abre em English, a troca em
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
  const sel = '.strip button, .strip .rot span, .breath-tag, .chip, .gtoast span, .settings .lbl, .settings .help, .settings button'
  return [...document.querySelectorAll(sel)]
    .filter(e => e.offsetParent && !e.closest('.now-title, .now-author') && e.scrollWidth > e.clientWidth + 1)
    .map(e => `${e.className || e.tagName}: ${e.textContent.trim().slice(0, 40)}`)
}
const toastText = (page) => page.$eval('.gtoast span', e => e.textContent)

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

  // 2. Configurações › Geral › Idioma: no topo, ajuda do Automático, troca na hora.
  await page.keyboard.press('Control+Comma'); await page.waitForTimeout(500)
  const first = await page.$eval('.settings [data-panel="geral"] .row .lbl', e => e.textContent)
  ok('2a Idioma é a primeira linha de Geral', first === 'Language', first)
  const helpAuto = await page.$eval('.settings [data-panel="geral"] .row .help', e => e.textContent)
  ok('2b ajuda do Automático cita o idioma do Windows', helpAuto === 'Now: English, the Windows language.', helpAuto)
  const clipEnSet = await page.evaluate(clipped)
  ok('6b nada cortado em Configurações › Geral (en)', clipEnSet.length === 0, clipEnSet.join(' | '))
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
