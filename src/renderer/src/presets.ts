import type { Preset } from 'butterchurn'
import butterchurnPresets from 'butterchurn-presets'

type PresetPack = { getPresets(): Record<string, Preset> }

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

  constructor(private readonly engine: 'v2' | 'v3' = 'v2') {
    if (engine === 'v2') this.addPack(butterchurnPresets)
  }

  /** Spike 006: pacote base do butterchurn-presets 3.x (presets com equações `*_eel`). */
  async loadBasePack3(): Promise<number> {
    const mod = await import('butterchurn-presets3/dist/base.min.js')
    this.addPresets(mod.default)
    return this.count
  }

  /** Pacotes extras do mesmo butterchurn-presets, carregados depois do primeiro quadro. */
  async loadExtraPacks(): Promise<number> {
    if (this.engine === 'v3') {
      const packs3 = await Promise.all([
        import('butterchurn-presets3/dist/extra.min.js'),
        import('butterchurn-presets3/dist/md1.min.js'),
        import('butterchurn-presets3/dist/image.min.js')
      ])
      for (const mod of packs3) this.addPresets(mod.default)
      return this.count
    }
    const packs = await Promise.all([
      import('butterchurn-presets/lib/butterchurnPresetsExtra.min.js'),
      import('butterchurn-presets/lib/butterchurnPresetsExtra2.min.js'),
      import('butterchurn-presets/lib/butterchurnPresetsMD1.min.js')
    ])
    for (const mod of packs) this.addPack(mod.default)
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

  private addPack(pack: PresetPack): void {
    this.addPresets(pack.getPresets())
  }

  /** Acrescenta presets (o 3.x exporta o mapa direto, sem getPresets). Público para o spike 006. */
  addPresets(map: Record<string, Preset>): void {
    for (const [name, preset] of Object.entries(map)) {
      if (!this.presets.has(name)) this.presets.set(name, preset)
    }
    this.names = [...this.presets.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    )
  }
}
