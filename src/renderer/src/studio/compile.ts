import type { Preset } from 'butterchurn'
import { Validator } from '../importer'
import type { Block, CheckReply, CheckRequest, MainBlock, ShaderBlock, SlotBlock, SlotCheck, StudioIssue, WorkerError } from './eel-worker'
import { slotChecks } from './slots'

/**
 * Compilação ao vivo do Estúdio (spec 026). Cada versão passa por duas barreiras antes de
 * chegar ao visualizador principal:
 * 1. Worker com o eel-wasm: erros com bloco e linha, e um quadro rodado com teto de 1 s
 *    (laço sem fim não congela a interface: o Worker é encerrado e recriado);
 * 2. visualizador de teste de 64×64 (o da 022): equações no motor + shaders (erro de GLSL no
 *    bloco `warp`/`comp`, com a linha, spec 027 fatia 5).
 * Pedidos em fila: vale o último.
 */
export type { Block, MainBlock, ShaderBlock, SlotBlock, StudioIssue }
export type StudioError = WorkerError
export type CompileResult =
  | { ok: true; ms: number; frameMs: number }
  | { ok: false; errors: StudioError[]; ms: number }
  | { ok: false; superseded: true }

export const EQ_KEYS: Record<MainBlock, 'init_eqs_eel' | 'frame_eqs_eel' | 'pixel_eqs_eel'> = {
  init: 'init_eqs_eel',
  frame: 'frame_eqs_eel',
  pixel: 'pixel_eqs_eel'
}
/** Teto do quadro de teste no Worker. */
export const TIMEOUT_MS = 1000
/** Teto da compilação dos módulos no Worker (antes de rodar o primeiro bloco). */
export const COMPILE_TIMEOUT_MS = 10000
/** Um quadro mais lento que isso no Worker seria um app parado: recusado. */
export const SLOW_FRAME_MS = 250

type WorkerFactory = () => Worker

export class StudioCompiler {
  private worker: Worker | null = null
  private validator: Validator | null = null
  private seq = 0
  private disposed = false

  constructor(
    private readonly ctx: AudioContext,
    private readonly makeWorker: WorkerFactory,
    private readonly mesh: () => { w: number; h: number }
  ) {}

  /** Compila `preset` (já com as equações editadas). Resolve com o resultado ou `superseded`. */
  async compile(preset: Preset): Promise<CompileResult> {
    const seq = ++this.seq
    const t0 = performance.now()
    const code = {
      init: String(preset.init_eqs_eel ?? ''),
      frame: String(preset.frame_eqs_eel ?? ''),
      pixel: String(preset.pixel_eqs_eel ?? '')
    }
    const base = preset.baseVals && typeof preset.baseVals === 'object' ? (preset.baseVals as Record<string, number>) : {}
    const check = await this.check(seq, code, base, slotChecks(preset))
    if (seq !== this.seq || this.disposed) return { ok: false, superseded: true }
    // Erros (sintaxe, laço sem fim, valor inválido) primeiro; lento só quando o resto passou.
    if (check.errors.length) return { ok: false, errors: check.errors, ms: performance.now() - t0 }
    if (check.frameMs > SLOW_FRAME_MS) {
      return {
        ok: false,
        errors: [{ block: check.slowBlock ?? 'pixel', line: null, issue: { kind: 'slow', ms: Math.round(check.frameMs) } }],
        ms: performance.now() - t0
      }
    }
    this.validator ??= new Validator(this.ctx)
    const err = await this.validator.inspect(preset)
    if (seq !== this.seq || this.disposed) return { ok: false, superseded: true }
    if (err?.kind === 'shader') {
      // Shader (027, fatia 5): no bloco dele, com a linha no texto do preset e a mensagem do compilador.
      return { ok: false, errors: [{ block: err.which, line: err.line, issue: { kind: 'glsl', detail: err.detail } }], ms: performance.now() - t0 }
    }
    if (err) return { ok: false, errors: [{ block: 'frame', line: null, issue: err }], ms: performance.now() - t0 }
    return { ok: true, ms: performance.now() - t0, frameMs: check.frameMs }
  }

  private check(seq: number, code: Record<MainBlock, string>, baseVals: Record<string, number>, slots: SlotCheck[]): Promise<{ errors: StudioError[]; frameMs: number; slowBlock?: Block }> {
    return new Promise((resolve) => {
      const w = (this.worker ??= this.makeWorker())
      let running: Block | null = null
      const done = (r: { errors: StudioError[]; frameMs: number; slowBlock?: Block }): void => {
        window.clearTimeout(timer)
        w.removeEventListener('message', onMsg)
        resolve(r)
      }
      // O teto de 1 s conta a partir do primeiro bloco rodando: compilar os módulos (equações + até
      // 8 ondas/formas, num Worker recém-criado) pode levar mais que isso e não trava nada. Até lá,
      // um teto folgado só para o caso de o Worker não responder.
      const stuck = (): void => {
        w.terminate()
        if (this.worker === w) this.worker = null
        done({
          errors: [{ block: running ?? 'frame', line: null, issue: { kind: 'timeout' } }],
          frameMs: TIMEOUT_MS
        })
      }
      let timer = window.setTimeout(stuck, COMPILE_TIMEOUT_MS)
      const onMsg = (e: MessageEvent<CheckReply>): void => {
        const m = e.data
        if (m.seq !== seq) return
        if (m.kind === 'running') {
          // Sem resposta em 1 s depois disso: laço sem fim (ou quase). O Worker preso é encerrado.
          if (running === null) {
            window.clearTimeout(timer)
            timer = window.setTimeout(stuck, TIMEOUT_MS)
          }
          running = m.block
        } else done({ errors: m.errors, frameMs: m.ms, slowBlock: running ?? undefined })
      }
      w.addEventListener('message', onMsg)
      w.postMessage({ seq, code, mesh: this.mesh(), baseVals, slots } satisfies CheckRequest)
    })
  }

  /** Descarta o Worker e o visualizador de teste (WEBGL_lose_context). */
  dispose(): void {
    this.disposed = true
    this.seq++
    this.worker?.terminate()
    this.worker = null
    this.validator?.dispose()
    this.validator = null
  }
}
