/**
 * Toast global do Palco (centro, 128 px acima da base). M13 (design 1794175739-7509):
 * vive 4 s, pausa com o mouse em cima, e um aviso novo troca o texto no lugar.
 */
type Listener = (text: string) => void
const listeners = new Set<Listener>()

/** Tempo de vida do toast (M13). */
export const TOAST_MS = 4000

export interface ToastOptions {
  /** Falhas e ações da IA (Fase 4): passam por "Só importantes" e pelo Modo limpo (spec 014). */
  important?: boolean
  /** Sempre aparece (ex.: a confirmação do próprio Modo limpo). */
  force?: boolean
}

/** Quem decide o que aparece: `settings.overlayText` (ligado pelo main.ts). */
let policy: () => { toasts: 'all' | 'important' | 'none'; clean: boolean } = () => ({ toasts: 'all', clean: false })

export function setToastPolicy(fn: typeof policy): void {
  policy = fn
}

/** Toasts de resposta a tecla (ganho, rotação, transição, favoritos) não são importantes. */
export function showToast(text: string, opts: ToastOptions = {}): void {
  if (!opts.force) {
    const { toasts, clean } = policy()
    if (toasts === 'none') return
    if ((toasts === 'important' || clean) && !opts.important) return
  }
  for (const fn of listeners) fn(text)
}

export function onToast(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
