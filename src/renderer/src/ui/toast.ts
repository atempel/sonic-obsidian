/** Toast global do Palco (centro, 128 px acima da base; protótipo v3: 3,2 s). */
type Listener = (text: string, ms: number) => void
const listeners = new Set<Listener>()

export function showToast(text: string, ms = 3200): void {
  for (const fn of listeners) fn(text, ms)
}

export function onToast(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
