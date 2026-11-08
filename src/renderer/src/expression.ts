import type { Visualizer } from 'butterchurn'
import type { ExpressionAdaptation, ExpressionCurve } from './core/state'

/**
 * Expressividade (spike da spec 015): ajusta bass/mid/treb (e os `_att`) que os
 * presets recebem, DEPOIS da normalização do Butterchurn.
 *
 * Por que depois: o motor entrega `val = imm / longAvg` e `att = avg / longAvg`
 * (`src/audio/audioLevels.js`), com `longAvg` de ~4 s. O ganho sobe `imm` e
 * `longAvg` juntos, então o efeito some em segundos. Mexer depois da divisão
 * não é "comido" pela adaptação.
 *
 * Partes internas do Butterchurn 2.6.7: `visualizer.renderer.audioLevels`
 * (`updateAudioLevels(fps, frame)`, `imm`, `avg`, `val`, `att`). Envolvida na
 * instância, sem patch; se a estrutura não existir, nada muda.
 */
interface AudioLevelsInternals {
  updateAudioLevels(fps: number, frame: number): void
  imm: Float32Array
  avg: Float32Array
  val: Float32Array
  att: Float32Array
}

export interface ExpressionParams {
  /** −3 … +3; 0 = neutro (o motor como sempre). */
  level: number
  curve: ExpressionCurve
  adaptation: ExpressionAdaptation
}

/** Teto de saída: equações como `zoom = 1 + bass^3` explodem acima disso. */
const OUT_MAX = 4

/** Valores medidos no último quadro, para o HUD (bass antes → depois). */
export interface ExpressionProbe {
  bassIn: number
  bassOut: number
}

/** Limita a saída; NaN/infinito viram 1 (neutro): Math.min/max deixam NaN passar. */
const clampOut = (v: number): number => (Number.isFinite(v) ? Math.min(OUT_MAX, Math.max(0, v)) : 1)

const adjustRate = (rate: number, fps: number): number => Math.pow(rate, 30 / Math.min(144, Math.max(15, fps || 30)))

export function hookExpression(visualizer: Visualizer, params: () => ExpressionParams): ExpressionProbe | null {
  const renderer = (visualizer as unknown as { renderer?: { audioLevels?: Partial<AudioLevelsInternals> } }).renderer
  const al = renderer?.audioLevels
  if (
    !al ||
    typeof al.updateAudioLevels !== 'function' ||
    !(al.imm instanceof Float32Array) ||
    !(al.avg instanceof Float32Array) ||
    !(al.val instanceof Float32Array) ||
    !(al.att instanceof Float32Array)
  ) {
    console.warn('[expr] audioLevels do Butterchurn não encontrado: expressividade indisponível')
    return null
  }
  const levels = al as AudioLevelsInternals
  const original = levels.updateAudioLevels.bind(levels)
  const probe: ExpressionProbe = { bassIn: 1, bassOut: 1 }
  // Média longa própria (Adaptação lenta / travada).
  const longAvg = new Float32Array(3).fill(0)
  let longReady = false
  let lastAdaptation: ExpressionAdaptation = 'normal'

  levels.updateAudioLevels = (fps: number, frame: number) => {
    original(fps, frame)
    const p = params()

    // ── Adaptação ───────────────────────────────────────────
    if (p.adaptation !== 'normal') {
      if (!longReady || lastAdaptation === 'normal') {
        // Começa da média do motor (imm/val = longAvg do motor), sem salto.
        for (let i = 0; i < 3; i++) longAvg[i] = levels.val[i]! > 0 ? levels.imm[i]! / levels.val[i]! : levels.imm[i]!
        longReady = true
      }
      if (p.adaptation === 'slow') {
        const rate = adjustRate(0.999, fps) // ~33 s a 30 fps (o motor usa 0,992 ≈ 4 s)
        for (let i = 0; i < 3; i++) longAvg[i] = longAvg[i]! * rate + levels.imm[i]! * (1 - rate)
      }
      for (let i = 0; i < 3; i++) {
        if (!Number.isFinite(longAvg[i]!)) longAvg[i] = levels.imm[i]! // nunca deixa NaN se perpetuar
        const l = longAvg[i]!
        levels.val[i] = l < 0.001 ? 1 : clampOut(levels.imm[i]! / l)
        levels.att[i] = l < 0.001 ? 1 : clampOut(levels.avg[i]! / l)
      }
    }
    lastAdaptation = p.adaptation

    probe.bassIn = levels.val[0]!
    if (p.level !== 0) {
      // ── Curvas ────────────────────────────────────────────
      // A: só contraste em torno de 1.  B: contraste + offset.  C: B + nervoso/fluido.
      const k = Math.pow(2, p.level / 2) // −3 → 0,35×  ·  +3 → 2,83×
      const offset = p.curve === 'a' ? 0 : 0.15 * p.level
      const nervous = p.curve === 'c' ? p.level / 3 : 0 // > 0: att segue o imediato; < 0: val segue a média
      for (let i = 0; i < 3; i++) {
        let v = levels.val[i]!
        let a = levels.att[i]!
        if (nervous > 0) a = a + (v - a) * nervous * 0.5
        else if (nervous < 0) v = v + (a - v) * -nervous
        levels.val[i] = clampOut(1 + (v - 1) * k + offset)
        levels.att[i] = clampOut(1 + (a - 1) * k + offset)
      }
    }
    probe.bassOut = levels.val[0]!
  }
  return probe
}
