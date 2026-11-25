import { app, BrowserWindow, clipboard, desktopCapturer, dialog, ipcMain, session, shell } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { log, logMetrics, logPath } from './log'
import { COPY_MAX, logTail, osInfo } from './feedback'
import { mark } from './startup'
import { mt, setMainLanguage, systemLang } from './i18n'
import { milkToPreset3 } from './milk'
import { MAX_BYTES, listImported, pickMilkFiles, readImportedMilk, removeImported, saveImported, type MilkFile } from './imported'
import { listMine, listVersions, readMineMilk, readVersion, removeMine, renameMine, saveMine } from './mine'
import { flushUpdater, registerUpdater, updaterFirstFrame } from './updater'

mark('main.js')
import { JsonStore } from './store'

const stores = new Map<string, JsonStore>()
const flushStores = (): Promise<void> => Promise.all([...stores.values()].map((s) => s.flush())).then(() => undefined)

/** settings.json, library.json e profiles.json (architecture §7; spec 038): só o main toca o disco. */
function registerStores(): void {
  for (const name of ['settings', 'library', 'profiles']) stores.set(name, new JsonStore(name))
  const get = (name: unknown): JsonStore => {
    const store = typeof name === 'string' ? stores.get(name) : undefined
    if (!store) throw new Error(`unknown store: ${String(name)}`)
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
    if (typeof name !== 'string') return
    mark(name)
    // Atualização automática (spec 029): a agenda só começa depois do primeiro quadro.
    if (name === 'first frame') updaterFirstFrame()
  })
  // Mostra o arquivo de log no Explorer (caminho fixo, definido aqui).
  ipcMain.handle('log:show', () => shell.showItemInFolder(logPath()))
  // Copiar diagnóstico (spec 031): caminho fixo, sem parâmetro; a pasta do usuário vira `~`.
  ipcMain.handle('log:tail', () => logTail())
  // "Relatar um problema" (spec 031): `Windows 11 (build 22631)`.
  ipcMain.handle('system:osInfo', () => osInfo())
  // URL fixa: o renderer não escolhe o que abrir.
  ipcMain.handle('system:openSoundSettings', () => shell.openExternal('ms-settings:sound'))
  ipcMain.handle('app:version', () => app.getVersion())
  // Idioma do Windows (spec 030): o primeiro preferido; `pt-*` vira pt-BR, o resto en (o renderer só recebe os dois).
  ipcMain.handle('app:systemLanguage', () => systemLang())
  // Idioma ativo do app (resolvido no renderer): os diálogos nativos seguem ele (spec 030, P1).
  ipcMain.on('app:setLanguage', (_e, l: unknown) => setMainLanguage(l))
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
  registerProfileFiles()
  registerUpdater({ flush: flushStores })
  // Diagnóstico (spec 012): texto curto para a área de transferência, GPU e flags de teste.
  ipcMain.handle('system:copyText', (_e, text: unknown) => {
    if (typeof text === 'string' && text.length <= COPY_MAX) clipboard.writeText(text)
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
  // Importar .milk (spec 022). A conversão fica aqui: o conversor HLSL precisa de eval, que o
  // renderer proíbe. Entra texto, sai preset 3.x (EEL + GLSL); nada é executado.
  const milkFile = (v: unknown): MilkFile => {
    const f = v as Partial<MilkFile> | null
    if (!f || typeof f.name !== 'string' || typeof f.text !== 'string') throw new Error('[invalid] bad file')
    if (f.text.length > MAX_BYTES) throw new Error('[too-big] file larger than 256 KB')
    return { name: f.name.slice(0, 260), text: f.text }
  }
  ipcMain.handle('presets:convertMilk', async (_e, text: unknown) => {
    const t = performance.now()
    const preset = await milkToPreset3(text)
    return { preset, ms: performance.now() - t }
  })
  ipcMain.handle('presets:listImported', () => listImported())
  ipcMain.handle('presets:saveImported', (_e, file: unknown) => saveImported(milkFile(file)))
  ipcMain.handle('presets:removeImported', (_e, name: unknown) => removeImported(name))
  ipcMain.handle('presets:pickMilk', (e) => pickMilkFiles(BrowserWindow.fromWebContents(e.sender)))
  // Meus presets (Estúdio, spec 026): o main gera o id e sanitiza o preset antes de gravar.
  ipcMain.handle('presets:listMine', () => listMine())
  ipcMain.handle('presets:saveMine', async (_e, data: unknown) => {
    const r = await saveMine(data)
    log('main', `studio: saved ${r.meta.title} (${r.id})`)
    return r
  })
  ipcMain.handle('presets:removeMine', (_e, id: unknown) => removeMine(id))
  // Renomear (spec 027, fatia 9): só o título no meta.json; o id é conferido aqui.
  ipcMain.handle('presets:renameMine', async (_e, id: unknown, title: unknown) => {
    const meta = await renameMine(id, title)
    log('main', `studio: renamed ${String(id)} to ${meta.title}`)
    return meta
  })
  // Versões (spec 027, fatia 3): o id e o número são conferidos no main; o caminho nunca vem do renderer.
  ipcMain.handle('presets:mineVersions', (_e, id: unknown) => listVersions(id))
  ipcMain.handle('presets:mineVersion', (_e, id: unknown, n: unknown) => readVersion(id, n))
  // Código .milk (spec 027, fatia 6): a fonte de um importado (pelo nome) ou de um meu preset (pelo id).
  ipcMain.handle('presets:importedMilk', (_e, name: unknown) => readImportedMilk(name))
  ipcMain.handle('presets:mineMilk', (_e, id: unknown) => readMineMilk(id))
  // Exportar (spec 027, fatia 7): o renderer manda o texto pronto e um nome sugerido; o caminho
  // vem só do diálogo nativo. `.milk` até 256 KB (o que a importação aceita de volta), JSON até 2 MB.
  ipcMain.handle('presets:exportFile', async (e, kind: unknown, name: unknown, text: unknown) => {
    if (kind !== 'milk' && kind !== 'json') throw new Error('[invalid] bad export kind')
    if (typeof text !== 'string') throw new Error('[invalid] bad export text')
    if (text.length > (kind === 'milk' ? MAX_BYTES : 2_000_000)) throw new Error(`[too-big] file larger than ${kind === 'milk' ? '256 KB' : '2 MB'}`)
    const base = exportBase(name)
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = {
      title: mt(kind === 'milk' ? 'export.milkTitle' : 'export.jsonTitle'),
      defaultPath: `${base}.${kind}`,
      filters: [kind === 'milk' ? { name: mt('milk.filter'), extensions: ['milk'] } : { name: mt('export.jsonFilter'), extensions: ['json'] }]
    }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    await writeFile(res.filePath, text, 'utf8')
    log('main', `studio: exported ${kind} (${text.length} chars)`)
    return { ok: true, name: basename(res.filePath) }
  })
  // Capturar quadro (spec 027, fatia 11): o renderer manda o PNG pronto (`toBlob` do canvas) e o nome
  // do preset; o caminho vem só do diálogo nativo. Só PNG (assinatura conferida) e até 64 MB (8K cabe).
  ipcMain.handle('presets:exportFrame', async (e, name: unknown, data: unknown) => {
    if (!(data instanceof Uint8Array)) throw new Error('[invalid] bad frame data')
    if (data.length > 64 * 1024 * 1024) throw new Error('[too-big] frame larger than 64 MB')
    if (data.length < 8 || !PNG_SIGNATURE.every((b, i) => data[i] === b)) throw new Error('[invalid] frame is not a PNG')
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = {
      title: mt('export.frameTitle'),
      defaultPath: `${exportBase(name)}${mt('export.frameSuffix')}.png`,
      filters: [{ name: mt('export.frameFilter'), extensions: ['png'] }]
    }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    await writeFile(res.filePath, data)
    log('main', `studio: frame captured (${data.length} bytes)`)
    return { ok: true, name: basename(res.filePath) }
  })
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
/** Nome de arquivo sugerido a partir do título: sem caracteres que o Windows recusa, até 120. */
function exportBase(name: unknown): string {
  return (typeof name === 'string' ? name : '').replace(/[\\/:*?"<>|\x00-\x1f]+/g, '').replace(/[. ]+$/, '').trim().slice(0, 120) || 'preset'
}

/**
 * Flags de teste (spec 012): `test-flags.json` na pasta de dados (Ctrl+Shift+L abre a pasta
 * do log, ao lado). Simula a captura recusada e a falta de WebGL 2 sem linha de comando.
 * Só estas chaves (booleanos, e o número `compareMinFps`); arquivo ausente ou inválido = nenhuma flag.
 */
type TestFlags = { captureFail: boolean; noWebgl2: boolean; compareMinFps?: number }
async function readTestFlags(): Promise<TestFlags> {
  try {
    const raw = JSON.parse(await readFile(join(app.getPath('userData'), 'test-flags.json'), 'utf8')) as Record<string, unknown>
    const flags: TestFlags = { captureFail: raw.captureFail === true, noWebgl2: raw.noWebgl2 === true }
    // Estúdio (spec 027, critério 4): muda o limite de fps de "Comparar com o original" (0–1000; 0 = sem limite).
    const m = raw.compareMinFps
    if (typeof m === 'number' && Number.isFinite(m) && m >= 0 && m <= 1000) flags.compareMinFps = m
    if (flags.captureFail || flags.noWebgl2 || flags.compareMinFps !== undefined) log('main', `test flags: ${JSON.stringify(flags)}`)
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
    const opts = { title: mt('collections.exportTitle'), defaultPath: mt('collections.defaultFile'), filters }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    await writeFile(res.filePath, text, 'utf8')
    return { ok: true, name: basename(res.filePath) }
  })
  ipcMain.handle('collections:import', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = { title: mt('collections.importTitle'), properties: ['openFile' as const], filters }
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
 * Exportar e importar um perfil (spec 038, P1): como as coleções, o caminho vem só do diálogo
 * nativo e o renderer manda/recebe o texto JSON. O renderer confere o formato; aqui, o tamanho
 * (até 64 KB na leitura e na escrita).
 */
const PROFILE_FILE_MAX = 64 * 1024
function registerProfileFiles(): void {
  const filters = (): { name: string; extensions: string[] }[] => [{ name: mt('profiles.filter'), extensions: ['json'] }]
  ipcMain.handle('profiles:export', async (e, name: unknown, text: unknown) => {
    if (typeof text !== 'string' || text.length > PROFILE_FILE_MAX) throw new Error('[too-big] profile larger than 64 KB')
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = { title: mt('profiles.exportTitle'), defaultPath: `${exportBase(name)}.json`, filters: filters() }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    await writeFile(res.filePath, text, 'utf8')
    log('main', `profiles: exported (${text.length} chars)`)
    return { ok: true, name: basename(res.filePath) }
  })
  ipcMain.handle('profiles:import', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = { title: mt('profiles.importTitle'), properties: ['openFile' as const], filters: filters() }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    const path = res.filePaths[0]
    if (res.canceled || !path) return { ok: false, canceled: true }
    try {
      const buf = await readFile(path)
      if (buf.length > PROFILE_FILE_MAX) return { ok: false, name: basename(path), error: 'too-big' }
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
            console.error('[capture] desktopCapturer found no screen')
            callback({})
            return
          }
          callback({ video: screen, audio: 'loopback' })
        })
        .catch((err: unknown) => {
          console.error('[capture] desktopCapturer failed', err)
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

  mark('window')
  win.webContents.once('did-finish-load', () => mark('page loaded'))

  // Queda do renderer (WebGL, memória): registra e recarrega, em vez de ficar uma janela preta.
  win.webContents.on('render-process-gone', (_e, details) => {
    log('main', `renderer gone: ${details.reason} (exit ${details.exitCode})`)
    logMetrics()
    if (details.reason !== 'clean-exit' && !win.isDestroyed()) setTimeout(() => !win.isDestroyed() && win.reload(), 1000)
  })
  win.webContents.on('unresponsive', () => log('main', 'renderer unresponsive'))
  win.webContents.on('responsive', () => log('main', 'renderer responsive again'))

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
  log('main', `process ${details.type}${details.name ? ` (${details.name})` : ''} gone: ${details.reason} (exit ${details.exitCode})`)
  logMetrics()
})

// Agrupa a janela na barra de tarefas do Windows sob o mesmo id do pacote (appId do electron-builder).
if (process.platform === 'win32') app.setAppUserModelId('dev.atempel.sonic-obsidian')

app.whenReady().then(() => {
  mark('ready')
  log('main', `started ${app.getVersion()} · Electron ${process.versions.electron} · log at ${logPath()}${process.windowsStore ? ' · Microsoft Store package (MSIX)' : ''}`)
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
  Promise.all([flushStores(), flushUpdater()]).finally(() => {
    flushed = true
    app.quit()
  })
})
