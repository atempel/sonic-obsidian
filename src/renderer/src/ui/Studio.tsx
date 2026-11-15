import { render } from 'preact'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Preset } from 'butterchurn'
import type { Core } from '../core/commands'
import { EQ_KEYS, type Block, type CompileResult, type StudioError, type StudioIssue } from '../studio/compile'
import { Icon } from './icons'
import { mineCredit } from './preset-name'
import { showToast } from './toast'
import { getLang, msgText, onLanguage, t, tn, type Lang, type MessageKey } from '../i18n'
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
const BLOCKS: { id: Block; title: string; legend: MessageKey; h: number }[] = [
  { id: 'init', title: 'per_frame_init', legend: 'studio.block.init', h: 120 },
  { id: 'frame', title: 'per_frame', legend: 'studio.block.frame', h: 180 },
  { id: 'pixel', title: 'per_pixel', legend: 'studio.block.pixel', h: 150 }
]
const BLOCK_TITLE: Record<Block, string> = { init: 'per_frame_init', frame: 'per_frame', pixel: 'per_pixel' }

type Status = 'ok' | 'busy' | 'err'
type Code = Record<Block, string>

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
const whereText = (e: StudioError): string => (e.line ? t('studio.atLine', { block: BLOCK_TITLE[e.block], line: String(e.line) }) : BLOCK_TITLE[e.block])

/** Do texto do bloco (o motor guarda com `\n`; o editor também). */
const codeOf = (p: Preset): Code => ({
  init: String(p[EQ_KEYS.init] ?? ''),
  frame: String(p[EQ_KEYS.frame] ?? ''),
  pixel: String(p[EQ_KEYS.pixel] ?? '')
})

function withCode(base: Preset, code: Code): Preset {
  const p = structuredClone(base)
  for (const b of ['init', 'frame', 'pixel'] as Block[]) p[EQ_KEYS[b]] = code[b]
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
    const key = JSON.stringify(c)
    setStatus('busy')
    const preset = withCode(api.source, c)
    const r = await api.compile(preset)
    if ('superseded' in r) return false
    lastCompiled.current = key
    setCompiledAt(new Date())
    if (r.ok) {
      if (load) api.apply(preset)
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
    for (const e of r.errors) if (!lastErrs.current.has(errKey(e))) api.log(`studio: error in ${BLOCK_TITLE[e.block]}${e.line ? `, line ${e.line}` : ''}: ${issueText(e.issue, 'en')}`)
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

  // ── Salvar ──────────────────────────────────────────────
  const save = async (authorName?: string): Promise<void> => {
    if (settings.authorName === null && authorName === undefined && !saved) {
      setAuthorDraft('')
      setAskAuthor(true)
      return
    }
    // Garante que o que vai para o disco é exatamente o que compilou.
    const c = latest.current
    if (status !== 'ok' || lastCompiled.current !== JSON.stringify(c)) {
      const ok = await compile(c)
      if (!ok) {
        showToast(t('toast.studio.fixErrors'), { force: true })
        return
      }
    }
    try {
      const name = (saved?.name ?? title.trim()) || t('studio.defaultTitle')
      const r = await api.save({ preset: withCode(api.source, c), title: name, author: authorName ?? author })
      setSaved(r)
      setTitle(r.name)
      setDirty(false)
      setEscWarn(false)
      showToast(saved ? t('toast.studio.saved') : t('toast.studio.savedNew', { name: r.name }), { force: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^.*Error: /, '') : String(err)
      api.log(`studio: save failed: ${msg}`)
      showToast(t('toast.studio.notSaved', { error: msg }), { force: true })
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

  const goTo = (b: Block, line: number | null): void => {
    const ta = editors.current[b]
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
            <button type="button" role="tab" class="tab" aria-selected="true">
              {t('studio.tab.code')}
            </button>
          </div>
          <div class="st-blocks">
            {BLOCKS.map((b) => (
              <Editor
                key={b.id}
                block={b}
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

function Editor(props: { block: (typeof BLOCKS)[number]; value: string; errLines: number[]; bind(el: HTMLTextAreaElement | null): void; onInput(v: string): void }) {
  const { block, value, errLines } = props
  const gut = useRef<HTMLDivElement>(null)
  const lines = Math.max(1, value.split('\n').length)
  const errs = new Set(errLines)
  return (
    <div class="ed-block">
      <div class="ed-label">
        <h3 class="num">{block.title}</h3>
        <span>{t(block.legend)}</span>
      </div>
      <div class="ed" style={{ '--h': `${block.h}px` }}>
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
          aria-label={`${block.title}: ${t(block.legend)}`}
          spellcheck={false}
          autocomplete="off"
          wrap="off"
          value={value}
          onInput={(e) => props.onInput((e.target as HTMLTextAreaElement).value)}
          onScroll={(e) => {
            if (gut.current) gut.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop
          }}
          onKeyDown={(e) => {
            // Tab = 2 espaços (Shift+Tab continua saindo do campo).
            if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.altKey) return
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
