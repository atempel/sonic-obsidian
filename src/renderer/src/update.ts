/**
 * Atualização automática no renderer (spec 029): espelho do estado do main
 * (`src/main/updater.ts`) + o "Depois" da plaquinha, que vale só até a próxima abertura.
 * Sem `window.so.update` (testes antigos, dev), tudo fica parado em `idle`.
 */
export type UpdatePhase = SoUpdatePhase
export type UpdateState = SoUpdateState

const RELEASES_URL = 'https://github.com/atempel/sonic-obsidian/releases'
export const releaseUrl = (version: string): string => `${RELEASES_URL}/tag/v${version}`

let state: UpdateState = { phase: 'idle', version: null, percent: 0, lastCheckAt: null, portable: false, supported: false }
/** Versão dispensada com "Depois" (só nesta abertura; uma versão mais nova volta a aparecer). */
let dismissed: string | null = null
const listeners = new Set<() => void>()
let started = false

const api = (): Window['so']['update'] => window.so?.update
const emit = (): void => listeners.forEach((fn) => fn())

function apply(next: UpdateState): void {
  state = { ...next }
  emit()
}

/** Liga o espelho ao main (uma vez, na abertura). */
export function startUpdates(auto: boolean): void {
  const u = api()
  if (!u) return
  if (!started) {
    started = true
    u.onState(apply)
    u.state().then(apply, () => undefined)
  }
  u.configure(auto)
}

/** A chave "Buscar atualizações automaticamente" mudou. */
export function configureUpdates(auto: boolean): void {
  api()?.configure(auto)
}

export const updateState = (): UpdateState => state

export function onUpdate(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Há versão para avisar (pronta no instalador, disponível no zip) e não foi dispensada. */
export function noticeVisible(s: UpdateState = state): boolean {
  if (s.phase === 'installing') return true
  if (s.phase !== 'ready' && s.phase !== 'available') return false
  return !!s.version && s.version !== dismissed
}

export function dismissUpdate(): void {
  dismissed = state.version
  emit()
}

/** "Verificar agora" (Configurações e busca rápida). Volta a mostrar a plaquinha dispensada. */
export async function checkUpdates(): Promise<UpdatePhase> {
  const u = api()
  if (!u) return 'error'
  dismissed = null
  emit()
  return u.check().catch(() => 'error' as const)
}

/** Duração do estado "Atualizando… o app reabre sozinho" antes de fechar (design: ~800 ms). */
export const INSTALL_DELAY_MS = 800

/** "Reiniciar e atualizar": mostra o estado de atualização e pede ao main para instalar. */
export function installUpdate(): void {
  const u = api()
  if (!u || state.phase !== 'ready') return
  apply({ ...state, phase: 'installing' })
  window.setTimeout(() => {
    u.install().then(
      (ok) => {
        if (!ok) u.state().then(apply, () => undefined)
      },
      () => u.state().then(apply, () => undefined)
    )
  }, INSTALL_DELAY_MS)
}

/** Abre a página da versão encontrada no navegador (zip portátil e "O que mudou"). */
export function openReleasePage(): void {
  void api()?.openRelease()
}
