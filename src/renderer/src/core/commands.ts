import type { PresetLibrary } from '../presets'
import { Emitter } from './events'
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
  saved: { store: 'settings' | 'library' }
  /** Checklist da captura (spec 012), a cada passo verificado. */
  captureChecks: { checks: CaptureCheck[] }
  /** Preset abaixo do mínimo de fps (spec 012, P2); `null` limpa o aviso. */
  slowPreset: { name: string; fps: number } | null
}

/** Trocas manuais que esperam a batida (M23). */
export type WaitKey = 'next' | 'previous' | 'random'

export type CheckState = 'ok' | 'fail' | 'busy' | 'pending'
export interface CaptureCheck {
  label: string
  state: CheckState
  detail: string
  help?: string
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
}

/** Efeitos fora do renderer (preload). */
export interface CoreEffects {
  saveSettings(settings: Settings): Promise<void>
  saveLibrary(library: Library): Promise<void>
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
    private readonly effects: CoreEffects
  ) {
    this.state = { settings, library, current: '', overlay: null, capture: 'pending', held: false, breath: false, autoGainDb: 0 }
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
    /** Expressividade (spike 015): `{ level?, curve?, adaptation? }`. */
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
      this.changedSettings(origin)
      return { ...e }
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
      for (const key of ['pinControls', 'startFullscreen', 'showFps', 'welcomeSeen'] as const) {
        const v = optBool(a[key], key)
        if (v !== undefined) s[key] = v
      }
      this.changedSettings(origin)
      const { fpsLimit, startupPreset, startupFavorite, gainDefaultDb, pinControls, startFullscreen, showFps } = s
      return { fpsLimit, startupPreset, startupFavorite, gainDefaultDb, pinControls, startFullscreen, showFps }
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

    // ── coleções ────────────────────────────────────────────
    'collection.create': (a, origin) => {
      const cols = this.state.library.collections
      const name = a.name === undefined ? `Coleção ${cols.length + 1}` : str(a.name, 'name').trim()
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

  private changedLibrary(origin: Origin): void {
    this.events.emit('stateChanged', { origin })
    this.effects
      .saveLibrary(this.state.library)
      .then(() => this.events.emit('saved', { store: 'library' }))
      .catch((err: unknown) => console.error('[core] falha ao salvar library', err))
  }
}
