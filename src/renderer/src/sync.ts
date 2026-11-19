/**
 * Sincronia do visual com o som (spec 032): intervalos entre quadros desenhados e a linha
 * `sync` do HUD/log. Em inglês, como o resto do HUD e do log (spec 030).
 */

/** Intervalo acima disto é pausa (janela oculta, rAF parado), não queda de fps. */
const PAUSE_MS = 2000

export class FrameStats {
  private recent: { at: number; dt: number }[] = []
  private longDts: number[] = []
  private last = Number.NaN

  constructor(private readonly windowMs = 5000) {}

  /** Chamar a cada quadro desenhado. */
  frame(now: number): void {
    const dt = now - this.last
    this.last = now
    if (!(dt > 0) || dt > PAUSE_MS) return
    this.recent.push({ at: now, dt })
    while (this.recent.length && now - this.recent[0]!.at > this.windowMs) this.recent.shift()
    this.longDts.push(dt)
  }

  /** Média e p95 dos últimos `windowMs`. */
  get avg(): number {
    if (!this.recent.length) return Number.NaN
    return this.recent.reduce((s, x) => s + x.dt, 0) / this.recent.length
  }

  get p95(): number {
    return p95(this.recent.map((x) => x.dt))
  }

  /** p95 e maior intervalo desde a última chamada (log a cada 5 min); recomeça a contagem. */
  takeLong(): { p95: number; max: number; n: number } {
    const d = this.longDts
    this.longDts = []
    return { p95: p95(d), max: d.length ? Math.max(...d) : Number.NaN, n: d.length }
  }
}

function p95(values: number[]): number {
  if (!values.length) return Number.NaN
  const s = [...values].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]!
}

export interface SyncParts {
  /** Latência da captura informada pelo Chromium (ms), ou NaN. */
  captureMs: number
  /** `AudioContext.baseLatency` (ms). */
  ctxMs: number
  /** Metade da janela de análise do Butterchurn (ms). */
  windowMs: number
  frameAvgMs: number
  frameP95Ms: number
  /** `cap 60` ou `monitor`. */
  cap: string
  /** O atraso aplicado no DelayNode, lido de volta dele (ms). */
  delayMs: number
  /** "Adiantar o visual" da spec 024 (ms). */
  leadMs: number
}

/** Soma do que o app conhece: captura + ctx + janela + 1,5 quadro + atraso. */
export function estimateMs(p: SyncParts): number {
  const known = (v: number): number => (Number.isFinite(v) ? v : 0)
  return known(p.captureMs) + known(p.ctxMs) + known(p.windowMs) + 1.5 * known(p.frameAvgMs) + known(p.delayMs)
}

export function syncLine(p: SyncParts): string {
  const ms = (v: number): string => (Number.isFinite(v) ? `${Math.round(v)} ms` : '? ms')
  const frame = Number.isFinite(p.frameAvgMs) ? `${p.frameAvgMs.toFixed(1)}/${p.frameP95Ms.toFixed(1)} ms` : '? ms'
  return (
    `sync · capture ${ms(p.captureMs)} · ctx ${ms(p.ctxMs)} · window ${ms(p.windowMs)} · frame ${frame} · ${p.cap}` +
    ` · delay ${ms(p.delayMs)} · lead ${ms(p.leadMs)} · est ${ms(estimateMs(p))}`
  )
}
