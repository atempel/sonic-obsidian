import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import { FEEDBACK_KEYS, bugReportUrl, copyDiagnostics, gatherInfo, openBugForm, openIdeas, openQuestion, type FeedbackInfo, type FeedbackKey } from '../feedback'
import { t, type MessageKey } from '../i18n'
import { Icon } from './icons'

/**
 * Feedback e bugs (spec 031) — protótipo "Palco integrado" (`#fbBtn`, `#fbMenu`, `#fbDialog`),
 * versão 1794680346-fb12. O painel "Relatar um problema" é um diálogo modal fora do
 * `core.state.overlay`: abre por cima dos Ajustes rápidos e das Configurações sem fechá-los.
 */
let open = false
let returnTo: HTMLElement | null = null
const listeners = new Set<() => void>()

export const isFeedbackOpen = (): boolean => open

function setOpen(v: boolean): void {
  if (open === v) return
  open = v
  document.body.classList.toggle('fb-open', v)
  listeners.forEach((fn) => fn())
}

/** Abre o painel. `from` recebe o foco ao cancelar (o botão que abriu). */
export function openBugReport(core: Core, from?: HTMLElement | null): void {
  if (open) return
  // A busca rápida fecha (o comando veio dela); os Ajustes e as Configurações ficam atrás.
  if (core.state.overlay === 'search') core.run('ui.close', {}, 'ui')
  returnTo = from ?? null
  setOpen(true)
}

export function closeBugReport(refocus: boolean): void {
  if (!open) return
  setOpen(false)
  const el = returnTo
  returnTo = null
  if (refocus && el && document.contains(el)) el.focus({ preventScroll: true })
  else if (document.activeElement instanceof HTMLElement && document.activeElement.closest('.fb-dialog')) document.activeElement.blur()
}

const LABEL: Record<FeedbackKey, MessageKey> = {
  version: 'feedback.item.version',
  windows: 'feedback.item.windows',
  gpu: 'feedback.item.gpu',
  audio: 'feedback.item.audio',
  preset: 'feedback.item.preset'
}

const ALL_ON: Record<FeedbackKey, boolean> = { version: true, windows: true, gpu: true, audio: true, preset: true }

export function FeedbackDialog({ core }: { core: Core }) {
  const [, bump] = useState(0)
  const [info, setInfo] = useState<FeedbackInfo | null>(null)
  const [on, setOn] = useState(ALL_ON)
  const ref = useRef<HTMLDivElement>(null)
  const go = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const fn = (): void => bump((x) => x + 1)
    listeners.add(fn)
    return () => void listeners.delete(fn)
  }, [])
  useEffect(() => {
    if (!open) return
    setInfo(null)
    setOn(ALL_ON)
    let alive = true
    void gatherInfo(core.state.current).then((i) => {
      if (!alive) return
      setInfo(i)
      // Vazio ("Não identificada") não vai na URL: o switch começa desligado.
      setOn(Object.fromEntries(FEEDBACK_KEYS.map((k) => [k, i[k] !== ''])) as Record<FeedbackKey, boolean>)
    })
    return () => {
      alive = false
    }
  }, [open, core])
  useLayoutEffect(() => {
    if (open) go.current?.focus({ preventScroll: true })
  }, [open])

  // Os valores chegam em milissegundos; antes disso o clique não faz nada (o foco já está no botão).
  const submit = (): void => {
    if (!info) return
    const url = bugReportUrl(info, on)
    closeBugReport(false)
    openBugForm(url)
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeBugReport(true)
      return
    }
    if (e.key !== 'Tab') {
      e.stopPropagation()
      return
    }
    // Foco preso no painel (modal).
    const fs = [...(ref.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)') ?? [])]
    const i = fs.indexOf(document.activeElement as HTMLElement)
    if (e.shiftKey && i <= 0) {
      e.preventDefault()
      fs[fs.length - 1]?.focus()
    } else if (!e.shiftKey && i === fs.length - 1) {
      e.preventDefault()
      fs[0]?.focus()
    }
  }

  return (
    <>
      <div class="scrim fb" onClick={() => closeBugReport(true)} />
      <div class="fb-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="fbTitle" hidden={!open} onKeyDown={onKey}>
        <h2 id="fbTitle">
          <Icon name="bug" />
          {t('feedback.bug')}
        </h2>
        <p>{t('feedback.dialogIntro')}</p>
        <ul class="fb-list">
          {FEEDBACK_KEYS.map((k) => {
            const v = info ? info[k] : null
            const empty = v === ''
            const shown = v === null ? '…' : empty ? t('feedback.notIdentified') : v
            return (
              <li key={k} class={on[k] && !empty ? '' : 'off'} data-key={k}>
                <span class="fb-k" id={`fbk-${k}`}>
                  {t(LABEL[k])}
                </span>
                <span class="fb-v num" id={`fbv-${k}`} title={shown}>
                  {shown}
                </span>
                <label class="switch">
                  <input
                    type="checkbox"
                    data-key={k}
                    checked={on[k] && !empty}
                    disabled={v === null || empty}
                    aria-labelledby={`fbk-${k} fbv-${k}`}
                    onChange={(e) => setOn({ ...on, [k]: (e.target as HTMLInputElement).checked })}
                  />
                  <span class="track" />
                </label>
              </li>
            )
          })}
        </ul>
        <p class="fb-note">{t('feedback.logNote')}</p>
        <p class="fb-acct">{t('feedback.account')}</p>
        <div class="actions">
          <button type="button" class="btn btn-ghost" onClick={() => closeBugReport(true)}>
            {t('feedback.cancel')}
          </button>
          <button type="button" class="btn btn-primary" ref={go} onClick={submit}>
            <Icon name="external-link" small />
            {t('feedback.openGithub')}
          </button>
        </div>
      </div>
    </>
  )
}

/** Tempo do ícone `check` depois de copiar (protótipo: 1,5 s). */
export const COPIED_MS = 1500

/** "Copiado" por 1,5 s: devolve `[copiado, copiar]`. */
export function useCopyDiagnostics(): [boolean, () => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const copy = (): void => {
    void copyDiagnostics().then((ok) => {
      if (!ok) return
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
    })
  }
  return [copied, copy]
}

/** Botão `message-square` do cabeçalho dos Ajustes rápidos, com o menu das três portas. */
export function FeedbackButton({ core, visible }: { core: Core; visible: boolean }) {
  const [menu, setMenu] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const [copied, copy] = useCopyDiagnostics()
  const btn = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const close = (refocus: boolean): void => {
    setMenu(false)
    if (refocus) btn.current?.focus()
  }
  // Os Ajustes fecharam (Esc, Ctrl+K…): o menu vai junto.
  useEffect(() => {
    if (!visible) setMenu(false)
  }, [visible])
  useLayoutEffect(() => {
    if (!menu) return
    const place = (): void => {
      const r = btn.current?.getBoundingClientRect()
      const w = ref.current?.offsetWidth ?? 224
      if (r) setPos({ left: Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8), top: r.bottom + 6 })
    }
    place()
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    const away = (e: PointerEvent): void => {
      const n = e.target as Node
      if (!ref.current?.contains(n) && !btn.current?.contains(n)) setMenu(false)
    }
    window.addEventListener('resize', place)
    document.addEventListener('pointerdown', away)
    return () => {
      window.removeEventListener('resize', place)
      document.removeEventListener('pointerdown', away)
    }
  }, [menu])

  const act = (k: 'bug' | 'idea' | 'ask' | 'diag'): void => {
    // "Copiar diagnóstico" deixa o menu aberto para o `check` aparecer.
    if (k === 'diag') return copy()
    close(false)
    if (k === 'bug') openBugReport(core, btn.current)
    else if (k === 'idea') openIdeas()
    else openQuestion()
  }
  const onKey = (e: KeyboardEvent): void => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('button') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    let next = -1
    if (e.key === 'ArrowDown') next = (i + 1) % items.length
    else if (e.key === 'ArrowUp') next = (i + items.length - 1) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      close(true)
    }
    if (next >= 0) {
      e.preventDefault()
      items[next]?.focus()
    }
    e.stopPropagation()
  }

  return (
    <>
      <button
        ref={btn}
        class="ibtn"
        id="fbBtn"
        aria-label={t('feedback.title')}
        title={t('feedback.title')}
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-controls="fbMenu"
        onClick={() => (menu ? close(true) : setMenu(true))}
      >
        <Icon name="message-square" />
      </button>
      <div class="menu fb-menu" id="fbMenu" role="menu" aria-label={t('feedback.title')} ref={ref} hidden={!menu} onKeyDown={onKey} style={{ left: `${pos.left}px`, top: `${pos.top}px` }}>
        <button type="button" role="menuitem" data-fb="bug" onClick={() => act('bug')}>
          <Icon name="bug" />
          <span class="grow">{t('feedback.bug')}</span>
        </button>
        <button type="button" role="menuitem" data-fb="idea" onClick={() => act('idea')}>
          <Icon name="lightbulb" />
          <span class="grow">{t('feedback.idea')}</span>
        </button>
        <button type="button" role="menuitem" data-fb="ask" onClick={() => act('ask')}>
          <Icon name="circle-help" />
          <span class="grow">{t('feedback.ask')}</span>
        </button>
        <hr />
        <button type="button" role="menuitem" data-fb="diag" onClick={() => act('diag')}>
          <Icon name={copied ? 'check' : 'clipboard-copy'} />
          <span class="grow">{t('feedback.diag')}</span>
        </button>
      </div>
    </>
  )
}
