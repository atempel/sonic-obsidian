const INTERVALS_S = [10, 15, 30, 60, 120]
const DEFAULT_INDEX = 2 // 30 s

/**
 * Rotação automática por tempo. Não tem timer próprio: o loop de render
 * pergunta `due(now)` a cada quadro, e qualquer troca chama `restart(now)`.
 */
export class AutoRotation {
  private index = DEFAULT_INDEX
  private startedAt: number
  paused = false

  constructor(now: number) {
    this.startedAt = now
  }

  get intervalSeconds(): number {
    return INTERVALS_S[this.index]!
  }

  /** true quando o intervalo venceu e a rotação não está pausada. */
  due(now: number): boolean {
    return !this.paused && now - this.startedAt >= this.intervalSeconds * 1000
  }

  /** Recomeça a contagem do zero (troca manual, automática ou retomada). */
  restart(now: number): void {
    this.startedAt = now
  }

  togglePause(now: number): boolean {
    this.paused = !this.paused
    this.restart(now)
    return this.paused
  }

  /** Passo para o intervalo menor (-1) ou maior (+1), dentro da lista. */
  step(direction: -1 | 1, now: number): number {
    this.index = Math.min(INTERVALS_S.length - 1, Math.max(0, this.index + direction))
    this.restart(now)
    return this.intervalSeconds
  }
}
