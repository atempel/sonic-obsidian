// Tipos mínimos para a API pública do Butterchurn 3 usada pelo app (spec 021).
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
    /** Só equações EEL compiladas para WASM; presets com JavaScript (`*_str`) são recusados. */
    onlyUseWASM?: boolean
  }

  /** Preset já convertido (equações EEL + shaders GLSL), como vem de butterchurn-presets 3.x. */
  export type Preset = Record<string, unknown>

  export interface Visualizer {
    connectAudio(node: AudioNode): void
    disconnectAudio(node: AudioNode): void
    /** Assíncrono no 3.x: compila as equações para WASM. */
    loadPreset(preset: Preset, blendTime: number): Promise<void>
    setRendererSize(width: number, height: number, opts?: { pixelRatio?: number; textureRatio?: number; meshWidth?: number; meshHeight?: number }): void
    setInternalMeshSize(width: number, height: number): void
    setOutputAA(useAA: boolean): void
    loadExtraImages(imageData: Record<string, unknown>): void
    render(opts?: { elapsedTime?: number }): void
    toDataURL(): string
  }

  const butterchurn: {
    createVisualizer(context: AudioContext, canvas: HTMLCanvasElement, opts: VisualizerOptions): Visualizer
  }
  export default butterchurn
}

/** Pacotes do butterchurn-presets 3.x: o módulo exporta o mapa nome → preset. */
declare module 'butterchurn-presets/dist/*.min.js' {
  import type { Preset } from 'butterchurn'
  const pack: Record<string, Preset>
  export default pack
}
