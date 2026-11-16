import butterchurn, { type Preset, type Visualizer } from 'butterchurn'
import type { BlendType, RenderSettings } from './core/state'

/**
 * Partes internas do Butterchurn (2.6.7 e 3.x, mesma estrutura) usadas para escolher o tipo de transição
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

  /** Pedido de preset mais recente: em trocas rápidas, vale o último (loadPreset é assíncrono). */
  private loadSeq = 0
  private loadChain: Promise<boolean> = Promise.resolve(true)
  /** Cargas em andamento (`loadPreset` é assíncrono): o runner ainda vai ser trocado. */
  private loading = 0
  /** Parâmetros base mudados durante uma carga: valem no runner novo, assim que ela termina. */
  private pendingTweaks = new Map<string, number>()

  constructor(ctx: AudioContext, private readonly canvas: HTMLCanvasElement, render: RenderSettings) {
    this.render_ = { ...render }
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
    // onlyUseWASM: equações só em WASM; nenhum preset vira JavaScript (spec 021, spike 006).
    this.visualizer = butterchurn.createVisualizer(ctx, canvas, { ...opts, onlyUseWASM: true })
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
      // No 3.x as imagens dos presets "image" vêm no próprio butterchurn-presets.
      const mod = await import('butterchurn-presets/dist/imageData.min.js')
      this.visualizer.loadExtraImages(mod.default)
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
  /**
   * Corte seco = blend 0; os demais tipos usam o tempo pedido. Assíncrono (compilação WASM):
   * os pedidos entram numa fila, e um pedido que já foi superado por outro mais novo é
   * descartado antes de compilar, para um preset lento não tomar a tela depois do mais novo.
   * Resolve `true` se este pedido foi aplicado.
   */
  load(preset: Preset, type: BlendType, blendSeconds: number): Promise<boolean> {
    const seq = ++this.loadSeq
    const run = async (): Promise<boolean> => {
      if (seq !== this.loadSeq) return false
      this.pendingType = type
      this.loading++
      try {
        // Cópia: o motor altera o objeto do preset (baseVals); a biblioteca guarda o original.
        await this.visualizer.loadPreset(structuredClone(preset), type === 'cut' ? 0 : blendSeconds)
      } finally {
        this.loading--
        if (this.loading === 0 && this.pendingTweaks.size) {
          const pending = [...this.pendingTweaks]
          this.pendingTweaks.clear()
          for (const [k, v] of pending) this.tweakBase(k, v)
        }
      }
      return true
    }
    const p = this.loadChain.then(run, run)
    this.loadChain = p.catch(() => false)
    return p
  }

  /**
   * Muda um parâmetro base (`baseVals`) do preset que está tocando, sem recarregar (Estúdio,
   * spec 027, Básico). O runner WASM do Butterchurn 3 copia `mdVS` para o pool das equações
   * no começo de cada quadro (`runFrameEquations`), então o valor vale já no próximo quadro;
   * as equações `per_frame` ainda podem sobrescrevê-lo, como no MilkDrop. Com uma carga em
   * andamento, o valor espera o runner novo. Partes internas, fora da API pública: sem elas
   * devolve `null` e o Estúdio recarrega o preset. Devolve o valor lido de volta do motor.
   */
  tweakBase(key: string, value: number): number | null {
    const r = (this.visualizer as unknown as { renderer?: { presetEquationRunner?: { mdVS?: Record<string, unknown>; preset?: { baseVals?: Record<string, unknown> } } } }).renderer
    const runner = r?.presetEquationRunner
    const mdVS = runner?.mdVS
    if (!mdVS || typeof mdVS[key] !== 'number') return null
    if (this.loading > 0) {
      this.pendingTweaks.set(key, value)
      return value
    }
    mdVS[key] = value
    const bv = runner.preset?.baseVals
    if (bv && typeof bv[key] === 'number') bv[key] = value
    return mdVS[key] as number
  }

  /**
   * Ondas e formas ligadas no preset que está tocando, lidas do motor (Estúdio, 027 fatia 2;
   * para o HUD). Ex.: `{ waves: '2', shapes: '3,4' }` (contando de 1). Sem acesso: `null`.
   */
  liveSlots(): { waves: string; shapes: string } | null {
    const r = (this.visualizer as unknown as { renderer?: { preset?: { waves?: { baseVals?: { enabled?: number } }[]; shapes?: { baseVals?: { enabled?: number } }[] } } }).renderer
    const p = r?.preset
    if (!p || !Array.isArray(p.waves) || !Array.isArray(p.shapes)) return null
    const on = (xs: { baseVals?: { enabled?: number } }[]): string =>
      xs
        .map((x, i) => (x?.baseVals?.enabled ? String(i + 1) : ''))
        .filter(Boolean)
        .join(',') || '-'
    return { waves: on(p.waves), shapes: on(p.shapes) }
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
      console.warn('[viz] Butterchurn blendPattern not found: transition types unavailable (engine picks)')
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
