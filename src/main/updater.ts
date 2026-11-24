import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AppUpdater } from 'electron-updater'
import { log } from './log'
import { JsonStore } from './store'

/**
 * Atualização automática pelo GitHub Releases (spec 029), com o `electron-updater`.
 * - Instalador (NSIS): checa, baixa em silêncio e avisa; `update:install` fecha, instala em
 *   silêncio e reabre o app. Sem o clique nada é instalado (o download fica em cache).
 * - Zip portátil: só checa e avisa; o botão abre a página da release (nada é baixado).
 * - Agenda: a primeira checagem 30 s depois do primeiro quadro, se a última tiver mais de 24 h
 *   (ou se já havia uma versão baixada esperando); depois, de novo a cada 24 h com o app aberto.
 * - Com a chave desligada (`update:configure(false)`), nenhuma checagem automática sai.
 *   "Verificar agora" funciona sempre (foi a pessoa que pediu).
 * - Versão da Microsoft Store (pacote MSIX, `process.windowsStore`, spec 044): a Store cuida das
 *   atualizações. Nada é checado nem baixado do GitHub, nem por "Verificar agora"; o renderer
 *   esconde a chave e o botão.
 * - Erros das checagens automáticas vão só para o log; o renderer só mostra erro de "Verificar agora".
 * - Rascunhos não aparecem para o atualizador (o GitHub só lista releases publicadas) e
 *   pre-releases não são oferecidas (`allowPrerelease: false`).
 */

export type UpdatePhase = 'idle' | 'checking' | 'latest' | 'downloading' | 'ready' | 'available' | 'installing' | 'error'

export interface UpdateState {
  phase: UpdatePhase
  /** Versão nova encontrada (pronta, disponível ou baixando). */
  version: string | null
  /** Progresso do download (0–100), só em `downloading`. */
  percent: number
  /** Última checagem que falou com o GitHub (ms desde 1970). */
  lastCheckAt: number | null
  /** Zip portátil: avisa e abre a página, sem baixar. */
  portable: boolean
  /** Falso fora do app empacotado no Windows (dev, testes) e na versão da Store. */
  supported: boolean
  /** Versão da Microsoft Store (pacote MSIX): a Store atualiza; o app não checa o GitHub. */
  store: boolean
}

const RELEASES_URL = 'https://github.com/atempel/sonic-obsidian/releases'
export const releaseUrl = (version: string): string => `${RELEASES_URL}/tag/v${version}`

const FIRST_CHECK_DELAY_MS = 30_000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** Nome do desinstalador do NSIS ao lado do .exe (`Uninstall ${productName}.exe`); sem ele, é o zip. */
const UNINSTALLER = 'Uninstall Sonic Obsidian.exe'
const VERSION_RE = /^\d+\.\d+\.\d+$/

interface Persisted {
  lastCheckAt: number | null
  /** Versão já baixada e esperando o clique (o aviso volta na próxima abertura). */
  pending: string | null
}

interface Deps {
  /** Grava settings.json e library.json antes de fechar para instalar. */
  flush(): Promise<void>
}

/** Rodando como pacote MSIX/AppX (Microsoft Store, ou o pacote de teste instalado à mão). */
const store = process.platform === 'win32' && !!process.windowsStore
const supported = app.isPackaged && process.platform === 'win32' && !store
const portable = supported && !existsSync(join(dirname(process.execPath), UNINSTALLER))

const state: UpdateState = { phase: 'idle', version: null, percent: 0, lastCheckAt: null, portable, supported, store }
const updatesStore = new JsonStore('updates')
let saved: Persisted = { lastCheckAt: null, pending: null }
let auto = false
let firstFrame = false
let manualRun = false
let firstTimer: NodeJS.Timeout | undefined
let tickTimer: NodeJS.Timeout | undefined
let intervalMs = DAY_MS
let tickMs = HOUR_MS
let loaded: Promise<void> | undefined
let updaterPromise: Promise<AppUpdater> | undefined
let deps: Deps

function broadcast(): void {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('update:state', { ...state })
}

function set(patch: Partial<UpdateState>): void {
  Object.assign(state, patch)
  broadcast()
}

function persist(patch: Partial<Persisted>): void {
  saved = { ...saved, ...patch }
  void updatesStore.save(saved)
}

/** `test-flags.json` (spec 012) também encurta o intervalo para o critério 8: `{"updateEveryMinutes": 5}`. */
async function readInterval(): Promise<void> {
  try {
    const raw = JSON.parse(await readFile(join(app.getPath('userData'), 'test-flags.json'), 'utf8')) as Record<string, unknown>
    const m = raw.updateEveryMinutes
    if (typeof m === 'number' && Number.isFinite(m) && m >= 1 && m <= 1440) {
      intervalMs = m * 60 * 1000
      tickMs = 60 * 1000
      log('update', `test flag: check every ${m} min`)
    }
  } catch {
    // sem arquivo: intervalo normal
  }
}

function load(): Promise<void> {
  loaded ??= (async () => {
    const raw = (await updatesStore.load().catch(() => null)) as Partial<Persisted> | null
    saved = {
      lastCheckAt: typeof raw?.lastCheckAt === 'number' && Number.isFinite(raw.lastCheckAt) ? raw.lastCheckAt : null,
      pending: typeof raw?.pending === 'string' && VERSION_RE.test(raw.pending) ? raw.pending : null
    }
    state.lastCheckAt = saved.lastCheckAt
    await readInterval()
  })()
  return loaded
}

/** O `electron-updater` só é carregado na primeira checagem (não pesa na abertura). */
function updater(): Promise<AppUpdater> {
  updaterPromise ??= import('electron-updater').then((mod) => {
    // CommonJS: o `autoUpdater` é um getter que o import() não enxerga como nome; vem pelo `default`.
    const cjs = (mod as unknown as { default?: typeof mod }).default ?? mod
    const u = cjs.autoUpdater
    u.autoDownload = !portable
    u.autoInstallOnAppQuit = false
    u.allowPrerelease = false
    u.allowDowngrade = false
    u.logger = {
      info: (m: unknown) => log('update', String(m)),
      warn: (m: unknown) => log('update', `warn: ${String(m)}`),
      error: (m: unknown) => log('update', `error: ${String(m)}`),
      debug: () => undefined
    }
    u.on('download-progress', (p: { percent: number }) => {
      const percent = Math.max(0, Math.min(100, Math.floor(p.percent)))
      if (state.phase !== 'downloading' || percent !== state.percent) set({ phase: 'downloading', percent })
    })
    u.on('update-downloaded', (info: { version: string }) => {
      log('update', `ready: ${info.version}`)
      persist({ pending: info.version })
      manualRun = false
      set({ phase: 'ready', version: info.version, percent: 100 })
    })
    u.on('error', (err: Error) => {
      log('update', `error: ${err?.message ?? String(err)}`)
      if (state.phase === 'downloading' || state.phase === 'checking') {
        // Erro de download/checagem: só aparece se foi a pessoa que pediu; senão, volta ao repouso.
        set({ phase: manualRun ? 'error' : 'idle', percent: 0 })
        manualRun = false
      }
    })
    return u
  })
  return updaterPromise
}

/** Checa (e, no instalador, começa a baixar). Devolve a fase em que ficou. */
async function check(manual: boolean): Promise<UpdatePhase> {
  await load()
  if (!supported) {
    log('update', store ? 'check skipped: Microsoft Store build (the Store updates the app)' : 'check skipped: not a packaged Windows build')
    if (manual) set({ phase: 'error' })
    return manual ? 'error' : state.phase
  }
  // Já há algo em andamento ou pronto: não pergunta de novo.
  if (state.phase === 'checking' || state.phase === 'downloading' || state.phase === 'ready' || state.phase === 'installing') return state.phase
  if (state.phase === 'available' && !manual) return state.phase
  manualRun = manual
  const before = state.phase
  set({ phase: 'checking' })
  try {
    const u = await updater()
    const r = await u.checkForUpdates()
    const now = Date.now()
    persist({ lastCheckAt: now })
    state.lastCheckAt = now
    const version = r?.updateInfo?.version ?? null
    if (!r || !r.isUpdateAvailable || !version) {
      log('update', `up to date (${app.getVersion()})`)
      if (saved.pending) persist({ pending: null })
      manualRun = false
      set({ phase: manual ? 'latest' : 'idle', version: null })
      return state.phase
    }
    if (portable) {
      log('update', `available (portable): ${version}`)
      manualRun = false
      set({ phase: 'available', version })
      return 'available'
    }
    // Instalador: o download já começou (autoDownload); o 'update-downloaded' leva a 'ready'.
    r.downloadPromise?.catch(() => undefined)
    // (o evento de progresso pode ter chegado antes)
    if ((state.phase as UpdatePhase) === 'checking') set({ phase: 'downloading', version, percent: 0 })
    else set({ version })
    return state.phase
  } catch (err) {
    log('update', `check failed: ${(err as Error)?.message ?? String(err)}`)
    manualRun = false
    set({ phase: manual ? 'error' : before === 'error' ? 'idle' : before })
    return state.phase
  }
}

function due(): boolean {
  if (saved.pending && saved.pending !== app.getVersion()) return true
  return saved.lastCheckAt === null || Date.now() - saved.lastCheckAt >= intervalMs
}

function stopSchedule(): void {
  clearTimeout(firstTimer)
  clearInterval(tickTimer)
  firstTimer = undefined
  tickTimer = undefined
}

/** Liga a agenda quando a chave está ligada e o primeiro quadro já saiu. */
function schedule(): void {
  stopSchedule()
  if (!auto || !firstFrame || !supported) return
  firstTimer = setTimeout(() => {
    void load().then(() => {
      if (auto && due()) void check(false)
    })
  }, FIRST_CHECK_DELAY_MS)
  firstTimer.unref()
  // Um tique por hora basta para "uma vez por dia" e sobrevive à suspensão do Windows.
  tickTimer = setInterval(() => {
    if (auto && due()) void check(false)
  }, tickMs)
  tickTimer.unref()
}

async function install(): Promise<boolean> {
  if (state.phase !== 'ready' || portable) return false
  set({ phase: 'installing' })
  log('update', `installing ${state.version ?? '?'} (silent, reopen)`)
  await deps.flush().catch(() => undefined)
  const u = await updater()
  u.quitAndInstall(true, true)
  return true
}

/** Grava o updates.json pendente (no fechamento). */
export const flushUpdater = (): Promise<void> => updatesStore.flush()

/** Chamado pela marca 'first frame' da abertura (startup.ts). */
export function updaterFirstFrame(): void {
  if (firstFrame) return
  firstFrame = true
  schedule()
}

export function registerUpdater(d: Deps): void {
  deps = d
  void load().then(broadcast)
  ipcMain.handle('update:state', async () => {
    await load()
    return { ...state }
  })
  // A chave "Buscar atualizações automaticamente" (settings.json, lido no renderer).
  ipcMain.on('update:configure', (_e, enabled: unknown) => {
    const next = enabled === true
    if (next === auto) return
    auto = next
    log('update', store ? 'automatic checks: none (Microsoft Store build, the Store updates the app)' : `automatic checks ${auto ? 'on' : 'off'}`)
    schedule()
  })
  ipcMain.handle('update:check', () => check(true))
  ipcMain.handle('update:install', () => install())
  // Só abre a página da versão encontrada (o renderer não escolhe a URL).
  ipcMain.handle('update:openRelease', () => {
    const v = state.version ?? app.getVersion()
    return shell.openExternal(releaseUrl(v))
  })
}
