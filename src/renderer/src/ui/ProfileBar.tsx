import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import {
  PROFILE_GROUPS,
  PROFILE_GROUPS_DEFAULT,
  PROFILE_KEYS,
  PROFILE_NAME_MAX,
  groupLabel,
  nextDefaultProfileName,
  profileDiffs,
  profileName,
  profileSummary,
  type Profile,
  type ProfileGroup
} from '../profiles'
import { includesText, t } from '../i18n'
import { Icon } from './icons'
import { Kbd } from './Kbd'
import { showToast } from './toast'

/**
 * Barra "Perfil" dos Ajustes rápidos (spec 038), fixa abaixo do cabeçalho. Protótipo
 * "Palco integrado" (`#pf`), espelho na versão 1794680346-fb12; docs/v3-perfis.md.
 * Seletor com menu, resumo ou "Modificado" + Desfazer/Atualizar, confirmação e "Salvar como novo".
 */

/** Aplica um perfil e avisa ("Perfil: Festa"). Teclado, menu e busca passam por aqui. */
export function applyProfile(core: Core, id: string): void {
  const r = core.run<{ name: string }>('profile.apply', { id }, 'ui')
  if (r.ok) showToast(t('profile.toast.applied', { name: r.value.name }), { important: true })
}

/** `Alt+1`…`Alt+9`: o perfil na posição `i` do menu; sem perfil ali, nada. */
export function applyProfileAt(core: Core, i: number): void {
  const p = core.allProfiles[i]
  if (p && i < PROFILE_KEYS) applyProfile(core, p.id)
}

const keyOf = (core: Core, p: Profile): number => {
  const i = core.allProfiles.indexOf(p)
  return i >= 0 && i < PROFILE_KEYS ? i + 1 : 0
}

// "Salvar como novo perfil…" da busca abre os Ajustes com o formulário.
const formRequests = new Set<() => void>()
export function requestProfileForm(core: Core): void {
  void core.run('ui.open', { overlay: 'quick' }, 'ui')
  for (const fn of formRequests) fn()
  // Abrir os Ajustes leva o foco ao painel depois do formulário: devolve ao campo de nome.
  setTimeout(() => document.getElementById('pfNameIn')?.focus(), 60)
}

export interface ProfileCommand {
  key: string
  text: string
  keys: string[]
  icon: 'bookmark' | 'bookmark-plus'
  run: () => void
}

/** Comandos da busca rápida: "Perfil: <nome>" para cada perfil e "Salvar como novo perfil…". */
export function matchProfileCommands(core: Core, q: string): ProfileCommand[] {
  if (!q.trim()) return []
  const list: ProfileCommand[] = core.allProfiles.map((p) => {
    const n = keyOf(core, p)
    return { key: `profile:${p.id}`, text: t('profile.cmd.apply', { name: profileName(p) }), keys: n ? ['Alt', String(n)] : [], icon: 'bookmark', run: () => applyProfile(core, p.id) }
  })
  list.push({ key: 'profile:new', text: t('profile.saveNew'), keys: [], icon: 'bookmark-plus', run: () => requestProfileForm(core) })
  return list.filter((c) => includesText(`${c.text} ${c.keys.join(' ')}`, q.trim()))
}

type Pane = 'form' | 'confirm' | null

export function ProfileBar({ core, open }: { core: Core; open: boolean }) {
  const [menu, setMenu] = useState(false)
  const [pane, setPane] = useState<Pane>(null)
  const [name, setName] = useState('')
  const [groups, setGroups] = useState<ProfileGroup[]>([...PROFILE_GROUPS_DEFAULT])
  const root = useRef<HTMLDivElement>(null)
  const sel = useRef<HTMLButtonElement>(null)
  const menuEl = useRef<HTMLDivElement>(null)
  const nameIn = useRef<HTMLInputElement>(null)
  const confOk = useRef<HTMLButtonElement>(null)
  const updBtn = useRef<HTMLButtonElement>(null)

  const all = core.allProfiles
  const p = core.activeProfile
  const diffs = p ? profileDiffs(p, core.state.settings) : []
  const dirty = diffs.length > 0
  const display = p ? profileName(p) : t('profile.none')

  const showForm = (): void => {
    setMenu(false)
    setName('')
    setGroups([...PROFILE_GROUPS_DEFAULT])
    setPane('form')
  }
  useEffect(() => {
    formRequests.add(showForm)
    return () => void formRequests.delete(showForm)
  }, [])
  // Fechar os Ajustes fecha o que estiver aberto na barra.
  useEffect(() => {
    if (!open) {
      setMenu(false)
      setPane(null)
    }
  }, [open])
  // Sem diferença (Desfazer, ou o valor voltou), a confirmação some.
  useEffect(() => {
    if (pane === 'confirm' && (!dirty || p?.builtIn)) setPane(null)
  }, [dirty, p?.id])
  useLayoutEffect(() => {
    if (!menu) return
    const el = menuEl.current
    ;(el?.querySelector<HTMLElement>('[aria-checked="true"]') ?? el?.querySelector<HTMLElement>('button'))?.focus()
  }, [menu])
  useLayoutEffect(() => {
    if (pane === 'form') nameIn.current?.focus()
    else if (pane === 'confirm') confOk.current?.focus()
  }, [pane])
  // Clique fora do menu fecha o menu.
  useEffect(() => {
    if (!menu) return
    const down = (e: PointerEvent): void => {
      const el = e.target as Node
      if (!menuEl.current?.contains(el) && !sel.current?.contains(el)) setMenu(false)
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [menu])

  const closeMenu = (refocus: boolean): void => {
    setMenu(false)
    if (refocus) sel.current?.focus()
  }
  const closePane = (refocus: boolean): void => {
    const was = pane
    setPane(null)
    if (!refocus) return
    if (was === 'confirm' && updBtn.current) updBtn.current.focus()
    else sel.current?.focus()
  }
  const pick = (id: string): void => {
    closeMenu(true)
    applyProfile(core, id)
  }
  const undo = (): void => {
    const r = core.run<{ name: string }>('profile.revert', {}, 'ui')
    if (r.ok) showToast(t('profile.toast.restored', { name: r.value.name }), { important: true })
    sel.current?.focus()
  }
  const update = (): void => {
    const r = core.run<{ name: string }>('profile.update', {}, 'ui')
    setPane(null)
    sel.current?.focus()
    if (r.ok) showToast(t('profile.toast.updated', { name: r.value.name }), { important: true })
  }
  const placeholder = nextDefaultProfileName(all.map(profileName))
  const save = (e?: Event): void => {
    e?.preventDefault()
    if (groups.length === 0) return
    const r = core.run<{ name: string }>('profile.save', { name, groups }, 'ui')
    if (!r.ok) return
    setPane(null)
    sel.current?.focus()
    showToast(t('profile.toast.saved', { name: r.value.name }), { important: true })
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      // Esc fecha só o que está aberto na barra; sem nada aberto, segue e fecha os Ajustes.
      if (menu) closeMenu(true)
      else if (pane) closePane(true)
      else return
      e.preventDefault()
      e.stopPropagation()
      return
    }
    const target = e.target as Node
    if (menu && menuEl.current?.contains(target)) {
      const items = [...menuEl.current.querySelectorAll<HTMLElement>('button')]
      const i = items.indexOf(document.activeElement as HTMLElement)
      const go = (j: number): void => {
        e.preventDefault()
        items[(j + items.length) % items.length]?.focus()
      }
      if (e.key === 'ArrowDown') go(i + 1)
      else if (e.key === 'ArrowUp') go(i - 1)
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(items.length - 1)
      else if (e.key === 'Tab') setMenu(false)
      e.stopPropagation()
      return
    }
    // Dentro do formulário e da confirmação, as teclas do app (Alt+1…9 incluído) não valem.
    if (pane) e.stopPropagation()
  }

  const row = (x: Profile) => {
    const n = keyOf(core, x)
    return (
      <button type="button" role="menuitemradio" key={x.id} data-pid={x.id} aria-checked={x.id === p?.id} onClick={() => pick(x.id)}>
        <span class="chk" aria-hidden="true">
          <Icon name="check" />
        </span>
        <span class="grow">{profileName(x)}</span>
        {x.builtIn && <span class="tag">{t('profile.builtinTag')}</span>}
        {n > 0 && (
          <span class="pf-k" aria-hidden="true">
            <Kbd k="Alt" />
            <Kbd k={String(n)} />
          </span>
        )}
      </button>
    )
  }
  const builtIn = all.filter((x) => x.builtIn)
  const mine = all.filter((x) => !x.builtIn)
  const summary = p ? profileSummary(p) : ''

  return (
    <div class="pf" id="pf" ref={root} onKeyDown={onKeyDown}>
      <div class="pf-bar">
        <span class="pf-lbl" id="pfLbl">
          {t('profile.label')}
        </span>
        <button
          type="button"
          class="pf-sel"
          id="pfSel"
          ref={sel}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-controls="pfMenu"
          aria-label={t(dirty ? 'profile.selModified' : 'profile.sel', { name: display })}
          title={display}
          onClick={() => {
            setPane(null)
            setMenu((m) => !m)
          }}
        >
          <span class="pf-name" id="pfName">
            {display}
          </span>
          <span class="pf-dot" id="pfDot" hidden={!dirty} />
          <span class="pf-chev">
            <Icon name="chevron-down" small />
          </span>
        </button>
      </div>
      <div class="pf-sub">
        {dirty ? (
          <>
            <span class="pf-mod" id="pfMod">
              {t('profile.modified')}
            </span>
            <span class="pf-acts" id="pfActs">
              <button type="button" class="btn btn-ghost pf-btn" id="pfUndo" onClick={undo}>
                {t('profile.undo')}
              </button>
              {!p?.builtIn && (
                <button
                  type="button"
                  class="btn pf-btn"
                  id="pfUpd"
                  ref={updBtn}
                  aria-expanded={pane === 'confirm'}
                  aria-controls="pfConfirm"
                  onClick={() => (pane === 'confirm' ? closePane(true) : (setMenu(false), setPane('confirm')))}
                >
                  {t('profile.update')}
                </button>
              )}
            </span>
          </>
        ) : (
          <p class="pf-sum num" id="pfSum" title={summary}>
            {summary}
          </p>
        )}
      </div>
      {menu && (
        <div class="menu pf-menu" id="pfMenu" role="menu" aria-label={t('profile.menu')} ref={menuEl}>
          {builtIn.map(row)}
          {mine.length > 0 && <hr />}
          {mine.map(row)}
          <hr />
          <button type="button" role="menuitem" id="pfNew" onClick={showForm}>
            <span class="chk" aria-hidden="true">
              <Icon name="bookmark-plus" />
            </span>
            <span class="grow">{t('profile.saveNew')}</span>
          </button>
        </div>
      )}
      {pane === 'confirm' && p && (
        <div class="pf-pane" id="pfConfirm" role="group" aria-labelledby="pfConfT">
          <p class="pf-ct" id="pfConfT">
            {t('profile.confirmTitle', { name: profileName(p) })}
          </p>
          <ul class="pf-diff" id="pfDiff">
            {diffs.map((d) => (
              <li key={`${d.group}:${d.label}`}>
                <span>{d.label}:</span>
                <span class="num">
                  {d.from} → {d.to}
                </span>
              </li>
            ))}
          </ul>
          <div class="pf-actions">
            <button type="button" class="btn btn-ghost" id="pfConfNo" onClick={() => closePane(true)}>
              {t('profile.cancel')}
            </button>
            <button type="button" class="btn btn-primary" id="pfConfOk" ref={confOk} onClick={update}>
              {t('profile.confirmOk')}
            </button>
          </div>
        </div>
      )}
      {pane === 'form' && (
        <form class="pf-pane" id="pfForm" noValidate autocomplete="off" onSubmit={save}>
          <label class="pf-fl" for="pfNameIn">
            {t('profile.name')}
          </label>
          <input
            class="pf-in"
            id="pfNameIn"
            ref={nameIn}
            type="text"
            maxLength={PROFILE_NAME_MAX}
            placeholder={placeholder}
            spellcheck={false}
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
          <fieldset class="pf-grps" id="pfGrps">
            <legend>{t('profile.keep')}</legend>
            {PROFILE_GROUPS.map((g) => (
              <label class="cbx" key={g}>
                <input
                  type="checkbox"
                  value={g}
                  checked={groups.includes(g)}
                  onChange={(e) => {
                    const on = (e.target as HTMLInputElement).checked
                    setGroups((cur) => PROFILE_GROUPS.filter((x) => (x === g ? on : cur.includes(x))))
                  }}
                />
                <span class="box">
                  <Icon name="check" />
                </span>
                {groupLabel(g)}
              </label>
            ))}
          </fieldset>
          <p class="pf-note">{t('profile.note')}</p>
          <div class="pf-actions">
            <button type="button" class="btn btn-ghost" id="pfFormNo" onClick={() => closePane(true)}>
              {t('profile.cancel')}
            </button>
            <button type="submit" class="btn btn-primary" id="pfFormOk" disabled={groups.length === 0}>
              {t('profile.save')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
