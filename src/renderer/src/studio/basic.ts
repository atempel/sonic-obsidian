import type { MessageKey } from '../i18n'

/**
 * Aba Básico do Estúdio (spec 027, fatia 1) — os 18 parâmetros base (`baseVals`) do protótipo
 * `Sonic Obsidian Estúdio completo (027).html`, com as faixas dele. Padrões = os do Butterchurn 3
 * (`baseValsDefaults`), usados quando o preset não traz o valor.
 */
export type BasicKind = 'slider' | 'switch' | 'select'
export interface BasicParam {
  key: string
  label: MessageKey
  kind: BasicKind
  min: number
  max: number
  step: number
  /** Casas decimais mostradas. */
  dec: number
  def: number
}
export interface BasicGroup {
  title: MessageKey
  params: BasicParam[]
}

const slider = (key: string, label: MessageKey, min: number, max: number, step: number, dec: number, def: number): BasicParam => ({ key, label, kind: 'slider', min, max, step, dec, def })
const sw = (key: string, label: MessageKey): BasicParam => ({ key, label, kind: 'switch', min: 0, max: 1, step: 1, dec: 0, def: 0 })

/** `wave_mode` 0–7, na ordem do MilkDrop. */
export const WAVE_MODES: MessageKey[] = [
  'studio.basic.wave.mode0',
  'studio.basic.wave.mode1',
  'studio.basic.wave.mode2',
  'studio.basic.wave.mode3',
  'studio.basic.wave.mode4',
  'studio.basic.wave.mode5',
  'studio.basic.wave.mode6',
  'studio.basic.wave.mode7'
]

export const BASIC_GROUPS: BasicGroup[] = [
  {
    title: 'studio.basic.motion',
    params: [
      slider('zoom', 'studio.basic.zoom', 0.9, 1.1, 0.001, 3, 1),
      slider('rot', 'studio.basic.rot', -0.5, 0.5, 0.005, 3, 0),
      slider('warp', 'studio.basic.warp', 0, 5, 0.01, 2, 1),
      slider('cx', 'studio.basic.cx', 0, 1, 0.01, 2, 0.5),
      slider('cy', 'studio.basic.cy', 0, 1, 0.01, 2, 0.5)
    ]
  },
  {
    title: 'studio.basic.trail',
    params: [
      slider('decay', 'studio.basic.decay', 0.9, 1, 0.001, 3, 0.98),
      slider('echo_zoom', 'studio.basic.echoZoom', 0.5, 2, 0.01, 2, 2),
      slider('echo_alpha', 'studio.basic.echoAlpha', 0, 1, 0.01, 2, 0),
      slider('gammaadj', 'studio.basic.gamma', 1, 4, 0.05, 2, 2)
    ]
  },
  {
    title: 'studio.basic.wave',
    params: [
      { key: 'wave_mode', label: 'studio.basic.waveMode', kind: 'select', min: 0, max: 7, step: 1, dec: 0, def: 0 },
      slider('wave_a', 'studio.basic.waveA', 0, 1, 0.01, 2, 0.8),
      slider('wave_r', 'studio.basic.red', 0, 1, 0.01, 2, 1),
      slider('wave_g', 'studio.basic.green', 0, 1, 0.01, 2, 1),
      slider('wave_b', 'studio.basic.blue', 0, 1, 0.01, 2, 1)
    ]
  },
  {
    title: 'studio.basic.effects',
    params: [sw('brighten', 'studio.basic.brighten'), sw('darken', 'studio.basic.darken'), sw('solarize', 'studio.basic.solarize'), sw('invert', 'studio.basic.invert')]
  }
]

export const BASIC_PARAMS: BasicParam[] = BASIC_GROUPS.flatMap((g) => g.params)

/** Valor que o motor usa: o do preset, ou o padrão. */
export function baseValue(baseVals: unknown, p: BasicParam): number {
  const v = baseVals && typeof baseVals === 'object' ? (baseVals as Record<string, unknown>)[p.key] : undefined
  return typeof v === 'number' && Number.isFinite(v) ? v : p.def
}

/**
 * "Erro impossível": só valores válidos. Fora da faixa do controle ou não finito → preso
 * à faixa (que já inclui o valor original do preset); inteiros para select e switch.
 */
export function clampParam(p: BasicParam, v: number, range: { min: number; max: number } = p): number {
  if (!Number.isFinite(v)) return p.def
  const c = Math.min(range.max, Math.max(range.min, v))
  if (p.kind !== 'slider') return Math.round(c)
  // Corta o ruído do float do input range (0.30000000000000004).
  return Number(c.toFixed(Math.max(p.dec, 3)))
}

/** Faixa do controle, alargada para caber o valor do preset (sem esconder o que ele tem). */
export function rangeFor(p: BasicParam, original: number): { min: number; max: number } {
  return { min: Math.min(p.min, original), max: Math.max(p.max, original) }
}
