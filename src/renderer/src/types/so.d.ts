/** API exposta pelo preload (src/preload/index.ts). */
interface SoStore {
  load(): Promise<unknown>
  save(data: unknown): Promise<void>
}

/** Meus presets (Estúdio, spec 026). */
interface SoMineMeta {
  title: string
  author: string
  basedOn: { name: string; author: string } | null
  createdAt: string
}
/** Versão de um "meu" preset (spec 027, fatia 3): resumo sem texto, escrito pelo renderer. */
interface SoMineVersion {
  n: number
  savedAt: string
  summary: { kind: 'created' | 'earlier' | 'edit'; vals: { key: string; from: number; to: number }[]; more: number; blocks: string[] }
}
interface SoMineEntry {
  id: string
  meta: SoMineMeta
  preset: Record<string, unknown>
}

/** Atualização automática (spec 029); espelha `UpdateState` de src/main/updater.ts. */
type SoUpdatePhase = 'idle' | 'checking' | 'latest' | 'downloading' | 'ready' | 'available' | 'installing' | 'error'
interface SoUpdateState {
  phase: SoUpdatePhase
  version: string | null
  percent: number
  lastCheckAt: number | null
  portable: boolean
  supported: boolean
}

interface Window {
  so: {
    settings: SoStore
    library: SoStore
    window: { toggleFullScreen(): Promise<void>; minimize(): Promise<void>; close(): Promise<void> }
    system: {
      openSoundSettings(): Promise<void>
      openNotices(): Promise<string>
      openLink(url: string): Promise<void>
      copyText(text: string): Promise<void>
      gpuInfo(): Promise<{ driver: string; ids: string }>
      testFlags(): Promise<{ captureFail: boolean; noWebgl2: boolean; compareMinFps?: number }>
    }
    app: { version(): Promise<string>; systemLanguage?(): Promise<'en' | 'pt-BR'>; setLanguage?(lang: 'en' | 'pt-BR'): void }
    presets: {
      convertMilk(text: string): Promise<{ preset: Record<string, unknown>; ms: number }>
      listImported(): Promise<{ name: string; preset: Record<string, unknown> }[]>
      saveImported(file: { name: string; text: string }): Promise<void>
      removeImported(name: string): Promise<void>
      pickMilk(): Promise<{ files: { name: string; text: string }[]; tooBig: string[]; extra: number }>
      listMine(): Promise<SoMineEntry[]>
      saveMine(data: { id?: string; meta?: Omit<SoMineMeta, 'createdAt'>; preset: Record<string, unknown>; milk?: string | null }): Promise<{ id: string; meta: SoMineMeta }>
      removeMine(id: string): Promise<void>
      mineVersions(id: string): Promise<SoMineVersion[]>
      mineVersion(id: string, n: number): Promise<Record<string, unknown>>
      /** Fonte .milk (027, fatia 6); opcional no mock dos testes antigos. `null` = não tem. */
      importedMilk?(name: string): Promise<string | null>
      mineMilk?(id: string): Promise<string | null>
      /** Exportar .milk ou JSON (027, fatia 7); opcional no mock dos testes antigos. */
      exportFile?(kind: 'milk' | 'json', name: string, text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }>
    }
    /** Opcional: os testes headless e o modo dev sem preload novo não têm. */
    update?: {
      state(): Promise<SoUpdateState>
      configure(auto: boolean): void
      check(): Promise<SoUpdatePhase>
      install(): Promise<boolean>
      openRelease(): Promise<void>
      onState(fn: (s: SoUpdateState) => void): () => void
    }
    collections: {
      export(text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }>
      import(): Promise<{ ok: boolean; canceled?: boolean; name?: string; text?: string; error?: string }>
    }
    log(message: string): void
    mark(name: string): void
    showLog(): Promise<void>
  }
}
