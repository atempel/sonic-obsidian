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
  /** Spec 040: curva por frequência e a razão por zona aplicada (`curve smile r 1.12 0.95 1.30`). */
  curve?: string
  /** Memória JS do renderer (MB), para ver crescimento em sessões longas. */
  heapMb?: number
  /** Spec 024: BPM, confiança, compassos e custo da detecção. */
  beat?: string
  /** Spec 032: partes do atraso do som até a tela que o app conhece. */
  sync?: string
  /** Spec 026: custo da última compilação do Estúdio. */
  studio?: string
  /** Spec 027: ondas e formas ligadas no motor (lido de volta dele). */
  studioSlots?: string
  /** Spec 027, fatia 4: "Comparar com o original" ligado e o mínimo de fps. */
  studioCompare?: string
  error?: string
}

/** HUD de diagnóstico (Ctrl+Shift+D): sempre em inglês, como o log (spec 030) — vai para issues. */
export class Hud {
  constructor(private readonly el: HTMLElement) {}

  show(s: HudState): void {
    if (s.error) {
      this.el.textContent = `ERROR: ${s.error}`
      return
    }
    const bars = '█'.repeat(Math.min(20, Math.round(s.level * 40))).padEnd(20, '·')
    this.el.textContent =
      `${s.fps.toFixed(0)} fps (${s.fpsMode})${s.heapMb ? ` · heap ${s.heapMb} MB` : ''} · audio: ${s.audio} · level ${bars}\n` +
      `${s.preset}\n` +
      `${s.presetCount} presets · rotation ${s.rotation} · gain ${s.gainDb > 0 ? '+' : ''}${s.gainDb.toFixed(1)} dB\n` +
      `${s.expression ?? 'expressiveness unavailable'}\n` +
      (s.curve ? `${s.curve}\n` : '') +
      `${s.beat ?? 'beat: waiting'}\n` +
      (s.sync ? `${s.sync}\n` : '') +
      (s.studio ? `${s.studio}\n` : '') +
      (s.studioSlots ? `${s.studioSlots}\n` : '') +
      (s.studioCompare ? `${s.studioCompare}\n` : '') +
      `→ ← presets · + − 0 expressiveness · X character · Shift+X memory · B ↑↓ transition · T clean mode · Space random · Enter hold`
  }
}
