/**
 * Normalizar áudio (spec 028, P1): ganho automático lento antes do motor.
 *
 * Ouve o nível médio (RMS) dos últimos ~10 s, medido ANTES de qualquer ganho, e
 * leva o volume que entra no visual até uma referência. Não comprime: dentro da
 * janela, o break e o drop continuam diferentes; só a diferença entre faixas some.
 * - baixar (ataque) em ~1 s; subir (soltura) em ~8 s; teto de +12 dB;
 * - congela no silêncio e no Respiro (nem mede, nem mexe), para não "bombear".
 *
 * Sem DOM nem Web Audio: o main chama `step` a cada leitura do medidor (~10×/s)
 * e aplica `gainDb` no `GainNode`. Assim o simulador (tests/sim/agc-sim.cjs) roda
 * a mesma conta em Node.
 */
export const AGC = {
  /**
   * Referência (dBFS RMS). Perto de uma faixa atual tocando com a normalização
   * do Spotify (−14 LUFS). A calibrar no Windows pelo HUD (critério 7).
   */
  targetDb: -14,
  windowS: 10,
  attackS: 1,
  releaseS: 8,
  maxDb: 12,
  minDb: -12,
  /** Com o AGC ligado, o ganho manual vira ajuste fino de ±6 dB. */
  fineDb: 6,
  /** Antes disso de som medido, o AGC não mexe (uma leitura isolada é um bumbo ou um vão). */
  minMeasureS: 0.5
} as const

/** Ganho manual que vale: com o AGC ligado, limitado ao ajuste fino. */
export const manualDb = (gainDb: number, autoGain: boolean): number =>
  autoGain ? Math.max(-AGC.fineDb, Math.min(AGC.fineDb, gainDb)) : gainDb

export class AutoGain {
  /** Ganho automático em vigor (dB). */
  gainDb = 0
  /** Nível medido na janela (dBFS RMS), ou −∞ sem medida. */
  levelDb = Number.NEGATIVE_INFINITY
  private readonly pow: Float64Array
  private readonly dur: Float64Array
  private head = 0
  private count = 0
  private sumPow = 0
  private sumDur = 0

  constructor(capacity = 1024) {
    this.pow = new Float64Array(capacity)
    this.dur = new Float64Array(capacity)
  }

  /**
   * Uma leitura do medidor. `rms` linear antes do ganho; `dt` em segundos desde a
   * anterior; `frozen` = silêncio ou Respiro. Devolve o ganho automático (dB).
   */
  step(rms: number, dt: number, frozen: boolean): number {
    if (frozen || !Number.isFinite(rms) || !(dt > 0)) return this.gainDb
    // Janela pausada (rAF parado) não vira um salto: no máximo meio segundo por leitura.
    const d = Math.min(0.5, dt)
    this.push(rms * rms, d)
    if (this.sumDur < AGC.minMeasureS || this.sumPow <= 0) return this.gainDb
    this.levelDb = 10 * Math.log10(this.sumPow / this.sumDur)
    const target = Math.max(AGC.minDb, Math.min(AGC.maxDb, AGC.targetDb - this.levelDb))
    const tau = target < this.gainDb ? AGC.attackS : AGC.releaseS
    this.gainDb += (target - this.gainDb) * (1 - Math.exp(-d / tau))
    return this.gainDb
  }

  /** Volta ao zero (AGC desligado): a próxima vez começa a medir de novo. */
  reset(): void {
    this.gainDb = 0
    this.levelDb = Number.NEGATIVE_INFINITY
    this.head = this.count = 0
    this.sumPow = this.sumDur = 0
  }

  /** Soma ponderada pelo tempo: a janela é em segundos, não em leituras. */
  private push(p: number, d: number): void {
    const cap = this.pow.length
    const i = (this.head + this.count) % cap
    if (this.count === cap) {
      this.drop()
      return this.push(p, d)
    }
    this.pow[i] = p * d
    this.dur[i] = d
    this.count++
    this.sumPow += p * d
    this.sumDur += d
    while (this.count > 1 && this.sumDur - this.dur[this.head]! >= AGC.windowS) this.drop()
    // Erro de ponto flutuante acumulado nunca deixa a soma negativa.
    if (this.sumPow < 0) this.sumPow = 0
  }

  private drop(): void {
    this.sumPow -= this.pow[this.head]!
    this.sumDur -= this.dur[this.head]!
    this.head = (this.head + 1) % this.pow.length
    this.count--
  }
}
