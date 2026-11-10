// Teste headless da spec 026 (Estúdio de presets, P0). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/026-estudio.test.cjs`). Simula window.so (com os "meus presets" em memória)
// e o getDisplayMedia (bumbo a 124 BPM). Vale para estados e interface; fps, GPU e áudio real só no Windows.
// A sanitização do main (critério 8) é testada aqui mesmo, transpilando src/main/mine.ts.
const H = require('./harness.cjs')
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const srv = H.serve(5226)
const R = H.createResults('026-estudio'); const ok = R.ok

// ── Critério 8: a barreira do main (sem Electron) ─────────────
function loadMine() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'main', 'mine.ts'), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = new Module('mine.js')
  const load = Module._load
  Module._load = (req, ...rest) => (req === 'electron' ? { app: { getPath: () => '/nao-usar' } } : req === './log' ? { log: () => {} } : load(req, ...rest))
  try { m._compile(js, 'mine.js') } finally { Module._load = load }
  return m.exports
}
function mainChecks() {
  const { sanitizePreset } = loadMine()
  const good = { version: 2, baseVals: { zoom: 1 }, shapes: [{ baseVals: { enabled: 0 }, init_eqs_eel: '', frame_eqs_eel: '' }], waves: [], init_eqs_eel: '', frame_eqs_eel: 'zoom = 1;', pixel_eqs_eel: '', warp: 'x', comp: 'y' }
  const throws = (p) => { try { sanitizePreset(p); return false } catch { return true } }
  ok('8a preset só com EEL passa pela barreira do main', !throws(good))
  ok('8b *_str no topo é recusado', throws({ ...good, frame_eqs_str: 'a.zoom = 2' }))
  ok('8c useJS é recusado', throws({ ...good, useJS: true }))
  ok('8d *_str numa forma é recusado', throws({ ...good, shapes: [{ ...good.shapes[0], frame_eqs_str: 'x' }] }))
  ok('8e campo desconhecido é recusado', throws({ ...good, evil: 'x' }))
  ok('8f maior que 256 KB é recusado', throws({ ...good, comp: 'x'.repeat(260 * 1024) }))
}

;(async () => {
  mainChecks()
  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('dialog', d => d.accept())
  await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: true, intervalSeconds: 5 } } })
  // Meus presets em memória (o main real grava em userData/presets/mine/<id>/).
  await page.addInitScript(() => {
    window.__mine = []; window.__mineCalls = []
    let n = 0
    Object.assign(window.so.presets, {
      listMine: async () => [],
      saveMine: async (d) => {
        window.__mineCalls.push(JSON.parse(JSON.stringify(d)))
        if (JSON.stringify(d.preset).includes('_str"')) throw new Error("Error invoking remote method 'presets:saveMine': Error: preset com JavaScript (*_str/useJS) recusado")
        if (d.id) { const e = window.__mine.find(x => x.id === d.id); e.preset = d.preset; return { id: e.id, meta: e.meta } }
        const id = String(++n).padStart(24, '0'); const meta = { ...d.meta, createdAt: new Date().toISOString() }
        window.__mine.push({ id, meta, preset: d.preset }); return { id, meta }
      },
      removeMine: async (id) => { window.__mine = window.__mine.filter(x => x.id !== id); window.__mineCalls.push({ removed: id }) }
    })
  })
  await H.mockAudio(page)
  await page.goto('http://localhost:5226/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1200)
  const cur = () => page.$eval('.now-title', e => e.getAttribute('title'))
  const text = () => page.evaluate(() => document.body.innerText)
  const status = () => page.$eval('.cstat', e => e.textContent.trim())
  const ta = (i) => `.studio .ed-ta >> nth=${i}`
  const waitStatus = async (re, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { if (re.test(await status())) return true; await page.waitForTimeout(50) } return false }

  // 1. E abre com o preset atual
  const c0 = await cur()
  await page.mouse.move(700, 400)
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 5000 })
  ok('1a E abre o Estúdio', await page.isVisible('.studio'))
  const title0 = await page.inputValue('#studio-name')
  ok('1b título começa como "Remix de …"', title0.startsWith('Remix de '), title0)
  ok('1c três blocos com a legenda do protótipo', (await page.$$('.studio .ed-ta')).length === 3 && (await text()).includes('Executa uma vez ao carregar o preset') && (await text()).includes('Executa em cada ponto da malha'))
  ok('1d nota de variáveis', (await text()).includes('bass mid treb bass_att mid_att treb_att time frame fps'))
  ok('1e status termina em "Compilado"', await waitStatus(/^Compilado$/), await status())
  ok('1f controles do Palco escondidos', !(await page.isVisible('.strip-wrap')))
  await page.waitForTimeout(800)
  const v = await page.$$eval('.mrow .vv', es => es.map(e => e.textContent))
  ok('1g medidores bass/mid/treb com valor', v.length === 3 && v.some(x => x !== '0.00'), JSON.stringify(v))
  ok('1h crédito "baseado em" no topo', /baseado em/.test(await page.$eval('.st-credit', e => e.textContent)), await page.$eval('.st-credit', e => e.textContent))
  await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', '026-estudio-aberto.png') }).catch(() => {})

  // 2. editar per_frame compila e carrega
  await page.fill(ta(1), 'zoom = 1.01 + 0.12*bass_att;')
  ok('2a status "Compilando…" ao digitar', /Compilando/.test(await status()))
  ok('2b termina em "Compilado" em até ~1 s depois da pausa', await waitStatus(/^Compilado$/, 2500), await status())
  ok('2c rodapé "Compilado às hh:mm:ss"', /Compilado às \d\d:\d\d:\d\d/.test(await text()))

  // 3. erro de sintaxe: problema legível e a última versão válida continua
  await page.fill(ta(1), 'zoom = 1.01 + 0.12*bass_att;\nrot = sin(time;')
  ok('3a "1 erro"', await waitStatus(/^1 erro$/, 2500), await status())
  const perr = await page.$eval('.perr p', e => e.textContent).catch(() => '')
  ok('3b painel Problemas diz bloco e linha', /per_frame, linha 2/.test(perr), perr)
  ok('3c selo "Mostrando a última versão válida"', await page.isVisible('.chip.warn:has-text("Mostrando a última versão válida")'))
  ok('3d linha marcada no editor', (await page.$$eval('.ed-block >> nth=1 >> .ed-gut div.err', es => es.map(e => e.textContent))).join() === '2')
  await page.click('.perr .btn')
  ok('3e "Ir para a linha" foca o bloco', await page.evaluate(() => document.activeElement === document.querySelectorAll('.studio .ed-ta')[1]))
  await page.fill(ta(1), 'zoom = 1.01 + 0.12*bass_att;\nrot = sin(time);')
  ok('3f corrigir tira o selo', (await waitStatus(/^Compilado$/, 2500)) && !(await page.isVisible('.chip.warn')))

  // 4. laço sem fim não congela: recusado com mensagem
  await page.fill(ta(2), 'while(1);')
  await page.waitForTimeout(450)
  const t4 = Date.now(); await page.evaluate(() => 1); const rt = Date.now() - t4
  ok('4a interface responde durante o teste do laço', rt < 300, `${rt} ms`)
  ok('4b laço recusado com mensagem', await waitStatus(/^1 erro$/, 3000), await status())
  ok('4c mensagem fala do laço', /Laço sem fim|Lento demais/.test(await page.$eval('.perr p', e => e.textContent).catch(() => '')), await page.$eval('.perr p', e => e.textContent).catch(() => ''))
  // 4e. valor inválido (NaN/infinito) é recusado antes de chegar à imagem
  await page.fill(ta(2), 'zoom = log(0);')
  ok('4e per_pixel com log(0) (infinito) é recusado', await waitStatus(/^1 erro$/, 3000), await status())
  ok('4f mensagem fala do valor inválido', /zoom inválido/.test(await page.$eval('.perr p', e => e.textContent).catch(() => '')), await page.$eval('.perr p', e => e.textContent).catch(() => ''))
  // seleção de texto só no que vale copiar
  const sel = await page.evaluate(() => ['.st-credit', '.ed-label h3', '.studio .ed-ta', '.perr p'].map(s => getComputedStyle(document.querySelector(s)).userSelect))
  ok('4g texto da interface não seleciona; campo e erro sim', sel[0] === 'none' && sel[1] === 'none' && sel[2] === 'text' && sel[3] === 'text', JSON.stringify(sel))
  await page.fill(ta(2), '')
  ok('4d volta a compilar depois (Worker recriado)', await waitStatus(/^Compilado$/, 3000), await status())

  // 7a. rotação parada (intervalo de 5 s; já passou bem mais que isso)
  ok('7a rotação não trocou o preset com o Estúdio aberto', (await cur()) === c0, `${c0} → ${await cur()}`)

  // Esc: campo → sai do campo; fora → avisa; de novo → sai
  await page.focus(ta(1)); await page.keyboard.press('Escape')
  ok('7b Esc num campo só sai do campo', (await page.isVisible('.studio')) && (await page.evaluate(() => document.activeElement?.tagName !== 'TEXTAREA')))
  await page.keyboard.press('Escape')
  ok('7c com mudanças não salvas, o primeiro Esc só avisa', (await page.isVisible('.studio')) && (await text()).includes('Esc de novo sai sem salvar'))

  // 5. Ctrl+S: pergunta o nome na primeira vez, salva em Meus
  await page.keyboard.press('Control+s')
  await page.waitForSelector('.st-ask input', { timeout: 3000 }).catch(() => {})
  ok('5a primeiro salvar pergunta o nome', await page.isVisible('.st-ask input'))
  await page.fill('.st-ask input', 'Alexandre'); await page.keyboard.press('Enter')
  await page.waitForTimeout(1200)
  const calls = await page.evaluate(() => window.__mineCalls)
  const first = calls[0] || {}
  ok('5b salvou um preset novo com meta e basedOn', !first.id && first.meta?.author === 'Alexandre' && first.meta?.basedOn?.name === c0, JSON.stringify(first.meta))
  ok('5c preset salvo leva a equação editada', String(first.preset?.frame_eqs_eel).includes('0.12*bass_att'))
  ok('5d crédito "por Alexandre · baseado em …"', /^por Alexandre · baseado em /.test(await page.$eval('.st-credit', e => e.textContent)))
  ok('5e nome fica fixo depois de salvar', await page.$eval('#studio-name', e => e.readOnly))
  ok('5f toast de salvo', (await text()).includes('salvo na biblioteca'))
  const saved = first.meta?.title

  // sair (sem mudanças pendentes, um Esc basta)
  await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  ok('7d Esc sai do Estúdio', !(await page.isVisible('.studio')))
  ok('5g o meu preset vira o atual', (await cur()) === saved, `${await cur()}`)
  ok('5h Palco volta (faixa visível de novo)', await page.evaluate(() => !document.body.classList.contains('studio-open')))

  // Biblioteca: rótulo "Meu preset" e filtro "Meus"
  await page.keyboard.press('l'); await page.waitForSelector('.lib', { timeout: 3000 })
  await page.click('.lib .chips button:has-text("Meus")')
  await page.waitForTimeout(200)
  const rows = await page.$$eval('.lib .rows .row', es => es.map(e => e.innerText))
  ok('5i filtro "Meus" lista só o meu preset, com o rótulo', rows.length === 1 && rows[0].includes('Meu preset') && rows[0].includes('baseado em'), JSON.stringify(rows))

  // 6. editar o meu preset sobrescreve só ele (sem perguntar o nome de novo)
  await page.click('.lib .rows .row button[aria-label^="Mais ações"]')
  await page.click('.menu [role=menuitem]:has-text("Editar no Estúdio")')
  await page.waitForSelector('.studio', { timeout: 5000 })
  await waitStatus(/^Compilado$/, 3000)
  ok('6a reaberto: título é o do meu preset', (await page.inputValue('#studio-name')) === saved)
  await page.fill(ta(1), 'zoom = 1.02;')
  await waitStatus(/^Compilado$/, 2500)
  await page.keyboard.press('Control+s'); await page.waitForTimeout(800)
  const calls2 = await page.evaluate(() => window.__mineCalls)
  ok('6b salvar de novo usa o id do meu preset', calls2.length === 2 && calls2[1].id === '000000000000000000000001' && !calls2[1].meta, JSON.stringify(calls2[1] && { id: calls2[1].id }))
  ok('6c sem pergunta de nome na segunda vez', !(await page.isVisible('.st-ask')))
  await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  ok('6d saiu', !(await page.isVisible('.studio')))

  // 10. painel de atalhos
  await page.keyboard.press('?'); await page.waitForTimeout(300)
  const kp = await page.$eval('.kpanel', e => e.innerText).catch(() => '')
  ok('10 painel ? lista "Abrir o Estúdio · E"', /Abrir o Estúdio\s*E\b/.test(kp), kp.slice(0, 80))
  await page.keyboard.press('Escape')

  // Remover meu preset
  await page.keyboard.press('l'); await page.waitForSelector('.lib', { timeout: 3000 })
  const chip = '.lib .chips button:has-text("Meus")'
  if ((await page.getAttribute(chip, 'aria-pressed')) !== 'true') await page.click(chip)
  await page.click('.lib .rows .row button[aria-label^="Mais ações"]')
  await page.click('.menu [role=menuitem]:has-text("Remover meu preset")')
  await page.waitForTimeout(400)
  ok('R remover apaga o meu preset', (await page.evaluate(() => window.__mine.length)) === 0 && (await text()).includes('Nenhum preset seu ainda'))

  // 9 (parte headless). log só com eventos, nunca por tecla
  const logs = (await page.evaluate(() => window.__logs)).filter(l => l.startsWith('estúdio'))
  ok('9a log com abrir/fechar/erros, sem linha por tecla', logs.some(l => l.startsWith('estúdio: aberto')) && logs.some(l => l.startsWith('estúdio: fechado')) && logs.length <= 12, JSON.stringify(logs))
  ok('9b sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))

  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
