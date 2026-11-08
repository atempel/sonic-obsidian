import { captureSystemAudio } from './capture'
import { config } from './config'
import { Hud, type HudState } from './hud'
import { PresetLibrary } from './presets'
import { AutoRotation } from './rotation'
import { Toast } from './toast'
import { PresetVisualizer } from './visualizer'
import { setupWindowChrome } from './window'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
setupWindowChrome()
const hud = new Hud(document.getElementById('hud') as HTMLElement)
const toast = new Toast(document.getElementById('toast') as HTMLElement)
const state: HudState = { fps: 0, preset: '—', presetCount: 0, rotation: '30 s', fpsMode: 'monitor', audio: 'aguardando', level: 0 }

async function start(): Promise<void> {
  const { stream, audioTrack } = await captureSystemAudio()

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
  gain.gain.value = 1
  source.connect(gain)

  const meter = ctx.createAnalyser()
  meter.fftSize = 1024
  gain.connect(meter)
  const samples = new Float32Array(meter.fftSize)

  const viz = new PresetVisualizer(ctx, canvas)
  viz.visualizer.connectAudio(gain)

  const library = new PresetLibrary()
  const rotation = new AutoRotation(performance.now())
  const updateRotation = (): void => {
    state.rotation = rotation.paused ? 'pausada' : `${rotation.intervalSeconds} s`
  }
  const show = (name: string, blend: number): void => {
    viz.load(library.get(name), blend)
    rotation.restart(performance.now())
    state.preset = name
    toast.show(name)
    console.log(`[viz] preset: ${name} (blend ${blend} s)`)
  }
  show(library.random(), 0)
  state.presetCount = library.count

  window.addEventListener('resize', () => viz.resize())
  window.addEventListener('keydown', (e) => {
    if (e.repeat && e.code !== 'ArrowRight' && e.code !== 'ArrowLeft') return
    let handled = true
    // Atalhos v3 (docs/design/v3-modelo-de-navegacao.md).
    if (e.code === 'ArrowRight') {
      show(library.next(), config.blendManualSeconds)
    } else if (e.code === 'ArrowLeft') {
      const name = library.back()
      if (name) show(name, config.blendManualSeconds)
    } else if (e.code === 'Space') {
      show(library.random(), config.blendManualSeconds)
    } else if (e.code === 'KeyR') {
      const paused = rotation.togglePause(performance.now())
      updateRotation()
      toast.show(paused ? 'rotação pausada' : `rotação a cada ${rotation.intervalSeconds} s`, 1500)
    } else if (e.key === '[' || e.key === ']') {
      // Pelo caractere (e.key), não pela posição: no ABNT2 os colchetes ficam em outras teclas.
      const seconds = rotation.step(e.key === '[' ? -1 : 1, performance.now())
      updateRotation()
      toast.show(`rotação a cada ${seconds} s${rotation.paused ? ' (pausada)' : ''}`, 1500)
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
  const frameInterval = config.fpsLimit === 'monitor' ? 0 : 1000 / config.fpsLimit
  state.fpsMode = config.fpsLimit === 'monitor' ? 'monitor' : `limite ${config.fpsLimit}`
  let lastFrame = 0
  let frames = 0
  let windowStart = performance.now()
  const loop = (now: number): void => {
    requestAnimationFrame(loop)
    if (frameInterval > 0) {
      if (now - lastFrame < frameInterval - 1) return
      // Mantém a cadência sem acumular atraso depois de uma pausa longa.
      lastFrame = now - lastFrame > frameInterval * 2 ? now : lastFrame + frameInterval
    }
    if (rotation.due(now)) show(library.random(), config.blendAutoSeconds)
    viz.render()
    frames++
    if (now - windowStart >= 1000) {
      state.fps = (frames * 1000) / (now - windowStart)
      frames = 0
      windowStart = now
      meter.getFloatTimeDomainData(samples)
      let sum = 0
      for (const v of samples) sum += v * v
      state.level = Math.sqrt(sum / samples.length)
      hud.show(state)
    }
  }
  hud.show(state)
  requestAnimationFrame(loop)

  // Pacotes extras depois do primeiro quadro, para não atrasar a abertura.
  const t0 = performance.now()
  library
    .loadExtraPacks()
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
