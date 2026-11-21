// Teste headless do detector de preset preto (spec 036, issue #99): a checagem lê uma miniatura
// 64×36 do quadro inteiro (blitFramebuffer + um readPixels), não 9 pontos. Confere que um preset
// escuro de propósito não gera "black preset", que um preto de verdade gera, e que um quadradinho
// aceso fora da grade antiga (20/50/80 %) basta para não ser preto. As leituras da miniatura são
// contadas pelo blitFramebuffer de destino 64×36 (a checagem de fato rodou).
const fs = require('fs')
const path = require('path')
const H = require('./harness.cjs')
const srv = H.serve(5236)
const R = H.createResults('036-preset-preto'); const ok = R.ok

const MARTIN = 'martin - reflections on black tiles'
const base = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'node_modules', 'butterchurn-presets', 'presets', 'converted', `${MARTIN}.json`), 'utf8'))
const BLACK = 'teste 036 - preto'
const SPOT = 'teste 036 - preto com quadradinho'
const black = { ...base, comp: ' shader_body { \n  ret = vec3(0.0);\n }' }
// Quadradinho aceso de ~3 % da tela (17 % × 17 %) no canto, longe dos pontos 20/50/80 % da grade antiga.
const spot = { ...base, comp: ' shader_body { \n  ret = vec3(0.0);\n  if (uv.x > 0.02 && uv.x < 0.19 && uv.y > 0.02 && uv.y < 0.19) ret = vec3(1.0);\n }' }

async function open(b, preset) {
  const page = await b.newPage({ viewport: { width: 800, height: 500 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e)))
  await H.mockSo(page, { settings: { welcomeSeen: true, lastPreset: preset, startupPreset: 'last', rotation: { enabled: false } } })
  await page.addInitScript(([list]) => {
    window.__thumbs = 0
    const blit = WebGL2RenderingContext.prototype.blitFramebuffer
    WebGL2RenderingContext.prototype.blitFramebuffer = function (...a) {
      if (a[6] === 64 && a[7] === 36) window.__thumbs++
      return blit.apply(this, a)
    }
    window.so.presets.listImported = async () => list
  }, [[{ name: BLACK, preset: black }, { name: SPOT, preset: spot }]])
  await H.mockAudio(page)
  await page.goto('http://localhost:5236/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  const t0 = await page.evaluate(() => performance.now())
  return { page, errs, t0 }
}
const blackLogs = (page, name) => page.evaluate((n) => window.__logT.filter(([, m]) => m.startsWith(`black preset: ${n}`)), name)

;(async () => {
  const b = await H.launch()

  // 1. Preset escuro de propósito: a checagem roda (uma leitura) e termina sem log.
  {
    const { page, errs } = await open(b, MARTIN)
    const title = await page.$eval('.now-title', e => e.getAttribute('title'))
    const ran = await H.poll(page, () => window.__thumbs >= 1, { timeout: 15000 })
    await page.waitForTimeout(8000) // janela do critério: 8 s com o áudio simulado tocando
    const logs = await blackLogs(page, MARTIN)
    const thumbs = await page.evaluate(() => window.__thumbs)
    ok('1 escuro de propósito: a checagem rodou e não registrou "black preset" em 8 s', title === MARTIN && ran && logs.length === 0 && thumbs >= 1, `title=${title} ran=${ran} thumbs=${thumbs} logs=${JSON.stringify(logs)}`)
    ok('1b sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  }

  // 2. Preto de verdade (comp = vec3(0.0)): registra; 3 leituras seguidas.
  {
    const { page, errs, t0 } = await open(b, BLACK)
    const got = await H.poll(page, (n) => window.__logs.some(m => m.startsWith(`black preset: ${n}`)), { timeout: 15000, arg: BLACK })
    const logs = await blackLogs(page, BLACK)
    const secs = logs.length ? (logs[0][0] - t0) / 1000 : NaN
    const thumbs = await page.evaluate(() => window.__thumbs)
    // 6 s do critério; o teto de 15 s do poll só cobre o runner do CI com a CPU 6× mais lenta.
    ok('2 preto de verdade registra "black preset" (até 6 s; folga no CI lento)', got && logs.length === 1 && thumbs === 3 && (secs <= 6 || Number(process.env.SO_CPU_THROTTLE) > 1), `got=${got} logs=${logs.length} thumbs=${thumbs} em ${secs.toFixed(1)} s`)
    ok('2b sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  }

  // 3. Preto com um quadradinho aceso fora da grade antiga: não é preto.
  {
    const { page, errs } = await open(b, SPOT)
    const ran = await H.poll(page, () => window.__thumbs >= 1, { timeout: 15000 })
    await page.waitForTimeout(6000)
    const logs = await blackLogs(page, SPOT)
    const thumbs = await page.evaluate(() => window.__thumbs)
    // A grade antiga (9 pontos) veria preto: confere que o quadradinho está mesmo fora dela.
    const grid = await page.evaluate(async () => {
      const c = document.getElementById('canvas'); await new Promise(f => requestAnimationFrame(f))
      const t = document.createElement('canvas'); t.width = c.width; t.height = c.height
      const x = t.getContext('2d'); x.drawImage(c, 0, 0)
      let lit = 0; let gridLit = 0
      const d = x.getImageData(0, 0, c.width, c.height).data
      for (let i = 0; i < d.length; i += 4) if (d[i] > 6 || d[i + 1] > 6 || d[i + 2] > 6) lit++
      for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.2, 0.5, 0.8]) {
        const p = x.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data
        if (p[0] > 6 || p[1] > 6 || p[2] > 6) gridLit++
      }
      return { lit: lit / (c.width * c.height), gridLit }
    })
    ok('3 quadradinho aceso de ~3 % fora da grade antiga: não registra', ran && logs.length === 0 && thumbs === 1 && grid.gridLit === 0 && grid.lit > 0.01 && grid.lit < 0.06, `ran=${ran} thumbs=${thumbs} logs=${logs.length} aceso=${(grid.lit * 100).toFixed(1)} % pontos da grade acesos=${grid.gridLit}`)
    ok('3b sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  }

  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(e => { console.error(e); R.dump(); process.exit(1) })
