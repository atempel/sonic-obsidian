import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { Icon } from './icons'
import { t } from '../i18n'
import { dismissUpdate, installUpdate, noticeVisible, onUpdate, openReleasePage, updateState } from '../update'

/** Re-renderiza quando o estado da atualização muda. */
export function useUpdateState(): ReturnType<typeof updateState> {
  const [, setV] = useState(0)
  useEffect(() => onUpdate(() => setV((x) => x + 1)), [])
  return updateState()
}

/**
 * Plaquinha de versão nova (spec 029) — design "Palco integrado", `v3-modelo-de-navegacao.md`
 * › Atualização automática (versão 1794603894-598c). Vive no `.strip-wrap`, acima da faixa, à
 * esquerda: aparece e some com a faixa, nunca no Modo limpo, com painel aberto, nem (abaixo de
 * 900 px) junto do aviso de preset pesado — essas regras ficam no CSS (`palco.css`).
 * Persistente: só some pelo clique ou por "Depois" (até a próxima abertura). Sem erro nem barra.
 */
export function UpdateNotice() {
  const s = useUpdateState()
  const on = noticeVisible(s)
  const version = s.version ?? ''
  const num = <span class="num">{version}</span>
  let body
  if (s.phase === 'installing') {
    body = (
      <span class="upd-in" key="installing">
        <span class="spin-ico">
          <Icon name="loader" />
        </span>
        <span class="upd-tx">{t('update.installing')}</span>
      </span>
    )
  } else if (s.phase === 'available') {
    body = (
      <span class="upd-in" key="available">
        <Icon name="circle-arrow-down" />
        <span class="upd-tx">{withNum(t('update.available', { version: '\u0000' }), num)}</span>
        <button type="button" class="btn btn-primary" onClick={openReleasePage}>
          {t('update.openPage')}
          <Icon name="external-link" small />
        </button>
        <button type="button" class="btn btn-ghost" onClick={dismissUpdate}>
          {t('update.later')}
        </button>
      </span>
    )
  } else {
    body = (
      <span class="upd-in" key="ready">
        <Icon name="circle-arrow-down" />
        <span class="upd-tx">{withNum(t('update.ready', { version: '\u0000' }), num)}</span>
        <button type="button" class="btn btn-ghost" onClick={openReleasePage}>
          {t('update.whatsNew')}
          <Icon name="external-link" small />
        </button>
        <button type="button" class="btn btn-primary" onClick={installUpdate}>
          {t('update.restart')}
        </button>
        <button type="button" class="btn btn-ghost" onClick={dismissUpdate}>
          {t('update.later')}
        </button>
      </span>
    )
  }
  return (
    <div class={on ? 'upd' : 'upd off'} role="status" aria-live="polite" aria-atomic="true" aria-hidden={!on || undefined}>
      {version ? body : null}
    </div>
  )
}

/** Põe o número da versão (mono) no lugar do marcador, mantendo a ordem da frase em cada idioma. */
function withNum(text: string, num: JSX.Element) {
  const [a, b] = text.split('\u0000')
  return (
    <>
      {a}
      {num}
      {b}
    </>
  )
}
