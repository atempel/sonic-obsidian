export interface HudState {
  fps: number
  preset: string
  presetCount: number
  rotation: string
  fpsMode: string
  gainDb: number
  audio: string
  level: number
  /** Spike 015: nível, curva, adaptação e bass antes → depois. */
  expression?: string
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
      `${s.expression ?? 'expressividade indisponível'}\n` +
      `→ ← presets · + − 0 expressividade · X curva · Shift+X adaptação · Shift+↑↓ ganho · B ↑↓ transição · Espaço aleatório`
  }
}
