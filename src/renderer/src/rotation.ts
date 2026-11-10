export interface RotationConfig {
  enabled: boolean
  intervalSeconds: number
  /** Visual segurado (`Enter`, spec 024): nada troca sozinho. */
  held: boolean
  /** Trocar no beat (spec 024): compassos de 4 batidas em vez de segundos. */
  onBeat: boolean
  bars: number
}

/**
 * Rotação automática. Não tem timer próprio: o loop de render pergunta `due(now)` a cada
 * quadro, e qualquer troca chama `restart(now)`. Ligada/desligada e intervalo vêm do estado
 * do Core (spec 008).
 *
 * Em compassos (spec 024): com "Trocar no beat" e a batida travada no momento da troca, a
 * contagem é de batidas (`beat()` a cada uma) e a troca cai na batida que completa
 * `bars × 4`. Se a batida se perde, a contagem passa a segundos desde a última troca; quando
 * ela volta, os compassos valem a partir da troca seguinte.
 */
export class AutoRotation {
  private startedAt: number
  private beats = 0
  private inBars = false

  constructor(
    now: number,
    private readonly config: () => RotationConfig,
    /** A batida está travada agora? */
    private readonly beatLocked: () => boolean
  ) {
    this.startedAt = now
  }

  /** Contando compassos agora (a faixa mostra "6 c"). */
  get barsMode(): boolean {
    return this.inBars && this.config().onBeat && this.beatLocked()
  }

  /** Batida perdida: segue em segundos até a próxima troca. */
  beatLost(): void {
    this.inBars = false
  }

  /** Avisa uma batida (só chega com a batida travada). */
  beat(): void {
    if (this.inBars) this.beats++
  }

  /** true quando o intervalo venceu, a rotação está ligada e o visual não está segurado. */
  due(now: number): boolean {
    const { enabled, intervalSeconds, held, bars } = this.config()
    if (!enabled || held) return false
    if (this.barsMode) return this.beats >= bars * 4
    return now - this.startedAt >= intervalSeconds * 1000
  }

  /** Recomeça a contagem do zero (troca manual, automática, mudança de ajuste ou soltar o visual). */
  restart(now: number): void {
    this.startedAt = now
    this.beats = 0
    this.inBars = this.config().onBeat && this.beatLocked()
  }

  /** Congela a contagem por `ms` (silêncio ou captura recusada: a rotação espera o som). */
  hold(ms: number): void {
    this.startedAt += ms
  }

  /** Segundos até a próxima troca (para a faixa de controle, spec 009). */
  remaining(now: number): number {
    const { intervalSeconds } = this.config()
    return Math.max(0, intervalSeconds - (now - this.startedAt) / 1000)
  }

  /** Compassos que faltam (arredondado para cima), em compassos. */
  barsRemaining(): number {
    const { bars } = this.config()
    return Math.max(0, Math.ceil((bars * 4 - this.beats) / 4))
  }

  /** Fração já percorrida do intervalo (0–1), para a linha da faixa. */
  progress(now: number): number {
    const { intervalSeconds, bars } = this.config()
    if (this.barsMode) return Math.min(1, this.beats / (bars * 4))
    return Math.min(1, Math.max(0, (now - this.startedAt) / (intervalSeconds * 1000)))
  }

  /** Batidas desde a última troca (HUD). */
  get beatsSinceRestart(): number {
    return this.beats
  }
}
