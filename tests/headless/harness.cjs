// Harness comum dos testes headless (spec 025). Serve out/renderer, abre o Chromium da nuvem e
// simula window.so e o getDisplayMedia. Vale para layout e estados; áudio real e fps só no Windows.
const { chromium } = require('playwright')
const path = require('path'), http = require('http'), fs = require('fs')

const root = path.join(__dirname, '..', '..', 'out', 'renderer')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }

function serve(port) {
  return http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0])
    const p = path.join(root, u === '/' ? 'index.html' : u)
    fs.readFile(p, (e, d) => {
      if (e) { r.writeHead(404); r.end(); return }
      r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d)
    })
  }).listen(port)
}

function launch() {
  return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
}

// window.so simulado. `settings` e `library` são objetos serializáveis; `logs` (padrão true) guarda
// window.__logs / window.__logT. window.__saves recebe cada library.save (ou, com saveSettings, cada settings.save).
async function mockSo(page, { settings = { welcomeSeen: true }, library, logs = true, saveSettings = false } = {}) {
  const lib = library || { version: 1, favorites: [], hidden: [], hiddenPerf: [], recents: [], presetFps: {}, collections: [] }
  await page.addInitScript(({ settings, lib, logs, saveSettings }) => {
    window.__saves = []; window.__logs = []; window.__logT = []
    window.so = {
      settings: { load: async () => settings, save: async (d) => { if (saveSettings) window.__saves.push(JSON.parse(JSON.stringify(d))) } },
      library: { load: async () => lib, save: async (d) => { if (!saveSettings) window.__saves.push(JSON.parse(JSON.stringify(d))) } },
      window: { toggleFullScreen: async () => {}, minimize: async () => {}, close: async () => {} },
      system: { openSoundSettings: async () => {}, openNotices: async () => '', openLink: async () => {}, copyText: async () => {}, gpuInfo: async () => ({ driver: 'x', ids: 'x' }), testFlags: async () => ({ captureFail: false, noWebgl2: false }) },
      app: { version: async () => '0.5.0' },
      presets: { convertMilk: async () => ({ preset: {}, ms: 0 }), listImported: async () => [], saveImported: async () => {}, removeImported: async () => {}, pickMilk: async () => ({ files: [], tooBig: [], extra: 0 }) },
      collections: { export: async () => ({ ok: true }), import: async () => ({ ok: false, canceled: true }) },
      log: (m) => { if (logs) { window.__logs.push(m); window.__logT.push([performance.now(), m]) } console.log('[so.log]', m) }, mark: () => {}, showLog: async () => {}
    }
  }, { settings, lib, logs, saveSettings })
}

// getDisplayMedia simulado: bumbo sintético em `bpm` (buffer em loop: tempo exato).
// window.__audio('beat' | 'ambient' | 'silence') troca o que toca.
async function mockAudio(page, { bpm = 124 } = {}) {
  await page.addInitScript((bpm) => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const ac = new AudioContext(); const sr = ac.sampleRate; const d = ac.createMediaStreamDestination()
      // Bumbo: seno de 55 Hz com queda rápida + um chimbal curto no contratempo.
      const beatLen = Math.round(sr * 60 / bpm)
      const kick = ac.createBuffer(1, beatLen, sr); const k = kick.getChannelData(0)
      for (let i = 0; i < beatLen; i++) { const t = i / sr; k[i] = 0.8 * Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-t * 30)) * t) * Math.exp(-t * 12) }
      for (let i = 0; i < sr * 0.03; i++) { const j = Math.floor(beatLen / 2) + i; k[j] += 0.08 * (Math.random() * 2 - 1) * Math.exp(-i / sr * 120) }
      // Ambiente: acorde sustentado com variação lenta, sem ataques.
      const ambLen = sr * 4; const amb = ac.createBuffer(1, ambLen, sr); const a = amb.getChannelData(0)
      for (let i = 0; i < ambLen; i++) { const t = i / sr; const lfo = 0.6 + 0.4 * Math.sin(2 * Math.PI * t / 4); a[i] = lfo * 0.15 * (Math.sin(2 * Math.PI * 110 * t) + Math.sin(2 * Math.PI * 164.8 * t) + Math.sin(2 * Math.PI * 220 * t)) }
      let src = null
      window.__audio = (mode) => {
        if (src) { src.stop(); src.disconnect(); src = null }
        if (mode === 'silence') return
        src = ac.createBufferSource(); src.buffer = mode === 'ambient' ? amb : kick; src.loop = true; src.connect(d); src.start()
      }
      window.__audio('beat')
      const s = d.stream; const c = document.createElement('canvas'); s.addTrack(c.captureStream(1).getVideoTracks()[0]); return s
    }
  }, bpm)
}

// Resultados: ok(nome, condição, extra); `await finish()` imprime e devolve o código de saída (1 se algum FAIL).
// Em FAIL, salva test-results/<arquivo>-<n>.png da página ligada por attach(page).
function createResults(name) {
  const list = []; const shots = []; let page = null; let n = 0
  const dir = path.join(__dirname, '..', '..', 'test-results')
  return {
    attach(p) { page = p },
    ok(label, cond, extra = '') {
      list.push(`${cond ? 'PASS' : 'FAIL'} ${label} ${extra}`)
      if (!cond && page) { n++; fs.mkdirSync(dir, { recursive: true }); shots.push(page.screenshot({ path: path.join(dir, `${name}-${n}.png`) }).catch(() => {})) }
    },
    async finish() {
      await Promise.all(shots)
      console.log(list.join('\n'))
      const pass = list.filter(r => r.startsWith('PASS')).length
      console.log(`${pass}/${list.length}`)
      return pass === list.length ? 0 : 1
    },
    dump() { console.log(list.join('\n')) }
  }
}

module.exports = { serve, launch, mockSo, mockAudio, createResults }
