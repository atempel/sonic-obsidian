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

/** Blocos das equações principais. */
export type MainBlock = 'init' | 'frame' | 'pixel'
/** Blocos de ondas e formas (spec 027, fatia 2): `wave1_point` = `per_point` da Onda 2. */
export type SlotIndex = 0 | 1 | 2 | 3
export type SlotBlock = `wave${SlotIndex}_${'frame' | 'point'}` | `shape${SlotIndex}_frame`
/** Shaders (spec 027, fatia 5): erros vêm do motor (link do GLSL), não deste Worker. */
export type ShaderBlock = 'warp' | 'comp'
export type Block = MainBlock | SlotBlock | ShaderBlock
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
  /** Mensagem do compilador GLSL do motor (em inglês, como veio), já no bloco `warp`/`comp`. */
  | { kind: 'glsl'; detail: string }
  /** Mensagem do compilador que não reconhecemos (em inglês, como veio). */
  | { kind: 'raw'; text: string }
export interface WorkerError {
  block: Block
  line: number | null
  issue: StudioIssue
}
/** Onda ou forma ligada, para checar junto com as equações principais. */
export interface SlotCheck {
  kind: 'wave' | 'shape'
  idx: SlotIndex
  /** `baseVals` do slot (já com os padrões do motor). */
  base: Record<string, number>
  init: string
  frame: string
  /** Só ondas. */
  point?: string
}
export interface CheckRequest {
  seq: number
  code: Record<MainBlock, string>
  /** Ondas e formas ligadas. */
  slots: SlotCheck[]
  /** Malha (largura × altura). */
  mesh: { w: number; h: number }
  /** Valores-base do preset (`baseVals`). */
  baseVals: Record<string, number>
}
export type CheckReply =
  | { seq: number; kind: 'running'; block: Block }
  | { seq: number; kind: 'done'; errors: WorkerError[]; ms: number }

const POOL: Record<MainBlock, string> = { init: 'perFrame', frame: 'perFrame', pixel: 'perVertex' }

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

/** Variáveis que o motor põe no pool de cada onda e forma (além dos `baseVals` do slot). */
const SLOT_GLOBALS = [...AUDIO, ...Q, 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 'time', 'fps', 'frame', 'progress', 'meshx', 'meshy', 'aspectx', 'aspecty', 'pixelsx', 'pixelsy']
const WAVE_POINT = ['sample', 'value1', 'value2', 'x', 'y', 'r', 'g', 'b', 'a']
const SHAPE_FRAME = ['instance', 'x', 'y', 'rad', 'ang', 'sides', 'r', 'g', 'b', 'a']
/** Tetos do motor: 512 pontos por onda, 1024 instâncias por forma. */
const MAX_SAMPLES = 512
const MAX_INST = 1024

interface SlotRun {
  check: SlotCheck
  pool: Pool
  init?: () => number
  frame?: () => number
  point?: () => number
  frameBlock: SlotBlock
  pointBlock: SlotBlock | null
}

async function compileFn(pool: Pool, code: string): Promise<(() => number) | undefined> {
  const mod = await loadModule({ pools: { p: pool }, functions: { f: { pool: 'p', code } } })
  const f = (mod.exports as Record<string, unknown>).f
  return typeof f === 'function' ? (f as () => number) : undefined
}

/** Compila as ondas e formas ligadas; erros vão para o bloco editável do slot (o `init` dele conta como `per_frame`). */
async function compileSlots(slots: SlotCheck[], errors: WorkerError[]): Promise<SlotRun[]> {
  const runs: SlotRun[] = []
  for (const c of slots) {
    const pool: Pool = {}
    for (const n of new Set([...Object.keys(c.base), ...SLOT_GLOBALS, ...(c.kind === 'wave' ? WAVE_POINT : SHAPE_FRAME)])) pool[n] = g(0)
    for (const [k, v] of Object.entries(c.base)) if (Number.isFinite(v)) pool[k]!.value = v
    pool.fps!.value = 60
    const frameBlock = `${c.kind}${c.idx}_frame` as SlotBlock
    const pointBlock = c.kind === 'wave' ? (`wave${c.idx}_point` as SlotBlock) : null
    const run: SlotRun = { check: c, pool, frameBlock, pointBlock }
    const parts: [keyof SlotRun & ('init' | 'frame' | 'point'), string | undefined, SlotBlock][] = [
      ['init', c.init, frameBlock],
      ['frame', c.frame, frameBlock],
      ['point', c.point, pointBlock ?? frameBlock]
    ]
    for (const [k, code, block] of parts) {
      if (!code?.trim()) continue
      try {
        run[k] = await compileFn(pool, code)
      } catch (err) {
        // Erro no init do slot (que a interface não edita) aparece sem linha, no per_frame.
        const r = readError(err)
        errors.push({ block, line: k === 'init' ? null : r.line, issue: r.issue })
      }
    }
    runs.push(run)
  }
  return runs
}

/** Um quadro de cada onda (per_frame + per_point em cada amostra) e forma (per_frame por instância). */
function runSlots(runs: SlotRun[], seq: number, audio: number, i: number): void {
  for (const r of runs) {
    const { pool, check } = r
    for (const a of AUDIO) pool[a]!.value = audio
    pool.time!.value = i / 60
    pool.frame!.value = i
    resetBase(pool, check.base, Object.keys(check.base))
    if (check.kind === 'wave') {
      if (r.frame) {
        postMessage({ seq, kind: 'running', block: r.frameBlock } satisfies CheckReply)
        r.frame()
      }
      if (r.point) {
        postMessage({ seq, kind: 'running', block: r.pointBlock! } satisfies CheckReply)
        const n = Math.max(2, Math.min(MAX_SAMPLES, Math.round(Number(pool.samples?.value ?? MAX_SAMPLES)) || MAX_SAMPLES))
        for (let j = 0; j < n; j++) {
          pool.sample!.value = j / (n - 1)
          pool.value1!.value = pool.value2!.value = 0
          r.point()
        }
      }
    } else if (r.frame) {
      postMessage({ seq, kind: 'running', block: r.frameBlock } satisfies CheckReply)
      const n = Math.max(1, Math.min(MAX_INST, Math.round(check.base.num_inst ?? 1) || 1))
      for (let j = 0; j < n; j++) {
        resetBase(pool, check.base, SHAPE_FRAME)
        pool.instance!.value = j
        r.frame()
      }
    }
  }
}

self.onmessage = async (e: MessageEvent<CheckRequest>) => {
  const { seq, code, mesh, baseVals, slots } = e.data
  const errors: WorkerError[] = []
  const fns: Partial<Record<MainBlock, () => number>> = {}
  const pools = makePools(baseVals, mesh)
  for (const block of ['init', 'frame', 'pixel'] as MainBlock[]) {
    try {
      const mod = await loadModule({ pools: { [POOL[block]]: pools[POOL[block] as 'perFrame' | 'perVertex'] }, functions: { f: { pool: POOL[block], code: code[block] } } })
      const f = (mod.exports as Record<string, unknown>).f
      if (typeof f === 'function') fns[block] = f as () => number
    } catch (err) {
      errors.push({ block, ...readError(err) })
    }
  }
  const slotRuns = await compileSlots(slots ?? [], errors)
  if (errors.length) {
    postMessage({ seq, kind: 'done', errors, ms: 0 } satisfies CheckReply)
    return
  }
  for (const r of slotRuns) {
    if (!r.init) continue
    postMessage({ seq, kind: 'running', block: r.frameBlock } satisfies CheckReply)
    r.init()
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
    if (!errors.length) runSlots(slotRuns, seq, i === FRAMES - 1 ? 0 : 1, i)
    ms = Math.max(ms, performance.now() - t0)
  }
  postMessage({ seq, kind: 'done', errors, ms } satisfies CheckReply)
}
