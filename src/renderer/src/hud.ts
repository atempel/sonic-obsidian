export interface HudState {
  fps: number
  preset: string
  presetCount: number
  rotation: string
  fpsMode: string
  gainDb: number
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
      `${s.fps.toFixed(0)} fps (${s.fpsMode}) · áudio: ${s.audio} · nível ${bars}\n` +
      `${s.preset}\n` +
      `${s.presetCount} presets · rotação ${s.rotation} · ganho ${s.gainDb > 0 ? '+' : ''}${s.gainDb.toFixed(1)} dB\n` +
      `→ próximo · ← anterior · Espaço aleatório · R rotação · [ ] intervalo · + − 0 ganho · F ou F11 tela cheia`
  }
}
