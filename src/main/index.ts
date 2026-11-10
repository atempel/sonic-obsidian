import { app, BrowserWindow, clipboard, desktopCapturer, dialog, ipcMain, session, shell } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { log, logMetrics, logPath } from './log'
import { mark } from './startup'
import { milkToPreset3 } from './milk'

mark('main.js')
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
  // Controles da janela (spec 014): fechar é o mesmo caminho do Ctrl+W.
  ipcMain.handle('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.handle('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
  // Log do renderer: só texto curto, sem escolher arquivo nem nível arbitrário.
  ipcMain.on('log:write', (_e, message: unknown) => {
    if (typeof message === 'string') log('renderer', message)
  })
  // Etapas da abertura vindas do renderer (só nomes conhecidos; ver startup.ts).
  ipcMain.on('startup:mark', (_e, name: unknown) => {
    if (typeof name === 'string') mark(name)
  })
  // Mostra o arquivo de log no Explorer (caminho fixo, definido aqui).
  ipcMain.handle('log:show', () => shell.showItemInFolder(logPath()))
  // URL fixa: o renderer não escolhe o que abrir.
  ipcMain.handle('system:openSoundSettings', () => shell.openExternal('ms-settings:sound'))
  ipcMain.handle('app:version', () => app.getVersion())
  // Créditos de terceiros: o arquivo vai ao lado do .exe (extraFiles); em dev, na raiz do projeto.
  ipcMain.handle('system:openNotices', () =>
    shell.openPath(join(app.isPackaged ? dirname(process.execPath) : app.getAppPath(), 'THIRD_PARTY_NOTICES.md'))
  )
  // Links do Sobre: só https, abertos no navegador.
  ipcMain.handle('system:openLink', (_e, url: unknown) => {
    if (typeof url === 'string' && /^https:\/\/[^\s]+$/.test(url)) return shell.openExternal(url)
    return undefined
  })
  registerCollectionFiles()
  // Diagnóstico (spec 012): texto curto para a área de transferência, GPU e flags de teste.
  ipcMain.handle('system:copyText', (_e, text: unknown) => {
    if (typeof text === 'string' && text.length <= 20_000) clipboard.writeText(text)
  })
  ipcMain.handle('system:gpuInfo', async () => {
    try {
      const info = (await app.getGPUInfo('basic')) as { gpuDevice?: { active?: boolean; driverVersion?: string; vendorId?: number; deviceId?: number }[] }
      const dev = info.gpuDevice?.find((d) => d.active) ?? info.gpuDevice?.[0]
      return { driver: dev?.driverVersion ?? '', ids: dev ? `${(dev.vendorId ?? 0).toString(16)}:${(dev.deviceId ?? 0).toString(16)}` : '' }
    } catch {
      return { driver: '', ids: '' }
    }
  })
  ipcMain.handle('system:testFlags', () => readTestFlags())
  // .milk → preset 3.x fora do renderer (o conversor HLSL precisa de eval); usado pela spec 022.
  ipcMain.handle('presets:convertMilk', async (_e, text: unknown) => {
    const t = performance.now()
    const preset = await milkToPreset3(text)
    return { preset, ms: performance.now() - t }
  })
}

/**
 * Flags de teste (spec 012): `test-flags.json` na pasta de dados (Ctrl+Shift+L abre a pasta
 * do log, ao lado). Simula a captura recusada e a falta de WebGL 2 sem linha de comando.
 * Só estas chaves, só booleanos; arquivo ausente ou inválido = nenhuma flag.
 */
type TestFlags = { captureFail: boolean; noWebgl2: boolean }
async function readTestFlags(): Promise<TestFlags> {
  try {
    const raw = JSON.parse(await readFile(join(app.getPath('userData'), 'test-flags.json'), 'utf8')) as Record<string, unknown>
    const flags = { captureFail: raw.captureFail === true, noWebgl2: raw.noWebgl2 === true }
    if (flags.captureFail || flags.noWebgl2) log('main', `flags de teste: ${JSON.stringify(flags)}`)
    return flags
  } catch {
    return { captureFail: false, noWebgl2: false }
  }
}

/**
 * Exportar e importar coleções (spec 011): o main escolhe o arquivo pelo diálogo nativo;
 * o renderer só manda e recebe texto JSON. Limite de 2 MB na leitura.
 */
function registerCollectionFiles(): void {
  const filters = [{ name: 'JSON', extensions: ['json'] }]
  ipcMain.handle('collections:export', async (e, text: unknown) => {
    if (typeof text !== 'string' || text.length > 2_000_000) return { ok: false }
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = { defaultPath: 'sonic-obsidian-colecoes.json', filters }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    await writeFile(res.filePath, text, 'utf8')
    return { ok: true, name: basename(res.filePath) }
  })
  ipcMain.handle('collections:import', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = { properties: ['openFile' as const], filters }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    const path = res.filePaths[0]
    if (res.canceled || !path) return { ok: false, canceled: true }
    try {
      const buf = await readFile(path)
      if (buf.length > 2_000_000) return { ok: false, name: basename(path), error: 'read' }
      return { ok: true, name: basename(path), text: buf.toString('utf8') }
    } catch {
      return { ok: false, name: basename(path), error: 'read' }
    }
  })
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
    // Ícone da janela e da barra de tarefas (marca "The Core", docs/brand/app-icon.svg).
    icon: join(app.getAppPath(), 'resources/icon.ico'),
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

  mark('janela')
  win.webContents.once('did-finish-load', () => mark('página carregada'))

  // Queda do renderer (WebGL, memória): registra e recarrega, em vez de ficar uma janela preta.
  win.webContents.on('render-process-gone', (_e, details) => {
    log('main', `renderer caiu: ${details.reason} (exit ${details.exitCode})`)
    logMetrics()
    if (details.reason !== 'clean-exit' && !win.isDestroyed()) setTimeout(() => !win.isDestroyed() && win.reload(), 1000)
  })
  win.webContents.on('unresponsive', () => log('main', 'renderer sem responder'))
  win.webContents.on('responsive', () => log('main', 'renderer voltou a responder'))

  // Nenhuma janela nova dentro do app: links externos vão para o navegador.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
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
    }
    // Esc é tratado no renderer: fecha o que estiver aberto e, sem nada aberto, sai da tela cheia.
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Processo da GPU ou utilitário caiu (ex.: o Windows reiniciou o driver de vídeo).
app.on('child-process-gone', (_e, details) => {
  log('main', `processo ${details.type}${details.name ? ` (${details.name})` : ''} caiu: ${details.reason} (exit ${details.exitCode})`)
  logMetrics()
})

// Agrupa a janela na barra de tarefas do Windows sob o mesmo id do pacote (appId do electron-builder).
if (process.platform === 'win32') app.setAppUserModelId('dev.atempel.sonic-obsidian')

app.whenReady().then(() => {
  mark('pronto')
  log('main', `abriu ${app.getVersion()} · Electron ${process.versions.electron} · log em ${logPath()}`)
  logMetrics()
  // Memória a cada 5 min: mostra se algum processo (GPU, renderer) cresce sem parar.
  setInterval(logMetrics, 5 * 60 * 1000).unref()
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
