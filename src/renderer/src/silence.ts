/**
 * Estado de silêncio (spec 005, P1). Mede o RMS antes do ganho, para o
 * limiar não depender do ajuste do usuário.
 * - após VISUAL_DELAY_MS sem som: o visual desacelera e escurece (rampa de ~1 s);
 * - após NOTICE_DELAY_MS: aviso "Nenhum som chegando" (protótipo v3, Setup › "Sem som por 10 s");
 * - som de volta: tudo retorna em ~1 s e o aviso some.
 */
const RMS_THRESHOLD = 0.0005 // ~ -66 dBFS: pausa no player dá silêncio digital
const VISUAL_DELAY_MS = 3000
const NOTICE_DELAY_MS = 10000
const RAMP_SECONDS = 1
export const SILENT_SPEED = 0.15
export const SILENT_DIM = 0.35 // opacidade da camada preta (≈ 65% do brilho)

export class SilenceState {
  private quietSince: number | null = null
  /** 1 = velocidade normal; desce até SILENT_SPEED em silêncio. */
  speed = 1

  update(rms: number, now: number): void {
    if (rms >= RMS_THRESHOLD) this.quietSince = null
    else if (this.quietSince === null) this.quietSince = now
  }

  /** Abaixo do limiar agora, sem a carência (spec 028: a semente da Memória só conta som). */
  get quiet(): boolean {
    return this.quietSince !== null
  }

  get resting(): boolean {
    return this.quietSince !== null && performance.now() - this.quietSince >= VISUAL_DELAY_MS
  }

  get showNotice(): boolean {
    return this.quietSince !== null && performance.now() - this.quietSince >= NOTICE_DELAY_MS
  }

  /** Avança a rampa de velocidade e devolve o fator para este quadro. */
  step(dtSeconds: number): number {
    const target = this.resting ? SILENT_SPEED : 1
    const delta = ((1 - SILENT_SPEED) * dtSeconds) / RAMP_SECONDS
    this.speed = target < this.speed ? Math.max(target, this.speed - delta) : Math.min(target, this.speed + delta)
    return this.speed
  }
}
