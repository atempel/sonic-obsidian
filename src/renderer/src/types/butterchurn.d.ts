// Tipos mínimos para a API pública do Butterchurn usada pelo app.
// O pacote não publica tipos próprios. Só declarar aqui o que de fato usamos.

declare module 'butterchurn' {
  export interface VisualizerOptions {
    width: number
    height: number
    pixelRatio?: number
    textureRatio?: number
  }

  /** Preset já convertido (equações + shaders), como vem de butterchurn-presets. */
  export type Preset = Record<string, unknown>

  export interface Visualizer {
    connectAudio(node: AudioNode): void
    disconnectAudio(node: AudioNode): void
    loadPreset(preset: Preset, blendTime: number): void
    setRendererSize(width: number, height: number): void
    render(): void
  }

  const butterchurn: {
    createVisualizer(context: AudioContext, canvas: HTMLCanvasElement, opts: VisualizerOptions): Visualizer
  }
  export default butterchurn
}

declare module 'butterchurn-presets' {
  import type { Preset } from 'butterchurn'
  const butterchurnPresets: {
    getPresets(): Record<string, Preset>
  }
  export default butterchurnPresets
}
