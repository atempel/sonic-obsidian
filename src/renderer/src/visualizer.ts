import butterchurn, { type Preset, type Visualizer } from 'butterchurn'
import butterchurnPresets from 'butterchurn-presets'

const BLEND_SECONDS = 2

export class PresetVisualizer {
  readonly visualizer: Visualizer
  private readonly presets: Record<string, Preset>
  private readonly names: string[]
  currentName = ''

  constructor(ctx: AudioContext, private readonly canvas: HTMLCanvasElement) {
    const { width, height } = this.size()
    canvas.width = width
    canvas.height = height
    this.visualizer = butterchurn.createVisualizer(ctx, canvas, {
      width,
      height,
      pixelRatio: window.devicePixelRatio || 1
    })
    this.presets = butterchurnPresets.getPresets()
    this.names = Object.keys(this.presets)
  }

  get presetCount(): number {
    return this.names.length
  }

  /** Carrega um preset aleatório diferente do atual. O nome carrega o crédito do autor. */
  loadRandom(blendSeconds = BLEND_SECONDS): string {
    let name = this.currentName
    while (this.names.length > 1 && name === this.currentName) {
      name = this.names[Math.floor(Math.random() * this.names.length)]!
    }
    this.visualizer.loadPreset(this.presets[name]!, blendSeconds)
    this.currentName = name
    return name
  }

  resize(): void {
    const { width, height } = this.size()
    this.canvas.width = width
    this.canvas.height = height
    this.visualizer.setRendererSize(width, height)
  }

  render(): void {
    this.visualizer.render()
  }

  private size(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight }
  }
}
