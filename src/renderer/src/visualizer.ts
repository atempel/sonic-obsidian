import butterchurn, { type Preset, type Visualizer } from 'butterchurn'

export class PresetVisualizer {
  readonly visualizer: Visualizer

  constructor(ctx: AudioContext, private readonly canvas: HTMLCanvasElement) {
    const { width, height } = this.size()
    canvas.width = width
    canvas.height = height
    this.visualizer = butterchurn.createVisualizer(ctx, canvas, {
      width,
      height,
      pixelRatio: window.devicePixelRatio || 1
    })
  }

  load(preset: Preset, blendSeconds: number): void {
    this.visualizer.loadPreset(preset, blendSeconds)
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
