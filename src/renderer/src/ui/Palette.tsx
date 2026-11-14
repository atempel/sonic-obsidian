import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import { Highlight } from './Highlight'
import { Icon } from './icons'
import { TABS, listFor, matches, presetsWord, thumbStyle, type Tab } from './library-data'
import { splitPresetName } from './preset-name'
import { keyName, matchCommands, runAction, type Command } from './shortcuts'
import { showToast } from './toast'
import { fmtSeconds, t } from '../i18n'

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
  const cols = tab === 'collections' ? lib.collections.filter((c) => matches(c.name, q.trim())) : []
  // Comandos (spec 020): só na aba Todos e com texto, abaixo dos presets; Enter executa.
  const cmds = tab === 'all' ? matchCommands(q) : []
  const count = tab === 'collections' ? cols.length : items.length + cmds.length
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
    if (r.ok) showToast(t('toast.playing', { name }))
    else showToast(t('toast.collectionEmpty'))
    close()
  }
  const runCmd = (c: Command): void => {
    close()
    runAction(c.id)
  }
  const fav = (name: string): void => {
    const r = core.run<boolean>('library.favorite', { name }, 'ui')
    if (r.ok) showToast(t(r.value ? 'toast.favAdded' : 'toast.favRemoved'))
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
      else if (cmds[active - items.length]) runCmd(cmds[active - items.length]!)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      const i = TABS.findIndex((x) => x.id === tab)
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
      <div class="palette" role="dialog" aria-modal="true" aria-label={t('palette.label')} aria-hidden={!open} onKeyDown={onKey}>
        <div class="p-search">
          <Icon name="search" />
          <input
            ref={input}
            type="text"
            placeholder={t('library.search')}
            aria-label={t('library.search')}
            value={q}
            tabIndex={open ? 0 : -1}
            onInput={(e) => {
              setQ((e.target as HTMLInputElement).value)
              setActive(0)
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div class="p-tabs" role="tablist" aria-label={t('palette.sections')}>
          {TABS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={tab === x.id}
              tabIndex={-1}
              onClick={() => {
                setTab(x.id)
                setActive(0)
                input.current?.focus()
              }}
            >
              {t(x.label)}
              <span class="num">{counts[x.id]}</span>
            </button>
          ))}
        </div>
        <div class="p-list" ref={listEl} role="listbox" aria-label={t('palette.results')}>
          {tab === 'collections'
            ? cols.map((c, i) => (
                <button key={c.id} class={i === active ? 'p-coll active' : 'p-coll'} tabIndex={-1} onClick={() => playCollection(c.id, c.name)}>
                  <span>
                    {c.name}
                    <br />
                    <small>
                      {t('library.collectionMeta', { presets: presetsWord(c.presets.length), s: fmtSeconds(c.intervalSeconds) })}
                    </small>
                  </span>
                  <span class="btn btn-ghost">
                    <Icon name="play" small />
                    {t('palette.play')}
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
                            {t('library.byPrefix')} <Highlight text={author} q={q.trim()} />
                          </div>
                        )}
                      </span>
                    </button>
                    <span class="r-hint">{t('palette.hintPlay')}</span>
                    <button class="ibtn star" tabIndex={-1} aria-pressed={isFav} aria-label={t(isFav ? 'strip.unfavorite' : 'strip.favorite')} onClick={() => fav(name)}>
                      <Icon name="star" small />
                    </button>
                  </div>
                )
              })}
          {cmds.length > 0 && (
            <div class="p-grp" role="presentation">
              {t('palette.commands')}
            </div>
          )}
          {cmds.map((c, j) => {
            const i = items.length + j
            return (
              <div key={c.id} class={`prow cmd${i === active ? ' active' : ''}`} role="option" aria-selected={i === active} onMouseMove={() => i !== active && setActive(i)}>
                <button class="r-btn" tabIndex={-1} onClick={() => runCmd(c)}>
                  <span class="cmd-ico">
                    <Icon name={c.icon} />
                  </span>
                  <span class="r-title">
                    <Highlight text={t(c.label)} q={q.trim()} />
                  </span>
                </button>
                <span class="r-hint">{t('palette.hintRun')}</span>
                <span class="k-keys">
                  {c.keys.map((k) => (
                    <kbd key={k}>{keyName(k)}</kbd>
                  ))}
                </span>
              </div>
            )
          })}
          {count === 0 && <PaletteEmpty tab={tab} q={q.trim()} />}
        </div>
        <div class="p-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t('palette.footNavigate')}
          </span>
          <span>
            <kbd>Enter</kbd> {t('palette.footPlay')}
          </span>
          <span>
            <kbd>Ctrl</kbd>
            <kbd>F</kbd> {t('palette.footFavorite')}
          </span>
          <span>
            <kbd>Tab</kbd> {t('palette.footTab')}
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
    h = t('library.noMatch', { q })
    s = t('library.noMatchHint')
  } else if (tab === 'favorites') {
    h = t('library.noFavorites')
    s = t('library.noFavoritesHint')
  } else if (tab === 'recents') {
    h = t('library.noRecents')
    s = t('library.noRecentsHint')
  } else if (tab === 'collections') {
    h = t('library.noCollections')
    s = t('palette.noCollectionsHint')
  } else {
    h = t('library.allHidden')
    s = t('palette.allHiddenHint')
  }
  return (
    <div class="p-empty">
      <Icon name="search-x" />
      <strong>{h}</strong>
      {s}
    </div>
  )
}
