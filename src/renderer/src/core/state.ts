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
  blend: { autoSeconds: number; manualSeconds: number }
  fpsLimit: FpsLimit
  startupPreset: 'last' | 'random'
  lastPreset: string | null
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
    blend: { autoSeconds: 2.7, manualSeconds: 0 },
    fpsLimit: 'monitor',
    startupPreset: 'last',
    lastPreset: null
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

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings()
  if (!isObj(raw)) return d
  const rot = isObj(raw.rotation) ? raw.rotation : {}
  const blend = isObj(raw.blend) ? raw.blend : {}
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
      autoSeconds: num(blend.autoSeconds, 0, 10, d.blend.autoSeconds),
      manualSeconds: num(blend.manualSeconds, 0, 10, d.blend.manualSeconds)
    },
    fpsLimit: raw.fpsLimit === 'monitor' ? 'monitor' : num(raw.fpsLimit, 15, 360, 0) || d.fpsLimit,
    startupPreset: oneOf(raw.startupPreset, ['last', 'random'], d.startupPreset),
    lastPreset: typeof raw.lastPreset === 'string' && raw.lastPreset ? raw.lastPreset : null
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
