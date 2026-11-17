/**
 * Estúdio, shaders (spec 027, fatia 5): a linha do erro do compilador GLSL conta no shader
 * inteiro que o Butterchurn monta (cabeçalho com os uniforms + `main()` em volta do corpo).
 * Aqui ela volta a contar no texto que o usuário edita (`warp`/`comp` do preset).
 *
 * O motor separa o texto em cabeçalho (antes de `shader_body`) e corpo (entre a primeira `{`
 * depois dele e a última `}`), troca `texture2D`/`texture3D` por `texture` no corpo (não muda
 * as linhas) e cola os dois no modelo (`ShaderUtils.getShaderParts`, Butterchurn 3), depois de
 * aparar o texto (`trim()`).
 * Sem módulos importados: o teste headless transpila este arquivo sozinho.
 */

/** Linha do primeiro `ERROR: 0:123: …` do log do compilador (`null` = sem linha). */
export function glslErrorLine(log: string): number | null {
  const m = /ERROR:\s*\d+:(\d+):/.exec(log)
  return m ? Number(m[1]) : null
}

const lineAt = (text: string, offset: number): number => {
  let n = 1
  for (let i = 0; i < offset && i < text.length; i++) if (text.charCodeAt(i) === 10) n++
  return n
}

/**
 * A linha `glLine` do shader montado (`glSource`), contada no texto do usuário (`user`).
 * `null` quando ela cai no modelo do motor (fora do que o usuário escreveu).
 */
export function userShaderLine(text: string, glSource: string, glLine: number): number | null {
  // O motor apara o texto (`trim()`) antes de separar: linhas em branco no começo não contam lá.
  const user = text.replace(/^\s+/, '').trimEnd()
  const lead = lineAt(text, text.length - text.replace(/^\s+/, '').length) - 1
  const sb = user.indexOf('shader_body')
  const parts: { text: string; at: number; norm: (s: string) => string }[] = []
  if (sb < 0) {
    parts.push({ text: user, at: 0, norm: (s) => s.replace(/texture2D/g, 'texture').replace(/texture3D/g, 'texture') })
  } else {
    const after = user.slice(sb)
    const first = after.indexOf('{')
    const last = after.lastIndexOf('}')
    if (first >= 0 && last > first) {
      parts.push({ text: after.slice(first + 1, last), at: sb + first + 1, norm: (s) => s.replace(/texture2D/g, 'texture').replace(/texture3D/g, 'texture') })
    }
    parts.push({ text: user.slice(0, sb), at: 0, norm: (s) => s })
  }
  for (const p of parts) {
    if (!p.text.trim()) continue
    const pos = glSource.indexOf(p.norm(p.text))
    if (pos < 0) continue
    const start = lineAt(glSource, pos)
    const lines = p.text.split('\n').length
    if (glLine >= start && glLine < start + lines) return lead + lineAt(user, p.at) + (glLine - start)
  }
  return null
}
