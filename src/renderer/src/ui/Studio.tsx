import { Fragment, render } from 'preact'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Preset } from 'butterchurn'
import type { Core } from '../core/commands'
import { EQ_KEYS, type Block, type CompileResult, type MainBlock, type ShaderBlock, type SlotBlock, type StudioError, type StudioIssue } from '../studio/compile'
import { SHAPE_PARAMS, SLOT_INDEXES, WAVE_PARAMS, slotBlockTitle, slotOfBlock, slotOn, slotValue, slotsOf, writeSlots, type SlotKind, type Slots } from '../studio/slots'
import { milkShaders, presetToMilk, type Hlsl } from '../studio/milk'
import { applyFix, lint, suggestFunction, type LintIssue, type StudioWarning } from '../studio/lint'
import { BASIC_GROUPS, BASIC_PARAMS, WAVE_MODES, baseValue, clampParam, rangeFor, type BasicParam } from '../studio/basic'
import { Icon } from './icons'
import { mineCredit } from './preset-name'
import { showToast } from './toast'
import { fmtNum, getLang, msgText, onLanguage, t, tn, type Lang, type MessageKey, type Msg } from '../i18n'
import { mainError, mainErrorText } from '../main-error'
import './studio.css'

/**
 * Estúdio de presets, P0 (spec 026) — protótipo `1794281099-42d3`, página `Sonic Obsidian Estúdio.html`.
 * Camada em tela cheia por cima do Palco (decisão do usuário): a prévia é o próprio visual
 * principal, visto pela coluna da esquerda. À direita, as equações. Cada pausa de 400 ms
 * compila; o que passa vai para o visual, e com erro a última versão válida continua tocando.
 */
export interface StudioApi {
  core: Core
  /** Preset de origem (do pacote, importado ou meu); vazio no "Novo preset". */
  sourceName: string
  /** "Novo preset" (027, fatia 8): `source` é o modelo mínimo, sem origem nem crédito de terceiros. */
  fresh?: boolean
  source: Preset
  /** Editando um preset meu: salvar sobrescreve este. */
  mine: { id: string; meta: SoMineMeta } | null
  compile(p: Preset): Promise<CompileResult>
  /** Carrega no visualizador principal (blend curto). */
  apply(p: Preset): void
  /** Muda um parâmetro base no preset que está tocando, sem recarregar. `false` = não deu (recarregar). */
  tweak(key: string, value: number): boolean
  /** bass, mid, treb como as equações veem (depois da expressividade). */
  levels(): [number, number, number] | null
  /** Grava e põe na biblioteca. Devolve o nome final (com "(2)" se já existia). */
  save(req: { preset: Preset; title: string; author: string; milk?: string }): Promise<{ name: string; id: string; meta: SoMineMeta }>
  /**
   * Renomear (027, fatia 9) o "meu" preset já salvo: só o título, sem versão nova. Devolve o nome
   * final ("(2)" se outro preset já usa o nome); favoritos, coleções e recentes acompanham.
   */
  rename(title: string): Promise<{ name: string; id: string; meta: SoMineMeta }>
  /** Sai do Estúdio. `saved` = nome do último salvamento (vira o preset atual). */
  close(saved: string | null): void
  /** Troca o que está aberto pelo modelo do "Novo preset" (o Estúdio confirma antes o que não foi salvo). */
  newPreset(): void
  log(message: string): void
  /** Custo da última compilação, para o HUD. */
  reportCost(text: string): void
  /** Versões do "meu" preset em edição, da mais nova para a mais antiga (vazio antes do primeiro salvamento). */
  versions(): Promise<SoMineVersion[]>
  /** O preset de uma versão (já pela barreira do main). */
  version(n: number): Promise<Preset>
  /** "Comparar com o original" (027, fatia 4): o preset do lado esquerdo. */
  original: Preset
  /**
   * Liga o segundo visual dentro de `host` (ou troca o preset dele, se já ligado). Recusa sem folga
   * de GPU (`fps` medido); `onDrop` é chamado se ele desligar sozinho (fps baixo, erro).
   */
  compareStart(host: HTMLElement, preset: Preset, onDrop: (fps: number) => void): { ok: true } | { ok: false; fps: number }
  compareStop(): void
  /**
   * Código .milk (027, fatia 6): a fonte `.milk` do preset aberto (importado ou meu preset vindo de
   * um `.milk`), ou `null` (cópia de preset do pacote: a aba mostra o JSON em leitura).
   */
  milk: string | null
  /** `.milk` → preset, pelo conversor do main (o mesmo da importação). */
  convertMilk(text: string): Promise<Preset>
  /** Exportar (027, fatia 7): grava pelo diálogo nativo do main. `canceled` = fechou o diálogo. */
  exportFile(kind: 'milk' | 'json', name: string, text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }>
  /**
   * Testar troca (027, fatia 11): corta para outro preset da biblioteca e, logo depois, volta para
   * `back()` com a transição do Palco (tipo e tempo das trocas manuais). Devolve o tempo da volta
   * em segundos, ou `null` se não há outro preset para trocar.
   */
  testSwap(back: () => Preset): { leadMs: number; seconds: number } | null
  /** Capturar quadro (027, fatia 11): PNG do quadro atual do visual, gravado pelo diálogo nativo. */
  captureFrame(name: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }>
}

const DEBOUNCE_MS = 400
const ESC_WINDOW_MS = 3000
/** Desfazer: mudanças no mesmo campo com menos de 1 s entre elas viram um passo só. */
const UNDO_GROUP_MS = 1000
const MAX_UNDO = 200
const BLOCKS: { id: MainBlock; title: string; legend: MessageKey; h: number }[] = [
  { id: 'init', title: 'per_frame_init', legend: 'studio.block.init', h: 120 },
  { id: 'frame', title: 'per_frame', legend: 'studio.block.frame', h: 180 },
  { id: 'pixel', title: 'per_pixel', legend: 'studio.block.pixel', h: 150 }
]
const MAIN_TITLE: Record<MainBlock, string> = { init: 'per_frame_init', frame: 'per_frame', pixel: 'per_pixel' }
const isMain = (b: Block): b is MainBlock => b in MAIN_TITLE
/** Shaders (fatia 5): `warp` e `comp`, como no protótipo. */
const SHADERS: { id: ShaderBlock; legend: MessageKey }[] = [
  { id: 'warp', legend: 'studio.shader.warp' },
  { id: 'comp', legend: 'studio.shader.comp' }
]
const isShader = (b: Block): b is ShaderBlock => b === 'warp' || b === 'comp'
/** Nome do bloco como no `.milk`: `per_frame`, `wave_1_per_point`, `warp`… (técnico, igual nos dois idiomas). */
/** Texto de um bloco de onda ou forma. */
const slotText = (s: Slots, b: SlotBlock): string => {
  const { kind, idx, field } = slotOfBlock(b)
  return kind === 'wave' ? (field === 'point' ? s.waves[idx]!.point_eqs_eel : s.waves[idx]!.frame_eqs_eel) : s.shapes[idx]!.frame_eqs_eel
}
const blockTitle = (b: Block): string => (isMain(b) ? MAIN_TITLE[b] : isShader(b) ? b : slotBlockTitle(b))

type Status = 'ok' | 'busy' | 'err'
/** Equações principais e shaders: texto que o editor muda e a compilação confere. */
type Code = Record<MainBlock | ShaderBlock, string>
/** Parâmetros base mudados no Básico (só as chaves mexidas). */
type Base = Record<string, number>
/** Um passo do desfazer: tudo o que o editor muda (spec 027, fatia 3). */
interface Snap {
  code: Code
  base: Base
  slots: Slots
  /** Shaders HLSL da fonte `.milk` e o GLSL que eles dão (só em presets com `.milk`). */
  hlsl?: HlslRef | null
}
/** O HLSL que vai no `.milk` e o GLSL em que ele se converteu (para saber se o GLSL foi editado à mão). */
interface HlslRef {
  src: Hlsl
  glsl: Hlsl
}

/** Abas na ordem do protótipo. */
const TABS = [
  { id: 'basic', label: 'studio.tab.basic' },
  { id: 'eq', label: 'studio.tab.eq' },
  { id: 'waves', label: 'studio.tab.waves' },
  { id: 'shapes', label: 'studio.tab.shapes' },
  { id: 'shaders', label: 'studio.tab.shaders' },
  { id: 'code', label: 'studio.tab.code' }
] as const satisfies readonly { id: string; label: MessageKey }[]
type TabId = (typeof TABS)[number]['id']
/** Última aba usada nesta abertura do app (reabrir o Estúdio volta nela). */
let lastTab: TabId = 'basic'

/** Hora da última compilação no formato do idioma do app (`2:32:05 PM` / `14:32:05`). */
const clock = (d: Date): string => new Intl.DateTimeFormat(getLang(), { hour: getLang() === 'en' ? 'numeric' : '2-digit', minute: '2-digit', second: '2-digit' }).format(d)
const errKey = (e: StudioError): string => `${e.block}:${e.line ?? '-'}:${JSON.stringify(e.issue)}`
/** Log e HUD ficam sempre em inglês (spec 030): vão para issues. */
const count = (n: number): string => `${n} ${n === 1 ? 'error' : 'errors'}`

/** A frase do problema no idioma do app, ou em `l` (o log usa `'en'`). */
function issueText(i: StudioIssue, l: Lang = getLang()): string {
  switch (i.kind) {
    case 'syntax': {
      const got = i.got ?? msgText('studio.err.end', l)
      return i.want.length
        ? msgText({ key: 'studio.err.expected', params: { want: new Intl.ListFormat(l, { type: 'disjunction' }).format(i.want), got } }, l)
        : msgText({ key: 'studio.err.near', params: { got } }, l)
    }
    case 'undefined':
      return msgText({ key: 'studio.err.undefined', params: { fn: i.fn } }, l)
    case 'args':
      return msgText({ plural: 'studio.err.args', n: i.expected, params: { fn: i.fn, got: i.got } }, l)
    case 'invalid':
      return msgText({ key: 'studio.err.invalid', params: { name: i.name } }, l)
    case 'slow':
      return msgText({ key: 'studio.err.slow', params: { ms: i.ms } }, l)
    case 'timeout':
      return msgText('studio.err.timeout', l)
    case 'equations':
      return msgText({ key: 'studio.err.equations', params: { detail: i.detail } }, l)
    case 'shader':
      return msgText({ key: 'studio.err.shader', params: { which: i.which, detail: i.detail } }, l)
    case 'glsl':
      return msgText({ key: 'studio.err.glsl', params: { detail: i.detail } }, l)
    case 'raw':
      return i.text
  }
}
/** A frase do aviso do verificador (spec 027, fatia 10), no idioma do app ou em `l`. */
function warnText(i: LintIssue, l: Lang = getLang()): string {
  switch (i.kind) {
    case 'unknownVar': {
      const s = msgText({ key: 'studio.warn.unknownVar', params: { name: i.name } }, l)
      return i.suggest ? `${s} ${msgText({ key: 'studio.warn.didYouMean', params: { name: i.suggest } }, l)}` : s
    }
    case 'tex2d':
      return msgText({ key: 'studio.warn.tex2d', params: { name: i.name } }, l)
    case 'braces':
      return msgText(i.extra ? 'studio.warn.bracesExtra' : 'studio.warn.bracesOpen', l)
  }
}
const warnKey = (w: StudioWarning): string => `w:${w.block}:${w.line}:${JSON.stringify(w.issue)}`
/** Função desconhecida (erro do compilador) com um nome parecido: o "Corrigir" troca na linha. */
const fixOfError = (e: StudioError): { from: string; to: string } | null => {
  if (e.issue.kind !== 'undefined' || !e.line) return null
  const to = suggestFunction(e.issue.fn)
  return to ? { from: e.issue.fn, to } : null
}
/** Onde: `per_frame, linha 2` / `per_frame, line 2`, ou só o bloco. */
const whereText = (e: StudioError): string => (e.line ? t('studio.atLine', { block: blockTitle(e.block), line: String(e.line) }) : blockTitle(e.block))

/** Do texto do bloco (o motor guarda com `\n`; o editor também). */
const codeOf = (p: Preset): Code => ({
  init: String(p[EQ_KEYS.init] ?? ''),
  frame: String(p[EQ_KEYS.frame] ?? ''),
  pixel: String(p[EQ_KEYS.pixel] ?? ''),
  warp: String(p.warp ?? ''),
  comp: String(p.comp ?? '')
})

function withCode(source: Preset, code: Code, base: Base = {}, slots?: Slots): Preset {
  const p = structuredClone(source)
  for (const b of ['init', 'frame', 'pixel'] as MainBlock[]) p[EQ_KEYS[b]] = code[b]
  p.warp = code.warp
  p.comp = code.comp
  if (slots) writeSlots(p, slots)
  if (Object.keys(base).length) p.baseVals = { ...(p.baseVals && typeof p.baseVals === 'object' ? (p.baseVals as Record<string, number>) : {}), ...base }
  return p
}

/** O editor inteiro a partir de um preset (restaurar uma versão): o `baseVals` todo entra como mexido. */
function snapOf(p: Preset): Snap {
  const bv = p.baseVals && typeof p.baseVals === 'object' ? (p.baseVals as Record<string, unknown>) : {}
  const base: Base = {}
  for (const [k, v] of Object.entries(bv)) if (typeof v === 'number' && Number.isFinite(v)) base[k] = v
  return { code: codeOf(p), base, slots: slotsOf(p) }
}

/** Hora da versão: só `14:32` se for de hoje; senão com o dia (`12 de nov., 14:32`). */
function verTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  const today = new Date().toDateString() === d.toDateString()
  const time: Intl.DateTimeFormatOptions = { hour: getLang() === 'en' ? 'numeric' : '2-digit', minute: '2-digit' }
  return new Intl.DateTimeFormat(getLang(), today ? time : { ...time, day: 'numeric', month: 'short' }).format(d)
}

/** "decay 0.960 → 0.975; per_frame editada", no idioma do app (o main guarda só os dados). */
function verSummary(v: SoMineVersion, basedOn: { name: string } | null): string {
  const s = v.summary
  if (s.kind === 'created') return basedOn ? t('studio.ver.createdFrom', { name: basedOn.name }) : t('studio.ver.created')
  if (s.kind === 'earlier') return t('studio.ver.earlier')
  const parts = s.vals.map((x) => `${x.key} ${x.from.toFixed(3)} → ${x.to.toFixed(3)}`)
  if (s.more) parts.push(tn('studio.ver.moreVals', s.more))
  if (s.blocks.length) parts.push(tn('studio.ver.edited', s.blocks.length, { blocks: new Intl.ListFormat(getLang(), { type: 'conjunction' }).format(s.blocks) }))
  return parts.length ? parts.join('; ') : t('studio.ver.noChanges')
}

function originalCredit(name: string): { name: string; author: string } {
  const i = name.indexOf(' - ')
  return { name, author: i > 0 ? name.slice(0, i).trim() : '' }
}

function Studio({ api }: { api: StudioApi }) {
  const { core } = api
  const settings = core.state.settings
  const initial = useMemo(() => codeOf(api.source), [api])
  const [code, setCode] = useState<Code>(initial)
  const [base, setBase] = useState<Base>({})
  const latestBase = useRef(base)
  latestBase.current = base
  /** Ondas e formas (4 + 4), editadas como um todo e compiladas com as equações. */
  const origSlots = useMemo(() => slotsOf(api.source), [api])
  const [slots, setSlots] = useState<Slots>(() => slotsOf(api.source))
  const latestSlots = useRef(slots)
  latestSlots.current = slots
  /** Slot aberto em cada aba (um por vez, como no protótipo; -1 = todos fechados). */
  const [openSlot, setOpenSlot] = useState<Record<SlotKind, number>>({ wave: 0, shape: 0 })
  /** O que foi compilado por último: equações + slots (o Básico é sempre válido e fica de fora). */
  const keyOf = (c: Code): string => JSON.stringify([c, latestSlots.current])
  const [tab, setTabState] = useState<TabId>(lastTab)
  const tabRef = useRef(tab)
  const setTab = (id: TabId, focus = false): void => {
    lastTab = id
    tabRef.current = id
    setTabState(id)
    if (focus) root.current?.querySelector<HTMLElement>(`#studio-tab-${id}`)?.focus()
  }
  const [status, setStatus] = useState<Status>('busy')
  const [errors, setErrors] = useState<StudioError[]>([])
  /** Avisos do verificador (não bloqueiam; recalculados a cada compilação). */
  const [warnings, setWarnings] = useState<StudioWarning[]>([])
  const lastWarns = useRef<Set<string>>(new Set())
  const [compiledAt, setCompiledAt] = useState<Date | null>(null)
  /** Já houve uma versão válida (o selo "última versão válida" só faz sentido depois dela). */
  const [hadValid, setHadValid] = useState(false)
  const [probsOpen, setProbsOpen] = useState(true)
  const [saved, setSaved] = useState<{ name: string; id: string; meta: SoMineMeta } | null>(api.mine ? { name: api.sourceName, ...api.mine } : null)
  const [title, setTitle] = useState(() => (api.mine ? api.sourceName : api.fresh ? t('studio.defaultTitle') : t('studio.remixOf', { name: originalCredit(api.sourceName).name.split(' - ').slice(1).join(' - ') || api.sourceName })))
  const [dirty, setDirty] = useState(false)
  /** Nome editado num preset já salvo (027, fatia 9): salvar renomeia. Campo vazio = fica o nome atual. */
  const renamed = !!saved && title.trim() !== '' && title.trim() !== saved.name
  const unsaved = dirty || renamed
  const [askAuthor, setAskAuthor] = useState(false)
  const [authorDraft, setAuthorDraft] = useState('')
  const [escWarn, setEscWarn] = useState(false)
  const escAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const lastErrs = useRef(new Set<string>())
  const lastCompiled = useRef<string>('')
  const latest = useRef(code)
  latest.current = code
  const editors = useRef<Partial<Record<Block, HTMLTextAreaElement | null>>>({})
  // ── Desfazer / refazer (Ctrl+Z, Ctrl+Shift+Z) e Versões ─
  const undoStack = useRef<Snap[]>([])
  const redoStack = useRef<Snap[]>([])
  const lastGroup = useRef({ key: '', at: 0 })
  const [drawer, setDrawer] = useState(false)
  const [versions, setVersions] = useState<SoMineVersion[] | 'loading' | 'error'>('loading')
  // ── Comparar (spec 027, fatia 4) ────────────────────────
  /** Ligado: o que está à esquerda (o original ou uma versão, com a hora). */
  const [cmp, setCmp] = useState<{ version: SoMineVersion | null } | null>(null)
  const origPane = useRef<HTMLDivElement>(null)
  const rmxPane = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const verBtn = useRef<HTMLButtonElement>(null)
  const expBtn = useRef<HTMLButtonElement>(null)
  const [expOpen, setExpOpen] = useState(false)
  useEffect(() => {
    if (expOpen) root.current?.querySelector<HTMLElement>('.st-exp-milk')?.focus()
  }, [expOpen])
  const drClose = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLDivElement>(null)
  // ── Código .milk (spec 027, fatia 6) ────────────────────
  /** HLSL da fonte e o GLSL dele; `null` = sem `.milk` (a aba mostra o JSON em leitura). */
  const hlsl = useRef<HlslRef | null>(api.milk ? { src: milkShaders(api.milk), glsl: { warp: initial.warp, comp: initial.comp } } : null)
  /** O texto que o usuário está editando na aba (até outra aba mudar algo, a aba mostra o gerado). */
  const [milkDraft, setMilkDraft] = useState<string | null>(null)
  const milkDraftRef = useRef<string | null>(null)
  const milkTimer = useRef<number | undefined>(undefined)
  const milkPending = useRef<Promise<void> | null>(null)
  /** O `.milk` não converteu: o motivo (do main), mostrado em Problemas. */
  const [milkErr, setMilkErrState] = useState<Msg | null>(null)
  const milkErrRef = useRef<Msg | null>(null)
  const setMilkErr = (m: Msg | null): void => {
    milkErrRef.current = m
    setMilkErrState(m)
  }
  const milkTa = useRef<HTMLTextAreaElement | null>(null)
  // A troca de idioma redesenha o Estúdio (ele tem a própria raiz, fora do Overlay).
  const [, setLangTick] = useState(0)
  useEffect(() => onLanguage(() => setLangTick((n) => n + 1)), [])

  const basedOn = api.mine ? api.mine.meta.basedOn : api.fresh ? null : originalCredit(api.sourceName)
  const author = settings.authorName || t('credit.mine.defaultAuthor')
  const credit = t('credit.by', { author: mineCredit({ author: saved?.meta.author ?? author, basedOn }) })
  /** As equações e os slots da última compilação que passou (o que a prévia toca com erro na tela). */
  const lastValid = useRef<{ code: Code; slots: Slots }>({ code: initial, slots: origSlots })

  // ── Compilar ────────────────────────────────────────────
  const compile = async (c: Code, load = true): Promise<boolean> => {
    window.clearTimeout(timer.current)
    const key = keyOf(c)
    setStatus('busy')
    const sl = latestSlots.current
    const r = await api.compile(withCode(api.source, c, latestBase.current, sl))
    if ('superseded' in r) return false
    lastCompiled.current = key
    const w = lint({ code: c, slots: latestSlots.current, base: (api.source.baseVals as Record<string, unknown> | undefined) ?? {} })
    setWarnings(w)
    const wk = new Set(w.map(warnKey))
    for (const x of w) if (!lastWarns.current.has(warnKey(x))) api.log(`studio: warning in ${blockTitle(x.block)}, line ${x.line}: ${warnText(x.issue, 'en')}`)
    lastWarns.current = wk
    setCompiledAt(new Date())
    if (r.ok) {
      lastValid.current = { code: c, slots: sl }
      // Parâmetros base mexidos durante a compilação também vão (são sempre válidos).
      if (load) api.apply(withCode(api.source, c, latestBase.current, latestSlots.current))
      // Um .milk que não converteu continua sendo um problema até ser corrigido.
      setStatus(milkErrRef.current ? 'err' : 'ok')
      setErrors([])
      setHadValid(true)
      lastErrs.current = new Set()
      api.reportCost(`studio: compile ${r.ms.toFixed(0)} ms (test frame ${r.frameMs.toFixed(1)} ms)`)
      return true
    }
    setStatus('err')
    setErrors(r.errors)
    api.reportCost(`studio: compile ${r.ms.toFixed(0)} ms · ${count(r.errors.length)}`)
    // Log: só erros novos, nunca por tecla.
    const keys = new Set(r.errors.map(errKey))
    for (const e of r.errors) if (!lastErrs.current.has(errKey(e))) api.log(`studio: error in ${blockTitle(e.block)}${e.line ? `, line ${e.line}` : ''}: ${issueText(e.issue, 'en')}`)
    lastErrs.current = keys
    return false
  }

  const snapNow = (): Snap => ({ code: latest.current, base: latestBase.current, slots: latestSlots.current, hlsl: hlsl.current })
  /** Outra aba mudou o preset: a aba Código volta a mostrar o texto gerado. */
  const dropDraft = (): void => {
    window.clearTimeout(milkTimer.current)
    milkDraftRef.current = null
    setMilkDraft(null)
    setMilkErr(null)
  }
  /** Guarda o estado de antes de uma mudança. `group` igual em menos de 1 s = o mesmo passo; `null` = sempre um passo. */
  const remember = (group: string | null): void => {
    const now = performance.now()
    if (group !== null && group === lastGroup.current.key && now - lastGroup.current.at < UNDO_GROUP_MS) {
      lastGroup.current.at = now
      return
    }
    lastGroup.current = { key: group ?? '', at: group === null ? 0 : now }
    undoStack.current.push(snapNow())
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
    redoStack.current = []
  }
  const applySnap = (x: Snap, keepDraft = false): void => {
    if (x.hlsl !== undefined) hlsl.current = x.hlsl
    if (!keepDraft) dropDraft()
    latest.current = x.code
    latestBase.current = x.base
    latestSlots.current = x.slots
    setCode(x.code)
    setBase(x.base)
    setSlots(x.slots)
    setDirty(true)
    setEscWarn(false)
    void compile(x.code)
  }
  const step = (from: { current: Snap[] }, to: { current: Snap[] }, empty: MessageKey, what: string): void => {
    const x = from.current.pop()
    if (!x) {
      showToast(t(empty), { force: true })
      return
    }
    to.current.push(snapNow())
    lastGroup.current = { key: '', at: 0 }
    applySnap(x)
    api.log(`studio: ${what}`)
  }
  const undo = (): void => step(undoStack, redoStack, 'toast.studio.nothingToUndo', 'undo')
  const redo = (): void => step(redoStack, undoStack, 'toast.studio.nothingToRedo', 'redo')

  const loadVersions = (): void => {
    if (!saved) {
      setVersions([])
      return
    }
    setVersions('loading')
    api.versions().then(setVersions, (err: unknown) => {
      api.log(`studio: versions failed to load: ${mainErrorText(err)}`)
      setVersions('error')
    })
  }
  const openDrawer = (open: boolean): void => {
    setDrawer(open)
    if (open) loadVersions()
    else if (root.current?.querySelector('.st-drawer')?.contains(document.activeElement)) verBtn.current?.focus()
  }
  useEffect(() => {
    if (drawer) window.setTimeout(() => drClose.current?.focus(), 30)
  }, [drawer])
  const restore = async (v: SoMineVersion): Promise<void> => {
    try {
      const p = await api.version(v.n)
      remember(null)
      lastGroup.current = { key: '', at: 0 }
      applySnap(snapOf(p))
      api.log(`studio: restored version ${v.n}`)
      showToast(t('toast.studio.restored', { time: verTime(v.savedAt) }), { force: true })
    } catch (err) {
      api.log(`studio: restore failed: ${mainErrorText(err)}`)
      showToast(t('toast.studio.notRestored', { error: msgText(mainError(err)) }), { force: true })
    }
  }

  const onCompareDrop = (fps: number): void => {
    setCmp(null)
    showToast(fps > 0 ? t('toast.studio.cmpDropped', { fps: fmtNum(Math.round(fps)) }) : t('toast.studio.cmpFailed'), { force: true })
  }
  /** Liga a comparação com `version` (ou o original). Devolve se ligou. */
  const startCompare = (version: SoMineVersion | null, preset: Preset): boolean => {
    const host = origPane.current
    if (!host) return false
    const r = api.compareStart(host, preset, onCompareDrop)
    if (!r.ok) {
      showToast(r.fps > 0 ? t('toast.studio.cmpLowFps', { fps: fmtNum(Math.round(r.fps)) }) : t('toast.studio.cmpFailed'), { force: true })
      return false
    }
    setCmp({ version })
    return true
  }
  const toggleCompare = (input: HTMLInputElement): void => {
    if (!input.checked) {
      api.compareStop()
      setCmp(null)
      api.log('studio: compare off')
      return
    }
    // Recusado: o switch volta (o estado não mudou, então o Preact não o redesenharia).
    if (!startCompare(null, api.original)) input.checked = false
  }
  const compareVersion = async (v: SoMineVersion): Promise<void> => {
    try {
      const p = await api.version(v.n)
      if (startCompare(v, p)) {
        api.log(`studio: comparing with version ${v.n}`)
        showToast(t('toast.studio.cmpVersion', { time: verTime(v.savedAt) }), { force: true })
      }
    } catch (err) {
      api.log(`studio: compare failed: ${mainErrorText(err)}`)
      showToast(t('toast.studio.notRestored', { error: msgText(mainError(err)) }), { force: true })
    }
  }
  useEffect(() => () => api.compareStop(), [])
  // Quadro inteiro na prévia (#143; protótipo do Estúdio, coluna da prévia): o visual principal encolhe, pela
  // transformação do CSS, para caber inteiro no painel "Seu remix", com a proporção da janela. O motor segue
  // desenhando no tamanho da janela (o "Capturar quadro" grava o quadro em tamanho real). No "Comparar", o
  // segundo canvas (também do tamanho da janela) encolhe do mesmo jeito no painel da esquerda.
  useLayoutEffect(() => {
    const main = document.getElementById('canvas')
    const place = (): void => {
      const st = stage.current, rp = rmxPane.current, op = origPane.current
      if (!st || !rp) return
      const W = window.innerWidth, H = window.innerHeight
      const fit = (r: DOMRect): { x: number; y: number; w: number; h: number; s: number } => {
        const s = Math.max(0.01, Math.min(r.width / W, r.height / H))
        const w = W * s, h = H * s
        return { x: r.left + (r.width - w) / 2, y: r.top + (r.height - h) / 2, w, h, s }
      }
      const vars = (el: HTMLElement, f: { x: number; y: number; w: number; h: number }, ox: number, oy: number): void => {
        el.style.setProperty('--fl', `${f.x - ox}px`)
        el.style.setProperty('--ft', `${f.y - oy}px`)
      }
      const rr = rp.getBoundingClientRect()
      const fr = fit(rr)
      if (main) main.style.transform = `translate(${fr.x}px, ${fr.y}px) scale(${fr.s})`
      vars(rp, fr, rr.left, rr.top)
      // Assinatura e selo "última versão válida" ficam sobre o quadro do remix (coordenadas da prévia, dentro da borda).
      const sr = st.getBoundingClientRect()
      const sx = sr.left + st.clientLeft, sy = sr.top + st.clientTop
      st.style.setProperty('--rl', `${fr.x - sx}px`)
      st.style.setProperty('--rt', `${fr.y - sy}px`)
      st.style.setProperty('--rw', `${fr.w}px`)
      st.style.setProperty('--rb', `${st.clientHeight - (fr.y - sy + fr.h)}px`)
      st.style.setProperty('--rr', `${st.clientWidth - (fr.x - sx + fr.w)}px`)
      if (cmp && op) {
        const or = op.getBoundingClientRect()
        const fo = fit(or)
        vars(op, fo, or.left, or.top)
        const cv = op.querySelector<HTMLCanvasElement>('.st-cmp-canvas')
        if (cv) cv.style.transform = `translate(${fo.x - or.left}px, ${fo.y - or.top}px) scale(${fo.s})`
      }
    }
    place()
    // O canvas do "Comparar" entra no painel logo depois de ligar (pelo main): reposiciona no próximo quadro.
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    const ro = new ResizeObserver(place)
    for (const el of [stage.current, rmxPane.current, origPane.current]) if (el) ro.observe(el)
    const mo = new MutationObserver(place)
    if (origPane.current) mo.observe(origPane.current, { childList: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      ro.disconnect()
      mo.disconnect()
    }
  }, [cmp])
  useLayoutEffect(() => () => void document.getElementById('canvas')?.style.removeProperty('transform'), [])

  // A cópia aberta já está no visual; a primeira compilação só confere e mostra o status.
  // O modelo do "Novo preset" ainda não está: a primeira compilação o leva ao visual.
  useEffect(() => {
    void compile(initial, !!api.fresh)
  }, [])
  // Meu preset vindo de um `.milk`: o GLSL salvo pode ter sido editado à mão. O que a fonte dá
  // convertida diz se o HLSL do `.milk` ainda corresponde aos shaders (nota na aba Código).
  useEffect(() => {
    const first = hlsl.current
    if (!api.milk || !first) return
    api.convertMilk(api.milk).then(
      (p) => {
        if (hlsl.current !== first) return
        hlsl.current = { src: first.src, glsl: { warp: String(p.warp ?? ''), comp: String(p.comp ?? '') } }
        setLangTick((n) => n + 1)
      },
      (err: unknown) => api.log(`studio: .milk source did not convert: ${mainErrorText(err)}`)
    )
  }, [])

  const edit = (b: Block, v: string): void => {
    remember(`code:${b}`)
    dropDraft()
    const next = { ...latest.current, [b]: v }
    setCode(next)
    setDirty(true)
    setEscWarn(false)
    setStatus('busy')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void compile(next), DEBOUNCE_MS)
  }

  /** Ondas e Formas: tudo passa pela compilação (com pausa de 400 ms), como as equações. */
  const changeSlots = (next: Slots): void => {
    dropDraft()
    latestSlots.current = next
    setSlots(next)
    setDirty(true)
    setEscWarn(false)
    setStatus('busy')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void compile(latest.current), DEBOUNCE_MS)
  }
  const listOf = (s: Slots, kind: SlotKind): Slots['waves'] | Slots['shapes'] => (kind === 'wave' ? s.waves : s.shapes)
  const updateSlot = (kind: SlotKind, i: number, f: (x: Slots['waves'][number] & Slots['shapes'][number]) => void, group: string): void => {
    remember(`slot:${kind}${i}:${group}`)
    const next = structuredClone(latestSlots.current)
    f(listOf(next, kind)[i] as Slots['waves'][number] & Slots['shapes'][number])
    changeSlots(next)
  }
  const setSlotParam = (kind: SlotKind, i: number, p: BasicParam, raw: number): void => {
    const orig = slotValue(kind, listOf(origSlots, kind)[i]!.baseVals, p.key)
    const v = clampParam(p, raw, rangeFor(p, orig))
    updateSlot(
      kind,
      i,
      (x) => {
        x.baseVals[p.key] = v
      },
      p.key
    )
  }
  const setSlotCode = (b: SlotBlock, v: string): void => {
    const { kind, idx, field } = slotOfBlock(b)
    updateSlot(
      kind,
      idx,
      (x) => {
        if (field === 'point') x.point_eqs_eel = v
        else x.frame_eqs_eel = v
      },
      field
    )
  }

  /** "Corrigir" de um aviso ou erro: troca a palavra na linha, como se o usuário tivesse digitado (entra no desfazer). */
  const applyWordFix = (b: Block, line: number, fix: { from: string; to: string }): void => {
    const text = isMain(b) || isShader(b) ? latest.current[b] : slotText(latestSlots.current, b)
    const next = applyFix(text, line, fix.from, fix.to)
    if (next === text) return
    if (isMain(b) || isShader(b)) edit(b, next)
    else setSlotCode(b, next)
    api.log(`studio: fixed ${fix.from} -> ${fix.to} in ${blockTitle(b)}, line ${line}`)
    showToast(t('toast.studio.fixed', fix), { force: true })
  }

  const valueOf = (p: BasicParam): number => (p.key in base ? base[p.key]! : baseValue(api.source.baseVals, p))
  /** Básico: vale na hora (no motor) e entra no próximo salvamento. Valor sempre válido. */
  const tweak = (p: BasicParam, raw: number): void => {
    const range = rangeFor(p, baseValue(api.source.baseVals, p))
    const v = clampParam(p, raw, range)
    remember(`base:${p.key}`)
    dropDraft()
    const next = { ...latestBase.current, [p.key]: v }
    latestBase.current = next
    setBase(next)
    setDirty(true)
    setEscWarn(false)
    if (api.tweak(p.key, v)) return
    // Sem acesso ao runner (ou carga em andamento): recarrega pelo caminho normal.
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void compile(latest.current), DEBOUNCE_MS)
  }

  /**
   * Código .milk: cada pausa de 400 ms converte o texto no main (o mesmo caminho da importação) e
   * o resultado vira o editor inteiro (os controles das outras abas acompanham). Shaders: se o
   * HLSL do texto não mudou, ficam os GLSL atuais (que podem ter sido editados na aba Shaders).
   */
  const editMilk = (v: string): void => {
    remember('code:milk')
    milkDraftRef.current = v
    setMilkDraft(v)
    setDirty(true)
    setEscWarn(false)
    setStatus('busy')
    window.clearTimeout(timer.current)
    window.clearTimeout(milkTimer.current)
    milkTimer.current = window.setTimeout(() => {
      milkPending.current = applyMilk(v)
    }, DEBOUNCE_MS)
  }
  const applyMilk = async (v: string): Promise<void> => {
    let p: Preset
    try {
      p = await api.convertMilk(v)
    } catch (err) {
      if (milkDraftRef.current !== v) return
      setMilkErr(mainError(err))
      setStatus('err')
      api.log(`studio: .milk did not convert: ${mainErrorText(err)}`)
      return
    }
    if (milkDraftRef.current !== v) return
    setMilkErr(null)
    const src = milkShaders(v)
    const cur = hlsl.current
    const next = snapOf(p)
    if (cur && cur.src.warp === src.warp && cur.src.comp === src.comp) {
      next.code = { ...next.code, warp: latest.current.warp, comp: latest.current.comp }
      next.hlsl = cur
    } else next.hlsl = { src, glsl: { warp: next.code.warp, comp: next.code.comp } }
    applySnap(next, true)
    api.log('studio: .milk applied')
  }
  /** O `.milk` do estado atual (com o HLSL da fonte), ou `undefined` se o preset não tem `.milk`. */
  const milkNow = (): string | undefined =>
    hlsl.current ? presetToMilk(withCode(api.source, latest.current, latestBase.current, latestSlots.current) as Record<string, unknown>, hlsl.current.src) : undefined

  // ── Salvar ──────────────────────────────────────────────
  /**
   * Antes de gravar (salvar ou exportar): converte o `.milk` que espera a pausa e garante que o
   * estado atual é exatamente o que compilou. `false` = há erro (o toast `errKey` já apareceu).
   */
  const ready = async (errKey: MessageKey): Promise<boolean> => {
    if (milkDraftRef.current !== null && milkTimer.current !== undefined) {
      window.clearTimeout(milkTimer.current)
      milkTimer.current = undefined
      await applyMilk(milkDraftRef.current)
    } else if (milkPending.current) await milkPending.current
    if (milkErrRef.current) {
      showToast(t(errKey), { force: true })
      return false
    }
    const c = latest.current
    if (status !== 'ok' || lastCompiled.current !== keyOf(c)) {
      const ok = await compile(c)
      if (!ok) {
        showToast(t(errKey), { force: true })
        return false
      }
    }
    return true
  }

  const save = async (authorName?: string): Promise<void> => {
    if (settings.authorName === null && authorName === undefined && !saved) {
      setExpOpen(false)
      setAuthorDraft('')
      setAskAuthor(true)
      return
    }
    // Só o nome mudou num preset já salvo: renomeia, sem versão nova (e sem depender da compilação).
    const onlyRename = renamed && !dirty
    if (!onlyRename && !(await ready('toast.studio.fixErrors'))) return
    const c = latest.current
    try {
      let cur = saved
      if (saved && renamed) {
        cur = await api.rename(title)
        setSaved(cur)
        setTitle(cur.name)
      }
      if (onlyRename && cur) {
        setEscWarn(false)
        showToast(t('toast.studio.renamed', { name: cur.name }), { force: true })
        return
      }
      const name = (cur?.name ?? title.trim()) || t('studio.defaultTitle')
      const r = await api.save({ preset: withCode(api.source, c, latestBase.current, latestSlots.current), title: name, author: authorName ?? author, milk: milkNow() })
      setSaved(r)
      setTitle(r.name)
      if (drawer) api.versions().then(setVersions, () => setVersions('error'))
      setDirty(false)
      setEscWarn(false)
      showToast(
        saved && renamed ? t('toast.studio.renamed', { name: r.name }) : saved ? t('toast.studio.saved') : t('toast.studio.savedNew', { name: r.name }),
        { force: true }
      )
    } catch (err) {
      // O main lança em inglês com código: a tela traduz, o log fica em inglês (spec 030, P1).
      api.log(`studio: save failed: ${mainErrorText(err)}`)
      showToast(t('toast.studio.notSaved', { error: msgText(mainError(err)) }), { force: true })
    }
  }

  // ── Exportar (spec 027, fatia 7) ────────────────────────
  /**
   * `.milk` com o HLSL da fonte quando há uma; sem fonte (cópia de preset do pacote), só parâmetros
   * e equações, com aviso antes. O JSON do Butterchurn 3 leva tudo, shaders GLSL inclusive.
   */
  const doExport = async (kind: 'milk' | 'json'): Promise<void> => {
    setExpOpen(false)
    expBtn.current?.focus()
    if (!(await ready('toast.studio.fixErrorsExport'))) return
    const p = withCode(api.source, latest.current, latestBase.current, latestSlots.current) as Record<string, unknown>
    const text = kind === 'milk' ? presetToMilk(p, hlsl.current?.src ?? null) : `${JSON.stringify(p, null, 2)}\n`
    try {
      const r = await api.exportFile(kind, title.trim() || t('studio.defaultTitle'), text)
      if (!r.ok) return
      api.log(`studio: exported ${kind}${kind === 'milk' && !hlsl.current ? ' without shaders' : ''}`)
      showToast(t('toast.studio.exported', { name: r.name ?? '' }), { force: true })
    } catch (err) {
      api.log(`studio: export failed: ${mainErrorText(err)}`)
      showToast(t('toast.studio.notExported', { error: msgText(mainError(err)) }), { force: true })
    }
  }

  // ── Extras da prévia (spec 027, fatia 11) ───────────────
  /**
   * Testar troca: a prévia corta para outro preset e volta para este com a transição do Palco, e a
   * assinatura (nome e crédito) aparece no pé da prévia, como no Palco. Com erro na tela, volta para
   * a última versão válida (a que a prévia tocava).
   */
  const card = useRef<HTMLDivElement>(null)
  const cardSweep = useRef<HTMLElement>(null)
  const cardTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(cardTimer.current), [])
  const testSwap = (): void => {
    const r = api.testSwap(() => withCode(api.source, lastValid.current.code, latestBase.current, lastValid.current.slots))
    if (!r) {
      showToast(t('toast.studio.noSwap'), { force: true })
      return
    }
    const el = card.current
    const sw = cardSweep.current
    if (!el || !sw) return
    const sigMs = r.leadMs + (r.seconds > 0 ? r.seconds * 1000 : 400)
    sw.style.transition = 'none'
    sw.style.width = '0'
    void sw.offsetWidth // reinicia a barra
    sw.style.transition = `width ${sigMs}ms linear`
    sw.style.width = '100%'
    el.classList.add('show')
    window.clearTimeout(cardTimer.current)
    cardTimer.current = window.setTimeout(() => el.classList.remove('show'), Math.max(4000, sigMs + 1500))
  }
  /** Capturar quadro: PNG do quadro que está na tela, com o nome do preset. */
  const [capturing, setCapturing] = useState(false)
  const captureFrame = async (): Promise<void> => {
    if (capturing) return
    setCapturing(true)
    try {
      const r = await api.captureFrame(title.trim() || t('studio.defaultTitle'))
      if (r.ok) {
        api.log('studio: frame captured')
        showToast(t('toast.studio.captured', { name: r.name ?? '' }), { force: true })
      }
    } catch (err) {
      api.log(`studio: frame capture failed: ${mainErrorText(err)}`)
      showToast(t('toast.studio.notCaptured'), { force: true })
    } finally {
      setCapturing(false)
    }
  }

  const confirmAuthor = (): void => {
    const v = authorDraft.trim()
    core.run('settings.set', { authorName: v }, 'ui')
    setAskAuthor(false)
    void save(v || t('credit.mine.defaultAuthor'))
  }

  // ── Teclado: Ctrl+S, Ctrl+Enter, Esc ────────────────────
  const exit = (): void => {
    const now = performance.now()
    if (unsaved && !(escWarn && now - escAt.current < ESC_WINDOW_MS)) {
      escAt.current = now
      setEscWarn(true)
      showToast(t('toast.studio.unsaved'), { force: true })
      return
    }
    api.close(saved?.name ?? null)
  }
  /** "Novo preset" (027, fatia 8): com mudanças não salvas, o primeiro clique só avisa; o segundo (em 3 s) descarta. */
  const newAt = useRef(0)
  const newPreset = (): void => {
    const now = performance.now()
    if (unsaved && now - newAt.current >= ESC_WINDOW_MS) {
      newAt.current = now
      showToast(t('toast.studio.unsavedNew'), { force: true })
      return
    }
    api.newPreset()
  }
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyRef.current = (e: KeyboardEvent) => {
    const tgt = e.target as HTMLElement | null
    const inField = !!tgt && (tgt.tagName === 'TEXTAREA' || tgt.tagName === 'INPUT')
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault()
      e.stopImmediatePropagation()
      void save()
      return
    }
    // Ctrl+Z / Ctrl+Shift+Z (e Ctrl+Y): desfazer do editor. Num campo de texto vale o desfazer nativo dele.
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.code === 'KeyZ' || e.code === 'KeyY')) {
      const textField = !!tgt && (tgt.tagName === 'TEXTAREA' || (tgt.tagName === 'INPUT' && (tgt as HTMLInputElement).type === 'text'))
      if (textField) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.code === 'KeyY' || e.shiftKey) redo()
      else undo()
      return
    }
    // Ctrl+1…: abas (com e.code, para valer em qualquer layout de teclado).
    const digit = /^Digit([1-9])$/.exec(e.code)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && digit) {
      const target = TABS[Number(digit[1]) - 1]
      e.preventDefault()
      e.stopImmediatePropagation()
      if (target) setTab(target.id)
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      e.stopImmediatePropagation()
      void compile(latest.current).then((ok) => showToast(t(ok ? 'toast.studio.compiled' : 'toast.studio.compiledErrors'), { force: true }))
      return
    }
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopImmediatePropagation()
    if (askAuthor) {
      setAskAuthor(false)
      return
    }
    if (expOpen) {
      setExpOpen(false)
      expBtn.current?.focus()
      return
    }
    // Esc num campo só sai do campo; com a gaveta aberta, fecha a gaveta; senão, volta ao Palco.
    if (inField) tgt!.blur()
    else if (drawer) openDrawer(false)
    else exit()
  }
  useLayoutEffect(() => {
    const on = (e: KeyboardEvent): void => keyRef.current(e)
    window.addEventListener('keydown', on, true)
    document.body.classList.add('studio-open')
    root.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', on, true)
      document.body.classList.remove('studio-open')
      window.clearTimeout(timer.current)
    }
  }, [])

  const goTo = (b: Block, line: number | null, retry = true): void => {
    const want: TabId = isMain(b) ? 'eq' : isShader(b) ? 'shaders' : slotOfBlock(b).kind === 'wave' ? 'waves' : 'shapes'
    if (!isMain(b) && !isShader(b)) {
      const { kind, idx } = slotOfBlock(b)
      setOpenSlot((o) => (o[kind] === idx ? o : { ...o, [kind]: idx }))
    }
    if (tabRef.current !== want) setTab(want)
    const ta = editors.current[b]
    // Aba ou slot escondido: o painel aparece no próximo quadro.
    if ((!ta || !ta.offsetParent) && retry) {
      requestAnimationFrame(() => goTo(b, line, false))
      return
    }
    if (!ta) return
    ta.focus()
    if (line) {
      const lines = ta.value.split('\n')
      const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0)
      ta.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0))
      ta.scrollTop = Math.max(0, (line - 3) * 20)
    }
    ta.closest('.ed-block')?.scrollIntoView({ block: 'nearest' })
  }

  const stale = status === 'err' && hadValid
  const nErr = errors.length + (milkErr ? 1 : 0)
  const nProbs = nErr + warnings.length
  const goMilk = (): void => {
    if (tabRef.current !== 'code') setTab('code')
    requestAnimationFrame(() => milkTa.current?.focus())
  }
  // Aba Código: o `.milk` gerado (ou o que está sendo digitado), ou o JSON do preset em leitura.
  const preset = tab === 'code' ? (withCode(api.source, code, base, slots) as Record<string, unknown>) : null
  const codeText = !preset ? '' : hlsl.current ? (milkDraft ?? presetToMilk(preset, hlsl.current.src)) : JSON.stringify(preset, null, 2)
  const shadersEdited = !!hlsl.current && (code.warp !== hlsl.current.glsl.warp || code.comp !== hlsl.current.glsl.comp)
  /** Exportar: sem fonte `.milk`, os shaders (GLSL) do preset não vão no `.milk`. */
  const expLosesShaders = !hlsl.current && !!(code.warp.trim() || code.comp.trim())

  return (
    <div class="studio" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t('studio.dialog')}>
      <header class="st-top">
        <button type="button" class="btn btn-ghost st-back" title={t('studio.backTitle')} onClick={exit}>
          <Icon name="arrow-left" />
          <span class="lbl">{t('studio.back')}</span>
          <kbd class="lbl">Esc</kbd>
        </button>
        <div class="st-ident">
          <label class="sr-only" for="studio-name">
            {t('studio.nameLabel')}
          </label>
          <input
            id="studio-name"
            class="st-name"
            type="text"
            value={title}
            maxLength={200}
            spellcheck={false}
            autocomplete="off"
            title={saved ? t('studio.renameTitle') : undefined}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          <div class="st-credit">{credit}</div>
        </div>
        <div class="st-top-r">
          <div class={`cstat ${status}`} role="status" aria-live="polite">
            {status === 'ok' ? (
              <>
                <Icon name="check" small />
                {t('studio.status.ok')}
              </>
            ) : status === 'err' ? (
              <>
                <Icon name="triangle-alert" small />
                {tn('studio.errors', nErr)}
              </>
            ) : (
              <>
                <Icon name="clock" small />
                {t('studio.status.busy')}
              </>
            )}
          </div>
          <button type="button" class="btn btn-ghost st-new" title={t('studio.newTitle')} aria-label={t('studio.new')} onClick={newPreset}>
            <Icon name="plus" />
            <span class="lbl">{t('studio.new')}</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost st-ver"
            ref={verBtn}
            title={t('studio.ver.title')}
            aria-label={t('studio.ver.title')}
            aria-expanded={drawer}
            aria-controls="studio-versions"
            onClick={() => openDrawer(!drawer)}
          >
            <Icon name="history" />
            <span class="lbl">{t('studio.ver.title')}</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost st-exp-btn"
            ref={expBtn}
            title={t('studio.exp.button')}
            aria-label={t('studio.exp.button')}
            aria-expanded={expOpen}
            aria-controls="studio-export"
            onClick={() => {
              setAskAuthor(false)
              setExpOpen(!expOpen)
            }}
          >
            <Icon name="download" />
            <span class="lbl">{t('studio.exp.button')}</span>
          </button>
          <button type="button" class="btn btn-primary st-save" title={t('studio.saveTitle')} onClick={() => void save()}>
            {t('studio.save')} <span class="save-k">Ctrl+S</span>
          </button>
          {expOpen && (
            <div class="st-ask st-exp" id="studio-export" role="dialog" aria-labelledby="studio-export-h">
              <h2 id="studio-export-h">{t('studio.exp.title')}</h2>
              {expLosesShaders ? (
                <p class="st-exp-warn" role="note">
                  <Icon name="triangle-alert" small />
                  <span>{t('studio.exp.noShaders')}</span>
                </p>
              ) : shadersEdited ? (
                <p class="st-exp-warn" role="note">
                  <Icon name="triangle-alert" small />
                  <span>{t('studio.exp.glslEdited')}</span>
                </p>
              ) : (
                <p>{t('studio.exp.milkHelp')}</p>
              )}
              <button type="button" class="btn btn-primary st-exp-milk" onClick={() => void doExport('milk')}>
                <Icon name="download" small />
                {expLosesShaders ? t('studio.exp.milkNoShaders') : t('studio.exp.milk')}
              </button>
              <button type="button" class="btn st-exp-json" onClick={() => void doExport('json')}>
                {t('studio.exp.json')}
              </button>
              <p>{t('studio.exp.jsonHelp')}</p>
            </div>
          )}
          {askAuthor && (
            <div class="st-ask" role="dialog" aria-label={t('studio.ask.title')}>
              <label for="studio-ask-in">{t('studio.ask.title')}</label>
              <input
                id="studio-ask-in"
                type="text"
                maxLength={60}
                placeholder={t('credit.mine.defaultAuthor')}
                autoFocus
                value={authorDraft}
                onInput={(e) => setAuthorDraft((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmAuthor()
                  }
                }}
              />
              <p>{t('studio.ask.help', { name: authorDraft.trim() || t('credit.mine.defaultAuthor') })}</p>
              <div class="st-ask-a">
                <button type="button" class="btn btn-ghost" onClick={() => setAskAuthor(false)}>
                  {t('studio.ask.cancel')}
                </button>
                <button type="button" class="btn btn-primary" onClick={confirmAuthor}>
                  {t('studio.ask.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div class="st-main">
        <section class="st-prev" aria-label={t('studio.preview')}>
          <div class={cmp ? 'st-stage cmp' : 'st-stage'} ref={stage}>
            <div class="st-pane orig" ref={origPane}>
              {cmp && <span class="chip tl">{cmp.version ? t('studio.cmp.version', { time: verTime(cmp.version.savedAt) }) : t('studio.cmp.original')}</span>}
            </div>
            <div class="st-pane rmx" ref={rmxPane}>
              <span class="chip tl">{unsaved || !saved ? t(api.fresh || saved?.meta.basedOn === null ? 'studio.chip.new' : 'studio.chip.remix') : t('studio.chip.saved')}</span>
            </div>
            {stale && (
              <span class="chip tr warn">
                <Icon name="triangle-alert" small />
                {t('studio.stale')}
              </span>
            )}
            <div class="st-card" ref={card} aria-live="polite">
              <h2>{title.trim() || t('studio.defaultTitle')}</h2>
              <p>{credit}</p>
              <div class="sweep">
                <i ref={cardSweep} />
              </div>
            </div>
          </div>
          <div class="st-pbar">
            <label class="switch" for="studio-cmp">
              <input type="checkbox" id="studio-cmp" checked={!!cmp} onChange={(e) => toggleCompare(e.target as HTMLInputElement)} />
              <span class="track" />
              <span>{t('studio.cmp.switch')}</span>
            </label>
            <span class="sp" />
            <button type="button" class="btn st-swap" onClick={testSwap}>
              <Icon name="skip-forward" />
              {t('studio.swap')}
            </button>
            <button type="button" class="btn st-cap" disabled={capturing} onClick={() => void captureFrame()}>
              <Icon name="camera" />
              {t('studio.capture')}
            </button>
          </div>
          <Levels api={api} />
        </section>

        <section class="st-ed" aria-label={t('studio.editor')}>
          <div class="st-tabs" role="tablist" aria-label={t('studio.sections')}>
            {TABS.map((x, i) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                class="tab"
                id={`studio-tab-${x.id}`}
                aria-controls={`studio-tp-${x.id}`}
                aria-selected={tab === x.id}
                tabIndex={tab === x.id ? 0 : -1}
                title={`${t(x.label)} (Ctrl+${i + 1})`}
                onClick={() => setTab(x.id)}
                onKeyDown={(e) => {
                  const n = TABS.length
                  const j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i + n - 1) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
                  if (j < 0) return
                  e.preventDefault()
                  setTab(TABS[j]!.id, true)
                }}
              >
                {t(x.label)}
              </button>
            ))}
          </div>
          <div class="st-blocks st-basic" role="tabpanel" id="studio-tp-basic" aria-labelledby="studio-tab-basic" hidden={tab !== 'basic'}>
            {BASIC_GROUPS.map((g) => (
              <section class="grp" key={g.title}>
                <h3>{t(g.title)}</h3>
                <div class="grp-b">
                  {g.params.map((p) => (
                    <Fragment key={p.key}>
                      <BasicControl p={p} original={baseValue(api.source.baseVals, p)} value={valueOf(p)} onChange={(v) => tweak(p, v)} />
                      {/* A amostra da cor fica entre a opacidade e os canais, como no protótipo. */}
                      {p.key === 'wave_a' && <WaveSwatch rgb={['wave_r', 'wave_g', 'wave_b'].map((k) => valueOf(BASIC_PARAMS.find((x) => x.key === k)!))} />}
                    </Fragment>
                  ))}
                </div>
              </section>
            ))}
            <p class="note">{t('studio.basic.note')}</p>
          </div>
          <div class="st-blocks" role="tabpanel" id="studio-tp-eq" aria-labelledby="studio-tab-eq" hidden={tab !== 'eq'}>
            {BLOCKS.map((b) => (
              <Editor
                key={b.id}
                title={b.title}
                legend={t(b.legend)}
                h={b.h}
                value={code[b.id]}
                errLines={errors.filter((e) => e.block === b.id && e.line).map((e) => e.line!)}
                warnLines={warnings.filter((w) => w.block === b.id).map((w) => w.line)}
                bind={(el) => {
                  editors.current[b.id] = el
                }}
                onInput={(v) => edit(b.id, v)}
              />
            ))}
            <p class="note">
              {t('studio.vars')} <span class="num">bass mid treb bass_att mid_att treb_att time frame fps</span>
            </p>
          </div>
          <div class="st-blocks" role="tabpanel" id="studio-tp-shaders" aria-labelledby="studio-tab-shaders" hidden={tab !== 'shaders'}>
            {SHADERS.map((x) => (
              <Editor
                key={x.id}
                title={x.id}
                legend={t(x.legend)}
                h={210}
                label={t('studio.shader.label', { which: x.id })}
                value={code[x.id]}
                errLines={errors.filter((e) => e.block === x.id && e.line).map((e) => e.line!)}
                warnLines={warnings.filter((w) => w.block === x.id).map((w) => w.line)}
                bind={(el) => {
                  editors.current[x.id] = el
                }}
                onInput={(v) => edit(x.id, v)}
              />
            ))}
            <p class="note">{t('studio.shaders.note')}</p>
          </div>
          <div class="st-blocks st-code" role="tabpanel" id="studio-tp-code" aria-labelledby="studio-tab-code" hidden={tab !== 'code'}>
            {hlsl.current ? (
              <>
                <p class="note">{t('studio.code.note')}</p>
                {shadersEdited && (
                  <p class="note st-code-warn">
                    <Icon name="triangle-alert" small />
                    {t('studio.code.shadersEdited')}
                  </p>
                )}
                <Editor
                  title=".milk"
                  legend={t('studio.code.legend')}
                  h={460}
                  label={t('studio.code.label')}
                  value={codeText}
                  errLines={[]}
                  bind={(el) => {
                    milkTa.current = el
                  }}
                  onInput={editMilk}
                />
              </>
            ) : (
              <>
                <p class="note">{t('studio.code.jsonNote')}</p>
                <Editor
                  title="JSON"
                  legend="Butterchurn 3"
                  legendNum
                  h={460}
                  label={t('studio.code.jsonLabel')}
                  readOnly
                  value={codeText}
                  errLines={[]}
                  bind={(el) => {
                    milkTa.current = el
                  }}
                  onInput={() => {}}
                />
              </>
            )}
          </div>
          {(['wave', 'shape'] as SlotKind[]).map((kind) => {
            const id = kind === 'wave' ? 'waves' : 'shapes'
            return (
              <div class="st-blocks st-slots" role="tabpanel" id={`studio-tp-${id}`} aria-labelledby={`studio-tab-${id}`} hidden={tab !== id} key={kind}>
                <SlotList
                  kind={kind}
                  slots={kind === 'wave' ? slots.waves : slots.shapes}
                  original={kind === 'wave' ? origSlots.waves : origSlots.shapes}
                  open={openSlot[kind]}
                  errors={errors}
                  warnings={warnings}
                  onOpen={(i) => setOpenSlot((o) => ({ ...o, [kind]: o[kind] === i ? -1 : i }))}
                  onToggle={(i, on) =>
                    updateSlot(
                      kind,
                      i,
                      (x) => {
                        x.baseVals.enabled = on ? 1 : 0
                      },
                      `enabled:${performance.now()}`
                    )
                  }
                  onParam={(i, p, v) => setSlotParam(kind, i, p, v)}
                  onCode={setSlotCode}
                  bind={(b, el) => {
                    editors.current[b] = el
                  }}
                />
                <p class="note">
                  {t(kind === 'wave' ? 'studio.waves.vars' : 'studio.shapes.vars')}{' '}
                  <span class="num">{kind === 'wave' ? 'sample value1 value2 x y r g b a' : 'x y rad ang sides r g b a bass mid treb'}</span>
                </p>
              </div>
            )
          })}
          <div class="probs">
            <button type="button" class="probs-h" aria-expanded={probsOpen} onClick={() => setProbsOpen(!probsOpen)}>
              <span class="chev">
                <Icon name="chevron-right" small />
              </span>
              {t('studio.problems')} <span class={nErr ? 'cnt bad' : warnings.length ? 'cnt warn' : 'cnt'}>{nProbs}</span>
            </button>
            {probsOpen && (
              <div class="probs-b">
                {nProbs === 0 ? (
                  <p class="pempty">{t('studio.noProblems')}</p>
                ) : (
                  <ul>
                    {milkErr && (
                      <li class="perr" key="milk">
                        <Icon name="triangle-alert" small />
                        <p class="selectable">
                          <code>.milk</code>: {t('studio.code.err', { error: msgText(milkErr) })}
                        </p>
                        <button type="button" class="btn" onClick={goMilk}>
                          {t('studio.goBlock')}
                        </button>
                      </li>
                    )}
                    {errors.map((e) => {
                      const fix = fixOfError(e)
                      return (
                        <li class="perr" key={errKey(e)}>
                          <Icon name="triangle-alert" small />
                          <p class="selectable">
                            <code>{whereText(e)}</code>: {issueText(e.issue)}
                            {fix && <> {t('studio.warn.didYouMean', { name: fix.to })}</>}
                          </p>
                          {fix && (
                            <button type="button" class="btn st-fix" title={t('studio.fixTitle', fix)} onClick={() => applyWordFix(e.block, e.line!, fix)}>
                              {t('studio.fix')}
                            </button>
                          )}
                          <button type="button" class="btn btn-ghost" onClick={() => goTo(e.block, e.line)}>
                            {e.line ? t('studio.goLine') : t('studio.goBlock')}
                          </button>
                        </li>
                      )
                    })}
                    {warnings.map((w) => (
                      <li class="perr pwarn" key={warnKey(w)}>
                        <Icon name="triangle-alert" small />
                        <p class="selectable">
                          <span class="pwarn-tag">{t('studio.warn.label')}</span> <code>{t('studio.atLine', { block: blockTitle(w.block), line: String(w.line) })}</code>: {warnText(w.issue)}
                        </p>
                        {w.fix && (
                          <button type="button" class="btn st-fix" title={t('studio.fixTitle', w.fix)} onClick={() => applyWordFix(w.block, w.line, w.fix!)}>
                            {t('studio.fix')}
                          </button>
                        )}
                        <button type="button" class="btn btn-ghost" onClick={() => goTo(w.block, w.line)}>
                          {t('studio.goLine')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <aside class={drawer ? 'st-drawer open' : 'st-drawer'} id="studio-versions" aria-label={t('studio.ver.drawer')}>
        <div class="st-drawer-h">
          <h2>{t('studio.ver.title')}</h2>
          <button type="button" class="ibtn" ref={drClose} aria-label={t('studio.ver.close')} title={t('studio.ver.close')} onClick={() => openDrawer(false)}>
            <Icon name="x" />
          </button>
        </div>
        {drawer &&
          (versions === 'loading' ? null : versions === 'error' ? (
            <p class="st-ver-empty">{t('studio.ver.loadFailed')}</p>
          ) : versions.length === 0 ? (
            <p class="st-ver-empty">{t('studio.ver.unsaved')}</p>
          ) : (
            <ol class="st-vlist">
              {versions.map((v, i) => (
                <li class={i === 0 ? 'ver cur' : 'ver'} key={v.n}>
                  <div class="ver-h">
                    <span class="num">{verTime(v.savedAt)}</span>
                    <Icon name="user" small />
                    {t('studio.ver.you')}
                  </div>
                  <p>{verSummary(v, basedOn)}</p>
                  <div class="ver-a">
                    <button type="button" class="btn" onClick={() => void restore(v)}>
                      {t('studio.ver.restore')}
                    </button>
                    <button type="button" class="btn btn-ghost" onClick={() => void compareVersion(v)}>
                      {t('studio.ver.compare')}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ))}
        <p class="note st-ver-keys">{t('studio.ver.keys')}</p>
      </aside>

      <footer class="st-foot">
        <span>
          {compiledAt
            ? nErr
              ? tn('studio.foot.errorsSince', nErr, { time: clock(compiledAt) })
              : t('studio.foot.compiledAt', { time: clock(compiledAt) })
            : t('studio.foot.compiledAt', { time: '--:--:--' })}
        </span>
        <span>{t('studio.foot.keys')}</span>
      </footer>
    </div>
  )
}

/** Uma linha do Básico: slider, switch ou a lista de formas da onda; o nome do parâmetro em `.num`. */
function BasicControl({ p, original, value, onChange, id = `studio-p-${p.key}`, disabled = false }: { p: BasicParam; original: number; value: number; onChange(v: number): void; id?: string; disabled?: boolean }) {
  if (p.kind === 'switch') {
    return (
      <div class="ctl sw">
        <label class="switch" for={id}>
          <input type="checkbox" id={id} checked={value >= 0.5} disabled={disabled} onChange={(e) => onChange((e.target as HTMLInputElement).checked ? 1 : 0)} />
          <span class="track" />
          <span>{t(p.label)}</span>
        </label>
        <span class="num pn">{p.key}</span>
      </div>
    )
  }
  if (p.kind === 'select') {
    const cur = Math.round(value)
    return (
      <div class="ctl">
        <div class="ctl-h">
          <label for={id}>{t(p.label)}</label>
          <span class="num pn">{p.key}</span>
          <output class="num val" for={id}>
            {cur}
          </output>
        </div>
        <select class="sel" id={id} value={String(cur)} disabled={disabled} onChange={(e) => onChange(Number((e.target as HTMLSelectElement).value))}>
          {WAVE_MODES.map((k, i) => (
            <option key={k} value={String(i)}>
              {`${i} · ${t(k)}`}
            </option>
          ))}
        </select>
      </div>
    )
  }
  const r = rangeFor(p, original)
  const fill = ((Math.min(r.max, Math.max(r.min, value)) - r.min) / (r.max - r.min)) * 100
  return (
    <div class="ctl">
      <div class="ctl-h">
        <label for={id}>{t(p.label)}</label>
        <span class="num pn">{p.key}</span>
        <output class="num val" for={id}>
          {value.toFixed(p.dec)}
        </output>
      </div>
      <input id={id} type="range" min={r.min} max={r.max} step={p.step} value={value} disabled={disabled} style={{ '--fill': `${fill}%` }} onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))} />
    </div>
  )
}

/** Amostra da cor da onda principal (wave_r/g/b). */
function WaveSwatch({ rgb }: { rgb: number[] }) {
  const c = rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(',')
  return (
    <div class="ctl">
      <div class="ctl-h">
        <span>{t('studio.basic.waveColor')}</span>
      </div>
      <div class="swatch" style={{ background: `rgb(${c})` }} aria-hidden="true" />
    </div>
  )
}

function Editor(props: { title: string; legend: string; legendNum?: boolean; h: number; value: string; errLines: number[]; warnLines?: number[]; label?: string; readOnly?: boolean; bind(el: HTMLTextAreaElement | null): void; onInput(v: string): void }) {
  const { value, errLines } = props
  const gut = useRef<HTMLDivElement>(null)
  const lines = Math.max(1, value.split('\n').length)
  const errs = new Set(errLines)
  const warns = new Set(props.warnLines ?? [])
  return (
    <div class="ed-block">
      <div class="ed-label">
        <h3 class="num">{props.title}</h3>
        <span class={props.legendNum ? 'num' : undefined}>{props.legend}</span>
      </div>
      <div class={props.readOnly ? 'ed ro' : 'ed'} style={{ '--h': `${props.h}px` }}>
        <div class="ed-gut" ref={gut} aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} class={errs.has(i + 1) ? 'err' : warns.has(i + 1) ? 'warn' : undefined}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          class="ed-ta"
          ref={props.bind}
          aria-label={props.label ?? `${props.title}: ${props.legend}`}
          spellcheck={false}
          autocomplete="off"
          wrap="off"
          readOnly={props.readOnly}
          value={value}
          onInput={(e) => props.onInput((e.target as HTMLTextAreaElement).value)}
          onScroll={(e) => {
            if (gut.current) gut.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop
          }}
          onKeyDown={(e) => {
            // Tab = 2 espaços (Shift+Tab continua saindo do campo).
            if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.altKey || props.readOnly) return
            e.preventDefault()
            const ta = e.target as HTMLTextAreaElement
            const { selectionStart: a, selectionEnd: b } = ta
            ta.setRangeText('  ', a, b, 'end')
            props.onInput(ta.value)
          }}
        />
      </div>
    </div>
  )
}

type AnySlot = Slots['waves'][number] | Slots['shapes'][number]

/**
 * Ondas ou Formas (spec 027, fatia 2): 4 slots em sanfona (um aberto por vez), cada um com
 * "Ativa", os parâmetros do protótipo e os blocos `per_frame` (e `per_point`, nas ondas).
 * Slot desligado fica só leitura: controles desabilitados e editores sem edição.
 */
function SlotList(props: {
  kind: SlotKind
  slots: AnySlot[]
  original: AnySlot[]
  open: number
  errors: StudioError[]
  warnings: StudioWarning[]
  onOpen(i: number): void
  onToggle(i: number, on: boolean): void
  onParam(i: number, p: BasicParam, v: number): void
  onCode(b: SlotBlock, v: string): void
  bind(b: SlotBlock, el: HTMLTextAreaElement | null): void
}) {
  const { kind } = props
  const params = kind === 'wave' ? WAVE_PARAMS : SHAPE_PARAMS
  return (
    <div class="slots">
      {SLOT_INDEXES.map((i) => {
        const s = props.slots[i]!
        const on = slotOn(kind, s.baseVals)
        const name = t(kind === 'wave' ? 'studio.slot.wave' : 'studio.slot.shape', { n: String(i + 1) })
        const open = props.open === i
        const bid = `studio-slot-${kind}${i}`
        // Como no protótipo: o bloco e, ao lado, o nome dele no `.milk` (wave_0_per_frame).
        const blocks: { b: SlotBlock; title: string; value: string }[] = [{ b: `${kind}${i}_frame` as SlotBlock, title: 'per_frame', value: s.frame_eqs_eel }]
        if (kind === 'wave') blocks.push({ b: `wave${i}_point`, title: 'per_point', value: (s as Slots['waves'][number]).point_eqs_eel })
        return (
          <div class={on ? 'slot' : 'slot off'} key={i}>
            <div class="slot-h">
              <button type="button" class="slot-t" aria-expanded={open} aria-controls={bid} onClick={() => props.onOpen(i)}>
                <Icon name="chevron-right" small />
                {name}
              </button>
              <label class="switch">
                <input type="checkbox" checked={on} aria-label={t('studio.slot.activeOf', { slot: name })} onChange={(e) => props.onToggle(i, (e.target as HTMLInputElement).checked)} />
                <span class="track" />
                <span aria-hidden="true">{t('studio.slot.active')}</span>
              </label>
            </div>
            <div class="slot-b" id={bid} hidden={!open}>
              <div class="grp-b">
                {params.map((p) => (
                  <BasicControl
                    key={p.key}
                    p={p}
                    id={`studio-s-${kind}${i}-${p.key}`}
                    original={slotValue(kind, props.original[i]!.baseVals, p.key)}
                    value={slotValue(kind, s.baseVals, p.key)}
                    disabled={!on}
                    onChange={(v) => props.onParam(i, p, v)}
                  />
                ))}
              </div>
              {blocks.map((x) => (
                <Editor
                  key={x.b}
                  title={x.title}
                  legend={blockTitle(x.b)}
                  legendNum
                  h={120}
                  label={`${x.title}, ${name}`}
                  readOnly={!on}
                  value={x.value}
                  errLines={props.errors.filter((e) => e.block === x.b && e.line).map((e) => e.line!)}
                  warnLines={props.warnings.filter((w) => w.block === x.b).map((w) => w.line)}
                  bind={(el) => props.bind(x.b, el)}
                  onInput={(v) => props.onCode(x.b, v)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Medidores bass/mid/treb (Áudio agora), fora do re-render. */
function Levels({ api }: { api: StudioApi }) {
  const bars = useRef<(HTMLElement | null)[]>([])
  const vals = useRef<(HTMLElement | null)[]>([])
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick)
      if (now - last < 33) return
      last = now
      const l = api.levels()
      if (!l) return
      for (let i = 0; i < 3; i++) {
        const v = l[i]!
        const bar = bars.current[i]
        if (bar) bar.style.transform = `scaleX(${Math.min(1, v / 3)})`
        const t = vals.current[i]
        if (t) t.textContent = v.toFixed(2)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [api])
  return (
    <section class="panel st-audio" aria-labelledby="studio-aud-h">
      <div class="panel-h">
        <h2 id="studio-aud-h">{t('studio.audio.title')}</h2>
        <p class="note">{t('studio.audio.note')}</p>
      </div>
      {['bass', 'mid', 'treb'].map((n, i) => (
        <div class="mrow" key={n}>
          <span class="num nm">{n}</span>
          <div class="lvl" role="img" aria-label={t('studio.audio.level', { name: n })}>
            <i
              ref={(el) => {
                bars.current[i] = el
              }}
            />
          </div>
          <span
            class="num vv"
            ref={(el) => {
              vals.current[i] = el
            }}
          >
            0.00
          </span>
        </div>
      ))}
    </section>
  )
}

let host: HTMLElement | null = null

/** Monta o Estúdio (uma instância por vez). */
export function openStudio(api: StudioApi): void {
  if (!host) {
    host = document.createElement('div')
    host.id = 'studio'
    ;(document.getElementById('ui') ?? document.body).appendChild(host)
  }
  render(null, host)
  render(<Studio api={api} />, host)
}

export function closeStudio(): void {
  if (host) render(null, host)
}
