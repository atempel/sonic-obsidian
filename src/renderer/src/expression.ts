import type { Visualizer } from 'butterchurn'
import type { ExpressionAdaptation, ExpressionCurve } from './core/state'

/**
 * Expressividade (spec 015, corrigida na 028): ajusta bass/mid/treb (e os `_att`)
 * que os presets recebem, DEPOIS da normalização do Butterchurn.
 *
 * Por que depois: o motor entrega `val = imm / longAvg` e `att = avg / longAvg`
 * (`AudioLevels.updateAudioLevels`), com `longAvg` de ~4 s. O ganho sobe `imm` e
 * `longAvg` juntos, então o efeito some em segundos. Mexer depois da divisão
 * não é "comido" pela adaptação.
 *
 * Partes internas do Butterchurn: `visualizer.renderer.audioLevels`
 * (`updateAudioLevels(fps, frame)`, `imm`, `avg`, `val`, `att`, `longAvg`).
 * Envolvida na instância, sem patch; se a estrutura não existir, nada muda.
 *
 * Spec 028 (P0):
 * - **Semente da Memória** (Longa/Fixa): só depois do aquecimento do motor
 *   (quadro ≥ 50) e de ~2 s seguidos com som; vale a média de `imm` nesses 2 s.
 *   Antes disso, `val/att` passam como o motor entrega. A Fixa semeia de novo ao
 *   ser escolhida; a Longa semeia de novo ao voltar do silêncio e do Respiro.
 * - **Silêncio = zero**: com o app em repouso (`SilenceState.resting`), os presets
 *   recebem 0; a volta sai do zero em ~1 s, sem degrau.
 * - Saída sempre limitada a 0–4, também com Nível 0.
 *
 * Spec 028 (P1) — **Memória Viva** (`live`, teste A/B): a média própria segue `imm`
 * com constante de ~1,7 s (a janela curta do MilkDrop 2), em vez dos ~4 s do motor.
 * Semeia em 0,25 s de som e de novo ao voltar do silêncio/Respiro, como a Longa.
 */
interface AudioLevelsInternals {
  updateAudioLevels(fps: number, frame: number): void
  imm: Float32Array
  avg: Float32Array
  val: Float32Array
  att: Float32Array
  /** Média de ~4 s do motor (não existe em versões antigas). */
  longAvg?: Float32Array
}

export interface ExpressionParams {
  /** −3 … +3; 0 = neutro (o motor como sempre). */
  level: number
  curve: ExpressionCurve
  adaptation: ExpressionAdaptation
}

/** Estado do áudio fora do motor: o medidor de silêncio e o Respiro. */
export interface ExpressionEnv {
  /** RMS antes do ganho abaixo do limiar de silêncio agora (sem a carência de 3 s). */
  quiet: boolean
  /** Silêncio há ≥ 3 s (`SilenceState.resting`): os presets recebem zero. */
  resting: boolean
  /** Respiro (`Shift+Enter`): o visual está sem o áudio. */
  breath: boolean
}

/** Teto de saída: equações como `zoom = 1 + bass^3` explodem acima disso. */
export const OUT_MAX = 4
/** O motor aquece com taxa rápida até o quadro 50; a semente espera por isso. */
const ENGINE_WARMUP_FRAMES = 50
/** Som contínuo antes de semear a Memória. */
export const SEED_SECONDS = 2
/** Memória Viva: semente curta (a média logo se ajusta) e constante de tempo da média. */
export const LIVE_SEED_SECONDS = 0.25
export const LIVE_TAU_S = 1.7
/** Abaixo disto, `imm` (soma das raias da FFT) é zero na prática: a captura parou. */
const IMM_EPS = 1e-3
/** Rampa do silêncio: desce em ~0,3 s, volta em ~1 s. */
const SQUELCH_DOWN_S = 0.3
const SQUELCH_UP_S = 1

/** Valores medidos no último quadro, para o HUD e o log. */
export interface ExpressionProbe {
  /** bass depois da Memória, antes do Caráter. */
  bassIn: number
  /** bass que o preset recebe. */
  bassOut: number
  /** bass imediato do motor (soma das raias). */
  imm: number
  /** Média longa do motor (bass), ou NaN se o motor não a expõe. */
  engineLongAvg: number
  /** Média da Memória (bass); NaN em Curta ou antes da semente. */
  memLongAvg: number
  /** Memória Longa/Fixa esperando a semente (passa o motor como está). */
  seeding: boolean
  /** Fator do silêncio: 0 = presets em zero; 1 = normal. */
  squelch: number
  /** Acumuladores de bassOut com som (o main zera a cada amostra do log). */
  n: number
  sum: number
  sumSq: number
}

/** Limita a saída; NaN/infinito viram 1 (neutro): Math.min/max deixam NaN passar. */
const clampOut = (v: number): number => (Number.isFinite(v) ? Math.min(OUT_MAX, Math.max(0, v)) : 1)

const effFps = (fps: number): number => (Number.isFinite(fps) ? Math.min(144, Math.max(15, fps)) : 30)
const adjustRate = (rate: number, fps: number): number => Math.pow(rate, 30 / effFps(fps))

const QUIET_ENV: ExpressionEnv = { quiet: false, resting: false, breath: false }

export function hookExpression(
  visualizer: Visualizer,
  params: () => ExpressionParams,
  env: () => ExpressionEnv = () => QUIET_ENV
): ExpressionProbe | null {
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
  const probe: ExpressionProbe = {
    bassIn: 1,
    bassOut: 1,
    imm: 0,
    engineLongAvg: Number.NaN,
    memLongAvg: Number.NaN,
    seeding: false,
    squelch: 1,
    n: 0,
    sum: 0,
    sumSq: 0
  }
  // Média própria (Memória Longa/Fixa) e a janela de som que a semeia.
  const memAvg = new Float32Array(3)
  let seeded = false
  const seedSum = new Float64Array(3)
  let seedTime = 0
  let lastAdaptation: ExpressionAdaptation | null = null
  let wasAway = false // silêncio longo ou Respiro desde a última semente
  let squelch = 1

  const needSeed = (): void => {
    seeded = false
    seedSum.fill(0)
    seedTime = 0
  }

  levels.updateAudioLevels = (fps: number, frame: number) => {
    original(fps, frame)
    const p = params()
    const e = env()
    const dt = 1 / effFps(fps)
    const immSum = levels.imm[0]! + levels.imm[1]! + levels.imm[2]!
    const sound = !e.quiet && !e.resting && !e.breath && immSum > IMM_EPS
    const away = e.resting || e.breath

    // ── Memória (Adaptação) ─────────────────────────────────
    if (p.adaptation !== lastAdaptation) {
      // Escolher Longa/Fixa (ou abrir com ela) pede semente nova; Curta não usa a média própria.
      if (p.adaptation !== 'normal') needSeed()
      lastAdaptation = p.adaptation
    }
    if (away) wasAway = true
    else if (wasAway) {
      wasAway = false
      // Volta do silêncio/Respiro: a Longa e a Viva não reaproveitam a média de antes. A Fixa fica.
      if (p.adaptation === 'slow' || p.adaptation === 'live') needSeed()
    }
    if (p.adaptation !== 'normal') {
      if (!seeded) {
        // Junta a média de imm só com som; um buraco no som recomeça a janela.
        if (sound && frame >= ENGINE_WARMUP_FRAMES) {
          for (let i = 0; i < 3; i++) seedSum[i]! += levels.imm[i]! * dt
          seedTime += dt
          if (seedTime >= (p.adaptation === 'live' ? LIVE_SEED_SECONDS : SEED_SECONDS)) {
            for (let i = 0; i < 3; i++) memAvg[i] = seedSum[i]! / seedTime
            seeded = true
          }
        } else if (!sound && seedTime > 0) {
          seedSum.fill(0)
          seedTime = 0
        }
      } else {
        if (p.adaptation === 'slow' && sound) {
          const rate = adjustRate(0.999, fps) // ~33 s a 30 fps (o motor usa 0,992 ≈ 4 s)
          for (let i = 0; i < 3; i++) memAvg[i] = memAvg[i]! * rate + levels.imm[i]! * (1 - rate)
        } else if (p.adaptation === 'live' && sound) {
          const rate = Math.exp(-dt / LIVE_TAU_S)
          for (let i = 0; i < 3; i++) memAvg[i] = memAvg[i]! * rate + levels.imm[i]! * (1 - rate)
        }
        for (let i = 0; i < 3; i++) {
          if (!Number.isFinite(memAvg[i]!)) memAvg[i] = levels.imm[i]! // nunca deixa NaN se perpetuar
          const l = memAvg[i]!
          levels.val[i] = l < 0.001 ? 1 : levels.imm[i]! / l
          levels.att[i] = l < 0.001 ? 1 : levels.avg[i]! / l
        }
      }
    }
    for (let i = 0; i < 3; i++) {
      levels.val[i] = clampOut(levels.val[i]!)
      levels.att[i] = clampOut(levels.att[i]!)
    }

    probe.bassIn = levels.val[0]!
    if (p.level !== 0) {
      // ── Caráter (curvas) ──────────────────────────────────
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

    // ── Silêncio = zero (squelch) ───────────────────────────
    const target = e.resting ? 0 : 1
    if (target < squelch) squelch = Math.max(0, squelch - dt / SQUELCH_DOWN_S)
    else if (target > squelch) squelch = Math.min(1, squelch + dt / SQUELCH_UP_S)
    if (squelch < 1) {
      for (let i = 0; i < 3; i++) {
        levels.val[i] = levels.val[i]! * squelch
        levels.att[i] = levels.att[i]! * squelch
      }
    }

    probe.bassOut = levels.val[0]!
    probe.imm = levels.imm[0]!
    probe.engineLongAvg = levels.longAvg instanceof Float32Array ? levels.longAvg[0]! : Number.NaN
    probe.memLongAvg = p.adaptation !== 'normal' && seeded ? memAvg[0]! : Number.NaN
    probe.seeding = p.adaptation !== 'normal' && !seeded
    probe.squelch = squelch
    if (sound) {
      probe.n++
      probe.sum += probe.bassOut
      probe.sumSq += probe.bassOut * probe.bassOut
    }
  }
  return probe
}
