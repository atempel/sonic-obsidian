/**
 * Perfis de ajustes (spec 038): combinações salvas de Expressividade, Transições, Rotação e,
 * opcionalmente, Sinal e Texto sobre o visual. Aqui ficam o modelo, os quatro perfis do app,
 * a sanitização de `profiles.json`, o resumo e as diferenças. Aplicar é com o Core
 * (`profile.*` em core/commands.ts), pelos mesmos comandos dos Ajustes rápidos.
 */
import { fmtNum, t } from './i18n'
import {
  BLEND_MAX_S,
  BLEND_MIN_S,
  BLEND_TYPES,
  EXPRESSION_ADAPTATIONS,
  EXPRESSION_CURVES,
  EXPRESSION_MAX,
  EXPRESSION_MIN,
  FINE_GAIN_DB,
  GAIN_MAX_DB,
  GAIN_MIN_DB,
  PRESET_NAME_MODES,
  TOAST_MODES,
  blendTypeLabel,
  curvePresetLabel,
  defaultSettings,
  expressionAdaptationLabel,
  expressionCurveLabel,
  num,
  type BlendRule,
  type ExpressionAdaptation,
  type ExpressionCurve,
  type PresetNameMode,
  type Settings,
  type ToastMode
} from './core/state'
import { CURVE_PRESET_VALUES, sanitizeCurveState, type CurvePreset } from './freq-curve'

/** Grupos na ordem fixa (menu, formulário, resumo). */
export const PROFILE_GROUPS = ['expression', 'blend', 'rotation', 'signal', 'text'] as const
export type ProfileGroup = (typeof PROFILE_GROUPS)[number]
/** Marcados ao salvar um perfil novo (Sinal e Texto dependem da sala e do gosto). */
export const PROFILE_GROUPS_DEFAULT: readonly ProfileGroup[] = ['expression', 'blend', 'rotation']
export const PROFILE_NAME_MAX = 40
/** `Alt+1`…`Alt+9`. */
export const PROFILE_KEYS = 9

export interface ProfileValues {
  /** Com a curva por frequência (spec 040); perfil salvo antes dela abre com a curva plana. */
  expression?: { level: number; curve: ExpressionCurve; adaptation: ExpressionAdaptation; curve16: number[]; curvePreset: CurvePreset }
  blend?: { manual: BlendRule; auto: BlendRule }
  rotation?: { enabled: boolean; intervalSeconds: number; onBeat: boolean }
  signal?: { gainDb: number; autoGain: boolean }
  text?: { presetName: PresetNameMode; trackTitle: boolean; toasts: ToastMode }
}

export interface Profile {
  id: string
  name: string
  builtIn: boolean
  groups: ProfileGroup[]
  values: ProfileValues
}

export interface ProfilesFile {
  version: 1
  profiles: Profile[]
}

// ── Leitura dos ajustes ───────────────────────────────────────
type GroupValue<G extends ProfileGroup> = NonNullable<ProfileValues[G]>

/** Os valores de um grupo como estão agora nos ajustes (cópia). */
export function readGroup<G extends ProfileGroup>(s: Settings, g: G): GroupValue<G> {
  const out: { [K in ProfileGroup]: () => GroupValue<K> } = {
    expression: () => ({
      level: s.expression.level,
      curve: s.expression.curve,
      adaptation: s.expression.adaptation,
      curve16: [...s.expression.curve16],
      curvePreset: s.expression.curvePreset
    }),
    blend: () => ({ manual: { ...s.blend.manual }, auto: { ...s.blend.auto } }),
    rotation: () => ({ enabled: s.rotation.enabled, intervalSeconds: s.rotation.intervalSeconds, onBeat: s.rotation.onBeat }),
    signal: () => ({ gainDb: s.gainDb, autoGain: s.autoGain }),
    text: () => ({ presetName: s.overlayText.presetName, trackTitle: s.overlayText.trackTitle, toasts: s.overlayText.toasts })
  }
  return out[g]() as GroupValue<G>
}

export function readValues(s: Settings, groups: readonly ProfileGroup[]): ProfileValues {
  const v: ProfileValues = {}
  for (const g of groups) (v as Record<ProfileGroup, unknown>)[g] = readGroup(s, g)
  return v
}

// ── Sanitização ───────────────────────────────────────────────
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d)
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d)

/** Campo inválido → o valor do perfil Padrão (os padrões do app) naquele campo. */
export function sanitizeGroup<G extends ProfileGroup>(g: G, raw: unknown): GroupValue<G> {
  const d = readValues(defaultSettings(), PROFILE_GROUPS)
  const r = isObj(raw) ? raw : {}
  const rule = (x: unknown, dr: BlendRule): BlendRule => {
    const o = isObj(x) ? x : {}
    return { type: oneOf(o.type, BLEND_TYPES, dr.type), seconds: num(o.seconds, BLEND_MIN_S, BLEND_MAX_S, dr.seconds) }
  }
  const out: { [K in ProfileGroup]: () => GroupValue<K> } = {
    expression: () => ({
      level: Math.round(num(r.level, EXPRESSION_MIN, EXPRESSION_MAX, d.expression!.level)),
      curve: oneOf(r.curve, EXPRESSION_CURVES, d.expression!.curve),
      adaptation: oneOf(r.adaptation, EXPRESSION_ADAPTATIONS, d.expression!.adaptation),
      ...sanitizeCurveState(r.curve16, r.curvePreset)
    }),
    blend: () => ({ manual: rule(r.manual, d.blend!.manual), auto: rule(r.auto, d.blend!.auto) }),
    rotation: () => ({
      enabled: bool(r.enabled, d.rotation!.enabled),
      intervalSeconds: num(r.intervalSeconds, 5, 600, d.rotation!.intervalSeconds),
      onBeat: bool(r.onBeat, d.rotation!.onBeat)
    }),
    signal: () => {
      const autoGain = bool(r.autoGain, d.signal!.autoGain)
      const lim = autoGain ? FINE_GAIN_DB : GAIN_MAX_DB
      return { gainDb: Math.round(num(r.gainDb, Math.max(GAIN_MIN_DB, -lim), lim, d.signal!.gainDb)), autoGain }
    },
    text: () => ({
      presetName: oneOf(r.presetName, PRESET_NAME_MODES, d.text!.presetName),
      trackTitle: bool(r.trackTitle, d.text!.trackTitle),
      toasts: oneOf(r.toasts, TOAST_MODES, d.text!.toasts)
    })
  }
  return out[g]() as GroupValue<G>
}

/** Nome sem caracteres de controle, até 40. */
export function cleanProfileName(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, PROFILE_NAME_MAX).trim()
}

export const BUILTIN_IDS = ['default', 'calm', 'party', 'study'] as const

/** Grupos válidos, sem repetição, na ordem fixa. */
export function sanitizeGroups(raw: unknown): ProfileGroup[] {
  if (!Array.isArray(raw)) return []
  return PROFILE_GROUPS.filter((g) => raw.includes(g))
}

/** `profiles.json` → perfis do usuário (os do app não são gravados). Entradas inválidas saem. */
export function sanitizeProfiles(raw: unknown): Profile[] {
  const list = isObj(raw) && Array.isArray(raw.profiles) ? raw.profiles : []
  const out: Profile[] = []
  for (const p of list) {
    if (!isObj(p) || typeof p.id !== 'string' || !p.id || (BUILTIN_IDS as readonly string[]).includes(p.id)) continue
    if (out.some((x) => x.id === p.id)) continue
    const name = typeof p.name === 'string' ? cleanProfileName(p.name) : ''
    const groups = sanitizeGroups(p.groups)
    if (!name || groups.length === 0) continue
    const values: ProfileValues = {}
    const rawValues = isObj(p.values) ? p.values : {}
    for (const g of groups) (values as Record<ProfileGroup, unknown>)[g] = sanitizeGroup(g, rawValues[g])
    out.push({ id: p.id, name, builtIn: false, groups, values })
  }
  return out
}

// ── Perfis do app ─────────────────────────────────────────────
const BUILTIN_GROUPS: ProfileGroup[] = ['expression', 'blend', 'rotation']
const built = (
  id: (typeof BUILTIN_IDS)[number],
  expression: GroupValue<'expression'>,
  blend: GroupValue<'blend'>,
  rotation: GroupValue<'rotation'>
): Profile => ({ id, name: id, builtIn: true, groups: [...BUILTIN_GROUPS], values: { expression, blend, rotation } })

/** Curva de uma predefinição (Festa = Graves, protótipo `pfBuilt`; os outros, Plana). */
const curveOf = (id: Exclude<CurvePreset, 'custom'>): { curve16: number[]; curvePreset: CurvePreset } => ({ curve16: [...CURVE_PRESET_VALUES[id]], curvePreset: id })

/** Os quatro perfis do app (spec 038). Padrão = `defaultSettings()` (DECISIONS 2026-11-22). */
export function builtInProfiles(): Profile[] {
  const d = defaultSettings()
  return [
    built('default', readGroup(d, 'expression'), readGroup(d, 'blend'), readGroup(d, 'rotation')),
    built(
      'calm',
      { level: -2, curve: 'a', adaptation: 'slow', ...curveOf('flat') },
      { manual: { type: 'crossfade', seconds: 5 }, auto: { type: 'crossfade', seconds: 5 } },
      { enabled: true, intervalSeconds: 60, onBeat: false }
    ),
    built(
      'party',
      { level: 2, curve: 'c', adaptation: 'locked', ...curveOf('lows') },
      { manual: { type: 'cut', seconds: 1 }, auto: { type: 'radial', seconds: 1 } },
      { enabled: true, intervalSeconds: 15, onBeat: false }
    ),
    built(
      'study',
      { level: 0, curve: 'b', adaptation: 'normal', ...curveOf('flat') },
      { manual: { type: 'crossfade', seconds: 1 }, auto: { type: 'crossfade', seconds: 1 } },
      { enabled: false, intervalSeconds: 30, onBeat: false }
    )
  ]
}

/** Nome mostrado: os do app no idioma do app (spec 030). */
export function profileName(p: Profile): string {
  if (!p.builtIn) return p.name
  switch (p.id) {
    case 'default':
      return t('profile.builtin.default')
    case 'calm':
      return t('profile.builtin.calm')
    case 'party':
      return t('profile.builtin.party')
    default:
      return t('profile.builtin.study')
  }
}

/** Nome livre: "Festa" → "Festa (2)" se já existe (comparação sem caixa). */
export function uniqueProfileName(name: string, taken: readonly string[]): string {
  const has = (n: string): boolean => taken.some((x) => x.toLocaleLowerCase() === n.toLocaleLowerCase())
  if (!has(name)) return name
  for (let i = 2; ; i++) {
    const suffix = ` (${i})`
    const candidate = `${name.slice(0, PROFILE_NAME_MAX - suffix.length).trim()}${suffix}`
    if (!has(candidate)) return candidate
  }
}

/** "Perfil N" com o primeiro N livre. */
export function nextDefaultProfileName(taken: readonly string[]): string {
  for (let n = 1; ; n++) {
    const name = t('profile.defaultName', { n })
    if (!taken.some((x) => x.toLocaleLowerCase() === name.toLocaleLowerCase())) return name
  }
}

// ── Comparação, resumo e diferenças ───────────────────────────
const r1 = (v: number): number => Math.round(v * 10) / 10
/** Forma canônica para comparar: tempo com uma casa; no corte seco o tempo não conta. */
function canonical(g: ProfileGroup, v: unknown): unknown {
  const x = sanitizeGroup(g, v) as Record<string, unknown>
  if (g === 'blend') {
    const b = x as GroupValue<'blend'>
    const c = (r: BlendRule): BlendRule => ({ type: r.type, seconds: r.type === 'cut' ? 0 : r1(r.seconds) })
    return { manual: c(b.manual), auto: c(b.auto) }
  }
  if (g === 'rotation') return { ...x, intervalSeconds: Math.round((x as GroupValue<'rotation'>).intervalSeconds) }
  return x
}

export const sameGroup = (g: ProfileGroup, a: unknown, b: unknown): boolean => JSON.stringify(canonical(g, a)) === JSON.stringify(canonical(g, b))

/** Algum grupo do perfil difere dos ajustes de agora? */
export function isProfileModified(p: Profile, s: Settings): boolean {
  return p.groups.some((g) => !sameGroup(g, p.values[g], readGroup(s, g)))
}

const sign = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')
const head = (label: string): string => {
  const h = label.split(' — ')[0]!
  return h.charAt(0).toUpperCase() + h.slice(1)
}
const curveName = (c: ExpressionCurve): string => head(expressionCurveLabel(c))
const memoryName = (a: ExpressionAdaptation): string => head(expressionAdaptationLabel(a))
const secs = (s: number): string => `${fmtNum(r1(s), 1)} s`
const ruleText = (r: BlendRule): string => (r.type === 'cut' ? blendTypeLabel('cut') : `${blendTypeLabel(r.type)} ${secs(r.seconds)}`)
const onOff = (b: boolean): string => t(b ? 'profile.on' : 'profile.off')
const presetNameText = (m: PresetNameMode): string =>
  m === 'always' ? t('quick.presetName.always') : m === 'manual' ? t('quick.presetName.manual') : t('quick.presetName.never')
const toastsText = (m: ToastMode): string => (m === 'all' ? t('quick.toasts.all') : m === 'important' ? t('quick.toasts.important') : t('quick.toasts.none'))

/** Uma linha: "+2 · Nervo · Fixa · Graves · corte seco · 15 s". */
export function profileSummary(p: Profile): string {
  const a: string[] = []
  const v = p.values
  if (v.expression) {
    a.push(sign(v.expression.level), curveName(v.expression.curve), memoryName(v.expression.adaptation))
    // Curva por frequência (spec 040): só quando sai da plana.
    if (v.expression.curvePreset !== 'flat') a.push(curvePresetLabel(v.expression.curvePreset))
  }
  if (v.blend) {
    const m = v.blend.manual
    a.push(m.type === 'cut' ? t('profile.sum.cut') : `${blendTypeLabel(m.type).toLocaleLowerCase()} ${secs(m.seconds)}`)
  }
  if (v.rotation) a.push(v.rotation.enabled ? `${fmtNum(Math.round(v.rotation.intervalSeconds))} s` : t('profile.sum.noRotation'))
  if (v.signal) a.push(`${v.signal.autoGain ? `${t('profile.sum.normalized')} ` : ''}${sign(v.signal.gainDb)} dB`)
  if (v.text) a.push(t('profile.sum.text'))
  return a.join(' · ')
}

export interface ProfileDiff {
  group: ProfileGroup
  label: string
  from: string
  to: string
}

/** O que mudou nos grupos do perfil: salvo → agora. */
export function profileDiffs(p: Profile, s: Settings): ProfileDiff[] {
  const out: ProfileDiff[] = []
  for (const g of p.groups) {
    const saved = p.values[g]
    const now = readGroup(s, g)
    if (sameGroup(g, saved, now)) continue
    const add = (label: string, from: string, to: string): void => {
      if (from !== to) out.push({ group: g, label, from, to })
    }
    if (g === 'expression') {
      const a = sanitizeGroup('expression', saved)
      const b = now as GroupValue<'expression'>
      add(t('quick.expression'), sign(a.level), sign(b.level))
      add(t('quick.character'), curveName(a.curve), curveName(b.curve))
      add(t('quick.memory'), memoryName(a.adaptation), memoryName(b.adaptation))
      // Curva (spec 040): o nome da predefinição; mesma predefinição com valores diferentes → "Personalizada" já cobre.
      if (a.curve16.join() !== b.curve16.join() || a.curvePreset !== b.curvePreset) add(t('curve.title'), curvePresetLabel(a.curvePreset), curvePresetLabel(b.curvePreset))
    } else if (g === 'blend') {
      const a = sanitizeGroup('blend', saved)
      const b = now as GroupValue<'blend'>
      add(t('profile.diff.manual'), ruleText(a.manual), ruleText(b.manual))
      add(t('profile.diff.auto'), ruleText(a.auto), ruleText(b.auto))
    } else if (g === 'rotation') {
      const a = sanitizeGroup('rotation', saved)
      const b = now as GroupValue<'rotation'>
      add(t('quick.autoRotation'), onOff(a.enabled), onOff(b.enabled))
      add(t('quick.switchEvery'), `${fmtNum(Math.round(a.intervalSeconds))} s`, `${fmtNum(Math.round(b.intervalSeconds))} s`)
      add(t('quick.onBeat'), onOff(a.onBeat), onOff(b.onBeat))
    } else if (g === 'signal') {
      const a = sanitizeGroup('signal', saved)
      const b = now as GroupValue<'signal'>
      add(t('quick.normalize'), onOff(a.autoGain), onOff(b.autoGain))
      add(t('quick.gain'), `${sign(a.gainDb)} dB`, `${sign(b.gainDb)} dB`)
    } else {
      const a = sanitizeGroup('text', saved)
      const b = now as GroupValue<'text'>
      add(t('quick.presetName'), presetNameText(a.presetName), presetNameText(b.presetName))
      add(t('quick.trackTitle'), onOff(a.trackTitle), onOff(b.trackTitle))
      add(t('quick.toasts'), toastsText(a.toasts), toastsText(b.toasts))
    }
  }
  return out
}

export const groupLabel = (g: ProfileGroup): string =>
  g === 'expression' ? t('quick.expression') : g === 'blend' ? t('quick.transitions') : g === 'rotation' ? t('quick.rotation') : g === 'signal' ? t('quick.signal') : t('quick.text')

// ── Exportar e importar (spec 038, P1) ────────────────────────
/** Limite do arquivo importado (o main também confere). */
export const PROFILE_FILE_MAX = 64 * 1024

export interface ProfileFileData {
  app: 'sonic-obsidian'
  version: 1
  profile: { name: string; groups: ProfileGroup[]; values: ProfileValues }
}

/** O JSON exportado: `{ app, version, profile: { name, groups, values } }` (perfis do app com o nome no idioma do app). */
export function profileFileData(p: Profile): ProfileFileData {
  const values: ProfileValues = {}
  for (const g of p.groups) (values as Record<ProfileGroup, unknown>)[g] = sanitizeGroup(g, p.values[g])
  return { app: 'sonic-obsidian', version: 1, profile: { name: profileName(p), groups: [...p.groups], values } }
}

/** "Festa à noite!" → "festa-a-noite" (sem acento; vazio → "perfil"/"profile"). */
export function profileSlug(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return s || t('profile.file.slug')
}

/**
 * Lê um arquivo exportado. Estrutura errada (outro app, outra versão, sem nome, grupo
 * desconhecido ou repetido, valor de grupo fora da lista ou que não é objeto) → `null`.
 * Campo inválido dentro de um grupo → o valor do Padrão (a mesma sanitização do `profiles.json`).
 */
export function parseProfileFile(raw: unknown): ProfileFileData['profile'] | null {
  if (!isObj(raw) || raw.app !== 'sonic-obsidian' || raw.version !== 1 || !isObj(raw.profile)) return null
  const pr = raw.profile
  const name = typeof pr.name === 'string' ? cleanProfileName(pr.name) : ''
  if (!name || !Array.isArray(pr.groups) || pr.groups.length === 0 || !isObj(pr.values)) return null
  const listed: ProfileGroup[] = []
  for (const g of pr.groups) {
    if (!PROFILE_GROUPS.includes(g as ProfileGroup) || listed.includes(g as ProfileGroup)) return null
    listed.push(g as ProfileGroup)
  }
  const rawValues = pr.values
  if (Object.keys(rawValues).some((k) => !listed.includes(k as ProfileGroup))) return null
  const groups = PROFILE_GROUPS.filter((g) => listed.includes(g))
  const values: ProfileValues = {}
  for (const g of groups) {
    if (!isObj(rawValues[g])) return null
    ;(values as Record<ProfileGroup, unknown>)[g] = sanitizeGroup(g, rawValues[g])
  }
  return { name, groups, values }
}
