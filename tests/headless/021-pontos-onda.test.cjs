// Teste headless da correção da onda em pontos (relato de 2026-11-10, PR #80): o vertex shader da
// onda principal do Butterchurn 3 não escreve gl_PointSize, e no Windows (ANGLE/Direct3D) os
// pontos somem. O SwiftShader da nuvem já desenha 1 px, então aqui se confere a correção no texto
// do shader (src/renderer/src/engine-fixes.ts, fixPointSize), não a imagem. A imagem só no Windows.
const H = require('./harness.cjs')
const srv = H.serve(5221)
const R = H.createResults('021-pontos-onda'); const ok = R.ok
;(async () => {
  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 800, height: 500 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e)))
  await H.mockSo(page, { settings: { welcomeSeen: true, lastPreset: 'Rovastar + Geiss - Hyperspace - kaleidoscope', startupPreset: 'last', rotation: { enabled: false } } })
  await H.mockAudio(page)
  await page.goto('http://localhost:5221/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1500)
  const r = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')
    const src = (type, text) => { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); return [gl.getShaderSource(s), gl.getShaderParameter(s, gl.COMPILE_STATUS)] }
    // O mesmo vertex shader da BasicWaveform do Butterchurn 3.0.0-beta.5.
    const wave = src(gl.VERTEX_SHADER, '#version 300 es\n      in vec3 aPos;\n      uniform vec2 thickOffset;\n      void main(void) {\n        gl_Position = vec4(aPos + vec3(thickOffset, 0.0), 1.0);\n      }')
    const already = src(gl.VERTEX_SHADER, '#version 300 es\nuniform float uSize;\nin vec3 aPos;\nvoid main(void) {\n  gl_PointSize = uSize;\n  gl_Position = vec4(aPos, 1.0);\n}')
    const frag = src(gl.FRAGMENT_SHADER, '#version 300 es\nprecision mediump float;\nout vec4 c;\nvoid main(void) {\n  c = vec4(1.0);\n}')
    return { wave, already, frag }
  })
  ok('1 onda principal: vertex shader passa a escrever gl_PointSize = 1.0 e compila', /gl_PointSize = 1\.0;/.test(r.wave[0]) && r.wave[1] === true, r.wave[0].replace(/\s+/g, ' '))
  ok('2 shader que já escreve gl_PointSize não muda', (r.already[0].match(/gl_PointSize/g) || []).length === 1 && r.already[1] === true)
  ok('3 fragment shader não muda', !/gl_PointSize/.test(r.frag[0]) && r.frag[1] === true)
  ok('4 o preset desenha (não fica preto no headless)', await page.evaluate(async () => { const c = document.getElementById('canvas'); await new Promise(f => requestAnimationFrame(f)); const t = document.createElement('canvas'); t.width = 40; t.height = 25; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 40, 25); const d = x.getImageData(0, 0, 40, 25).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) > 10 }))
  ok('5 sem erros na página', errs.length === 0, errs.join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(e => { console.error(e); R.dump(); process.exit(1) })
