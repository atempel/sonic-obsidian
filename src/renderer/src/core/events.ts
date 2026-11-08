/** Emissor de eventos tipado e mínimo. */
export class Emitter<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<(payload: never) => void>>()

  on<K extends keyof Events>(name: K, fn: (payload: Events[K]) => void): () => void {
    let set = this.listeners.get(name)
    if (!set) this.listeners.set(name, (set = new Set()))
    set.add(fn as (payload: never) => void)
    return () => this.off(name, fn)
  }

  off<K extends keyof Events>(name: K, fn: (payload: Events[K]) => void): void {
    this.listeners.get(name)?.delete(fn as (payload: never) => void)
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    const set = this.listeners.get(name)
    if (!set) return
    for (const fn of set) {
      try {
        ;(fn as (p: Events[K]) => void)(payload)
      } catch (err) {
        console.error(`[events] erro num ouvinte de ${String(name)}`, err)
      }
    }
  }
}
