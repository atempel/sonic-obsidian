// Teste headless da spec 027, fatia 10 (Estúdio: verificador próprio). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-verificador.test.cjs`). Primeiro, sem navegador, o verificador
// (src/renderer/src/studio/lint.ts, transpilado aqui, com o parser do eel-wasm de verdade): casos montados e os
// ~380 presets do pacote (todo aviso de variável tem de ser uma variável que nenhum bloco atribui).
// Depois, a interface: aviso amarelo que não bloqueia (critério 8), "Corrigir", desfazer, a sugestão de
// função no erro do compilador e os avisos de shader. Preset: "Martin - liquid arrows" (sem avisos).
const H = require('./harness.cjs')
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const R = H.createResults('027-estudio-verificador'); const ok = R.ok
const ROOT = path.join(__dirname, '..', '..')

globalThis.self = globalThis // os pacotes UMD do butterchurn-presets esperam `self`
function load(rel) {
  const f = path.join(ROOT, rel)
  const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const m = new Module(f)
  m.filename = f
  m.paths = Module._nodeModulePaths(path.dirname(f))
  const req = m.require.bind(m)
  // eel-wasm é ESM sem "exports": o arquivo direto (require de ESM, Node ≥ 22.12).
  m.require = (x) => (x === 'eel-wasm' ? req(path.join(ROOT, 'node_modules', 'eel-wasm', 'dist', 'index.js')) : x.startsWith('./') ? load(path.join(path.dirname(rel), `${x}.ts`)) : req(x))
  m._compile(js, f)
  return m.exports
}

function units() {
  const { lint, applyFix, suggestFunction } = load('src/renderer/src/studio/lint.ts')
  const { slotsOf } = load('src/renderer/src/studio/slots.ts')
  const empty = { init: '', frame: '', pixel: '', warp: '', comp: '' }
  const run = (code, preset = {}) => lint({ code: { ...empty, ...code }, slots: slotsOf(preset), base: preset.baseVals || {} })

  const w = run({ frame: 'wave_r = 0.5;\nzoom = 1.01 + 0.04*bas_att;' })
  ok('0a bas_att: aviso no per_frame, linha 2, "bass_att" sugerido com o Corrigir',
    w.length === 1 && w[0].block === 'frame' && w[0].line === 2 && w[0].issue.kind === 'unknownVar' && w[0].issue.name === 'bas_att' && w[0].issue.suggest === 'bass_att' && w[0].fix?.to === 'bass_att', JSON.stringify(w))
  ok('0b variável do usuário (atribuída no init) e lida no per_frame/per_pixel: sem aviso',
    run({ init: 'speed = 2;', frame: 'rot = rot + speed*0.01;', pixel: 'zoom = zoom + 0.01*speed*rad;' }).length === 0)
  ok('0c q1…, t1…, reg00…, variáveis do motor e do baseVals: sem aviso',
    run({ frame: 'q5 = t3 + reg07 + bass + time + fps + progress;\nmyparam2 = 1;\nwarp = mv_a + myparam;' }, { baseVals: { myparam: 1 } }).length === 0)
  ok('0d o mesmo nome desconhecido aparece uma vez por bloco; comentário não conta',
    run({ frame: '// bas_att aqui é comentário\nzoom = foo;\nrot = foo;' }).filter((x) => x.issue.name === 'foo').length === 1 && !run({ frame: '// bas_att\n/* bas_att */ zoom = 1;' }).length)
  ok('0e bloco que não parseia: o erro é do compilador, sem avisos', run({ frame: 'zoom = bas_att +;' }).length === 0)
  ok('0f maiúsculas não importam (o EEL não diferencia)', run({ frame: 'Zoom = BASS_ATT * Wave_R;' }).length === 0)
  const waves = { waves: [{ baseVals: { enabled: 1 }, frame_eqs_eel: 'r = bas;', point_eqs_eel: 'x = sample + xx;' }, { baseVals: { enabled: 0 }, frame_eqs_eel: 'r = nope;' }] }
  const ww = run({}, waves)
  ok('0g onda ligada: avisos no bloco dela (frame e point); desligada (só leitura): nenhum',
    ww.length === 2 && ww[0].block === 'wave0_frame' && ww[0].issue.suggest === 'bass' && ww[1].block === 'wave0_point' && ww[1].issue.name === 'xx', JSON.stringify(ww))
  ok('0h variável atribuída numa onda conta no per_frame (o aviso não pode errar para mais)',
    run({ frame: 'zoom = 1 + shared;' }, { waves: [{ baseVals: { enabled: 1 }, init_eqs_eel: 'shared = 0.1;' }] }).length === 0)

  const sh = run({ comp: ' shader_body {\n  ret = tex2D(sampler_main, uv).xyz;\n }', warp: ' shader_body {\n  ret = vec3(0.0);\n // }\n' })
  ok('0i shader: tex2D → aviso com Corrigir para texture; chave sem fechar (a do comentário não conta) na última linha com texto',
    sh.length === 2 && sh[0].block === 'warp' && sh[0].issue.kind === 'braces' && !sh[0].issue.extra && sh[0].line === 3 &&
    sh[1].block === 'comp' && sh[1].issue.kind === 'tex2d' && sh[1].line === 2 && sh[1].fix?.to === 'texture', JSON.stringify(sh))
  const extra = run({ comp: ' shader_body {\n  ret = vec3(1.0);\n }\n}' })
  ok('0j shader: "}" sobrando, na linha dela', extra.length === 1 && extra[0].issue.extra && extra[0].line === 4, JSON.stringify(extra))
  ok('0k sugestão de função: sinn → sin, sqrtt → sqrt, nada parecido → null', suggestFunction('sinn') === 'sin' && suggestFunction('sqrtt') === 'sqrt' && suggestFunction('frobnicate') === null)
  ok('0l applyFix troca só a palavra inteira, só na linha, sem diferenciar maiúsculas',
    applyFix('a = bas_att;\nb = BAS_ATT + bas_att2 + x.bas_att;', 2, 'bas_att', 'bass_att') === 'a = bas_att;\nb = bass_att + bas_att2 + x.bas_att;')

  // Os presets do pacote: todo aviso de variável é verdadeiro (nenhum bloco atribui o nome); shaders sem aviso.
  let n = 0, withW = 0
  const wrong = []
  for (const pack of ['base', 'extra', 'md1']) {
    const mod = require(path.join(ROOT, 'node_modules', 'butterchurn-presets', 'dist', `${pack}.min.js`))
    for (const [name, p] of Object.entries(mod.default || mod)) {
      n++
      const r = run({ init: p.init_eqs_eel || '', frame: p.frame_eqs_eel || '', pixel: p.pixel_eqs_eel || '', warp: p.warp || '', comp: p.comp || '' }, p)
      if (r.length) withW++
      const all = [p.init_eqs_eel, p.frame_eqs_eel, p.pixel_eqs_eel, ...(p.waves || []).flatMap((x) => [x.init_eqs_eel, x.frame_eqs_eel, x.point_eqs_eel]), ...(p.shapes || []).flatMap((x) => [x.init_eqs_eel, x.frame_eqs_eel])].join('\n').toLowerCase().replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
      for (const x of r) {
        if (x.issue.kind !== 'unknownVar') { wrong.push(`${name}: ${x.issue.kind}`); continue }
        const v = x.issue.name.replace(/[.]/g, '\\.')
        if (new RegExp(`(?<![\\w.])${v}\\s*[-+*/%]?=(?!=)`).test(all) || new RegExp(`assign\\(\\s*${v}\\b`).test(all)) wrong.push(`${name}: ${x.issue.name}`)
      }
    }
  }
  ok(`0m ${n} presets do pacote: nenhum aviso falso (${withW} com variável lida sem valor, como no original)`, n > 300 && wrong.length === 0, wrong.slice(0, 4).join(' | '))
  const geiss = run((() => { const p = (require(path.join(ROOT, 'node_modules', 'butterchurn-presets', 'dist', 'base.min.js')).default || {})['Geiss - Spiral Artifact']; return p ? { frame: p.frame_eqs_eel, init: p.init_eqs_eel, pixel: p.pixel_eqs_eel } : {} })())
  ok('0n achado real: "Geiss - Spiral Artifact" lê rot_sim (sugere rot_sum)', geiss.some((x) => x.issue.name === 'rot_sim' && x.issue.suggest === 'rot_sum'), JSON.stringify(geiss))
}

const srv = H.serve(5252)
;(async () => {
  units()
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
  await page.goto('http://localhost:5252/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1000)
  const status = () => page.$eval('.cstat', e => e.textContent.trim())
  const waitStatus = (re, timeout = 10000) => H.poll(page, (src) => new RegExp(src).test(document.querySelector('.cstat')?.textContent.trim() ?? ''), { timeout, arg: re.source })
  const probs = () => page.$$eval('.perr', es => es.map(e => ({ warn: e.classList.contains('pwarn'), text: e.querySelector('p').textContent.replace(/\s+/g, ' ').trim(), fix: !!e.querySelector('.st-fix') })))
  const cnt = () => page.$eval('.probs-h .cnt', e => `${e.textContent}:${e.className}`)
  const frameTa = '#studio-tp-eq .ed-ta >> nth=1'
  const compTa = '#studio-tp-shaders .ed-ta >> nth=1'

  await page.keyboard.press('Control+Shift+d')
  await page.mouse.move(700, 400)
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 5000 })
  await waitStatus(/^Compilado$/)
  ok('1a preset do pacote sem avisos: Problemas vazio', (await probs()).length === 0 && (await cnt()) === '0:cnt', await cnt())

  // 2. Critério 8: bas_att no per_frame → aviso (não erro), com Corrigir; o preset continua compilando
  await page.keyboard.press('Control+2')
  const frame0 = await page.inputValue(frameTa)
  const bad = `zoom = 1.01 + 0.04*bas_att;\n${frame0}`
  await page.fill(frameTa, bad)
  await waitStatus(/^Compilado$/)
  await H.poll(page, () => document.querySelectorAll('.perr.pwarn').length === 1, { timeout: 5000 })
  const p2 = await probs()
  ok('2a um aviso (não erro): "Aviso per_frame, linha 1: Variável desconhecida bas_att… Você quis dizer bass_att?"',
    p2.length === 1 && p2[0].warn && /^Aviso per_frame, linha 1: Variável desconhecida bas_att: .*vale sempre 0\. Você quis dizer bass_att\?$/.test(p2[0].text) && p2[0].fix, JSON.stringify(p2))
  ok('2b status "Compilado", sem o selo de última versão válida; contador 1 em amarelo de aviso', (await status()) === 'Compilado' && !(await page.isVisible('.chip.tr.warn')) && (await cnt()) === '1:cnt warn', `${await status()} ${await cnt()}`)
  ok('2c linha 1 marcada como aviso no editor do per_frame', (await page.$eval('#studio-tp-eq .ed-block:nth-of-type(2) .ed-gut', e => [...e.children].findIndex(c => c.classList.contains('warn')) + 1)) === 1)
  ok('2d o log tem o aviso em inglês', (await page.evaluate(() => window.__logs)).some(l => /studio: warning in per_frame, line 1: Unknown variable bas_att: .* Did you mean bass_att\?/.test(l)))

  // 3. Corrigir: troca na linha, toast, o aviso some
  await page.click('.perr.pwarn .st-fix')
  const fixed = await page.inputValue(frameTa)
  ok('3a "Corrigir" troca bas_att por bass_att só na linha 1', fixed === `zoom = 1.01 + 0.04*bass_att;\n${frame0}`, fixed.split('\n')[0])
  ok('3b toast "Corrigido: bas_att → bass_att"', await H.poll(page, () => /Corrigido: bas_att → bass_att/.test(document.body.textContent), { timeout: 3000, every: 100 }))
  ok('3c compila sem avisos', (await waitStatus(/^Compilado$/)) && (await H.poll(page, () => !document.querySelector('.perr'), { timeout: 5000 })) && (await cnt()) === '0:cnt')
  // O Corrigir entra no desfazer (fora do campo, Ctrl+Z é o do editor).
  await page.evaluate(() => document.activeElement?.blur())
  await page.waitForTimeout(1100)
  await page.keyboard.press('Control+z')
  ok('3d Ctrl+Z volta o bas_att (e o aviso)', (await page.inputValue(frameTa)) === bad && (await H.poll(page, () => document.querySelectorAll('.perr.pwarn').length === 1, { timeout: 5000 })))
  await page.keyboard.press('Control+Shift+z')
  ok('3e Ctrl+Shift+Z refaz a correção', (await page.inputValue(frameTa)) === fixed)

  // 4. Salvar com aviso: o aviso não bloqueia
  await page.fill(frameTa, bad)
  await waitStatus(/^Compilado$/)
  await page.keyboard.press('Control+s')
  ok('4a salvar com aviso grava (o aviso não bloqueia)', await H.poll(page, () => (window.__mineCalls || []).length === 1, { timeout: 8000 }))
  ok('4b o motor ficou com a versão do aviso (sem selo de erro)', !(await page.isVisible('.chip.tr.warn')) && (await status()) === 'Compilado')

  // 5. Função desconhecida: erro do compilador, com a sugestão e o Corrigir
  await page.fill(frameTa, `zoom = 1.01 + 0.01*sinn(time);\n${frame0}`)
  await waitStatus(/^1 erro$/)
  const p5 = await probs()
  ok('5a erro "A função sinn() não existe. Você quis dizer sin?" com Corrigir', p5.length === 1 && !p5[0].warn && /per_frame, linha 1: A função sinn\(\) não existe\. Você quis dizer sin\?/.test(p5[0].text) && p5[0].fix, JSON.stringify(p5))
  await page.click('.perr .st-fix')
  ok('5b Corrigir → sin, volta a compilar', (await page.inputValue(frameTa)).startsWith('zoom = 1.01 + 0.01*sin(time);') && await waitStatus(/^Compilado$/))
  await page.fill(frameTa, frame0)
  await waitStatus(/^Compilado$/)

  // 6. Shaders: tex2D (do HLSL) no comp → erro do GLSL + aviso com Corrigir para texture
  await page.keyboard.press('Control+5')
  const comp0 = await page.inputValue(compTa)
  const compBad = comp0.replace(/texture\s*\(/, 'tex2D(')
  await page.fill(compTa, compBad)
  await waitStatus(/^1 erro$/)
  await H.poll(page, () => document.querySelectorAll('.perr.pwarn').length === 1, { timeout: 5000 })
  const p6 = await probs()
  const w6 = p6.find(x => x.warn)
  ok('6a aviso "tex2D não existe no GLSL; use texture." no comp, junto com o erro do compilador', compBad !== comp0 && !!w6 && /^Aviso comp, linha \d+: tex2D não existe no GLSL; use texture\.$/.test(w6.text) && p6.some(x => !x.warn), JSON.stringify(p6))
  await page.click('.perr.pwarn .st-fix')
  ok('6b Corrigir volta a texture e compila', (await page.inputValue(compTa)) === comp0.replace(/texture\s*\(/, 'texture(') && await waitStatus(/^Compilado$/))
  // Chave sem fechar: aviso com a linha (o compilador GLSL também recusa).
  await page.fill(compTa, comp0.replace(/\}\s*$/, ''))
  await waitStatus(/^1 erro$/)
  ok('6c chave sem fechar: aviso "As chaves { } não fecham."', await H.poll(page, () => [...document.querySelectorAll('.perr.pwarn p')].some(p => /comp, linha \d+: As chaves \{ \} não fecham\./.test(p.textContent)), { timeout: 5000 }))
  await page.fill(compTa, comp0)
  ok('6d comp de volta compila sem avisos', (await waitStatus(/^Compilado$/)) && (await H.poll(page, () => !document.querySelector('.perr'), { timeout: 5000 })))

  // 7. Captura com o aviso na tela (para conferir o layout)
  await page.keyboard.press('Control+2')
  await page.fill(frameTa, bad)
  await H.poll(page, () => document.querySelectorAll('.perr.pwarn').length === 1, { timeout: 5000 })
  await page.screenshot({ path: path.join(ROOT, 'test-results', '027-estudio-verificador.png') }).catch(() => {})

  ok('8a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
