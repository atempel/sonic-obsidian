/**
 * Separa "Autor - Título" para exibir; o nome completo continua sendo a
 * identidade do preset e o crédito nunca é removido: sem separador, o nome
 * inteiro vira o título.
 */
export function splitPresetName(name: string): { title: string; author: string | null } {
  const i = name.indexOf(' - ')
  if (i <= 0) return { title: name, author: null }
  return { title: name.slice(i + 3).trim() || name, author: name.slice(0, i).trim() }
}
