export interface HudState {
  fps: number
  preset: string
  audio: string
  level: number
  error?: string
}

export class Hud {
  constructor(private readonly el: HTMLElement) {}

  show(s: HudState): void {
    if (s.error) {
      this.el.textContent = `ERRO: ${s.error}`
      return
    }
    const bars = '█'.repeat(Math.min(20, Math.round(s.level * 40))).padEnd(20, '·')
    this.el.textContent =
      `${s.fps.toFixed(0)} fps · áudio: ${s.audio} · nível ${bars}\n` +
      `${s.preset}\n` +
      `Espaço: próximo · F11: tela cheia · F12: devtools`
  }
}
