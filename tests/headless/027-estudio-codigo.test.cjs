// Teste headless da spec 027, fatia 6 (Estúdio: Código .milk). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-codigo.test.cjs`). Primeiro, sem navegador, o gerador
// (src/renderer/src/studio/milk.ts) contra o conversor de verdade (src/main/milk.ts, transpilado aqui):
// os presets do pacote e os .milk do spike 006 voltam iguais depois de passar pelo .milk.
// Depois, a aba: JSON em leitura num preset do pacote; num importado, o .milk editável, que atualiza
// os controles, mostra o erro de conversão em Problemas e vai junto ao salvar.
const H = require('./harness.cjs')
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const R = H.createResults('027-estudio-codigo'); const ok = R.ok
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
const { presetToMilk, milkShaders } = load('src/renderer/src/studio/milk.ts')
const { milkToPreset3 } = load('src/main/milk.ts')
const { splitPreset } = require('milkdrop-preset-utils')
const MILK_DIR = path.join(ROOT, 'spike', '006', 'milk')
const IMPORTED = '_Mig_056'
const SRC = fs.readFileSync(path.join(MILK_DIR, `${IMPORTED}.milk`), 'utf8')
/** As linhas em branco no fim de um bloco não voltam do .milk (o MilkDrop também não as guarda). */
const trimEnds = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'string' && k !== 'warp' && k !== 'comp' ? v.replace(/\s+$/, '') : v)))

async function units() {
  // 0a. Presets do pacote: parâmetros, ondas, formas e equações voltam iguais pelo parser do conversor.
  let n = 0
  const bad = []
  for (const pack of ['base', 'extra', 'md1']) {
    const mod = require(path.join(ROOT, 'node_modules', 'butterchurn-presets', 'dist', `${pack}.min.js`))
    for (const [name, p] of Object.entries(mod.default || mod)) {
      n++
      const q = splitPreset(presetToMilk(p, null))
      const same = (a, b) => Object.entries(a || {}).every(([k, v]) => Math.abs((b[k] ?? NaN) - v) < 1e-5)
      const eq = (a, b) => String(a ?? '').replace(/\s+$/, '') === String(b ?? '').replace(/\s+$/, '')
      const fine =
        same(p.baseVals, q.baseVals) &&
        eq(p.frame_eqs_eel, q.perFrame) && eq(p.init_eqs_eel, q.presetInit) && eq(p.pixel_eqs_eel, q.perVertex) &&
        p.waves.every((w, i) => same(w.baseVals, q.waves[i].baseVals) && eq(w.frame_eqs_eel, q.waves[i].frame_eqs_str) && eq(w.point_eqs_eel, q.waves[i].point_eqs_str) && eq(w.init_eqs_eel, q.waves[i].init_eqs_str)) &&
        p.shapes.every((s, i) => same(s.baseVals, q.shapes[i].baseVals) && eq(s.frame_eqs_eel, q.shapes[i].frame_eqs_str) && eq(s.init_eqs_eel, q.shapes[i].init_eqs_str))
      if (!fine) bad.push(name)
    }
  }
  ok(`0a ${n} presets do pacote voltam iguais pelo .milk (sem shaders)`, n > 300 && bad.length === 0, bad.slice(0, 3).join(' | '))
  const noSh = presetToMilk({ baseVals: { zoom: 1 }, init_eqs_eel: '', frame_eqs_eel: '', pixel_eqs_eel: '', warp: 'x', comp: 'y' }, null)
  ok('0b sem fonte: o .milk sai sem shaders (PSVERSION_WARP=0)', !/^warp_|^comp_/m.test(noSh) && /PSVERSION_WARP=0/.test(noSh) && /^zoom=1\.000000$/m.test(noSh))
  ok('0c nomes do MilkDrop: fDecay, nWaveMode, bDrawThick (onda), thickOutline (forma)',
    /^fDecay=0\.9$/m.test(presetToMilk({ baseVals: { decay: 0.9, wave_mode: 2 }, waves: [{ baseVals: { thick: 1 } }], shapes: [{ baseVals: { thickoutline: 1 } }] }, null)) &&
    /^nWaveMode=2$/m.test(presetToMilk({ baseVals: { wave_mode: 2 } }, null)) &&
    /^wavecode_0_bDrawThick=1$/m.test(presetToMilk({ waves: [{ baseVals: { thick: 1 } }] }, null)) &&
    /^shapecode_0_thickOutline=1$/m.test(presetToMilk({ shapes: [{ baseVals: { thickoutline: 1 } }] }, null)))
  ok('0d milkShaders junta as linhas pela ordem do número e tira a crase', JSON.stringify(milkShaders('a=1\nwarp_2=`  b\nwarp_1=`a\ncomp_1=`x')) === '{"warp":"a\\n  b","comp":"x"}')
  // 0e. Os .milk do spike 006 (com shaders HLSL): .milk → preset → .milk → preset dá o mesmo preset.
  const diff = []
  let m = 0
  for (const f of fs.readdirSync(MILK_DIR).filter((x) => x.endsWith('.milk'))) {
    const src = fs.readFileSync(path.join(MILK_DIR, f), 'utf8')
    const p = await milkToPreset3(src)
    const p2 = await milkToPreset3(presetToMilk(p, milkShaders(src)))
    m++
    if (JSON.stringify(trimEnds(p)) !== JSON.stringify(trimEnds(p2))) diff.push(f)
  }
  ok(`0e ${m} .milk do spike voltam iguais (equações, ondas, formas e os shaders convertidos)`, m >= 10 && diff.length === 0, diff.join(' | '))
}

const srv = H.serve(5248)
;(async () => {
  await units()
  const imported = await milkToPreset3(SRC)
  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await H.mockSo(page, { settings: { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false }, startupPreset: 'last', lastPreset: IMPORTED } })
  // O conversor de verdade no lugar do main (texto entra, preset sai).
  await page.exposeFunction('__convert', async (text) => { try { return { ok: await milkToPreset3(text) } } catch (e) { return { err: e.message } } })
  await page.addInitScript(([name, text, preset]) => {
    window.__mineCalls = []
    let n = 0
    Object.assign(window.so.presets, {
      listImported: async () => [{ name, preset }],
      importedMilk: async (x) => (x === name ? text : null),
      mineMilk: async () => window.__mineCalls.at(-1)?.milk ?? null,
      convertMilk: async (t) => { const r = await window.__convert(t); if ('err' in r) throw new Error(r.err); return { preset: r.ok, ms: 1 } },
      listMine: async () => [],
      saveMine: async (d) => { window.__mineCalls.push(JSON.parse(JSON.stringify(d))); return { id: String(++n).padStart(24, '0'), meta: { ...d.meta, createdAt: new Date().toISOString() } } },
      removeMine: async () => {}
    })
  }, [IMPORTED, SRC, imported])
  await H.mockAudio(page)
  await page.goto('http://localhost:5248/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1000)
  const selected = () => page.$$eval('.studio [role=tab]', es => es.filter(e => e.getAttribute('aria-selected') === 'true').map(e => e.textContent.trim()))
  const status = () => page.$eval('.cstat', e => e.textContent.trim())
  const waitStatus = (re, timeout = 10000) => H.poll(page, (src) => new RegExp(src).test(document.querySelector('.cstat')?.textContent.trim() ?? ''), { timeout, arg: re.source })
  const codeTa = '#studio-tp-code .ed-ta'
  const zoom = () => page.$eval('#studio-p-zoom', e => e.closest('.ctl').querySelector('output').textContent)
  const setZoom = (v) => page.$eval('#studio-p-zoom', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })) }, v)
  const title = () => page.$eval('.now-title', e => e.getAttribute('title'))
  const openStudio = async () => {
    await page.mouse.move(700, 400)
    await page.keyboard.press('e')
    await page.waitForSelector('.studio', { timeout: 5000 })
    await waitStatus(/^Compilado$/)
  }
  const closeStudio = async () => {
    await page.evaluate(() => { document.activeElement?.blur(); document.querySelector('.studio')?.focus() })
    await page.keyboard.press('Escape')
    if (await page.$('.studio')) await page.keyboard.press('Escape')
    await page.waitForSelector('.studio', { state: 'detached', timeout: 5000 })
  }

  ok('1a o importado está tocando', (await title()) === IMPORTED, await title())
  await openStudio()

  // 2. A aba no importado: o .milk, editável, com o HLSL da fonte
  await page.keyboard.press('Control+6')
  const milk0 = await page.inputValue(codeTa)
  ok('2a Ctrl+6 vai para Código .milk', (await selected()).join() === 'Código .milk' && (await page.isVisible('#studio-tp-code')))
  ok('2b texto .milk gerado, com o HLSL da fonte e editável', /^MILKDROP_PRESET_VERSION=201\n/.test(milk0) && milk0.includes('warp_6=`    float2 dither_uv') && /^zoom=1\.031$/m.test(milk0) && !(await page.$eval(codeTa, e => e.readOnly)), milk0.slice(0, 80))
  ok('2c nota do protótipo e nome acessível', /Gerado a partir das outras abas/.test(await page.$eval('#studio-tp-code .note', e => e.textContent)) && (await page.$eval(codeTa, e => e.getAttribute('aria-label'))) === 'Código do preset em formato .milk')
  ok('2d sem o aviso de shaders editados', !(await page.$('.st-code-warn')))

  // 3. Mexer no Básico atualiza o código gerado (critério 1)
  await page.keyboard.press('Control+1')
  await setZoom(1.05)
  await page.keyboard.press('Control+6')
  ok('3a zoom do Básico aparece no .milk', /^zoom=1\.05$/m.test(await page.inputValue(codeTa)))

  // 4. Editar o .milk atualiza os controles e as equações
  const edited = (await page.inputValue(codeTa)).replace(/^zoom=.*$/m, 'zoom=1.234').replace(/^per_frame_1=.*$/m, 'per_frame_1=t = time*2.3; // pelo milk')
  await page.fill(codeTa, edited)
  const applied = await H.poll(page, () => !!window.__logs?.some((l) => l === 'studio: .milk applied'), { timeout: 8000 })
  ok('4a convertido e aplicado', applied && await waitStatus(/^Compilado$/), await status())
  ok('4b o texto digitado fica como está', (await page.inputValue(codeTa)) === edited)
  await page.keyboard.press('Control+1')
  ok('4c Básico mostra o zoom do .milk', (await zoom()) === '1.234', await zoom())
  await page.keyboard.press('Control+2')
  ok('4d per_frame nas Equações com a linha nova', (await page.inputValue('#studio-tp-eq .ed-ta >> nth=1')).startsWith('t = time*2.3; // pelo milk'))

  // 5. Desfazer fora do campo volta antes do .milk
  await page.evaluate(() => { document.activeElement?.blur(); document.querySelector('.studio').focus() })
  await page.waitForTimeout(1100)
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+1')
  ok('5a Ctrl+Z volta o zoom de antes do .milk', (await zoom()) === '1.050', await zoom())
  await page.keyboard.press('Control+Shift+z')
  ok('5b Ctrl+Shift+Z refaz', (await zoom()) === '1.234', await zoom())

  // 6. Um shader HLSL que não converte: problema do .milk, prévia na última válida
  await page.keyboard.press('Control+6')
  const broken = (await page.inputValue(codeTa)).replace(/^warp_3=.*$/m, 'warp_3=`    ret = tex2D( sampler_main, uv ).xyz +* ;; {{')
  await page.fill(codeTa, broken)
  const errd = await waitStatus(/^1 erro$/)
  const msg = await page.$eval('.perr p', e => e.textContent).catch(() => '')
  ok('6a status 1 erro e Problemas com ".milk: o .milk não converteu: … warp"', errd && /^\.milk: o \.milk não converteu: .*warp/.test(msg), `${await status()} · ${msg}`)
  ok('6b o log tem o motivo em inglês', (await page.evaluate(() => window.__logs)).some(l => /^studio: \.milk did not convert: shader warp/.test(l)))
  await page.keyboard.press('Control+1')
  await page.click('.perr .btn')
  ok('6c "Ir para o bloco" volta ao Código com o texto focado', await H.poll(page, () => document.activeElement === document.querySelector('#studio-tp-code .ed-ta'), { timeout: 3000, every: 100 }) && (await selected()).join() === 'Código .milk')
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(600)
  ok('6d com o .milk quebrado, Ctrl+S não salva', (await page.evaluate(() => window.__mineCalls.length)) === 0)
  await page.fill(codeTa, edited)
  ok('6e corrigido, volta a compilar e Problemas esvazia', await waitStatus(/^Compilado$/) && (await page.$eval('.probs .cnt', e => e.textContent)) === '0')

  // 7. GLSL editado na aba Shaders: o .milk avisa que mantém o HLSL anterior
  await page.keyboard.press('Control+5')
  const comp0 = await page.inputValue('#studio-tp-shaders .ed-ta >> nth=1')
  await page.fill('#studio-tp-shaders .ed-ta >> nth=1', comp0.replace(/\}\s*$/, '  ret = ret * 0.95;\n}'))
  await waitStatus(/^Compilado$/)
  await page.keyboard.press('Control+6')
  const milk7 = await page.inputValue(codeTa)
  ok('7a aviso de shaders editados em GLSL', (await page.isVisible('.st-code-warn')) && /HLSL anterior/.test(await page.$eval('.st-code-warn', e => e.textContent)))
  ok('7b o .milk volta ao texto gerado, com o HLSL da fonte e o que veio do .milk', milk7.includes('warp_6=`    float2 dither_uv') && /^zoom=1\.234$/m.test(milk7) && milk7.includes('per_frame_1=t = time*2.3; // pelo milk'))
  await page.screenshot({ path: path.join(ROOT, 'test-results', '027-estudio-codigo.png') }).catch(() => {})

  // 8. Salvar leva o .milk (fonte do meu preset)
  await page.keyboard.press('Control+s')
  await H.poll(page, () => window.__mineCalls.length >= 1, { timeout: 10000 })
  const call = (await page.evaluate(() => window.__mineCalls))[0] || {}
  ok('8a saveMine recebe o .milk gerado (com HLSL) junto do preset', typeof call.milk === 'string' && call.milk.startsWith('MILKDROP_PRESET_VERSION=201') && call.milk.includes('warp_6=`    float2 dither_uv') && /^zoom=1\.234$/m.test(call.milk), String(call.milk).slice(0, 60))
  ok('8b o .milk salvo bate com o preset salvo (mesmas equações)', String(call.preset?.frame_eqs_eel).startsWith('t = time*2.3; // pelo milk') && call.preset?.baseVals?.zoom === 1.234)
  await closeStudio()

  // 9. O meu preset salvo (vindo do .milk): a aba mostra a fonte salva, editável
  const saved = await title()
  await openStudio()
  await page.keyboard.press('Control+6')
  const milk9 = await page.inputValue(codeTa)
  ok('9a meu preset com fonte .milk: o .milk salvo, editável', saved !== IMPORTED && /^zoom=1\.234$/m.test(milk9) && milk9.includes('warp_6=`    float2 dither_uv') && !(await page.$eval(codeTa, e => e.readOnly)), saved)
  ok('9b os shaders salvos (GLSL editado) ainda diferem do HLSL: aviso', await page.isVisible('.st-code-warn'))
  await closeStudio()

  // 10. Preset do pacote: JSON em leitura
  for (let i = 0; i < 6; i++) {
    const cur = await title()
    if (cur !== IMPORTED && cur !== saved) break
    await page.mouse.move(700, 400)
    await page.keyboard.press('ArrowRight')
    await H.poll(page, (x) => document.querySelector('.now-title')?.getAttribute('title') !== x, { timeout: 8000, arg: cur })
  }
  const pack = await title()
  await page.waitForTimeout(800)
  await openStudio()
  await page.keyboard.press('Control+6')
  const json = await page.inputValue(codeTa)
  let parsed = null
  try { parsed = JSON.parse(json) } catch { parsed = null }
  ok('10a preset do pacote: JSON do preset em leitura', pack !== IMPORTED && pack !== saved && !!parsed && typeof parsed.baseVals === 'object' && (await page.$eval(codeTa, e => e.readOnly)), `${pack}: ${json.slice(0, 60)}`)
  ok('10b nota explica que o .milk é para importados', /pacote.*JSON.*importados/.test(await page.$eval('#studio-tp-code .note', e => e.textContent)))
  await page.keyboard.press('Control+1')
  await setZoom(1.07)
  await page.keyboard.press('Control+6')
  let z = null
  try { z = JSON.parse(await page.inputValue(codeTa)).baseVals.zoom } catch { z = null }
  ok('10c o JSON acompanha o Básico', z === 1.07, String(z))

  ok('11a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
