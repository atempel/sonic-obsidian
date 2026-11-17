/**
 * Código `.milk` do Estúdio (spec 027, fatia 6): o texto do MilkDrop 2 gerado a partir do preset
 * em edição, como no protótipo (`gen()` da página do Estúdio). O caminho de volta (texto → preset)
 * é o mesmo da importação: o conversor do main (`milkToPreset3`). Aqui não há rede nem eval.
 *
 * Os shaders não têm volta de GLSL para HLSL: o `.milk` leva o HLSL que veio da fonte (`hlsl`),
 * ou nenhum shader quando não há fonte.
 */

export interface Hlsl {
  warp: string
  comp: string
}

/**
 * Nome no `.milk` de cada parâmetro do preset (o inverso do mapa de `milkdrop-preset-utils`).
 * Só os que mudam de nome; os outros saem como estão (`zoom`, `rot`, `wave_r`…), que o conversor
 * lê igual (ele compara sem caixa).
 */
const MAIN_KEYS: Record<string, string> = {
  rating: 'fRating',
  gammaadj: 'fGammaAdj',
  decay: 'fDecay',
  echo_zoom: 'fVideoEchoZoom',
  echo_alpha: 'fVideoEchoAlpha',
  echo_orient: 'nVideoEchoOrientation',
  wave_mode: 'nWaveMode',
  additivewave: 'bAdditiveWaves',
  wave_dots: 'bWaveDots',
  wave_thick: 'bWaveThick',
  modwavealphabyvolume: 'bModWaveAlphaByVolume',
  wave_brighten: 'bMaximizeWaveColor',
  wrap: 'bTexWrap',
  darken_center: 'bDarkenCenter',
  red_blue: 'bRedBlueStereo',
  brighten: 'bBrighten',
  darken: 'bDarken',
  solarize: 'bSolarize',
  invert: 'bInvert',
  wave_a: 'fWaveAlpha',
  wave_scale: 'fWaveScale',
  wave_smoothing: 'fWaveSmoothing',
  wave_mystery: 'fWaveParam',
  modwavealphastart: 'fModWaveAlphaStart',
  modwavealphaend: 'fModWaveAlphaEnd',
  warpanimspeed: 'fWarpAnimSpeed',
  warpscale: 'fWarpScale',
  zoomexp: 'fZoomExponent',
  fshader: 'fShader',
  mv_x: 'nMotionVectorsX',
  mv_y: 'nMotionVectorsY'
}
/** Ondas (`wavecode_N_…`): `thick` precisa do nome longo (no conversor, `thick` sozinho é o contorno das formas). */
const WAVE_KEYS: Record<string, string> = { spectrum: 'bSpectrum', usedots: 'bUseDots', thick: 'bDrawThick', additive: 'bAdditive' }
/** Formas (`shapecode_N_…`). */
const SHAPE_KEYS: Record<string, string> = { thickoutline: 'thickOutline' }

/** Inteiros no `.milk` (o MilkDrop grava estes sem casas). */
const INTS = new Set([
  'echo_orient',
  'wave_mode',
  'additivewave',
  'wave_dots',
  'wave_thick',
  'modwavealphabyvolume',
  'wave_brighten',
  'wrap',
  'darken_center',
  'red_blue',
  'brighten',
  'darken',
  'solarize',
  'invert',
  'enabled',
  'samples',
  'sep',
  'spectrum',
  'usedots',
  'thick',
  'additive',
  'sides',
  'thickoutline',
  'textured',
  'num_inst'
])

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const num = (key: string, v: number): string => (INTS.has(key) ? String(Math.round(v)) : Number.isInteger(v) ? v.toFixed(6) : String(Number(v.toFixed(6))))

function vals(raw: unknown, names: Record<string, string>, prefix: string, out: string[]): void {
  if (!isObj(raw)) return
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && Number.isFinite(v)) out.push(`${prefix}${names[k] ?? k}=${num(k, v)}`)
}

/**
 * Um bloco de equações vira `prefixo1=…`, `prefixo2=…`. As linhas em branco do meio ficam
 * (`per_frame_3=`), para o texto das outras abas não mudar ao passar pelo `.milk`.
 */
function eqs(prefix: string, text: unknown, out: string[]): void {
  const lines = String(text ?? '').split('\n')
  while (lines.length && lines[lines.length - 1]!.trim() === '') lines.pop()
  lines.forEach((line, i) => out.push(`${prefix}${i + 1}=${line}`))
}

/** Shader HLSL: cada linha vira `warp_N=\`…` (a crase marca o começo da linha, como no MilkDrop 2). */
function shader(prefix: string, text: string, out: string[]): void {
  let n = 0
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) out.push(`${prefix}_${++n}=\`${line}`)
}

/** O `.milk` do preset. `hlsl` = os shaders da fonte; sem ela, o arquivo sai sem shaders. */
export function presetToMilk(p: Record<string, unknown>, hlsl: Hlsl | null): string {
  const L = ['[preset00]']
  vals(p.baseVals, MAIN_KEYS, '', L)
  const waves = Array.isArray(p.waves) ? p.waves : []
  waves.forEach((w, i) => {
    if (!isObj(w)) return
    vals(w.baseVals, WAVE_KEYS, `wavecode_${i}_`, L)
    eqs(`wave_${i}_init`, w.init_eqs_eel, L)
    eqs(`wave_${i}_per_frame`, w.frame_eqs_eel, L)
    eqs(`wave_${i}_per_point`, w.point_eqs_eel, L)
  })
  const shapes = Array.isArray(p.shapes) ? p.shapes : []
  shapes.forEach((s, i) => {
    if (!isObj(s)) return
    vals(s.baseVals, SHAPE_KEYS, `shapecode_${i}_`, L)
    eqs(`shape_${i}_init`, s.init_eqs_eel, L)
    eqs(`shape_${i}_per_frame`, s.frame_eqs_eel, L)
  })
  eqs('per_frame_init_', p.init_eqs_eel, L)
  eqs('per_frame_', p.frame_eqs_eel, L)
  eqs('per_pixel_', p.pixel_eqs_eel, L)
  const head = ['MILKDROP_PRESET_VERSION=201', 'PSVERSION=2', `PSVERSION_WARP=${hlsl?.warp.trim() ? 2 : 0}`, `PSVERSION_COMP=${hlsl?.comp.trim() ? 2 : 0}`]
  if (hlsl?.warp.trim()) shader('warp', hlsl.warp, L)
  if (hlsl?.comp.trim()) shader('comp', hlsl.comp, L)
  return [...head, ...L].join('\n') + '\n'
}

/** Os shaders HLSL de um `.milk` (as linhas `warp_N=` e `comp_N=`, na ordem do número). */
export function milkShaders(text: string): Hlsl {
  const sec: Record<'warp' | 'comp', [number, string][]> = { warp: [], comp: [] }
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const m = /^(warp|comp)_(\d+)=(.*)$/i.exec(raw)
    if (!m) continue
    sec[m[1]!.toLowerCase() as 'warp' | 'comp'].push([Number(m[2]), m[3]!.replace(/^`/, '')])
  }
  const join = (x: [number, string][]): string =>
    x
      .sort((a, b) => a[0] - b[0])
      .map((y) => y[1])
      .join('\n')
  return { warp: join(sec.warp), comp: join(sec.comp) }
}
