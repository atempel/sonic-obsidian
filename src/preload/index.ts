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
  /** Abre a pasta do log no Explorer (Ctrl+Shift+L). */
  showLog: (): Promise<void> => ipcRenderer.invoke('log:show'),
  system: {
    /** Abre Configurações › Som do Windows (URL fixa no main). */
    openSoundSettings: (): Promise<void> => ipcRenderer.invoke('system:openSoundSettings'),
    /** Abre o THIRD_PARTY_NOTICES.md com o app padrão. */
    openNotices: (): Promise<string> => ipcRenderer.invoke('system:openNotices'),
    /** Abre um link https no navegador. */
    openLink: (url: string): Promise<void> => ipcRenderer.invoke('system:openLink', url)
  },
  app: { version: (): Promise<string> => ipcRenderer.invoke('app:version') },
  /** Coleções em arquivo: o diálogo é nativo (main); aqui só passa texto. */
  collections: {
    export: (text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }> => ipcRenderer.invoke('collections:export', text),
    import: (): Promise<{ ok: boolean; canceled?: boolean; name?: string; text?: string; error?: string }> => ipcRenderer.invoke('collections:import')
  }
})
