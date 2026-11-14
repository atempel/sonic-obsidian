import './setup.css'
import { render } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { CaptureCheck, CaptureState, Core } from '../core/commands'
import { Icon } from './icons'
import { openShortcuts } from './ShortcutsPanel'
import { Meter, type PalcoBridge } from './Overlay'
import { splitPresetName } from './preset-name'
import { keyName } from './shortcuts'
import { msgText, t, type MessageKey } from '../i18n'

/**
 * Setup e diagnóstico (spec 012; protótipo "Setup" e "Palco integrado", design 1794178325-0fd0).
 * Superfícies não-modais: as teclas do visual continuam valendo enquanto aparecem.
 * Textos pelo catálogo (spec 030); o diagnóstico copiado sai sempre em inglês, como o log, porque vai para issues.
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
  const [label, setLabel] = useState<MessageKey>('setup.copy')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      class={ghost ? 'btn btn-ghost' : 'btn'}
      onClick={async () => {
        try {
          await window.so.system.copyText(await text())
          setLabel('setup.copied')
        } catch {
          setLabel('setup.copyFailed')
        }
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setLabel('setup.copy'), 2000)
      }}
    >
      <Icon name="copy" small />
      <span role="status">{t(label)}</span>
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
  // "Aperte {key} para ver…": a tecla vira <kbd> no lugar certo da frase em cada idioma.
  const [hintBefore = '', hintAfter = ''] = t('setup.welcome.hint').split('{key}')
  return (
    <section class={`float card${cls}`} aria-labelledby="wTitle">
      <div class="head">
        <h2 id="wTitle">{t('setup.welcome.title')}</h2>
      </div>
      <p class="body-text">{t('setup.welcome.body')}</p>
      <ul class="shortcuts">
        <li>
          <kbd>{keyName('Space')}</kbd>
          <span>{t('shortcuts.random')}</span>
        </li>
        <li>
          <kbd>/</kbd>
          <span>{t('shortcuts.search')}</span>
        </li>
        <li>
          <kbd>L</kbd>
          <span>{t('shortcuts.library')}</span>
        </li>
      </ul>
      <button type="button" class="k-hint" onClick={() => openShortcuts(core)}>
        {hintBefore}
        <kbd>?</kbd>
        {hintAfter}
      </button>
      <div class="actions">
        <button class="btn btn-primary" onClick={close}>
          {t('setup.welcome.ok')}
        </button>
        <button
          class="btn btn-ghost"
          onClick={() => {
            close()
            core.run('ui.open', { overlay: 'settings' }, 'ui')
          }}
        >
          {t('setup.welcome.settings')}
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
        <div class="t">{t('setup.silence.title')}</div>
        <div class="d">{t('setup.silence.body')}</div>
      </div>
      {testing ? (
        <div class="testing">
          <Meter core={core} />
          <span class="num">{t(signal ? 'setup.silence.signal' : 'setup.silence.noSignal')}</span>
        </div>
      ) : (
        <button
          class="btn btn-ghost"
          onClick={() => {
            setSignal(false)
            setTesting(true)
          }}
        >
          {t('setup.silence.test')}
        </button>
      )}
    </div>
  )
}

// ── Captura falhou ───────────────────────────────────────────
const STATE_LABEL: Record<CaptureCheck['state'], MessageKey> = { ok: 'setup.check.state.ok', fail: 'setup.check.state.fail', busy: 'setup.check.state.busy', pending: 'setup.check.state.pending' }
/** Estado no diagnóstico copiado (sempre em inglês, como o log). */
const STATE_TEXT: Record<CaptureCheck['state'], string> = { ok: 'ok', fail: 'failed', busy: 'checking', pending: 'not run' }

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
      `Sonic Obsidian ${version} — capture diagnostics`,
      `Date: ${new Date().toISOString()}`,
      'Source: Windows default output',
      ...checks.map((c) => `${msgText(c.label, 'en')}: ${STATE_TEXT[c.state]} (${msgText(c.detail, 'en')})${c.help ? ` — ${msgText(c.help, 'en')}` : ''}`)
    ].join('\n')
  }
  return (
    <section class={`float panel${cls}`} role="alert" aria-labelledby="dTitle">
      <div class="head">
        <Icon name="triangle-alert" />
        <h2 id="dTitle">{t('setup.capture.title')}</h2>
      </div>
      <ul class="checks">
        {checks.map((c) => (
          <li key={c.label}>
            <span class="st" data-s={c.state}>
              <Icon name={c.state === 'ok' ? 'check' : c.state === 'fail' ? 'x' : 'loader'} />
              <span class="vh">{t(STATE_LABEL[c.state])}</span>
            </span>
            <div>
              <div class="lbl">{t(c.label)}</div>
              <div class="det">{msgText(c.detail)}</div>
              {c.help && <div class="help">{t(c.help)}</div>}
            </div>
          </li>
        ))}
      </ul>
      <div class="actions">
        <button class="btn btn-primary" disabled={retrying} onClick={() => void retry()}>
          <Icon name="rotate-cw" small />
          <span>{t('setup.capture.retry')}</span>
        </button>
        {/* Botões com borda: quando quebram linha, ficam alinhados pela caixa (o ghost parecia recuado). */}
        <CopyButton text={diagText} ghost={false} />
        <button class="btn" onClick={() => bridge.openSoundSettings()}>
          {t('setup.capture.soundSettings')}
        </button>
        {okLine && (
          <span class="okline" role="status">
            <Icon name="check" />
            {t('setup.capture.working')}
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
    <span class="chip" role="status" title={t('strip.slowTitle', { name: title })}>
      <Icon name="gauge" small />
      <span class="num">{Math.round(slow.fps)} fps</span> · {t('strip.slow')}
      <button
        class="btn btn-ghost"
        onClick={() => {
          setSlow(null)
          core.run('library.hide', { name: slow.name, reason: 'performance' }, 'ui')
        }}
      >
        {t('strip.slowSkip')}
      </button>
    </span>
  )
}

// ── WebGL 2 indisponível: o visual não existe, só este painel ──
function WebglError() {
  // Vazio = ainda lendo; `null` = desconhecido (o texto sai no idioma do app, e em inglês no diagnóstico).
  const [gpu, setGpu] = useState<{ renderer: string | null; driver: string | null; read: boolean }>({ renderer: null, driver: null, read: false })
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
      .then((g) => setGpu({ renderer: renderer || (g.ids ? `GPU ${g.ids}` : null), driver: g.driver || null, read: true }))
      .catch(() => setGpu({ renderer: renderer || null, driver: null, read: true }))
  }, [])
  const diagText = async (): Promise<string> => {
    const version = await window.so.app.version().catch(() => '?')
    return [
      `Sonic Obsidian ${version} — video diagnostics`,
      `Date: ${new Date().toISOString()}`,
      `GPU: ${gpu.renderer ?? 'unknown'}`,
      `Driver: ${gpu.driver ?? 'unknown'}`,
      'WebGL 2: unavailable',
      'Visual engine: Butterchurn (requires WebGL 2)'
    ].join('\n')
  }
  const shown = (v: string | null, unknown: MessageKey): string => (!gpu.read ? '…' : (v ?? t(unknown)))
  return (
    <section class="float panel gl in" role="alert" aria-labelledby="gTitle">
      <div class="big">
        <Icon name="monitor-x" />
      </div>
      <h2 id="gTitle">{t('setup.webgl.title')}</h2>
      <p style="margin-top:8px">{t('setup.webgl.body')}</p>
      <details>
        <summary>
          <Icon name="chevron-right" />
          {t('setup.webgl.details')}
        </summary>
        <dl class="tech">
          <dt>GPU</dt>
          <dd class="num">{shown(gpu.renderer, 'setup.webgl.unknownGpu')}</dd>
          <dt>Driver</dt>
          <dd class="num">{shown(gpu.driver, 'setup.webgl.unknownDriver')}</dd>
          <dt>WebGL 2</dt>
          <dd class="num bad">{t('setup.webgl.unavailable')}</dd>
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
