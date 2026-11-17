// Teste headless da spec 027, fatia 8 (Estúdio: Novo preset). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-novo.test.cjs`). O modelo (src/renderer/src/studio/template.ts) passa
// pelo conversor de verdade (src/main/milk.ts, transpilado aqui), como no app. Confere: "Novo preset" na
// Biblioteca e no Estúdio, o modelo compilando e indo para o motor (forma ligada, lida de volta no HUD), a
// fonte .milk editável na aba Código, o salvamento sem "baseado em" e com a fonte, e a volta ao preset de
// antes ao sair sem salvar. O círculo reagindo ao grave na tela só se vê no Windows (bloco).
const H = require('./harness.cjs')
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const R = H.createResults('027-estudio-novo'); const ok = R.ok
const ROOT = path.join(__dirname, '..', '..')

globalThis.self = globalThis // os pacotes UMD do conversor esperam `self`
function load(rel) {
  const f = path.join(ROOT, rel)
  const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const m = new Module(f)
  m.filename = f
  m.paths = Module._nodeModulePaths(path.dirname(f))
  const req = m.require.bind(m)
  m.require = (x) => (x === './hlsl-fix' ? load('src/main/hlsl-fix.ts') : req(x))
  m._compile(js, f)
  return m.exports
}
const { milkToPreset3 } = load('src/main/milk.ts')
const { TEMPLATE_MILK } = load('src/renderer/src/studio/template.ts')
const START = 'Martin - liquid arrows'

const srv = H.serve(5250)
;(async () => {
  // 0. O modelo, fora do navegador: converte, sem shaders, uma forma ligada que depende do grave
  const tpl = await milkToPreset3(TEMPLATE_MILK)
  const on = (tpl.shapes || []).filter((s) => s.baseVals?.enabled)
  ok('0a o modelo converte pelo conversor do main, sem shaders', !!tpl.baseVals && tpl.warp === '' && tpl.comp === '')
  ok('0b uma forma ligada (círculo) que reage ao grave', on.length === 1 && on[0].baseVals.sides >= 32 && /bass/.test(on[0].frame_eqs_eel), JSON.stringify(on[0]?.baseVals))
  ok('0c sem JavaScript (*_str/useJS)', !/_str"|useJS/.test(JSON.stringify(tpl)))

  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
  const errs = []
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await H.mockSo(page, { settings: { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false }, startupPreset: 'last', lastPreset: START } })
  await page.exposeFunction('__convert', async (text) => { try { return { ok: await milkToPreset3(text) } } catch (e) { return { err: e.message } } })
  await page.addInitScript(() => {
    window.__mineCalls = []
    window.__converts = 0
    let n = 0
    Object.assign(window.so.presets, {
      convertMilk: async (t) => { window.__converts++; const r = await window.__convert(t); if ('err' in r) throw new Error(r.err); return { preset: r.ok, ms: 1 } },
      listMine: async () => [],
      saveMine: async (d) => {
        window.__mineCalls.push(JSON.parse(JSON.stringify(d)))
        return { id: d.id || String(++n).padStart(24, '0'), meta: d.meta ? { ...d.meta, author: d.meta.author || 'Teste', createdAt: new Date().toISOString() } : { title: 'x', author: 'Teste', basedOn: null, createdAt: '' } }
      },
      removeMine: async () => {}
    })
  })
  await H.mockAudio(page)
  await page.goto('http://localhost:5250/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(800)
  const cur = () => page.$eval('.now-title', e => e.getAttribute('title'))
  const status = () => page.$eval('.cstat', e => e.textContent.trim())
  const compiled = () => H.poll(page, () => document.querySelector('.cstat')?.textContent.trim() === 'Compilado', { timeout: 12000 })
  const hudLine = () => page.$eval('#hud', e => e.textContent.split('\n').find(l => l.startsWith('studio: live waves')) || '')
  const toastText = () => page.$eval('.gtoast', e => e.textContent).catch(() => '')
  ok('0d preset de partida tocando', (await cur()) === START)
  await page.keyboard.press('Control+Shift+d')
  await page.mouse.move(700, 400)

  // 1. Biblioteca: botão "Novo preset" no topo, como no protótipo; a dica de "Meus" vazio fala dele
  await page.keyboard.press('l'); await page.waitForSelector('.lib', { timeout: 3000 })
  await page.waitForTimeout(300)
  ok('1a "Novo preset" no topo da Biblioteca, antes do fechar', await page.$eval('.lib-head .lib-tools', (e) => {
    const bs = [...e.querySelectorAll('button')]
    return bs.length === 2 && bs[0].classList.contains('lib-new') && bs[0].textContent.trim() === 'Novo preset' && bs[0].title === 'Novo preset no Estúdio'
  }))
  await page.click('.lib .chips button:has-text("Meus")')
  ok('1b "Meus" vazio aponta para o Novo preset', /^Use Novo preset para criar o primeiro no Estúdio/.test(await page.$eval('.lib .empty .s', e => e.textContent).catch(() => '')))
  await page.click('.lib-new')
  await page.waitForSelector('.studio', { timeout: 8000 })
  ok('1c abre o Estúdio (a Biblioteca fecha)', !(await page.evaluate(() => document.body.classList.contains('lib-open'))))
  await compiled()
  ok('1d título "Meu preset", crédito só do autor (sem "baseado em")', (await page.inputValue('#studio-name')) === 'Meu preset' && (await page.$eval('.st-credit', e => e.textContent.trim())) === 'por Teste',
    `${await page.inputValue('#studio-name')} · ${await page.$eval('.st-credit', e => e.textContent.trim())}`)
  const live = await H.poll(page, () => /studio: live waves - · shapes 1\b/.test(document.getElementById('hud').textContent), { timeout: 8000 })
  ok('1d2 a prévia diz "Seu preset" (não "Seu remix")', (await page.$eval('.st-prev .chip.tl', e => e.textContent.trim()).catch(() => '')) === 'Seu preset')
  ok('1e o modelo foi para o motor: a forma 1 ligada (HUD lê do motor)', live, await hudLine())
  ok('1f o preset de antes continua o "atual" (para a volta) e o log em inglês', (await cur()) === START && (await page.evaluate(() => window.__logs)).includes('studio: opened with a new preset (template)'))
  await page.screenshot({ path: path.join(ROOT, 'test-results', '027-estudio-novo.png') }).catch(() => {})

  // 2. Fonte .milk editável (criado do zero = tem fonte)
  await page.keyboard.press('Control+6')
  const ta = '#studio-tp-code textarea'
  await page.waitForSelector(ta, { timeout: 3000 })
  const milkText = await page.inputValue(ta)
  ok('2a aba Código: .milk editável com o círculo e o grave', !(await page.$eval(ta, e => e.readOnly)) && /^shapecode_0_enabled=1$/m.test(milkText) && /^shape_0_per_frame1=rad = 0\.1 \+ 0\.15\*bass_att;$/m.test(milkText), milkText.slice(0, 120))

  // 3. Salvar: sem basedOn, com a fonte .milk; vira o atual ao sair
  await page.keyboard.press('Control+1')
  await page.$eval('#studio-p-zoom', e => { e.value = 1.05; e.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.keyboard.press('Control+s')
  await H.poll(page, () => window.__mineCalls.length >= 1, { timeout: 8000 })
  const c1 = (await page.evaluate(() => window.__mineCalls))[0] || {}
  ok('3a salva como meu preset novo: título, sem "baseado em", com a fonte .milk', !c1.id && c1.meta?.title === 'Meu preset' && c1.meta?.basedOn === null && typeof c1.milk === 'string' && /^zoom=1\.05$/m.test(c1.milk) && /shapecode_0_enabled=1/.test(c1.milk),
    JSON.stringify(c1.meta))
  ok('3b o preset salvo é o modelo com a edição', c1.preset?.baseVals?.zoom === 1.05 && c1.preset?.shapes?.[0]?.baseVals?.enabled === 1)
  await page.keyboard.press('Escape')
  await H.poll(page, () => !document.querySelector('.studio'), { timeout: 5000 })
  ok('3c ao sair, o salvo vira o atual', (await cur()) === 'Meu preset', await cur())

  // 4. Novo preset de dentro do Estúdio: com mudanças, o primeiro clique só avisa
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 8000 })
  await compiled()
  ok('4a botão "Novo preset" no topo do Estúdio, antes de Versões', await page.$eval('.st-top-r', (r) => {
    const bs = [...r.querySelectorAll(':scope > button')].map((x) => x.className)
    return bs.indexOf('btn btn-ghost st-new') >= 0 && bs.indexOf('btn btn-ghost st-new') < bs.indexOf('btn btn-ghost st-ver')
  }) && (await page.$eval('.st-new', e => e.getAttribute('aria-label'))) === 'Novo preset')
  await page.$eval('#studio-p-zoom', e => { e.value = 1.2; e.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.waitForTimeout(200)
  await page.click('.st-new')
  await page.waitForTimeout(400)
  ok('4b com mudança não salva: avisa e não troca', /Clique de novo em Novo preset/.test(await toastText()) && (await page.inputValue('#studio-name')) === 'Meu preset' && !!(await page.$('#studio-name[readonly]')), await toastText())
  // O segundo clique precisa vir em até 3 s; o navegador do teste é lento, então os dois vão juntos (o primeiro rearma o aviso).
  await page.$eval('.st-new', (e) => { e.click(); e.click() })
  await H.poll(page, () => { const n = document.querySelector('#studio-name'); return !!n && !n.readOnly }, { timeout: 8000 })
  await compiled()
  ok('4c o segundo clique abre o modelo (título editável)', !(await page.$eval('#studio-name', e => e.readOnly)) && (await page.inputValue('#studio-name')) === 'Meu preset' && (await page.$eval('#studio-p-zoom', e => Number(e.value))) !== 1.2)
  ok('4d o anterior fechou sem salvar', (await page.evaluate(() => window.__mineCalls.length)) === 1 && (await page.evaluate(() => window.__logs)).filter(l => l === 'studio: opened with a new preset (template)').length === 2)

  // 5. Sair sem salvar volta ao preset de antes
  await page.keyboard.press('Escape')
  await H.poll(page, () => !document.querySelector('.studio'), { timeout: 5000 })
  ok('5a Esc sem mudanças sai e volta ao preset de antes', (await cur()) === 'Meu preset')

  ok('6a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
