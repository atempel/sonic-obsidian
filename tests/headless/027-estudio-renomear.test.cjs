// Teste headless da spec 027, fatia 9 (Estúdio: Renomear um "meu" preset). Uso: `npm run build` e
// `npm run test:ui` (ou `node tests/headless/027-estudio-renomear.test.cjs`). O "meu" preset vem do modelo
// do Novo preset (src/renderer/src/studio/template.ts), convertido pelo conversor de verdade (src/main/milk.ts,
// transpilado aqui). Confere: o nome segue editável depois de salvo; mudar o nome conta como não salvo (Esc
// avisa); salvar só o nome renomeia sem versão nova; favoritos, coleções, recentes, fps medido, último preset e
// favorito de abertura acompanham; nome já usado vira "(2)"; nome e edição juntos renomeiam e salvam.
// A parte do disco (meta.json) é testada direto em src/main/mine.ts, transpilado com um `electron` falso.
const H = require('./harness.cjs')
const path = require('path'), fs = require('fs'), os = require('os'), Module = require('module')
const ts = require('typescript')
const R = H.createResults('027-estudio-renomear'); const ok = R.ok
const ROOT = path.join(__dirname, '..', '..')

globalThis.self = globalThis // os pacotes UMD do conversor esperam `self`
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'so-rename-'))
function load(rel) {
  const f = path.join(ROOT, rel)
  const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const m = new Module(f)
  m.filename = f
  m.paths = Module._nodeModulePaths(path.dirname(f))
  const req = m.require.bind(m)
  m.require = (x) => (x === './hlsl-fix' ? load('src/main/hlsl-fix.ts') : x === 'electron' ? { app: { getPath: () => TMP } } : x === './log' ? { log: () => {} } : req(x))
  m._compile(js, f)
  return m.exports
}
const { milkToPreset3 } = load('src/main/milk.ts')
const { TEMPLATE_MILK } = load('src/renderer/src/studio/template.ts')
const mine = load('src/main/mine.ts')
const START = 'Martin - liquid arrows'
const ID = 'a'.repeat(24)

const srv = H.serve(5251)
;(async () => {
  const preset = await milkToPreset3(TEMPLATE_MILK)

  // 0. Disco: só o título do meta.json muda; versões, fonte e preset ficam
  const s0 = await mine.saveMine({ meta: { title: 'Disco A', author: 'Teste', basedOn: { name: START, author: 'Martin' } }, preset, milk: TEMPLATE_MILK })
  const folder = path.join(TMP, 'presets', 'mine', s0.id)
  const before = fs.readdirSync(folder).sort().join(',')
  const m0 = await mine.renameMine(s0.id, '  Disco\u0007 B  ')
  const meta0 = JSON.parse(fs.readFileSync(path.join(folder, 'meta.json'), 'utf8'))
  ok('0a renameMine grava só o título novo (limpo), com autor, base e data', m0.title === 'Disco B' && meta0.title === 'Disco B' && meta0.author === 'Teste' && meta0.basedOn?.name === START && meta0.createdAt === s0.meta.createdAt, JSON.stringify(meta0))
  ok('0b pasta, versões e fonte .milk ficam como estavam', fs.readdirSync(folder).sort().join(',') === before && (await mine.listVersions(s0.id)).length === 1 && (await mine.readMineMilk(s0.id)) === TEMPLATE_MILK, before)
  let threw = ''
  try { await mine.renameMine(s0.id, '   ') } catch (e) { threw = e.message }
  ok('0c nome vazio é recusado', /^\[empty-title\]/.test(threw), threw)
  threw = ''
  try { await mine.renameMine('../x', 'y') } catch (e) { threw = e.message }
  ok('0d id inválido é recusado (nenhum caminho vem do renderer)', /^\[invalid\]/.test(threw), threw)
  ok('0e listMine devolve o nome novo', (await mine.listMine()).some((x) => x.id === s0.id && x.meta.title === 'Disco B'))
  fs.rmSync(TMP, { recursive: true, force: true })

  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
  const errs = []
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await H.mockSo(page, {
    settings: { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false }, startupPreset: 'last', lastPreset: 'Meu A', startupFavorite: 'Meu A' },
    library: { version: 1, favorites: [START, 'Meu A'], hidden: [], hiddenPerf: [], recents: ['Meu A', START], presetFps: { 'Meu A': 55 }, collections: [{ id: 'c1', name: 'Noite', presets: [START, 'Meu A'], intervalSeconds: 30 }] }
  })
  await page.addInitScript(({ preset, ID, START }) => {
    window.__mineCalls = []; window.__renames = []; window.__settingsSaves = []
    const meta = { title: 'Meu A', author: 'Teste', basedOn: { name: START, author: 'Martin' }, createdAt: '2026-11-17T00:00:00.000Z' }
    window.so.settings.save = async (d) => { window.__settingsSaves.push(JSON.parse(JSON.stringify(d))) }
    Object.assign(window.so.presets, {
      listMine: async () => [{ id: ID, meta, preset }],
      saveMine: async (d) => { window.__mineCalls.push(JSON.parse(JSON.stringify(d))); return { id: d.id || ID, meta: { ...meta } } },
      renameMine: async (id, title) => { window.__renames.push([id, title]); meta.title = title; return { ...meta } },
      mineVersions: async () => [{ n: 1, savedAt: meta.createdAt, summary: { kind: 'created', vals: [], more: 0, blocks: [] } }]
    })
  }, { preset, ID, START })
  await H.mockAudio(page)
  await page.goto('http://localhost:5251/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(800)
  const cur = () => page.$eval('.now-title', e => e.getAttribute('title'))
  const compiled = () => H.poll(page, () => document.querySelector('.cstat')?.textContent.trim() === 'Compilado', { timeout: 12000 })
  const toastText = () => page.$eval('.gtoast', e => e.textContent).catch(() => '')
  const lastLib = () => page.evaluate(() => window.__saves[window.__saves.length - 1] || null)
  const lastSet = () => page.evaluate(() => window.__settingsSaves[window.__settingsSaves.length - 1] || null)
  ok('0f o meu preset "Meu A" abre tocando', (await cur()) === 'Meu A', await cur())
  await page.mouse.move(700, 400)

  // 1. O nome segue editável depois de salvo
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 8000 })
  await compiled()
  ok('1a o campo do nome está editável, com a dica de renomear', !(await page.$eval('#studio-name', e => e.readOnly)) && (await page.inputValue('#studio-name')) === 'Meu A' && /salve para renomear/.test(await page.$eval('#studio-name', e => e.title)))
  ok('1b sem mudança, a prévia diz "Salvo"', (await page.$eval('.st-prev .chip.tl', e => e.textContent.trim())) === 'Salvo')
  await page.fill('#studio-name', 'Meu B')
  ok('1c nome mudado conta como não salvo', (await page.$eval('.st-prev .chip.tl', e => e.textContent.trim())) !== 'Salvo')
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  ok('1d Esc só avisa (nome não salvo)', (await page.isVisible('.studio')) && /Esc de novo sai sem salvar/.test(await toastText()), await toastText())

  // 2. Salvar só o nome: renomeia, sem versão nova
  await page.keyboard.press('Control+s')
  await H.poll(page, () => window.__renames.length >= 1, { timeout: 8000 })
  await page.waitForTimeout(400)
  ok('2a renomeia no disco pelo id, sem salvar versão', JSON.stringify(await page.evaluate(() => window.__renames)) === JSON.stringify([[ID, 'Meu B']]) && (await page.evaluate(() => window.__mineCalls.length)) === 0)
  ok('2b toast e campo com o nome novo; a prévia volta a "Salvo"', /Renomeado para “Meu B”/.test(await toastText()) && (await page.inputValue('#studio-name')) === 'Meu B' && (await page.$eval('.st-prev .chip.tl', e => e.textContent.trim())) === 'Salvo', await toastText())
  const lib = await lastLib()
  ok('2c favoritos acompanham', JSON.stringify(lib?.favorites) === JSON.stringify([START, 'Meu B']), JSON.stringify(lib?.favorites))
  ok('2d coleção acompanha, na mesma posição', JSON.stringify(lib?.collections?.[0]?.presets) === JSON.stringify([START, 'Meu B']), JSON.stringify(lib?.collections))
  ok('2e recentes e fps medido acompanham', lib?.recents?.[0] === 'Meu B' && !lib.recents.includes('Meu A') && lib.presetFps?.['Meu B'] === 55 && !('Meu A' in lib.presetFps), JSON.stringify(lib?.recents))
  const st = await lastSet()
  ok('2f último preset e favorito de abertura acompanham', st?.lastPreset === 'Meu B' && st?.startupFavorite === 'Meu B', JSON.stringify({ l: st?.lastPreset, f: st?.startupFavorite }))
  ok('2g log em inglês', (await page.evaluate(() => window.__logs)).includes('studio: renamed Meu A to Meu B'))
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Escape')
  await H.poll(page, () => !document.querySelector('.studio'), { timeout: 5000 })
  ok('2h Esc sai direto e o preset toca com o nome novo', (await cur()) === 'Meu B', await cur())

  // 3. Biblioteca: "Meus" mostra o nome novo, favoritado
  await page.keyboard.press('l'); await page.waitForSelector('.lib', { timeout: 3000 })
  await page.click('.lib .chips button:has-text("Meus")')
  await page.waitForTimeout(300)
  const libText = await page.$eval('.lib', e => e.textContent)
  ok('3a Biblioteca › Meus mostra "Meu B" (não "Meu A")', libText.includes('Meu B') && !libText.includes('Meu A'))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // 4. Nome já usado + edição: vira "(2)", renomeia e salva uma versão
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 8000 })
  await compiled()
  await page.fill('#studio-name', START)
  await page.$eval('#studio-p-zoom', e => { e.value = 1.07; e.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.waitForTimeout(200)
  await page.keyboard.press('Control+s')
  await H.poll(page, () => window.__mineCalls.length >= 1, { timeout: 8000 })
  await page.waitForTimeout(400)
  const ren = await page.evaluate(() => window.__renames)
  const call = (await page.evaluate(() => window.__mineCalls))[0] || {}
  ok('4a nome de outro preset vira "(2)"', ren[1]?.[1] === `${START} (2)`, JSON.stringify(ren))
  ok('4b com edição, salva também (mesmo id, preset editado)', call.id === ID && call.preset?.baseVals?.zoom === 1.07)
  ok('4c campo e toast com o nome final', (await page.inputValue('#studio-name')) === `${START} (2)` && /Renomeado para/.test(await toastText()), await toastText())
  const lib2 = await lastLib()
  ok('4d favoritos e coleção com o nome final; o preset do pacote continua', JSON.stringify(lib2?.favorites) === JSON.stringify([START, `${START} (2)`]) && JSON.stringify(lib2?.collections?.[0]?.presets) === JSON.stringify([START, `${START} (2)`]))
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Escape')
  await H.poll(page, () => !document.querySelector('.studio'), { timeout: 5000 })
  ok('4e ao sair, toca o renomeado', (await cur()) === `${START} (2)`, await cur())

  // 5. Campo vazio não renomeia
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 8000 })
  await compiled()
  await page.fill('#studio-name', '   ')
  ok('5a campo vazio não conta como mudança', (await page.$eval('.st-prev .chip.tl', e => e.textContent.trim())) === 'Salvo')
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Escape')
  await H.poll(page, () => !document.querySelector('.studio'), { timeout: 5000 })
  ok('5b sai sem renomear', (await page.evaluate(() => window.__renames.length)) === 2 && (await cur()) === `${START} (2)`)

  ok('6a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
