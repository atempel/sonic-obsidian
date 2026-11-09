import { prepareShader, processUnOptimizedShader, splitPreset } from 'milkdrop-preset-utils'
import { convertHLSLShader } from 'hlslparser-js'
import { fixPreparedHeader, parenthesizeHlsl } from './hlsl-fix'

/**
 * `.milk` → preset do Butterchurn 3 (spike 006), no processo main.
 *
 * Fica aqui, e não no renderer, porque o conversor HLSL (`hlslparser-js`, Emscripten) usa
 * `new Function` ao inicializar, o que a CSP do renderer com o motor 3 (sem 'unsafe-eval')
 * proíbe. Entra texto, sai texto: equações como EEL bruto (`*_eel`, compiladas para WASM pelo
 * motor) e shaders GLSL. Nenhum campo `*_str` (JavaScript) é gerado.
 */
const MAX_BYTES = 256 * 1024

async function convertShader(src: string): Promise<string> {
  if (!src) return ''
  // Parênteses explícitos antes do conversor: contorno do bug de a*b*c → && (hlsl-fix.ts).
  const full = fixPreparedHeader(prepareShader(parenthesizeHlsl(src))).replace('float4 shader_body (', 'float4 main_shader_sentinel (')
  const out = await convertHLSLShader(full, 'main_shader_sentinel', 'fs')
  if (!out) throw new Error('o conversor HLSL não gerou o shader')
  return processUnOptimizedShader(out)
}

export async function milkToPreset3(text: unknown): Promise<Record<string, unknown>> {
  if (typeof text !== 'string') throw new Error('.milk precisa ser texto')
  if (text.length > MAX_BYTES) throw new Error(`.milk maior que ${MAX_BYTES / 1024} KB`)
  const p = splitPreset(text.replace(/\r\n?/g, '\n'))
  const [warp, comp] = await Promise.all([convertShader(p.warp), convertShader(p.comp)])
  return {
    version: 2,
    baseVals: p.baseVals,
    init_eqs_eel: p.presetInit,
    frame_eqs_eel: p.perFrame,
    pixel_eqs_eel: p.perVertex,
    shapes: p.shapes.map((s) => ({ baseVals: s.baseVals, init_eqs_eel: s.init_eqs_str, frame_eqs_eel: s.frame_eqs_str })),
    waves: p.waves.map((w) => ({ baseVals: w.baseVals, init_eqs_eel: w.init_eqs_str, frame_eqs_eel: w.frame_eqs_str, point_eqs_eel: w.point_eqs_str })),
    warp,
    comp
  }
}
