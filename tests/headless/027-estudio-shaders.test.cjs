// Teste headless da spec 027, fatia 5 (Estúdio: Shaders). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-shaders.test.cjs`). Vale para estados, teclado, a linha do erro do
// compilador GLSL e o que o motor carregou (impressão digital do texto no HUD); o visual na tela só se
// vê no Windows. Primeiro a conta da linha (src/renderer/src/studio/shader-lines.ts, transpilada aqui).
// Preset: "Martin - liquid arrows" (warp e comp do pacote, já em GLSL).
const H = require('./harness.cjs')
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const R = H.createResults('027-estudio-shaders'); const ok = R.ok

function load(rel) {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = new Module(rel)
  m._compile(js, rel)
  return m.exports
}
/** O mesmo FNV-1a do `fingerprint` de visualizer.ts (o HUD mostra este número). */
const fnv = (text) => {
  if (!text.trim()) return '-'
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}

// ── 0. A conta da linha, sem navegador ───────────────────────
{
  const { glslErrorLine, userShaderLine } = load('src/renderer/src/studio/shader-lines.ts')
  // Monta como o Butterchurn 3: cabeçalho, uniforms, main() em volta do corpo (depois de trim()).
  const build = (text) => {
    const t = text.trim(), sb = t.indexOf('shader_body')
    const head = sb < 0 ? '' : t.slice(0, sb)
    const after = sb < 0 ? '' : t.slice(sb)
    const body = sb < 0 ? t : after.slice(after.indexOf('{') + 1, after.lastIndexOf('}'))
    return `#version 300 es\nprecision highp float;\nuniform float time;\n\n      ${head}\n\n      void main(void) {\n        vec3 ret;\n\n        ${body.replace(/texture2D/g, 'texture')}\n\n        fragColor = vec4(ret, 1.0);\n      }`
  }
  const lineOf = (src, needle) => src.slice(0, src.indexOf(needle)).split('\n').length
  const user = ' shader_body { \n  vec2 a;\n  float2 bad = float2(0.0);\n  ret = texture2D(sampler_main, uv).xyz;\n }'
  const gl = build(user)
  ok('0a erro no corpo volta à linha do texto (3)', userShaderLine(user, gl, lineOf(gl, 'float2 bad')) === 3, String(userShaderLine(user, gl, lineOf(gl, 'float2 bad'))))
  ok('0b corpo com texture2D (o motor troca) ainda acha a linha (4)', userShaderLine(user, gl, lineOf(gl, 'ret = texture(')) === 4)
  ok('0c linha do modelo do motor (fora do texto) = null', userShaderLine(user, gl, lineOf(gl, 'fragColor')) === null && userShaderLine(user, gl, 2) === null)
  const withHead = '\n\nfloat k(float x) { return x2; }\nshader_body {\n  ret = vec3(k(1.0));\n}'
  const gl2 = build(withHead)
  ok('0d cabeçalho antes do shader_body, com 2 linhas em branco no começo (linha 3)', userShaderLine(withHead, gl2, lineOf(gl2, 'return x2')) === 3, String(userShaderLine(withHead, gl2, lineOf(gl2, 'return x2'))))
  ok('0e corpo depois do cabeçalho (linha 5)', userShaderLine(withHead, gl2, lineOf(gl2, 'ret = vec3(k')) === 5)
  const bare = 'ret = vec3(1.0);\nret *= nope;'
  const gl3 = build(bare)
  ok('0f texto sem shader_body: o texto todo é o corpo (linha 2)', userShaderLine(bare, gl3, lineOf(gl3, 'nope')) === 2)
  ok('0g linha do log do compilador', glslErrorLine("ERROR: 0:123: 'float2' : undeclared identifier\nERROR: 0:124: x") === 123 && glslErrorLine('link failed') === null)
}

const srv = H.serve(5233)
;(async () => {
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
  await page.goto('http://localhost:5233/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1000)
  const selected = () => page.$$eval('.studio [role=tab]', es => es.filter(e => e.getAttribute('aria-selected') === 'true').map(e => e.textContent.trim()))
  const status = () => page.$eval('.cstat', e => e.textContent.trim())
  const waitStatus = (re, timeout = 10000) => H.poll(page, (src) => new RegExp(src).test(document.querySelector('.cstat')?.textContent.trim() ?? ''), { timeout, arg: re.source })
  const hudLine = () => page.$eval('#hud', e => e.textContent.split('\n').find(l => l.startsWith('studio: live waves')) || '')
  const live = (which) => hudLine().then(l => (new RegExp(`${which} (\\S+)`).exec(l) || [])[1] || '')
  const warpTa = '#studio-tp-shaders .ed-ta >> nth=0', compTa = '#studio-tp-shaders .ed-ta >> nth=1'

  await page.keyboard.press('Control+Shift+d')
  await page.mouse.move(700, 400)
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 15000 })
  await waitStatus(/^Compilado$/)

  // 1. A aba
  await page.keyboard.press('Control+5')
  ok('1a Ctrl+5 vai para Shaders', (await selected()).join() === 'Shaders' && (await page.isVisible('#studio-tp-shaders')) && !(await page.isVisible('#studio-tp-eq')))
  ok('1b dois editores: warp e comp, com a legenda do protótipo', (await page.$$eval('#studio-tp-shaders .ed-label', es => es.map(e => e.textContent))).join() === 'warpDeforma o quadro anterior,compCompõe a imagem final')
  ok('1c nome acessível dos editores', (await page.$$eval('#studio-tp-shaders .ed-ta', es => es.map(e => e.getAttribute('aria-label')))).join() === 'Shader warp,Shader comp')
  const warp0 = await page.inputValue(warpTa), comp0 = await page.inputValue(compTa)
  ok('1d o GLSL do preset nos editores (editável)', /^ shader_body \{/.test(warp0) && /tmpvar_4/.test(comp0) && !(await page.$eval('#studio-tp-shaders .ed-ta', e => e.readOnly)))
  ok('1e nota: GLSL, sem volta para HLSL', /GLSL.*HLSL/.test(await page.$eval('#studio-tp-shaders .note', e => e.textContent)))
  ok('1f equações sem a lista de shaders só leitura da 026', !(await page.$('.st-shaders')))

  // 2. Editar o comp com GLSL válido: compila e o motor carrega o texto novo
  const compOk = comp0.replace(/\n \}\s*$/, '\n  ret = ret * 0.95;\n }')
  await page.fill(compTa, compOk)
  const compiled = await waitStatus(/^Compilado$/)
  const loaded = await H.poll(page, (want) => (document.getElementById('hud').textContent.match(/ · comp (\S+)/) || [])[1] === want, { timeout: 8000, arg: fnv(compOk) })
  ok('2a comp válido compila e o motor fica com ele (impressão digital no HUD)', compiled && loaded, `${await status()} · ${await hudLine()} · esperado ${fnv(compOk)}`)
  ok('2b o warp no motor segue o do preset', (await live('warp')) === fnv(warp0), `motor ${await live('warp')} · preset ${fnv(warp0)}`)
  await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', '027-estudio-shaders.png') }).catch(() => {})

  // 3. Critério 5: um float2 (HLSL) no comp → mensagem do compilador GLSL, linha certa, prévia na última válida
  const lines = compOk.split('\n'); lines.splice(2, 0, '  float2 bad = float2(0.0, 0.0);')
  const compBad = lines.join('\n')
  await page.fill(compTa, compBad)
  const errd = await waitStatus(/^1 erro$/)
  const msg = await page.$eval('.perr p', e => e.textContent).catch(() => '')
  ok('3a erro no bloco comp, linha 3, com a mensagem do compilador GLSL', errd && /^comp, linha 3: compilador GLSL: \S/.test(msg), `${await status()} · ${msg}`)
  ok('3b linha 3 marcada no editor do comp', (await page.$eval('#studio-tp-shaders .ed-block:nth-of-type(2) .ed-gut', e => [...e.children].findIndex(c => c.classList.contains('err')) + 1)) === 3)
  ok('3c prévia segue na última versão válida (selo + motor com o comp anterior)', (await page.isVisible('.chip.tr.warn')) && (await live('comp')) === fnv(compOk))
  ok('3d o log tem o erro em inglês', (await page.evaluate(() => window.__logs)).some(l => /studio: error in comp, line 3: GLSL compiler: /.test(l)))

  // 4. "Ir para a linha" de outra aba volta aos Shaders, no comp, com a linha selecionada
  await page.keyboard.press('Control+1')
  await page.click('.perr .btn')
  const focused = await H.poll(page, () => document.activeElement === document.querySelectorAll('#studio-tp-shaders .ed-ta')[1], { timeout: 3000, every: 100 })
  const sel = await page.$eval('#studio-tp-shaders .ed-block:nth-of-type(2) .ed-ta', e => e.value.slice(e.selectionStart, e.selectionEnd))
  ok('4a "Ir para a linha" abre Shaders com o comp focado na linha 3', focused && (await selected()).join() === 'Shaders' && sel === '  float2 bad = float2(0.0, 0.0);', `foco=${focused} aba=${await selected()} sel=${sel}`)

  // 5. Desfazer fora do campo volta o comp (o editor inteiro, como nas outras abas)
  await page.fill(compTa, compOk)
  ok('5a corrigido, volta a compilar', await waitStatus(/^Compilado$/))
  await page.evaluate(() => document.activeElement?.blur())
  await page.waitForTimeout(1100)
  await page.keyboard.press('Control+z')
  ok('5b Ctrl+Z volta o comp com o erro', (await page.inputValue(compTa)) === compBad)
  await page.keyboard.press('Control+Shift+z')
  ok('5c Ctrl+Shift+Z refaz', (await page.inputValue(compTa)) === compOk && await waitStatus(/^Compilado$/))

  // 6. Erro no warp: o bloco warp, na linha dele
  const wl = warp0.split('\n'); wl.splice(3, 0, '  vec3 nope = undefinedThing;')
  await page.fill(warpTa, wl.join('\n'))
  await waitStatus(/^1 erro$/)
  const wmsg = await page.$eval('.perr p', e => e.textContent).catch(() => '')
  ok('6a erro no warp, linha 4', /^warp, linha 4: compilador GLSL: /.test(wmsg), wmsg)
  await page.fill(warpTa, warp0)
  ok('6b warp de volta compila', await waitStatus(/^Compilado$/))

  // 7. Salvar leva o comp editado e o warp do preset
  await page.keyboard.press('Control+s')
  await H.poll(page, () => (window.__mineCalls || []).length >= 1, { timeout: 10000 })
  const p = ((await page.evaluate(() => window.__mineCalls))[0] || {}).preset || {}
  ok('7a salvo com o comp novo e o warp do preset', p.comp === compOk && p.warp === warp0, `${String(p.comp).slice(-40)} · ${String(p.warp).slice(0, 30)}`)

  // 8. Fim
  ok('8a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
