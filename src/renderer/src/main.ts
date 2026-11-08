import { captureSystemAudio } from './capture'
import { Core, type Origin } from './core/commands'
import { sanitizeLibrary, sanitizeSettings, stepInterval } from './core/state'
import { Hud, type HudState } from './hud'
import { PresetLibrary } from './presets'
import { SILENT_DIM, SilenceState } from './silence'
import { AutoRotation } from './rotation'
import { Toast } from './toast'
import { mountOverlay } from './ui/Overlay'
import { PresetVisualizer } from './visualizer'
import { setupWindowChrome } from './window'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
setupWindowChrome()
const hud = new Hud(document.getElementById('hud') as HTMLElement)
const toast = new Toast(document.getElementById('toast') as HTMLElement)
const state: HudState = { fps: 0, preset: '—', presetCount: 0, rotation: '30 s', fpsMode: 'monitor', gainDb: 0, audio: 'aguardando', level: 0 }

/** Quanto esperar pelos pacotes extras quando o último preset está neles (critério < 3 s). */
const STARTUP_EXTRAS_WAIT_MS = 1000

async function start(): Promise<void> {
  // Captura e estado salvo em paralelo: os dois são locais e rápidos.
  const [{ stream, audioTrack }, rawSettings, rawLibrary] = await Promise.all([
    captureSystemAudio(),
    window.so.settings.load().catch(() => null),
    window.so.library.load().catch(() => null)
  ])

  const updateTrack = (): void => {
    state.audio = `${audioTrack.readyState}${audioTrack.muted ? ' (muted)' : ''}`
  }
  updateTrack()
  audioTrack.addEventListener('ended', updateTrack)
  audioTrack.addEventListener('mute', updateTrack)
  audioTrack.addEventListener('unmute', updateTrack)

  const ctx = new AudioContext()
  if (ctx.state === 'suspended') await ctx.resume()

  // fonte → ganho → Butterchurn. Nada vai para ctx.destination (evita eco).
  const source = ctx.createMediaStreamSource(stream)
  const gain = ctx.createGain()
  source.connect(gain)

  // Medidor de silêncio antes do ganho.
  const preGain = ctx.createAnalyser()
  preGain.fftSize = 1024
  source.connect(preGain)
  const preSamples = new Float32Array(preGain.fftSize)
  const silence = new SilenceState()
  const dim = document.getElementById('dim') as HTMLElement
  const notice = document.getElementById('notice') as HTMLElement

  const meter = ctx.createAnalyser()
  meter.fftSize = 1024
  gain.connect(meter)
  const samples = new Float32Array(meter.fftSize)

  const viz = new PresetVisualizer(ctx, canvas)
  viz.visualizer.connectAudio(gain)

  // ── Núcleo de comandos (spec 008) ─────────────────────────
  const library = new PresetLibrary()
  const core = new Core(library, sanitizeSettings(rawSettings), sanitizeLibrary(rawLibrary), {
    saveSettings: (s) => window.so.settings.save(s),
    saveLibrary: (l) => window.so.library.save(l),
    toggleFullScreen: () => window.so.window.toggleFullScreen()
  })
  const settings = core.state.settings
  const rotation = new AutoRotation(performance.now(), () => ({
    enabled: settings.rotation.enabled,
    intervalSeconds: core.rotationIntervalSeconds
  }))

  // Efeitos dos eventos: o Core não toca o Butterchurn nem o áudio.
  let appliedGainDb = Number.NaN
  const applyState = (): void => {
    if (settings.gainDb !== appliedGainDb) {
      appliedGainDb = settings.gainDb
      gain.gain.setTargetAtTime(10 ** (settings.gainDb / 20), ctx.currentTime, 0.02)
    }
    state.gainDb = settings.gainDb
    state.rotation = settings.rotation.enabled ? `${core.rotationIntervalSeconds} s` : 'pausada'
    state.fpsMode = settings.fpsLimit === 'monitor' ? 'monitor' : `limite ${settings.fpsLimit}`
  }
  core.events.on('stateChanged', applyState)
  core.events.on('presetChanged', ({ name, blendSeconds }) => {
    viz.load(library.get(name), blendSeconds)
    rotation.restart(performance.now())
    state.preset = name
    toast.show(name)
    console.log(`[viz] preset: ${name} (blend ${blendSeconds} s)`)
  })
  applyState()
  mountOverlay(document.getElementById('ui') as HTMLElement, core)

  // Preset ao abrir: o último usado, se ainda existir; senão aleatório.
  const t0 = performance.now()
  const extras = library.loadExtraPacks()
  const last = settings.startupPreset === 'last' ? settings.lastPreset : null
  if (last && !library.has(last)) {
    // Pode estar nos pacotes extras: espera um pouco por eles, sem passar do limite.
    await Promise.race([extras.catch(() => 0), new Promise((r) => setTimeout(r, STARTUP_EXTRAS_WAIT_MS))])
  }
  const first = last && library.has(last) && !core.isHidden(last) ? core.run('preset.play', { name: last }, 'startup') : null
  if (!first?.ok) core.run('preset.random', {}, 'startup')
  console.log(`[startup] primeiro preset em ${(performance.now() - t0).toFixed(0)} ms (${first?.ok ? 'último usado' : 'aleatório'})`)
  state.presetCount = library.count

  const run = (name: string, args: Record<string, unknown> = {}, origin: Origin = 'keyboard') => {
    const result = core.run(name, args, origin)
    if (!result.ok) console.warn(`[core] ${name}: ${result.error}`)
    return result
  }
  const gainText = (): string => `ganho ${settings.gainDb > 0 ? '+' : ''}${settings.gainDb} dB`

  window.addEventListener('resize', () => viz.resize())
  window.addEventListener('keydown', (e) => {
    if (e.repeat && e.code !== 'ArrowRight' && e.code !== 'ArrowLeft') return
    if (e.ctrlKey || e.altKey || e.metaKey) return
    let handled = true
    // Atalhos v3 (docs/design/v3-modelo-de-navegacao.md), agora como comandos do Core.
    if (e.code === 'ArrowRight') {
      run('preset.next')
    } else if (e.code === 'ArrowLeft') {
      run('preset.previous')
    } else if (e.code === 'Space') {
      run('preset.random')
    } else if (e.code === 'KeyF') {
      // F = tela cheia (como F11), por decisão do usuário; ver DIVERGENCIAS.
      run('window.fullscreen')
    } else if (e.code === 'KeyR') {
      run('rotation.set', { enabled: !settings.rotation.enabled })
      rotation.restart(performance.now())
      toast.show(settings.rotation.enabled ? `rotação a cada ${core.rotationIntervalSeconds} s` : 'rotação pausada', 1500)
    } else if (e.key === '[' || e.key === ']') {
      // Pelo caractere (e.key), não pela posição: no ABNT2 os colchetes ficam em outras teclas.
      run('rotation.set', { intervalSeconds: stepInterval(settings.rotation.intervalSeconds, e.key === '[' ? -1 : 1) })
      rotation.restart(performance.now())
      toast.show(`rotação a cada ${settings.rotation.intervalSeconds} s${settings.rotation.enabled ? '' : ' (pausada)'}`, 1500)
    } else if (e.key === '+' || e.key === '=') {
      run('signal.set', { gainDb: settings.gainDb + 1 })
      toast.show(gainText(), 1200)
    } else if (e.key === '-' || e.key === '_') {
      run('signal.set', { gainDb: settings.gainDb - 1 })
      toast.show(gainText(), 1200)
    } else if (e.key === '0') {
      run('signal.set', { gainDb: 0 })
      toast.show(gainText(), 1200)
    } else {
      handled = false
    }
    if (handled) {
      e.preventDefault()
      hud.show(state)
    }
  })

  // Limite de fps: pula quadros do rAF até completar o intervalo-alvo.
  // A tolerância de 1 ms evita perder quadros por jitter em telas múltiplas de 60 Hz.
  let lastFrame = 0
  let lastResting = false
  let lastNotice = false
  let lastRender = performance.now()
  let lastSilenceCheck = 0
  let frames = 0
  let windowStart = performance.now()
  const loop = (now: number): void => {
    requestAnimationFrame(loop)
    const frameInterval = settings.fpsLimit === 'monitor' ? 0 : 1000 / settings.fpsLimit
    if (frameInterval > 0) {
      if (now - lastFrame < frameInterval - 1) return
      // Mantém a cadência sem acumular atraso depois de uma pausa longa.
      lastFrame = now - lastFrame > frameInterval * 2 ? now : lastFrame + frameInterval
    }
    if (now - lastSilenceCheck >= 100) {
      lastSilenceCheck = now
      preGain.getFloatTimeDomainData(preSamples)
      let sq = 0
      for (const v of preSamples) sq += v * v
      silence.update(Math.sqrt(sq / preSamples.length), now)
      document.body.classList.toggle('silent', silence.resting)
      notice.classList.toggle('visible', silence.showNotice)
      if (silence.resting !== lastResting || silence.showNotice !== lastNotice) {
        lastResting = silence.resting
        lastNotice = silence.showNotice
        core.events.emit('silenceChanged', { resting: lastResting, notice: lastNotice })
      }
      // Nível depois do ganho, direto aos assinantes (fora do store, sem re-render).
      meter.getFloatTimeDomainData(samples)
      let sum = 0
      for (const v of samples) sum += v * v
      state.level = Math.sqrt(sum / samples.length)
      core.events.emit('levelTick', { level: state.level })
    }
    const dt = Math.min(0.1, Math.max(0.001, (now - lastRender) / 1000))
    lastRender = now
    const speed = silence.step(dt)
    dim.style.opacity = String(((1 - speed) / (1 - 0.15)) * SILENT_DIM)
    if (rotation.due(now)) run('rotation.advance', {}, 'rotation')
    viz.render(dt * speed)
    frames++
    if (now - windowStart >= 1000) {
      state.fps = (frames * 1000) / (now - windowStart)
      frames = 0
      windowStart = now
      hud.show(state)
    }
  }
  hud.show(state)
  requestAnimationFrame(loop)

  // Pacotes extras (já pedidos na abertura) entram quando chegarem.
  extras
    .then((count) => {
      state.presetCount = count
      console.log(`[viz] ${count} presets após os pacotes extras (${(performance.now() - t0).toFixed(0)} ms)`)
      hud.show(state)
    })
    .catch((err: unknown) => console.error('[viz] falha ao carregar pacotes extras', err))
}

start().catch((err: unknown) => {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  console.error('[start]', err)
  hud.show({ ...state, error: message })
})
