/**
 * Curva por frequência (spec 040): um EQ de 16 bandas que não mexe no som, só no quanto
 * cada faixa de frequência mexe o visual. Módulo puro (sem imports): os testes headless o
 * transpilam sozinho.
 *
 * Como a curva chega ao motor (razão por zona, DECISIONS 2026-11-23): um `AnalyserNode`
 * próprio (FFT 4096) mede, em cada zona do motor (`bass`/`mid`/`treb`), a razão
 * `r = Σ m·e·g / Σ m·e` entre a energia pesada pela curva e a sem peso (`m` = magnitude da
 * raia, `e` = o `equalize` do motor naquela frequência, `g` = ganho da curva). Antes do
 * `updateAudioLevels` do motor, as raias do `freqArray` dele em cada zona são multiplicadas
 * pela razão da zona. Curva plana → `g = 1` → `r = 1`: o motor intacto.
 */

/** Centros das 16 bandas ISO de 2/3 de oitava (Hz). */
export const CURVE_BANDS = [20, 31.5, 50, 80, 125, 200, 315, 500, 800, 1250, 2000, 3150, 5000, 8000, 12500, 20000] as const
export const CURVE_DB_MIN = -12
export const CURVE_DB_MAX = 12
/** Predefinições na ordem do segmentado; `custom` só aparece depois de uma edição à mão. */
export const CURVE_PRESETS = ['flat', 'lows', 'mids', 'highs', 'smile'] as const
export type CurvePresetId = (typeof CURVE_PRESETS)[number]
export const CURVE_PRESET_IDS = [...CURVE_PRESETS, 'custom'] as const
export type CurvePreset = (typeof CURVE_PRESET_IDS)[number]

/** dB por banda, de 20 Hz a 20 kHz (design, `v3-reatividade.md`). */
export const CURVE_PRESET_VALUES: Record<CurvePresetId, readonly number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  lows: [6, 6, 5, 4, 2, 0, -2, -3, -3, -3, -3, -3, -3, -3, -3, -3],
  mids: [-3, -3, -3, -2, 0, 2, 4, 5, 5, 4, 2, 0, -2, -3, -3, -3],
  highs: [-3, -3, -3, -3, -3, -3, -2, -1, 0, 1, 2, 4, 5, 6, 6, 5],
  smile: [5, 5, 4, 3, 1, 0, -2, -3, -3, -2, 0, 1, 3, 4, 5, 5]
}

/** Uma banda presa em −12…+12 e inteira. */
export const clampDb = (v: number): number => Math.max(CURVE_DB_MIN, Math.min(CURVE_DB_MAX, Math.round(v)))

export const flatCurve = (): number[] => new Array<number>(CURVE_BANDS.length).fill(0)

export const isFlat = (curve: readonly number[]): boolean => curve.every((v) => v === 0)

/**
 * Sanitização (spec 040): lista com tamanho errado ou valor que não é número → plana;
 * número fora da faixa → preso na faixa e arredondado.
 */
export function sanitizeCurve(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length !== CURVE_BANDS.length) return flatCurve()
  if (!raw.every((v) => typeof v === 'number' && Number.isFinite(v))) return flatCurve()
  return (raw as number[]).map(clampDb)
}

/**
 * Curva e predefinição salvas (spec 040). Uma predefinição nomeada que não bate com a curva
 * vira a que bate ou `custom`; uma curva inválida abre plana (e a predefinição, `flat`).
 */
export function sanitizeCurveState(rawCurve: unknown, rawPreset: unknown): { curve16: number[]; curvePreset: CurvePreset } {
  const curve16 = sanitizeCurve(rawCurve)
  const valid = Array.isArray(rawCurve) && rawCurve.length === CURVE_BANDS.length && rawCurve.every((v) => typeof v === 'number' && Number.isFinite(v))
  if (!valid) return { curve16, curvePreset: 'flat' }
  let curvePreset: CurvePreset = (CURVE_PRESET_IDS as readonly unknown[]).includes(rawPreset) ? (rawPreset as CurvePreset) : 'custom'
  if (curvePreset !== 'custom' && !CURVE_PRESET_VALUES[curvePreset].every((v, i) => v === curve16[i])) curvePreset = matchPreset(curve16) ?? 'custom'
  if (rawPreset === undefined) curvePreset = matchPreset(curve16) ?? 'custom'
  return { curve16, curvePreset }
}

/** Rótulo curto da banda: "20", "31.5", "1.25k", "20k" (o separador decimal vem de quem chama). */
export function bandLabel(hz: number, decimal = '.'): string {
  const s = hz >= 1000 ? `${+(hz / 1000).toFixed(2)}k` : `${hz}`
  return s.replace('.', decimal)
}

const LOG_BANDS = CURVE_BANDS.map((f) => Math.log(f))

/** Ganho da curva em dB numa frequência: interpolado sobre log(f), constante fora de 20 Hz–20 kHz. */
export function gainDbAt(curve: readonly number[], hz: number): number {
  const n = CURVE_BANDS.length
  if (!(hz > CURVE_BANDS[0])) return curve[0] ?? 0
  if (hz >= CURVE_BANDS[n - 1]!) return curve[n - 1] ?? 0
  const lf = Math.log(hz)
  let i = 0
  while (i < n - 2 && lf > LOG_BANDS[i + 1]!) i++
  const t = (lf - LOG_BANDS[i]!) / (LOG_BANDS[i + 1]! - LOG_BANDS[i]!)
  return curve[i]! + (curve[i + 1]! - curve[i]!) * t
}

/** Onde o motor corta as zonas e como ele pesa as raias. */
export interface EngineZones {
  sampleRate: number
  /** Largura de uma raia do motor (Hz): `sampleRate / 1024` no Butterchurn. */
  engineBinHz: number
  /** Raias do motor: zona z = [starts[z], stops[z]). */
  starts: readonly number[]
  stops: readonly number[]
}

/** Zonas do Butterchurn 3 (`AudioLevels`): 20, 320, 2 800 e 11 025 Hz em raias de `sr / 1024`. */
export function engineZones(sampleRate: number): EngineZones {
  const binHz = sampleRate / 1024
  const bin = (hz: number): number => Math.max(0, Math.min(511, Math.round(hz / binHz) - 1))
  const [a, b, c, d] = [bin(20), bin(320), bin(2800), bin(11025)]
  return { sampleRate, engineBinHz: binHz, starts: [a, b, c], stops: [b, c, d] }
}

/** `equalize` do MilkDrop/Butterchurn (`-0,02·ln((512 − i) / 512)`) na frequência `hz`. */
export function engineEqualize(z: EngineZones, hz: number): number {
  const i = Math.min(hz, z.stops[2]! * z.engineBinHz) / z.engineBinHz
  return -0.02 * Math.log(Math.max(1e-6, (512 - i) / 512))
}

/** Pesos por raia do analisador próprio, recalculados quando a curva muda. */
export interface CurveWeights {
  /** Zona da raia (0, 1, 2) ou −1 (abaixo do começo do `bass`). */
  zone: Int8Array
  /** `equalize` do motor na raia. */
  eq: Float32Array
  /** `equalize · ganho da curva` na raia. */
  eqGain: Float32Array
}

/**
 * Pesos para um analisador com `bins` raias de `binHz` Hz. A zona `treb` vai até o fim do
 * espectro (som acima de 11 kHz sobe o `treb` quando as barras de 12,5k/20k sobem).
 */
export function buildWeights(curve: readonly number[], z: EngineZones, binHz: number, bins: number): CurveWeights {
  const zone = new Int8Array(bins)
  const eq = new Float32Array(bins)
  const eqGain = new Float32Array(bins)
  // Fronteira no meio entre as raias do motor: um tom cai na zona da raia mais perto dele.
  const lo = (z.starts[0]! - 0.5) * z.engineBinHz
  const e1 = (z.starts[1]! - 0.5) * z.engineBinHz
  const e2 = (z.starts[2]! - 0.5) * z.engineBinHz
  for (let k = 0; k < bins; k++) {
    const hz = k * binHz
    zone[k] = hz < lo ? -1 : hz < e1 ? 0 : hz < e2 ? 1 : 2
    const e = engineEqualize(z, hz)
    eq[k] = e
    eqGain[k] = e * Math.pow(10, gainDbAt(curve, hz) / 20)
  }
  return { zone, eq, eqGain }
}

/** Energia abaixo disto numa zona = zona muda → razão 1. */
const ZONE_EPS = 1e-9

/**
 * Razão por zona a partir das magnitudes lineares do analisador (`mags[k]` ≥ 0).
 * Zona sem energia → 1. Grava em `out` (3 valores) e o devolve.
 */
export function zoneRatios(mags: ArrayLike<number>, w: CurveWeights, out: Float32Array = new Float32Array(3)): Float32Array {
  let n0 = 0
  let n1 = 0
  let n2 = 0
  let d0 = 0
  let d1 = 0
  let d2 = 0
  const len = Math.min(mags.length, w.zone.length)
  for (let k = 0; k < len; k++) {
    const m = mags[k]!
    if (!(m > 0)) continue
    const zn = w.zone[k]!
    if (zn === 0) {
      n0 += m * w.eqGain[k]!
      d0 += m * w.eq[k]!
    } else if (zn === 1) {
      n1 += m * w.eqGain[k]!
      d1 += m * w.eq[k]!
    } else if (zn === 2) {
      n2 += m * w.eqGain[k]!
      d2 += m * w.eq[k]!
    }
  }
  out[0] = d0 > ZONE_EPS ? n0 / d0 : 1
  out[1] = d1 > ZONE_EPS ? n1 / d1 : 1
  out[2] = d2 > ZONE_EPS ? n2 / d2 : 1
  return out
}

/** Converte a leitura em dB do `AnalyserNode` (`getFloatFrequencyData`) para magnitudes lineares, no lugar. */
export function dbToMagInPlace(buf: Float32Array): Float32Array {
  for (let k = 0; k < buf.length; k++) {
    const v = buf[k]!
    buf[k] = Number.isFinite(v) ? Math.pow(10, v / 20) : 0
  }
  return buf
}

/** Multiplica as raias do `freqArray` do motor de cada zona pela razão dela. */
export function scaleEngineBins(freq: Float32Array, z: EngineZones, r: ArrayLike<number>): void {
  for (let zn = 0; zn < 3; zn++) {
    const k = r[zn]!
    if (k === 1 || !Number.isFinite(k)) continue
    const stop = Math.min(freq.length, z.stops[zn]!)
    for (let i = z.starts[zn]!; i < stop; i++) freq[i] = freq[i]! * k
  }
}

/** A predefinição cujos valores são iguais à curva, ou `null`. */
export function matchPreset(curve: readonly number[]): CurvePresetId | null {
  for (const id of CURVE_PRESETS) if (CURVE_PRESET_VALUES[id].every((v, i) => v === curve[i])) return id
  return null
}
