import { Fragment, render } from 'preact'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Preset } from 'butterchurn'
import type { Core } from '../core/commands'
import { EQ_KEYS, type Block, type CompileResult, type MainBlock, type SlotBlock, type StudioError, type StudioIssue } from '../studio/compile'
import { SHAPE_PARAMS, SLOT_INDEXES, WAVE_PARAMS, slotBlockTitle, slotOfBlock, slotOn, slotValue, slotsOf, writeSlots, type SlotKind, type Slots } from '../studio/slots'
import { BASIC_GROUPS, BASIC_PARAMS, WAVE_MODES, baseValue, clampParam, rangeFor, type BasicParam } from '../studio/basic'
import { Icon } from './icons'
import { mineCredit } from './preset-name'
import { showToast } from './toast'
import { getLang, msgText, onLanguage, t, tn, type Lang, type MessageKey } from '../i18n'
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
  /** Preset de origem (do pacote, importado ou meu). */
  sourceName: string
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
  save(req: { preset: Preset; title: string; author: string }): Promise<{ name: string; id: string; meta: SoMineMeta }>
  /** Sai do Estúdio. `saved` = nome do último salvamento (vira o preset atual). */
  close(saved: string | null): void
  log(message: string): void
  /** Custo da última compilação, para o HUD. */
  reportCost(text: string): void
}

const DEBOUNCE_MS = 400
const ESC_WINDOW_MS = 3000
const BLOCKS: { id: MainBlock; title: string; legend: MessageKey; h: number }[] = [
  { id: 'init', title: 'per_frame_init', legend: 'studio.block.init', h: 120 },
  { id: 'frame', title: 'per_frame', legend: 'studio.block.frame', h: 180 },
  { id: 'pixel', title: 'per_pixel', legend: 'studio.block.pixel', h: 150 }
]
const MAIN_TITLE: Record<MainBlock, string> = { init: 'per_frame_init', frame: 'per_frame', pixel: 'per_pixel' }
const isMain = (b: Block): b is MainBlock => b in MAIN_TITLE
/** Nome do bloco como no `.milk`: `per_frame`, `wave_1_per_point`… (técnico, igual nos dois idiomas). */
const blockTitle = (b: Block): string => (isMain(b) ? MAIN_TITLE[b] : slotBlockTitle(b))

type Status = 'ok' | 'busy' | 'err'
type Code = Record<MainBlock, string>
/** Parâmetros base mudados no Básico (só as chaves mexidas). */
type Base = Record<string, number>

/** Abas na ordem do protótipo; Shaders e Código .milk chegam nas próximas fatias da 027. */
const TABS = [
  { id: 'basic', label: 'studio.tab.basic' },
  { id: 'eq', label: 'studio.tab.eq' },
  { id: 'waves', label: 'studio.tab.waves' },
  { id: 'shapes', label: 'studio.tab.shapes' }
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
    case 'raw':
      return i.text
  }
}
/** Onde: `per_frame, linha 2` / `per_frame, line 2`, ou só o bloco. */
const whereText = (e: StudioError): string => (e.line ? t('studio.atLine', { block: blockTitle(e.block), line: String(e.line) }) : blockTitle(e.block))

/** Do texto do bloco (o motor guarda com `\n`; o editor também). */
const codeOf = (p: Preset): Code => ({
  init: String(p[EQ_KEYS.init] ?? ''),
  frame: String(p[EQ_KEYS.frame] ?? ''),
  pixel: String(p[EQ_KEYS.pixel] ?? '')
})

function withCode(source: Preset, code: Code, base: Base = {}, slots?: Slots): Preset {
  const p = structuredClone(source)
  for (const b of ['init', 'frame', 'pixel'] as MainBlock[]) p[EQ_KEYS[b]] = code[b]
  if (slots) writeSlots(p, slots)
  if (Object.keys(base).length) p.baseVals = { ...(p.baseVals && typeof p.baseVals === 'object' ? (p.baseVals as Record<string, number>) : {}), ...base }
  return p
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
  const [compiledAt, setCompiledAt] = useState<Date | null>(null)
  /** Já houve uma versão válida (o selo "última versão válida" só faz sentido depois dela). */
  const [hadValid, setHadValid] = useState(false)
  const [probsOpen, setProbsOpen] = useState(true)
  const [saved, setSaved] = useState<{ name: string; id: string; meta: SoMineMeta } | null>(api.mine ? { name: api.sourceName, ...api.mine } : null)
  const [title, setTitle] = useState(() => (api.mine ? api.sourceName : t('studio.remixOf', { name: originalCredit(api.sourceName).name.split(' - ').slice(1).join(' - ') || api.sourceName })))
  const [dirty, setDirty] = useState(false)
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
  const root = useRef<HTMLDivElement>(null)
  // A troca de idioma redesenha o Estúdio (ele tem a própria raiz, fora do Overlay).
  const [, setLangTick] = useState(0)
  useEffect(() => onLanguage(() => setLangTick((n) => n + 1)), [])

  const basedOn = api.mine ? api.mine.meta.basedOn : originalCredit(api.sourceName)
  const author = settings.authorName || t('credit.mine.defaultAuthor')
  const credit = t('credit.by', { author: mineCredit({ author: saved?.meta.author ?? author, basedOn }) })

  // ── Compilar ────────────────────────────────────────────
  const compile = async (c: Code, load = true): Promise<boolean> => {
    window.clearTimeout(timer.current)
    const key = keyOf(c)
    setStatus('busy')
    const r = await api.compile(withCode(api.source, c, latestBase.current, latestSlots.current))
    if ('superseded' in r) return false
    lastCompiled.current = key
    setCompiledAt(new Date())
    if (r.ok) {
      // Parâmetros base mexidos durante a compilação também vão (são sempre válidos).
      if (load) api.apply(withCode(api.source, c, latestBase.current, latestSlots.current))
      setStatus('ok')
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

  // A cópia aberta já está no visual; a primeira compilação só confere e mostra o status.
  useEffect(() => {
    void compile(initial, false)
  }, [])

  const edit = (b: Block, v: string): void => {
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
    latestSlots.current = next
    setSlots(next)
    setDirty(true)
    setEscWarn(false)
    setStatus('busy')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void compile(latest.current), DEBOUNCE_MS)
  }
  const listOf = (s: Slots, kind: SlotKind): Slots['waves'] | Slots['shapes'] => (kind === 'wave' ? s.waves : s.shapes)
  const updateSlot = (kind: SlotKind, i: number, f: (x: Slots['waves'][number] & Slots['shapes'][number]) => void): void => {
    const next = structuredClone(latestSlots.current)
    f(listOf(next, kind)[i] as Slots['waves'][number] & Slots['shapes'][number])
    changeSlots(next)
  }
  const setSlotParam = (kind: SlotKind, i: number, p: BasicParam, raw: number): void => {
    const orig = slotValue(kind, listOf(origSlots, kind)[i]!.baseVals, p.key)
    const v = clampParam(p, raw, rangeFor(p, orig))
    updateSlot(kind, i, (x) => {
      x.baseVals[p.key] = v
    })
  }
  const setSlotCode = (b: SlotBlock, v: string): void => {
    const { kind, idx, field } = slotOfBlock(b)
    updateSlot(kind, idx, (x) => {
      if (field === 'point') x.point_eqs_eel = v
      else x.frame_eqs_eel = v
    })
  }

  const valueOf = (p: BasicParam): number => (p.key in base ? base[p.key]! : baseValue(api.source.baseVals, p))
  /** Básico: vale na hora (no motor) e entra no próximo salvamento. Valor sempre válido. */
  const tweak = (p: BasicParam, raw: number): void => {
    const range = rangeFor(p, baseValue(api.source.baseVals, p))
    const v = clampParam(p, raw, range)
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

  // ── Salvar ──────────────────────────────────────────────
  const save = async (authorName?: string): Promise<void> => {
    if (settings.authorName === null && authorName === undefined && !saved) {
      setAuthorDraft('')
      setAskAuthor(true)
      return
    }
    // Garante que o que vai para o disco é exatamente o que compilou.
    const c = latest.current
    if (status !== 'ok' || lastCompiled.current !== keyOf(c)) {
      const ok = await compile(c)
      if (!ok) {
        showToast(t('toast.studio.fixErrors'), { force: true })
        return
      }
    }
    try {
      const name = (saved?.name ?? title.trim()) || t('studio.defaultTitle')
      const r = await api.save({ preset: withCode(api.source, c, latestBase.current, latestSlots.current), title: name, author: authorName ?? author })
      setSaved(r)
      setTitle(r.name)
      setDirty(false)
      setEscWarn(false)
      showToast(saved ? t('toast.studio.saved') : t('toast.studio.savedNew', { name: r.name }), { force: true })
    } catch (err) {
      // O main lança em inglês com código: a tela traduz, o log fica em inglês (spec 030, P1).
      api.log(`studio: save failed: ${mainErrorText(err)}`)
      showToast(t('toast.studio.notSaved', { error: msgText(mainError(err)) }), { force: true })
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
    if (dirty && !(escWarn && now - escAt.current < ESC_WINDOW_MS)) {
      escAt.current = now
      setEscWarn(true)
      showToast(t('toast.studio.unsaved'), { force: true })
      return
    }
    api.close(saved?.name ?? null)
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
    // Esc num campo só sai do campo; fora dele, volta ao Palco.
    if (inField) tgt!.blur()
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
    const want: TabId = isMain(b) ? 'eq' : slotOfBlock(b).kind === 'wave' ? 'waves' : 'shapes'
    if (!isMain(b)) {
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
  const shaders = [
    ['warp', String(api.source.warp ?? '')],
    ['comp', String(api.source.comp ?? '')]
  ].filter(([, v]) => v.trim())

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
            readOnly={!!saved}
            title={saved ? t('studio.renameSoon') : undefined}
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
                {tn('studio.errors', errors.length)}
              </>
            ) : (
              <>
                <Icon name="clock" small />
                {t('studio.status.busy')}
              </>
            )}
          </div>
          <button type="button" class="btn btn-primary st-save" title={t('studio.saveTitle')} onClick={() => void save()}>
            {t('studio.save')} <span class="save-k">Ctrl+S</span>
          </button>
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
          <div class="st-stage">
            <span class="chip tl">{dirty || !saved ? t('studio.chip.remix') : t('studio.chip.saved')}</span>
            {stale && (
              <span class="chip tr warn">
                <Icon name="triangle-alert" small />
                {t('studio.stale')}
              </span>
            )}
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
                bind={(el) => {
                  editors.current[b.id] = el
                }}
                onInput={(v) => edit(b.id, v)}
              />
            ))}
            <p class="note">
              {t('studio.vars')} <span class="num">bass mid treb bass_att mid_att treb_att time frame fps</span>
            </p>
            {shaders.length > 0 && (
              <details class="st-shaders">
                <summary>{t('studio.shaders')}</summary>
                {shaders.map(([k, v]) => (
                  <div key={k}>
                    <h3 class="num">{k}</h3>
                    <pre class="num selectable">{v}</pre>
                  </div>
                ))}
              </details>
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
                  onOpen={(i) => setOpenSlot((o) => ({ ...o, [kind]: o[kind] === i ? -1 : i }))}
                  onToggle={(i, on) =>
                    updateSlot(kind, i, (x) => {
                      x.baseVals.enabled = on ? 1 : 0
                    })
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
              {t('studio.problems')} <span class={errors.length ? 'cnt bad' : 'cnt'}>{errors.length}</span>
            </button>
            {probsOpen && (
              <div class="probs-b">
                {errors.length === 0 ? (
                  <p class="pempty">{t('studio.noProblems')}</p>
                ) : (
                  <ul>
                    {errors.map((e) => (
                      <li class="perr" key={errKey(e)}>
                        <Icon name="triangle-alert" small />
                        <p class="selectable">
                          <code>{whereText(e)}</code>: {issueText(e.issue)}
                        </p>
                        <button type="button" class="btn" onClick={() => goTo(e.block, e.line)}>
                          {e.line ? t('studio.goLine') : t('studio.goBlock')}
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

      <footer class="st-foot">
        <span>
          {compiledAt
            ? errors.length
              ? tn('studio.foot.errorsSince', errors.length, { time: clock(compiledAt) })
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

function Editor(props: { title: string; legend: string; legendNum?: boolean; h: number; value: string; errLines: number[]; label?: string; readOnly?: boolean; bind(el: HTMLTextAreaElement | null): void; onInput(v: string): void }) {
  const { value, errLines } = props
  const gut = useRef<HTMLDivElement>(null)
  const lines = Math.max(1, value.split('\n').length)
  const errs = new Set(errLines)
  return (
    <div class="ed-block">
      <div class="ed-label">
        <h3 class="num">{props.title}</h3>
        <span class={props.legendNum ? 'num' : undefined}>{props.legend}</span>
      </div>
      <div class={props.readOnly ? 'ed ro' : 'ed'} style={{ '--h': `${props.h}px` }}>
        <div class="ed-gut" ref={gut} aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} class={errs.has(i + 1) ? 'err' : undefined}>
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
