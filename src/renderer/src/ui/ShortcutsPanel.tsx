import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import { Icon } from './icons'
import { NOW_LIBRARY, NOW_STAGE, SHORTCUT_GROUPS, keysText, norm, type Keys } from './shortcuts'

/**
 * Painel de atalhos `?` (spec 019) — protótipo "Palco integrado" (`#kPanel`), versão 1794178325-0fd0.
 * Fica fora do `core.state.overlay` para poder abrir por cima da Biblioteca sem fechá-la.
 * Abre e fecha sem animação.
 */
let open = false
const listeners = new Set<() => void>()
let lastFocus: Element | null = null

export const isShortcutsOpen = (): boolean => open

function setOpen(v: boolean): void {
  if (open === v) return
  open = v
  document.body.classList.toggle('kbd-open', v)
  listeners.forEach((fn) => fn())
}

export function openShortcuts(core: Core): void {
  if (open) return
  lastFocus = document.activeElement
  // A busca rápida e os Ajustes rápidos fecham; a Biblioteca fica (grupo "Agora").
  const o = core.state.overlay
  if (o === 'search' || o === 'quick') {
    core.run('ui.close', {}, 'ui')
    lastFocus = null
  }
  setOpen(true)
}

export function closeShortcuts(): void {
  if (!open) return
  setOpen(false)
  const el = lastFocus
  lastFocus = null
  if (el instanceof HTMLElement && document.contains(el)) el.focus({ preventScroll: true })
  else if (document.activeElement instanceof HTMLElement && document.activeElement.closest('.kpanel')) document.activeElement.blur()
}

export function toggleShortcuts(core: Core): void {
  if (open) closeShortcuts()
  else openShortcuts(core)
}

/** Abre as Configurações já numa seção (o link do rodapé vai para Atalhos). */
let settingsSection: string | null = null
export function takeSettingsSection(): string | null {
  const s = settingsSection
  settingsSection = null
  return s
}

export function KeyCaps({ keys }: { keys: Keys }) {
  return (
    <span class="k-keys">
      {keys.map((alt, i) => (
        <>
          {i > 0 && <span class="k-or">ou</span>}
          {alt.map((k) => (
            <kbd key={k}>{k}</kbd>
          ))}
        </>
      ))}
    </span>
  )
}

export function ShortcutsPanel({ core }: { core: Core }) {
  const [, setV] = useState(0)
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const bump = (): void => setV((x) => x + 1)
    listeners.add(bump)
    // Busca, Ajustes ou Configurações abrindo fecham o painel (e vice-versa, em openShortcuts).
    const off = core.events.on('stateChanged', () => {
      const o = core.state.overlay
      if (open && o !== null && o !== 'library') closeShortcuts()
    })
    return () => {
      listeners.delete(bump)
      off()
    }
  }, [core])

  useLayoutEffect(() => {
    if (!open) return
    setQ('')
    input.current?.focus()
  }, [open])

  if (!open) return null

  const f = norm(q.trim())
  const now = core.state.overlay === 'library' ? NOW_LIBRARY : NOW_STAGE
  const groups = [now, ...SHORTCUT_GROUPS]
    .map((g) => ({ ...g, rows: g.rows.filter((r) => !f || norm(`${r.label} ${keysText(r.keys)}`).includes(f)) }))
    .filter((g) => g.rows.length > 0)

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' || (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey)) {
      e.preventDefault()
      e.stopPropagation()
      closeShortcuts()
    } else if (e.key === 'Tab') {
      // Foco preso no diálogo.
      const fs = Array.from(panel.current?.querySelectorAll<HTMLElement>('input, button, a[href]') ?? [])
      if (!fs.length) return
      const i = fs.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) {
        e.preventDefault()
        fs[fs.length - 1]!.focus()
      } else if (!e.shiftKey && i === fs.length - 1) {
        e.preventDefault()
        fs[0]!.focus()
      }
      e.stopPropagation()
    } else if (!e.ctrlKey && !e.metaKey) {
      // As teclas do Palco não valem com o painel aberto (Ctrl+K e Ctrl+, seguem para o main).
      e.stopPropagation()
    }
  }

  return (
    <>
      <div class="scrim k" onClick={closeShortcuts} />
      <div class="kpanel" ref={panel} role="dialog" aria-modal="true" aria-labelledby="kTitle" onKeyDown={onKey}>
        <div class="k-head">
          <h2 id="kTitle">Atalhos</h2>
          <input
            ref={input}
            type="text"
            placeholder="Filtrar atalhos"
            aria-label="Filtrar atalhos"
            autocomplete="off"
            spellcheck={false}
            value={q}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          />
          <button type="button" class="ibtn" aria-label="Fechar atalhos" title="Fechar (Esc)" onClick={closeShortcuts}>
            <Icon name="x" />
          </button>
        </div>
        <div class="k-body">
          {groups.map((g) => (
            <section key={g.name} class={g.now ? 'k-g k-now' : 'k-g'}>
              <h3>{g.name}</h3>
              {g.rows.map((r) => (
                <div key={r.label} class="k-row">
                  <span>{r.label}</span>
                  <KeyCaps keys={r.keys} />
                </div>
              ))}
            </section>
          ))}
          {groups.length === 0 && <p class="k-empty">Nenhum atalho para “{q.trim()}”.</p>}
        </div>
        <div class="k-foot">
          <a
            href="#atalhos"
            onClick={(e) => {
              e.preventDefault()
              closeShortcuts()
              settingsSection = 'atalhos'
              core.run('ui.open', { overlay: 'settings' }, 'ui')
            }}
          >
            Personalizar em Configurações › Atalhos
          </a>
        </div>
      </div>
    </>
  )
}
