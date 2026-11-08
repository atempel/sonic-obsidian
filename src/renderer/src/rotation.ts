export interface RotationConfig {
  enabled: boolean
  intervalSeconds: number
}

/**
 * Rotação automática por tempo. Não tem timer próprio: o loop de render
 * pergunta `due(now)` a cada quadro, e qualquer troca chama `restart(now)`.
 * Ligada/desligada e intervalo vêm do estado do Core (spec 008).
 */
export class AutoRotation {
  private startedAt: number

  constructor(
    now: number,
    private readonly config: () => RotationConfig
  ) {
    this.startedAt = now
  }

  /** true quando o intervalo venceu e a rotação está ligada. */
  due(now: number): boolean {
    const { enabled, intervalSeconds } = this.config()
    return enabled && now - this.startedAt >= intervalSeconds * 1000
  }

  /** Recomeça a contagem do zero (troca manual, automática ou mudança de ajuste). */
  restart(now: number): void {
    this.startedAt = now
  }

  /** Segundos até a próxima troca (para a faixa de controle, spec 009). */
  remaining(now: number): number {
    const { intervalSeconds } = this.config()
    return Math.max(0, intervalSeconds - (now - this.startedAt) / 1000)
  }
}
