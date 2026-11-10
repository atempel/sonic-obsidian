import type { Preset } from 'butterchurn'

/**
 * Biblioteca de presets: lista única ordenada por nome (o nome carrega o autor
 * e nunca é alterado), deduplicada, com histórico para voltar.
 */
export class PresetLibrary {
  private readonly presets = new Map<string, Preset>()
  private names: string[] = []
  private readonly history: string[] = []
  private current = ''
  /** Presets que next/random pulam (ocultos). Definido pelo Core. */
  isSkipped: (name: string) => boolean = () => false

  /** Pacote base do butterchurn-presets 3.x, antes do primeiro preset. */
  async loadBasePack(): Promise<number> {
    const mod = await import('butterchurn-presets/dist/base.min.js')
    this.addPresets(mod.default)
    return this.count
  }

  /** Pacotes extras do mesmo butterchurn-presets, carregados depois do primeiro quadro. */
  async loadExtraPacks(): Promise<number> {
    const packs = await Promise.all([
      import('butterchurn-presets/dist/extra.min.js'),
      import('butterchurn-presets/dist/md1.min.js'),
      import('butterchurn-presets/dist/image.min.js')
    ])
    for (const mod of packs) this.addPresets(mod.default)
    return this.count
  }

  get count(): number {
    return this.names.length
  }

  get currentName(): string {
    return this.current
  }

  has(name: string): boolean {
    return this.presets.has(name)
  }

  /** Todos os nomes, em ordem alfabética. */
  all(): readonly string[] {
    return this.names
  }

  get(name: string): Preset {
    const preset = this.presets.get(name)
    if (!preset) throw new Error(`preset desconhecido: ${name}`)
    return preset
  }

  /** Próximo na ordem alfabética, pulando ocultos (dá a volta no fim). */
  next(): string {
    const start = this.names.indexOf(this.current)
    for (let k = 1; k <= this.names.length; k++) {
      const name = this.names[(start + k) % this.names.length]!
      if (!this.isSkipped(name)) return this.go(name)
    }
    return this.current // tudo oculto: fica onde está
  }

  /** Volta pelo histórico de navegação; sem histórico, fica onde está. */
  back(): string | null {
    const previous = this.history.pop()
    if (previous === undefined) return null
    this.current = previous
    return previous
  }

  /** Aleatório diferente do atual, entre os não ocultos. */
  random(): string {
    const pool = this.names.filter((n) => n !== this.current && !this.isSkipped(n))
    if (pool.length === 0) return this.current
    return this.go(pool[Math.floor(Math.random() * pool.length)]!)
  }

  /** Vai para um preset escolhido (guarda o atual no histórico). */
  go(name: string): string {
    if (this.current) this.history.push(this.current)
    if (this.history.length > 500) this.history.shift()
    this.current = name
    return name
  }

  /** Importados pelo usuário (spec 022): rótulo "Importado" e "Remover importado". */
  private readonly imported = new Set<string>()

  isImported(name: string): boolean {
    return this.imported.has(name)
  }

  get importedCount(): number {
    return this.imported.size
  }

  addImported(name: string, preset: Preset): void {
    this.imported.add(name)
    this.addPresets({ [name]: preset })
  }

  removeImported(name: string): void {
    if (!this.imported.delete(name)) return
    this.presets.delete(name)
    this.names = this.names.filter((n) => n !== name)
  }

  /** Acrescenta presets (o pacote 3.x exporta o mapa nome → preset). */
  addPresets(map: Record<string, Preset>): void {
    for (const [name, preset] of Object.entries(map)) {
      if (!this.presets.has(name)) this.presets.set(name, preset)
    }
    this.names = [...this.presets.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    )
  }
}
