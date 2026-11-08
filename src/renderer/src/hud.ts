export interface HudState {
  fps: number
  preset: string
  presetCount: number
  blend: number
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
      `${s.presetCount} presets · blend ${s.blend} s\n` +
      `→ próximo · ← anterior · R/Espaço aleatório · 1/2/3 blend 0/2/5 s · F11 tela cheia`
  }
}
