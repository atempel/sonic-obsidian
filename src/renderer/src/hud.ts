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
  /** Memória JS do renderer (MB), para ver crescimento em sessões longas. */
  heapMb?: number
  /** Spec 024: BPM, confiança, compassos e custo da detecção. */
  beat?: string
  /** Spec 026: custo da última compilação do Estúdio. */
  studio?: string
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
      `${s.fps.toFixed(0)} fps (${s.fpsMode})${s.heapMb ? ` · heap ${s.heapMb} MB` : ''} · áudio: ${s.audio} · nível ${bars}\n` +
      `${s.preset}\n` +
      `${s.presetCount} presets · rotação ${s.rotation} · ganho ${s.gainDb > 0 ? '+' : ''}${s.gainDb.toFixed(1)} dB\n` +
      `${s.expression ?? 'expressividade indisponível'}\n` +
      `${s.beat ?? 'beat: aguardando'}\n` +
      (s.studio ? `${s.studio}\n` : '') +
      `→ ← presets · + − 0 expressividade · X caráter · Shift+X memória · B ↑↓ transição · T modo limpo · Espaço aleatório · Enter segurar`
  }
}
