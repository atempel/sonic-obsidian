#!/usr/bin/env node
// Capturas reais do app para a ficha da Microsoft Store (ver store/README.md).
//
// Abre o renderer compilado (`npm run build` → out/renderer) no Chromium do Playwright com o mesmo
// window.so simulado dos testes headless e uma faixa sintetizada aqui (music.cjs) no lugar do áudio
// do sistema: os presets reagem de verdade, sem música de terceiros. Sem cursor, sem bordas: a página
// ocupa a janela inteira, como o app sem moldura.
//
//   node scripts/store-capture/capture.cjs sweep  [--presets lista.json] [--out store/raw/sweep]
//       Um quadro pequeno (640×360) de cada preset da lista (ou de todos) e um contato.html, para escolher.
//   node scripts/store-capture/capture.cjs frames [--presets store/presets.json] [--scale 2] [--frames 6]
//       Para cada preset: aquecimento, N quadros em picos (drop, logo depois do bumbo) e 2 no respiro.
//   node scripts/store-capture/capture.cjs screens [--lang en|pt-BR] [--scale 2] [--preset "nome"]
//       Palco limpo, Palco com a faixa, Biblioteca, Ajustes rápidos, Configurações (Áudio e Geral), Estúdio.
//
// --scale 2 = 3840×2160 (janela 1920×1080 a 200 %, como um monitor 4K no Windows); --scale 1 = 1920×1080.
// Na nuvem o WebGL é por software (SwiftShader): ~1 quadro/s em 4K, por isso o aquecimento é longo
// (--warm em segundos). No Windows com GPU tudo anda a 60 fps e os mesmos comandos servem.
const path = require('path'), fs = require('fs')
const h = require('../../tests/headless/harness.cjs')
const music = require('./music.cjs')

const ROOT = path.join(__dirname, '..', '..')
const args = process.argv.slice(2)
const mode = args[0]
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d }
const scale = Number(opt('scale', 2))
const PORT = Number(opt('port', 5191))
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const sizeName = (s) => (s === 2 ? '3840x2160' : s === 1 ? '1920x1080' : `${1920 * s}x${1080 * s}`)

if (!fs.existsSync(path.join(ROOT, 'out', 'renderer', 'index.html'))) {
  console.error('Falta o build: rode `npm run build` antes.'); process.exit(1)
}

function settingsFor(preset, { clean = true } = {}) {
  return {
    welcomeSeen: true,
    startupPreset: 'last',
    lastPreset: preset || null,
    rotation: { enabled: false },
    overlayText: { presetName: clean ? 'never' : 'always', trackTitle: false, toasts: 'none', clean }
  }
}

async function openApp(browser, { preset, lang = 'en', viewport = { width: 1920, height: 1080 }, dsf = scale, clean = true, library } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: dsf })
  let startup = ''
  page.on('console', (m) => { const t = m.text(); if (t.startsWith('[startup] first preset')) startup = t })
  await h.mockSo(page, { settings: settingsFor(preset, { clean }), systemLanguage: lang, logs: false, library })
  await page.addInitScript((v) => { window.so.app.version = async () => v }, version)
  await page.addInitScript(music)
  await page.goto(`http://localhost:${PORT}/`)
  await page.waitForFunction(() => typeof window.__energy === 'function', null, { timeout: 60000 })
  if (preset) {
    for (let i = 0; i < 40 && !startup; i++) await page.waitForTimeout(250)
    if (!/last used/.test(startup)) { await page.close(); throw new Error(`"${preset}" não abriu (${startup || 'sem log'}): confira o nome`) }
  }
  return page
}

/** Espera um pico: drop, até 120 ms depois do bumbo e energia alta. */
async function waitPeak(page, section = 'drop', timeout = 30000) {
  const fn = section === 'drop'
    ? () => { const p = window.__songPos(); return p.section === 'drop' && p.sinceKick < 120 && window.__energy() > 0.45 }
    : () => window.__songPos().section === 'break'
  await h.poll(page, fn, { timeout, every: 15 })
  return page.evaluate(() => ({ energy: +window.__energy().toFixed(3), ...window.__songPos() }))
}

function readPresets(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'))
  return (Array.isArray(j) ? j : j.presets).map((p) => (typeof p === 'string' ? p : p.name))
}

async function sweep(browser) {
  const out = path.resolve(opt('out', path.join(ROOT, 'store', 'raw', 'sweep')))
  fs.mkdirSync(out, { recursive: true })
  const list = opt('presets') ? readPresets(opt('presets')) : fs.readdirSync(path.join(ROOT, 'node_modules', 'butterchurn-presets', 'presets', 'converted')).map((f) => f.replace(/\.json$/, ''))
  const warm = Number(opt('warm', 12)) * 1000
  const par = Number(opt('parallel', 3))
  const done = []
  let i = 0
  async function worker() {
    while (i < list.length) {
      const name = list[i++]
      const file = `${slug(name)}.png`
      if (fs.existsSync(path.join(out, file))) continue
      let page = null
      const job = (async () => {
        page = await openApp(browser, { preset: name, viewport: { width: 640, height: 360 }, dsf: 1 })
        await page.evaluate(() => window.__seek(4))
        await page.waitForTimeout(warm)
        const at = await waitPeak(page)
        await page.screenshot({ path: path.join(out, file), timeout: 30000 })
        done.push({ name, file, ...at })
      })()
      const limit = new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), warm + 60000))
      try { await Promise.race([job, limit]) } catch (e) { console.warn(`\n  ! pulado: ${name} (${e.message})`) }
      process.stdout.write(`\r${i}/${list.length}`)
      if (page) await page.close().catch(() => {})
    }
  }
  await Promise.all(Array.from({ length: par }, worker))
  done.sort((a, b) => a.name.localeCompare(b.name))
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(done, null, 2))
  fs.writeFileSync(path.join(out, 'contato.html'), `<!doctype html><meta charset=utf-8><title>Sweep</title><style>body{background:#0b0a10;color:#ddd;font:12px system-ui;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:8px;padding:8px}figure{margin:0}img{width:100%;display:block}</style>${done.map((d) => `<figure><img src="${d.file}"><figcaption>${d.name.replace(/</g, '&lt;')}</figcaption></figure>`).join('')}`)
  console.log(`\n${done.length} quadros em ${out}`)
}

async function frames(browser) {
  const list = readPresets(opt('presets', path.join(ROOT, 'store', 'presets.json')))
  const n = Number(opt('frames', 6))
  const warm = Number(opt('warm', scale >= 2 ? 70 : 30)) * 1000
  const out = path.join(ROOT, 'store', 'raw', sizeName(scale), 'presets')
  fs.mkdirSync(out, { recursive: true })
  const manifestFile = path.join(out, 'manifest.json')
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {}
  for (const name of list) {
    console.log(`• ${name}`)
    const page = await openApp(browser, { preset: name })
    await page.evaluate(() => window.__seek(4))
    await page.waitForTimeout(warm)
    const shots = []
    for (let k = 0; k < n; k++) {
      const at = await waitPeak(page, 'drop', 60000)
      const file = `${slug(name)}-peak-${k + 1}.png`
      await page.screenshot({ path: path.join(out, file) }); shots.push({ file, kind: 'peak', ...at })
      console.log(`  ${file} energia ${at.energy} compasso ${at.bar}`)
      await page.waitForTimeout(scale >= 2 ? 1500 : 800)
    }
    for (let k = 0; k < 2; k++) {
      const at = await waitPeak(page, 'break', 60000)
      const file = `${slug(name)}-calm-${k + 1}.png`
      await page.screenshot({ path: path.join(out, file) }); shots.push({ file, kind: 'calm', ...at })
      console.log(`  ${file} energia ${at.energy} compasso ${at.bar}`)
      await page.waitForTimeout(2500)
    }
    manifest[name] = shots
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))
    await page.close()
  }
}

async function screens(browser) {
  const lang = opt('lang', 'en')
  const preset = opt('preset', readPresets(path.join(ROOT, 'store', 'presets.json'))[0])
  const warm = Number(opt('warm', scale >= 2 ? 50 : 20)) * 1000
  const out = path.join(ROOT, 'store', 'raw', sizeName(scale), 'screens', lang)
  fs.mkdirSync(out, { recursive: true })
  // Biblioteca com alguns favoritos e uma coleção, como alguém que já usa o app.
  const favs = readPresets(path.join(ROOT, 'store', 'presets.json')).slice(0, 4)
  const library = { version: 1, favorites: favs, hidden: [], hiddenPerf: [], recents: favs.slice().reverse(), presetFps: {}, collections: [{ id: 'c1', name: lang === 'en' ? 'Late night' : 'Madrugada', presets: favs, intervalSeconds: 30 }] }
  const page = await openApp(browser, { preset, lang, clean: false, library })
  await page.evaluate(() => window.__seek(4))
  await page.waitForTimeout(warm)
  const shot = async (name) => { await page.screenshot({ path: path.join(out, `${name}.png`) }); console.log(`  ${lang}/${name}.png`) }
  const wake = async () => { await page.mouse.move(960, 1000); await page.mouse.move(962, 1010); await page.waitForTimeout(scale >= 2 ? 2500 : 900) }
  const esc = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(scale >= 2 ? 3000 : 1000) }
  const settle = scale >= 2 ? 6000 : 2500

  // Palco limpo: T liga o Modo limpo, sem faixa nem nome.
  await page.mouse.move(1919, 0); await page.waitForTimeout(3500)
  await page.keyboard.press('t'); await page.waitForTimeout(settle); await waitPeak(page); await shot('palco-limpo')
  await page.keyboard.press('t'); await page.waitForTimeout(settle)
  // Daqui em diante o mouse "mexe" a cada 400 ms: a faixa some com 2,5 s parado e um quadro 4K demora mais que isso.
  await page.evaluate(() => setInterval(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 960, clientY: 1000 })), 400))
  await wake(); await shot('palco-faixa')
  await page.keyboard.press('l'); await page.waitForTimeout(settle); await shot('biblioteca'); await esc()
  await page.keyboard.press(','); await page.waitForTimeout(settle); await shot('ajustes-rapidos'); await esc()
  await page.keyboard.press('Control+Comma'); await page.waitForTimeout(settle); await shot('configuracoes')
  for (const sec of ['captura', 'visual']) {
    const tab = page.locator(`[data-sec="${sec}"]`).first()
    if (await tab.count()) { await tab.click().catch(() => {}); await page.waitForTimeout(settle); await shot(`configuracoes-${sec}`) }
  }
  await esc()
  await page.keyboard.press('e'); await page.waitForTimeout(settle * 2); await shot('estudio'); await esc()
  await page.close()
}

;(async () => {
  if (!['sweep', 'frames', 'screens'].includes(mode)) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 20).join('\n')); process.exit(1) }
  const srv = h.serve(PORT)
  const browser = await h.launch()
  try {
    if (mode === 'sweep') await sweep(browser)
    if (mode === 'frames') await frames(browser)
    if (mode === 'screens') await screens(browser)
  } finally { await browser.close(); srv.close() }
})().catch((e) => { console.error(e); process.exit(1) })
