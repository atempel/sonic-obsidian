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

// ── Spike 006: Butterchurn 3 (WASM), instalado com o alias `butterchurn3` ──
declare module 'butterchurn3' {
  import type { Preset, VisualizerOptions } from 'butterchurn'
  export interface Visualizer3 {
    connectAudio(node: AudioNode): void
    disconnectAudio(node: AudioNode): void
    /** No 3.x é assíncrono (compila as equações EEL para WASM). */
    loadPreset(preset: Preset, blendTime: number): Promise<void>
    setRendererSize(width: number, height: number, opts?: { pixelRatio?: number; textureRatio?: number; meshWidth?: number; meshHeight?: number }): void
    setInternalMeshSize(width: number, height: number): void
    setOutputAA(useAA: boolean): void
    loadExtraImages(imageData: Record<string, unknown>): void
    render(opts?: { elapsedTime?: number }): void
    toDataURL(): string
  }
  const butterchurn3: {
    createVisualizer(context: AudioContext, canvas: HTMLCanvasElement, opts: VisualizerOptions & { onlyUseWASM?: boolean }): Visualizer3
  }
  export default butterchurn3
}

declare module 'butterchurn-presets3/dist/*.min.js' {
  import type { Preset } from 'butterchurn'
  const pack: Record<string, Preset>
  export default pack
}

// Spike 006: `import.meta.glob` do Vite (só os fixtures .milk; sem puxar todos os tipos de vite/client).
interface ImportMeta {
  glob(pattern: string, opts: { query: string; import: string; eager: true }): Record<string, unknown>
}
