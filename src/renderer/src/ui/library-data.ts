import type { Core } from '../core/commands'

/** Busca rápida e Biblioteca leem os mesmos dados (spec 010). */
export type Tab = 'all' | 'favorites' | 'recents' | 'collections'

export const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'recents', label: 'Recentes' },
  { id: 'collections', label: 'Coleções' }
]

export const COLLECTION_INTERVALS = [15, 30, 45, 90]

/** Filtro por trecho do nome completo (autor + título), sem diferenciar maiúsculas. */
export function matches(name: string, q: string): boolean {
  return !q || name.toLocaleLowerCase().includes(q.toLocaleLowerCase())
}

/** Presets visíveis (existentes e não ocultos) de uma lista de nomes, filtrados pela busca. */
export function visible(core: Core, all: ReadonlySet<string>, names: readonly string[], q: string): string[] {
  return names.filter((n) => all.has(n) && !core.isHidden(n) && matches(n, q))
}

export function listFor(core: Core, all: readonly string[], allSet: ReadonlySet<string>, tab: Tab, q: string): string[] {
  const lib = core.state.library
  if (tab === 'favorites') return visible(core, allSet, lib.favorites, q)
  if (tab === 'recents') return visible(core, allSet, lib.recents, q)
  return all.filter((n) => !core.isHidden(n) && matches(n, q))
}

/** Matiz estável por preset para a miniatura provisória (sem captura de quadro ainda). */
export function hueOf(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % 360
}

export function thumbStyle(name: string): string {
  const h = hueOf(name)
  return `background: radial-gradient(circle at 30% 35%, hsl(${h} 85% 55% / 0.9), transparent 60%), linear-gradient(135deg, hsl(${(h + 40) % 360} 70% 22%), hsl(${(h + 200) % 360} 60% 10%))`
}

export const presetsWord = (n: number): string => `${n} ${n === 1 ? 'preset' : 'presets'}`
