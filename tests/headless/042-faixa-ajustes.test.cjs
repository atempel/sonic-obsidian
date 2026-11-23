// Spec 042 (#181): a faixa não some com o ponteiro parado em cima dela, e os Ajustes rápidos
// fecham com um clique fora. Só estados da interface; o visual e o mouse de verdade, no Windows.
const H = require('./harness.cjs')
const R = H.createResults('042-faixa-ajustes')
const ok = R.ok

const idle = (page) => page.evaluate(() => document.body.classList.contains('idle'))
const quickOpen = (page) => page.evaluate(() => document.body.classList.contains('sheet-open'))
const center = (page, sel) => page.evaluate((s) => {
  const r = document.querySelector(s).getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}, sel)

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(5256)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1280, height: 800 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false } } })
    await H.mockAudio(page)
    await page.goto('http://localhost:5256/')
    await page.waitForSelector('.strip [data-sheet-btn]', { timeout: 30000 })

    // 1. Ponteiro parado fora da faixa: ela some depois de 2,5 s (como antes).
    await page.mouse.move(640, 200)
    ok('1a ponteiro parado sobre o visual: a faixa some', await H.poll(page, () => document.body.classList.contains('idle'), { timeout: 8000 }))

    // 2. Ponteiro parado em cima da faixa: ela continua visível.
    const tail = await center(page, '.strip > .tail')
    await page.mouse.move(tail.x, tail.y - 2)
    await page.mouse.move(tail.x, tail.y)
    ok('2a ponteiro entra na faixa: ela aparece', await H.poll(page, () => !document.body.classList.contains('idle'), { timeout: 3000 }))
    await page.waitForTimeout(5000)
    ok('2b parado em cima da faixa por 5 s: continua visível', !(await idle(page)))
    // Saiu da faixa: volta a contar e some.
    await page.mouse.move(640, 200)
    ok('2c saiu da faixa: some de novo', await H.poll(page, () => document.body.classList.contains('idle'), { timeout: 8000 }))
    // `H` esconde na hora mesmo com o ponteiro em cima.
    await page.mouse.move(tail.x, tail.y)
    await H.poll(page, () => !document.body.classList.contains('idle'), { timeout: 3000 })
    await page.keyboard.press('h')
    ok('2d H esconde na hora com o ponteiro em cima', await H.poll(page, () => document.body.classList.contains('idle'), { timeout: 2000 }))

    // 3. Ajustes rápidos: clique fora fecha.
    await page.mouse.move(640, 300)
    await H.click(page, '.strip [data-sheet-btn]')
    ok('3a o botão abre os Ajustes', await H.poll(page, () => document.body.classList.contains('sheet-open'), { timeout: 3000 }))
    const head = await center(page, '.sheet header h2')
    await page.mouse.click(head.x, head.y)
    ok('3b clique dentro do painel não fecha', await quickOpen(page))
    await page.mouse.click(300, 300)
    ok('3c clique no visual fecha', await H.poll(page, () => !document.body.classList.contains('sheet-open'), { timeout: 3000 }))
    // O botão da faixa continua alternando (não reabre logo depois de fechar).
    await H.click(page, '.strip [data-sheet-btn]')
    await H.poll(page, () => document.body.classList.contains('sheet-open'), { timeout: 3000 })
    await H.click(page, '.strip [data-sheet-btn]')
    ok('3d o botão da faixa fecha com um clique', await H.poll(page, () => !document.body.classList.contains('sheet-open'), { timeout: 3000 }))
    await page.waitForTimeout(400)
    ok('3e e fica fechado', !(await quickOpen(page)))
    // Clique noutro botão da faixa: fecha os Ajustes e faz o seu (a Biblioteca abre).
    await H.click(page, '.strip [data-sheet-btn]')
    ok('3f0 Ajustes abertos de novo', await H.poll(page, () => document.body.classList.contains('sheet-open'), { timeout: 3000 }))
    await H.click(page, '.strip button[title="Biblioteca (L)"]')
    ok('3f clique na Biblioteca da faixa: Ajustes fechados', await H.poll(page, () => !document.body.classList.contains('sheet-open'), { timeout: 3000 }))
    ok('3g e a Biblioteca abre', await H.poll(page, () => document.body.classList.contains('lib-open'), { timeout: 3000 }))
    ok('3h sem erros na página', errs.length === 0, errs.join(' | '))
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
