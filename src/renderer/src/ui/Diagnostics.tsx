import './setup.css'
import { render } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { CaptureCheck, CaptureState, Core } from '../core/commands'
import { Icon } from './icons'
import { Meter, type PalcoBridge } from './Overlay'
import { splitPresetName } from './preset-name'

/**
 * Setup e diagnóstico (spec 012; protótipo "Setup" e "Palco integrado", design 1794178325-0fd0).
 * Superfícies não-modais: as teclas do visual continuam valendo enquanto aparecem.
 */

// ── Esc fecha o cartão de boas-vindas e o aviso de silêncio antes de tudo ──
const dismissers: (() => boolean)[] = []
/** Fecha a superfície flutuante mais recente; `true` se fechou alguma. */
export function dismissFloat(): boolean {
  for (let i = dismissers.length - 1; i >= 0; i--) if (dismissers[i]!()) return true
  return false
}
function useDismiss(fn: () => boolean): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const d = (): boolean => ref.current()
    dismissers.push(d)
    return () => void dismissers.splice(dismissers.indexOf(d), 1)
  }, [])
}

/** Mostra com transição (hidden → .in) e esconde depois dela (230 ms). */
function useFloat(visible: boolean): { mounted: boolean; cls: string } {
  const [mounted, setMounted] = useState(visible)
  const [inn, setInn] = useState(false)
  useLayoutEffect(() => {
    if (visible) {
      setMounted(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setInn(true)))
      return () => cancelAnimationFrame(id)
    }
    setInn(false)
    const t = window.setTimeout(() => setMounted(false), 230)
    return () => window.clearTimeout(t)
  }, [visible])
  return { mounted, cls: inn ? ' in' : '' }
}

/** "Copiar diagnóstico" → "Copiado" por 2 s. */
function CopyButton({ text, ghost = true }: { text: () => Promise<string>; ghost?: boolean }) {
  const [label, setLabel] = useState('Copiar diagnóstico')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      class={ghost ? 'btn btn-ghost' : 'btn'}
      onClick={async () => {
        try {
          await window.so.system.copyText(await text())
          setLabel('Copiado')
        } catch {
          setLabel('Não foi possível copiar')
        }
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setLabel('Copiar diagnóstico'), 2000)
      }}
    >
      <Icon name="copy" small />
      <span role="status">{label}</span>
    </button>
  )
}

// ── Primeira abertura ─────────────────────────────────────────
export function WelcomeCard({ core }: { core: Core }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (core.state.settings.welcomeSeen) return
    const t = window.setTimeout(() => setShow(true), 800)
    return () => window.clearTimeout(t)
  }, [core])
  const close = (): void => {
    setShow(false)
    core.run('settings.set', { welcomeSeen: true }, 'ui')
  }
  useDismiss(() => (show ? (close(), true) : false))
  const { mounted, cls } = useFloat(show)
  if (!mounted) return null
  return (
    <section class={`float card${cls}`} aria-labelledby="wTitle">
      <div class="head">
        <h2 id="wTitle">Já está ouvindo o seu computador</h2>
      </div>
      <p class="body-text">Toque música em qualquer app e o visual reage. Nada para configurar.</p>
      <ul class="shortcuts">
        <li>
          <kbd>Espaço</kbd>
          <span>Preset aleatório</span>
        </li>
        <li>
          <kbd>/</kbd>
          <span>Buscar</span>
        </li>
        <li>
          <kbd>L</kbd>
          <span>Biblioteca</span>
        </li>
      </ul>
      <div class="actions">
        <button class="btn btn-primary" onClick={close}>
          Entendi
        </button>
        <button
          class="btn btn-ghost"
          onClick={() => {
            close()
            core.run('ui.open', { overlay: 'settings' }, 'ui')
          }}
        >
          Abrir configurações
        </button>
      </div>
    </section>
  )
}

// ── Sem som por 10 s ─────────────────────────────────────────
export function SilenceNotice({ core }: { core: Core }) {
  const [notice, setNotice] = useState(false)
  const [closed, setClosed] = useState(false)
  const [capture, setCapture] = useState<CaptureState>(core.state.capture)
  const [testing, setTesting] = useState(false)
  const [signal, setSignal] = useState(false)
  useLayoutEffect(() => {
    const offs = [
      core.events.on('silenceChanged', ({ notice: n }) => {
        setNotice(n)
        if (!n) setClosed(false) // volta a aparecer no próximo silêncio de 10 s
      }),
      core.events.on('captureChanged', ({ state }) => setCapture(state))
    ]
    return () => offs.forEach((off) => off())
  }, [core])
  useEffect(() => {
    if (!testing) return
    const off = core.events.on('levelTick', ({ level }) => setSignal(level * 2 > 0.03))
    const t = window.setTimeout(() => setTesting(false), 3000)
    return () => (off(), window.clearTimeout(t))
  }, [core, testing])
  const visible = notice && !closed && capture === 'ok'
  useDismiss(() => (visible ? (setClosed(true), true) : false))
  const { mounted, cls } = useFloat(visible)
  if (!mounted) return null
  return (
    <div class={`float notice${cls}`} role="status">
      <Icon name="volume-x" />
      <div class="txt">
        <div class="t">Nenhum som chegando</div>
        <div class="d">A captura está ligada. Toque algo ou confira se o som está saindo pela saída padrão do Windows.</div>
      </div>
      {testing ? (
        <div class="testing">
          <Meter core={core} />
          <span class="num">{signal ? 'sinal' : 'sem sinal'}</span>
        </div>
      ) : (
        <button
          class="btn btn-ghost"
          onClick={() => {
            setSignal(false)
            setTesting(true)
          }}
        >
          Testar captura
        </button>
      )}
    </div>
  )
}

// ── Captura falhou ───────────────────────────────────────────
const STATE_LABEL: Record<CaptureCheck['state'], string> = { ok: 'Ok', fail: 'Falhou', busy: 'Verificando', pending: 'Pendente' }
const STATE_TEXT: Record<CaptureCheck['state'], string> = { ok: 'ok', fail: 'falhou', busy: 'verificando', pending: 'não executado' }

export function CaptureDiag({ bridge }: { bridge: PalcoBridge }) {
  const { core } = bridge
  const [capture, setCapture] = useState<CaptureState>(core.state.capture)
  const [checks, setChecks] = useState<CaptureCheck[]>(bridge.captureChecks())
  const [retrying, setRetrying] = useState(false)
  const [okLine, setOkLine] = useState(false)
  const closeTimer = useRef(0)
  useLayoutEffect(() => {
    const offs = [core.events.on('captureChanged', ({ state }) => setCapture(state)), core.events.on('captureChecks', ({ checks: c }) => setChecks(c))]
    return () => (offs.forEach((off) => off()), window.clearTimeout(closeTimer.current))
  }, [core])
  // Fica aberto enquanto a captura está recusada, e durante "Captura funcionando" depois de um "Tentar de novo".
  const visible = capture === 'denied' || retrying || okLine
  const { mounted, cls } = useFloat(visible)
  if (!mounted) return null
  const retry = async (): Promise<void> => {
    setRetrying(true)
    setOkLine(false)
    const ok = await bridge.retryCapture()
    setRetrying(false)
    if (ok) {
      setOkLine(true)
      closeTimer.current = window.setTimeout(() => setOkLine(false), 1400)
    }
  }
  const diagText = async (): Promise<string> => {
    const version = await window.so.app.version().catch(() => '?')
    return [
      `Sonic Obsidian ${version} — diagnóstico de captura`,
      `Data: ${new Date().toISOString()}`,
      'Fonte: Saída padrão do Windows',
      ...checks.map((c) => `${c.label}: ${STATE_TEXT[c.state]} (${c.detail})${c.help ? ` — ${c.help}` : ''}`)
    ].join('\n')
  }
  return (
    <section class={`float panel${cls}`} role="alert" aria-labelledby="dTitle">
      <div class="head">
        <Icon name="triangle-alert" />
        <h2 id="dTitle">Não foi possível capturar o áudio</h2>
      </div>
      <ul class="checks">
        {checks.map((c) => (
          <li key={c.label}>
            <span class="st" data-s={c.state}>
              <Icon name={c.state === 'ok' ? 'check' : c.state === 'fail' ? 'x' : 'loader'} />
              <span class="vh">{STATE_LABEL[c.state]}</span>
            </span>
            <div>
              <div class="lbl">{c.label}</div>
              <div class="det">{c.detail}</div>
              {c.help && <div class="help">{c.help}</div>}
            </div>
          </li>
        ))}
      </ul>
      <div class="actions">
        <button class="btn btn-primary" disabled={retrying} onClick={() => void retry()}>
          <Icon name="rotate-cw" small />
          <span>Tentar de novo</span>
        </button>
        {/* Botões com borda: quando quebram linha, ficam alinhados pela caixa (o ghost parecia recuado). */}
        <CopyButton text={diagText} ghost={false} />
        <button class="btn" onClick={() => bridge.openSoundSettings()}>
          Abrir configurações de som do Windows
        </button>
        {okLine && (
          <span class="okline" role="status">
            <Icon name="check" />
            Captura funcionando
          </span>
        )}
      </div>
    </section>
  )
}

// ── Preset pesado (P2): aviso na faixa ───────────────────────
export function SlowChip({ core }: { core: Core }) {
  const [slow, setSlow] = useState<{ name: string; fps: number } | null>(null)
  useLayoutEffect(() => core.events.on('slowPreset', setSlow), [core])
  if (!slow || slow.name !== core.state.current) return null
  const { title } = splitPresetName(slow.name)
  return (
    <span class="chip" role="status" title={`${title} roda abaixo do mínimo de fps`}>
      <Icon name="gauge" small />
      <span class="num">{Math.round(slow.fps)} fps</span> · preset pesado
      <button
        class="btn btn-ghost"
        onClick={() => {
          setSlow(null)
          core.run('library.hide', { name: slow.name, reason: 'performance' }, 'ui')
        }}
      >
        Pular e ocultar
      </button>
    </span>
  )
}

// ── WebGL 2 indisponível: o visual não existe, só este painel ──
function WebglError() {
  const [gpu, setGpu] = useState({ renderer: '', driver: '' })
  useEffect(() => {
    let renderer = ''
    try {
      const gl = document.createElement('canvas').getContext('webgl')
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      renderer = (ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '') || ''
    } catch {
      renderer = ''
    }
    window.so.system
      .gpuInfo()
      .then((g) => setGpu({ renderer: renderer || (g.ids ? `GPU ${g.ids}` : 'desconhecida'), driver: g.driver || 'desconhecido' }))
      .catch(() => setGpu({ renderer: renderer || 'desconhecida', driver: 'desconhecido' }))
  }, [])
  const diagText = async (): Promise<string> => {
    const version = await window.so.app.version().catch(() => '?')
    return [
      `Sonic Obsidian ${version} — diagnóstico de vídeo`,
      `Data: ${new Date().toISOString()}`,
      `GPU: ${gpu.renderer}`,
      `Driver: ${gpu.driver}`,
      'WebGL 2: indisponível',
      'Motor visual: Butterchurn (requer WebGL 2)'
    ].join('\n')
  }
  return (
    <section class="float panel gl in" role="alert" aria-labelledby="gTitle">
      <div class="big">
        <Icon name="monitor-x" />
      </div>
      <h2 id="gTitle">Este computador não suporta WebGL 2</h2>
      <p style="margin-top:8px">
        O motor visual (Butterchurn) precisa de WebGL 2 para desenhar os presets. Normalmente isso se resolve atualizando o driver de vídeo.
      </p>
      <details>
        <summary>
          <Icon name="chevron-right" />
          Detalhes técnicos
        </summary>
        <dl class="tech">
          <dt>GPU</dt>
          <dd class="num">{gpu.renderer || '…'}</dd>
          <dt>Driver</dt>
          <dd class="num">{gpu.driver || '…'}</dd>
          <dt>WebGL 2</dt>
          <dd class="num bad">indisponível</dd>
        </dl>
      </details>
      <div class="actions">
        <CopyButton text={diagText} />
      </div>
    </section>
  )
}

export function mountWebglError(el: HTMLElement): void {
  document.body.classList.add('nogl')
  render(<WebglError />, el)
}
