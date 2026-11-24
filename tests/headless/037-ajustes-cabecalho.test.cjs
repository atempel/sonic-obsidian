// Spec 037 (#109): Ajustes rápidos — a rolagem volta ao topo, ícones nas seções e
// "Todas as configurações" no cabeçalho. Só estados da interface; o salto visível, no Windows.
const H = require('./harness.cjs')
const R = H.createResults('037-ajustes-cabecalho')
const ok = R.ok

const RENDER = { meshWidth: 32, meshHeight: 24, pixelRatio: 1, textureRatio: 0.5, fxaa: false, canvasScale: 0.5, extraImages: false }
// `poll` serializa a função para a página: a classe vai pelo `arg`.
const has = (cls) => document.body.classList.contains(cls)
const hasNot = (cls) => !document.body.classList.contains(cls)

async function openQuick(page) {
  await page.keyboard.press(',')
  await H.poll(page, has, { timeout: 10000, arg: 'sheet-open' })
}
async function closeQuick(page) {
  await page.keyboard.press('Escape')
  await H.poll(page, hasNot, { timeout: 10000, arg: 'sheet-open' })
}
const sheetScroll = (page) => page.evaluate(() => document.querySelector('.sheet .body').scrollTop)
const scrollSheetToEnd = (page) => page.evaluate(() => {
  const b = document.querySelector('.sheet .body')
  b.scrollTop = b.scrollHeight
  return b.scrollTop
})

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(5261)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false }, render: RENDER } })
    await H.mockAudio(page)
    await page.goto('http://localhost:5261/')
    await page.waitForSelector('.strip [data-sheet-btn]', { timeout: 30000 })
    await page.mouse.move(640, 300)

    // 1. Rolagem volta ao topo depois de fechar.
    await openQuick(page)
    const end = await scrollSheetToEnd(page)
    ok('1a a lista rola (há o que rolar)', end > 50, `scrollTop=${end}`)
    await closeQuick(page)
    ok('1b depois da saída, scrollTop = 0', await H.poll(page, () => document.querySelector('.sheet .body').scrollTop === 0, { timeout: 5000 }))
    await openQuick(page)
    ok('1c reabre com o Sinal no topo', await page.evaluate(() => {
      const body = document.querySelector('.sheet .body').getBoundingClientRect()
      const h = document.querySelector('.sheet .body section h3').getBoundingClientRect()
      return h.top >= body.top && h.bottom <= body.bottom
    }))
    // Fechar no fim da lista e reabrir antes dos 200 ms: também começa no topo.
    await scrollSheetToEnd(page)
    // Na própria página (o vaivém do Playwright passa dos 200 ms no runner lento): Esc, 60 ms, `,`.
    const r1d = await page.evaluate(() => new Promise((resolve) => {
      const key = (k) => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
      const t0 = performance.now()
      key('Escape')
      setTimeout(() => {
        const closed = !document.body.classList.contains('sheet-open')
        key(',')
        requestAnimationFrame(() => resolve({ closed, dt: Math.round(performance.now() - t0) }))
      }, 60)
    }))
    ok('1d0 fechou', r1d.closed)
    await H.poll(page, has, { timeout: 5000, arg: 'sheet-open' })
    const dt = r1d.dt
    ok('1d reabrir antes dos 200 ms: topo', (await sheetScroll(page)) === 0, `reabriu em ${dt} ms`)
    await closeQuick(page)

    // 2. A Biblioteca guarda a posição.
    await page.keyboard.press('l')
    await H.poll(page, has, { timeout: 10000, arg: 'lib-open' })
    await H.poll(page, () => document.querySelectorAll('.lib .list li').length > 20, { timeout: 10000 })
    const libPos = await page.evaluate(() => {
      const l = document.querySelector('.lib .list')
      l.scrollTop = 400
      return l.scrollTop
    })
    ok('2a a lista da Biblioteca rola', libPos > 0, `scrollTop=${libPos}`)
    await page.keyboard.press('Escape')
    await H.poll(page, hasNot, { timeout: 10000, arg: 'lib-open' })
    await page.waitForTimeout(400)
    await page.keyboard.press('l')
    await H.poll(page, has, { timeout: 10000, arg: 'lib-open' })
    const libAfter = await page.evaluate(() => document.querySelector('.lib .list').scrollTop)
    ok('2b reabre na mesma posição', libAfter === libPos, `${libPos} → ${libAfter}`)
    await page.keyboard.press('Escape')
    await H.poll(page, hasNot, { timeout: 10000, arg: 'lib-open' })

    // 3. Ícones das seções.
    await openQuick(page)
    const heads = await page.evaluate(() => [...document.querySelectorAll('.sheet .body h3')].map((h) => {
      const svg = h.firstElementChild
      const r = svg?.getBoundingClientRect()
      return {
        text: h.textContent.trim(),
        first: svg?.tagName.toLowerCase(),
        icon: svg?.getAttribute('data-icon'),
        hidden: svg?.getAttribute('aria-hidden'),
        w: r && Math.round(r.width), h: r && Math.round(r.height),
        color: svg && getComputedStyle(svg).color,
        gap: svg && Math.round(svg.nextElementSibling.getBoundingClientRect().left - r.right)
      }
    }))
    const text2 = await page.evaluate(() => {
      const d = document.createElement('div'); d.style.color = 'var(--text-2)'; document.body.append(d)
      const c = getComputedStyle(d).color; d.remove(); return c
    })
    const want = [['Sinal', 'audio-lines'], ['Expressividade', 'activity'], ['Rotação', 'repeat'], ['Transições', 'blend'], ['Texto sobre o visual', 'type']]
    ok('3a cinco seções na ordem, cada uma com o ícone certo', JSON.stringify(heads.map((h) => [h.text, h.icon])) === JSON.stringify(want), JSON.stringify(heads.map((h) => [h.text, h.icon])))
    ok('3b ícone é o primeiro filho, svg, aria-hidden', heads.every((h) => h.first === 'svg' && h.hidden === 'true'))
    ok('3c 16 px', heads.every((h) => h.w === 16 && h.h === 16), JSON.stringify(heads.map((h) => `${h.w}x${h.h}`)))
    ok('3d cor text-2', heads.every((h) => h.color === text2), `${heads[0].color} vs ${text2}`)
    ok('3e 8 px até o texto', heads.every((h) => h.gap === 8), JSON.stringify(heads.map((h) => h.gap)))

    // 4. Cabeçalho: Feedback · Todas as configurações · Fechar.
    const btns = await page.evaluate(() => [...document.querySelectorAll('.sheet header .hbtns > button')].map((x) => ({
      aria: x.getAttribute('aria-label'), title: x.getAttribute('title'), icon: x.querySelector('svg')?.getAttribute('data-icon')
    })))
    ok('4a três botões no cabeçalho', btns.length === 3, JSON.stringify(btns))
    ok('4b ordem Feedback, Todas as configurações, Fechar', btns[0]?.icon === 'message-square' && btns[1]?.icon === 'settings' && btns[2]?.icon === 'x', JSON.stringify(btns.map((x) => x.icon)))
    ok('4c aria-label e title em pt-BR', btns[1]?.aria === 'Todas as configurações' && btns[1]?.title === 'Todas as configurações (Ctrl+,)', JSON.stringify(btns[1]))
    ok('4d sem .sheet-link no painel', (await page.$$('.sheet .sheet-link')).length === 0)
    await H.click(page, '#sheetSettings')
    ok('4e o botão abre as Configurações', await H.poll(page, has, { timeout: 10000, arg: 'settings-open' }))
    ok('4f sem erros na página', errs.length === 0, errs.join(' | '))

    // 4g. Em inglês.
    const p2 = await b.newPage({ viewport: { width: 1280, height: 720 } })
    R.attach(p2)
    await H.mockSo(p2, { systemLanguage: 'pt-BR', settings: { welcomeSeen: true, language: 'en', rotation: { enabled: false }, render: RENDER } })
    await H.mockAudio(p2)
    await p2.goto('http://localhost:5261/')
    await p2.waitForSelector('.strip [data-sheet-btn]', { timeout: 30000 })
    await p2.mouse.move(640, 300)
    await openQuick(p2)
    const en = await p2.evaluate(() => {
      const x = document.getElementById('sheetSettings')
      return { aria: x.getAttribute('aria-label'), title: x.getAttribute('title'), heads: [...document.querySelectorAll('.sheet .body h3')].map((h) => h.textContent.trim()) }
    })
    ok('4g aria-label e title em inglês', en.aria === 'All settings' && en.title === 'All settings (Ctrl+,)', JSON.stringify(en))
    await p2.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
