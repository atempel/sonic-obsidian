/**
 * Normalizar áudio (spec 028 P1, revisto pela spec 046): ganho automático lento antes do motor.
 *
 * Normaliza por faixa, não por trecho: ouve o nível médio (RMS) dos últimos ~45 s, medido ANTES de
 * qualquer ganho, e leva o volume que entra no visual até uma referência. Não comprime: um break de
 * 16 s guarda quase todo o contraste com o drop; só a diferença entre faixas some.
 * - baixar (ataque) em ~4 s; subir (soltura) em ~10 s; teto de +18 dB (spec 033: o volume do
 *   Windows costuma deixar o loopback em −24 a −33 dBFS) e piso de −12 dB;
 * - estouro: os últimos ~3 s, já com o ganho, passam de 4 dB acima da referência → baixa em ~0,7 s
 *   e recomeça a janela longa por esse trecho (faixa nova, mais alta; não satura o visual);
 * - silêncio de ≥ 1,5 s (troca de faixa com pausa) → ao voltar o som, recomeça a janela longa,
 *   mantendo o ganho;
 * - congela no silêncio e no Respiro (nem mede, nem mexe), para não "bombear"; o Respiro não
 *   recomeça a janela.
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
  windowS: 45,
  attackS: 4,
  releaseS: 10,
  maxDb: 18,
  minDb: -12,
  /** Janela curta do estouro (s). */
  shortS: 3,
  /** Estouro: a janela curta, com o ganho, passa disso acima da referência (dB). */
  burstDb: 4,
  /** Ataque do estouro (s). */
  burstS: 0.7,
  /** Silêncio a partir disso (s) é troca de faixa: a janela longa recomeça na volta do som. */
  trackGapS: 1.5,
  /** Com o AGC ligado, o ganho manual vira ajuste fino de ±6 dB. */
  fineDb: 6,
  /** Antes disso de som medido, o AGC não mexe (uma leitura isolada é um bumbo ou um vão). */
  minMeasureS: 0.5
} as const

/** Ganho manual que vale: com o AGC ligado, limitado ao ajuste fino. */
export const manualDb = (gainDb: number, autoGain: boolean): number =>
  autoGain ? Math.max(-AGC.fineDb, Math.min(AGC.fineDb, gainDb)) : gainDb

/** Por que congelar: `quiet` = silêncio (conta para a troca de faixa); `breath` = Respiro (só congela). */
export type AgcHold = { quiet: boolean; breath: boolean }

export class AutoGain {
  /** Ganho automático em vigor (dB). */
  gainDb = 0
  /** Nível medido na janela longa (dBFS RMS), ou −∞ sem medida. */
  levelDb = Number.NEGATIVE_INFINITY
  /** Quantas vezes a janela longa recomeçou (estouro ou troca de faixa); para o simulador. */
  restarts = 0
  private readonly pow: Float64Array
  private readonly dur: Float64Array
  private head = 0
  private count = 0
  private sumPow = 0
  private sumDur = 0
  /** A janela curta são as `shortCount` leituras mais novas do mesmo buffer. */
  private shortCount = 0
  private shortPow = 0
  private shortDur = 0
  private quietS = 0

  constructor(capacity = 1024) {
    this.pow = new Float64Array(capacity)
    this.dur = new Float64Array(capacity)
  }

  /** Segundos de som na janela longa (para o simulador). */
  get windowDur(): number {
    return this.sumDur
  }

  /**
   * Uma leitura do medidor. `rms` linear antes do ganho; `dt` em segundos desde a
   * anterior; `hold` = silêncio e/ou Respiro. Devolve o ganho automático (dB).
   */
  step(rms: number, dt: number, hold: AgcHold): number {
    if (!Number.isFinite(rms) || !(dt > 0)) return this.gainDb
    // Janela pausada (rAF parado) não vira um salto: no máximo meio segundo por leitura.
    const d = Math.min(0.5, dt)
    if (hold.breath) return this.gainDb
    if (hold.quiet) {
      this.quietS += d
      return this.gainDb
    }
    if (this.quietS >= AGC.trackGapS) this.restart(0)
    this.quietS = 0
    this.push(rms * rms, d)
    if (this.sumDur < AGC.minMeasureS || this.sumPow <= 0) return this.gainDb
    let tau: number
    let level: number
    const shortDb = this.shortPow > 0 && this.shortDur >= AGC.minMeasureS ? 10 * Math.log10(this.shortPow / this.shortDur) : Number.NEGATIVE_INFINITY
    if (shortDb + this.gainDb > AGC.targetDb + AGC.burstDb) {
      // Estouro: faixa nova mais alta. A janela longa recomeça pelo trecho curto.
      this.restart(this.shortCount)
      level = shortDb
      tau = AGC.burstS
    } else {
      level = 10 * Math.log10(this.sumPow / this.sumDur)
      tau = 0
    }
    this.levelDb = level
    const target = Math.max(AGC.minDb, Math.min(AGC.maxDb, AGC.targetDb - level))
    if (!tau) tau = target < this.gainDb ? AGC.attackS : AGC.releaseS
    this.gainDb += (target - this.gainDb) * (1 - Math.exp(-d / tau))
    return this.gainDb
  }

  /** Volta ao zero (AGC desligado): a próxima vez começa a medir de novo. */
  reset(): void {
    this.gainDb = 0
    this.levelDb = Number.NEGATIVE_INFINITY
    this.quietS = 0
    this.restarts = 0
    this.restart(0)
  }

  /** Recomeça a janela longa guardando só as `keep` leituras mais novas (0 = vazia). O ganho fica. */
  private restart(keep: number): void {
    if (keep <= 0) {
      this.head = this.count = this.shortCount = 0
      this.sumPow = this.sumDur = this.shortPow = this.shortDur = 0
    } else {
      while (this.count > keep) this.drop()
    }
    this.restarts++
  }

  /** Soma ponderada pelo tempo: a janela é em segundos, não em leituras. */
  private push(p: number, d: number): void {
    const cap = this.pow.length
    if (this.count === cap) this.drop()
    const i = (this.head + this.count) % cap
    this.pow[i] = p * d
    this.dur[i] = d
    this.count++
    this.sumPow += p * d
    this.sumDur += d
    this.shortCount++
    this.shortPow += p * d
    this.shortDur += d
    while (this.count > 1 && this.sumDur - this.dur[this.head]! >= AGC.windowS) this.drop()
    while (this.shortCount > 1) {
      const j = (this.head + this.count - this.shortCount) % cap
      if (this.shortDur - this.dur[j]! < AGC.shortS) break
      this.shortPow -= this.pow[j]!
      this.shortDur -= this.dur[j]!
      this.shortCount--
    }
    // Erro de ponto flutuante acumulado nunca deixa a soma negativa.
    if (this.sumPow < 0) this.sumPow = 0
    if (this.shortPow < 0) this.shortPow = 0
  }

  private drop(): void {
    if (this.shortCount === this.count) {
      // A janela longa chegou na curta (só com o buffer cheio): a leitura sai das duas.
      this.shortPow -= this.pow[this.head]!
      this.shortDur -= this.dur[this.head]!
      this.shortCount--
    }
    this.sumPow -= this.pow[this.head]!
    this.sumDur -= this.dur[this.head]!
    this.head = (this.head + 1) % this.pow.length
    this.count--
  }
}
