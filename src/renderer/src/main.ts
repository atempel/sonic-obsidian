import { captureSystemAudio } from './capture'
import { Hud, type HudState } from './hud'
import { PresetLibrary } from './presets'
import { Toast } from './toast'
import { PresetVisualizer } from './visualizer'

const BLEND_BY_KEY: Record<string, number> = {
  Digit1: 0, Numpad1: 0,
  Digit2: 2, Numpad2: 2,
  Digit3: 5, Numpad3: 5
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const hud = new Hud(document.getElementById('hud') as HTMLElement)
const toast = new Toast(document.getElementById('toast') as HTMLElement)
const state: HudState = { fps: 0, preset: '—', presetCount: 0, blend: 2, audio: 'aguardando', level: 0 }

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
  const show = (name: string, blend: number): void => {
    viz.load(library.get(name), blend)
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
    if (e.code === 'ArrowRight') {
      show(library.next(), state.blend)
    } else if (e.code === 'ArrowLeft') {
      const name = library.back()
      if (name) show(name, state.blend)
    } else if (e.code === 'Space' || e.code === 'KeyR') {
      show(library.random(), state.blend)
    } else if (e.code in BLEND_BY_KEY) {
      state.blend = BLEND_BY_KEY[e.code]!
      toast.show(`blend ${state.blend} s`, 1500)
    } else {
      handled = false
    }
    if (handled) {
      e.preventDefault()
      hud.show(state)
    }
  })

  let frames = 0
  let windowStart = performance.now()
  const loop = (now: number): void => {
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
    requestAnimationFrame(loop)
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
