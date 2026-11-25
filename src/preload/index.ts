import { contextBridge, ipcRenderer } from 'electron'

/**
 * API estreita para o renderer (architecture §2): só funções específicas,
 * nunca o ipcRenderer cru. O tipo correspondente está em
 * src/renderer/src/types/so.d.ts.
 */
const store = (name: 'settings' | 'library' | 'profiles') => ({
  load: (): Promise<unknown> => ipcRenderer.invoke('store:load', name),
  save: (data: unknown): Promise<void> => ipcRenderer.invoke('store:save', name, data)
})

interface MineMeta {
  title: string
  author: string
  basedOn: { name: string; author: string } | null
  createdAt: string
}
interface MineEntry {
  id: string
  meta: MineMeta
  preset: Record<string, unknown>
}

/** Versão de um "meu" preset (spec 027, fatia 3); espelha `VersionInfo` de src/main/mine.ts. */
interface MineVersion {
  n: number
  savedAt: string
  summary: { kind: 'created' | 'earlier' | 'edit'; vals: { key: string; from: number; to: number }[]; more: number; blocks: string[] }
}

interface UpdateState {
  phase: 'idle' | 'checking' | 'latest' | 'downloading' | 'ready' | 'available' | 'installing' | 'error'
  version: string | null
  percent: number
  lastCheckAt: number | null
  portable: boolean
  supported: boolean
}

contextBridge.exposeInMainWorld('so', {
  settings: store('settings'),
  library: store('library'),
  /** Perfis de ajustes do usuário (spec 038); exportar/importar um perfil pelo diálogo nativo (P1). */
  profiles: {
    ...store('profiles'),
    exportFile: (name: string, text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }> => ipcRenderer.invoke('profiles:export', String(name), String(text)),
    importFile: (): Promise<{ ok: boolean; canceled?: boolean; name?: string; text?: string; error?: string }> => ipcRenderer.invoke('profiles:import')
  },
  window: {
    toggleFullScreen: (): Promise<void> => ipcRenderer.invoke('window:toggleFullScreen'),
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close')
  },
  /** Uma linha no log em arquivo (falhas e eventos raros, nunca por quadro). */
  log: (message: string): void => ipcRenderer.send('log:write', String(message).slice(0, 2000)),
  /** Marca uma etapa da abertura (o main carimba o tempo e grava o resumo no log). */
  mark: (name: string): void => ipcRenderer.send('startup:mark', String(name).slice(0, 40)),
  /** Abre a pasta do log no Explorer (Ctrl+Shift+L). */
  showLog: (): Promise<void> => ipcRenderer.invoke('log:show'),
  /** Últimas 200 linhas do log, com a pasta do usuário trocada por `~` (spec 031); `null` = sem log. */
  logTail: (): Promise<string | null> => ipcRenderer.invoke('log:tail'),
  system: {
    /** Abre Configurações › Som do Windows (URL fixa no main). */
    openSoundSettings: (): Promise<void> => ipcRenderer.invoke('system:openSoundSettings'),
    /** Abre o THIRD_PARTY_NOTICES.md com o app padrão. */
    openNotices: (): Promise<string> => ipcRenderer.invoke('system:openNotices'),
    /** Abre um link https no navegador. */
    openLink: (url: string): Promise<void> => ipcRenderer.invoke('system:openLink', url),
    /** Copia texto (diagnóstico) para a área de transferência. */
    copyText: (text: string): Promise<void> => ipcRenderer.invoke('system:copyText', text),
    /** Versão do Windows para o "Relatar um problema" (spec 031): `Windows 11 (build 22631)`. */
    osInfo: (): Promise<string> => ipcRenderer.invoke('system:osInfo'),
    /** Driver e ids da GPU (diagnóstico de WebGL 2). */
    gpuInfo: (): Promise<{ driver: string; ids: string }> => ipcRenderer.invoke('system:gpuInfo'),
    /** Flags de teste lidas de test-flags.json (spec 012). */
    testFlags: (): Promise<{ captureFail: boolean; noWebgl2: boolean; compareMinFps?: number }> => ipcRenderer.invoke('system:testFlags')
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    /** Rodando como pacote MSIX da Microsoft Store (spec 044). */
    store: (): Promise<boolean> => ipcRenderer.invoke('app:store'),
    /** Idioma do Windows já reduzido a 'en' ou 'pt-BR' (spec 030). */
    systemLanguage: (): Promise<'en' | 'pt-BR'> => ipcRenderer.invoke('app:systemLanguage'),
    /** Idioma ativo do app: os diálogos nativos do main seguem ele (spec 030, P1). */
    setLanguage: (lang: 'en' | 'pt-BR'): void => ipcRenderer.send('app:setLanguage', lang === 'pt-BR' ? 'pt-BR' : 'en')
  },
  /** .milk (texto) → preset do Butterchurn 3, convertido no main (spec 022). */
  presets: {
    convertMilk: (text: string): Promise<{ preset: Record<string, unknown>; ms: number }> => ipcRenderer.invoke('presets:convertMilk', String(text)),
    /** Importados salvos (nome + preset convertido). */
    listImported: (): Promise<{ name: string; preset: Record<string, unknown> }[]> => ipcRenderer.invoke('presets:listImported'),
    /** Converte de novo no main e grava fonte + cache. */
    saveImported: (file: { name: string; text: string }): Promise<void> => ipcRenderer.invoke('presets:saveImported', { name: String(file.name), text: String(file.text) }),
    removeImported: (name: string): Promise<void> => ipcRenderer.invoke('presets:removeImported', String(name)),
    /** Diálogo nativo de .milk (até 200; os grandes demais voltam em tooBig). */
    pickMilk: (): Promise<{ files: { name: string; text: string }[]; tooBig: string[]; extra: number }> => ipcRenderer.invoke('presets:pickMilk'),
    /** Meus presets (Estúdio, spec 026): o main gera o id e sanitiza o preset. */
    listMine: (): Promise<MineEntry[]> => ipcRenderer.invoke('presets:listMine'),
    saveMine: (data: { id?: string; meta?: Omit<MineMeta, 'createdAt'>; preset: Record<string, unknown>; milk?: string | null }): Promise<{ id: string; meta: MineMeta }> =>
      ipcRenderer.invoke('presets:saveMine', data),
    removeMine: (id: string): Promise<void> => ipcRenderer.invoke('presets:removeMine', String(id)),
    /** Renomear (spec 027, fatia 9): só o título; devolve o meta gravado. */
    renameMine: (id: string, title: string): Promise<MineMeta> => ipcRenderer.invoke('presets:renameMine', String(id), String(title)),
    /** Histórico de um "meu" preset (spec 027, fatia 3), do mais novo para o mais antigo. */
    mineVersions: (id: string): Promise<MineVersion[]> => ipcRenderer.invoke('presets:mineVersions', String(id)),
    mineVersion: (id: string, n: number): Promise<Record<string, unknown>> => ipcRenderer.invoke('presets:mineVersion', String(id), Number(n)),
    /** Fonte .milk (spec 027, fatia 6): de um importado ou de um meu preset; `null` = não tem. */
    importedMilk: (name: string): Promise<string | null> => ipcRenderer.invoke('presets:importedMilk', String(name)),
    mineMilk: (id: string): Promise<string | null> => ipcRenderer.invoke('presets:mineMilk', String(id)),
    /** Exportar (spec 027, fatia 7): diálogo nativo no main; `canceled` = o usuário fechou o diálogo. */
    exportFile: (kind: 'milk' | 'json', name: string, text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }> =>
      ipcRenderer.invoke('presets:exportFile', kind, String(name), String(text)),
    /** Capturar quadro (spec 027, fatia 11): o PNG do canvas, gravado pelo diálogo nativo do main. */
    exportFrame: (name: string, data: Uint8Array): Promise<{ ok: boolean; canceled?: boolean; name?: string }> =>
      ipcRenderer.invoke('presets:exportFrame', String(name), data)
  },
  /** Atualização automática (spec 029): o main decide o que checar, baixar e abrir. */
  update: {
    state: (): Promise<UpdateState> => ipcRenderer.invoke('update:state'),
    /** Chave "Buscar atualizações automaticamente". */
    configure: (auto: boolean): void => ipcRenderer.send('update:configure', auto === true),
    /** "Verificar agora": devolve a fase em que ficou. */
    check: (): Promise<UpdateState['phase']> => ipcRenderer.invoke('update:check'),
    install: (): Promise<boolean> => ipcRenderer.invoke('update:install'),
    /** Abre a página da versão encontrada (ou da instalada) no navegador. */
    openRelease: (): Promise<void> => ipcRenderer.invoke('update:openRelease'),
    onState: (fn: (s: UpdateState) => void): (() => void) => {
      const listener = (_e: unknown, s: UpdateState): void => fn(s)
      ipcRenderer.on('update:state', listener)
      return () => ipcRenderer.removeListener('update:state', listener)
    }
  },
  /** Coleções em arquivo: o diálogo é nativo (main); aqui só passa texto. */
  collections: {
    export: (text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }> => ipcRenderer.invoke('collections:export', text),
    import: (): Promise<{ ok: boolean; canceled?: boolean; name?: string; text?: string; error?: string }> => ipcRenderer.invoke('collections:import')
  }
})
