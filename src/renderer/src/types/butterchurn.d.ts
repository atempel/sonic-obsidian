// Tipos mínimos para a API pública do Butterchurn usada pelo app.
// O pacote não publica tipos próprios. Só declarar aqui o que de fato usamos.

declare module 'butterchurn' {
  export interface VisualizerOptions {
    width: number
    height: number
    pixelRatio?: number
    textureRatio?: number
    meshWidth?: number
    meshHeight?: number
    outputFXAA?: boolean
  }

  /** Preset já convertido (equações + shaders), como vem de butterchurn-presets. */
  export type Preset = Record<string, unknown>

  export interface Visualizer {
    connectAudio(node: AudioNode): void
    disconnectAudio(node: AudioNode): void
    loadPreset(preset: Preset, blendTime: number): void
    setRendererSize(width: number, height: number, opts?: { pixelRatio?: number; textureRatio?: number; meshWidth?: number; meshHeight?: number }): void
    setInternalMeshSize(width: number, height: number): void
    setOutputAA(useAA: boolean): void
    loadExtraImages(imageData: Record<string, unknown>): void
    render(opts?: { elapsedTime?: number }): void
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

declare module 'butterchurn-presets/lib/*.min.js' {
  import type { Preset } from 'butterchurn'
  const pack: { getPresets(): Record<string, Preset> }
  export default pack
}

declare module 'butterchurn/lib/butterchurnExtraImages.min.js' {
  const extraImages: { getImages(): Record<string, unknown> }
  export default extraImages
}
