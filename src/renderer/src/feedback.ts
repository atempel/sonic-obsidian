/**
 * Feedback e bugs (spec 031; design `v3-feedback.md`): três portas para o GitHub e o
 * "Copiar diagnóstico". Nada sai do app sozinho: só abre o navegador ou copia texto.
 * Os `id`s dos campos (`version`, `system`, `audio`, `preset`) são os do `bug_report.yml`.
 */
import { t } from './i18n'
import { showToast } from './ui/toast'

export const REPO_URL = 'https://github.com/atempel/sonic-obsidian/'
export const IDEAS_URL = `${REPO_URL}discussions/new?category=ideas`
export const QUESTION_URL = `${REPO_URL}discussions/new?category=q-a`

export type FeedbackKey = 'version' | 'windows' | 'gpu' | 'audio' | 'preset'
export const FEEDBACK_KEYS: readonly FeedbackKey[] = ['version', 'windows', 'gpu', 'audio', 'preset']
export type FeedbackInfo = Record<FeedbackKey, string>

/** URL do formulário *Bug report*: só os itens ligados (e não vazios) entram. */
export function bugReportUrl(info: FeedbackInfo, on: Record<FeedbackKey, boolean>): string {
  const has = (k: FeedbackKey): boolean => on[k] && info[k].trim() !== ''
  const q = ['template=bug_report.yml']
  const add = (id: string, v: string): void => void q.push(`${id}=${encodeURIComponent(v)}`)
  if (has('version')) add('version', info.version)
  const system = (['windows', 'gpu'] as const).filter(has).map((k) => info[k])
  if (system.length) add('system', system.join(', '))
  if (has('audio')) add('audio', info.audio)
  if (has('preset')) add('preset', info.preset)
  return `${REPO_URL}issues/new?${q.join('&')}`
}

/** Nome do renderizador WebGL (o mesmo do Diagnóstico, spec 012); vazio = não identificada. */
export function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    const name = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '') : ''
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return name.trim()
  } catch {
    return ''
  }
}

/**
 * Versão da Microsoft Store (spec 044): sem `enumerateDevices`, que no MSIX faz o Windows pedir
 * acesso à câmera (o Chromium varre também as câmeras). O nome vem da captura (main.ts).
 */
let storeOutput: string | null = null
export function setStoreOutputName(name: string): void {
  storeOutput = name
}

/** Saída de áudio padrão, como no passo 1 da checagem de captura (sem o prefixo "Padrão - "). */
export async function defaultOutputName(): Promise<string> {
  if (storeOutput !== null) return storeOutput
  const outputs = await navigator.mediaDevices?.enumerateDevices().catch(() => [] as MediaDeviceInfo[]) ?? []
  const out = outputs.find((d) => d.kind === 'audiooutput' && d.deviceId === 'default') ?? outputs.find((d) => d.kind === 'audiooutput')
  return out?.label.replace(/^(Padrão|Default)\s*-\s*/i, '').trim() ?? ''
}

/** Os cinco itens do painel; o preset é o nome completo (com autor), como na faixa. */
export async function gatherInfo(preset: string): Promise<FeedbackInfo> {
  const [version, windows, audio] = await Promise.all([
    window.so.app.version().then((v) => (v ? `v${v.replace(/^v/, '')}` : ''), () => ''),
    window.so.system.osInfo?.().catch(() => '') ?? Promise.resolve(''),
    defaultOutputName().catch(() => '')
  ])
  return { version, windows, gpu: gpuName(), audio, preset }
}

function open(url: string, what: string): void {
  window.so.log(`feedback: opened ${what}`)
  void window.so.system.openLink(url)
  showToast(t('feedback.opened'), { force: true })
}

export const openBugForm = (url: string): void => open(url, 'bug form')
export const openIdeas = (): void => open(IDEAS_URL, 'ideas')
export const openQuestion = (): void => open(QUESTION_URL, 'q&a')

/** Copia as últimas 200 linhas do log (o main troca a pasta do usuário por `~`). */
export async function copyDiagnostics(): Promise<boolean> {
  try {
    const text = (await window.so.logTail?.()) ?? null
    if (!text) throw new Error('no log')
    await window.so.system.copyText(text)
    window.so.log(`feedback: copied diagnostics (${text.split('\n').length} lines)`)
    showToast(t('feedback.copied'), { force: true })
    return true
  } catch (err) {
    window.so.log(`feedback: copy diagnostics failed: ${err instanceof Error ? err.message : String(err)}`)
    showToast(t('feedback.copyFailed'), { force: true, important: true })
    return false
  }
}
