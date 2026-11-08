import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './theme.css'
import './palco.css'
import './biblioteca.css'
import './ajustes.css'
import './settings.css'
import { render } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { CaptureState, Core } from '../core/commands'
import { Icon } from './icons'
import { Library } from './Library'
import { Palette } from './Palette'
import { QuickSettings } from './QuickSettings'
import { Settings } from './Settings'
import { setupIdle, type Idle } from './idle'
import { splitPresetName } from './preset-name'
import { TextStack, coreRise, drainLine, nudgeIcon, shuffleIcon } from './motion'
import { TOAST_MS, onToast, showToast } from './toast'

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
  /** Tipos de transição forçados (spec 013); sem eles, o motor sorteia. */
  blendTypesAvailable: boolean
  /** Expressividade ligada ao motor (spec 015). */
  expressionAvailable: boolean
  /** fps medido no último segundo. */
  fps(): number
  /** Dispositivo e taxa da captura (Configurações › Captura). */
  captureInfo(): { device: string; sampleRate: number }
  presetCount(): number
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
    // Modo limpo ligado no meio da assinatura: some na hora (spec 014).
    const offState = core.events.on('stateChanged', () => {
      if (core.state.settings.overlayText.clean) ref.current?.classList.remove('show')
    })
    const offPreset = core.events.on('presetChanged', ({ name: n, blendSeconds, origin }) => {
      setName(n)
      const el = ref.current
      const sw = sweep.current
      if (!el || !sw) return
      // Texto sobre o visual (spec 014): Nunca, Só quando eu troco (a rotação troca em silêncio) e Modo limpo.
      const { presetName, clean } = core.state.settings.overlayText
      if (clean || presetName === 'never' || (presetName === 'manual' && origin === 'rotation')) {
        el.classList.remove('show')
        return
      }
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
    return () => {
      offState()
      offPreset()
    }
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

// ── Medidor (20 segmentos), fora do re-render ──────────────
/**
 * M08: balística de PPM. Ataque ~10 ms, queda linear de ~1,5 s do topo ao fundo, pico
 * retido 1,5 s e depois caindo; no silêncio os segmentos se apagam um a um, 30 ms cada.
 */
export function Meter({ core }: { core: Core }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current!
    const n = 20
    const segs = Array.from({ length: n }, () => el.appendChild(document.createElement('i')))
    let lvl = 0
    let pk = 0
    let pkAt = 0
    let pkVel = 0
    let cascade = n
    let silent = false
    let last = performance.now()
    const off = core.events.on('levelTick', ({ level: rms }) => {
      const now = performance.now()
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      const target = Math.min(1, rms * 2)
      let on: number
      if (target > 0.004) {
        silent = false
        if (target >= lvl) lvl += (target - lvl) * (1 - Math.exp(-dt / 0.0045))
        else lvl = Math.max(target, lvl - dt / 1.5)
        if (lvl >= pk) {
          pk = lvl
          pkAt = now
          pkVel = 0
        } else if (now - pkAt > 1500) {
          pkVel += 0.3 * dt
          pk = Math.max(lvl, pk - (0.12 + pkVel) * dt)
        }
        on = Math.round(lvl * n)
      } else {
        if (!silent) {
          silent = true
          cascade = Math.round(lvl * n)
        }
        cascade = Math.max(0, cascade - dt / 0.03)
        lvl = cascade / n
        pk = Math.min(pk, lvl)
        on = Math.ceil(cascade - 1e-6)
      }
      const pi = pk * n < 0.5 ? -1 : Math.min(n - 1, Math.round(pk * n) - 1)
      for (let i = 0; i < n; i++) {
        const c = i < on ? (i >= n - 2 ? 'clip' : i >= n * 0.7 ? 'hot' : 'on') : i === pi ? 'peak' : ''
        if (segs[i]!.className !== c) segs[i]!.className = c
      }
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
  const lineP = useRef(0)
  const titleEl = useRef<HTMLDivElement>(null)
  const authorEl = useRef<HTMLDivElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  const fpsEl = useRef<HTMLSpanElement>(null)
  const { settings, current } = core.state
  const rotOn = settings.rotation.enabled
  const fav = core.isFavorite(current)
  const fullscreen = bridge.isFullScreen()

  // Progresso da rotação: DOM direto, ~4×/s basta para m:ss e a linha.
  useEffect(() => {
    const tick = (): void => {
      const on = core.state.settings.rotation.enabled
      const interval = core.rotationIntervalSeconds
      const left = bridge.rotationRemaining()
      lineP.current = on ? Math.min(1, Math.max(0, 1 - left / interval)) : 0
      if (line.current) line.current.style.transform = `scaleX(${lineP.current})`
      if (time.current) time.current.textContent = on ? mmss(left) : 'off'
      if (fpsEl.current) fpsEl.current.textContent = `${Math.round(bridge.fps())} fps`
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [bridge, core])

  // M02 (título e autor trocam em pilha) e M03 (a linha esvazia) na troca de preset.
  useLayoutEffect(() => {
    if (!titleEl.current || !authorEl.current) return
    const t = new TextStack(titleEl.current)
    const a = new TextStack(authorEl.current)
    const set = (name: string): void => {
      const p = splitPresetName(name)
      t.set(p.title)
      a.set(p.author ? `por ${p.author}` : '')
    }
    set(core.state.current)
    return core.events.on('presetChanged', ({ name, origin }) => {
      if (origin === 'startup') return set(name)
      const p = splitPresetName(name)
      t.swap(p.title, 0, true)
      a.swap(p.author ? `por ${p.author}` : '', 40)
      if (line.current && core.state.settings.rotation.enabled) drainLine(line.current, lineP.current)
    })
  }, [core])

  const toggleFav = (btn: HTMLElement): void => {
    const r = core.run<boolean>('library.favorite', {}, 'ui')
    if (!r.ok) return
    if (r.value) coreRise(btn)
    showToast(r.value ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.')
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
            <div class="now-row">
              <div class="now-title" title={current} ref={titleEl} />
              {/* M19: o ícone entra em 120 ms (por isso fica no DOM, só escondido). */}
              <span
                class={settings.overlayText.clean ? 'clean-ico on' : 'clean-ico'}
                role="img"
                aria-label="Modo limpo ligado"
                aria-hidden={!settings.overlayText.clean}
                title="Modo limpo ligado (T)"
              >
                <Icon name="eye-off" small />
              </span>
            </div>
            <div class="now-author" ref={authorEl} />
          </div>
          <button
            class="ibtn fav favp"
            aria-pressed={fav}
            aria-label={fav ? 'Desfavoritar' : 'Favoritar'}
            title={fav ? 'Desfavoritar' : 'Favoritar'}
            onClick={(e) => toggleFav(e.currentTarget)}
          >
            {/* M07: contorno + estrela cheia que cresce do centro + núcleo que sobe. */}
            <span class="fav-wrap">
              <Icon name="star" />
              <Icon name="star" fill />
              <span class="core" aria-hidden="true" />
            </span>
          </button>
        </div>
        <div class="strip-t">
          <button
            class="ibtn"
            aria-label="Preset anterior"
            title="Anterior (←)"
            onClick={(e) => {
              if (e.detail > 0) nudgeIcon(e.currentTarget, -2)
              core.run('preset.previous', {}, 'ui')
            }}
          >
            <Icon name="skip-back" />
          </button>
          <button
            class="ibtn"
            aria-label="Preset aleatório"
            title="Aleatório (Espaço)"
            onClick={(e) => {
              if (e.detail > 0) shuffleIcon(e.currentTarget)
              core.run('preset.random', {}, 'ui')
            }}
          >
            <Icon name="shuffle" />
          </button>
          <button
            class="ibtn"
            aria-label="Próximo preset"
            title="Próximo (→)"
            onClick={(e) => {
              if (e.detail > 0) nudgeIcon(e.currentTarget, 2)
              core.run('preset.next', {}, 'ui')
            }}
          >
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
            {settings.showFps && <span class="fps num" ref={fpsEl} title="fps do visual" />}
          </div>
          <button class="ibtn" aria-label="Buscar presets" title="Buscar presets (/ ou Ctrl+K)" onClick={() => toggleOverlay(core, 'search')}>
            <Icon name="search" />
          </button>
          <button
            class="ibtn"
            aria-label="Ajustes rápidos"
            title="Ajustes rápidos (,)"
            aria-expanded={core.state.overlay === 'quick'}
            onClick={() => toggleOverlay(core, 'quick')}
          >
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

// ── Controles da janela (spec 014) ───────────────────────────
/** Zona do canto superior direito que mostra minimizar e fechar (protótipo: ~160×96 px). */
const WIN_ZONE_W = 160
const WIN_ZONE_H = 96

function WindowControls({ core }: { core: Core }) {
  useCoreVersion(core)
  const [on, setOn] = useState(false)
  useEffect(() => {
    let timer: number | undefined
    const hideSoon = (): void => {
      if (timer === undefined) timer = window.setTimeout(() => ((timer = undefined), setOn(false)), 220)
    }
    const move = (e: MouseEvent): void => {
      if (e.clientX > window.innerWidth - WIN_ZONE_W && e.clientY < WIN_ZONE_H) {
        window.clearTimeout(timer)
        timer = undefined
        setOn(true)
      } else hideSoon()
    }
    window.addEventListener('mousemove', move, { passive: true })
    document.addEventListener('mouseleave', hideSoon)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseleave', hideSoon)
    }
  }, [])
  // Some com a Biblioteca, a busca ou outro painel aberto sobre o canto.
  const blocked = core.state.overlay !== null
  return (
    <div class={`winctl${on && !blocked ? ' on' : ''}${blocked ? ' blocked' : ''}`} role="group" aria-label="Janela">
      <button class="ibtn" aria-label="Minimizar" title="Minimizar" onClick={() => void window.so.window.minimize()}>
        <Icon name="minus" />
      </button>
      <button class="ibtn win-close" aria-label="Fechar" title="Fechar (Ctrl+W)" onClick={() => void window.so.window.close()}>
        <Icon name="x" />
      </button>
    </div>
  )
}

// ── Toast global (M13) ───────────────────────────────────────
/** Entra 8 px de baixo; sai só com fade. 4 s, pausa com o mouse em cima; aviso novo troca o texto no lugar (120 ms). */
function GlobalToast() {
  const el = useRef<HTMLDivElement>(null)
  const textEl = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const box = el.current!
    const label = textEl.current!
    let visible = false
    let paused = false
    let timer: number | undefined
    let remain = TOAST_MS
    let armedAt = 0
    const hide = (): void => {
      window.clearTimeout(timer)
      box.classList.remove('on')
      visible = false
      paused = false
    }
    const arm = (): void => {
      window.clearTimeout(timer)
      armedAt = performance.now()
      if (visible && !paused) timer = window.setTimeout(hide, remain)
    }
    const pause = (): void => {
      if (!visible || paused) return
      paused = true
      window.clearTimeout(timer)
      remain = Math.max(300, remain - (performance.now() - armedAt))
    }
    const resume = (): void => {
      if (!paused) return
      paused = false
      arm()
    }
    const onVisibility = (): void => (document.hidden ? pause() : resume())
    box.addEventListener('mouseenter', pause)
    box.addEventListener('mouseleave', resume)
    document.addEventListener('visibilitychange', onVisibility)
    const off = onToast((t) => {
      label.textContent = t
      if (!visible) {
        box.classList.add('on')
        visible = true
      } else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        label.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
      }
      remain = TOAST_MS
      arm()
    })
    return () => {
      off()
      window.clearTimeout(timer)
      box.removeEventListener('mouseenter', pause)
      box.removeEventListener('mouseleave', resume)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  return (
    <div class="gtoast" ref={el} role="status" aria-live="polite">
      <span ref={textEl} />
    </div>
  )
}

/** Abre ou fecha um overlay pelo Core (`ui.open` / `ui.close`). */
export function toggleOverlay(core: Core, overlay: 'library' | 'search' | 'quick' | 'settings'): void {
  if (core.state.overlay === overlay) core.run('ui.close', {}, 'ui')
  else core.run('ui.open', { overlay }, 'ui')
}

export function Overlay({ bridge }: { bridge: PalcoBridge }) {
  const { core } = bridge
  useCoreVersion(core)
  const overlay = core.state.overlay
  const clean = core.state.settings.overlayText.clean
  // M19: o texto sobre o visual some em 400 ms com o Modo limpo.
  useLayoutEffect(() => void document.body.classList.toggle('clean', clean), [clean])
  useLayoutEffect(() => {
    // Fechar devolve o foco ao visual (as teclas globais voltam a valer).
    if (overlay === null && document.activeElement instanceof HTMLElement && document.activeElement.closest('.lib, .palette, .menu, .sheet, .settings')) {
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
      <WindowControls core={core} />
      <Library core={core} presets={presets} />
      <Palette core={core} presets={presets} />
      <QuickSettings core={core} blendTypesAvailable={bridge.blendTypesAvailable} expressionAvailable={bridge.expressionAvailable} />
      <Settings bridge={bridge} />
      <GlobalToast />
    </>
  )
}

/**
 * M04 e M14: botões de ícone e switches afundam (0,97 / o botão do switch estica) enquanto o
 * ponteiro aperta. Só com ponteiro: pelo teclado nada anima.
 */
function setupPress(): void {
  let pressed: HTMLElement | null = null
  const release = (): void => {
    pressed?.classList.remove('pr')
    pressed = null
  }
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('.ibtn, .switch')
      if (!el || (el as HTMLButtonElement).disabled || el.querySelector('input:disabled')) return
      release()
      pressed = el
      el.classList.add('pr')
    },
    true
  )
  for (const ev of ['pointerup', 'pointercancel', 'dragend']) document.addEventListener(ev, release, true)
  document.addEventListener('pointerout', (e) => {
    if (pressed && e.target === pressed && !pressed.contains(e.relatedTarget as Node | null)) release()
  }, true)
  window.addEventListener('blur', release)
}

/** Monta a interface e devolve o controle do auto-hide (para a tecla `H`). */
export function mountOverlay(el: HTMLElement, bridge: PalcoBridge): Idle {
  render(<Overlay bridge={bridge} />, el)
  // Clique com o mouse num botão da faixa, da janela ou da alça não deixa o foco preso:
  // senão a próxima tecla global mostra o anel de foco (a estrela parecia marcada depois
  // de trocar de preset) e o Espaço aciona o botão em vez de sortear. Pelo teclado
  // (Tab + Enter/Espaço, detail === 0) o foco fica, para acessibilidade.
  el.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest?.('.strip button, .winctl button, .edge, .sheet button')
    if (btn instanceof HTMLElement && e.detail > 0) btn.blur()
  })
  setupPress()
  const { state } = bridge.core
  return setupIdle(
    () => state.settings.pinControls || state.overlay !== null || !!document.activeElement?.closest('.strip')
  )
}
