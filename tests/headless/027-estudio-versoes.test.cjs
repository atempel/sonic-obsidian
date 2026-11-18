// Teste headless da spec 027, fatia 3 (Estúdio: Histórico e desfazer). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-versoes.test.cjs`). O histórico roda no src/main/mine.ts de verdade
// (transpilado aqui, numa pasta temporária no lugar do userData), também por trás do window.so da página.
// O visual voltando ao restaurar só se vê no Windows; aqui vale o que o editor e o disco mostram.
const H = require('./harness.cjs')
const path = require('path'), fs = require('fs'), os = require('os'), Module = require('module')
const ts = require('typescript')
const srv = H.serve(5237)
const R = H.createResults('027-estudio-versoes'); const ok = R.ok

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'so-027v-'))
function loadMine() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'main', 'mine.ts'), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = new Module('mine.js')
  const load = Module._load
  Module._load = (req, ...rest) => (req === 'electron' ? { app: { getPath: () => userData } } : req === './log' ? { log: () => {} } : load(req, ...rest))
  try { m._compile(js, 'mine.js') } finally { Module._load = load }
  return m.exports
}
const mine = loadMine()
const P = (over = {}) => ({ version: 2, baseVals: { zoom: 1, decay: 0.96 }, shapes: [], waves: [], init_eqs_eel: '', frame_eqs_eel: 'zoom = 1;', pixel_eqs_eel: '', warp: '', comp: '', ...over })
const rejects = async (f) => { try { await f(); return false } catch { return true } }

async function mainChecks() {
  // A. Cada salvamento vira uma versão, com o resumo do que mudou
  const meta = { title: 'Teste', author: 'Eu', basedOn: { name: 'Zylot - Star Ornament', author: 'Zylot' } }
  const { id } = await mine.saveMine({ meta, preset: P() })
  let v = await mine.listVersions(id)
  ok('Aa criar grava a primeira versão (criado)', v.length === 1 && v[0].n === 1 && v[0].summary.kind === 'created' && !!Date.parse(v[0].savedAt), JSON.stringify(v))
  await mine.saveMine({ id, preset: P({ baseVals: { zoom: 1, decay: 0.975 } }) })
  await mine.saveMine({ id, preset: P({ baseVals: { zoom: 1, decay: 0.975 }, frame_eqs_eel: 'zoom = 1.01;', waves: [{ baseVals: { enabled: 1 }, init_eqs_eel: '', frame_eqs_eel: '', point_eqs_eel: 'x = sample;' }] }) })
  v = await mine.listVersions(id)
  ok('Ab salvar três vezes = três versões, da mais nova para a mais antiga', v.map(x => x.n).join() === '3,2,1')
  const d = v[1].summary
  ok('Ac resumo de parâmetro: decay 0.96 → 0.975', d.kind === 'edit' && d.vals.length === 1 && d.vals[0].key === 'decay' && d.vals[0].from === 0.96 && d.vals[0].to === 0.975 && d.blocks.length === 0, JSON.stringify(d))
  ok('Ad resumo de blocos: per_frame e a onda 0', v[0].summary.blocks.join() === 'per_frame,wave_0' && v[0].summary.vals.length === 0, JSON.stringify(v[0].summary))
  const p1 = await mine.readVersion(id, 1)
  ok('Ae ler a versão 1 devolve o preset de antes', p1.baseVals.decay === 0.96 && p1.frame_eqs_eel === 'zoom = 1;')
  const folder = path.join(userData, 'presets', 'mine', id)
  ok('Af arquivos v0001.json… na pasta do preset, sem preset.prev.json', ['v0001.json', 'v0002.json', 'v0003.json'].every(f => fs.existsSync(path.join(folder, f))) && !fs.existsSync(path.join(folder, 'preset.prev.json')))
  const many = { zoom: 1.1, rot: 0.2, warp: 0.5, decay: 0.9, cx: 0.4 }
  await mine.saveMine({ id, preset: P({ baseVals: many }) })
  const m = (await mine.listVersions(id))[0].summary
  ok('Ag mais de 3 parâmetros: 3 no resumo e "mais N"', m.vals.length === 3 && m.more === 2, JSON.stringify(m))

  // B. Limite de 50 (as mais antigas saem)
  for (let i = 0; i < 50; i++) await mine.saveMine({ id, preset: P({ baseVals: { zoom: 1 + i / 1000 } }) })
  v = await mine.listVersions(id)
  ok('Ba no máximo 50 versões', v.length === 50, String(v.length))
  ok('Bb saem as mais antigas (a mais nova é a 54, a mais antiga a 5)', v[0].n === 54 && v[49].n === 5, `${v[0].n} … ${v[49].n}`)
  ok('Bc só 50 arquivos de versão no disco', fs.readdirSync(folder).filter(f => /^v\d+\.json$/.test(f)).length === 50)

  // C. Migração da 026: preset.prev.json vira a primeira versão
  const old = path.join(userData, 'presets', 'mine', 'a'.repeat(24))
  fs.mkdirSync(old, { recursive: true })
  fs.writeFileSync(path.join(old, 'meta.json'), JSON.stringify({ ...meta, createdAt: '2026-11-10T10:00:00.000Z' }))
  fs.writeFileSync(path.join(old, 'preset.prev.json'), JSON.stringify(P({ baseVals: { zoom: 1 } })))
  fs.writeFileSync(path.join(old, 'preset.json'), JSON.stringify(P({ baseVals: { zoom: 1.02 } })))
  v = await mine.listVersions('a'.repeat(24))
  ok('Ca preset.prev.json vira a v0001 (de antes do histórico) e o atual a v0002', v.length === 2 && v[1].summary.kind === 'earlier' && v[0].summary.vals[0]?.key === 'zoom', JSON.stringify(v))
  ok('Cb o preset.prev.json sai depois de migrar', !fs.existsSync(path.join(old, 'preset.prev.json')))
  const noPrev = path.join(userData, 'presets', 'mine', 'b'.repeat(24))
  fs.mkdirSync(noPrev, { recursive: true })
  fs.writeFileSync(path.join(noPrev, 'meta.json'), JSON.stringify({ ...meta, createdAt: '2026-11-10T10:00:00.000Z' }))
  fs.writeFileSync(path.join(noPrev, 'preset.json'), JSON.stringify(P()))
  await mine.saveMine({ id: 'b'.repeat(24), preset: P({ baseVals: { zoom: 1.03 } }) })
  v = await mine.listVersions('b'.repeat(24))
  ok('Cc salvo uma vez na 026 e salvo de novo: o antigo vira a v0001', v.map(x => x.n).join() === '2,1' && v[1].summary.kind === 'created' && v[0].summary.vals[0]?.to === 1.03, JSON.stringify(v))

  // D. Barreira
  ok('Da id inválido é recusado', await rejects(() => mine.listVersions('../../x')) && await rejects(() => mine.readVersion('../x', 1)))
  ok('Db número de versão inválido é recusado', await rejects(() => mine.readVersion(id, '1')) && await rejects(() => mine.readVersion(id, 0)) && await rejects(() => mine.readVersion(id, 1.5)))
  fs.writeFileSync(path.join(folder, 'v0099.json'), JSON.stringify({ savedAt: 'x', summary: {}, preset: { ...P(), frame_eqs_str: 'a.zoom = 2' } }))
  ok('Dc versão com JavaScript no disco não passa', await rejects(() => mine.readVersion(id, 99)))
  fs.rmSync(path.join(folder, 'v0099.json'))
}

;(async () => {
  await mainChecks()
  fs.rmSync(path.join(userData, 'presets'), { recursive: true, force: true })

  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await H.mockSo(page, { settings: { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false } } })
  // window.so.presets.*Mine* → o mine.ts de verdade, nesta pasta temporária.
  const wrap = (f) => async (...a) => { try { return { ok: await f(...a) } } catch (e) { return { err: e.message } } }
  await page.exposeFunction('__saveMine', wrap((d) => mine.saveMine(d)))
  await page.exposeFunction('__mineVersions', wrap((id) => mine.listVersions(id)))
  await page.exposeFunction('__mineVersion', wrap((id, n) => mine.readVersion(id, n)))
  await page.addInitScript(() => {
    const un = async (p) => { const r = await p; if ('err' in r) throw new Error(r.err); return r.ok }
    Object.assign(window.so.presets, {
      listMine: async () => [],
      saveMine: (d) => un(window.__saveMine(d)),
      mineVersions: (id) => un(window.__mineVersions(id)),
      mineVersion: (id, n) => un(window.__mineVersion(id, n)),
      removeMine: async () => {}
    })
  })
  await H.mockAudio(page)
  await page.goto('http://localhost:5237/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1000)
  const zoom = () => page.$eval('#studio-p-zoom', e => e.closest('.ctl').querySelector('output').textContent)
  const setZoom = (v) => page.$eval('#studio-p-zoom', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })) }, v)
  const toast = () => page.$eval('.gtoast', e => e.textContent).catch(() => '')
  const items = () => page.$$eval('.st-vlist .ver', es => es.map(e => ({ t: e.querySelector('p').textContent, cur: e.classList.contains('cur') })))
  const blur = () => page.evaluate(() => { document.activeElement?.blur(); document.querySelector('.studio').focus() })
  const waitStatusOk = () => H.poll(page, () => /Compilado|Compiled/.test(document.querySelector('.cstat')?.textContent || ''), { timeout: 8000 })

  await page.mouse.move(700, 400)
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 15000 })
  await waitStatusOk()
  const z0 = await zoom()

  // 1. Gaveta antes de salvar
  ok('1a botão "Versões" no topo, com aria-expanded', (await page.getAttribute('.st-ver', 'aria-expanded')) === 'false' && (await page.getAttribute('.st-ver', 'aria-label')) === 'Versões')
  await page.click('.st-ver')
  await page.waitForSelector('.st-drawer.open', { timeout: 15000 })
  const focusClose = await H.poll(page, () => document.activeElement?.closest('.st-drawer-h') != null, { timeout: 2000 })
  ok('1b abre a gaveta com o foco em fechar', focusClose && (await page.getAttribute('.st-ver', 'aria-expanded')) === 'true')
  ok('1c sem salvar: explica que o histórico começa ao salvar', /Salve na biblioteca para começar o histórico/.test(await page.$eval('.st-drawer', e => e.textContent)))
  ok('1d nota de Ctrl+Z / Ctrl+Shift+Z', /Ctrl\+Z desfaz e Ctrl\+Shift\+Z refaz/.test(await page.$eval('.st-drawer', e => e.textContent)))
  await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', '027-estudio-versoes-vazia.png') }).catch(() => {})
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  ok('1e Esc fecha a gaveta (o Estúdio continua) e o foco volta ao botão', !(await page.$('.st-drawer.open')) && (await page.isVisible('.studio')) && (await page.evaluate(() => document.activeElement?.classList.contains('st-ver'))))

  // 2. Desfazer e refazer fora de campo de texto
  await setZoom('1.05'); await blur()
  ok('2a slider mudou', (await zoom()) === '1.050')
  await page.keyboard.press('Control+z')
  ok('2b Ctrl+Z volta o zoom', (await zoom()) === z0, `${await zoom()} vs ${z0}`)
  await page.keyboard.press('Control+Shift+z')
  ok('2c Ctrl+Shift+Z refaz', (await zoom()) === '1.050')
  await page.keyboard.press('Control+Shift+z')
  const nothing = await H.poll(page, () => /Nada para refazer/.test(document.querySelector('.gtoast')?.textContent || ''), { timeout: 3000 })
  ok('2d nada para refazer avisa', nothing, await toast())
  // Vários passos do mesmo slider em menos de 1 s = um passo
  // Arrastar: vários eventos de input em sequência rápida
  await page.$eval('#studio-p-zoom', (e) => { for (const v of ['1.06', '1.07', '1.08']) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })) } })
  await blur(); await page.keyboard.press('Control+z')
  ok('2e arrastar o slider vira um passo só', (await zoom()) === '1.050', await zoom())
  await page.keyboard.press('Control+Shift+z')
  // Num campo de texto vale o desfazer nativo (o editor não mexe no zoom)
  await page.keyboard.press('Control+2')
  await page.focus('.studio .ed-ta >> nth=1')
  await page.keyboard.press('Control+z')
  ok('2f Ctrl+Z num campo de texto não desfaz o slider', (await zoom()) === '1.080')
  await blur(); await page.keyboard.press('Control+1')

  // 3. Salvar três vezes = três versões
  await page.keyboard.press('Control+s')
  ok('3 primeiro salvamento', await H.poll(page, () => /salvo na biblioteca/.test(document.querySelector('.gtoast')?.textContent || ''), { timeout: 8000 }), await toast())
  await setZoom('1.09'); await blur()
  await page.keyboard.press('Control+s'); await page.waitForTimeout(400)
  await page.keyboard.press('Control+2')
  const frame0 = await page.inputValue('.studio .ed-ta >> nth=1')
  await page.fill('.studio .ed-ta >> nth=1', frame0 + '\nrot = rot + 0.001;')
  await waitStatusOk(); await page.waitForTimeout(500)
  await blur()
  await page.keyboard.press('Control+s'); await page.waitForTimeout(400)
  await page.click('.st-ver')
  await H.poll(page, () => document.querySelectorAll('.st-vlist .ver').length >= 3, { timeout: 15000 })
  const it = await items()
  ok('3a três versões na gaveta, a mais nova marcada', it.length === 3 && it[0].cur && !it[1].cur, JSON.stringify(it))
  ok('3b mais nova: per_frame editado', /per_frame editado/.test(it[0]?.t || ''), it[0]?.t)
  ok('3c do meio: zoom 1.080 → 1.090', /zoom 1\.080 → 1\.090/.test(it[1]?.t || ''), it[1]?.t)
  ok('3d primeira: "Cópia de … criada"', /^Cópia de .+ criada$/.test(it[2]?.t || ''), it[2]?.t)
  ok('3e hora e "Você" em cada versão', await page.$$eval('.st-vlist .ver-h', es => es.every(e => /\d{2}:\d{2}/.test(e.textContent) && /Você/.test(e.textContent))))
  await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', '027-estudio-versoes.png') }).catch(() => {})

  // 4. Restaurar a primeira
  await page.click('.st-vlist .ver >> nth=2 >> button:has-text("Restaurar")')
  const restored = await H.poll(page, () => /Versão de .+ restaurada/.test(document.querySelector('.gtoast')?.textContent || ''), { timeout: 15000 })
  ok('4 toast "Versão de … restaurada"', restored, await toast())
  await waitStatusOk()
  ok('4a restaurar volta as equações da versão', (await page.inputValue('.studio .ed-ta >> nth=1')) === frame0)
  ok('4b e os parâmetros (zoom 1.080)', (await zoom()) === '1.080', await zoom())
  ok('4c selo "Seu remix" (falta salvar)', await page.isVisible('.chip.tl:has-text("Seu remix")'))
  // 5. Ctrl+Z desfaz a restauração
  await page.keyboard.press('Escape') // fecha a gaveta
  await blur(); await page.keyboard.press('Control+z')
  ok('5a Ctrl+Z desfaz a restauração', (await zoom()) === '1.090' && /rot = rot \+ 0\.001/.test(await page.inputValue('.studio .ed-ta >> nth=1')), await zoom())

  // 6. Fim
  ok('6a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  fs.rmSync(userData, { recursive: true, force: true })
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
