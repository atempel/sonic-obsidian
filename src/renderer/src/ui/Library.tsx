import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import type { Collection } from '../core/state'
import { Highlight } from './Highlight'
import { useSlideIndicator } from './slide-indicator'
import { Icon } from './icons'
import { COLLECTION_INTERVALS, TABS, listFor, matches, presetsWord, thumbStyle, type Tab } from './library-data'
import { splitPresetName } from './preset-name'
import { showToast } from './toast'
import { fmtSeconds, t, tn } from '../i18n'

/**
 * Biblioteca em gaveta (spec 010) — protótipo "Palco integrado" (`#lib`), versão 1794165177-f126.
 * Abre com `L`, o botão da faixa ou a alça da borda; fecha com `Esc`, `L`, o botão ou clique fora.
 */
const say = (text: string): void => showToast(text)

interface MenuState {
  name: string
  x: number
  y: number
  sub: boolean
}

/** Importados (spec 022): rótulo, filtro "Importados" e "Remover importado". Meus (spec 026): idem, mais o Estúdio. */
export interface ImportsApi {
  is(name: string): boolean
  count(): number
  remove(name: string): Promise<void>
  isMine(name: string): boolean
  removeMine(name: string): Promise<void>
  /** Abre o Estúdio com uma cópia do preset (ou o próprio, se for meu). */
  edit(name: string): void
}

export function Library({ core, presets, imports }: { core: Core; presets: readonly string[]; imports: ImportsApi }) {
  const open = core.state.overlay === 'library'
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [impOnly, setImpOnly] = useState(false)
  const [mineOnly, setMineOnly] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [recents, setRecents] = useState<string[]>([])
  const [menu, setMenu] = useState<MenuState | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  // M10: o sublinhado desliza entre as abas.
  useSlideIndicator(tabsRef, '[role=tab][aria-selected=true]', 'x', [tab, open])
  const allSet = useMemo(() => new Set(presets), [presets])
  const lib = core.state.library
  const query = q.trim()

  useLayoutEffect(() => {
    document.body.classList.toggle('lib-open', open)
    if (!open) {
      setMenu(null)
      return
    }
    // Foco na própria gaveta, sem anel visível: L e Esc fecham, Tab vai à busca. Focar a aba
    // "Todos" deixava um anel no topo a cada abertura pelo teclado (relato do usuário, 2026-11-10).
    panel.current?.focus({ preventScroll: true })
    // M12: degrau nas primeiras linhas, só na abertura.
    const el = panel.current
    if (!el) return
    el.querySelectorAll<HTMLElement>('.rows > li, .collist > li, .corder > li').forEach((li, i) => li.style.setProperty('--i', String(Math.min(i, 8))))
    el.classList.add('enter')
    const timer = window.setTimeout(() => el.classList.remove('enter'), 600)
    return () => window.clearTimeout(timer)
  }, [open])

  const close = (): void => void core.run('ui.close', {}, 'ui')
  const selectTab = (next: Tab): void => {
    setTab(next)
    setDetail(null)
    // Recentes é um retrato do momento em que a aba abre (como no protótipo).
    if (next === 'recents') setRecents([...lib.recents])
  }
  const play = (name: string): void => void core.run('preset.play', { name }, 'ui')
  const fav = (name: string): void => {
    const r = core.run<boolean>('library.favorite', { name }, 'ui')
    if (r.ok) say(t(r.value ? 'toast.favAdded' : 'toast.favRemoved'))
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    if (menu) {
      if (menu.sub) setMenu({ ...menu, sub: false })
      else setMenu(null)
    } else if (q) {
      setQ('')
      input.current?.focus()
    } else if (detail) setDetail(null)
    else close()
  }

  const onTabKey = (e: KeyboardEvent): void => {
    const i = TABS.findIndex((x) => x.id === tab)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (i + TABS.length - 1) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next < 0) return
    e.preventDefault()
    e.stopPropagation()
    selectTab(TABS[next]!.id)
    window.setTimeout(() => panel.current?.querySelector<HTMLElement>('[role=tab][aria-selected=true]')?.focus(), 0)
  }

  const counts: Record<Tab, number> = {
    all: presets.filter((n) => !core.isHidden(n)).length,
    favorites: listFor(core, presets, allSet, 'favorites', '').length,
    recents: listFor(core, presets, allSet, 'recents', '').length,
    collections: lib.collections.length
  }
  const hiddenCount = lib.hidden.length
  const allHidden = presets.length > 0 && counts.all === 0

  let body
  if (tab === 'collections' && !query) {
    const col = detail ? lib.collections.find((c) => c.id === detail) : undefined
    body = col ? <CollectionDetail core={core} col={col} allSet={allSet} onBack={() => setDetail(null)} /> : <Collections core={core} onOpen={setDetail} />
  } else {
    const names =
      tab === 'recents'
        ? recents.filter((n) => allSet.has(n) && !core.isHidden(n) && matches(n, query))
        : listFor(core, presets, allSet, tab === 'collections' ? 'all' : tab, query).filter((n) => !(tab === 'all' && impOnly) || imports.is(n))
            .filter((n) => !(tab === 'all' && mineOnly) || imports.isMine(n))
    const chips =
      tab === 'all' && !detail ? (
        <div class="chips">
          <button aria-pressed={impOnly} onClick={() => setImpOnly(!impOnly)}>
            {t('library.filterImported')}
          </button>
          <button aria-pressed={mineOnly} onClick={() => setMineOnly(!mineOnly)}>
            {t('library.filterMine')}
          </button>
        </div>
      ) : null
    body =
      names.length === 0 ? (
        <>
          {chips}
          {tab === 'all' && mineOnly && !query ? (
            <div class="empty">
              <Icon name="file-plus-2" />
              <span class="h">{t('library.noMine')}</span>
              <span class="s">{t('library.noMineHint')}</span>
            </div>
          ) : tab === 'all' && impOnly && !query ? (
            <div class="empty">
              <Icon name="file-plus-2" />
              <span class="h">{t('library.noImported')}</span>
              <span class="s">{t('library.noImportedHint')}</span>
            </div>
          ) : (
            <LibEmpty tab={tab} q={query} allHidden={allHidden} onClear={() => setQ('')} onRestore={() => restoreHidden(core)} />
          )}
        </>
      ) : (
        <>
        {chips}
        <ul class="rows">
          {names.map((name) => (
            <PresetRow
              key={name}
              core={core}
              name={name}
              q={query}
              imported={imports.is(name)}
              mine={imports.isMine(name)}
              onPlay={() => play(name)}
              onFav={() => fav(name)}
              onMore={(el) => {
                const r = el.getBoundingClientRect()
                setMenu({ name, x: Math.min(r.left, window.innerWidth - 240), y: Math.min(r.bottom + 4, window.innerHeight - 160), sub: false })
              }}
            />
          ))}
        </ul>
        </>
      )
  }

  return (
    <>
      <div class="lib-scrim" onClick={close} />
      <aside class="lib" ref={panel} tabIndex={-1} aria-label={t('library.label')} aria-hidden={!open} onKeyDown={onKey}>
        <div class="lib-head">
          <div class="brand">
            <Icon name="library" />
            {t('library.title')}
          </div>
          <button class="ibtn" aria-label={t('library.close')} title={t('library.closeTitle')} onClick={close}>
            <Icon name="x" />
          </button>
        </div>
        <div class="search">
          <span class="si">
            <Icon name="search" small />
          </span>
          <input
            ref={input}
            type="text"
            placeholder={t('library.search')}
            aria-label={t('library.search')}
            value={q}
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value
              setQ(v)
              if (v && tab === 'collections') selectTab('all')
            }}
          />
          {q ? (
            <button class="ibtn clear" aria-label={t('library.clearSearch')} title={t('library.clearSearchTitle')} onClick={() => setQ('')}>
              <Icon name="x" small />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </div>
        <div class="ltabs" ref={tabsRef} role="tablist" aria-label={t('library.sections')} onKeyDown={onTabKey}>
          {TABS.map((x) => (
            <button key={x.id} role="tab" aria-selected={tab === x.id} tabIndex={tab === x.id ? 0 : -1} onClick={() => selectTab(x.id)}>
              {t(x.label)}
              {x.id !== 'collections' && <span class="num">{counts[x.id]}</span>}
            </button>
          ))}
          <i class="ind" aria-hidden="true" />
        </div>
        <div class="listwrap">
          <div class="list">{body}</div>
        </div>
        {hiddenCount > 0 && (
          <div class="hiddenbar">
            <Icon name="eye-off" small />
            <span>{tn('library.hidden', hiddenCount)} ·</span>
            <button class="btn btn-ghost" onClick={() => restoreHidden(core)}>
              {t('library.restore')}
            </button>
          </div>
        )}
      </aside>
      {menu && <RowMenu core={core} menu={menu} setMenu={setMenu} imports={imports} />}
    </>
  )
}

function restoreHidden(core: Core): void {
  if (core.run('library.restore', { reason: 'user' }, 'ui').ok) say(t('toast.restored'))
}

function PresetRow(props: { core: Core; name: string; q: string; imported: boolean; mine?: boolean; onPlay(): void; onFav(): void; onMore(el: HTMLElement): void }) {
  const { core, name, q } = props
  const { title, author } = splitPresetName(name)
  const playing = name === core.state.current
  const isFav = core.isFavorite(name)
  return (
    <li class={playing ? 'row playing' : 'row'}>
      <button class="row-main" title={name} onClick={props.onPlay} aria-current={playing ? 'true' : undefined}>
        <i class="thumb" style={thumbStyle(name)} />
        <span class="meta">
          <span class="t">
            {playing && (
              <span class="playing-ico">
                <Icon name="audio-lines" small />
              </span>
            )}
            <span class="tt">
              <Highlight text={title} q={q} />
            </span>
          </span>
          {(author || props.imported || props.mine) && (
            <span class="a">
              {author && (
                <span class="au">
                  {t('library.byPrefix')} <Highlight text={author} q={q} />
                </span>
              )}
              {props.imported && <span class="imp-tag">{t('library.tagImported')}</span>}
              {props.mine && <span class="imp-tag mine-tag">{t('library.tagMine')}</span>}
            </span>
          )}
        </span>
      </button>
      <button class="ibtn star" aria-pressed={isFav} aria-label={t(isFav ? 'library.unfavorite' : 'library.favorite', { title })} onClick={props.onFav}>
        <Icon name="star" small />
      </button>
      <button class="ibtn" aria-label={t('library.more', { title })} aria-haspopup="menu" onClick={(e) => props.onMore(e.currentTarget as HTMLElement)}>
        <Icon name="ellipsis" small />
      </button>
    </li>
  )
}

function RowMenu({ core, menu, setMenu, imports }: { core: Core; menu: MenuState; setMenu(m: MenuState | null): void; imports: ImportsApi }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus()
  }, [menu.sub])
  useEffect(() => {
    const away = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setMenu(null)
    }
    window.addEventListener('mousedown', away)
    return () => window.removeEventListener('mousedown', away)
  }, [setMenu])
  const onKey = (e: KeyboardEvent): void => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('button') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    let next = -1
    if (e.key === 'ArrowDown') next = (i + 1) % items.length
    else if (e.key === 'ArrowUp') next = (i + items.length - 1) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next < 0) return
    e.preventDefault()
    e.stopPropagation()
    items[next]?.focus()
  }
  const cols = core.state.library.collections
  const add = (c: Collection): void => {
    const r = core.run<boolean>('collection.add', { id: c.id, name: menu.name }, 'ui')
    if (r.ok) say(t(r.value ? 'toast.addedTo' : 'toast.alreadyIn', { name: c.name }))
    setMenu(null)
  }
  return (
    <div class="menu" role="menu" ref={ref} style={`left:${menu.x}px;top:${menu.y}px`} onKeyDown={onKey}>
      {menu.sub ? (
        <>
          <button role="menuitem" onClick={() => setMenu({ ...menu, sub: false })}>
            <Icon name="arrow-left" small />
            <span class="grow">{t('library.menu.back')}</span>
          </button>
          <hr />
          {cols.map((c) => (
            <button key={c.id} role="menuitem" onClick={() => add(c)}>
              <Icon name="list-music" small />
              <span class="grow">{c.name}</span>
            </button>
          ))}
          <button
            role="menuitem"
            onClick={() => {
              const r = core.run<string>('collection.create', {}, 'ui')
              const c = r.ok ? core.state.library.collections.find((x) => x.id === r.value) : undefined
              if (c) add(c)
            }}
          >
            <Icon name="plus" small />
            <span class="grow">{t('library.newCollection')}</span>
          </button>
        </>
      ) : (
        <>
          <button role="menuitem" aria-haspopup="menu" onClick={() => setMenu({ ...menu, sub: true })}>
            <Icon name="folder-plus" small />
            <span class="grow">{t('library.menu.addTo')}</span>
            <Icon name="chevron-right" small />
          </button>
          <button
            role="menuitem"
            onClick={() => {
              if (core.run('library.hide', { name: menu.name }, 'ui').ok) say(t('toast.hidden'))
              setMenu(null)
            }}
          >
            <Icon name="eye-off" small />
            <span class="grow">{t('library.menu.hide')}</span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setMenu(null)
              imports.edit(menu.name)
            }}
          >
            <Icon name="pencil" small />
            <span class="grow">{t(imports.isMine(menu.name) ? 'library.menu.editMine' : 'library.menu.editCopy')}</span>
          </button>
          {imports.isMine(menu.name) && (
            <button
              role="menuitem"
              onClick={() => {
                setMenu(null)
                if (!window.confirm(t('library.menu.removeMineConfirm', { name: menu.name }))) return
                void imports.removeMine(menu.name).then(() => say(t('toast.mineRemoved')))
              }}
            >
              <Icon name="trash-2" small />
              <span class="grow">{t('library.menu.removeMine')}</span>
            </button>
          )}
          {imports.is(menu.name) && (
            <button
              role="menuitem"
              onClick={() => {
                setMenu(null)
                void imports.remove(menu.name).then(() => say(t('toast.importedRemoved')))
              }}
            >
              <Icon name="trash-2" small />
              <span class="grow">{t('library.menu.removeImported')}</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Collections({ core, onOpen }: { core: Core; onOpen(id: string): void }) {
  const { collections } = core.state.library
  const rot = core.state.settings.rotation
  return (
    <>
      <ul class="collist">
        {collections.map((c) => (
          <li key={c.id} class={rot.order === 'collection' && rot.collectionId === c.id ? 'playing' : ''}>
            <button class="coll" onClick={() => onOpen(c.id)}>
              <span class="meta" style="flex:1">
                <span class="tt">{c.name}</span>
                <span class="a">
                  {t('library.collectionMeta', { presets: presetsWord(c.presets.length), s: fmtSeconds(c.intervalSeconds) })}
                </span>
              </span>
              <span class="chev">
                <Icon name="chevron-right" small />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {collections.length === 0 && (
        <div class="empty">
          <Icon name="list-music" />
          <span class="h">{t('library.noCollections')}</span>
          <span class="s">{t('library.noCollectionsHint')}</span>
        </div>
      )}
      <button
        class="btn btn-ghost newcoll"
        onClick={() => {
          const r = core.run<string>('collection.create', {}, 'ui')
          if (r.ok) onOpen(r.value)
        }}
      >
        <Icon name="plus" small />
        {t('library.newCollection')}
      </button>
    </>
  )
}

function CollectionDetail({ core, col, allSet, onBack }: { core: Core; col: Collection; allSet: ReadonlySet<string>; onBack(): void }) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const intervals = COLLECTION_INTERVALS.includes(col.intervalSeconds) ? COLLECTION_INTERVALS : [...COLLECTION_INTERVALS, col.intervalSeconds].sort((a, b) => a - b)
  return (
    <>
      <div class="chead">
        <button class="ibtn" aria-label={t('library.backToCollections')} title={t('library.backToCollectionsTitle')} onClick={onBack}>
          <Icon name="arrow-left" />
        </button>
        <h2>{col.name}</h2>
      </div>
      <div class="cactions">
        <button
          class="btn btn-primary"
          disabled={col.presets.length === 0}
          onClick={() => {
            if (core.run('collection.play', { id: col.id }, 'ui').ok) say(t('toast.playing', { name: col.name }))
          }}
        >
          <Icon name="play" small />
          {t('library.playCollection')}
        </button>
        <label class="ivl">
          {t('library.every')}
          <select
            value={String(col.intervalSeconds)}
            onChange={(e) => {
              const v = Number((e.target as HTMLSelectElement).value)
              if (core.run('collection.setInterval', { id: col.id, intervalSeconds: v }, 'ui').ok) say(t('toast.collectionInterval', { s: fmtSeconds(v) }))
            }}
          >
            {intervals.map((s) => (
              <option key={s} value={String(s)}>
                {fmtSeconds(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {col.presets.length === 0 ? (
        <div class="empty">
          <Icon name="list-music" />
          <span class="h">{t('library.collectionEmpty')}</span>
          <span class="s">{t('library.collectionEmptyHint')}</span>
        </div>
      ) : (
        <ol class="corder">
          {col.presets.map((name, i) => {
            const { title, author } = splitPresetName(name)
            const missing = !allSet.has(name)
            const playing = name === core.state.current
            return (
              <li
                key={name}
                class={playing ? 'playing' : ''}
                draggable
                onDragStart={() => setDragFrom(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragFrom !== null && dragFrom !== i) core.run('collection.reorder', { id: col.id, from: dragFrom, to: i }, 'ui')
                  setDragFrom(null)
                }}
              >
                <button class="crow" title={name} disabled={missing} onClick={() => core.run('preset.play', { name }, 'ui')}>
                  <span class="grip" title={t('library.dragToReorder')}>
                    <Icon name="grip-vertical" small />
                  </span>
                  <span class="ord num">{i + 1}</span>
                  <i class="thumb" style={thumbStyle(name)} />
                  <span class="meta">
                    <span class="tt">{title}</span>
                    {author && <span class="a">{t('credit.by', { author })}</span>}
                  </span>
                </button>
                <button class="ibtn" aria-label={t('library.removeFromCollection', { title })} title={t('library.removeFromCollectionTitle')} onClick={() => core.run('collection.remove', { id: col.id, name }, 'ui')}>
                  <Icon name="x" small />
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}

function LibEmpty(props: { tab: Tab; q: string; allHidden: boolean; onClear(): void; onRestore(): void }) {
  const { tab, q, allHidden } = props
  if (q) {
    return (
      <div class="empty">
        <Icon name="search-x" />
        <span class="h">{t('library.noMatch', { q })}</span>
        <span class="s">{t('library.noMatchHint')}</span>
        <button class="btn" onClick={props.onClear}>
          {t('library.clearSearch')}
        </button>
      </div>
    )
  }
  if (allHidden && tab === 'all') {
    return (
      <div class="empty">
        <Icon name="eye-off" />
        <span class="h">{t('library.allHidden')}</span>
        <button class="btn" onClick={props.onRestore}>
          {t('library.restoreHidden')}
        </button>
      </div>
    )
  }
  const [h, s] =
    tab === 'favorites'
      ? [t('library.noFavorites'), t('library.noFavoritesHint')]
      : [t('library.noRecents'), t('library.noRecentsHint')]
  return (
    <div class="empty">
      <Icon name={tab === 'favorites' ? 'star' : 'audio-lines'} />
      <span class="h">{h}</span>
      <span class="s">{s}</span>
    </div>
  )
}
