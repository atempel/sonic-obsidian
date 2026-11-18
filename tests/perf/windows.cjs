// Desempenho no app empacotado (spec 025, P1): abertura, ms por quadro e memória, comparando builds.
// Uso: `npm run dist:win` e depois `npm run perf:win` (no CI: passo do job build-windows). Fora do
// Windows sai com aviso, sem erro — a não ser que PERF_EXE aponte um executável (ver abaixo).
// Precisa do `playwright` (no CI: `npm install --no-save playwright@1.63.0`, sem baixar navegador).
//
// O runner não tem loopback nem GPU: o getDisplayMedia responde com o bumbo sintético do harness
// (124 BPM) e o desenho é por software (WARP/SwiftShader). Os números servem para comparar builds
// entre si, não como fps real. O passo só falha se o script quebrar (o app não abre, um preset não
// desenha); número pior nunca falha (limites ficam para uma spec futura).
//
// Variáveis de ambiente:
//   PERF_EXE          executável (padrão: release/win-unpacked/Sonic Obsidian.exe)
//   PERF_ARGS         JSON com argumentos extras (ex.: '[".","--no-sandbox"]' para o electron de dev no Linux)
//   PERF_OUT          onde gravar o perf.json (padrão: perf.json na raiz)
//   PERF_PREV         perf.json da execução anterior, para o resumo lado a lado (ausente = só os números)
//   PERF_TEST_FLAGS   test-flags.json copiado para cada perfil temporário (spec 012; ex.: noWebgl2 → o passo falha)
//   PERF_QUICK=1      versão curta para conferir o script (2 presets, 1 abertura, 20 s de memória)
//   GITHUB_STEP_SUMMARY  recebe o resumo em markdown
const fs = require('fs'), path = require('path'), os = require('os')

const root = path.join(__dirname, '..', '..')
const QUICK = process.env.PERF_QUICK === '1'
const OPENS = QUICK ? 1 : 3
const PRESET_SETTLE_MS = 1000, PRESET_SAMPLE_MS = QUICK ? 2000 : 5000
const MEMORY_MS = QUICK ? 20_000 : 5 * 60_000, MEMORY_STEP_MS = 2000
const STARTUP_RE = /startup \(ms since process start\): (.*)$/
// Sem GPU no runner: deixa o Chromium usar o desenho por software em vez de recusar o WebGL.
const CHROMIUM_ARGS = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

if (process.platform !== 'win32' && !process.env.PERF_EXE) {
  console.warn('perf:win: só roda no Windows (app empacotado em release/win-unpacked/). Nada a fazer aqui.')
  process.exit(0)
}

const { _electron } = require('playwright')
const H = require('../headless/harness.cjs')

const exe = process.env.PERF_EXE || path.join(root, 'release', 'win-unpacked', 'Sonic Obsidian.exe')
const extraArgs = process.env.PERF_ARGS ? JSON.parse(process.env.PERF_ARGS) : []
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'presets.json'), 'utf8')).presets.slice(0, QUICK ? 2 : undefined)

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null }
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] : null }
const round = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Perfil novo a cada abertura: sem settings.json de ninguém, sem a tela de boas-vindas.
function profile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'so-perf-'))
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ welcomeSeen: true }))
  if (process.env.PERF_TEST_FLAGS) fs.copyFileSync(process.env.PERF_TEST_FLAGS, path.join(dir, 'test-flags.json'))
  return dir
}

async function launch(dir) {
  const app = await _electron.launch({
    executablePath: exe,
    args: [...extraArgs, `--user-data-dir=${dir}`, ...CHROMIUM_ARGS],
    cwd: root,
    timeout: 60_000
  })
  return app
}

// A linha de abertura do log (src/main/startup.ts): sai quando chegam "first frame" e "capture", ou aos 20 s.
async function startupLine(dir, timeout = 40_000) {
  const file = path.join(dir, 'logs', 'sonic-obsidian.log')
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const line = text.split('\n').map((l) => STARTUP_RE.exec(l)).find(Boolean)
    if (line) return Object.fromEntries(line[1].split(' · ').map((p) => { const m = /^(.*) (\d+)$/.exec(p.trim()); return [m[1], Number(m[2])] }))
    await sleep(250)
  }
  const tail = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').slice(-15).join('\n') : '(sem log)'
  throw new Error(`a linha de abertura não apareceu no log em ${timeout / 1000} s. Fim do log:\n${tail}`)
}

async function measureStartup() {
  const runs = []
  for (let i = 0; i < OPENS; i++) {
    const dir = profile()
    const app = await launch(dir)
    try {
      const marks = await startupLine(dir)
      if (marks['first frame'] == null) throw new Error(`abertura ${i + 1}: o app abriu mas não desenhou (sem "first frame"): ${JSON.stringify(marks)}`)
      runs.push(marks)
      console.log(`abertura ${i + 1}: primeiro quadro em ${marks['first frame']} ms`, JSON.stringify(marks))
    } finally {
      await app.close().catch(() => {})
    }
  }
  const names = [...new Set(runs.flatMap((r) => Object.keys(r)))]
  const med = Object.fromEntries(names.map((n) => [n, median(runs.map((r) => r[n]).filter((v) => v != null))]))
  return { runs, median: med }
}

async function heapMb(page) {
  try {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('HeapProfiler.collectGarbage')
    const { usedSize } = await cdp.send('Runtime.getHeapUsage')
    await cdp.detach()
    return round(usedSize / 1048576)
  } catch {
    return round((await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0)) / 1048576)
  }
}

async function processes(app) {
  const list = await app.evaluate(({ app }) => app.getAppMetrics().map((m) => ({ type: m.type, name: m.name || '', mb: Math.round(m.memory.workingSetSize / 1024) })))
  return { totalMb: list.reduce((s, p) => s + p.mb, 0), list }
}

// Toca um preset pela busca (Ctrl+K), clicando na linha com o nome exato, e confere que entrou.
async function play(page, name) {
  await page.mouse.move(640, 360)
  await page.keyboard.press('Control+KeyK')
  // Esperas por estado, largas: o runner Windows sem GPU leva 100–165 ms por quadro e já estourou
  // os 5 s com o campo visível (#133). Quando passa, nada fica mais lento.
  await page.waitForSelector('.palette input', { state: 'visible', timeout: 15000 })
  await page.fill('.palette input', name)
  const found = await H.poll(page, (n) => [...document.querySelectorAll('.palette .r-btn')].some((e) => e.title === n), { arg: name, timeout: 15000, every: 100 })
  const clicked = found && await page.evaluate((n) => { const b = [...document.querySelectorAll('.palette .r-btn')].find((e) => e.title === n); if (b) b.click(); return !!b }, name)
  if (!clicked) throw new Error(`preset não encontrado na busca: ${name}`)
  const okNow = await H.poll(page, (n) => document.querySelector('.now-title')?.getAttribute('title') === n, { arg: name, timeout: 15000 })
  if (!okNow) throw new Error(`o preset não entrou: ${name}`)
}

async function measureRenderAndMemory() {
  const dir = profile()
  const app = await launch(dir)
  try {
    const version = await app.evaluate(({ app }) => app.getVersion())
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(1280, 720))
    const page = await app.firstWindow()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e)))
    // Áudio sintético a partir daqui: o init script vale na próxima carga.
    await H.mockAudio(page, { bpm: 124 })
    await page.reload()
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30_000 })
    await page.evaluate(() => {
      window.__ft = []
      let last = performance.now()
      const tick = (t) => { window.__ft.push(t - last); last = t; requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })
    await page.waitForTimeout(2000)
    const audio = await page.evaluate(() => typeof window.__audio === 'function')
    if (!audio) console.warn('aviso: o getDisplayMedia simulado não foi chamado (a captura pode estar usando o loopback real)')

    // Render: 1 s de transição, depois 5 s de amostra por preset.
    const presets = []
    for (const name of sample) {
      await play(page, name)
      await page.waitForTimeout(PRESET_SETTLE_MS)
      await page.evaluate(() => { window.__ft = [] })
      await page.waitForTimeout(PRESET_SAMPLE_MS)
      const ft = await page.evaluate(() => window.__ft.slice())
      if (ft.length < 2) throw new Error(`o preset não desenhou (${ft.length} quadros em ${PRESET_SAMPLE_MS / 1000} s): ${name}`)
      presets.push({ name, frames: ft.length, medianMs: round(median(ft)), p95Ms: round(pct(ft, 0.95)) })
      console.log(`render: ${median(ft).toFixed(1)} ms (p95 ${pct(ft, 0.95).toFixed(1)}) · ${ft.length} quadros · ${name}`)
    }
    const render = { windowPx: '1280x720', sampleSeconds: PRESET_SAMPLE_MS / 1000, medianMs: round(median(presets.map((p) => p.medianMs))), p95Ms: round(median(presets.map((p) => p.p95Ms))), presets }

    // Memória: trocas a cada 2 s pela lista inteira (→ anda em ordem alfabética e dá a volta).
    await page.mouse.move(640, 360)
    const start = { heapMb: await heapMb(page), processes: await processes(app) }
    const t0 = Date.now(); let switches = 0
    while (Date.now() - t0 < MEMORY_MS) {
      await page.keyboard.press('ArrowRight'); switches++
      await page.waitForTimeout(MEMORY_STEP_MS)
    }
    const end = { heapMb: await heapMb(page), processes: await processes(app) }
    const memory = { seconds: Math.round((Date.now() - t0) / 1000), switches, start, end }
    console.log(`memória: heap ${start.heapMb} → ${end.heapMb} MB · processos ${start.processes.totalMb} → ${end.processes.totalMb} MB · ${switches} trocas`)
    if (errs.length) console.warn('erros na página:', errs.slice(0, 5).join(' | '))
    return { version, render, memory, pageErrors: errs.slice(0, 20) }
  } finally {
    await app.close().catch(() => {})
  }
}

function summary(cur, prev) {
  const fmt = (v, u = '') => (v == null ? '—' : `${v}${u}`)
  const delta = (a, b) => (a == null || b == null ? '' : ` (${a - b >= 0 ? '+' : ''}${round(a - b)})`)
  const row = (label, a, b, u) => `| ${label} | ${fmt(a, u)}${delta(a, b)} | ${prev ? fmt(b, u) : '—'} |`
  const st = (r, n) => r?.startup?.median?.[n]
  const marks = [...new Set([...Object.keys(cur.startup.median), ...Object.keys(prev?.startup?.median ?? {})])]
  const lines = [
    `## Desempenho (spec 025) — ${cur.version} · ${cur.sha.slice(0, 7)}`,
    prev ? `Comparado com a execução anterior: ${prev.version} · ${String(prev.sha).slice(0, 7)} (${prev.date}).` : 'Sem execução anterior com `perf.json`: só os números desta.',
    'Desenho por software no runner (WARP/SwiftShader): serve para comparar builds, não como fps real.',
    '',
    '| Medida | Esta execução | Anterior |',
    '|---|---|---|',
    row(`**Abertura: primeiro quadro** (mediana de ${cur.startup.runs.length})`, st(cur, 'first frame'), st(prev, 'first frame'), ' ms'),
    row('**Render: ms por quadro** (mediana dos presets)', cur.render.medianMs, prev?.render?.medianMs, ' ms'),
    row('**Render: p95** (mediana dos presets)', cur.render.p95Ms, prev?.render?.p95Ms, ' ms'),
    row('**Memória: heap JS do renderer**, começo', cur.memory.start.heapMb, prev?.memory?.start?.heapMb, ' MB'),
    row(`**Memória: heap JS do renderer**, fim (${cur.memory.seconds} s, ${cur.memory.switches} trocas)`, cur.memory.end.heapMb, prev?.memory?.end?.heapMb, ' MB'),
    row('**Memória: todos os processos**, começo', cur.memory.start.processes.totalMb, prev?.memory?.start?.processes?.totalMb, ' MB'),
    row('**Memória: todos os processos**, fim', cur.memory.end.processes.totalMb, prev?.memory?.end?.processes?.totalMb, ' MB'),
    '',
    '<details><summary>Etapas da abertura (mediana, ms desde o processo)</summary>',
    '',
    '| Etapa | Esta | Anterior |',
    '|---|---|---|',
    ...marks.map((n) => row(n, st(cur, n), st(prev, n), '')),
    '',
    '</details>',
    '',
    '<details><summary>Render por preset (ms por quadro: mediana / p95)</summary>',
    '',
    '| Preset | Esta | Anterior |',
    '|---|---|---|',
    ...cur.render.presets.map((p) => { const q = prev?.render?.presets?.find((x) => x.name === p.name); return `| ${p.name.replace(/\|/g, '\\|')} | ${p.medianMs} / ${p.p95Ms} | ${q ? `${q.medianMs} / ${q.p95Ms}` : '—'} |` }),
    '',
    '</details>',
    '',
    '<details><summary>Memória por processo (MB, começo → fim)</summary>',
    '',
    ...cur.memory.end.processes.list.map((p) => `- ${p.type}${p.name ? ` (${p.name})` : ''}: ${cur.memory.start.processes.list.find((q) => q.type === p.type && q.name === p.name)?.mb ?? '—'} → ${p.mb}`),
    '',
    '</details>'
  ]
  return lines.join('\n') + '\n'
}

;(async () => {
  if (!fs.existsSync(exe)) throw new Error(`executável não encontrado: ${exe} (rode npm run dist:win antes)`)
  const t0 = Date.now()
  const startup = await measureStartup()
  const rm = await measureRenderAndMemory()
  const cur = {
    schema: 1,
    version: rm.version,
    sha: process.env.GITHUB_SHA || '',
    date: new Date().toISOString(),
    runner: `${os.platform()} ${os.release()} · ${os.cpus()[0]?.model ?? '?'} × ${os.cpus().length}`,
    quick: QUICK,
    startup,
    render: rm.render,
    memory: rm.memory,
    pageErrors: rm.pageErrors,
    seconds: Math.round((Date.now() - t0) / 1000)
  }
  const out = process.env.PERF_OUT || path.join(root, 'perf.json')
  fs.writeFileSync(out, JSON.stringify(cur, null, 2))
  let prev = null
  if (process.env.PERF_PREV && fs.existsSync(process.env.PERF_PREV)) {
    try { prev = JSON.parse(fs.readFileSync(process.env.PERF_PREV, 'utf8')) } catch (e) { console.warn('perf.json anterior ilegível:', e.message) }
  }
  const md = summary(cur, prev)
  console.log('\n' + md)
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
  console.log(`perf: ${out} · ${cur.seconds} s no total`)
})().catch((e) => { console.error('perf: falhou —', e && e.stack || e); process.exit(1) })
