import type { PresetLibrary } from '../presets'
import { Emitter } from './events'
import {
  BLEND_MAX_S,
  BLEND_MIN_S,
  BLEND_TYPES,
  EXPRESSION_ADAPTATIONS,
  EXPRESSION_CURVES,
  EXPRESSION_MAX,
  EXPRESSION_MIN,
  GAIN_MAX_DB,
  GAIN_MIN_DB,
  RECENTS_MAX,
  num,
  type BlendType,
  type ExpressionAdaptation,
  type ExpressionCurve,
  type Collection,
  type FpsLimit,
  type Library,
  type OverlayName,
  type RotationOrder,
  type Settings
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
  silenceChanged: { resting: boolean; notice: boolean }
  captureChanged: { state: CaptureState }
  /** Gravação em disco concluída. */
  saved: { store: 'settings' | 'library' }
}

export interface AppState {
  settings: Settings
  library: Library
  current: string
  overlay: OverlayName | null
  capture: CaptureState
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

const OVERLAYS: readonly OverlayName[] = ['library', 'search', 'quick', 'settings']

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
    this.state = { settings, library, current: '', overlay: null, capture: 'pending' }
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
    'rotation.advance': (_a, origin) => {
      const rot = this.state.settings.rotation
      const col = rot.order === 'collection' ? this.collection(rot.collectionId) : undefined
      const playable = col?.presets.filter((n) => this.presets.has(n) && !this.isHidden(n)) ?? []
      if (playable.length === 0) return this.show(this.presets.random(), origin)
      this.collectionCursor = (this.collectionCursor + 1) % playable.length
      return this.show(this.presets.go(playable[this.collectionCursor]!), origin)
    },

    // ── rotação, sinal, blend ───────────────────────────────
    'rotation.set': (a, origin) => {
      const rot = this.state.settings.rotation
      const enabled = optBool(a.enabled, 'enabled')
      const interval = optNum(a.intervalSeconds, 'intervalSeconds', 5, 600)
      if (enabled !== undefined) rot.enabled = enabled
      if (interval !== undefined) rot.intervalSeconds = interval
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
    'signal.set': (a, origin) => {
      const gain = optNum(a.gainDb, 'gainDb', GAIN_MIN_DB, GAIN_MAX_DB)
      if (gain === undefined) fail('gainDb obrigatório')
      this.state.settings.gainDb = Math.round(gain!)
      this.changedSettings(origin)
      return this.state.settings.gainDb
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
    'settings.set': (a, origin) => {
      const s = this.state.settings
      if (a.fpsLimit !== undefined) {
        const v = a.fpsLimit === 'monitor' ? 'monitor' : optNum(a.fpsLimit, 'fpsLimit', 15, 360)
        s.fpsLimit = v as FpsLimit
      }
      if (a.startupPreset !== undefined) {
        if (a.startupPreset !== 'last' && a.startupPreset !== 'random') fail('startupPreset: last ou random')
        s.startupPreset = a.startupPreset as 'last' | 'random'
      }
      const pin = optBool(a.pinControls, 'pinControls')
      if (pin !== undefined) s.pinControls = pin
      this.changedSettings(origin)
      return { fpsLimit: s.fpsLimit, startupPreset: s.startupPreset, pinControls: s.pinControls }
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
    'library.restore': (a, origin) => {
      const lib = this.state.library
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
  private show(name: string, origin: Origin, track = true, cut = false): string {
    if (!name) return this.state.current
    // Rotação usa a regra automática; o resto (teclado, UI) a manual. Abertura e Shift = corte seco.
    const rule = origin === 'rotation' ? this.state.settings.blend.auto : this.state.settings.blend.manual
    const blendType: BlendType = origin === 'startup' || cut ? 'cut' : rule.type
    const blendSeconds = blendType === 'cut' ? 0 : rule.seconds
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
