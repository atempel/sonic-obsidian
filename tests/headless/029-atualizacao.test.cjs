// Atualização automática (spec 029), interface: plaquinha acima da faixa, Configurações › Sobre ›
// Atualizações e os comandos da busca rápida, com o `window.so.update` simulado. O que depende do
// GitHub e do instalador (baixar, instalar em silêncio, reabrir, SmartScreen) só se vê no Windows.
const H = require('./harness.cjs')
const R = H.createResults('029-atualizacao')
const ok = R.ok

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(5231)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1400, height: 860 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false } }, saveSettings: true })
    // window.so.update simulado: __upd.emit(estado) faz o papel do main; __upd.calls registra as chamadas.
    await page.addInitScript(() => {
      const base = { phase: 'idle', version: null, percent: 0, lastCheckAt: null, portable: false, supported: true }
      const fns = new Set()
      const u = (window.__upd = { state: { ...base }, calls: [], next: 'latest' })
      u.emit = (patch) => { u.state = { ...u.state, ...patch }; fns.forEach((f) => f({ ...u.state })) }
      window.so.update = {
        state: async () => ({ ...u.state }),
        configure: (auto) => u.calls.push(['configure', auto]),
        check: async () => {
          u.calls.push(['check'])
          u.emit({ phase: 'checking' })
          await new Promise((r) => setTimeout(r, 1200))
          const n = u.next
          if (n === 'latest') u.emit({ phase: 'latest', version: null, lastCheckAt: Date.now() })
          else if (n === 'error') u.emit({ phase: 'error' })
          else if (n === 'downloading') u.emit({ phase: 'downloading', version: '0.6.1', percent: 42, lastCheckAt: Date.now() })
          return u.state.phase
        },
        install: async () => { u.calls.push(['install', performance.now()]); return true },
        openRelease: async () => { u.calls.push(['openRelease']) },
        onState: (f) => { fns.add(f); return () => fns.delete(f) }
      }
    })
    await H.mockAudio(page)
    await page.goto('http://localhost:5231/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })

    const calls = () => page.evaluate(() => window.__upd.calls)
    ok('na abertura, avisa o main com a chave ligada (padrão)', (await calls()).some((c) => c[0] === 'configure' && c[1] === true), JSON.stringify(await calls()))

    // Sem versão: a plaquinha não aparece.
    // Visível/escondida depois da transição (o runner com o visual rodando atrasa os quadros): sonda até 4 s.
    const isShown = () => page.evaluate(() => {
      const el = document.querySelector('.strip-wrap > .upd')
      return !!el && getComputedStyle(el).visibility === 'visible'
    })
    const shown = async (want = true) => {
      const end = Date.now() + 4000
      for (;;) {
        const v = await isShown()
        if (v === want || Date.now() > end) return v
        await page.waitForTimeout(100)
      }
    }
    const hidden = async () => !(await shown(false))
    // Botão da plaquinha: acorda a faixa, confere que o ponteiro alcança o botão (nada por cima) e clica
    // pelo DOM (o page.click espera o "estável" e, num runner lento, a faixa volta ao ocioso no meio).
    // Espera do estado (spec 035): depois de mexer o mouse, a página sonda a cada quadro, por até 2 s, se o
    // `elementFromPoint` cai dentro do botão e, no mesmo instante, clica — num runner lento as idas e vindas
    // ao Playwright passam dos 2,5 s do ocioso. Acorda a faixa de novo a cada tentativa, até 5 s (no mínimo
    // 3 tentativas); vale o resultado da última.
    const hits = []
    const reachAndClick = (e) => new Promise((res) => {
      const reach = () => { const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!top && e.contains(top) }
      const t0 = performance.now()
      const tick = () => {
        if (reach()) { e.click(); res(true); return }
        if (performance.now() - t0 > 2000) { res(false); return }
        requestAnimationFrame(tick)
      }
      tick()
    })
    const press = async (sel) => {
      const end = Date.now() + 5000
      let hit = false
      for (let i = 0; ; i++) {
        await page.mouse.move(600 + (i % 2) * 10, 500); await page.mouse.move(605 + (i % 2) * 10, 505)
        hit = await page.$eval(sel, reachAndClick)
        if (hit || (i >= 2 && Date.now() > end)) break
      }
      hits.push(hit)
      if (!hit) await page.$eval(sel, (e) => e.click())
    }
    await page.mouse.move(600, 500); await page.mouse.move(610, 500)
    ok('sem versão nova, nada acima da faixa', (await hidden()))

    // Pronta (instalador).
    await page.evaluate(() => window.__upd.emit({ phase: 'ready', version: '0.6.1', percent: 100 }))
    await page.mouse.move(600, 520)
    await page.waitForTimeout(500)
    const n1 = await page.evaluate(() => {
      const el = document.querySelector('.strip-wrap > .upd')
      const strip = document.querySelector('.strip').getBoundingClientRect()
      const r = el.getBoundingClientRect()
      return {
        text: el.textContent,
        role: el.getAttribute('role'), live: el.getAttribute('aria-live'),
        btns: [...el.querySelectorAll('button')].map((x) => x.textContent.trim()),
        above: r.bottom <= strip.top + 1, left: Math.abs(r.left - strip.left) < 2,
        beforeStrip: !!(el.compareDocumentPosition(document.querySelector('.strip')) & Node.DOCUMENT_POSITION_FOLLOWING)
      }
    })
    ok('pronta: aparece com a faixa', await shown())
    ok('pronta: "Sonic Obsidian 0.6.1 está pronta"', /Sonic Obsidian 0\.6\.1 está pronta/.test(n1.text), n1.text)
    ok('pronta: O que mudou → Reiniciar e atualizar → Depois', JSON.stringify(n1.btns) === JSON.stringify(['O que mudou', 'Reiniciar e atualizar', 'Depois']), JSON.stringify(n1.btns))
    ok('acima da faixa, alinhada à esquerda dela', n1.above && n1.left, JSON.stringify(n1))
    ok('role=status + aria-live=polite, e vem antes da faixa na ordem de Tab', n1.role === 'status' && n1.live === 'polite' && n1.beforeStrip)

    // Some no ocioso (com a faixa).
    await page.waitForFunction(() => document.body.classList.contains('idle'), null, { timeout: 6000 }).catch(() => {})
    await page.waitForTimeout(300)
    ok('some no ocioso, com a faixa', (await hidden()))
    await page.mouse.move(600, 500); await page.mouse.move(620, 500)
    await page.waitForTimeout(400)

    // Modo limpo (T) e painéis abertos escondem.
    await page.keyboard.press('t'); await page.waitForTimeout(400)
    ok('Modo limpo: não aparece', (await hidden()))
    await page.keyboard.press('t'); await page.waitForTimeout(400)
    await page.mouse.move(600, 510)
    ok('Modo limpo desligado: volta', await shown())
    await page.keyboard.press('l'); await page.waitForTimeout(400)
    ok('Biblioteca aberta: esconde', (await hidden()))
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    await page.mouse.move(600, 520)

    // "O que mudou" abre a página da versão pelo main.
    await press('.upd button:has-text("O que mudou")')
    ok('"O que mudou" pede ao main a página da versão', (await calls()).some((c) => c[0] === 'openRelease'))

    // "Depois": some até a próxima abertura; a mesma versão não volta, uma mais nova volta.
    await press('.upd button:has-text("Depois")')
    await page.waitForTimeout(400)
    ok('"Depois" esconde', (await hidden()))
    await page.evaluate(() => window.__upd.emit({ phase: 'ready', version: '0.6.1' }))
    await page.mouse.move(600, 500); await page.waitForTimeout(300)
    ok('a mesma versão não volta nesta abertura', (await hidden()))
    await page.evaluate(() => window.__upd.emit({ phase: 'ready', version: '0.6.2' }))
    await page.mouse.move(600, 520); await page.waitForTimeout(400)
    ok('uma versão mais nova volta', await shown() && /0\.6\.2/.test(await page.$eval('.upd', (e) => e.textContent)))

    // Busca rápida: "Reiniciar e atualizar" só com versão pronta.
    await page.keyboard.press('/')
    await page.keyboard.type('atualiz')
    await page.waitForTimeout(200)
    const cmdsReady = await page.$$eval('.prow.cmd .r-title', (els) => els.map((e) => e.textContent))
    ok('busca: "Verificar atualizações" e "Reiniciar e atualizar" com versão pronta', cmdsReady.includes('Verificar atualizações') && cmdsReady.includes('Reiniciar e atualizar'), JSON.stringify(cmdsReady))
    await page.keyboard.press('Escape')

    // Reiniciar e atualizar: "Atualizando…" no lugar e, ~800 ms depois, o pedido ao main.
    // O clique de verdade vem com pointerdown, que acorda a faixa; o clique pelo DOM não — no runner lento a
    // faixa pode já estar no ocioso quando ele chega. Mandar o pointerdown junto imita o clique do usuário.
    await page.mouse.move(600, 500); await page.mouse.move(605, 505); await shown()
    const t0 = await page.$eval('.upd .btn-primary', (e) => { const t = performance.now(); e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); e.click(); return t })
    const busy = await page.$eval('.upd', (e) => e.textContent)
    ok('"Atualizando… o app reabre sozinho" no lugar', /Atualizando… o app reabre sozinho/.test(busy), busy)
    await H.poll(page, () => window.__upd.calls.some((c) => c[0] === 'install'), { timeout: 15000 })
    const inst = (await calls()).find((c) => c[0] === 'install')
    ok('pede ao main para instalar ~800 ms depois (o texto fica na tela antes)', !!inst && inst[1] - t0 >= 750, inst ? `${Math.round(inst[1] - t0)} ms` : 'sem chamada')
    await page.waitForTimeout(3200)
    const pin = await page.evaluate(() => ({ body: document.body.className, text: document.querySelector('.upd')?.textContent }))
    ok('a faixa fica presa visível enquanto atualiza (sem ocioso)', !/\bidle\b/.test(pin.body) && (await shown()), JSON.stringify(pin))

    // Zip portátil: "Versão 0.6.3 disponível" + "Abrir página da versão".
    await page.evaluate(() => window.__upd.emit({ phase: 'available', version: '0.6.3', portable: true }))
    await page.mouse.move(600, 520); await page.waitForTimeout(400)
    const p = await page.$eval('.upd', (e) => ({ text: e.textContent, btns: [...e.querySelectorAll('button')].map((x) => x.textContent.trim()) }))
    ok('portátil: "Versão 0.6.3 disponível" com "Abrir página da versão" e "Depois"', /Versão 0\.6\.3 disponível/.test(p.text) && JSON.stringify(p.btns) === JSON.stringify(['Abrir página da versão', 'Depois']), JSON.stringify(p))
    const before = (await calls()).filter((c) => c[0] === 'openRelease').length
    await press('.upd .btn-primary')
    ok('portátil: o botão abre a página (pelo main), sem instalar', (await calls()).filter((c) => c[0] === 'openRelease').length === before + 1)

    // Configurações › Sobre › Atualizações.
    await page.evaluate(() => window.__upd.emit({ phase: 'idle', version: null, portable: false }))
    await page.keyboard.press('Control+,')
    await page.waitForSelector('.settings [data-sec="sobre"]', { state: 'attached', timeout: 15000 })
    await page.$eval('.settings [data-sec="sobre"]', (e) => e.click())
    await page.waitForSelector('#st-upd-auto', { state: 'attached', timeout: 15000 })
    const s0 = await page.evaluate(() => ({
      grp: [...document.querySelectorAll('.settings .grp h3')].map((h) => h.textContent),
      checked: document.querySelector('#st-upd-auto').checked,
      ver: document.querySelector('.upd-ver')?.textContent || '',
      last: document.querySelector('.upd-last')?.textContent || ''
    }))
    ok('Sobre: grupo "Atualizações" logo depois de "Aplicativo"', s0.grp.indexOf('Atualizações') === s0.grp.indexOf('Aplicativo') + 1, JSON.stringify(s0.grp))
    ok('Sobre: versão instalada "Sonic Obsidian · 0.5.0" com "O que mudou"', /Sonic Obsidian · 0\.5\.0/.test(s0.ver) && /O que mudou/.test(s0.ver), s0.ver)
    ok('Sobre: chave ligada por padrão; ainda não verificado', s0.checked && /Ainda não verificado/.test(s0.last), JSON.stringify(s0))

    await page.$eval('#st-upd-auto', (e) => e.click())
    await page.waitForTimeout(300)
    ok('desligar a chave avisa o main e salva', (await calls()).some((c) => c[0] === 'configure' && c[1] === false) && (await page.evaluate(() => window.__saves.at(-1)?.updatesAuto)) === false)

    const status = () => page.$eval('.upd-st', (e) => e.textContent)
    const nowBtn = '.settings .row:has(.upd-st) .ctl button'
    await page.$eval(nowBtn, (e) => e.click())
    ok('Verificar agora (com a chave desligada): "Verificando…" e o botão desabilitado', await H.poll(page, () => /Verificando…/.test(document.querySelector('.upd-st').textContent) && document.querySelector('.settings .row:has(.upd-st) .ctl button').disabled, { timeout: 1000, every: 50 }))
    await H.poll(page, () => !/Verificando/.test(document.querySelector('.upd-st').textContent), { timeout: 15000 })
    ok('→ "Você está na versão mais nova." e a última verificação de hoje', /Você está na versão mais nova\./.test(await status()) && /Última verificação: hoje, \d{2}:\d{2}/.test(await page.$eval('.upd-last', (e) => e.textContent)), await status())

    await page.evaluate(() => { window.__upd.next = 'error' })
    await page.$eval(nowBtn, (e) => e.click()); await H.poll(page, () => /Não deu/.test(document.querySelector('.upd-st').textContent), { timeout: 15000 })
    ok('erro só aqui: "Não deu para verificar agora…"', /Não deu para verificar agora\. Confira a conexão e tente de novo\./.test(await status()))

    await page.evaluate(() => { window.__upd.next = 'downloading' })
    await page.$eval(nowBtn, (e) => e.click()); await H.poll(page, () => /42/.test(document.querySelector('.upd-st').textContent), { timeout: 15000 })
    const dl = await page.evaluate(() => ({ st: document.querySelector('.upd-st').textContent, cy: document.querySelector('.upd-st .cy')?.textContent, bar: !!document.querySelector('.settings .prog'), dis: document.querySelector('.settings .row:has(.upd-st) .ctl button').disabled }))
    ok('baixando: "Baixando 42%" em ciano, com a linha de progresso e o botão desabilitado', /Baixando 42%/.test(dl.st) && dl.cy === '42%' && dl.bar && dl.dis, JSON.stringify(dl))
    await page.evaluate(() => window.__upd.emit({ phase: 'ready', version: '0.6.4', percent: 100 }))
    await page.waitForTimeout(200)
    const rd = await page.evaluate(() => ({ st: document.querySelector('.upd-st').textContent, btn: document.querySelector('.settings .row:has(.upd-st) .ctl button').textContent }))
    ok('pronta: "Versão 0.6.4 pronta." e o botão vira "Reiniciar e atualizar"', /Versão 0\.6\.4 pronta\./.test(rd.st) && rd.btn === 'Reiniciar e atualizar', JSON.stringify(rd))
    ok('o ponteiro alcança os botões da plaquinha (nada por cima)', hits.length >= 3 && hits.every(Boolean), JSON.stringify(hits))
    ok('nenhum erro de página', errs.length === 0, errs.join(' | '))
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
