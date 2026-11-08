import { app, BrowserWindow, desktopCapturer, session } from 'electron'
import { join } from 'node:path'

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
    webPreferences: {
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
  registerLoopbackCapture()
  createWindow()
})
app.on('window-all-closed', () => app.quit())
