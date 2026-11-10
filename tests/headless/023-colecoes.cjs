// Teste headless da spec 023 (coleções pelo Palco), critérios 1–5. Semente da suíte de testes
// (queue/2026-11-09-suite-testes-performance.md). Uso: `npm run build` e depois
// `node tests/headless/023-colecoes.cjs`. Precisa do Chromium/Playwright do ambiente da nuvem.
// Serve out/renderer na porta 5199 e simula window.so (incluindo presets) e o getDisplayMedia.
// Vale para layout e estados; áudio e fps só se verificam no Windows.
const { chromium } = require('playwright')
const path = require('path'), http = require('http'), fs = require('fs')
const root = path.join(__dirname, '..', '..', 'out', 'renderer')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }
const srv = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d) }) }).listen(5199)
const results = []; const ok = (n, c, extra = '') => { results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${extra}`) }
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } })
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await page.addInitScript(() => {
    const lib = { version: 1, favorites: [], hidden: [], hiddenPerf: [], recents: [], presetFps: {}, collections: [
      { id: 'c1', name: 'Calmos', presets: [], intervalSeconds: 30 }, { id: 'c2', name: 'Festa', presets: [], intervalSeconds: 30 }] }
    window.__saves = []
    window.so = {
      settings: { load: async () => ({ welcomeSeen: true }), save: async () => {} },
      library: { load: async () => lib, save: async (d) => { window.__saves.push(JSON.parse(JSON.stringify(d))) } },
      window: { toggleFullScreen: async () => {}, minimize: async () => {}, close: async () => {} },
      system: { openSoundSettings: async () => {}, openNotices: async () => '', openLink: async () => {}, copyText: async () => {}, gpuInfo: async () => ({ driver: 'x', ids: 'x' }), testFlags: async () => ({ captureFail: false, noWebgl2: false }) },
      app: { version: async () => '0.5.0' },
      presets: { convertMilk: async () => ({ preset: {}, ms: 0 }), listImported: async () => [], saveImported: async () => {}, removeImported: async () => {}, pickMilk: async () => ({ files: [], tooBig: [], extra: 0 }) },
      collections: { export: async () => ({ ok: true }), import: async () => ({ ok: false, canceled: true }) },
      log: (m) => console.log('[so.log]', m), mark: () => {}, showLog: async () => {}
    }
    navigator.mediaDevices.getDisplayMedia = async () => { const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); const s = d.stream; const c = document.createElement('canvas'); s.addTrack(c.captureStream(1).getVideoTracks()[0]); return s }
  })
  await page.goto('http://localhost:5199/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1500)
  const cur = () => page.$eval('.now-title', e => e.getAttribute('title'))
  const btn = 'button[aria-label="Adicionar à coleção"]'
  const pop = '.menu.collect'
  // pausa a rotação, se houver
  const c0 = await cur()
  // 1
  await page.mouse.move(600, 400); await page.click(btn)
  ok('1a painel abre', await page.isVisible(pop)); await page.screenshot({ path: path.join(require('os').tmpdir(), '023-pop.png') }); ok('1f painel não é cortado (clique acerta a linha)', await page.evaluate(() => { const b = document.querySelector('.menu.collect [role=menuitemcheckbox]').getBoundingClientRect(); return document.elementFromPoint(b.x + 20, b.y + b.height / 2)?.closest('.menu.collect') != null }))
  const rows = await page.$$eval(`${pop} [role=menuitemcheckbox]`, es => es.map(e => [e.textContent, e.getAttribute('aria-checked')]))
  ok('1b lista as 2 coleções, nenhuma marcada', rows.length === 2 && rows.every(r => r[1] === 'false'), JSON.stringify(rows))
  ok('1c aria-expanded', (await page.getAttribute(btn, 'aria-expanded')) === 'true')
  // 2 marcar
  await page.click(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`)
  await page.waitForTimeout(200)
  ok('2a marcar: aria-checked true', (await page.getAttribute(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`, 'aria-checked')) === 'true')
  ok('2b painel continua aberto', await page.isVisible(pop))
  const toast1 = await page.evaluate(() => document.body.innerText)
  ok('2c toast "Adicionado a Calmos."', toast1.includes('Adicionado a Calmos.'))
  ok('2d preset atual não trocou', (await cur()) === c0)
  await page.waitForTimeout(800)
  let last = await page.evaluate(() => window.__saves.at(-1))
  ok('2e salvo na library', !!last && last.collections.find(c => c.id === 'c1').presets.includes(c0), c0)
  // fechar e reabrir: já marcada
  await page.click(btn); await page.waitForTimeout(150)
  ok('4a o próprio botão fecha', !(await page.isVisible(pop)))
  await page.click(btn)
  ok('1d reaberto: Calmos marcada', (await page.getAttribute(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`, 'aria-checked')) === 'true')
  // desmarcar
  await page.click(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`); await page.waitForTimeout(200)
  ok('2f desmarcar', (await page.getAttribute(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`, 'aria-checked')) === 'false')
  ok('2g toast "Removido de Calmos."', (await page.evaluate(() => document.body.innerText)).includes('Removido de Calmos.'))
  // marcar Festa para conferir na Biblioteca
  await page.click(`${pop} [role=menuitemcheckbox]:has-text("Festa")`); await page.waitForTimeout(200)
  // 3 nova coleção
  await page.click(`${pop} .newcol`)
  const inp = `${pop} input[aria-label="Nome da nova coleção"]`
  ok('3a vira campo de nome com foco', await page.evaluate(s => document.activeElement === document.querySelector(s), inp))
  await page.keyboard.type('Noite')
  await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  const rows3 = await page.$$eval(`${pop} [role=menuitemcheckbox]`, es => es.map(e => [e.querySelector('.grow').textContent, e.getAttribute('aria-checked')]))
  ok('3b "Noite" criada e marcada', rows3.some(r => r[0] === 'Noite' && r[1] === 'true'), JSON.stringify(rows3))
  ok('3c painel aberto, foco num item', await page.isVisible(pop) && await page.evaluate(() => document.activeElement?.closest('.menu.collect') != null && document.activeElement.tagName === 'BUTTON'), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)))
  // nome vazio → padrão; Esc cancela
  await page.click(`${pop} .newcol`); await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  ok('3d Esc no campo cancela e mantém o painel', await page.isVisible(pop) && !(await page.isVisible(inp)))
  await page.click(`${pop} .newcol`); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  const rows3b = await page.$$eval(`${pop} [role=menuitemcheckbox] .grow`, es => es.map(e => e.textContent))
  ok('3e vazio usa o nome padrão', rows3b.some(n => /^Coleção \d+$/.test(n)), JSON.stringify(rows3b))
  // 5 faixa não some, teclas do Palco não valem
  await page.waitForTimeout(3200)
  ok('5a faixa não some com o painel aberto (3,2 s)', !(await page.evaluate(() => document.body.classList.contains('idle'))))
  await page.focus(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`)
  for (const k of ['ArrowRight', 'ArrowLeft']) await page.keyboard.press(k)
  await page.keyboard.down(' '); await page.waitForTimeout(50)
  const cBefore = c0
  await page.waitForTimeout(1200)
  ok('5b setas/Espaço não trocam o preset', (await cur()) === cBefore, await cur())
  await page.keyboard.up(' '); await page.waitForTimeout(200)
  // 4 teclado: setas, Home, End
  const focusedText = () => page.evaluate(() => document.activeElement?.textContent)
  await page.focus(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`)
  await page.keyboard.press('ArrowDown'); const fd = await focusedText()
  await page.keyboard.press('End'); const fe = await focusedText()
  await page.keyboard.press('Home'); const fh = await focusedText()
  await page.keyboard.press('ArrowUp'); const fu = await focusedText()
  ok('4b setas/Home/End', fd.includes('Festa') && fe.includes('Nova coleção') && fh.includes('Calmos') && fu.includes('Nova coleção'), JSON.stringify([fd, fe, fh, fu]))
  // Enter / Espaço alternam
  await page.keyboard.press('Home')
  const s0 = await page.getAttribute(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`, 'aria-checked')
  await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  const s1 = await page.getAttribute(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`, 'aria-checked')
  await page.keyboard.press(' '); await page.waitForTimeout(150)
  const s2 = await page.getAttribute(`${pop} [role=menuitemcheckbox]:has-text("Calmos")`, 'aria-checked')
  ok('4c Enter e Espaço alternam', s0 !== s1 && s1 !== s2 && (await cur()) === c0, JSON.stringify([s0, s1, s2]))
  // Esc fecha e devolve o foco
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  ok('4d Esc fecha e foco volta ao botão', !(await page.isVisible(pop)) && await page.evaluate(s => document.activeElement === document.querySelector(s), btn))
  ok('4e Esc não fechou mais nada / preset igual', (await cur()) === c0)
  // Teclado: Enter no botão abre e foca o 1º item
  await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  ok('4f Enter no botão abre, foco no 1º item', await page.isVisible(pop) && (await focusedText()).includes('Calmos'))
  // clique fora fecha
  await page.mouse.click(640, 200); await page.waitForTimeout(150)
  ok('4g clique fora fecha', !(await page.isVisible(pop)))
  // Tab até o botão
  await page.mouse.move(600, 300)
  await page.focus('button[aria-label="Favoritar"], button[aria-label="Desfavoritar"]'); await page.keyboard.press('Tab')
  ok('4h Tab da estrela chega ao botão', await page.evaluate(s => document.activeElement === document.querySelector(s), btn))
  // rotação: marcas acompanham o preset
  await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  await page.evaluate(() => document.querySelector('button[aria-label="Próximo preset"]').click())
  await page.waitForTimeout(800)
  const c1 = await cur()
  const rowsR = await page.$$eval(`${pop} [role=menuitemcheckbox]`, es => es.map(e => [e.querySelector('.grow').textContent, e.getAttribute('aria-checked')]))
  ok('1e troca de preset com painel aberto atualiza as marcas', c1 !== c0 && rowsR.every(r => r[1] === 'false'), JSON.stringify([c0, c1, rowsR]))
  await page.keyboard.press('Escape')
  // Biblioteca › Coleções
  await page.mouse.click(640, 200); await page.keyboard.press('KeyL'); await page.waitForTimeout(500)
  const tab = await page.$('[role=tab]:has-text("Coleções")'); if (tab) await tab.click(); await page.waitForTimeout(300)
  const libText = await page.evaluate(() => document.querySelector('.drawer, .library, [class*=lib]')?.innerText ?? document.body.innerText)
  ok('2h Biblioteca › Coleções reflete', /Festa[\s\S]*1 preset/.test(libText) && /Noite[\s\S]*1 preset/.test(libText) && /Calmos[\s\S]*1 preset/.test(libText), libText.slice(0, 300).replace(/\n/g, ' | '))
  await page.screenshot({ path: path.join(require('os').tmpdir(), '023-lib.png') })
  ok('sem erros na página', errs.filter(e => !/getDisplayMedia|AudioContext/.test(e)).length === 0, JSON.stringify(errs.slice(0, 5)))
  console.log(results.join('\n')); console.log(`${results.filter(r => r.startsWith('PASS')).length}/${results.length}`)
  await b.close(); srv.close()
})().catch(e => { console.log(results.join('\n')); console.error(e); process.exit(1) })
