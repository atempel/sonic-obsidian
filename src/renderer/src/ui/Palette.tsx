import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import { Highlight } from './Highlight'
import { Icon } from './icons'
import { TABS, listFor, presetsWord, thumbStyle, type Tab } from './library-data'
import { splitPresetName } from './preset-name'
import { showToast } from './toast'

const MAX_RESULTS = 50

/**
 * Busca rápida (spec 010) — protótipo "Palco integrado" (`#palette`), versão 1794165177-f126.
 * `/` ou `Ctrl+K` abrem; tocar algo fecha.
 */
export function Palette({ core, presets }: { core: Core; presets: readonly string[] }) {
  const open = core.state.overlay === 'search'
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listEl = useRef<HTMLDivElement>(null)
  const allSet = useMemo(() => new Set(presets), [presets])
  const lib = core.state.library

  // Foco já na abertura (layout effect, com a classe aplicada): o que se digita logo depois do Ctrl+K não se perde.
  useLayoutEffect(() => {
    document.body.classList.toggle('palette-open', open)
    if (!open) return
    setQ('')
    setTab('all')
    setActive(0)
    input.current?.focus()
  }, [open])

  const items = tab === 'collections' ? [] : listFor(core, presets, allSet, tab, q.trim()).slice(0, MAX_RESULTS)
  const cols = tab === 'collections' ? lib.collections.filter((c) => c.name.toLocaleLowerCase().includes(q.trim().toLocaleLowerCase())) : []
  const count = tab === 'collections' ? cols.length : items.length
  const counts: Record<Tab, number> = {
    all: presets.filter((n) => !core.isHidden(n)).length,
    favorites: listFor(core, presets, allSet, 'favorites', '').length,
    recents: listFor(core, presets, allSet, 'recents', '').length,
    collections: lib.collections.length
  }

  useEffect(() => {
    listEl.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' })
  }, [active, tab, q])

  const close = (): void => void core.run('ui.close', {}, 'ui')
  const play = (name: string): void => {
    core.run('preset.play', { name }, 'ui')
    close()
  }
  const playCollection = (id: string, name: string): void => {
    const r = core.run('collection.play', { id }, 'ui')
    if (r.ok) showToast(`Tocando ${name}.`, 2600)
    else showToast('Esta coleção está vazia.', 2600)
    close()
  }
  const fav = (name: string): void => {
    const r = core.run<boolean>('library.favorite', { name }, 'ui')
    if (r.ok) showToast(r.value ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.', 2600)
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setActive((i) => Math.max(0, Math.min(count - 1, i + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (tab === 'collections') {
        const c = cols[active]
        if (c) playCollection(c.id, c.name)
      } else if (items[active]) play(items[active]!)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      const i = TABS.findIndex((t) => t.id === tab)
      setTab(TABS[(i + (e.shiftKey ? TABS.length - 1 : 1)) % TABS.length]!.id)
      setActive(0)
    } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
      e.preventDefault()
      e.stopPropagation()
      if (tab !== 'collections' && items[active]) fav(items[active]!)
    }
  }

  return (
    <>
      <div class="scrim p" onClick={close} />
      <div class="palette" role="dialog" aria-modal="true" aria-label="Buscar presets" aria-hidden={!open} onKeyDown={onKey}>
        <div class="p-search">
          <Icon name="search" />
          <input
            ref={input}
            type="text"
            placeholder="Buscar preset ou autor"
            aria-label="Buscar preset ou autor"
            value={q}
            tabIndex={open ? 0 : -1}
            onInput={(e) => {
              setQ((e.target as HTMLInputElement).value)
              setActive(0)
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div class="p-tabs" role="tablist" aria-label="Seções da busca">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              tabIndex={-1}
              onClick={() => {
                setTab(t.id)
                setActive(0)
                input.current?.focus()
              }}
            >
              {t.label}
              <span class="num">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <div class="p-list" ref={listEl} role="listbox" aria-label="Resultados">
          {tab === 'collections'
            ? cols.map((c, i) => (
                <button key={c.id} class={i === active ? 'p-coll active' : 'p-coll'} tabIndex={-1} onClick={() => playCollection(c.id, c.name)}>
                  <span>
                    {c.name}
                    <br />
                    <small>
                      {presetsWord(c.presets.length)} · troca a cada {c.intervalSeconds} s
                    </small>
                  </span>
                  <span class="btn btn-ghost">
                    <Icon name="play" small />
                    Tocar
                  </span>
                </button>
              ))
            : items.map((name, i) => {
                const { title, author } = splitPresetName(name)
                const playing = name === core.state.current
                const isFav = core.isFavorite(name)
                return (
                  <div key={name} class={`prow${i === active ? ' active' : ''}${playing ? ' playing' : ''}`} role="option" aria-selected={i === active} onMouseMove={() => i !== active && setActive(i)}>
                    <button class="r-btn" tabIndex={-1} onClick={() => play(name)} title={name}>
                      <i class="thumb" style={thumbStyle(name)} />
                      <span style="min-width:0">
                        <div class="r-title">
                          {playing && <Icon name="audio-lines" small />} <Highlight text={title} q={q.trim()} />
                        </div>
                        {author && (
                          <div class="r-author">
                            por <Highlight text={author} q={q.trim()} />
                          </div>
                        )}
                      </span>
                    </button>
                    <span class="r-hint">Enter tocar</span>
                    <button class="ibtn star" tabIndex={-1} aria-pressed={isFav} aria-label={isFav ? 'Desfavoritar' : 'Favoritar'} onClick={() => fav(name)}>
                      <Icon name="star" small />
                    </button>
                  </div>
                )
              })}
          {count === 0 && <PaletteEmpty tab={tab} q={q.trim()} />}
        </div>
        <div class="p-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navegar
          </span>
          <span>
            <kbd>Enter</kbd> tocar
          </span>
          <span>
            <kbd>Ctrl</kbd>
            <kbd>F</kbd> favoritar
          </span>
          <span>
            <kbd>Tab</kbd> trocar aba
          </span>
        </div>
      </div>
    </>
  )
}

function PaletteEmpty({ tab, q }: { tab: Tab; q: string }) {
  let h: string
  let s: string
  if (q) {
    h = `Nenhum preset com “${q}”.`
    s = 'Tente o nome de um autor, como Geiss ou Flexi.'
  } else if (tab === 'favorites') {
    h = 'Nenhum favorito ainda.'
    s = 'Toque na estrela de um preset para guardá-lo aqui.'
  } else if (tab === 'recents') {
    h = 'Nada tocado ainda.'
    s = 'Os presets que você tocar aparecem aqui.'
  } else if (tab === 'collections') {
    h = 'Nenhuma coleção ainda.'
    s = 'Crie coleções na Biblioteca (L).'
  } else {
    h = 'Todos os presets estão ocultos.'
    s = 'Restaure os ocultos na Biblioteca (L).'
  }
  return (
    <div class="p-empty">
      <Icon name="search-x" />
      <strong>{h}</strong>
      {s}
    </div>
  )
}
