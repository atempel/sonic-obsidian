// Teste headless da spec 027, fatia 7 (Estúdio: Exportar .milk). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-exportar.test.cjs`). O `window.so.presets.exportFile` é simulado
// (o diálogo nativo é do main) e guarda o que receberia. Critério 6: o .milk exportado de um importado
// volta pelo conversor de verdade (src/main/milk.ts, transpilado aqui) e dá o mesmo preset; a cópia de
// um preset do pacote avisa antes que os shaders não vão; o JSON do Butterchurn leva tudo.
const H = require('./harness.cjs')
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const R = H.createResults('027-estudio-exportar'); const ok = R.ok
const ROOT = path.join(__dirname, '..', '..')

globalThis.self = globalThis // os pacotes UMD do butterchurn-presets e do conversor esperam `self`
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
const IMPORTED = '_Mig_056'
const SRC = fs.readFileSync(path.join(ROOT, 'spike', '006', 'milk', `${IMPORTED}.milk`), 'utf8')
const base = require(path.join(ROOT, 'node_modules', 'butterchurn-presets', 'dist', 'base.min.js'))
const PACK = Object.entries(base.default || base)
const WITH_SH = PACK.find(([, p]) => p.warp?.trim() && p.comp?.trim())[0]
const NO_SH = PACK.find(([, p]) => !p.warp?.trim() && !p.comp?.trim())?.[0]
/** As linhas em branco no fim de um bloco não voltam do .milk (o MilkDrop também não as guarda). */
const trimEnds = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'string' && k !== 'warp' && k !== 'comp' ? v.replace(/\s+$/, '') : v)))

const srv = H.serve(5249)
;(async () => {
  const imported = await milkToPreset3(SRC)
  const b = await H.launch()
  const errs = []
  async function open(lastPreset, { cancel = false } = {}) {
    const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
    page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    await H.mockSo(page, { settings: { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false }, startupPreset: 'last', lastPreset } })
    await page.exposeFunction('__convert', async (text) => { try { return { ok: await milkToPreset3(text) } } catch (e) { return { err: e.message } } })
    await page.addInitScript(([name, text, preset, cancel]) => {
      window.__exports = []
      Object.assign(window.so.presets, {
        listImported: async () => [{ name, preset }],
        importedMilk: async (x) => (x === name ? text : null),
        convertMilk: async (t) => { const r = await window.__convert(t); if ('err' in r) throw new Error(r.err); return { preset: r.ok, ms: 1 } },
        exportFile: async (kind, n, t) => {
          window.__exports.push({ kind, name: n, text: t })
          if (window.__exportFail) throw new Error('[too-big] file larger than 256 KB')
          return cancel ? { ok: false, canceled: true } : { ok: true, name: `${n}.${kind}` }
        }
      })
    }, [IMPORTED, SRC, imported, cancel])
    await H.mockAudio(page)
    await page.goto('http://localhost:5249/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
    await page.waitForTimeout(800)
    await page.mouse.move(700, 400)
    await page.keyboard.press('e')
    await page.waitForSelector('.studio', { timeout: 8000 })
    await H.poll(page, () => document.querySelector('.cstat')?.textContent.trim() === 'Compilado', { timeout: 12000 })
    return page
  }
  const exportsOf = (page) => page.evaluate(() => window.__exports)
  const toastText = (page) => page.$eval('.gtoast', e => e.textContent).catch(() => '')
  // Espera o menu e o foco nele: o foco vai para o primeiro item depois da montagem, e num runner lento
  // a leitura logo depois do waitForSelector ainda via o foco no botão (#133).
  const openMenu = async (page) => {
    await page.click('.st-exp-btn'); await page.waitForSelector('.st-exp', { timeout: 15000 })
    await H.poll(page, () => document.querySelector('.st-exp-btn')?.getAttribute('aria-expanded') === 'true' && !!document.activeElement?.closest('.st-exp'), { timeout: 15000, every: 100 })
  }

  // 1. Importado: o botão, o menu e o .milk com o HLSL da fonte, que volta igual (critério 6)
  let page = await open(IMPORTED)
  ok('1a botão "Exportar .milk" no topo, entre Versões e Salvar', await page.$eval('.st-top-r', (r) => {
    const bs = [...r.querySelectorAll(':scope > button')].map((x) => x.className)
    return bs.indexOf('btn btn-ghost st-ver') < bs.indexOf('btn btn-ghost st-exp-btn') && bs.indexOf('btn btn-ghost st-exp-btn') < bs.findIndex((c) => c.includes('st-save'))
  }) && (await page.$eval('.st-exp-btn', e => e.getAttribute('aria-label'))) === 'Exportar .milk')
  await openMenu(page)
  ok('1b menu aberto: aria-expanded, foco no .milk, sem aviso (há fonte)', (await page.$eval('.st-exp-btn', e => e.getAttribute('aria-expanded'))) === 'true' &&
    (await page.evaluate(() => document.activeElement?.classList.contains('st-exp-milk'))) && !(await page.$('.st-exp-warn')) &&
    (await page.$eval('.st-exp-json', e => e.textContent.trim())) === 'Exportar JSON do Butterchurn')
  await page.keyboard.press('Escape')
  ok('1c Esc fecha o menu (não sai do Estúdio) e o foco volta ao botão', !(await page.$('.st-exp')) && !!(await page.$('.studio')) && (await page.evaluate(() => document.activeElement?.classList.contains('st-exp-btn'))))
  await openMenu(page)
  await page.click('.st-exp-milk')
  await H.poll(page, () => window.__exports.length >= 1, { timeout: 8000 })
  const e1 = (await exportsOf(page))[0] || {}
  ok('1d .milk com o nome do título e o HLSL da fonte', e1.kind === 'milk' && /_Mig_056/.test(e1.name) && e1.text.startsWith('MILKDROP_PRESET_VERSION=201') && e1.text.includes('warp_6=`    float2 dither_uv'), `${e1.kind} ${e1.name}`)
  ok('1e toast "Exportado como …" e menu fechado', /^Exportado como .*\.milk\.$/.test(await toastText(page)) && !(await page.$('.st-exp')), await toastText(page))
  const back = await milkToPreset3(e1.text)
  ok('1f o .milk exportado volta pelo conversor e dá o mesmo preset (shaders inclusive)', JSON.stringify(trimEnds(back)) === JSON.stringify(trimEnds(imported)))
  ok('1g log em inglês', (await page.evaluate(() => window.__logs)).includes('studio: exported milk'))

  // 2. Uma edição vai junto; GLSL editado à mão avisa que o .milk leva o HLSL anterior
  await page.keyboard.press('Control+1')
  await page.$eval('#studio-p-zoom', e => { e.value = 1.1; e.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.keyboard.press('Control+5')
  const comp0 = await page.inputValue('#studio-tp-shaders .ed-ta >> nth=1')
  const comp1 = comp0.replace(/\}\s*$/, '  ret = ret * 0.9;\n}')
  await page.fill('#studio-tp-shaders .ed-ta >> nth=1', comp1)
  await H.poll(page, () => document.querySelector('.cstat')?.textContent.trim() === 'Compilado', { timeout: 10000 })
  await openMenu(page)
  ok('2a aviso de GLSL editado no menu', /HLSL anterior/.test(await page.$eval('.st-exp-warn', e => e.textContent).catch(() => '')))
  await page.click('.st-exp-milk')
  await H.poll(page, () => window.__exports.length >= 2, { timeout: 8000 })
  const e2 = (await exportsOf(page))[1] || {}
  ok('2b o .milk leva o zoom editado e o HLSL da fonte', /^zoom=1\.1$/m.test(e2.text) && e2.text.includes('warp_6=`    float2 dither_uv'), (/^zoom=.*$/m.exec(e2.text || '') || [])[0])
  // 3. JSON do Butterchurn: leva o GLSL editado
  await openMenu(page)
  await page.click('.st-exp-json')
  await H.poll(page, () => window.__exports.length >= 3, { timeout: 8000 })
  const e3 = (await exportsOf(page))[2] || {}
  let j = null
  try { j = JSON.parse(e3.text) } catch { j = null }
  ok('3a JSON com o GLSL editado e o zoom', e3.kind === 'json' && !!j && j.comp === comp1 && j.baseVals?.zoom === 1.1, `${e3.kind} ${j?.baseVals?.zoom} ${j?.comp === comp1}`)
  ok('3b toast do JSON', /^Exportado como .*\.json\.$/.test(await toastText(page)))
  // 4. Com erro, não exporta
  await page.keyboard.press('Control+2')
  await page.fill('#studio-tp-eq .ed-ta >> nth=1', 'zoom = = 1;')
  await H.poll(page, () => /erro/.test(document.querySelector('.cstat')?.textContent ?? ''), { timeout: 10000 })
  await openMenu(page)
  await page.click('.st-exp-milk')
  await page.waitForTimeout(800)
  ok('4a com erro: não exporta e avisa', (await exportsOf(page)).length === 3 && /Corrija os erros antes de exportar/.test(await toastText(page)), await toastText(page))
  // 5. Falha do main: toast traduzido
  await page.keyboard.press('Control+z').catch(() => {})
  await page.fill('#studio-tp-eq .ed-ta >> nth=1', imported.frame_eqs_eel)
  await H.poll(page, () => document.querySelector('.cstat')?.textContent.trim() === 'Compilado', { timeout: 10000 })
  await page.evaluate(() => { window.__exportFail = true })
  await openMenu(page)
  await page.click('.st-exp-json')
  await H.poll(page, () => window.__exports.length >= 4, { timeout: 8000 })
  await page.waitForTimeout(300)
  ok('5a falha no main: "Não exportado: …" e log em inglês', /^Não exportado: /.test(await toastText(page)) && (await page.evaluate(() => window.__logs)).some(l => /^studio: export failed: file larger than 256 KB/.test(l)), await toastText(page))
  await page.screenshot({ path: path.join(ROOT, 'test-results', '027-estudio-exportar.png') }).catch(() => {})
  await page.close()

  // 6. Cópia de preset do pacote com shaders: aviso antes, .milk sem shaders
  page = await open(WITH_SH, { cancel: true })
  await openMenu(page)
  const warn = await page.$eval('.st-exp-warn', e => e.textContent).catch(() => '')
  ok('6a aviso claro antes: os shaders não vão (veio do pacote)', /Os shaders não vão no \.milk: este preset veio do pacote/.test(warn), warn)
  ok('6b o botão diz "sem os shaders"', (await page.$eval('.st-exp-milk', e => e.textContent.trim())) === 'Exportar .milk sem os shaders')
  await page.screenshot({ path: path.join(ROOT, 'test-results', '027-estudio-exportar-pacote.png') }).catch(() => {})
  await page.click('.st-exp-milk')
  await H.poll(page, () => window.__exports.length >= 1, { timeout: 8000 })
  const e6 = (await exportsOf(page))[0] || {}
  ok('6c .milk sem shaders (PSVERSION_WARP=0), com parâmetros e equações', e6.kind === 'milk' && /PSVERSION_WARP=0/.test(e6.text) && !/^(warp|comp)_\d+=/m.test(e6.text) && /^per_frame_1=/m.test(e6.text))
  ok('6d diálogo cancelado: sem toast de exportado', !/Exportado/.test(await toastText(page)))
  const back6 = await milkToPreset3(e6.text).catch(() => null)
  ok('6e o .milk sem shaders importa de volta', !!back6 && typeof back6.baseVals === 'object')
  await page.close()

  // 7. Preset do pacote sem shaders: nada a avisar
  if (NO_SH) {
    page = await open(NO_SH)
    await openMenu(page)
    ok('7a preset do pacote sem shaders: sem aviso', !(await page.$('.st-exp-warn')) && (await page.$eval('.st-exp-milk', e => e.textContent.trim())) === 'Exportar .milk')
    await page.close()
  }

  ok('8a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
