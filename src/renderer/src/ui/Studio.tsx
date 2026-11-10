import { render } from 'preact'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Preset } from 'butterchurn'
import type { Core } from '../core/commands'
import { EQ_KEYS, type Block, type CompileResult, type StudioError } from '../studio/compile'
import { Icon } from './icons'
import { mineCredit } from './preset-name'
import { showToast } from './toast'
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
const BLOCKS: { id: Block; title: string; legend: string; h: number }[] = [
  { id: 'init', title: 'per_frame_init', legend: 'Executa uma vez ao carregar o preset', h: 120 },
  { id: 'frame', title: 'per_frame', legend: 'Executa a cada quadro', h: 180 },
  { id: 'pixel', title: 'per_pixel', legend: 'Executa em cada ponto da malha', h: 150 }
]
const BLOCK_TITLE: Record<Block, string> = { init: 'per_frame_init', frame: 'per_frame', pixel: 'per_pixel' }

type Status = 'ok' | 'busy' | 'err'
type Code = Record<Block, string>

const pad = (n: number): string => String(n).padStart(2, '0')
const clock = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
const errKey = (e: StudioError): string => `${e.block}:${e.line ?? '-'}:${e.message}`

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
  const [title, setTitle] = useState(() => (api.mine ? api.sourceName : `Remix de ${originalCredit(api.sourceName).name.split(' - ').slice(1).join(' - ') || api.sourceName}`))
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

  const basedOn = api.mine ? api.mine.meta.basedOn : originalCredit(api.sourceName)
  const author = settings.authorName || 'Eu'
  const credit = `por ${mineCredit({ author: saved?.meta.author ?? author, basedOn })}`

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
      api.reportCost(`estúdio: compilação ${r.ms.toFixed(0)} ms (quadro de teste ${r.frameMs.toFixed(1)} ms)`)
      return true
    }
    setStatus('err')
    setErrors(r.errors)
    api.reportCost(`estúdio: compilação ${r.ms.toFixed(0)} ms · ${plural(r.errors.length, 'erro', 'erros')}`)
    // Log: só erros novos, nunca por tecla.
    const keys = new Set(r.errors.map(errKey))
    for (const e of r.errors) if (!lastErrs.current.has(errKey(e))) api.log(`estúdio: erro em ${BLOCK_TITLE[e.block]}${e.line ? `, linha ${e.line}` : ''}: ${e.message}`)
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
        showToast('Corrija os erros antes de salvar.', { force: true })
        return
      }
    }
    try {
      const name = (saved?.name ?? title.trim()) || 'Meu preset'
      const r = await api.save({ preset: withCode(api.source, c), title: name, author: authorName ?? author })
      setSaved(r)
      setTitle(r.name)
      setDirty(false)
      setEscWarn(false)
      showToast(saved ? 'Preset salvo.' : `"${r.name}" salvo na biblioteca, em Meus.`, { force: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^.*Error: /, '') : String(err)
      api.log(`estúdio: salvar falhou: ${msg}`)
      showToast(`Não salvou: ${msg}`, { force: true })
    }
  }

  const confirmAuthor = (): void => {
    const v = authorDraft.trim()
    core.run('settings.set', { authorName: v }, 'ui')
    setAskAuthor(false)
    void save(v || 'Eu')
  }

  // ── Teclado: Ctrl+S, Ctrl+Enter, Esc ────────────────────
  const exit = (): void => {
    const now = performance.now()
    if (dirty && !(escWarn && now - escAt.current < ESC_WINDOW_MS)) {
      escAt.current = now
      setEscWarn(true)
      showToast('Há mudanças não salvas. Esc de novo sai sem salvar.', { force: true })
      return
    }
    api.close(saved?.name ?? null)
  }
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    const inField = !!t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault()
      e.stopImmediatePropagation()
      void save()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      e.stopImmediatePropagation()
      void compile(latest.current).then((ok) => showToast(ok ? 'Compilado agora.' : 'Compilado com erros.', { force: true }))
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
    if (inField) t!.blur()
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
    <div class="studio" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Estúdio de presets">
      <header class="st-top">
        <button type="button" class="btn btn-ghost st-back" title="Voltar ao Palco (Esc)" onClick={exit}>
          <Icon name="arrow-left" />
          <span class="lbl">Voltar ao Palco</span>
          <kbd class="lbl">Esc</kbd>
        </button>
        <div class="st-ident">
          <label class="sr-only" for="studio-name">
            Nome do preset
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
            title={saved ? 'Renomear chega na próxima versão do Estúdio.' : undefined}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          <div class="st-credit">{credit}</div>
        </div>
        <div class="st-top-r">
          <div class={`cstat ${status}`} role="status" aria-live="polite">
            {status === 'ok' ? (
              <>
                <Icon name="check" small />
                Compilado
              </>
            ) : status === 'err' ? (
              <>
                <Icon name="triangle-alert" small />
                {plural(errors.length, 'erro', 'erros')}
              </>
            ) : (
              <>
                <Icon name="clock" small />
                Compilando…
              </>
            )}
          </div>
          <button type="button" class="btn btn-primary st-save" title="Salvar na biblioteca (Ctrl+S)" onClick={() => void save()}>
            Salvar na biblioteca <span class="save-k">Ctrl+S</span>
          </button>
          {askAuthor && (
            <div class="st-ask" role="dialog" aria-label="Seu nome nos presets">
              <label for="studio-ask-in">Seu nome nos presets</label>
              <input
                id="studio-ask-in"
                type="text"
                maxLength={60}
                placeholder="Eu"
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
              <p>Aparece no crédito: “por {authorDraft.trim() || 'Eu'} · baseado em …”. Muda em Configurações › Geral.</p>
              <div class="st-ask-a">
                <button type="button" class="btn btn-ghost" onClick={() => setAskAuthor(false)}>
                  Cancelar
                </button>
                <button type="button" class="btn btn-primary" onClick={confirmAuthor}>
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div class="st-main">
        <section class="st-prev" aria-label="Prévia">
          <div class="st-stage">
            <span class="chip tl">{dirty || !saved ? 'Seu remix' : 'Salvo'}</span>
            {stale && (
              <span class="chip tr warn">
                <Icon name="triangle-alert" small />
                Mostrando a última versão válida
              </span>
            )}
          </div>
          <Levels api={api} />
        </section>

        <section class="st-ed" aria-label="Editor">
          <div class="st-tabs" role="tablist" aria-label="Seções do preset">
            <button type="button" role="tab" class="tab" aria-selected="true">
              Código
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
              Variáveis disponíveis: <span class="num">bass mid treb bass_att mid_att treb_att time frame fps</span>
            </p>
            {shaders.length > 0 && (
              <details class="st-shaders">
                <summary>Shaders (somente leitura; edição na próxima versão do Estúdio)</summary>
                {shaders.map(([k, v]) => (
                  <div key={k}>
                    <h3 class="num">{k}</h3>
                    <pre class="num">{v}</pre>
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
              Problemas <span class={errors.length ? 'cnt bad' : 'cnt'}>{errors.length}</span>
            </button>
            {probsOpen && (
              <div class="probs-b">
                {errors.length === 0 ? (
                  <p class="pempty">Nenhum problema.</p>
                ) : (
                  <ul>
                    {errors.map((e) => (
                      <li class="perr" key={errKey(e)}>
                        <Icon name="triangle-alert" small />
                        <p>
                          <code>{BLOCK_TITLE[e.block]}</code>
                          {e.line ? `, linha ${e.line}` : ''}: {e.message}
                        </p>
                        <button type="button" class="btn" onClick={() => goTo(e.block, e.line)}>
                          {e.line ? 'Ir para a linha' : 'Ir para o bloco'}
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
          {compiledAt ? (errors.length ? `Com ${plural(errors.length, 'erro', 'erros')} desde ${clock(compiledAt)}` : `Compilado às ${clock(compiledAt)}`) : 'Compilado às --:--:--'}
        </span>
        <span>Tab insere 2 espaços · Esc sai do campo · Ctrl+Enter compila agora</span>
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
        <span>{block.legend}</span>
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
          aria-label={`${block.title}: ${block.legend}`}
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
        <h2 id="studio-aud-h">Áudio agora</h2>
        <p class="note">Use estas variáveis nas equações</p>
      </div>
      {['bass', 'mid', 'treb'].map((n, i) => (
        <div class="mrow" key={n}>
          <span class="num nm">{n}</span>
          <div class="lvl" role="img" aria-label={`Nível de ${n}`}>
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
