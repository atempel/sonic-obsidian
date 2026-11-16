import type { Preset } from 'butterchurn'
import type { BasicParam } from './basic'
import type { SlotBlock, SlotCheck, SlotIndex } from './eel-worker'
import type { MessageKey } from '../i18n'

/**
 * Ondas e Formas do Estúdio (spec 027, fatia 2) — 4 slots de cada, como no MilkDrop e no
 * protótipo `Sonic Obsidian Estúdio completo (027).html`. Cada slot guarda o formato do
 * Butterchurn 3 (`baseVals` + `init_eqs_eel`/`frame_eqs_eel`/`point_eqs_eel`); a interface edita
 * "Ativa", os parâmetros do protótipo e os blocos `per_frame`/`per_point`. O `init` do slot e os
 * outros parâmetros (cor, espessura…) seguem como vieram do preset.
 */
export interface WaveSlot {
  baseVals: Record<string, number>
  init_eqs_eel: string
  frame_eqs_eel: string
  point_eqs_eel: string
}
export interface ShapeSlot {
  baseVals: Record<string, number>
  init_eqs_eel: string
  frame_eqs_eel: string
}
export interface Slots {
  waves: WaveSlot[]
  shapes: ShapeSlot[]
}
export type SlotKind = 'wave' | 'shape'
export const SLOT_COUNT = 4
export const SLOT_INDEXES: SlotIndex[] = [0, 1, 2, 3]

/** Padrões do Butterchurn 3 (`waveBaseValsDefaults` / `shapeBaseValsDefaults`). */
export const WAVE_DEFAULTS: Record<string, number> = { enabled: 0, samples: 512, sep: 0, scaling: 1, smoothing: 0.5, r: 1, g: 1, b: 1, a: 1, spectrum: 0, usedots: 0, thick: 0, additive: 0 }
export const SHAPE_DEFAULTS: Record<string, number> = {
  enabled: 0,
  sides: 4,
  additive: 0,
  thickoutline: 0,
  textured: 0,
  num_inst: 1,
  tex_zoom: 1,
  tex_ang: 0,
  x: 0.5,
  y: 0.5,
  rad: 0.1,
  ang: 0,
  r: 1,
  g: 0,
  b: 0,
  a: 1,
  r2: 0,
  g2: 1,
  b2: 0,
  a2: 0,
  border_r: 1,
  border_g: 1,
  border_b: 1,
  border_a: 0.1
}

const slider = (key: string, label: MessageKey, min: number, max: number, step: number, dec: number, def: number): BasicParam => ({ key, label, kind: 'slider', min, max, step, dec, def })
const sw = (key: string, label: MessageKey): BasicParam => ({ key, label, kind: 'switch', min: 0, max: 1, step: 1, dec: 0, def: 0 })

/** Controles de cada slot, com as faixas do protótipo. */
export const WAVE_PARAMS: BasicParam[] = [
  slider('samples', 'studio.slot.samples', 2, 512, 1, 0, WAVE_DEFAULTS.samples!),
  slider('sep', 'studio.slot.sep', 0, 256, 1, 0, WAVE_DEFAULTS.sep!),
  sw('spectrum', 'studio.slot.spectrum')
]
export const SHAPE_PARAMS: BasicParam[] = [
  slider('sides', 'studio.slot.sides', 3, 100, 1, 0, SHAPE_DEFAULTS.sides!),
  slider('rad', 'studio.slot.rad', 0, 3, 0.01, 2, SHAPE_DEFAULTS.rad!),
  slider('ang', 'studio.slot.ang', 0, 6.28, 0.01, 2, SHAPE_DEFAULTS.ang!),
  sw('textured', 'studio.slot.textured')
]

const nums = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {}
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x
  return out
}
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Os 4 + 4 slots do preset, completando com slots desligados (o motor desenha sempre 4 de cada). */
export function slotsOf(p: Preset): Slots {
  const ws = Array.isArray(p.waves) ? (p.waves as unknown[]) : []
  const ss = Array.isArray(p.shapes) ? (p.shapes as unknown[]) : []
  const rec = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {})
  return {
    waves: SLOT_INDEXES.map((i) => {
      const w = rec(ws[i])
      return { baseVals: nums(w.baseVals), init_eqs_eel: str(w.init_eqs_eel), frame_eqs_eel: str(w.frame_eqs_eel), point_eqs_eel: str(w.point_eqs_eel) }
    }),
    shapes: SLOT_INDEXES.map((i) => {
      const s = rec(ss[i])
      return { baseVals: nums(s.baseVals), init_eqs_eel: str(s.init_eqs_eel), frame_eqs_eel: str(s.frame_eqs_eel) }
    })
  }
}

/** Valor que o motor usa para um parâmetro do slot: o do preset, ou o padrão. */
export function slotValue(kind: SlotKind, baseVals: Record<string, number>, key: string): number {
  const v = baseVals[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : (kind === 'wave' ? WAVE_DEFAULTS : SHAPE_DEFAULTS)[key] ?? 0
}

export const slotOn = (kind: SlotKind, baseVals: Record<string, number>): boolean => slotValue(kind, baseVals, 'enabled') !== 0

/**
 * Preserva o resto do slot como veio do preset (chaves extras, como `usedots`), trocando só
 * `baseVals` e as equações.
 */
export function writeSlots(p: Preset, s: Slots): void {
  const orig = (arr: unknown, i: number): Record<string, unknown> => {
    const x = Array.isArray(arr) ? (arr as unknown[])[i] : undefined
    return x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
  }
  p.waves = s.waves.map((w, i) => ({ ...orig(p.waves, i), ...structuredClone(w) }))
  p.shapes = s.shapes.map((x, i) => ({ ...orig(p.shapes, i), ...structuredClone(x) }))
}

/** Ondas e formas ligadas, no formato da checagem do Worker. */
export function slotChecks(p: Preset): SlotCheck[] {
  const s = slotsOf(p)
  const out: SlotCheck[] = []
  for (const i of SLOT_INDEXES) {
    const w = s.waves[i]!
    if (slotOn('wave', w.baseVals)) out.push({ kind: 'wave', idx: i, base: { ...WAVE_DEFAULTS, ...w.baseVals }, init: w.init_eqs_eel, frame: w.frame_eqs_eel, point: w.point_eqs_eel })
  }
  for (const i of SLOT_INDEXES) {
    const x = s.shapes[i]!
    if (slotOn('shape', x.baseVals)) out.push({ kind: 'shape', idx: i, base: { ...SHAPE_DEFAULTS, ...x.baseVals }, init: x.init_eqs_eel, frame: x.frame_eqs_eel })
  }
  return out
}

/** `wave1_point` → `wave_1_per_point` (o nome do bloco no `.milk` e no protótipo). */
export function slotBlockTitle(b: SlotBlock): string {
  const m = /^(wave|shape)(\d)_(frame|point)$/.exec(b)!
  return `${m[1]}_${m[2]}_per_${m[3]}`
}

/** De que slot é o bloco. */
export function slotOfBlock(b: SlotBlock): { kind: SlotKind; idx: SlotIndex; field: 'frame' | 'point' } {
  const m = /^(wave|shape)(\d)_(frame|point)$/.exec(b)!
  return { kind: m[1] as SlotKind, idx: Number(m[2]) as SlotIndex, field: m[3] as 'frame' | 'point' }
}
