#!/usr/bin/env node
// Composição das imagens da ficha da Microsoft Store (ver store/README.md).
// Lê store/compose.json (quais capturas cruas de store/raw/ entram em cada imagem) e
// store/copy.json (textos em en e pt-BR), monta cada imagem em HTML/CSS com os tokens da
// interface (src/renderer/src/ui/theme.css) e renderiza no Chromium do Playwright.
// Por cima da captura só entram texto, marca e moldura.
//
//   node scripts/store-capture/compose.cjs            → store/listing/{en,pt-BR}/*.png (3840×2160 e 1920×1080)
//   node scripts/store-capture/compose.cjs logos      → store/listing/logos/*.png
//   node scripts/store-capture/compose.cjs preview    → store/listing/preview.html (contato de tudo)
const path = require('path'), fs = require('fs')
const { chromium } = require('playwright')

const ROOT = path.join(__dirname, '..', '..')
const STORE = path.join(ROOT, 'store')
const OUT = path.join(STORE, 'listing')
const TMP = path.join(STORE, '.build')
const mode = process.argv[2] || 'shots'
const url = (p) => 'file://' + path.resolve(STORE, p)
const font = (f) => 'file://' + path.join(ROOT, 'node_modules', '@fontsource', f)

const MARK = (color = '#C244FF', size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="M12 1.5 22.5 12 12 22.5 1.5 12Z" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 6.5 17.5 12 12 17.5 6.5 12Z" fill="${color}"/></svg>`
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

const BASE_CSS = `
@font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url(${font('space-grotesk/files/space-grotesk-latin-400-normal.woff2')}); }
@font-face { font-family: 'Space Grotesk'; font-weight: 500; src: url(${font('space-grotesk/files/space-grotesk-latin-500-normal.woff2')}); }
@font-face { font-family: 'Space Grotesk'; font-weight: 600; src: url(${font('space-grotesk/files/space-grotesk-latin-600-normal.woff2')}); }
@font-face { font-family: 'Space Grotesk'; font-weight: 600; src: url(${font('space-grotesk/files/space-grotesk-latin-ext-600-normal.woff2')}); unicode-range: U+0100-024F; }
@font-face { font-family: 'JetBrains Mono'; font-weight: 500; src: url(${font('jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2')}); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 600; src: url(${font('jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2')}); }
:root { --bg-00:#080809; --bg-01:#0F0F14; --line-2:#2A2A3A; --line-3:#3A3A50; --text-1:#EEEEF5; --text-2:#A3A3BF; --violet:#C244FF; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--bg-00); color: var(--text-1); font-family: 'Space Grotesk', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.full { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.lockup { display: flex; align-items: center; gap: 18px; font: 600 26px/1 'JetBrains Mono', monospace; letter-spacing: 0.22em; }
.lockup svg { width: 44px; height: 44px; }
h1 { margin: 0; font-weight: 600; letter-spacing: -0.025em; line-height: 1.02; text-wrap: balance; }
.sub { color: var(--text-2); font-size: 30px; font-weight: 500; letter-spacing: 0; margin-top: 18px; }
.mono { font: 500 20px/1 'JetBrains Mono', monospace; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-2); }
.blurbg { position: absolute; inset: -80px; width: calc(100% + 160px); height: calc(100% + 160px); object-fit: cover; filter: blur(60px) saturate(1.1) brightness(0.32); }
.window { position: absolute; border-radius: 14px; overflow: hidden; border: 1px solid var(--line-3); box-shadow: 0 40px 90px -20px rgba(0,0,0,.85), 0 6px 18px rgba(0,0,0,.55); background: #000; }
.window img { display: block; width: 100%; height: 100%; object-fit: cover; }
.head { position: absolute; left: 154px; right: 154px; top: 58px; display: flex; align-items: center; justify-content: space-between; gap: 40px; }
.head h1 { font-size: 64px; }
.head .lockup { font-size: 18px; gap: 12px; color: var(--text-2); }
.head .lockup svg { width: 28px; height: 28px; }
`

function page(body, extraCss = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}${extraCss}</style></head><body>${body}</body></html>`
}

const lockup = (color = '#EEEEF5', mark = '#C244FF') => `<div class="lockup" style="color:${color}">${MARK(mark)}<span>SONIC OBSIDIAN</span></div>`
const smallLockup = () => `<div class="lockup">${MARK('#C244FF')}<span>SONIC OBSIDIAN</span></div>`

// Tela do app numa janela (Biblioteca, Estúdio, Ajustes): manchete no alto, captura em 84 %.
// `shot` é um caminho ou { file, crop: [x, y, largura] } em px da janela de 1920×1080: recorte 16:9
// da captura (o painel fica legível); a imagem não é redesenhada, só ampliada.
function windowShot(shot, bg, title) {
  const w = 1612, hh = Math.round(w * 9 / 16)
  const { file, crop } = typeof shot === 'string' ? { file: shot, crop: [0, 0, 1920] } : shot
  const k = w / crop[2]
  return page(`<img class="blurbg" src="${url(bg)}">
  <div class="head"><h1>${esc(title)}</h1>${smallLockup()}</div>
  <div class="window" style="left:${(1920 - w) / 2}px; top:${1080 - hh - 40}px; width:${w}px; height:${hh}px"><img src="${url(file)}" style="position:absolute;left:${-crop[0] * k}px;top:${-crop[1] * k}px;width:${1920 * k}px;height:${1080 * k}px;max-width:none"></div>`)
}

const SLIDES = {
  '01-cover': (c, t) => page(`<img class="full" src="${url(c.cover)}">
    <div style="position:absolute;inset:0;background:linear-gradient(90deg, rgba(8,8,9,.82) 0%, rgba(8,8,9,.55) 34%, rgba(8,8,9,0) 62%), linear-gradient(0deg, rgba(8,8,9,.6) 0%, rgba(8,8,9,0) 40%)"></div>
    <div style="position:absolute;left:120px;top:110px">${lockup()}</div>
    <div style="position:absolute;left:120px;bottom:130px;max-width:900px"><h1 style="font-size:104px">${esc(t.title)}</h1><div class="sub" style="font-size:34px">${esc(t.sub)}</div></div>`),
  '02-reactivity': (c, t) => {
    const w = 520, hh = Math.round(w * 9 / 16), gap = 40, x0 = (1920 - 3 * w - 2 * gap) / 2
    return page(`<img class="blurbg" src="${url(c.reactivity.frames[2])}">
      <div class="head"><h1>${esc(t.title)}</h1>${smallLockup()}</div>
      <div style="position:absolute;left:154px;top:150px;" class="sub">${esc(t.sub)}</div>
      ${c.reactivity.frames.map((f, i) => `<div class="window" style="left:${x0 + i * (w + gap)}px;top:340px;width:${w}px;height:${hh}px"><img src="${url(f)}"></div>
        <div class="mono" style="position:absolute;left:${x0 + i * (w + gap)}px;top:${340 + hh + 30}px;width:${w}px;display:flex;align-items:center;gap:14px"><span style="display:inline-block;width:${[18, 60, 110][i]}px;height:6px;border-radius:3px;background:${i ? '#C244FF' : '#3A3A50'}"></span>${esc(t.labels[i])}</div>`).join('')}
      <div class="mono" style="position:absolute;left:${x0}px;bottom:150px;color:#8585A3;text-transform:none;letter-spacing:.04em">${esc(c.reactivity.name)}</div>`)
  },
  '03-library': (c, t) => windowShot(c.library, c.bg, t.title),
  '04-studio': (c, t) => windowShot(c.studio, c.bg, t.title),
  '05-audio': (c, t) => windowShot(c.audio, c.bg, t.title),
  '06-variety': (c, t) => {
    const w = 806, hh = Math.round(w * 9 / 16), gx = 28, gy = 28, x0 = (1920 - 2 * w - gx) / 2, y0 = 190
    return page(`<img class="blurbg" src="${url(c.variety[0].file)}">
      <div class="head"><h1>${esc(t.title)}</h1>${smallLockup()}</div>
      ${c.variety.map((v, i) => { const x = x0 + (i % 2) * (w + gx), y = y0 + Math.floor(i / 2) * (hh + gy + 40); return `<div class="window" style="left:${x}px;top:${y}px;width:${w}px;height:${hh}px"><img src="${url(v.file)}"></div><div class="mono" style="position:absolute;left:${x}px;top:${y + hh + 12}px;width:${w}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:none;letter-spacing:.02em;font-size:18px">${esc(v.name)}</div>` }).join('')}`)
  }
}

async function render(browser, html, file, w, h, scales) {
  fs.mkdirSync(TMP, { recursive: true })
  const src = path.join(TMP, path.basename(file) + '.html'); fs.writeFileSync(src, html)
  for (const [dsf, suffix] of scales) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf })
    await p.goto('file://' + src); await p.evaluate(() => document.fonts.ready)
    await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 })
    const out = file.replace(/\.png$/, `${suffix}.png`); fs.mkdirSync(path.dirname(out), { recursive: true })
    await p.screenshot({ path: out }); await p.close(); console.log('  ' + path.relative(ROOT, out))
  }
}

async function shots(browser) {
  const cfg = JSON.parse(fs.readFileSync(path.join(STORE, 'compose.json'), 'utf8'))
  const copy = JSON.parse(fs.readFileSync(path.join(STORE, 'copy.json'), 'utf8'))
  for (const lang of Object.keys(copy)) {
    const c = { ...cfg, ...(cfg.byLang?.[lang] || {}) }
    for (const [id, fn] of Object.entries(SLIDES)) {
      await render(browser, fn(c, copy[lang][id]), path.join(OUT, lang, `${id}.png`), 1920, 1080, [[2, '-3840x2160'], [1, '-1920x1080']])
    }
  }
}

async function logos(browser) {
  // Box art 1:1 e pôster 2:3: a marca atual (docs/brand/mark.svg), sem redesenho, sobre bg-00.
  const box = page(`<div style="position:absolute;inset:0;display:grid;place-items:center">${MARK('#C244FF', 540)}</div>`, 'html,body{width:1080px;height:1080px}')
  const poster = page(`<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:110px">
      ${MARK('#C244FF', 400)}
      <div style="font:600 40px/1 'JetBrains Mono',monospace;letter-spacing:.22em;margin-right:-.22em;color:#EEEEF5">SONIC OBSIDIAN</div></div>`, 'html,body{width:720px;height:1080px}')
  await render(browser, box, path.join(OUT, 'logos', 'box-art.png'), 1080, 1080, [[1, '-1080x1080'], [2, '-2160x2160']])
  await render(browser, poster, path.join(OUT, 'logos', 'poster.png'), 720, 1080, [[1, '-720x1080'], [2, '-1440x2160']])
}

function preview() {
  const rel = (p) => path.relative(OUT, p).split(path.sep).join('/')
  const list = (dir, re) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => re.test(f)).sort().map((f) => path.join(dir, f)) : []
  const sec = (title, files, cls = '') => `<h2>${title}</h2><div class="grid ${cls}">${files.map((f) => `<figure><a href="${rel(f)}"><img src="${rel(f)}" loading="lazy"></a><figcaption>${rel(f)}</figcaption></figure>`).join('')}</div>`
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Store — prévia</title><style>
    body{background:#080809;color:#EEEEF5;font:14px system-ui;margin:0;padding:24px 32px}h1{font-size:22px}h2{font-size:16px;color:#A3A3BF;margin:32px 0 12px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:16px}.grid.logos{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
    figure{margin:0}img{width:100%;display:block;border:1px solid #2A2A3A;border-radius:6px}figcaption{color:#8585A3;font:12px ui-monospace,monospace;margin-top:6px}</style></head><body>
    <h1>Sonic Obsidian — imagens da Microsoft Store</h1><p style="color:#A3A3BF">Versões 3840×2160 (o arquivo -1920x1080 é a mesma composição). Clique para abrir no tamanho real.</p>
    ${sec('English', list(path.join(OUT, 'en'), /-3840x2160\.png$/))}
    ${sec('Português (Brasil)', list(path.join(OUT, 'pt-BR'), /-3840x2160\.png$/))}
    ${sec('Logos', list(path.join(OUT, 'logos'), /\.png$/), 'logos')}</body></html>`
  fs.writeFileSync(path.join(OUT, 'preview.html'), html); console.log('  store/listing/preview.html')
}

;(async () => {
  if (mode === 'preview') return preview()
  const browser = await chromium.launch()
  try {
    if (mode === 'shots' || mode === 'all') await shots(browser)
    if (mode === 'logos' || mode === 'all') await logos(browser)
  } finally { await browser.close() }
  if (mode === 'all') preview()
})().catch((e) => { console.error(e); process.exit(1) })
