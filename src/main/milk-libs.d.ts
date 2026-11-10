// Tipos mínimos dos pacotes do conversor .milk (spike 006); nenhum publica tipos próprios.

declare module 'milkdrop-preset-utils' {
  export interface MilkParts {
    presetVersion: number
    baseVals: Record<string, number>
    presetInit: string
    perFrame: string
    perVertex: string
    shapes: { baseVals: Record<string, number>; init_eqs_str: string; frame_eqs_str: string }[]
    waves: { baseVals: Record<string, number>; init_eqs_str: string; frame_eqs_str: string; point_eqs_str: string }[]
    warp: string
    comp: string
  }
  export function splitPreset(text: string): MilkParts
  export function prepareShader(shader: string): string
  export function processUnOptimizedShader(shader: string): string
}

declare module 'hlslparser-js' {
  export function convertHLSLShader(shader: string, entryName: string, shaderType: 'fs' | 'vs'): Promise<string>
}
