// Memória do renderer numa sessão longa (spec 034, #98): 150 trocas de preset com o áudio simulado e os
// painéis (Biblioteca, Ajustes rápidos, Configurações) abrindo e fechando. Compara a leitura na troca 50
// com a da 150, depois de uma coleta forçada (CDP HeapProfiler.collectGarbage, o mesmo efeito do
// --expose-gc): heap JS ≤ 8 MB a mais e nós do DOM ≤ 5 % a mais. Painel fechado não deixa nós para trás.
// Só o lado JS/DOM: texturas e buffers do motor (lado nativo) se medem no Windows (perf:win, memória privada).
// Também confere a linha `[mem] heap= nodes=` do log do renderer (src/renderer/src/memory.ts, transpilado).
const H = require('./harness.cjs')
const R = H.createResults('034-memoria')
const ok = R.ok
const path = require('path'), fs = require('fs')

// MEM_SWITCHES=N encurta para conferir o teste (a leitura de comparação fica em N/3). Cada troca leva ~1–3 s
// no Chromium da nuvem (compilação do preset no SwiftShader): as 150 somam ~6 min.
const SWITCHES = Number(process.env.MEM_SWITCHES) || 150, FIRST = Math.round(SWITCHES / 3)
const HEAP_MAX_MB = 8, NODES_MAX = 0.05

// src/renderer/src/memory.ts transpilado (sem DOM real: documento e performance falsos).
function loadMemory() {
  const ts = require('typescript')
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'renderer', 'src', 'memory.ts'), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'document', 'performance', js)(m, m.exports, undefined, undefined)
  return m.exports
}

async function measure(page, cdp) {
  // Duas coletas: a primeira solta o que a finalização da anterior liberou.
  await cdp.send('HeapProfiler.collectGarbage')
  await cdp.send('HeapProfiler.collectGarbage')
  const { usedSize } = await cdp.send('Runtime.getHeapUsage')
  const nodes = await page.evaluate(() => document.getElementsByTagName('*').length)
  return { heapMb: Math.round((usedSize / 1048576) * 10) / 10, nodes }
}

const nodeCount = (page) => page.evaluate(() => document.getElementsByTagName('*').length)
const title = (page) => page.evaluate(() => document.querySelector('.now-title')?.getAttribute('title') || '')

// Troca para o próximo preset e espera o nome mudar (runner lento: espera por estado, spec 035).
async function next(page) {
  const before = await title(page)
  await page.keyboard.press('ArrowRight')
  return H.poll(page, (b) => { const t = document.querySelector('.now-title')?.getAttribute('title') || ''; return !!t && t !== b }, { arg: before, timeout: 15000, every: 50 })
}

// Abre e fecha um painel; devolve se abriu e se fechou.
async function cycle(page, key, isOpen, isClosed) {
  await page.mouse.move(640, 400)
  await page.keyboard.press(key)
  const opened = await H.poll(page, isOpen, { timeout: 10000, every: 50 })
  await page.keyboard.press('Escape')
  let closed = await H.poll(page, isClosed, { timeout: 10000, every: 50 })
  // Esc fecha um nível por vez: se algo de dentro do painel segurou o primeiro, mais um.
  if (!closed) { await page.keyboard.press('Escape'); closed = await H.poll(page, isClosed, { timeout: 5000, every: 50 }) }
  return { opened, closed }
}

const PANELS = [
  ['l', () => document.body.classList.contains('lib-open'), () => !document.body.classList.contains('lib-open'), 'Biblioteca'],
  ['Comma', () => document.body.classList.contains('sheet-open'), () => !document.body.classList.contains('sheet-open'), 'Ajustes rápidos'],
  ['Control+Comma', () => document.querySelector('.settings')?.getAttribute('aria-hidden') === 'false', () => document.querySelector('.settings')?.getAttribute('aria-hidden') !== 'false', 'Configurações']
]

;(async () => {
  // 1. A linha do log, sem navegador.
  const M = loadMemory()
  const fakeDoc = { getElementsByTagName: (t) => ({ length: t === '*' ? 812 : 0 }) }
  ok('1a linha com heap e nós', M.rendererMemLine(M.rendererMem(fakeDoc, { memory: { usedJSHeapSize: 23.44 * 1048576 } })) === 'heap=23.4MB nodes=812', M.rendererMemLine(M.rendererMem(fakeDoc, { memory: { usedJSHeapSize: 23.44 * 1048576 } })))
  ok('1b sem performance.memory: heap=?', M.rendererMemLine(M.rendererMem(fakeDoc, {})) === 'heap=? nodes=812')

  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: parte do navegador pulada'); process.exit(await R.finish()) }
  const srv = H.serve(5260)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1280, height: 800 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false } } })
    await H.mockAudio(page)
    await page.goto('http://localhost:5260/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
    ok('2a o áudio simulado tocando', await H.poll(page, () => typeof window.__audio === 'function', { timeout: 15000 }))
    const cdp = await page.context().newCDPSession(page)

    // 2. Cada painel abre e fecha sem deixar nós para trás (medido depois de um ciclo de aquecimento:
    // o primeiro abrir pode montar o painel de vez, o que não é vazamento).
    for (const [key, isOpen, isClosed, name] of PANELS) {
      await cycle(page, key, isOpen, isClosed)
      await page.waitForTimeout(600)
      const before = await nodeCount(page)
      const r = await cycle(page, key, isOpen, isClosed)
      // Um aviso ou a lista terminando de montar pode durar um instante: espera assentar (spec 035).
      const settled = await H.poll(page, (n) => document.getElementsByTagName('*').length <= n, { arg: before, timeout: 8000, every: 200 })
      const after = await nodeCount(page)
      ok(`2b ${name}: abre e fecha`, r.opened && r.closed, JSON.stringify(r))
      ok(`2c ${name}: fechado, sem nós a mais`, settled, `${before} → ${after}`)
    }

    // 3. 150 trocas; a cada 10, um painel abre e fecha (Biblioteca, Ajustes, Configurações, em rodízio).
    let failedSwitches = 0, failedPanels = 0, at50 = null
    const t0 = Date.now()
    for (let i = 1; i <= SWITCHES; i++) {
      if (!(await next(page))) failedSwitches++
      if (i % 10 === 0) {
        const [key, isOpen, isClosed] = PANELS[(i / 10) % PANELS.length]
        const r = await cycle(page, key, isOpen, isClosed)
        if (!r.opened || !r.closed) failedPanels++
      }
      if (i === FIRST) { await page.waitForTimeout(1500); at50 = await measure(page, cdp) }
    }
    await page.waitForTimeout(1500)
    const at150 = await measure(page, cdp)
    const secs = Math.round((Date.now() - t0) / 1000)
    console.log(`memória: troca ${FIRST} heap ${at50.heapMb} MB · ${at50.nodes} nós → troca ${SWITCHES} heap ${at150.heapMb} MB · ${at150.nodes} nós (${secs} s)`)
    ok(`3a as ${SWITCHES} trocas entraram`, failedSwitches === 0, `${failedSwitches} sem trocar`)
    ok('3b os painéis abriram e fecharam', failedPanels === 0, `${failedPanels} falharam`)
    const dHeap = Math.round((at150.heapMb - at50.heapMb) * 10) / 10
    ok(`3c heap JS: troca ${FIRST} → ${SWITCHES} cresce ≤ ${HEAP_MAX_MB} MB`, dHeap <= HEAP_MAX_MB, `${at50.heapMb} → ${at150.heapMb} MB (${dHeap >= 0 ? '+' : ''}${dHeap})`)
    const dNodes = (at150.nodes - at50.nodes) / at50.nodes
    ok(`3d nós do DOM: troca ${FIRST} → ${SWITCHES} crescem ≤ 5 %`, dNodes <= NODES_MAX, `${at50.nodes} → ${at150.nodes} (${(dNodes * 100).toFixed(1)} %)`)
    ok('3e sem erros na página', errs.length === 0, errs.slice(0, 3).join(' | '))
    await page.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
