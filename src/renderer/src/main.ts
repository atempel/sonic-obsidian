import { captureSystemAudio } from './capture'
import { Hud, type HudState } from './hud'
import { PresetVisualizer } from './visualizer'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const hud = new Hud(document.getElementById('hud') as HTMLElement)
const state: HudState = { fps: 0, preset: '—', audio: 'aguardando', level: 0 }

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
  state.preset = viz.loadRandom(0)
  console.log(`[viz] ${viz.presetCount} presets carregados; inicial: ${state.preset}`)

  window.addEventListener('resize', () => viz.resize())
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      state.preset = viz.loadRandom()
      console.log(`[viz] preset: ${state.preset}`)
      e.preventDefault()
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
      console.log(`[fps] ${state.fps.toFixed(1)} · áudio ${state.audio} · rms ${state.level.toFixed(3)}`)
      hud.show(state)
    }
    requestAnimationFrame(loop)
  }
  hud.show(state)
  requestAnimationFrame(loop)
}

start().catch((err: unknown) => {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  console.error('[start]', err)
  hud.show({ ...state, error: message })
})
