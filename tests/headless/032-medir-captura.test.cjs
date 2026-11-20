// "Medir atraso da captura" (spec 032, P1, critério 7). Sem navegador: src/renderer/src/capture-latency.ts
// transpilado (detector do clique, gravador pelo relógio do áudio, mediana, medição completa num relógio falso
// com atraso conhecido). No Chromium headless: o comando na busca, um "loopback" simulado que devolve o
// clique pela captura com ~40 ms, o toast e a linha `[sync] measured capture` do log; com o som mudo, o aviso.
// O número de verdade (loopback do Windows) só no bloco.
const path = require('path'), fs = require('fs'), Module = require('module')
const ts = require('typescript')
const H = require('./harness.cjs')
const R = H.createResults('032-medir-captura')
const ok = R.ok

function load() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'renderer', 'src', 'capture-latency.ts'), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = new Module('capture-latency.js')
  m._compile(js, 'capture-latency.js')
  return m.exports
}

// Ruído pseudoaleatório estável.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1 }

async function unitTests() {
  const L = load()
  const sr = 48000
  const click = L.clickSamples(sr)
  ok('u1 clique: 10 ms, pico perto de −20 dBFS', click.length === 480 && Math.abs(Math.max(...click.map(Math.abs)) - 0.1) < 0.01)

  // Sinal com música grave (bumbo de 55 Hz) + ruído baixo, clique no meio de [0,25 s; 1,25 s].
  const make = ({ music = 0.3, noise = 0.002, clickAt = -1, seed = 1 } = {}) => {
    const r = rng(seed), s = new Float32Array(sr * 1.5)
    for (let i = 0; i < s.length; i++) s[i] = music * Math.sin(2 * Math.PI * 55 * i / sr) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * i / sr)) + noise * r()
    if (clickAt >= 0) for (let i = 0; i < click.length; i++) s[clickAt + i] += click[i]
    return s
  }
  const from = Math.round(0.25 * sr), to = Math.round(1.25 * sr)
  const at = Math.round(0.292 * sr)
  const found = L.findClick(make({ clickAt: at }), sr, from, to)
  ok('u2 acha o clique sobre um bumbo grave (meio do clique ±1 ms)', Math.abs(found - (at + 240)) < sr / 1000, String(found - at))
  ok('u3 sem clique: não acha', L.findClick(make(), sr, from, to) === -1)
  ok('u4 som mudo (clique fora da janela, só zeros): não acha', L.findClick(new Float32Array(sr * 1.5), sr, from, to) === -1)
  const loud = make({ music: 0, noise: 0.5, clickAt: at, seed: 3 })
  ok('u5 som muito alto (ruído largo a −6 dBFS): não acha', L.findClick(loud, sr, from, to) === -1)
  ok('u6 mediana', L.median([42, 40, 70]) === 42 && L.median([40, 44]) === 42)

  // Medição completa, em tempo real, com um relógio de áudio falso (blocos de 128 amostras) e um player
  // que "toca" o clique e o devolve pela captura 42 ms depois.
  const t0 = performance.now()
  const now = () => performance.now() - t0
  const clock = { sampleRate: sr, get currentTime() { return Math.floor(now() / 1000 * sr / 128) * 128 / sr } }
  const run = async (delayMs, { silent = false } = {}) => {
    const clicks = []
    const r = rng(7)
    const signal = (i) => {
      const t = i / sr * 1000
      let v = silent ? 0 : 0.2 * Math.sin(2 * Math.PI * 60 * i / sr) + 0.001 * r()
      if (!silent) for (const c of clicks) { const k = Math.round((t - c - delayMs) / 1000 * sr); if (k >= 0 && k < click.length) v += click[k] }
      return v
    }
    const tap = { fftSize: 16384, getFloatTimeDomainData(out) { const end = Math.round(clock.currentTime * sr); for (let j = 0; j < out.length; j++) out[j] = signal(end - out.length + j) } }
    const player = { play() { const at = now() + 100; clicks.push(at); return at }, close() {} }
    return L.measureCapture(tap, clock, player, now)
  }
  const m = await run(42)
  ok('u7 medição: mediana ≈ 42 ms (±3) com três cliques achados', m.ms !== null && Math.abs(m.ms - 42) < 3 && m.runs.every((v) => v !== null), JSON.stringify(m))
  const spread = Math.max(...m.runs) - Math.min(...m.runs)
  ok('u8 variação entre os três menor que 20 ms', spread < 20, String(spread))
  const s = await run(42, { silent: true })
  ok('u9 som mudo: sem resultado e os três vazios', s.ms === null && s.runs.every((v) => v === null), JSON.stringify(s))
}

// "Loopback" do teste: a captura simulada passa a sair de um AudioContext próprio, que recebe o som do
// mockAudio e, 40 ms depois, cada clique curto que outro AudioContext da página tocar. window.__lbOff corta.
async function mockLoopback(page) {
  await page.addInitScript(() => {
    const orig = navigator.mediaDevices.getDisplayMedia
    navigator.mediaDevices.getDisplayMedia = async (...a) => {
      const s = await orig.apply(navigator.mediaDevices, a)
      const lb = new AudioContext(); const d = lb.createMediaStreamDestination()
      lb.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(d)
      window.__lb = { ctx: lb, dest: d, n: 0 }
      const out = d.stream; for (const v of s.getVideoTracks()) out.addTrack(v); return out
    }
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (when = 0, ...rest) {
      const lb = window.__lb
      if (lb && !window.__lbOff && this.context !== lb.ctx && this.buffer && this.buffer.duration < 0.02) {
        const atPerf = performance.now() + Math.max(0, when - this.context.currentTime) * 1000 + 40
        const b = lb.ctx.createBuffer(1, this.buffer.length, this.buffer.sampleRate); b.copyToChannel(this.buffer.getChannelData(0), 0)
        const src = lb.ctx.createBufferSource(); src.buffer = b; src.connect(lb.dest)
        start.call(src, lb.ctx.currentTime + (atPerf - performance.now()) / 1000)
        lb.n++
      }
      return start.call(this, when, ...rest)
    }
  })
}

;(async () => {
  await unitTests()
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: pulando a parte do navegador'); process.exit(await R.finish()) }
  const srv = H.serve(5255)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1400, height: 860 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false } } })
    await H.mockAudio(page)
    await mockLoopback(page)
    await page.goto('http://localhost:5255/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
    await H.poll(page, () => window.__logs.some((l) => l.startsWith('[sync] capture started')), { timeout: 10000 })
    const toast = () => page.evaluate(() => document.querySelector('.gtoast')?.textContent || '')
    const runCmd = async (q, label) => {
      await page.keyboard.press('/'); await page.waitForTimeout(200)
      await page.keyboard.type(q); await page.waitForTimeout(250)
      const c = await page.$$eval('.prow.cmd .r-title', (els) => els.map((e) => e.textContent))
      const found = c.includes(label)
      if (found) await page.evaluate((label) => [...document.querySelectorAll('.prow.cmd')].find((e) => e.textContent.includes(label)).querySelector('.r-btn').click(), label)
      else await page.keyboard.press('Escape')
      return { found, c }
    }

    // 7a. O comando na busca, em português.
    const c1 = await runCmd('medir', 'Medir atraso da captura')
    ok('7a busca "medir" acha "Medir atraso da captura"', c1.found, JSON.stringify(c1.c))
    await page.waitForTimeout(300)
    ok('7b toast "Medindo"', /Medindo/.test(await toast()), await toast())
    const done = () => H.poll(page, () => window.__logs.some((l) => l.startsWith('[sync] measured capture')), { timeout: 12000 })
    ok('7c termina em menos de 12 s', await done())
    const line = await page.evaluate(() => window.__logs.find((l) => l.startsWith('[sync] measured capture')))
    const ms = Number((line.match(/measured capture ([\d.]+) ms/) || [])[1])
    const runs = ((line.match(/ms \(([^)]*) ms\)/) || [])[1] || '').split(', ').map(Number)
    ok('7d log: "[sync] measured capture <n> ms (três cliques)" com a linha sync', Number.isFinite(ms) && runs.length === 3 && / · sync · capture /.test(line), line)
    ok('7e loopback simulado de 40 ms: resultado entre 20 e 150 ms', ms >= 20 && ms <= 150, String(ms))
    ok('7f os três cliques com variação menor que 20 ms', runs.every(Number.isFinite) && Math.max(...runs) - Math.min(...runs) < 20, JSON.stringify(runs))
    ok('7g toast "Captura: <n> ms"', new RegExp(`Captura: ${Math.round(ms)} ms`).test(await toast()), await toast())

    // 7h. Som do sistema mudo (nada volta pela captura): o aviso.
    await page.evaluate(() => { window.__lbOff = true; window.__audio('silence') })
    await page.waitForTimeout(1500) // o toast anterior some
    const n0 = await page.evaluate(() => window.__logs.length)
    await runCmd('medir', 'Medir atraso da captura')
    await H.poll(page, (n0) => window.__logs.slice(n0).some((l) => l.startsWith('[sync] measured capture')), { timeout: 12000, arg: n0 })
    const fail = await page.evaluate((n0) => window.__logs.slice(n0).find((l) => l.startsWith('[sync] measured capture')), n0)
    ok('7h mudo: log "no click found"', /no click found \(none, none, none ms\)/.test(fail || ''), fail)
    ok('7i mudo: toast "Não deu para medir"', /Não deu para medir: o som do sistema está mudo ou muito alto/.test(await toast()), await toast())

    ok('sem erros na página', errs.length === 0, JSON.stringify(errs.slice(0, 5)))
  } finally {
    const code = await R.finish()
    await b.close(); srv.close(); process.exit(code)
  }
})().catch((e) => { R.dump(); console.error(e); process.exit(1) })
