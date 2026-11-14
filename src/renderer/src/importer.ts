import butterchurn, { type Preset, type Visualizer } from 'butterchurn'
import type { PresetLibrary } from './presets'
import { t, tn } from './i18n'

/**
 * Importar `.milk` (spec 022). A conversão é no main (texto → preset 3.x); aqui cada preset é
 * validado num visualizador pequeno fora da tela (equações WASM + shaders GLSL), para dizer
 * qual shader não compila antes de gravar. Só os que passam são salvos e entram na biblioteca.
 */
export const MAX_BATCH = 200
const MAX_BYTES = 256 * 1024

export interface MilkInput {
  name: string
  text: string
}
export interface ImportResult {
  added: string[]
  /** Já estava na biblioteca (nome igual: pular e avisar, decisão do usuário). */
  skipped: string[]
  failed: { name: string; reason: string }[]
  /** Arquivos além do limite de 200 por vez. */
  extra: number
}

interface ShaderHolder {
  shaderProgram?: WebGLProgram | null
}
interface RendererInternals {
  gl?: WebGL2RenderingContext
  warpShader?: ShaderHolder
  compShader?: ShaderHolder
}

const nameOf = (file: string): string =>
  file
    .replace(/^.*[\\/]/, '')
    .replace(/\.milk$/i, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 200)

/** Primeira mensagem do compilador GLSL, sem o prefixo "ERROR: 0:123:". */
const glError = (gl: WebGL2RenderingContext, p: WebGLProgram): string => {
  const log = (gl.getAttachedShaders(p) ?? []).map((s) => gl.getShaderInfoLog(s) ?? '').join(' ') || gl.getProgramInfoLog(p) || ''
  const first = /ERROR:\s*\d+:\d+:\s*([^\n]+)/.exec(log)?.[1] ?? log
  return first.replace(/\s+/g, ' ').trim().slice(0, 120)
}

/**
 * Shader do preset atual que não compilou ou não linkou (`null` = ok). Partes internas do
 * Butterchurn 3 (`renderer.warpShader/compShader.shaderProgram`); sem elas, `null`.
 * Usado no visualizador de teste (022) e no principal (tela preta sem aviso, 2026-11-10).
 */
export function shaderError(viz: Visualizer): string | null {
  const r = (viz as unknown as { renderer?: RendererInternals }).renderer
  const gl = r?.gl
  if (!gl) return null
  for (const [label, h] of [
    ['warp', r?.warpShader],
    ['comp', r?.compShader]
  ] as const) {
    const p = h?.shaderProgram
    if (p && !gl.getProgramParameter(p, gl.LINK_STATUS)) return `shader ${label} não compila: ${glError(gl, p)}`
  }
  return null
}

/** Visualizador de 64×64 só para compilar; descartado ao fim do lote (e ao fechar o Estúdio, spec 026). */
export class Validator {
  private readonly canvas = document.createElement('canvas')
  private readonly viz: Visualizer
  constructor(ctx: AudioContext) {
    this.canvas.width = 64
    this.canvas.height = 64
    this.viz = butterchurn.createVisualizer(ctx, this.canvas, { width: 64, height: 64, onlyUseWASM: true })
  }

  /** `null` = compila; senão, o motivo legível. */
  async check(preset: Preset): Promise<string | null> {
    try {
      await this.viz.loadPreset(structuredClone(preset), 0)
      this.viz.render()
    } catch (err) {
      return `equações: ${err instanceof Error ? err.message : String(err)}`.slice(0, 160)
    }
    return shaderError(this.viz)
  }

  dispose(): void {
    const gl = (this.viz as unknown as { renderer?: RendererInternals }).renderer?.gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

export async function importMilks(
  files: MilkInput[],
  ctx: AudioContext,
  library: PresetLibrary,
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = { added: [], skipped: [], failed: [], extra: Math.max(0, files.length - MAX_BATCH) }
  const batch = files.slice(0, MAX_BATCH)
  let validator: Validator | null = null
  try {
    for (let i = 0; i < batch.length; i++) {
      const f = batch[i]!
      onProgress?.(i, batch.length)
      const name = nameOf(f.name)
      if (!name) continue
      if (library.has(name) || result.added.includes(name)) {
        result.skipped.push(name)
        continue
      }
      if (f.text.length > MAX_BYTES) {
        result.failed.push({ name, reason: 'arquivo maior que 256 KB' })
        continue
      }
      try {
        const { preset } = await window.so.presets.convertMilk(f.text)
        validator ??= new Validator(ctx)
        const err = await validator.check(preset as Preset)
        if (err) {
          result.failed.push({ name, reason: err })
          continue
        }
        await window.so.presets.saveImported({ name: f.name, text: f.text })
        library.addImported(name, preset as Preset)
        result.added.push(name)
      } catch (err) {
        // Erro do main chega como "Error invoking remote method …: Error: <motivo>".
        const msg = err instanceof Error ? err.message.replace(/^.*Error: /, '') : String(err)
        result.failed.push({ name, reason: msg.slice(0, 160) })
      }
    }
  } finally {
    validator?.dispose()
    onProgress?.(batch.length, batch.length)
  }
  for (const f of result.failed) window.so.log(`importar .milk: ${f.name}: ${f.reason}`)
  if (result.added.length) window.so.log(`importar .milk: ${result.added.length} adicionados`)
  return result
}

/** Resumo de uma linha para o toast e para a nota das Configurações. */
export function importSummary(r: ImportResult): string {
  const parts: string[] = []
  const n = r.added.length
  if (n) parts.push(tn('toast.import.added', n))
  if (r.skipped.length) parts.push(tn('toast.import.skipped', r.skipped.length))
  if (r.failed.length) {
    const names = r.failed.slice(0, 2).map((f) => f.name.split(' - ').pop()).join(', ')
    parts.push(tn('toast.import.failed', r.failed.length, { names: `${names}${r.failed.length > 2 ? '…' : ''}` }))
  }
  if (r.extra) parts.push(t('toast.import.extra', { n: r.extra, max: MAX_BATCH }))
  return parts.join(' · ') || t('toast.import.none')
}
