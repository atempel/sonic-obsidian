import { createPortal } from 'preact/compat'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import { Icon } from './icons'
import { presetsWord } from './library-data'
import { showToast } from './toast'

/**
 * Adicionar o preset atual a coleções pelo Palco (spec 023). Botão ao lado da estrela, com um
 * painel no estilo do menu "…" da Biblioteca: cada coleção marcada se já tem o preset; clicar
 * põe ou tira, e o painel fica aberto. Não há no protótipo `0fd0` (ver DIVERGENCIAS).
 */
export function CollectButton({ core }: { core: Core }) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const close = (focusBtn: boolean): void => {
    setOpen(false)
    if (focusBtn) btn.current?.focus()
  }
  return (
    <>
      <button
        ref={btn}
        class="ibtn"
        aria-label="Adicionar à coleção"
        title="Adicionar à coleção"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="folder-plus" />
      </button>
      {/* A `.strip` corta o que passa da borda (overflow: hidden): o painel vive fora dela. */}
      {open && btn.current && createPortal(<CollectPop core={core} anchor={btn.current} onClose={close} />, btn.current.closest('.strip-wrap') ?? document.body)}
    </>
  )
}

function CollectPop({ core, anchor, onClose }: { core: Core; anchor: HTMLElement | null; onClose(focusBtn: boolean): void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [, bump] = useState(0)
  const [pos, setPos] = useState(() => placeFor(anchor))
  const nameInput = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    if (naming) nameInput.current?.focus()
  }, [naming])
  const current = core.state.current
  const cols = core.state.library.collections

  // Marcas acompanham a troca de preset (rotação) e mudanças nas coleções.
  useEffect(() => {
    const offs = [core.events.on('presetChanged', () => bump((x) => x + 1)), core.events.on('stateChanged', () => bump((x) => x + 1))]
    return () => offs.forEach((off) => off())
  }, [core])

  // Sobe da faixa, alinhado à direita do botão.
  useLayoutEffect(() => {
    const place = (): void => setPos(placeFor(anchor))
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [anchor])

  useLayoutEffect(() => {
    ref.current?.querySelector<HTMLElement>('button, input')?.focus()
  }, [])

  useEffect(() => {
    const away = (e: MouseEvent): void => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !anchor?.contains(t)) onClose(false)
    }
    window.addEventListener('mousedown', away)
    return () => window.removeEventListener('mousedown', away)
  }, [anchor, onClose])

  const toggle = (id: string, colName: string, has: boolean): void => {
    const r = has ? core.run('collection.remove', { id, name: current }, 'ui') : core.run('collection.add', { id, name: current }, 'ui')
    if (r.ok) showToast(has ? `Removido de ${colName}.` : `Adicionado a ${colName}.`)
  }
  const create = (): void => {
    const trimmed = name.trim()
    const r = core.run<string>('collection.create', trimmed ? { name: trimmed } : {}, 'ui')
    if (!r.ok) return
    const col = core.state.library.collections.find((c) => c.id === r.value)
    if (col) toggle(col.id, col.name, false)
    setNaming(false)
    setName('')
    window.setTimeout(() => [...(ref.current?.querySelectorAll<HTMLElement>('[role=menuitemcheckbox]') ?? [])].pop()?.focus(), 0)
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (naming) {
        setNaming(false)
        setName('')
        window.setTimeout(() => ref.current?.querySelector<HTMLElement>('.newcol')?.focus(), 0)
      } else onClose(true)
      return
    }
    if ((e.target as HTMLElement).tagName === 'INPUT') {
      if (e.key === 'Enter') {
        e.preventDefault()
        create()
      }
      e.stopPropagation()
      return
    }
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('button') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    let next = -1
    if (e.key === 'ArrowDown') next = (i + 1) % items.length
    else if (e.key === 'ArrowUp') next = (i + items.length - 1) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next >= 0) {
      e.preventDefault()
      items[next]?.focus()
    }
    // As teclas do Palco não valem com o painel aberto (Tab segue o fluxo normal).
    if (e.key !== 'Tab') e.stopPropagation()
  }

  return (
    <div
      class="menu collect"
      role="menu"
      aria-label="Adicionar à coleção"
      ref={ref}
      onKeyDown={onKey}
      style={{ right: `${pos.right}px`, bottom: `${pos.bottom}px` }}
    >
      {cols.map((c) => {
        const has = c.presets.includes(current)
        return (
          <button key={c.id} role="menuitemcheckbox" aria-checked={has} onClick={() => toggle(c.id, c.name, has)}>
            <span class="ck" aria-hidden="true">
              {has && <Icon name="check" small />}
            </span>
            <span class="grow">{c.name}</span>
            <span class="n num">{presetsWord(c.presets.length)}</span>
          </button>
        )
      })}
      {cols.length > 0 && <hr />}
      {naming ? (
        <div class="newname">
          <input
            type="text"
            aria-label="Nome da nova coleção"
            placeholder={`Coleção ${cols.length + 1}`}
            maxLength={60}
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            ref={nameInput}
          />
        </div>
      ) : (
        <button role="menuitem" class="newcol" onClick={() => setNaming(true)}>
          <Icon name="plus" small />
          <span class="grow">Nova coleção</span>
        </button>
      )}
    </div>
  )
}

/** Posição fixa do painel: acima do botão, alinhado à direita dele. */
function placeFor(anchor: HTMLElement | null): { right: number; bottom: number } {
  const r = anchor?.getBoundingClientRect()
  if (!r) return { right: 16, bottom: 96 }
  return { right: Math.max(8, window.innerWidth - r.right), bottom: window.innerHeight - r.top + 12 }
}
