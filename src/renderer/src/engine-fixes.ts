import type { Visualizer } from 'butterchurn'

/**
 * Correção de vazamento no Butterchurn 2.6.7 (sem patch no pacote).
 *
 * A cada `loadPreset`, o renderer troca `warpShader`/`compShader` com os `prev*`
 * e chama `updateShader`, que faz `createShader`: um programa WebGL novo (com
 * 2 shaders) por objeto, sem nunca apagar o anterior (o bundle tem 15
 * `createProgram` e 1 `deleteProgram`). Com rotação a cada 30 s, são ~240
 * programas por hora presos à GPU até o coletor de lixo passar, e ele não vê a
 * memória da GPU.
 *
 * Aqui, cada um dos 4 objetos (warp, comp e os `prev*`) apaga o próprio
 * programa antigo logo depois de criar o novo. O programa antigo de um objeto
 * não está em uso: ao trocar, esse objeto era o `prev` de dois presets atrás.
 */
interface ShaderHolder {
  createShader(text?: string): void
  shaderProgram?: WebGLProgram | null
}

interface RendererInternals {
  gl?: WebGL2RenderingContext
  warpShader?: ShaderHolder
  prevWarpShader?: ShaderHolder
  compShader?: ShaderHolder
  prevCompShader?: ShaderHolder
}

export function hookShaderCleanup(visualizer: Visualizer): boolean {
  const r = (visualizer as unknown as { renderer?: RendererInternals }).renderer
  const gl = r?.gl
  const holders = [r?.warpShader, r?.prevWarpShader, r?.compShader, r?.prevCompShader]
  if (!gl || holders.some((h) => !h || typeof h.createShader !== 'function')) {
    console.warn('[viz] shaders do Butterchurn não encontrados: limpeza de programas desligada')
    return false
  }
  for (const holder of holders as ShaderHolder[]) {
    const original = holder.createShader.bind(holder)
    holder.createShader = (text?: string) => {
      const old = holder.shaderProgram
      original(text)
      if (!old || old === holder.shaderProgram) return
      const shaders = gl.getAttachedShaders(old) ?? []
      gl.deleteProgram(old) // adiado pelo WebGL se ainda estiver em uso
      for (const s of shaders) gl.deleteShader(s)
    }
  }
  return true
}

/**
 * Onda em pontos invisível no Windows (relato de 2026-11-10: "Hyperspace - kaleidoscope" e
 * "Snapshot Of Space (LSB mix)" ficavam pretos). O vertex shader da onda principal do
 * Butterchurn 3 (`BasicWaveform`) desenha `gl.POINTS` com `wave_dots` sem escrever
 * `gl_PointSize`; pela especificação o tamanho fica indefinido: o SwiftShader desenha 1 px, o
 * ANGLE sobre Direct3D não desenha nada. Aqui, todo vertex shader GLSL ES 3.00 que não escreve
 * `gl_PointSize` passa a escrever 1.0 (o ponto de 1 px do MilkDrop) no começo do `main`. Fora de
 * `gl.POINTS` o valor é ignorado. Vale para todos os contextos WebGL 2 da página (principal e
 * de teste). Sem patch no pacote.
 */
export function fixPointSize(): void {
  const proto = WebGL2RenderingContext.prototype as WebGL2RenderingContext & { __soPointSize?: boolean }
  if (proto.__soPointSize) return
  proto.__soPointSize = true
  const original = proto.shaderSource
  proto.shaderSource = function (this: WebGL2RenderingContext, shader: WebGLShader, source: string): void {
    original.call(this, shader, withPointSize(this, shader, source))
  }
}

/** Exportada para o teste: o texto como o motor manda, já corrigido. */
export function withPointSize(gl: WebGL2RenderingContext, shader: WebGLShader, source: string): string {
  if (!/^\s*#version 300 es/.test(source) || /\bgl_PointSize\b/.test(source)) return source
  if (gl.getShaderParameter(shader, gl.SHADER_TYPE) !== gl.VERTEX_SHADER) return source
  return source.replace(/void\s+main\s*\(\s*(void)?\s*\)\s*\{/, (m) => `${m}\n  gl_PointSize = 1.0;`)
}
