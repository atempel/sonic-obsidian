import { app, BrowserWindow, desktopCapturer, ipcMain, session, shell } from 'electron'
import { join } from 'node:path'
import { JsonStore } from './store'

const stores = new Map<string, JsonStore>()

/** settings.json e library.json (architecture §7): só o main toca o disco. */
function registerStores(): void {
  for (const name of ['settings', 'library']) stores.set(name, new JsonStore(name))
  const get = (name: unknown): JsonStore => {
    const store = typeof name === 'string' ? stores.get(name) : undefined
    if (!store) throw new Error(`store desconhecido: ${String(name)}`)
    return store
  }
  ipcMain.handle('store:load', (_e, name: unknown) => get(name).load())
  ipcMain.handle('store:save', (_e, name: unknown, data: unknown) => get(name).save(data))
  ipcMain.handle('window:toggleFullScreen', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) win.setFullScreen(!win.isFullScreen())
  })
  // URL fixa: o renderer não escolhe o que abrir.
  ipcMain.handle('system:openSoundSettings', () => shell.openExternal('ms-settings:sound'))
}

/**
 * Responde a todo getDisplayMedia do renderer sem mostrar seletor:
 * vídeo = primeira tela (obrigatório para o Chromium entregar o áudio),
 * áudio = 'loopback' (a mixagem do sistema).
 * Nunca usar 'loopbackWithMute': ele silencia os alto-falantes enquanto captura.
 */
function registerLoopbackCapture(): void {
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          const screen = sources[0]
          if (!screen) {
            console.error('[capture] nenhuma tela encontrada pelo desktopCapturer')
            callback({})
            return
          }
          callback({ video: screen, audio: 'loopback' })
        })
        .catch((err: unknown) => {
          console.error('[capture] desktopCapturer falhou', err)
          callback({})
        })
    },
    { useSystemPicker: false }
  )
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    title: 'Sonic Obsidian',
    autoHideMenuBar: true,
    // Sem moldura: o visual é a janela. Arrasto pela área de drag do renderer;
    // redimensionar pelas bordas continua nativo (resizable + thickFrame padrão).
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Sem isso o AudioContext nasce suspenso e exigiria um clique (critério 1).
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen())
      event.preventDefault()
    } else if (input.key === 'F12') {
      win.webContents.toggleDevTools()
      event.preventDefault()
    } else if (input.control && !input.alt && input.key.toLowerCase() === 'w') {
      win.close()
      event.preventDefault()
    } else if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false)
      event.preventDefault()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerStores()
  registerLoopbackCapture()
  createWindow()
})
app.on('window-all-closed', () => app.quit())

// Grava o que estiver pendente no debounce antes de sair.
let flushed = false
app.on('before-quit', (event) => {
  if (flushed) return
  event.preventDefault()
  Promise.all([...stores.values()].map((s) => s.flush())).finally(() => {
    flushed = true
    app.quit()
  })
})
