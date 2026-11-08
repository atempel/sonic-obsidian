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
