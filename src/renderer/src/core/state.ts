/**
 * Estado persistido do app (architecture §1, §7). settings.json e library.json
 * são lidos e escritos pelo main; aqui ficam os tipos, os padrões e a
 * sanitização: um JSON velho, editado à mão ou estranho nunca quebra o app —
 * campo inválido volta ao padrão.
 */

/** Intervalos da lista dos Ajustes rápidos (spec 011); as Configurações aceitam 5–120 s. */
export const ROTATION_STEPS_S = [15, 30, 45, 90]
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

/** Texto sobre o visual (spec 014). */
export const PRESET_NAME_MODES = ['always', 'manual', 'never'] as const
export type PresetNameMode = (typeof PRESET_NAME_MODES)[number]
export const TOAST_MODES = ['all', 'important', 'none'] as const
export type ToastMode = (typeof TOAST_MODES)[number]
export interface OverlayText {
  /** Assinatura na troca: sempre, só nas trocas manuais, nunca. */
  presetName: PresetNameMode
  /** Título da faixa (arquivo/SoundCloud, Fase 3): só o estado por enquanto. */
  trackTitle: boolean
  toasts: ToastMode
  /** Modo limpo (`T`): esconde assinatura e avisos não importantes, sem mudar o resto. */
  clean: boolean
}

/** Regra de uma troca: tipo e tempo. Com `cut`, o tempo fica guardado para quando voltar a misturar. */
export interface BlendRule {
  type: BlendType
  seconds: number
}

export type RotationOrder = 'random' | 'collection'
export type StartupPreset = 'last' | 'random' | 'favorite'

/** Renderização (spec 011, Configurações › Renderização): aplicada na hora, sem reiniciar. */
export const MESH_SIZES = [
  [32, 24],
  [48, 36],
  [64, 48],
  [96, 72],
  [128, 96]
] as const
export const PIXEL_RATIOS = ['auto', 1, 1.5, 2] as const
export type PixelRatio = (typeof PIXEL_RATIOS)[number]
export const TEXTURE_RATIOS = [0.5, 0.75, 1] as const
export const CANVAS_SCALES = [1, 0.75, 0.5] as const
export const FPS_LIMITS = [30, 45, 60, 144, 'monitor'] as const
export interface RenderSettings {
  meshWidth: number
  meshHeight: number
  pixelRatio: PixelRatio
  textureRatio: number
  fxaa: boolean
  /** Fração da janela usada como tamanho do render (o canvas estica). */
  canvasScale: number
  extraImages: boolean
}
export type FpsLimit = 'monitor' | number
export type OverlayName = 'library' | 'search' | 'quick' | 'settings'

export interface Settings {
  /** 2 = limite de fps padrão 60 (antes: taxa do monitor). */
  version: 2
  /** Ganho em vigor (Ajustes rápidos). Ao abrir, volta ao `gainDefaultDb`. */
  gainDb: number
  /** Ganho padrão: o ganho ao abrir (Configurações › Captura). */
  gainDefaultDb: number
  rotation: {
    enabled: boolean
    intervalSeconds: number
    order: RotationOrder
    collectionId: string | null
  }
  /** Troca manual (teclado, faixa, Biblioteca, busca) e automática (rotação, coleção). */
  blend: { manual: BlendRule; auto: BlendRule }
  expression: { level: number; curve: ExpressionCurve; adaptation: ExpressionAdaptation }
  overlayText: OverlayText
  fpsLimit: FpsLimit
  startupPreset: StartupPreset
  /** Usado quando `startupPreset` é 'favorite'. */
  startupFavorite: string | null
  startFullscreen: boolean
  lastPreset: string | null
  /** Faixa de controle sempre visível (sem UI até a 011). */
  pinControls: boolean
  /** Mostrar fps na faixa (Configurações › Desempenho). */
  showFps: boolean
  render: RenderSettings
  /** Cartão de boas-vindas já visto (spec 012). */
  welcomeSeen: boolean
  /** Desempenho por preset (spec 012, P2): mostrar o aviso de preset pesado abaixo de `minFps`. */
  perf: { skipSlow: boolean; minFps: number }
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
  /** fps médio medido de cada preset depois do blend (spec 012, P2). */
  presetFps: Record<string, number>
}

export function defaultSettings(): Settings {
  return {
    version: 2,
    gainDb: 0,
    gainDefaultDb: 0,
    rotation: { enabled: true, intervalSeconds: 30, order: 'random', collectionId: null },
    blend: { manual: { type: 'random', seconds: 1 }, auto: { type: 'random', seconds: 2.7 } },
    expression: { level: 0, curve: 'b', adaptation: 'normal' },
    overlayText: { presetName: 'always', trackTitle: true, toasts: 'all', clean: false },
    fpsLimit: 60,
    startupPreset: 'last',
    startupFavorite: null,
    startFullscreen: false,
    lastPreset: null,
    pinControls: false,
    showFps: false,
    render: defaultRender(),
    welcomeSeen: false,
    perf: { skipSlow: true, minFps: 30 }
  }
}

export function defaultRender(): RenderSettings {
  return { meshWidth: 48, meshHeight: 36, pixelRatio: 'auto', textureRatio: 1, fxaa: true, canvasScale: 1, extraImages: false }
}

/** Valida `render` (de settings.json ou do comando `render.set`), campo a campo. */
export function sanitizeRender(raw: unknown, base: RenderSettings = defaultRender()): RenderSettings {
  const r = isObj(raw) ? raw : {}
  const mesh = MESH_SIZES.find(([w, h]) => w === r.meshWidth && h === r.meshHeight)
  return {
    meshWidth: mesh ? mesh[0] : base.meshWidth,
    meshHeight: mesh ? mesh[1] : base.meshHeight,
    pixelRatio: PIXEL_RATIOS.includes(r.pixelRatio as PixelRatio) ? (r.pixelRatio as PixelRatio) : base.pixelRatio,
    textureRatio: TEXTURE_RATIOS.includes(r.textureRatio as 1) ? (r.textureRatio as number) : base.textureRatio,
    fxaa: bool(r.fxaa, base.fxaa),
    canvasScale: CANVAS_SCALES.includes(r.canvasScale as 1) ? (r.canvasScale as number) : base.canvasScale,
    extraImages: bool(r.extraImages, base.extraImages)
  }
}

export function defaultLibrary(): Library {
  return { version: 1, favorites: [], hidden: [], hiddenPerf: [], recents: [], collections: [], presetFps: {} }
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
  const text = isObj(raw.overlayText) ? raw.overlayText : {}
  // Até a versão 1, 'monitor' era o padrão gravado sem escolha do usuário (não havia UI):
  // migra uma vez para 60. Depois da versão 2, 'monitor' salvo é escolha e fica.
  const fpsLimit: FpsLimit =
    raw.fpsLimit === 'monitor' ? (raw.version === 2 ? 'monitor' : 60) : num(raw.fpsLimit, 15, 360, 0) || d.fpsLimit
  // O ganho padrão nasce do ganho salvo (antes da 011, o ganho salvo era o ganho ao abrir).
  const gainDefaultDb = Math.round(num(raw.gainDefaultDb, GAIN_MIN_DB, GAIN_MAX_DB, num(raw.gainDb, GAIN_MIN_DB, GAIN_MAX_DB, d.gainDefaultDb)))
  return {
    version: 2,
    gainDb: gainDefaultDb,
    gainDefaultDb,
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
    overlayText: {
      presetName: oneOf(text.presetName, PRESET_NAME_MODES, d.overlayText.presetName),
      trackTitle: bool(text.trackTitle, d.overlayText.trackTitle),
      toasts: oneOf(text.toasts, TOAST_MODES, d.overlayText.toasts),
      clean: bool(text.clean, d.overlayText.clean)
    },
    fpsLimit,
    startupPreset: oneOf(raw.startupPreset, ['last', 'random', 'favorite'], d.startupPreset),
    startupFavorite: typeof raw.startupFavorite === 'string' && raw.startupFavorite ? raw.startupFavorite : null,
    startFullscreen: bool(raw.startFullscreen, d.startFullscreen),
    lastPreset: typeof raw.lastPreset === 'string' && raw.lastPreset ? raw.lastPreset : null,
    pinControls: bool(raw.pinControls, d.pinControls),
    showFps: bool(raw.showFps, d.showFps),
    render: sanitizeRender(raw.render),
    welcomeSeen: bool(raw.welcomeSeen, d.welcomeSeen),
    perf: {
      skipSlow: bool(isObj(raw.perf) ? raw.perf.skipSlow : undefined, d.perf.skipSlow),
      minFps: Math.round(num(isObj(raw.perf) ? raw.perf.minFps : undefined, 15, 60, d.perf.minFps) / 5) * 5
    }
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
    collections,
    presetFps: sanitizeFps(raw.presetFps)
  }
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

/** Máximo de presets com fps guardado (o pacote tem ~400; folga para os extras). */
export const PRESET_FPS_MAX = 4000

function sanitizeFps(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!isObj(v)) return out
  let n = 0
  for (const [k, f] of Object.entries(v)) {
    if (n >= PRESET_FPS_MAX) break
    if (k && typeof f === 'number' && Number.isFinite(f) && f > 0) {
      out[k] = Math.round(Math.min(f, 1000))
      n++
    }
  }
  return out
}
