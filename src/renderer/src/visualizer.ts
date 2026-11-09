import butterchurn, { type Preset, type Visualizer } from 'butterchurn'
import butterchurn3 from 'butterchurn3'
import type { BlendType, RenderSettings } from './core/state'

/**
 * Partes internas do Butterchurn 2.6.7 usadas para escolher o tipo de transição
 * (spec 013): `visualizer.renderer.blendPattern` (`src/rendering/blendPattern.js`).
 * Não fazem parte da API pública; se mudarem, o app volta ao sorteio do motor.
 */
interface BlendPatternInternals {
  createBlendPattern(): void
  mesh_width: number
  mesh_height: number
  vertInfoA: Float32Array
  vertInfoC: Float32Array
}

/**
 * Valor de `Math.random()` que faz `mixType = 1 + floor(random × 3)` cair em cada tipo:
 * 1 = varredura, 2 = plasma, 3 = radial.
 */
const MIX_RANDOM: Partial<Record<BlendType, number>> = { wipe: 0.1, plasma: 0.5, radial: 0.9 }

export class PresetVisualizer {
  readonly visualizer: Visualizer
  /** false = estrutura interna não encontrada: todo blend usa o sorteio do motor. */
  readonly blendTypesAvailable: boolean
  /** Tipo pedido para o próximo `createBlendPattern` (lido pela sobrescrita). */
  private pendingType: BlendType = 'random'
  private render_: RenderSettings
  private extraImagesLoaded = false

  /** Spike 006: 'v3' = Butterchurn 3 com `onlyUseWASM` (equações em WASM, nada de `new Function`). */
  readonly engine: 'v2' | 'v3'

  constructor(ctx: AudioContext, private readonly canvas: HTMLCanvasElement, render: RenderSettings, engine: 'v2' | 'v3' = 'v2') {
    this.render_ = { ...render }
    this.engine = engine
    const { width, height } = this.size()
    canvas.width = width
    canvas.height = height
    const opts = {
      width,
      height,
      pixelRatio: this.pixelRatio(),
      textureRatio: render.textureRatio,
      meshWidth: render.meshWidth,
      meshHeight: render.meshHeight,
      outputFXAA: render.fxaa
    }
    // O 3.x tem a mesma API pública (loadPreset vira assíncrono); as partes internas que os
    // ganchos usam são procuradas pela forma, então cada gancho desliga sozinho se faltar algo.
    this.visualizer =
      engine === 'v3'
        ? (butterchurn3.createVisualizer(ctx, canvas, { ...opts, onlyUseWASM: true }) as unknown as Visualizer)
        : butterchurn.createVisualizer(ctx, canvas, opts)
    this.blendTypesAvailable = this.hookBlendPattern()
    if (render.extraImages) void this.loadExtraImages()
  }

  /**
   * Configurações › Renderização, na hora e sem reiniciar (spec 011). Malha, escala de
   * pixels, texturas e tamanho do canvas passam por setRendererSize; FXAA por setOutputAA.
   * Desligar as imagens extras não as descarrega (só vale na próxima abertura).
   */
  applyRender(next: RenderSettings): void {
    const prev = this.render_
    this.render_ = { ...next }
    if (next.fxaa !== prev.fxaa) this.visualizer.setOutputAA(next.fxaa)
    if (next.meshWidth !== prev.meshWidth || next.meshHeight !== prev.meshHeight) {
      this.visualizer.setInternalMeshSize(next.meshWidth, next.meshHeight)
    }
    if (next.pixelRatio !== prev.pixelRatio || next.textureRatio !== prev.textureRatio || next.canvasScale !== prev.canvasScale) this.resize()
    if (next.extraImages) void this.loadExtraImages()
  }

  private async loadExtraImages(): Promise<void> {
    if (this.extraImagesLoaded) return
    this.extraImagesLoaded = true
    try {
      const mod = await import('butterchurn/lib/butterchurnExtraImages.min.js')
      this.visualizer.loadExtraImages(mod.default.getImages())
    } catch (err) {
      this.extraImagesLoaded = false
      console.error('[viz] falha ao carregar o pacote de imagens extras', err)
    }
  }

  private pixelRatio(): number {
    const r = this.render_.pixelRatio
    return r === 'auto' ? window.devicePixelRatio || 1 : r
  }

  /** Corte seco = blend 0; os demais tipos usam o tempo pedido. */
  load(preset: Preset, type: BlendType, blendSeconds: number): Promise<void> {
    this.pendingType = type
    // No 3.x o loadPreset devolve uma Promise (compilação WASM); no 2.6.7, undefined.
    const r = this.visualizer.loadPreset(preset, type === 'cut' ? 0 : blendSeconds) as unknown
    return r instanceof Promise ? r : Promise.resolve()
  }

  resize(): void {
    const { width, height } = this.size()
    this.canvas.width = width
    this.canvas.height = height
    this.visualizer.setRendererSize(width, height, { pixelRatio: this.pixelRatio(), textureRatio: this.render_.textureRatio })
  }

  /** elapsedSeconds controla o relógio do preset (silêncio = relógio mais lento). */
  render(elapsedSeconds?: number): void {
    this.visualizer.render(elapsedSeconds ? { elapsedTime: elapsedSeconds } : undefined)
  }

  /**
   * Envolve `blendPattern.createBlendPattern` na instância (sem patch no pacote).
   * - varredura/plasma/radial: troca `Math.random` só na 1ª chamada (a que sorteia o tipo);
   *   ângulo, espessura e direção continuam aleatórios;
   * - crossfade: preenche a malha como o ramo `mixType === 0` do motor;
   * - aleatório: chama o original.
   */
  private hookBlendPattern(): boolean {
    const renderer = (this.visualizer as unknown as { renderer?: { blendPattern?: Partial<BlendPatternInternals> } }).renderer
    const bp = renderer?.blendPattern
    if (
      !bp ||
      typeof bp.createBlendPattern !== 'function' ||
      !(bp.vertInfoA instanceof Float32Array) ||
      !(bp.vertInfoC instanceof Float32Array) ||
      typeof bp.mesh_width !== 'number' ||
      typeof bp.mesh_height !== 'number'
    ) {
      console.warn('[viz] blendPattern do Butterchurn não encontrado: tipos de transição indisponíveis (sorteio do motor)')
      return false
    }
    const pattern = bp as BlendPatternInternals
    const original = pattern.createBlendPattern.bind(pattern)
    pattern.createBlendPattern = () => {
      const type = this.pendingType
      if (type === 'crossfade') {
        // Recalcula o tamanho a cada vez: a malha pode mudar com setRendererSize.
        const n = Math.min((pattern.mesh_width + 1) * (pattern.mesh_height + 1), pattern.vertInfoA.length, pattern.vertInfoC.length)
        pattern.vertInfoA.fill(1, 0, n)
        pattern.vertInfoC.fill(0, 0, n)
        return
      }
      const forced = MIX_RANDOM[type]
      if (forced === undefined) {
        original()
        return
      }
      const random = Math.random
      let first = true
      Math.random = () => {
        if (first) {
          first = false
          return forced
        }
        return random()
      }
      try {
        original()
      } finally {
        Math.random = random
      }
    }
    return true
  }

  private size(): { width: number; height: number } {
    // Tamanho do canvas (Nativo / 75% / 50%): menos pixels; o CSS estica para a janela.
    const k = this.render_.canvasScale
    return { width: Math.max(2, Math.round(window.innerWidth * k)), height: Math.max(2, Math.round(window.innerHeight * k)) }
  }
}
