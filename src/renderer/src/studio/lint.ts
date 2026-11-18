import { parse } from 'eel-wasm'
import type { Block, MainBlock, ShaderBlock, SlotBlock } from './eel-worker'
import { SLOT_INDEXES, slotOn, type Slots } from './slots'

/**
 * Verificador próprio do Estúdio (spec 027, fatia 10): avisos que não bloqueiam. O preset
 * continua compilando e tocando; o aviso só aponta o que provavelmente é um engano.
 * - variável lida que nunca recebe valor e não é do MilkDrop (`bas_att` → "Você quis dizer `bass_att`?");
 *   no MilkDrop uma variável assim vale 0, por isso compila e não é erro;
 * - `tex2D`/`tex2d`/`tex3D` num shader (o motor usa GLSL: `texture`);
 * - chaves `{ }` de shader que não fecham.
 * Função desconhecida já é erro do compilador (eel-wasm); aqui só a sugestão do "Corrigir".
 */

export type LintIssue =
  | { kind: 'unknownVar'; name: string; suggest: string | null }
  | { kind: 'tex2d'; name: string }
  /** `extra` = sobra um `}`; senão, falta fechar um `{`. */
  | { kind: 'braces'; extra: boolean }
export interface StudioWarning {
  block: Block
  line: number
  issue: LintIssue
  /** O que o "Corrigir" troca na linha (palavra inteira). */
  fix: { from: string; to: string } | null
}

/** Variáveis que o motor dá às equações (MilkDrop 2 / Butterchurn 3): globais, por quadro, por ponto, ondas e formas. */
const VARS = [
  // globais
  'time', 'fps', 'frame', 'progress', 'bass', 'mid', 'treb', 'bass_att', 'mid_att', 'treb_att',
  'meshx', 'meshy', 'aspectx', 'aspecty', 'pixelsx', 'pixelsy', 'rand_start', 'rand_preset',
  // por quadro
  'decay', 'wave_a', 'wave_r', 'wave_g', 'wave_b', 'wave_x', 'wave_y', 'wave_scale', 'wave_smoothing',
  'wave_mode', 'old_wave_mode', 'wave_mystery', 'wave_dots', 'wave_thick', 'wave_usedots', 'wave_brighten',
  'additivewave', 'modwavealphabyvolume', 'modwavealphastart', 'modwavealphaend',
  'ob_size', 'ob_r', 'ob_g', 'ob_b', 'ob_a', 'ib_size', 'ib_r', 'ib_g', 'ib_b', 'ib_a',
  'mv_x', 'mv_y', 'mv_dx', 'mv_dy', 'mv_l', 'mv_r', 'mv_g', 'mv_b', 'mv_a', 'bmotionvectorson',
  'echo_zoom', 'echo_alpha', 'echo_orient', 'darken_center', 'gammaadj', 'monitor',
  'warp', 'warpanimspeed', 'warpscale', 'zoom', 'zoomexp', 'rot', 'cx', 'cy', 'dx', 'dy', 'sx', 'sy',
  'fshader', 'wrap', 'invert', 'brighten', 'darken', 'solarize',
  'b1n', 'b2n', 'b3n', 'b1x', 'b2x', 'b3x', 'b1ed',
  'blur1_min', 'blur1_max', 'blur2_min', 'blur2_max', 'blur3_min', 'blur3_max', 'blur1_edge_darken',
  // por ponto (per_pixel)
  'x', 'y', 'rad', 'ang',
  // ondas
  'sample', 'value1', 'value2', 'r', 'g', 'b', 'a', 'samples', 'sep', 'scaling', 'spectrum', 'smoothing',
  'usedots', 'thick', 'additive', 'enabled',
  // formas
  'sides', 'r2', 'g2', 'b2', 'a2', 'border_r', 'border_g', 'border_b', 'border_a', 'thickoutline',
  'textured', 'tex_zoom', 'tex_ang', 'num_inst', 'instance'
]
const VAR_SET = new Set(VARS)
/** Funções do eel-wasm 0.0.16 (as que o compilador aceita). */
export const FUNCS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'rand', 'pow', 'log', 'log10', 'exp', 'sigmoid',
  'sqr', 'sqrt', 'abs', 'int', 'floor', 'ceil', 'min', 'max', 'sign', 'above', 'below', 'equal', 'bnot',
  'band', 'bor', 'if', 'while', 'loop', 'exec2', 'exec3', 'megabuf', 'gmegabuf', 'assign'
]
/** `q1`…, `t1`…, `reg00`…: sempre existem. */
const SPECIAL = /^(q\d+|t\d+|reg\d\d)$/

/** Distância de edição (Levenshtein), com teto: acima de `max` devolve `max + 1`. */
function dist(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j]! < best) best = cur[j]!
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]!
}

/** O nome mais parecido (até 2 letras de diferença, menos que a metade do nome), ou `null`. */
function nearest(name: string, pool: Iterable<string>): string | null {
  const max = Math.min(2, Math.floor((name.length - 1) / 2))
  if (max < 1) return null
  let best: string | null = null
  let bd = max + 1
  for (const c of pool) {
    if (c === name) continue
    const d = dist(name, c, max)
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return best
}

/** Sugestão para uma função que o compilador não conhece (`sinn` → `sin`). */
export const suggestFunction = (fn: string): string | null => nearest(fn.toLowerCase(), FUNCS)

interface Node {
  type: string
  value?: unknown
  loc?: { first_line: number }
  left?: Node
  right?: Node
  callee?: Node
  arguments?: Node[]
  body?: Node[]
}

/** Lê o bloco: variáveis atribuídas e lidas (com a linha). `null` = não parseia (o erro é do compilador). */
function scan(text: string): { assigned: Set<string>; reads: { name: string; line: number }[] } | null {
  let ast: Node
  try {
    ast = parse(text) as unknown as Node
  } catch {
    return null
  }
  const assigned = new Set<string>()
  const reads: { name: string; line: number }[] = []
  const walk = (n: Node | undefined): void => {
    if (!n || typeof n !== 'object') return
    switch (n.type) {
      case 'IDENTIFIER':
        reads.push({ name: String(n.value), line: n.loc?.first_line ?? 1 })
        return
      case 'ASSIGNMENT_EXPRESSION':
        if (n.left?.type === 'IDENTIFIER') {
          assigned.add(String(n.left.value))
          // `x += 1` também lê `x`, mas quem escreve assim já deu valor a ela (vale 0 no começo).
        } else walk(n.left)
        walk(n.right)
        return
      case 'CALL_EXPRESSION': {
        const args = n.arguments ?? []
        if (n.callee?.value === 'assign' && args[0]?.type === 'IDENTIFIER') {
          assigned.add(String(args[0].value))
          args.slice(1).forEach(walk)
        } else args.forEach(walk)
        return
      }
      default:
        n.body?.forEach(walk)
        walk(n.left)
        walk(n.right)
        if (n.type === 'UNARY_EXPRESSION') walk(n.value as Node)
    }
  }
  walk(ast)
  return { assigned, reads }
}

/** Tira comentários `//` e `/* *\/` do GLSL mantendo as quebras de linha (as linhas não mudam). */
function stripGlsl(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))
}

function lintShader(block: ShaderBlock, text: string, out: StudioWarning[]): void {
  const raw = text.split('\n')
  const lines = stripGlsl(text).split('\n')
  let depth = 0
  let extraAt = 0
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/\b(tex2d|tex2D|tex3D|tex3d)\s*\(/g)) out.push({ block, line: i + 1, issue: { kind: 'tex2d', name: m[1]! }, fix: { from: m[1]!, to: 'texture' } })
    for (const ch of l) {
      if (ch === '{') depth++
      else if (ch === '}' && --depth < 0 && !extraAt) extraAt = i + 1
    }
  })
  if (extraAt) out.push({ block, line: extraAt, issue: { kind: 'braces', extra: true }, fix: null })
  else if (depth > 0) {
    let last = lines.length
    while (last > 1 && !raw[last - 1]!.trim()) last--
    out.push({ block, line: last, issue: { kind: 'braces', extra: false }, fix: null })
  }
}

export interface LintTarget {
  code: Record<MainBlock | ShaderBlock, string>
  slots: Slots
  /** `baseVals` do preset (os parâmetros dele também são variáveis). */
  base: Record<string, unknown>
}

/** Avisos do preset em edição, na ordem dos blocos. Slots desligados ficam de fora (só leitura). */
export function lint(t: LintTarget): StudioWarning[] {
  const blocks: { block: MainBlock | SlotBlock; text: string }[] = [
    { block: 'init', text: t.code.init },
    { block: 'frame', text: t.code.frame },
    { block: 'pixel', text: t.code.pixel }
  ]
  const known = new Set<string>(Object.keys(t.base).map((k) => k.toLowerCase()))
  const context: string[] = []
  for (const i of SLOT_INDEXES) {
    const w = t.slots.waves[i]!
    Object.keys(w.baseVals).forEach((k) => known.add(k.toLowerCase()))
    context.push(w.init_eqs_eel)
    if (slotOn('wave', w.baseVals)) blocks.push({ block: `wave${i}_frame`, text: w.frame_eqs_eel }, { block: `wave${i}_point`, text: w.point_eqs_eel })
    else context.push(w.frame_eqs_eel, w.point_eqs_eel)
  }
  for (const i of SLOT_INDEXES) {
    const s = t.slots.shapes[i]!
    Object.keys(s.baseVals).forEach((k) => known.add(k.toLowerCase()))
    context.push(s.init_eqs_eel)
    if (slotOn('shape', s.baseVals)) blocks.push({ block: `shape${i}_frame`, text: s.frame_eqs_eel })
    else context.push(s.frame_eqs_eel)
  }
  // Atribuída em qualquer bloco do preset = do usuário (sem checar a ordem: o aviso não pode errar para mais).
  const scans = blocks.map((b) => ({ ...b, r: b.text.trim() ? scan(b.text) : null }))
  for (const s of scans) s.r?.assigned.forEach((v) => known.add(v))
  for (const c of context) if (c.trim()) scan(c)?.assigned.forEach((v) => known.add(v))

  const out: StudioWarning[] = []
  const pool = [...VARS, ...[...known].filter((k) => !VAR_SET.has(k))]
  for (const s of scans) {
    if (!s.r) continue
    const seen = new Set<string>()
    for (const { name, line } of s.r.reads) {
      if (seen.has(name) || VAR_SET.has(name) || known.has(name) || SPECIAL.test(name)) continue
      seen.add(name)
      const suggest = nearest(name, pool)
      out.push({ block: s.block, line, issue: { kind: 'unknownVar', name, suggest }, fix: suggest ? { from: name, to: suggest } : null })
    }
  }
  lintShader('warp', t.code.warp, out)
  lintShader('comp', t.code.comp, out)
  return out
}

const escRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Troca `from` por `to` (palavra inteira, sem diferenciar maiúsculas, como o EEL) na `line` do texto. */
export function applyFix(text: string, line: number, from: string, to: string): string {
  const lines = text.split('\n')
  const l = lines[line - 1]
  if (l === undefined) return text
  lines[line - 1] = l.replace(new RegExp(`(?<![\\w.])${escRe(from)}(?![\\w.])`, 'gi'), to)
  return lines.join('\n')
}
