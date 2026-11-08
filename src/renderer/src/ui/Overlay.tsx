import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './theme.css'
import './palco.css'
import './biblioteca.css'
import { render } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { CaptureState, Core } from '../core/commands'
import { Icon } from './icons'
import { Library } from './Library'
import { Palette } from './Palette'
import { setupIdle, type Idle } from './idle'
import { splitPresetName } from './preset-name'
import { onToast, showToast } from './toast'

/**
 * Interface v3 por cima do visual — spec 009 (Palco: faixa de controle e
 * assinatura). Protótipo "Palco integrado", versão 1794154301-3f85.
 * Regra (DECISIONS "UI do overlay"): o que muda a cada quadro (medidor,
 * progresso da rotação) atualiza o DOM direto, sem re-render.
 */
export interface PalcoBridge {
  core: Core
  /** Todos os nomes de preset, em ordem alfabética (cresce quando os pacotes extras chegam). */
  presets(): readonly string[]
  /** Segundos até a próxima troca automática. */
  rotationRemaining(): number
  retryCapture(): void
  openSoundSettings(): void
  isFullScreen(): boolean
}

/**
 * Re-renderiza quando o Core muda de preset ou de estado. As assinaturas usam
 * useLayoutEffect: precisam existir já na montagem, porque o primeiro preset e o
 * resultado da captura chegam logo em seguida.
 */
function useCoreVersion(core: Core): number {
  const [v, setV] = useState(0)
  useLayoutEffect(() => {
    const bump = (): void => setV((x) => x + 1)
    const offs = [core.events.on('stateChanged', bump), core.events.on('presetChanged', bump)]
    window.addEventListener('resize', bump) // tela cheia muda o ícone
    return () => {
      offs.forEach((off) => off())
      window.removeEventListener('resize', bump)
    }
  }, [core])
  return v
}

const mmss = (s: number): string => {
  const t = Math.ceil(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

// ── Assinatura na troca ───────────────────────────────────────
function Credit({ core }: { core: Core }) {
  const ref = useRef<HTMLDivElement>(null)
  const sweep = useRef<HTMLElement>(null)
  const [name, setName] = useState('')
  useLayoutEffect(() => {
    let timer: number | undefined
    return core.events.on('presetChanged', ({ name: n, blendSeconds }) => {
      setName(n)
      const el = ref.current
      const sw = sweep.current
      if (!el || !sw) return
      const sigMs = blendSeconds > 0 ? blendSeconds * 1000 : 400
      sw.style.transition = 'none'
      sw.style.width = '0'
      void sw.offsetWidth // reinicia a barra
      sw.style.transition = `width ${sigMs}ms linear`
      sw.style.width = '100%'
      el.classList.add('show')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => el.classList.remove('show'), Math.max(4000, sigMs + 1500))
    })
  }, [core])
  const { title, author } = splitPresetName(name)
  return (
    <div class="credit" ref={ref} aria-live="polite">
      <h1>{title}</h1>
      {author && <p>por {author}</p>}
      <div class="sweep">
        <i ref={sweep} />
      </div>
    </div>
  )
}

// ── Medidor (20 segmentos, peak hold), fora do re-render ─────
function Meter({ core }: { core: Core }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current!
    const n = 20
    const segs = Array.from({ length: n }, () => el.appendChild(document.createElement('i')))
    let peak = 0
    let last = ''
    const off = core.events.on('levelTick', ({ level: rms }) => {
      const level = Math.min(1, rms * 2)
      peak = Math.max(level, peak - 0.012)
      const on = Math.round(level * n)
      const pk = Math.min(n - 1, Math.round(peak * n) - 1)
      const key = `${on}:${pk}`
      if (key === last) return
      last = key
      segs.forEach((s, i) => {
        s.className = i < on ? (i >= n - 2 ? 'clip' : i >= n * 0.7 ? 'hot' : 'on') : i === pk ? 'peak' : ''
      })
    })
    return () => {
      off()
      el.textContent = ''
    }
  }, [core])
  return <span class="meter" ref={ref} aria-hidden="true" />
}

// ── Faixa de controle ─────────────────────────────────────────
function Strip({ bridge }: { bridge: PalcoBridge }) {
  const { core } = bridge
  useCoreVersion(core)
  const line = useRef<HTMLElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  const { settings, current } = core.state
  const rotOn = settings.rotation.enabled
  const fav = core.isFavorite(current)
  const { title, author } = splitPresetName(current)
  const fullscreen = bridge.isFullScreen()

  // Progresso da rotação: DOM direto, ~4×/s basta para m:ss e a linha.
  useEffect(() => {
    const tick = (): void => {
      const on = core.state.settings.rotation.enabled
      const interval = core.rotationIntervalSeconds
      const left = bridge.rotationRemaining()
      if (line.current) line.current.style.width = on ? `${(1 - left / interval) * 100}%` : '0'
      if (time.current) time.current.textContent = on ? mmss(left) : 'off'
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [bridge, core])

  const toggleFav = (): void => {
    const r = core.run<boolean>('library.favorite', {}, 'ui')
    if (r.ok) showToast(r.value ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.')
  }

  return (
    <div class="strip-wrap">
      <div class="strip" role="toolbar" aria-label="Controles do visual">
        <i class="rot-line" ref={line} />
        <div class="now">
          <button
            class="ibtn"
            aria-label="Abrir biblioteca"
            title="Biblioteca (L)"
            aria-expanded={core.state.overlay === 'library'}
            onClick={() => toggleOverlay(core, 'library')}
          >
            <Icon name="library" />
          </button>
          <div class="now-text">
            <div class="now-title" title={current}>
              {title}
            </div>
            {author && <div class="now-author">por {author}</div>}
          </div>
          <button class="ibtn fav" aria-pressed={fav} aria-label={fav ? 'Desfavoritar' : 'Favoritar'} title={fav ? 'Desfavoritar' : 'Favoritar'} onClick={toggleFav}>
            <Icon name="star" />
          </button>
        </div>
        <div class="strip-t">
          <button class="ibtn" aria-label="Preset anterior" title="Anterior (PgUp)" onClick={() => core.run('preset.previous', {}, 'ui')}>
            <Icon name="skip-back" />
          </button>
          <button class="ibtn" aria-label="Preset aleatório" title="Aleatório (Espaço)" onClick={() => core.run('preset.random', {}, 'ui')}>
            <Icon name="shuffle" />
          </button>
          <button class="ibtn" aria-label="Próximo preset" title="Próximo (PgDn ou N)" onClick={() => core.run('preset.next', {}, 'ui')}>
            <Icon name="skip-forward" />
          </button>
          <span class="sep" aria-hidden="true" />
          <button class="rot" aria-pressed={rotOn} title="Rotação automática (R)" onClick={() => core.run('rotation.set', { enabled: !rotOn }, 'ui')}>
            <Icon name="repeat" />
            <span>Rotação</span>
            <span class="num" ref={time} />
          </button>
        </div>
        <div class="tail">
          <div class="level">
            <Meter core={core} />
          </div>
          <button class="ibtn" aria-label="Buscar presets" title="Buscar presets (/ ou Ctrl+K)" onClick={() => toggleOverlay(core, 'search')}>
            <Icon name="search" />
          </button>
          <button class="ibtn" aria-label="Ajustes rápidos" title="Ajustes rápidos (,) — em breve" disabled>
            <Icon name="sliders-horizontal" />
          </button>
          <button
            class="ibtn"
            aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            title={`${fullscreen ? 'Sair da tela cheia' : 'Tela cheia'} (F ou F11)`}
            onClick={() => core.run('window.fullscreen', {}, 'ui')}
          >
            <Icon name={fullscreen ? 'minimize' : 'maximize'} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Alça da borda esquerda ────────────────────────────────────
function Edge({ core }: { core: Core }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const move = (e: MouseEvent): void => {
      if (e.clientX < 24) setOn(true)
      else if (e.clientX > 40) setOn(false)
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (
    <button class={on ? 'edge on' : 'edge'} aria-label="Abrir biblioteca" title="Abrir biblioteca (L)" onClick={() => core.run('ui.open', { overlay: 'library' }, 'ui')}>
      <Icon name="library" />
    </button>
  )
}

// ── Cartões de estado ────────────────────────────────────────
function StateCards({ bridge }: { bridge: PalcoBridge }) {
  const { core } = bridge
  const [silent, setSilent] = useState(false)
  const [capture, setCapture] = useState<CaptureState>(core.state.capture)
  useLayoutEffect(() => {
    const offs = [
      core.events.on('silenceChanged', ({ notice }) => setSilent(notice)),
      core.events.on('captureChanged', ({ state }) => setCapture(state))
    ]
    return () => offs.forEach((off) => off())
  }, [core])

  if (capture === 'denied') {
    return (
      <div class="state error" role="alert">
        <h2>
          <Icon name="triangle-alert" />
          Não foi possível capturar o áudio
        </h2>
        <p>O Windows recusou a captura da saída padrão. Feche apps que usam o áudio em modo exclusivo e tente de novo.</p>
        <div class="actions">
          <button class="btn btn-primary" onClick={() => bridge.retryCapture()}>
            <Icon name="rotate-cw" small />
            Tentar de novo
          </button>
          <button class="btn btn-ghost" onClick={() => bridge.openSoundSettings()}>
            Abrir configurações de som
          </button>
        </div>
      </div>
    )
  }
  if (silent && capture === 'ok') {
    return (
      <div class="state" role="status">
        <h2>
          <Icon name="volume-x" />
          Sem áudio
        </h2>
        <p>Toque algo no computador e o visual reage. A captura continua ligada.</p>
      </div>
    )
  }
  return null
}

// ── Toast global ─────────────────────────────────────────────
function GlobalToast() {
  const [text, setText] = useState('')
  const [on, setOn] = useState(false)
  useLayoutEffect(() => {
    let timer: number | undefined
    return onToast((t, ms) => {
      setText(t)
      setOn(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setOn(false), ms)
    })
  }, [])
  return (
    <div class={on ? 'gtoast on' : 'gtoast'} role="status" aria-live="polite">
      {text}
    </div>
  )
}

/** Abre ou fecha um overlay pelo Core (`ui.open` / `ui.close`). */
export function toggleOverlay(core: Core, overlay: 'library' | 'search'): void {
  if (core.state.overlay === overlay) core.run('ui.close', {}, 'ui')
  else core.run('ui.open', { overlay }, 'ui')
}

export function Overlay({ bridge }: { bridge: PalcoBridge }) {
  const { core } = bridge
  useCoreVersion(core)
  const overlay = core.state.overlay
  useLayoutEffect(() => {
    // Fechar devolve o foco ao visual (as teclas globais voltam a valer).
    if (overlay === null && document.activeElement instanceof HTMLElement && document.activeElement.closest('.lib, .palette, .menu')) {
      document.activeElement.blur()
    }
  }, [overlay])
  const presets = bridge.presets()
  return (
    <>
      <Credit core={core} />
      <StateCards bridge={bridge} />
      <Edge core={core} />
      <Strip bridge={bridge} />
      <Library core={core} presets={presets} />
      <Palette core={core} presets={presets} />
      <GlobalToast />
    </>
  )
}

/** Monta a interface e devolve o controle do auto-hide (para a tecla `H`). */
export function mountOverlay(el: HTMLElement, bridge: PalcoBridge): Idle {
  render(<Overlay bridge={bridge} />, el)
  const { state } = bridge.core
  return setupIdle(
    () => state.settings.pinControls || state.overlay !== null || !!document.activeElement?.closest('.strip')
  )
}
