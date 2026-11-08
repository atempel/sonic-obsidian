import { render } from 'preact'
import type { Core } from '../core/commands'

/**
 * Raiz da interface v3 por cima do visual (specs 009–012). Por enquanto vazia:
 * só prova o build do Preact. Regra (DECISIONS "UI do overlay"): nada que muda
 * a cada quadro passa por aqui — medidor e progresso atualizam o DOM direto.
 */
export function Overlay(_props: { core: Core }) {
  return null
}

export function mountOverlay(el: HTMLElement, core: Core): void {
  render(<Overlay core={core} />, el)
}
