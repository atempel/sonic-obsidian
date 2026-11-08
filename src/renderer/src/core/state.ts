/**
 * Estado persistido do app (architecture §1, §7). settings.json e library.json
 * são lidos e escritos pelo main; aqui ficam os tipos, os padrões e a
 * sanitização: um JSON velho, editado à mão ou estranho nunca quebra o app —
 * campo inválido volta ao padrão.
 */

/** Intervalos que `[` / `]` percorrem até os Ajustes rápidos (spec 011). */
export const ROTATION_STEPS_S = [10, 15, 30, 60, 120]
export const GAIN_MIN_DB = -12
export const GAIN_MAX_DB = 12
export const RECENTS_MAX = 8

/** Tipos de transição (spec 013), na ordem que `B` percorre. */
export const BLEND_TYPES = ['cut', 'crossfade', 'wipe', 'plasma', 'radial', 'random'] as const
export type BlendType = (typeof BLEND_TYPES)[number]
export const BLEND_TYPE_LABEL: Record<BlendType, string> = {
  cut: 'Corte seco',
  crossfade: 'Crossfade',
  wipe: 'Varredura',
  plasma: 'Plasma',
  radial: 'Radial',
  random: 'Aleatório'
}
/** Tempos que `↑` / `↓` percorrem (troca manual). */
export const BLEND_STEPS_S = [0.25, 0.5, 1, 2, 4, 8]
export const BLEND_MIN_S = 0.1
export const BLEND_MAX_S = 10
/**
 * Expressividade (spec 015): `+`/`−` de −3 a +3. Caráter (`X`) = como o nível age;
 * Memória (`Shift+X`) = quanto tempo o visual leva para se acostumar ao volume.
 * Nos dados, `curve` e `adaptation` (nomes do spike).
 */
export const EXPRESSION_MIN = -3
export const EXPRESSION_MAX = 3
export const EXPRESSION_CURVES = ['a', 'b', 'c'] as const
export type ExpressionCurve = (typeof EXPRESSION_CURVES)[number]
export const EXPRESSION_ADAPTATIONS = ['normal', 'slow', 'locked'] as const
export type ExpressionAdaptation = (typeof EXPRESSION_ADAPTATIONS)[number]
export const EXPRESSION_CURVE_LABEL: Record<ExpressionCurve, string> = {
  a: 'Contraste — picos mais altos, vales mais fundos',
  b: 'Energia — contraste e a base mais agitada',
  c: 'Nervo — energia e reação seca (+) ou suave (−)'
}
export const EXPRESSION_ADAPTATION_LABEL: Record<ExpressionAdaptation, string> = {
  normal: 'curta — se acostuma ao volume em ~4 s',
  slow: 'longa — o volume pesa por ~30 s',
  locked: 'fixa — partes altas da música sempre mais fortes'
}

/** Regra de uma troca: tipo e tempo. Com `cut`, o tempo fica guardado para quando voltar a misturar. */
export interface BlendRule {
  type: BlendType
  seconds: number
}

export type RotationOrder = 'random' | 'collection'
export type FpsLimit = 'monitor' | number
export type OverlayName = 'library' | 'search' | 'quick' | 'settings'

export interface Settings {
  version: 1
  gainDb: number
  rotation: {
    enabled: boolean
    intervalSeconds: number
    order: RotationOrder
    collectionId: string | null
  }
  /** Troca manual (teclado, faixa, Biblioteca, busca) e automática (rotação, coleção). */
  blend: { manual: BlendRule; auto: BlendRule }
  expression: { level: number; curve: ExpressionCurve; adaptation: ExpressionAdaptation }
  fpsLimit: FpsLimit
  startupPreset: 'last' | 'random'
  lastPreset: string | null
  /** Faixa de controle sempre visível (sem UI até a 011). */
  pinControls: boolean
}

export interface Collection {
  id: string
  name: string
  /** Nomes completos dos presets (o nome carrega o autor). */
  presets: string[]
  intervalSeconds: number
}

export interface Library {
  version: 1
  favorites: string[]
  /** Ocultos por você ("Não mostrar mais"). */
  hidden: string[]
  /** Ocultos por desempenho (spec 012). */
  hiddenPerf: string[]
  /** Mais recente primeiro. */
  recents: string[]
  collections: Collection[]
}

export function defaultSettings(): Settings {
  return {
    version: 1,
    gainDb: 0,
    rotation: { enabled: true, intervalSeconds: 30, order: 'random', collectionId: null },
    blend: { manual: { type: 'random', seconds: 1 }, auto: { type: 'random', seconds: 2.7 } },
    expression: { level: 0, curve: 'b', adaptation: 'normal' },
    fpsLimit: 'monitor',
    startupPreset: 'last',
    lastPreset: null,
    pinControls: false
  }
}

export function defaultLibrary(): Library {
  return { version: 1, favorites: [], hidden: [], hiddenPerf: [], recents: [], collections: [] }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function num(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)

function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return options.includes(v as T) ? (v as T) : fallback
}

/** Lista de strings sem repetição, até `max` itens. */
function names(v: unknown, max = 10_000): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0))].slice(0, max)
}

/**
 * Regra de transição. Aceita o formato da 008/009 (`manualSeconds`/`autoSeconds`):
 * segundos > 0 viram Aleatório com esse tempo; 0 vira Corte seco (com o tempo padrão guardado).
 */
function sanitizeBlendRule(rule: unknown, legacySeconds: unknown, d: BlendRule): BlendRule {
  if (isObj(rule)) {
    return { type: oneOf(rule.type, BLEND_TYPES, d.type), seconds: num(rule.seconds, BLEND_MIN_S, BLEND_MAX_S, d.seconds) }
  }
  if (typeof legacySeconds === 'number' && Number.isFinite(legacySeconds)) {
    return legacySeconds > 0
      ? { type: 'random', seconds: num(legacySeconds, BLEND_MIN_S, BLEND_MAX_S, d.seconds) }
      : { type: 'cut', seconds: d.seconds }
  }
  return { ...d }
}

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings()
  if (!isObj(raw)) return d
  const rot = isObj(raw.rotation) ? raw.rotation : {}
  const blend = isObj(raw.blend) ? raw.blend : {}
  const expr = isObj(raw.expression) ? raw.expression : {}
  return {
    version: 1,
    gainDb: Math.round(num(raw.gainDb, GAIN_MIN_DB, GAIN_MAX_DB, d.gainDb)),
    rotation: {
      enabled: bool(rot.enabled, d.rotation.enabled),
      intervalSeconds: num(rot.intervalSeconds, 5, 600, d.rotation.intervalSeconds),
      order: oneOf(rot.order, ['random', 'collection'], d.rotation.order),
      collectionId: typeof rot.collectionId === 'string' ? rot.collectionId : null
    },
    blend: {
      manual: sanitizeBlendRule(blend.manual, blend.manualSeconds, d.blend.manual),
      auto: sanitizeBlendRule(blend.auto, blend.autoSeconds, d.blend.auto)
    },
    expression: {
      level: Math.round(num(expr.level, EXPRESSION_MIN, EXPRESSION_MAX, d.expression.level)),
      curve: oneOf(expr.curve, EXPRESSION_CURVES, d.expression.curve),
      adaptation: oneOf(expr.adaptation, EXPRESSION_ADAPTATIONS, d.expression.adaptation)
    },
    fpsLimit: raw.fpsLimit === 'monitor' ? 'monitor' : num(raw.fpsLimit, 15, 360, 0) || d.fpsLimit,
    startupPreset: oneOf(raw.startupPreset, ['last', 'random'], d.startupPreset),
    lastPreset: typeof raw.lastPreset === 'string' && raw.lastPreset ? raw.lastPreset : null,
    pinControls: bool(raw.pinControls, d.pinControls)
  }
}

export function sanitizeLibrary(raw: unknown): Library {
  const d = defaultLibrary()
  if (!isObj(raw)) return d
  const collections: Collection[] = []
  if (Array.isArray(raw.collections)) {
    for (const c of raw.collections) {
      if (!isObj(c) || typeof c.id !== 'string' || !c.id) continue
      if (collections.some((x) => x.id === c.id)) continue
      collections.push({
        id: c.id,
        name: typeof c.name === 'string' && c.name.trim() ? c.name.trim() : 'Coleção',
        presets: names(c.presets),
        intervalSeconds: num(c.intervalSeconds, 5, 600, 30)
      })
    }
  }
  return {
    version: 1,
    favorites: names(raw.favorites),
    hidden: names(raw.hidden),
    hiddenPerf: names(raw.hiddenPerf),
    recents: names(raw.recents, RECENTS_MAX),
    collections
  }
}

/** Próximo valor da lista de `[` / `]` a partir de um intervalo qualquer. */
export function stepInterval(current: number, direction: -1 | 1): number {
  if (direction > 0) return ROTATION_STEPS_S.find((s) => s > current) ?? ROTATION_STEPS_S.at(-1)!
  return [...ROTATION_STEPS_S].reverse().find((s) => s < current) ?? ROTATION_STEPS_S[0]!
}

/** Próximo tempo da lista de `↑` / `↓` a partir de um tempo qualquer. */
export function stepBlendSeconds(current: number, direction: -1 | 1): number {
  if (direction > 0) return BLEND_STEPS_S.find((s) => s > current + 1e-6) ?? BLEND_STEPS_S.at(-1)!
  return [...BLEND_STEPS_S].reverse().find((s) => s < current - 1e-6) ?? BLEND_STEPS_S[0]!
}

/** Próximo tipo no ciclo de `B` (ou anterior, com `Shift+B`). */
export function cycleBlendType(current: BlendType, direction: -1 | 1): BlendType {
  const i = BLEND_TYPES.indexOf(current)
  return BLEND_TYPES[(i + direction + BLEND_TYPES.length) % BLEND_TYPES.length]!
}
