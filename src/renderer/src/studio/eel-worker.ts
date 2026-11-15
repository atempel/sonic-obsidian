/**
 * Estúdio (spec 026): checagem das equações fora da thread da interface.
 * Compila cada bloco com o mesmo compilador do motor (eel-wasm) e roda um quadro
 * (init uma vez, per_frame uma vez, per_pixel em cada ponto da malha). Um laço sem fim
 * prende só este Worker: a página o encerra depois de 1 s e recusa a versão.
 * As variáveis principais existem aqui com os valores-base do preset (áudio = 1), para
 * conferir também se a equação deixa `zoom`, `rot`, `dx`… inválidos (NaN ou infinito): um valor
 * assim "contamina" a imagem que se realimenta, e ela não volta nem depois de corrigir o código.
 */
import { loadModule } from 'eel-wasm'

export type Block = 'init' | 'frame' | 'pixel'
/**
 * Problema das equações como dado, não como texto: a interface monta a frase no idioma do app
 * (spec 030), e a troca de idioma vale também para os erros já na tela.
 */
export type StudioIssue =
  /** Sintaxe: o que o compilador esperava (`want`) e o que veio (`got`; `null` = o fim do bloco). */
  | { kind: 'syntax'; want: string[]; got: string | null }
  | { kind: 'undefined'; fn: string }
  | { kind: 'args'; fn: string; expected: number; got: number }
  /** Saída que ficou NaN ou infinita. */
  | { kind: 'invalid'; name: string }
  | { kind: 'slow'; ms: number }
  | { kind: 'timeout' }
  /** O motor recusou as equações (mensagem do Butterchurn, em inglês). */
  | { kind: 'equations'; detail: string }
  | { kind: 'shader'; which: string; detail: string }
  /** Mensagem do compilador que não reconhecemos (em inglês, como veio). */
  | { kind: 'raw'; text: string }
export interface WorkerError {
  block: Block
  line: number | null
  issue: StudioIssue
}
export interface CheckRequest {
  seq: number
  code: Record<Block, string>
  /** Malha (largura × altura). */
  mesh: { w: number; h: number }
  /** Valores-base do preset (`baseVals`). */
  baseVals: Record<string, number>
}
export type CheckReply =
  | { seq: number; kind: 'running'; block: Block }
  | { seq: number; kind: 'done'; errors: WorkerError[]; ms: number }

const POOL: Record<Block, string> = { init: 'perFrame', frame: 'perFrame', pixel: 'perVertex' }

const tok = (t: string): string | null => (t === 'EOF' ? null : t.replace(/_TOKEN$/, '').toLowerCase().replace(/^'|'$/g, '"'))

/** Mensagem do compilador como dado (a frase sai no idioma do app); a linha vem de `loc` (eel-wasm 0.0.16). */
export function readError(err: unknown): { line: number | null; issue: StudioIssue } {
  const raw = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').trim()
  const loc = (err as { loc?: { first_line?: unknown } } | null)?.loc
  const line = typeof loc?.first_line === 'number' ? loc.first_line : null
  const parse = /^Parse Error: Expecting (.*), got '(.*)'$/.exec(raw)
  const undef = /^"(.+)" is not defined\.?$/.exec(raw)
  const args = /^Too (many|few) arguments passed to `(.+?)`\. Expected (\d+) but got (\d+)\.?$/.exec(raw)
  if (parse) {
    const want = parse[1]!.split(', ').map((x) => `"${x.replace(/^'|'$/g, '')}"`)
    return { line, issue: { kind: 'syntax', want: want.length <= 3 ? want : [], got: tok(parse[2]!) } }
  }
  if (undef) return { line, issue: { kind: 'undefined', fn: undef[1]!.slice(0, 80) } }
  if (args) return { line, issue: { kind: 'args', fn: args[2]!.slice(0, 80), expected: Number(args[3]), got: Number(args[4]) } }
  return { line, issue: { kind: 'raw', text: raw.slice(0, 200) } }
}

/** Saídas que o motor usa para desenhar: precisam continuar finitas. */
const FRAME_OUT = ['zoom', 'zoomexp', 'rot', 'warp', 'cx', 'cy', 'dx', 'dy', 'sx', 'sy', 'decay']
const PIXEL_OUT = ['zoom', 'zoomexp', 'rot', 'warp', 'cx', 'cy', 'dx', 'dy', 'sx', 'sy']
const AUDIO = ['bass', 'mid', 'treb', 'bass_att', 'mid_att', 'treb_att']
const Q = Array.from({ length: 32 }, (_, i) => `q${i + 1}`)
/** Quadros simulados (os valores-base voltam a cada quadro, como no motor); o último em silêncio. */
const FRAMES = 3

type Pool = Record<string, WebAssembly.Global>
const g = (v: number): WebAssembly.Global => new WebAssembly.Global({ value: 'f64', mutable: true }, v)

function makePools(base: Record<string, number>, mesh: { w: number; h: number }): { perFrame: Pool; perVertex: Pool } {
  const names = new Set([...Object.keys(base), ...FRAME_OUT, ...AUDIO, ...Q, 'time', 'fps', 'frame', 'progress', 'meshx', 'meshy', 'aspectx', 'aspecty', 'pixelsx', 'pixelsy'])
  const perFrame: Pool = {}
  for (const n of names) perFrame[n] = g(0)
  const perVertex: Pool = {}
  for (const n of [...PIXEL_OUT, ...AUDIO, ...Q, 'time', 'fps', 'frame', 'progress', 'meshx', 'meshy', 'aspectx', 'aspecty', 'x', 'y', 'rad', 'ang']) perVertex[n] = g(0)
  const fixed: Record<string, number> = { fps: 60, meshx: mesh.w, meshy: mesh.h, aspectx: 1, aspecty: 1, pixelsx: 1280, pixelsy: 720 }
  for (const [k, v] of Object.entries(fixed)) {
    if (perFrame[k]) perFrame[k]!.value = v
    if (perVertex[k]) perVertex[k]!.value = v
  }
  for (const a of AUDIO) perFrame[a]!.value = perVertex[a]!.value = 1
  return { perFrame, perVertex }
}

function resetBase(pool: Pool, base: Record<string, number>, keys: string[]): void {
  for (const k of keys) if (pool[k] && typeof base[k] === 'number') pool[k]!.value = base[k]!
}

/** Primeira saída não finita, ou null. */
const bad = (pool: Pool, keys: string[]): string | null => keys.find((k) => pool[k] && !Number.isFinite(pool[k]!.value as number)) ?? null

self.onmessage = async (e: MessageEvent<CheckRequest>) => {
  const { seq, code, mesh, baseVals } = e.data
  const errors: WorkerError[] = []
  const fns: Partial<Record<Block, () => number>> = {}
  const pools = makePools(baseVals, mesh)
  for (const block of ['init', 'frame', 'pixel'] as Block[]) {
    try {
      const mod = await loadModule({ pools: { [POOL[block]]: pools[POOL[block] as 'perFrame' | 'perVertex'] }, functions: { f: { pool: POOL[block], code: code[block] } } })
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
  const invalid = (block: Block, v: string): void =>
    void errors.push({ block, line: null, issue: { kind: 'invalid', name: v } })
  const { perFrame: pf, perVertex: pv } = pools
  resetBase(pf, baseVals, Object.keys(baseVals))
  postMessage({ seq, kind: 'running', block: 'init' } satisfies CheckReply)
  fns.init?.()
  let ms = 0
  for (let i = 0; i < FRAMES && !errors.length; i++) {
    resetBase(pf, baseVals, FRAME_OUT)
    pf.time!.value = i / 60
    pf.frame!.value = i
    // O último quadro roda com o áudio em 0 (silêncio): `log(bass)` estoura ali.
    for (const a of AUDIO) pf[a]!.value = pv[a]!.value = i === FRAMES - 1 ? 0 : 1
    const t0 = performance.now()
    postMessage({ seq, kind: 'running', block: 'frame' } satisfies CheckReply)
    fns.frame?.()
    const v = bad(pf, FRAME_OUT)
    if (v) invalid('frame', v)
    // per_pixel parte do resultado do quadro (e dos q).
    for (const k of [...PIXEL_OUT, ...Q, 'time', 'frame']) pv[k]!.value = pf[k]!.value
    const start: Record<string, number> = {}
    for (const k of PIXEL_OUT) start[k] = pv[k]!.value as number
    const pixel = fns.pixel
    if (pixel && !errors.length) {
      postMessage({ seq, kind: 'running', block: 'pixel' } satisfies CheckReply)
      for (let yi = 0; yi <= mesh.h; yi++) {
        for (let xi = 0; xi <= mesh.w; xi++) {
          for (const k of PIXEL_OUT) pv[k]!.value = start[k]!
          const x = xi / mesh.w
          const y = yi / mesh.h
          pv.x!.value = x
          pv.y!.value = y
          pv.rad!.value = Math.hypot(x - 0.5, y - 0.5) * Math.SQRT2
          pv.ang!.value = Math.atan2(y - 0.5, x - 0.5)
          pixel()
          const w = bad(pv, PIXEL_OUT)
          if (w) {
            invalid('pixel', w)
            break
          }
        }
        if (errors.length) break
      }
    }
    ms = Math.max(ms, performance.now() - t0)
  }
  postMessage({ seq, kind: 'done', errors, ms } satisfies CheckReply)
}
