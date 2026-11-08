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
    toggleFullScreen: (): Promise<void> => ipcRenderer.invoke('window:toggleFullScreen')
  },
  system: {
    /** Abre Configurações › Som do Windows (URL fixa no main). */
    openSoundSettings: (): Promise<void> => ipcRenderer.invoke('system:openSoundSettings')
  }
})
