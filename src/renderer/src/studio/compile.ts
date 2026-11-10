import type { Preset } from 'butterchurn'
import { Validator } from '../importer'
import type { Block, CheckReply, CheckRequest } from './eel-worker'

/**
 * Compilação ao vivo do Estúdio (spec 026). Cada versão passa por duas barreiras antes de
 * chegar ao visualizador principal:
 * 1. Worker com o eel-wasm: erros com bloco e linha, e um quadro rodado com teto de 1 s
 *    (laço sem fim não congela a interface: o Worker é encerrado e recriado);
 * 2. visualizador de teste de 64×64 (o da 022): equações no motor + shaders.
 * Pedidos em fila: vale o último.
 */
export type { Block }
export interface StudioError {
  block: Block
  line: number | null
  message: string
}
export type CompileResult =
  | { ok: true; ms: number; frameMs: number }
  | { ok: false; errors: StudioError[]; ms: number }
  | { ok: false; superseded: true }

export const EQ_KEYS: Record<Block, 'init_eqs_eel' | 'frame_eqs_eel' | 'pixel_eqs_eel'> = {
  init: 'init_eqs_eel',
  frame: 'frame_eqs_eel',
  pixel: 'pixel_eqs_eel'
}
/** Teto do quadro de teste no Worker. */
export const TIMEOUT_MS = 1000
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
    private readonly meshPoints: () => number
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
    const check = await this.check(seq, code)
    if (seq !== this.seq || this.disposed) return { ok: false, superseded: true }
    if (check.errors.length) return { ok: false, errors: check.errors, ms: performance.now() - t0 }
    if (check.frameMs > SLOW_FRAME_MS) {
      return {
        ok: false,
        errors: [{ block: check.slowBlock ?? 'pixel', line: null, message: `Lento demais: ${Math.round(check.frameMs)} ms por quadro (laço longo?).` }],
        ms: performance.now() - t0
      }
    }
    this.validator ??= new Validator(this.ctx)
    const err = await this.validator.check(preset)
    if (seq !== this.seq || this.disposed) return { ok: false, superseded: true }
    if (err) return { ok: false, errors: [{ block: 'frame', line: null, message: err }], ms: performance.now() - t0 }
    return { ok: true, ms: performance.now() - t0, frameMs: check.frameMs }
  }

  private check(seq: number, code: Record<Block, string>): Promise<{ errors: StudioError[]; frameMs: number; slowBlock?: Block }> {
    return new Promise((resolve) => {
      const w = (this.worker ??= this.makeWorker())
      let running: Block | null = null
      const done = (r: { errors: StudioError[]; frameMs: number; slowBlock?: Block }): void => {
        window.clearTimeout(timer)
        w.removeEventListener('message', onMsg)
        resolve(r)
      }
      // Sem resposta em 1 s: laço sem fim (ou quase). O Worker preso é encerrado.
      const timer = window.setTimeout(() => {
        w.terminate()
        if (this.worker === w) this.worker = null
        done({
          errors: [{ block: running ?? 'frame', line: null, message: 'Laço sem fim ou longo demais: passou de 1 s num quadro. A versão não foi carregada.' }],
          frameMs: TIMEOUT_MS
        })
      }, TIMEOUT_MS)
      const onMsg = (e: MessageEvent<CheckReply>): void => {
        const m = e.data
        if (m.seq !== seq) return
        if (m.kind === 'running') running = m.block
        else done({ errors: m.errors, frameMs: m.ms, slowBlock: running ?? undefined })
      }
      w.addEventListener('message', onMsg)
      w.postMessage({ seq, code, points: this.meshPoints() } satisfies CheckRequest)
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
