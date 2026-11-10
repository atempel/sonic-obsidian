/**
 * Separa "Autor - Título" para exibir; o nome completo continua sendo a
 * identidade do preset e o crédito nunca é removido: sem separador, o nome
 * inteiro vira o título.
 */
export function splitPresetName(name: string): { title: string; author: string | null } {
  // Meu preset (spec 026): o título é o nome; o crédito leva o autor original ("baseado em").
  const mine = mineLookup(name)
  if (mine) return { title: name, author: mineCredit(mine) }
  const i = name.indexOf(' - ')
  if (i <= 0) return { title: name, author: null }
  return { title: name.slice(i + 3).trim() || name, author: name.slice(0, i).trim() }
}

let mineLookup: (name: string) => SoMineMeta | null = () => null

/** Liga o crédito dos meus presets à biblioteca (main.ts). */
export function setMineLookup(fn: (name: string) => SoMineMeta | null): void {
  mineLookup = fn
}

/** "Alexandre · baseado em Star Ornament, por Zylot" (sem o "por" inicial, que a interface põe). */
export function mineCredit(m: Pick<SoMineMeta, 'author' | 'basedOn'>): string {
  const me = m.author || 'Eu'
  if (!m.basedOn) return me
  const i = m.basedOn.name.indexOf(' - ')
  const title = i > 0 ? m.basedOn.name.slice(i + 3).trim() || m.basedOn.name : m.basedOn.name
  return `${me} · baseado em ${title}${m.basedOn.author ? `, por ${m.basedOn.author}` : ''}`
}
