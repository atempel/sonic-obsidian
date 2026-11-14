import { contextBridge, ipcRenderer } from 'electron'

/**
 * API estreita para o renderer (architecture §2): só funções específicas,
 * nunca o ipcRenderer cru. O tipo correspondente está em
 * src/renderer/src/types/so.d.ts.
 */
const store = (name: 'settings' | 'library') => ({
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

contextBridge.exposeInMainWorld('so', {
  settings: store('settings'),
  library: store('library'),
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
  system: {
    /** Abre Configurações › Som do Windows (URL fixa no main). */
    openSoundSettings: (): Promise<void> => ipcRenderer.invoke('system:openSoundSettings'),
    /** Abre o THIRD_PARTY_NOTICES.md com o app padrão. */
    openNotices: (): Promise<string> => ipcRenderer.invoke('system:openNotices'),
    /** Abre um link https no navegador. */
    openLink: (url: string): Promise<void> => ipcRenderer.invoke('system:openLink', url),
    /** Copia texto (diagnóstico) para a área de transferência. */
    copyText: (text: string): Promise<void> => ipcRenderer.invoke('system:copyText', text),
    /** Driver e ids da GPU (diagnóstico de WebGL 2). */
    gpuInfo: (): Promise<{ driver: string; ids: string }> => ipcRenderer.invoke('system:gpuInfo'),
    /** Flags de teste lidas de test-flags.json (spec 012). */
    testFlags: (): Promise<{ captureFail: boolean; noWebgl2: boolean }> => ipcRenderer.invoke('system:testFlags')
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    /** Idioma do Windows já reduzido a 'en' ou 'pt-BR' (spec 030). */
    systemLanguage: (): Promise<'en' | 'pt-BR'> => ipcRenderer.invoke('app:systemLanguage')
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
    saveMine: (data: { id?: string; meta?: Omit<MineMeta, 'createdAt'>; preset: Record<string, unknown> }): Promise<{ id: string; meta: MineMeta }> =>
      ipcRenderer.invoke('presets:saveMine', data),
    removeMine: (id: string): Promise<void> => ipcRenderer.invoke('presets:removeMine', String(id))
  },
  /** Coleções em arquivo: o diálogo é nativo (main); aqui só passa texto. */
  collections: {
    export: (text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }> => ipcRenderer.invoke('collections:export', text),
    import: (): Promise<{ ok: boolean; canceled?: boolean; name?: string; text?: string; error?: string }> => ipcRenderer.invoke('collections:import')
  }
})
