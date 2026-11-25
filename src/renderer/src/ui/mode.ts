/**
 * Modo de interface (spec 039): quanto da casca aparece. Quem lê o modo fora do Preact
 * (a lista de comandos da busca, o CSS pelo `body[data-mode]`) passa por aqui; o
 * `main.ts` aplica o valor salvo a cada mudança de estado.
 */
import type { UiMode } from '../core/state'

let current: UiMode = 'full'

export const uiMode = (): UiMode => current
export const isSimple = (): boolean => current === 'simple'

export function applyUiMode(mode: UiMode): void {
  current = mode
  if (document.body.dataset.mode !== mode) document.body.dataset.mode = mode
}
