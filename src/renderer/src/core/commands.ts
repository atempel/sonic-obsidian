import type { PresetLibrary } from '../presets'
import { Emitter } from './events'
import { CURVE_BANDS, CURVE_DB_MAX, CURVE_DB_MIN, CURVE_PRESET_IDS, CURVE_PRESET_VALUES, clampDb, type CurvePreset } from '../freq-curve'
import { LANGUAGE_PREFS, applyLanguage, t, type LanguagePref, type MessageKey, type Msg } from '../i18n'
import {
  cleanAuthor,
  BLEND_MAX_S,
  BLEND_MIN_S,
  BLEND_TYPES,
  EXPRESSION_ADAPTATIONS,
  EXPRESSION_CURVES,
  EXPRESSION_MAX,
  EXPRESSION_MIN,
  PRESET_NAME_MODES,
  TOAST_MODES,
  FINE_GAIN_DB,
  GAIN_MAX_DB,
  GAIN_MIN_DB,
  PRESET_FPS_MAX,
  RECENTS_MAX,
  BEAT_BARS,
  BEAT_LEAD_MAX_MS,
  VISUAL_DELAY_MAX_MS,
  UI_MODES,
  type UiMode,
  type BeatBars,
  num,
  sanitizeRender,
  type BlendType,
  type ExpressionAdaptation,
  type ExpressionCurve,
  type PresetNameMode,
  type ToastMode,
  type Collection,
  type FpsLimit,
  type Library,
  type OverlayName,
  type RotationOrder,
  type Settings,
  type StartupPreset
} from './state'
import {
  PROFILE_GROUPS,
  builtInProfiles,
  cleanProfileName,
  nextDefaultProfileName,
  parseProfileFile,
  profileName,
  readValues,
  sanitizeGroups,
  uniqueProfileName,
  type Profile
} from '../profiles'

/**
 * Núcleo de comandos (architecture §1). Teclado e UI (e o MCP, na Fase 4)
 * só agem por aqui: cada comando valida a entrada, aplica, emite eventos e
 * devolve um resultado. Nenhum comando toca o Butterchurn: quem desenha
 * assina `presetChanged`.
 */

export type Origin = 'keyboard' | 'ui' | 'rotation' | 'startup'
/** Captura do áudio do sistema: aguardando, funcionando ou recusada. */
export type CaptureState = 'pending' | 'ok' | 'denied'
export type Result<T = unknown> = { ok: true; value: T } | { ok: false; error: string }

export interface CoreEvents extends Record<string, unknown> {
  /** `blendSeconds` 0 = corte seco (o tipo vem como `cut`). */
  presetChanged: { name: string; blendType: BlendType; blendSeconds: number; origin: Origin }
  /** settings ou library mudaram (a UI relê `core.state`). */
  stateChanged: { origin: Origin }
  /** Nível de entrada (RMS depois do ganho), ~10×/s. Não passa pelo store. */
  levelTick: { level: number }
  /** Uma batida prevista caiu agora (spec 024). Não passa pelo store: a faixa pisca o ponto direto. */
  beatTick: Record<string, never>
  /** Batida travada ou perdida (spec 024): o ponto aparece ou some, a contagem muda de unidade. */
  beatState: { locked: boolean; bpm: number }
  /** Troca manual esperando a próxima batida (M23); `null` = nada esperando. */
  beatWait: { key: WaitKey | null }
  silenceChanged: { resting: boolean; notice: boolean }
  /** Ganho automático em vigor (Normalizar áudio, spec 028), quando muda ≥ 0,1 dB. Não passa pelo store. */
  autoGainTick: { db: number }
  captureChanged: { state: CaptureState }
  /** Gravação em disco concluída. */
  saved: { store: 'settings' | 'library' | 'profiles' }
  /** Checklist da captura (spec 012), a cada passo verificado. */
  captureChecks: { checks: CaptureCheck[] }
  /** Preset abaixo do mínimo de fps (spec 012, P2); `null` limpa o aviso. */
  slowPreset: { name: string; fps: number } | null
}

/** Trocas manuais que esperam a batida (M23). */
export type WaitKey = 'next' | 'previous' | 'random'

export type CheckState = 'ok' | 'fail' | 'busy' | 'pending'
/** Uma linha do diagnóstico de captura; os textos ficam como chave e se traduzem ao mostrar (spec 030). */
export interface CaptureCheck {
  label: MessageKey
  state: CheckState
  detail: Msg
  help?: MessageKey
}

export interface AppState {
  settings: Settings
  library: Library
  current: string
  overlay: OverlayName | null
  capture: CaptureState
  /** Visual segurado (`Enter`, spec 024): a rotação não troca. Não é persistido. */
  held: boolean
  /** Respiro (`Shift+Enter`): o visual deixa de receber o áudio, como se nada tocasse. Não é persistido. */
  breath: boolean
  /** Ganho automático em vigor (dB) com "Normalizar áudio" ligado; 0 desligado. Não é persistido. */
  autoGainDb: number
  /** Perfis do usuário (spec 038), na ordem de criação; os do app vêm de `builtInProfiles()`. */
  profiles: Profile[]
}

/** Efeitos fora do renderer (preload). */
export interface CoreEffects {
  saveSettings(settings: Settings): Promise<void>
  saveLibrary(library: Library): Promise<void>
  /** `profiles.json` (spec 038): só os perfis do usuário. */
  saveProfiles(profiles: Profile[]): Promise<void>
  toggleFullScreen(): Promise<void>
}

type Args = Record<string, unknown>

class CommandError extends Error {}
const fail = (message: string): never => {
  throw new CommandError(message)
}

const str = (v: unknown, field: string): string =>
  typeof v === 'string' && v.length > 0 ? v : fail(`${field}: texto obrigatório`)
const optNum = (v: unknown, field: string, min: number, max: number): number | undefined => {
  if (v === undefined) return undefined
  if (typeof v !== 'number' || !Number.isFinite(v)) return fail(`${field}: número obrigatório`)
  return num(v, min, max, min)
}
const optBool = (v: unknown, field: string): boolean | undefined =>
  v === undefined ? undefined : typeof v === 'boolean' ? v : fail(`${field}: verdadeiro/falso`)

const toggleIn = (list: string[], name: string, value?: boolean): boolean => {
  const has = list.includes(name)
  const want = value ?? !has
  if (want && !has) list.push(name)
  if (!want && has) list.splice(list.indexOf(name), 1)
  return want
}

const OVERLAYS: readonly OverlayName[] = ['library', 'search', 'quick', 'settings', 'studio']

export class Core {
  readonly events = new Emitter<CoreEvents>()
  readonly state: AppState
  private collectionCursor = -1

  constructor(
    private readonly presets: PresetLibrary,
    settings: Settings,
    library: Library,
    private readonly effects: CoreEffects,
    profiles: Profile[] = []
  ) {
    this.state = { settings, library, current: '', overlay: null, capture: 'pending', held: false, breath: false, autoGainDb: 0, profiles }
    presets.isSkipped = (name) => this.isHidden(name)
  }

  isHidden(name: string): boolean {
    const lib = this.state.library
    return lib.hidden.includes(name) || lib.hiddenPerf.includes(name)
  }

  isFavorite(name: string): boolean {
    return this.state.library.favorites.includes(name)
  }

  /** Intervalo em vigor: o da coleção quando a rotação segue uma coleção. */
  /** Perfis na ordem do menu e do `Alt+1…9`: os do app, depois os do usuário (spec 038). */
  get allProfiles(): Profile[] {
    return [...this.builtIns, ...this.state.profiles]
  }

  /** O perfil ativo, ou `null` (nenhum, ou o ativo foi apagado). */
  get activeProfile(): Profile | null {
    const id = this.state.settings.profile.active
    return this.allProfiles.find((p) => p.id === id) ?? null
  }

  private readonly builtIns = builtInProfiles()
  /** O último perfil apagado, para o Desfazer da nota (spec 038, P1). */
  private lastDeleted: { profile: Profile; index: number; active: boolean; startup: boolean } | null = null

  private newProfileId(): string {
    const taken = new Set(this.allProfiles.map((p) => p.id))
    for (let i = 0; ; i++) {
      const id = `p${Date.now().toString(36)}${i}`
      if (!taken.has(id)) return id
    }
  }

  /** Um perfil do usuário pelo id (os do app não se renomeiam nem se apagam). */
  private userProfile(id: unknown): Profile {
    const p = this.allProfiles.find((x) => x.id === id) ?? fail(`perfil desconhecido: ${String(id)}`)
    if (p.builtIn) fail('perfil do app não se renomeia nem se apaga')
    return p
  }

  get rotationIntervalSeconds(): number {
    const rot = this.state.settings.rotation
    const col = rot.order === 'collection' ? this.collection(rot.collectionId) : undefined
    return col?.intervalSeconds ?? rot.intervalSeconds
  }

  private readonly handlers: Record<string, (args: Args, origin: Origin) => unknown> = {
    // ── presets ─────────────────────────────────────────────
    'preset.play': (a, origin) => {
      const name = str(a.name, 'name')
      if (!this.presets.has(name)) fail(`preset desconhecido: ${name}`)
      return this.show(this.presets.go(name), origin)
    },
    // `cut: true` troca sem blend, sem mudar o ajuste salvo (Shift na troca, spec 013).
    'preset.next': (a, origin) => this.show(this.presets.next(), origin, true, optBool(a.cut, 'cut')),
    'preset.previous': (a, origin) => {
      const name = this.presets.back()
      return name ? this.show(name, origin, false, optBool(a.cut, 'cut')) : this.state.current
    },
    'preset.random': (a, origin) => this.show(this.presets.random(), origin, true, optBool(a.cut, 'cut')),
    /** Troca da rotação: aleatório ou o próximo da coleção. */
    /** `maxBlendSeconds`: no modo beat, a troca automática mistura no máximo 1 batida (spec 024). */
    'rotation.advance': (a, origin) => {
      const maxBlend = optNum(a.maxBlendSeconds, 'maxBlendSeconds', 0, BLEND_MAX_S)
      const rot = this.state.settings.rotation
      const col = rot.order === 'collection' ? this.collection(rot.collectionId) : undefined
      const playable = col?.presets.filter((n) => this.presets.has(n) && !this.isHidden(n)) ?? []
      if (playable.length === 0) return this.show(this.presets.random(), origin, true, false, maxBlend)
      this.collectionCursor = (this.collectionCursor + 1) % playable.length
      return this.show(this.presets.go(playable[this.collectionCursor]!), origin, true, false, maxBlend)
    },

    // ── rotação, sinal, blend ───────────────────────────────
    'rotation.set': (a, origin) => {
      const rot = this.state.settings.rotation
      const enabled = optBool(a.enabled, 'enabled')
      const interval = optNum(a.intervalSeconds, 'intervalSeconds', 5, 600)
      if (enabled !== undefined) rot.enabled = enabled
      if (interval !== undefined) rot.intervalSeconds = interval
      const lead = optNum(a.beatLeadMs, 'beatLeadMs', 0, BEAT_LEAD_MAX_MS)
      if (lead !== undefined) rot.beatLeadMs = Math.round(lead / 10) * 10
      const onBeat = optBool(a.onBeat, 'onBeat')
      if (onBeat !== undefined) rot.onBeat = onBeat
      const manualOnBeat = optBool(a.manualOnBeat, 'manualOnBeat')
      if (manualOnBeat !== undefined) rot.manualOnBeat = manualOnBeat
      if (a.bars !== undefined) {
        if (!BEAT_BARS.includes(a.bars as BeatBars)) fail(`bars: ${BEAT_BARS.join(', ')}`)
        rot.bars = a.bars as BeatBars
      }
      if (a.order !== undefined) {
        if (a.order !== 'random' && a.order !== 'collection') fail('order: random ou collection')
        rot.order = a.order as RotationOrder
      }
      if (a.collectionId !== undefined) {
        if (a.collectionId !== null) this.collectionOrFail(a.collectionId)
        rot.collectionId = a.collectionId as string | null
        this.collectionCursor = -1
      }
      this.changedSettings(origin)
      return { ...rot }
    },
    /** Segurar o visual (spec 024): alterna, ou `{ value }`. Trocas manuais continuam valendo. */
    'preset.hold': (a, origin) => {
      const v = optBool(a.value, 'value')
      this.state.held = v ?? !this.state.held
      this.events.emit('stateChanged', { origin })
      return this.state.held
    },
    /** Respiro: alterna, ou `{ value }`. A detecção de batida continua ouvindo (vem antes do ganho). */
    'audio.breath': (a, origin) => {
      const v = optBool(a.value, 'value')
      this.state.breath = v ?? !this.state.breath
      this.events.emit('stateChanged', { origin })
      return this.state.breath
    },
    /** Com "Normalizar áudio" ligado, o ganho manual é ajuste fino: −6 a +6 dB (spec 028). */
    'signal.set': (a, origin) => {
      const fine = this.state.settings.autoGain ? FINE_GAIN_DB : Infinity
      const gain = optNum(a.gainDb, 'gainDb', Math.max(GAIN_MIN_DB, -fine), Math.min(GAIN_MAX_DB, fine))
      if (gain === undefined) fail('gainDb obrigatório')
      this.state.settings.gainDb = Math.round(gain!)
      this.changedSettings(origin)
      return this.state.settings.gainDb
    },
    /** Normalizar áudio (spec 028, P1): alterna, ou `{ value }`. Ligar traz o ganho manual para ±6 dB. */
    'audio.autoGain': (a, origin) => {
      const v = optBool(a.value, 'value')
      const s = this.state.settings
      s.autoGain = v ?? !s.autoGain
      if (s.autoGain) s.gainDb = Math.max(-FINE_GAIN_DB, Math.min(FINE_GAIN_DB, s.gainDb))
      this.changedSettings(origin)
      return s.autoGain
    },
    /** Atrasar o visual (spec 032): `{ ms }`, 0–500 em passos de 10. Atrasa o som de tudo o que desenha. */
    'audio.visualDelay': (a, origin) => {
      const ms = optNum(a.ms, 'ms', 0, VISUAL_DELAY_MAX_MS)
      if (ms === undefined) fail('ms obrigatório')
      this.state.settings.visualDelayMs = Math.round(ms! / 10) * 10
      this.changedSettings(origin)
      return this.state.settings.visualDelayMs
    },
    /** `{ target: 'manual' | 'auto', type?, seconds? }` (spec 013). */
    'blend.set': (a, origin) => {
      if (a.target !== 'manual' && a.target !== 'auto') fail('target: manual ou auto')
      const rule = this.state.settings.blend[a.target as 'manual' | 'auto']
      if (a.type !== undefined) {
        if (!BLEND_TYPES.includes(a.type as BlendType)) fail(`type: ${BLEND_TYPES.join(', ')}`)
        rule.type = a.type as BlendType
      }
      const seconds = optNum(a.seconds, 'seconds', BLEND_MIN_S, BLEND_MAX_S)
      if (seconds !== undefined) rule.seconds = seconds
      this.changedSettings(origin)
      return { ...rule }
    },
    /** Expressividade (spike 015): `{ level?, curve?, adaptation?, curve16?, curvePreset? }` (curva: spec 040). */
    'expression.set': (a, origin) => {
      const e = this.state.settings.expression
      const level = optNum(a.level, 'level', EXPRESSION_MIN, EXPRESSION_MAX)
      if (level !== undefined) e.level = Math.round(level)
      if (a.curve !== undefined) {
        if (!EXPRESSION_CURVES.includes(a.curve as ExpressionCurve)) fail(`curve: ${EXPRESSION_CURVES.join(', ')}`)
        e.curve = a.curve as ExpressionCurve
      }
      if (a.adaptation !== undefined) {
        if (!EXPRESSION_ADAPTATIONS.includes(a.adaptation as ExpressionAdaptation)) fail(`adaptation: ${EXPRESSION_ADAPTATIONS.join(', ')}`)
        e.adaptation = a.adaptation as ExpressionAdaptation
      }
      // Curva por frequência (spec 040): a predefinição aplica os valores dela; a lista vira Personalizada.
      if (a.curvePreset !== undefined) {
        if (!CURVE_PRESET_IDS.includes(a.curvePreset as CurvePreset)) fail(`curvePreset: ${CURVE_PRESET_IDS.join(', ')}`)
        const id = a.curvePreset as CurvePreset
        if (id !== 'custom') e.curve16 = [...CURVE_PRESET_VALUES[id]]
        e.curvePreset = id
      }
      if (a.curve16 !== undefined) {
        const c = a.curve16
        if (!Array.isArray(c) || c.length !== CURVE_BANDS.length || !c.every((v) => typeof v === 'number' && Number.isFinite(v)))
          fail(`curve16: ${CURVE_BANDS.length} numbers (${CURVE_DB_MIN}…${CURVE_DB_MAX} dB)`)
        e.curve16 = (c as number[]).map(clampDb)
        if (a.curvePreset === undefined) e.curvePreset = 'custom'
      }
      this.changedSettings(origin)
      return { ...e, curve16: [...e.curve16] }
    },
    /** Texto sobre o visual (spec 014): `{ presetName?, trackTitle?, toasts?, clean? }`. */
    'overlayText.set': (a, origin) => {
      const t = this.state.settings.overlayText
      if (a.presetName !== undefined) {
        if (!PRESET_NAME_MODES.includes(a.presetName as PresetNameMode)) fail(`presetName: ${PRESET_NAME_MODES.join(', ')}`)
        t.presetName = a.presetName as PresetNameMode
      }
      if (a.toasts !== undefined) {
        if (!TOAST_MODES.includes(a.toasts as ToastMode)) fail(`toasts: ${TOAST_MODES.join(', ')}`)
        t.toasts = a.toasts as ToastMode
      }
      const track = optBool(a.trackTitle, 'trackTitle')
      if (track !== undefined) t.trackTitle = track
      const clean = optBool(a.clean, 'clean')
      if (clean !== undefined) t.clean = clean
      this.changedSettings(origin)
      return { ...t }
    },
    'settings.set': (a, origin) => {
      const s = this.state.settings
      if (a.fpsLimit !== undefined) {
        const v = a.fpsLimit === 'monitor' ? 'monitor' : optNum(a.fpsLimit, 'fpsLimit', 15, 360)
        s.fpsLimit = v as FpsLimit
      }
      if (a.startupPreset !== undefined) {
        if (!['last', 'random', 'favorite'].includes(a.startupPreset as string)) fail('startupPreset: last, random ou favorite')
        s.startupPreset = a.startupPreset as StartupPreset
      }
      if (a.startupFavorite !== undefined) s.startupFavorite = a.startupFavorite === null ? null : str(a.startupFavorite, 'startupFavorite')
      const gainDefault = optNum(a.gainDefaultDb, 'gainDefaultDb', GAIN_MIN_DB, GAIN_MAX_DB)
      if (gainDefault !== undefined) s.gainDefaultDb = Math.round(gainDefault)
      // Nome no crédito dos meus presets (spec 026); vazio = "Eu".
      if (a.authorName !== undefined) {
        if (typeof a.authorName !== 'string') fail('authorName: texto')
        s.authorName = cleanAuthor(a.authorName as string)
      }
      for (const key of ['pinControls', 'startFullscreen', 'showFps', 'welcomeSeen', 'updatesAuto'] as const) {
        const v = optBool(a[key], key)
        if (v !== undefined) s[key] = v
      }
      this.changedSettings(origin)
      const { fpsLimit, startupPreset, startupFavorite, gainDefaultDb, pinControls, startFullscreen, showFps, updatesAuto } = s
      return { fpsLimit, startupPreset, startupFavorite, gainDefaultDb, pinControls, startFullscreen, showFps, updatesAuto }
    },
    /** Idioma (spec 030): `{ language: 'auto' | 'en' | 'pt-BR' }`. Vale na hora, sem reiniciar; devolve o idioma em uso. */
    'app.setLanguage': (a, origin) => {
      if (!LANGUAGE_PREFS.includes(a.language as LanguagePref)) fail(`language: ${LANGUAGE_PREFS.join(', ')}`)
      this.state.settings.language = a.language as LanguagePref
      const active = applyLanguage(this.state.settings.language)
      this.changedSettings(origin)
      return { language: this.state.settings.language, active }
    },
    /** Modo de interface (spec 039): `{ mode: 'simple' | 'full' }`. Só muda quanto da casca aparece. */
    'ui.setMode': (a, origin) => {
      if (!UI_MODES.includes(a.mode as UiMode)) fail(`mode: ${UI_MODES.join(', ')}`)
      this.state.settings.uiMode = a.mode as UiMode
      this.changedSettings(origin)
      return this.state.settings.uiMode
    },
    /** Desempenho por preset (spec 012): `{ skipSlow?, minFps? }`. */
    'perf.set': (a, origin) => {
      const p = this.state.settings.perf
      const skip = optBool(a.skipSlow, 'skipSlow')
      if (skip !== undefined) p.skipSlow = skip
      const min = optNum(a.minFps, 'minFps', 15, 60)
      if (min !== undefined) p.minFps = Math.round(min / 5) * 5
      this.changedSettings(origin)
      return { ...p }
    },
    /** Renderização (Configurações): `{ meshWidth+meshHeight?, pixelRatio?, textureRatio?, fxaa?, canvasScale?, extraImages? }`. */
    'render.set': (a, origin) => {
      const next = sanitizeRender({ ...this.state.settings.render, ...a })
      this.state.settings.render = next
      this.changedSettings(origin)
      return { ...next }
    },

    // ── perfis (spec 038) ───────────────────────────────────
    /** `{ id }`: passa cada grupo do perfil pelos comandos de sempre; os outros grupos ficam. */
    'profile.apply': (a, origin) => {
      const p = this.allProfiles.find((x) => x.id === a.id) ?? fail(`perfil desconhecido: ${String(a.id)}`)
      this.applyProfile(p, origin)
      return { id: p.id, name: profileName(p) }
    },
    /** Desfazer: volta aos valores do perfil ativo. */
    'profile.revert': (_a, origin) => {
      const p = this.activeProfile ?? fail('nenhum perfil ativo')
      this.applyProfile(p, origin)
      return { id: p.id, name: profileName(p) }
    },
    /** `{ name?, groups }`: novo perfil do usuário com os valores de agora; vira o ativo. */
    'profile.save': (a, origin) => {
      const groups = sanitizeGroups(a.groups)
      if (groups.length === 0 || !Array.isArray(a.groups) || a.groups.some((g) => !PROFILE_GROUPS.includes(g as never))) fail('groups: ao menos um de ' + PROFILE_GROUPS.join(', '))
      if (a.name !== undefined && typeof a.name !== 'string') fail('name: texto')
      const taken = this.allProfiles.map(profileName)
      const clean = cleanProfileName((a.name as string | undefined) ?? '')
      const name = clean ? uniqueProfileName(clean, taken) : nextDefaultProfileName(taken)
      const p: Profile = { id: this.newProfileId(), name, builtIn: false, groups, values: readValues(this.state.settings, groups) }
      this.state.profiles.push(p)
      this.state.settings.profile.active = p.id
      this.changedProfiles(origin)
      this.changedSettings(origin)
      return { id: p.id, name }
    },
    /** Atualizar: grava os valores de agora no perfil ativo (só perfil do usuário). */
    'profile.update': (_a, origin) => {
      const p = this.activeProfile ?? fail('nenhum perfil ativo')
      if (p.builtIn) fail('perfil do app não se atualiza')
      p.values = readValues(this.state.settings, p.groups)
      this.changedProfiles(origin)
      return { id: p.id, name: p.name }
    },
    // Configurações › Perfis (spec 038, P1).
    /** `{ id, name }`: só perfil do usuário; vazio ou igual não muda nada; nome de outro ganha " (2)". */
    'profile.rename': (a, origin) => {
      const p = this.userProfile(a.id)
      const clean = cleanProfileName(str(a.name, 'name'))
      if (!clean || clean === p.name) return { id: p.id, name: p.name, changed: false }
      p.name = uniqueProfileName(clean, this.allProfiles.filter((x) => x !== p).map(profileName))
      this.changedProfiles(origin)
      return { id: p.id, name: p.name, changed: true }
    },
    /** `{ id }`: cópia como perfil do usuário, "<nome> (cópia)", no fim da lista. Não muda o ativo. */
    'profile.duplicate': (a, origin) => {
      const src = this.allProfiles.find((x) => x.id === a.id) ?? fail(`perfil desconhecido: ${String(a.id)}`)
      const base = cleanProfileName(t('profile.copyName', { name: profileName(src) }))
      const p: Profile = { id: this.newProfileId(), name: uniqueProfileName(base, this.allProfiles.map(profileName)), builtIn: false, groups: [...src.groups], values: JSON.parse(JSON.stringify(src.values)) as Profile['values'] }
      this.state.profiles.push(p)
      this.changedProfiles(origin)
      return { id: p.id, name: p.name }
    },
    /** `{ id }`: apaga um perfil do usuário (o ativo vira nenhum; "Perfil ao abrir" volta a Último usado). Desfazer: `profile.undoDelete`. */
    'profile.delete': (a, origin) => {
      const p = this.userProfile(a.id)
      const index = this.state.profiles.indexOf(p)
      const pf = this.state.settings.profile
      this.lastDeleted = { profile: p, index, active: pf.active === p.id, startup: pf.startup === p.id }
      this.state.profiles.splice(index, 1)
      if (pf.active === p.id) pf.active = null
      if (pf.startup === p.id) pf.startup = 'last'
      this.changedProfiles(origin)
      this.changedSettings(origin)
      return { id: p.id, name: p.name }
    },
    /** Desfaz o último `profile.delete`: volta ao mesmo lugar, ativo e ao abrir como estavam. */
    'profile.undoDelete': (_a, origin) => {
      const d = this.lastDeleted ?? fail('nada para desfazer')
      this.lastDeleted = null
      if (this.state.profiles.some((x) => x.id === d.profile.id)) fail('perfil já existe')
      this.state.profiles.splice(Math.min(d.index, this.state.profiles.length), 0, d.profile)
      const pf = this.state.settings.profile
      if (d.active) pf.active = d.profile.id
      if (d.startup) pf.startup = d.profile.id
      this.changedProfiles(origin)
      this.changedSettings(origin)
      return { id: d.profile.id, name: d.profile.name }
    },
    /** `{ data }`: o JSON de um arquivo exportado (já lido). Fora do formato → erro `[not-profile]` e nada muda. */
    'profile.import': (a, origin) => {
      const parsed = parseProfileFile(a.data) ?? fail('[not-profile] not a Sonic Obsidian profile')
      const p: Profile = { id: this.newProfileId(), name: uniqueProfileName(parsed.name, this.allProfiles.map(profileName)), builtIn: false, groups: parsed.groups, values: parsed.values }
      this.state.profiles.push(p)
      this.changedProfiles(origin)
      return { id: p.id, name: p.name }
    },
    /** `{ value }`: "Perfil ao abrir" — `last` (os ajustes como ficaram) ou o id de um perfil. */
    'profile.startup': (a, origin) => {
      const v = str(a.value, 'value')
      if (v !== 'last' && !this.allProfiles.some((x) => x.id === v)) fail(`perfil desconhecido: ${v}`)
      this.state.settings.profile.startup = v
      this.changedSettings(origin)
      return v
    },

    // ── biblioteca ──────────────────────────────────────────
    'library.favorite': (a, origin) => {
      const name = a.name === undefined ? this.state.current : str(a.name, 'name')
      const fav = toggleIn(this.state.library.favorites, name, optBool(a.value, 'value'))
      this.changedLibrary(origin)
      return fav
    },
    'library.hide': (a, origin) => {
      const name = a.name === undefined ? this.state.current : str(a.name, 'name')
      const list = a.reason === 'performance' ? this.state.library.hiddenPerf : this.state.library.hidden
      toggleIn(list, name, true)
      this.changedLibrary(origin)
      if (name === this.state.current) this.show(this.presets.random(), origin)
      return name
    },
    /** fps medido de um preset (spec 012); não emite stateChanged a cada medida para não re-renderizar. */
    'library.setFps': (a) => {
      const name = str(a.name, 'name')
      const fps = optNum(a.fps, 'fps', 0, 1000)
      if (fps === undefined) fail('fps obrigatório')
      const map = this.state.library.presetFps
      if (!(name in map) && Object.keys(map).length >= PRESET_FPS_MAX) return false
      map[name] = Math.round(fps!)
      this.effects.saveLibrary(this.state.library).catch((err: unknown) => console.error('[core] falha ao salvar library', err))
      return true
    },
    'library.restore': (a, origin) => {
      const lib = this.state.library
      // Restaurar um oculto por desempenho apaga a medida antiga: ele é medido de novo.
      if (a.reason !== 'user') {
        if (a.name === undefined) for (const n of lib.hiddenPerf) delete lib.presetFps[n]
        else if (typeof a.name === 'string') delete lib.presetFps[a.name]
      }
      const lists = a.reason === 'performance' ? [lib.hiddenPerf] : a.reason === 'user' ? [lib.hidden] : [lib.hidden, lib.hiddenPerf]
      for (const list of lists) {
        if (a.name === undefined) list.length = 0
        else toggleIn(list, str(a.name, 'name'), false)
      }
      this.changedLibrary(origin)
      return true
    },

    /**
     * Renomear um "meu" preset (027, fatia 9): favoritos, ocultos, recentes, coleções, fps medido,
     * último preset e favorito de abertura passam para o nome novo. Quem chama já renomeou o preset
     * na biblioteca (`to` precisa existir e `from` não).
     */
    'library.renamePreset': (a, origin) => {
      const from = str(a.from, 'from')
      const to = str(a.to, 'to')
      if (!this.presets.has(to) || this.presets.has(from)) fail(`renomear: ${from} → ${to} fora da biblioteca`)
      const lib = this.state.library
      const swap = (list: string[]): void => {
        const i = list.indexOf(from)
        if (i < 0) return
        if (list.includes(to)) list.splice(i, 1)
        else list[i] = to
      }
      for (const list of [lib.favorites, lib.hidden, lib.hiddenPerf, lib.recents]) swap(list)
      for (const c of lib.collections) swap(c.presets)
      if (from in lib.presetFps) {
        lib.presetFps[to] = lib.presetFps[from]!
        delete lib.presetFps[from]
      }
      const st = this.state.settings
      let settingsChanged = false
      if (st.lastPreset === from) {
        st.lastPreset = to
        settingsChanged = true
      }
      if (st.startupFavorite === from) {
        st.startupFavorite = to
        settingsChanged = true
      }
      if (this.state.current === from) this.state.current = to
      if (settingsChanged) this.changedSettings(origin)
      this.changedLibrary(origin)
      return to
    },

    // ── coleções ────────────────────────────────────────────
    'collection.create': (a, origin) => {
      const cols = this.state.library.collections
      // O nome que o app dá sai no idioma da hora; depois é um nome como outro qualquer (spec 030).
      const name = a.name === undefined ? t('collection.defaultName', { n: cols.length + 1 }) : str(a.name, 'name').trim()
      const col: Collection = { id: `c${Date.now().toString(36)}${cols.length}`, name, presets: [], intervalSeconds: 30 }
      cols.push(col)
      this.changedLibrary(origin)
      return col.id
    },
    'collection.rename': (a, origin) => {
      this.collectionOrFail(a.id).name = str(a.name, 'name').trim()
      this.changedLibrary(origin)
      return true
    },
    'collection.delete': (a, origin) => {
      const col = this.collectionOrFail(a.id)
      const cols = this.state.library.collections
      cols.splice(cols.indexOf(col), 1)
      const rot = this.state.settings.rotation
      if (rot.collectionId === col.id) {
        rot.collectionId = null
        rot.order = 'random'
        this.changedSettings(origin)
      }
      this.changedLibrary(origin)
      return true
    },
    'collection.add': (a, origin) => {
      const col = this.collectionOrFail(a.id)
      const name = a.name === undefined ? this.state.current : str(a.name, 'name')
      const added = !col.presets.includes(name)
      if (added) col.presets.push(name)
      this.changedLibrary(origin)
      return added // false = "Já está em <nome>."
    },
    'collection.remove': (a, origin) => {
      const col = this.collectionOrFail(a.id)
      toggleIn(col.presets, str(a.name, 'name'), false)
      this.changedLibrary(origin)
      return true
    },
    'collection.reorder': (a, origin) => {
      const col = this.collectionOrFail(a.id)
      const from = optNum(a.from, 'from', 0, col.presets.length - 1)
      const to = optNum(a.to, 'to', 0, col.presets.length - 1)
      if (from === undefined || to === undefined) fail('from e to obrigatórios')
      const [moved] = col.presets.splice(Math.round(from!), 1)
      col.presets.splice(Math.round(to!), 0, moved!)
      this.changedLibrary(origin)
      return [...col.presets]
    },
    'collection.setInterval': (a, origin) => {
      const col = this.collectionOrFail(a.id)
      const interval = optNum(a.intervalSeconds, 'intervalSeconds', 5, 600)
      if (interval === undefined) fail('intervalSeconds obrigatório')
      col.intervalSeconds = interval!
      this.changedLibrary(origin)
      return interval
    },
    /** Liga a rotação na ordem da coleção, com o intervalo dela, e toca o primeiro. */
    /**
     * Importa coleções de um JSON exportado (`{version: 1, collections}` ou só a lista).
     * Mesmo id substitui; id novo entra no fim. Devolve quantas entraram.
     */
    'collection.import': (a, origin) => {
      const raw = a.data as { collections?: unknown } | unknown[]
      const list = Array.isArray(raw) ? raw : Array.isArray((raw as { collections?: unknown })?.collections) ? ((raw as { collections: unknown[] }).collections) : null
      if (!list) fail('formato inválido')
      const valid = list!.filter(
        (c): c is { id?: unknown; name: string; presets: unknown[]; intervalSeconds?: unknown } =>
          typeof c === 'object' && c !== null && typeof (c as { name?: unknown }).name === 'string' && Array.isArray((c as { presets?: unknown }).presets)
      )
      if (valid.length === 0) fail('nenhuma coleção no arquivo')
      const cols = this.state.library.collections
      for (const c of valid) {
        const col: Collection = {
          id: typeof c.id === 'string' && c.id ? c.id : `c${Date.now().toString(36)}${cols.length}`,
          name: c.name.trim() || 'Coleção',
          presets: [...new Set(c.presets.filter((n): n is string => typeof n === 'string' && n.length > 0))],
          intervalSeconds: num(c.intervalSeconds, 5, 600, 30)
        }
        const i = cols.findIndex((x) => x.id === col.id)
        if (i >= 0) cols[i] = col
        else cols.push(col)
      }
      this.changedLibrary(origin)
      return valid.length
    },
    'collection.play': (a, origin) => {
      const col = this.collectionOrFail(a.id)
      if (col.presets.length === 0) fail('coleção vazia')
      Object.assign(this.state.settings.rotation, { enabled: true, order: 'collection', collectionId: col.id })
      this.collectionCursor = -1
      this.changedSettings(origin)
      return this.handlers['rotation.advance']!({}, origin)
    },

    // ── interface e janela ──────────────────────────────────
    'ui.open': (a, origin) => {
      if (!OVERLAYS.includes(a.overlay as OverlayName)) fail(`overlay desconhecido: ${String(a.overlay)}`)
      this.state.overlay = a.overlay as OverlayName
      this.events.emit('stateChanged', { origin })
      return this.state.overlay
    },
    'ui.close': (_a, origin) => {
      this.state.overlay = null
      this.events.emit('stateChanged', { origin })
      return null
    },
    'window.fullscreen': () => {
      void this.effects.toggleFullScreen()
      return true
    }
  }

  /** Executa um comando. Nunca lança: erro de validação vira `{ ok: false }`. */
  run<T = unknown>(name: string, args: Args = {}, origin: Origin = 'ui'): Result<T> {
    const handler = this.handlers[name]
    if (!handler) return { ok: false, error: `comando desconhecido: ${name}` }
    try {
      return { ok: true, value: handler(args, origin) as T }
    } catch (err) {
      if (!(err instanceof CommandError)) console.error(`[core] ${name} falhou`, err)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /** Chamado por quem cuida da captura (main.ts); não é comando de usuário. */
  setCapture(state: CaptureState): void {
    if (this.state.capture === state) return
    this.state.capture = state
    this.events.emit('captureChanged', { state })
  }

  get commandNames(): string[] {
    return Object.keys(this.handlers)
  }

  // ── internos ──────────────────────────────────────────────
  private show(name: string, origin: Origin, track = true, cut = false, maxBlend?: number): string {
    if (!name) return this.state.current
    // Rotação usa a regra automática; o resto (teclado, UI) a manual. Abertura e Shift = corte seco.
    const rule = origin === 'rotation' ? this.state.settings.blend.auto : this.state.settings.blend.manual
    const blendType: BlendType = origin === 'startup' || cut ? 'cut' : rule.type
    const blendSeconds = blendType === 'cut' ? 0 : Math.min(rule.seconds, maxBlend ?? Infinity)
    this.state.current = name
    this.state.settings.lastPreset = name
    if (track) {
      const recents = this.state.library.recents
      const i = recents.indexOf(name)
      if (i >= 0) recents.splice(i, 1)
      recents.unshift(name)
      recents.length = Math.min(recents.length, RECENTS_MAX)
    }
    this.events.emit('presetChanged', { name, blendType, blendSeconds, origin })
    this.changedSettings(origin)
    if (track) this.changedLibrary(origin)
    return name
  }

  private collection(id: unknown): Collection | undefined {
    return this.state.library.collections.find((c) => c.id === id)
  }

  private collectionOrFail(id: unknown): Collection {
    return this.collection(id) ?? fail(`coleção desconhecida: ${String(id)}`)
  }

  private changedSettings(origin: Origin): void {
    this.events.emit('stateChanged', { origin })
    this.effects
      .saveSettings(this.state.settings)
      .then(() => this.events.emit('saved', { store: 'settings' }))
      .catch((err: unknown) => console.error('[core] falha ao salvar settings', err))
  }

  private applyProfile(p: Profile, origin: Origin): void {
    const v = p.values
    const run = (name: string, args: Args): unknown => this.handlers[name]!(args, origin)
    if (v.expression) run('expression.set', { ...v.expression })
    if (v.blend) {
      run('blend.set', { target: 'manual', ...v.blend.manual })
      run('blend.set', { target: 'auto', ...v.blend.auto })
    }
    if (v.rotation) run('rotation.set', { ...v.rotation })
    if (v.signal) {
      run('audio.autoGain', { value: v.signal.autoGain })
      run('signal.set', { gainDb: v.signal.gainDb })
    }
    if (v.text) run('overlayText.set', { ...v.text })
    this.state.settings.profile.active = p.id
    this.changedSettings(origin)
  }

  private changedProfiles(origin: Origin): void {
    this.events.emit('stateChanged', { origin })
    this.effects
      .saveProfiles(this.state.profiles)
      .then(() => this.events.emit('saved', { store: 'profiles' }))
      .catch((err: unknown) => console.error('[core] falha ao salvar profiles', err))
  }

  private changedLibrary(origin: Origin): void {
    this.events.emit('stateChanged', { origin })
    this.effects
      .saveLibrary(this.state.library)
      .then(() => this.events.emit('saved', { store: 'library' }))
      .catch((err: unknown) => console.error('[core] falha ao salvar library', err))
  }
}
