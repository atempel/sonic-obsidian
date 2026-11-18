// Teste headless da spec 027, fatia 11 (Estúdio: extras da prévia). Uso: `npm run build` e `npm run test:ui`
// (ou `node tests/headless/027-estudio-extras.test.cjs`). "Testar troca": o corte para outro preset e a volta
// com a transição do Palco vêm do HUD; a assinatura (nome e crédito) aparece no pé da prévia. "Capturar
// quadro": o `window.so.presets.exportFrame` é simulado (o diálogo nativo é do main) e guarda o PNG que
// receberia, conferido pela assinatura e pelo tamanho no IHDR. Ver o quadro e a transição só no Windows.
const H = require('./harness.cjs')
const path = require('path')
const srv = H.serve(5253)
const R = H.createResults('027-estudio-extras'); const ok = R.ok
const ROOT = path.join(__dirname, '..', '..')

;(async () => {
  const b = await H.launch()
  const errs = []
  async function open({ blend } = {}) {
    const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
    page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    const settings = { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false } }
    if (blend) settings.blend = { manual: blend, auto: { type: 'random', seconds: 2.7 } }
    await H.mockSo(page, { settings })
    await page.addInitScript(() => {
      window.__frames = []
      window.__frameMode = 'ok'
      window.so.presets.exportFrame = async (name, data) => {
        const u = data instanceof Uint8Array ? data : new Uint8Array(0)
        const dv = new DataView(u.buffer, u.byteOffset, u.byteLength)
        window.__frames.push({ name, len: u.length, sig: [...u.slice(0, 8)], w: u.length > 24 ? dv.getUint32(16) : 0, h: u.length > 24 ? dv.getUint32(20) : 0 })
        if (window.__frameMode === 'fail') throw new Error('[too-big] frame larger than 64 MB')
        return window.__frameMode === 'cancel' ? { ok: false, canceled: true } : { ok: true, name: `${name}-quadro.png` }
      }
    })
    await H.mockAudio(page)
    await page.goto('http://localhost:5253/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
    await page.waitForTimeout(800)
    await page.mouse.move(700, 400)
    await page.keyboard.press('e')
    await page.waitForSelector('.studio', { timeout: 8000 })
    await H.poll(page, () => document.querySelector('.cstat')?.textContent.trim() === 'Compilado', { timeout: 12000 })
    await page.keyboard.press('Control+Shift+d')
    return page
  }
  const hudStudio = (page) => page.$eval('#hud', e => e.textContent.split('\n').find(l => l.startsWith('studio')) || '').catch(() => '')
  const toastText = (page) => page.$eval('.gtoast', e => e.textContent).catch(() => '')

  // 1. Os botões, à direita do switch, como no protótipo
  let page = await open()
  const src = await page.$eval('.now-title', e => e.getAttribute('title'))
  const bar = await page.$eval('.st-pbar', (p) => [...p.children].map((x) => (x.classList.contains('switch') ? 'switch' : x.classList.contains('sp') ? 'sp' : x.textContent.trim())))
  ok('1a barra da prévia: switch, espaço, "Testar troca", "Capturar quadro"', bar.join() === 'switch,sp,Testar troca,Capturar quadro', bar.join())
  ok('1b assinatura escondida antes da troca', !(await page.$eval('.st-card', e => e.classList.contains('show'))))

  // 2. Testar troca: corte para outro preset, volta com a transição do Palco, assinatura com nome e crédito
  await page.click('.st-swap')
  const card = await page.$eval('.st-card', e => ({ show: e.classList.contains('show'), h: e.querySelector('h2').textContent, p: e.querySelector('p').textContent }))
  const via = ((await page.evaluate(() => window.__logs)).find(l => l.startsWith('studio: test swap via ')) || '').replace('studio: test swap via ', '')
  ok('2a corta para outro preset da biblioteca', !!via && via !== src, via)
  const title = (await page.inputValue('#studio-name')).trim() // o campo pode ter espaço no fim (vem do nome do preset)
  ok('2b assinatura com o nome do preset e o crédito (por Teste · baseado em …)', card.show && card.h === title && /^por Teste · baseado em /.test(card.p), JSON.stringify(card))
  await H.poll(page, () => /studio: test swap back/.test(document.getElementById('hud').textContent), { timeout: 5000 })
  ok('2c volta para o preset em edição com a transição das trocas manuais (padrão: aleatória, 1 s)', /studio: test swap back \(random, 1 s\)/.test(await hudStudio(page)), await hudStudio(page))
  ok('2d não mexe no preset atual nem no histórico (o Palco segue no de origem)', (await page.$eval('.now-title', e => e.getAttribute('title'))) === src)
  ok('2e log em inglês', (await page.evaluate(() => window.__logs)).some(l => l.startsWith('studio: test swap via ')))
  await page.waitForTimeout(5200)
  ok('2f a assinatura some sozinha', !(await page.$eval('.st-card', e => e.classList.contains('show'))))
  await page.screenshot({ path: path.join(ROOT, 'test-results', '027-estudio-extras.png') }).catch(() => {})

  // 3. Capturar quadro: PNG do canvas, com o nome do preset
  await page.click('.st-cap')
  await H.poll(page, () => window.__frames.length >= 1, { timeout: 8000 })
  const f1 = (await page.evaluate(() => window.__frames))[0] || {}
  const cv = await page.$eval('#canvas', c => [c.width, c.height])
  ok('3a PNG (assinatura) no tamanho do canvas, com o nome do preset', f1.sig?.join() === '137,80,78,71,13,10,26,10' && f1.w === cv[0] && f1.h === cv[1] && f1.name === title, `${f1.sig} ${f1.w}x${f1.h} vs ${cv} "${f1.name}"`)
  await H.poll(page, () => /Quadro capturado/.test(document.querySelector('.gtoast')?.textContent ?? ''), { timeout: 3000 })
  ok('3b toast "Quadro capturado como …" e log', /^Quadro capturado como .*-quadro\.png\.$/.test(await toastText(page)) && (await page.evaluate(() => window.__logs)).includes('studio: frame captured'), await toastText(page))
  await page.evaluate(() => { window.__frameMode = 'cancel' })
  await page.click('.st-cap')
  await H.poll(page, () => window.__frames.length >= 2, { timeout: 8000 })
  await page.waitForTimeout(300)
  const capLogs = (await page.evaluate(() => window.__logs)).filter(l => l.startsWith('studio: frame capture'))
  ok('3c diálogo cancelado: nada registrado nem avisado', capLogs.length === 1 && capLogs[0] === 'studio: frame captured', capLogs.join(' | '))
  await page.evaluate(() => { window.__frameMode = 'fail' })
  await page.click('.st-cap')
  await H.poll(page, () => window.__frames.length >= 3, { timeout: 8000 })
  await page.waitForTimeout(300)
  ok('3d falha: "Não foi possível capturar o quadro. Tente de novo." e log em inglês', /Não foi possível capturar o quadro\. Tente de novo\./.test(await toastText(page)) &&
    (await page.evaluate(() => window.__logs)).some(l => /^studio: frame capture failed: frame larger than 64 MB/.test(l)), await toastText(page))
  ok('3e o botão volta a funcionar depois da falha', !(await page.$eval('.st-cap', e => e.disabled)))

  // 4. Com erro na tela, a troca volta para a última versão válida (o Estúdio continua com o erro)
  await page.keyboard.press('Control+2')
  await page.fill('#studio-tp-eq .ed-ta >> nth=1', 'zoom = = 1;')
  await H.poll(page, () => /erro/.test(document.querySelector('.cstat')?.textContent ?? ''), { timeout: 10000 })
  await page.click('.st-swap')
  await H.poll(page, () => /studio: test swap back/.test(document.getElementById('hud').textContent), { timeout: 5000 })
  ok('4a com erro: a troca volta (para a última versão válida) e o erro continua em Problemas', /erro/.test(await page.$eval('.cstat', e => e.textContent)) && /test swap back/.test(await hudStudio(page)))
  await page.close()

  // 5. Corte seco nas trocas manuais: a volta também é seca; sair logo depois cancela a volta
  page = await open({ blend: { type: 'cut', seconds: 1 } })
  const src5 = await page.$eval('.now-title', e => e.getAttribute('title'))
  await page.click('.st-swap')
  await H.poll(page, () => /studio: test swap back/.test(document.getElementById('hud').textContent), { timeout: 5000 })
  ok('5a corte seco: a volta usa o corte', /studio: test swap back \(cut, 1 s\)/.test(await hudStudio(page)), await hudStudio(page))
  await page.click('.st-swap')
  await page.keyboard.press('Escape')
  await page.waitForSelector('.studio', { state: 'detached', timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1200)
  ok('5b sair logo depois de "Testar troca": a volta não acontece e o Palco volta ao preset de origem',
    !(await page.$('.studio')) && !/test swap back/.test(await page.$eval('#hud', e => e.textContent)) && (await page.$eval('.now-title', e => e.getAttribute('title'))) === src5)
  await page.close()

  ok('6a sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async e => { console.error(e); R.dump(); process.exit(1) })
