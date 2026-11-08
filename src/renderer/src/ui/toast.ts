/** Toast global do Palco (centro, 128 px acima da base; protótipo v3: 3,2 s). */
type Listener = (text: string, ms: number) => void
const listeners = new Set<Listener>()

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
export function showToast(text: string, ms = 3200, opts: ToastOptions = {}): void {
  if (!opts.force) {
    const { toasts, clean } = policy()
    if (toasts === 'none') return
    if ((toasts === 'important' || clean) && !opts.important) return
  }
  for (const fn of listeners) fn(text, ms)
}

export function onToast(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
