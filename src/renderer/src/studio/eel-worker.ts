/**
 * Estúdio (spec 026): checagem das equações fora da thread da interface.
 * Compila cada bloco com o mesmo compilador do motor (eel-wasm) e roda um quadro
 * (init uma vez, per_frame uma vez, per_pixel em cada ponto da malha). Um laço sem fim
 * prende só este Worker: a página o encerra depois de 1 s e recusa a versão.
 * As variáveis do motor não existem aqui (valem 0); só se mede se o código termina.
 */
import { loadModule } from 'eel-wasm'

export type Block = 'init' | 'frame' | 'pixel'
export interface CheckRequest {
  seq: number
  code: Record<Block, string>
  /** Pontos da malha: (largura + 1) × (altura + 1). */
  points: number
}
export type CheckReply =
  | { seq: number; kind: 'running'; block: Block }
  | { seq: number; kind: 'done'; errors: { block: Block; line: number | null; message: string }[]; ms: number }

const POOL: Record<Block, string> = { init: 'perFrame', frame: 'perFrame', pixel: 'perVertex' }

const tok = (t: string): string => (t === 'EOF' ? 'o fim do bloco' : t.replace(/_TOKEN$/, '').toLowerCase().replace(/^'|'$/g, '"'))

/** Mensagem do compilador em português curto; a linha vem de `loc` (eel-wasm 0.0.16). */
export function readError(err: unknown): { line: number | null; message: string } {
  const raw = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').trim()
  const loc = (err as { loc?: { first_line?: unknown } } | null)?.loc
  const line = typeof loc?.first_line === 'number' ? loc.first_line : null
  let message = raw
  const parse = /^Parse Error: Expecting (.*), got '(.*)'$/.exec(raw)
  const undef = /^"(.+)" is not defined\.?$/.exec(raw)
  const args = /^Too (many|few) arguments passed to `(.+?)`\. Expected (\d+) but got (\d+)\.?$/.exec(raw)
  if (parse) {
    const want = parse[1]!.split(', ').map((x) => x.replace(/^'|'$/g, ''))
    const got = tok(parse[2]!)
    message = want.length <= 3 ? `Erro de sintaxe: esperava ${want.map((w) => `"${w}"`).join(' ou ')}, veio ${got}.` : `Erro de sintaxe perto de ${got}.`
  } else if (undef) {
    message = `A função ${undef[1]}() não existe.`
  } else if (args) {
    message = `${args[2]} recebe ${args[3]} argumento${args[3] === '1' ? '' : 's'}, recebeu ${args[4]}.`
  }
  return { line, message: message.slice(0, 200) }
}

self.onmessage = async (e: MessageEvent<CheckRequest>) => {
  const { seq, code, points } = e.data
  const errors: { block: Block; line: number | null; message: string }[] = []
  const fns: Partial<Record<Block, () => number>> = {}
  for (const block of ['init', 'frame', 'pixel'] as Block[]) {
    try {
      const mod = await loadModule({ pools: { perFrame: {}, perVertex: {} }, functions: { f: { pool: POOL[block], code: code[block] } } })
      const f = (mod.exports as Record<string, unknown>).f
      if (typeof f === 'function') fns[block] = f as () => number
    } catch (err) {
      errors.push({ block, ...readError(err) })
    }
  }
  if (errors.length) {
    postMessage({ seq, kind: 'done', errors, ms: 0 } satisfies CheckReply)
    return
  }
  const t0 = performance.now()
  postMessage({ seq, kind: 'running', block: 'init' } satisfies CheckReply)
  fns.init?.()
  postMessage({ seq, kind: 'running', block: 'frame' } satisfies CheckReply)
  fns.frame?.()
  postMessage({ seq, kind: 'running', block: 'pixel' } satisfies CheckReply)
  const pixel = fns.pixel
  if (pixel) for (let i = 0; i < points; i++) pixel()
  postMessage({ seq, kind: 'done', errors: [], ms: performance.now() - t0 } satisfies CheckReply)
}
