import { captureSystemAudio } from './capture'
import { Core, type Origin } from './core/commands'
import {
  BLEND_TYPE_LABEL,
  EXPRESSION_ADAPTATIONS,
  EXPRESSION_ADAPTATION_LABEL,
  EXPRESSION_CURVES,
  EXPRESSION_CURVE_LABEL,
  cycleBlendType,
  sanitizeLibrary,
  sanitizeSettings,
  stepBlendSeconds
} from './core/state'
import { hookShaderCleanup } from './engine-fixes'
import { hookExpression } from './expression'
import { Hud, type HudState } from './hud'
import { PresetLibrary } from './presets'
import { SILENT_DIM, SilenceState } from './silence'
import { AutoRotation } from './rotation'
import { mountOverlay, toggleOverlay } from './ui/Overlay'
import { setToastPolicy, showToast } from './ui/toast'
import { PresetVisualizer } from './visualizer'
import { isFullScreen, setupWindowChrome } from './window'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
setupWindowChrome()
const hudEl = document.getElementById('hud') as HTMLElement
const hud = new Hud(hudEl)
const state: HudState = { fps: 0, preset: '—', presetCount: 0, rotation: '30 s', fpsMode: 'monitor', gainDb: 0, audio: 'aguardando', level: 0 }

/** Quanto esperar pelos pacotes extras quando o último preset está neles (critério < 3 s). */
const STARTUP_EXTRAS_WAIT_MS = 1000
/** Cadência do medidor de nível da faixa (~30×/s). */
const LEVEL_TICK_MS = 33

async function start(): Promise<void> {
  const [rawSettings, rawLibrary] = await Promise.all([
    window.so.settings.load().catch(() => null),
    window.so.library.load().catch(() => null)
  ])

  const ctx = new AudioContext()
  if (ctx.state === 'suspended') await ctx.resume()

  // fonte (quando a captura existir) → ganho → Butterchurn. Nada vai para ctx.destination (evita eco).
  const gain = ctx.createGain()
  // Medidor de silêncio antes do ganho.
  const preGain = ctx.createAnalyser()
  preGain.fftSize = 1024
  const preSamples = new Float32Array(preGain.fftSize)
  const silence = new SilenceState()
  const dim = document.getElementById('dim') as HTMLElement

  const meter = ctx.createAnalyser()
  meter.fftSize = 1024
  gain.connect(meter)
  const samples = new Float32Array(meter.fftSize)

  const viz = new PresetVisualizer(ctx, canvas)
  viz.visualizer.connectAudio(gain)
  hookShaderCleanup(viz.visualizer)

  // Driver de vídeo reiniciado (TDR) ou GPU sem memória: o contexto WebGL cai.
  // Registra e recarrega a página (os ajustes já estão salvos) em vez de travar.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    window.so.log('contexto WebGL perdido; recarregando em 1,5 s')
    setTimeout(() => location.reload())
  })

  // ── Núcleo de comandos (spec 008) ─────────────────────────
  const library = new PresetLibrary()
  const core = new Core(library, sanitizeSettings(rawSettings), sanitizeLibrary(rawLibrary), {
    saveSettings: (s) => window.so.settings.save(s),
    saveLibrary: (l) => window.so.library.save(l),
    toggleFullScreen: () => window.so.window.toggleFullScreen()
  })
  const settings = core.state.settings
  const exprProbe = hookExpression(viz.visualizer, () => settings.expression)
  // Avisos e Modo limpo decidem quais toasts aparecem (spec 014).
  setToastPolicy(() => settings.overlayText)
  const rotation = new AutoRotation(performance.now(), () => ({
    enabled: settings.rotation.enabled,
    intervalSeconds: core.rotationIntervalSeconds
  }))

  // ── Captura do áudio do sistema, com "Tentar de novo" (spec 009) ──
  let source: MediaStreamAudioSourceNode | null = null
  let capturing = false
  const connectCapture = async (): Promise<void> => {
    if (capturing) return
    capturing = true
    core.setCapture('pending')
    source?.disconnect()
    source = null
    try {
      const { stream, audioTrack } = await captureSystemAudio()
      const updateTrack = (): void => {
        state.audio = `${audioTrack.readyState}${audioTrack.muted ? ' (muted)' : ''}`
      }
      updateTrack()
      audioTrack.addEventListener('mute', updateTrack)
      audioTrack.addEventListener('unmute', updateTrack)
      audioTrack.addEventListener('ended', () => {
        updateTrack()
        console.error('[capture] a track de áudio terminou')
        source?.disconnect()
        source = null
        core.setCapture('denied')
      })
      source = ctx.createMediaStreamSource(stream)
      source.connect(gain)
      source.connect(preGain)
      core.setCapture('ok')
    } catch (err) {
      console.error('[capture] captura recusada ou indisponível', err)
      state.audio = 'recusada'
      core.setCapture('denied')
    } finally {
      capturing = false
    }
  }

  // Efeitos dos eventos: o Core não toca o Butterchurn nem o áudio.
  let appliedGainDb = Number.NaN
  let rotationKey = ''
  const applyState = (): void => {
    if (settings.gainDb !== appliedGainDb) {
      appliedGainDb = settings.gainDb
      gain.gain.setTargetAtTime(10 ** (settings.gainDb / 20), ctx.currentTime, 0.02)
    }
    // Ligar a rotação ou mudar o intervalo recomeça a contagem (teclado ou faixa).
    const key = `${settings.rotation.enabled}:${core.rotationIntervalSeconds}`
    if (key !== rotationKey) {
      rotationKey = key
      rotation.restart(performance.now())
    }
    state.gainDb = settings.gainDb
    state.rotation = settings.rotation.enabled ? `${core.rotationIntervalSeconds} s` : 'pausada'
    state.fpsMode = settings.fpsLimit === 'monitor' ? 'monitor' : `limite ${settings.fpsLimit}`
  }
  core.events.on('stateChanged', applyState)
  core.events.on('presetChanged', ({ name, blendType, blendSeconds }) => {
    viz.load(library.get(name), blendType, blendSeconds)
    rotation.restart(performance.now())
    state.preset = name
    console.log(`[viz] preset: ${name} (${blendType}, ${blendSeconds} s)`)
  })
  applyState()
  const idle = mountOverlay(document.getElementById('ui') as HTMLElement, {
    core,
    presets: () => library.all(),
    rotationRemaining: () => rotation.remaining(performance.now()),
    retryCapture: () => void connectCapture(),
    openSoundSettings: () => void window.so.system.openSoundSettings(),
    isFullScreen,
    blendTypesAvailable: viz.blendTypesAvailable,
    expressionAvailable: !!exprProbe
  })

  // Preset ao abrir: o último usado, se ainda existir; senão aleatório.
  const t0 = performance.now()
  const extras = library.loadExtraPacks()
  const last = settings.startupPreset === 'last' ? settings.lastPreset : null
  if (last && !library.has(last)) {
    // Pode estar nos pacotes extras: espera um pouco por eles, sem passar do limite.
    await Promise.race([extras.catch(() => 0), new Promise((r) => setTimeout(r, STARTUP_EXTRAS_WAIT_MS))])
  }
  const first = last && library.has(last) && !core.isHidden(last) ? core.run('preset.play', { name: last }, 'startup') : null
  if (!first?.ok) core.run('preset.random', {}, 'startup')
  console.log(`[startup] primeiro preset em ${(performance.now() - t0).toFixed(0)} ms (${first?.ok ? 'último usado' : 'aleatório'})`)
  state.presetCount = library.count
  void connectCapture()

  const run = (name: string, args: Record<string, unknown> = {}, origin: Origin = 'keyboard') => {
    const result = core.run(name, args, origin)
    if (!result.ok) console.warn(`[core] ${name}: ${result.error}`)
    return result
  }
  const secondsText = (s: number): string => `${String(s).replace('.', ',')} s`
  const exprLevel = (): string => {
    const l = settings.expression.level
    return l === 0 ? 'neutra' : `${l > 0 ? '+' : '−'}${Math.abs(l)}`
  }
  const exprText = (): string =>
    exprProbe ? `Expressividade ${exprLevel()}` : 'Expressividade indisponível (motor sem audioLevels)'
  /** Toast da transição manual: "Transição: Plasma, 1 s" (spec 013). */
  const blendText = (): string => {
    const { type, seconds } = settings.blend.manual
    const label = BLEND_TYPE_LABEL[type]
    const unavailable = !viz.blendTypesAvailable && type !== 'cut' && type !== 'random' ? ' (indisponível: sorteio do motor)' : ''
    return type === 'cut' ? `Transição: ${label}` : `Transição: ${label}, ${secondsText(seconds)}${unavailable}`
  }

  window.addEventListener('resize', () => viz.resize())
  // Minimizada ou coberta, o Chromium para o requestAnimationFrame (e o render junto).
  // O log mostra se isso acontece na máquina do usuário.
  document.addEventListener('visibilitychange', () => window.so.log(`janela ${document.visibilityState === 'hidden' ? 'oculta: render pausado' : 'visível'}`))
  window.addEventListener('keydown', (e) => {
    if (e.repeat && e.code !== 'ArrowRight' && e.code !== 'ArrowLeft') return
    // HUD de depuração (fps, áudio): escondido por padrão desde a 009.
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
      hudEl.hidden = !hudEl.hidden
      e.preventDefault()
      return
    }
    // Ctrl+Shift+L abre a pasta do log (diagnóstico de quedas).
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyL') {
      void window.so.showLog()
      e.preventDefault()
      return
    }
    // Ctrl+K abre e fecha a busca rápida de qualquer lugar (spec 010).
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyK') {
      e.preventDefault()
      toggleOverlay(core, 'search')
      return
    }
    if (e.ctrlKey || e.altKey || e.metaKey) return
    // Atalhos de letra/espaço não valem enquanto se digita (busca, Configurações).
    const t = e.target as HTMLElement | null
    // Nos Ajustes rápidos, Esc fecha o painel mesmo com o foco num slider ou seletor.
    if (e.key === 'Escape' && t?.closest('.sheet')) {
      e.preventDefault()
      run('ui.close')
      return
    }
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
    // Esc fecha o que estiver aberto; sem nada aberto, sai da tela cheia.
    if (e.key === 'Escape') {
      e.preventDefault()
      if (core.state.overlay) run('ui.close')
      else if (isFullScreen()) run('window.fullscreen')
      return
    }
    if (e.code === 'KeyL') {
      e.preventDefault()
      toggleOverlay(core, 'library')
      return
    }
    // Dentro da Biblioteca, da busca ou de um menu, as setas e o Espaço são da lista.
    if (t?.closest('.lib, .palette, .menu, .sheet')) return
    if (e.key === '/') {
      e.preventDefault()
      run('ui.open', { overlay: 'search' })
      return
    }
    // Espaço com foco num botão aciona o botão (acessibilidade), não o aleatório.
    if (e.code === 'Space' && t?.closest('button, a')) return
    let handled = true
    // Shift na troca = corte seco na hora, sem mudar o ajuste salvo (spec 013).
    const cut = e.shiftKey
    // Atalhos v3 (docs/design/v3-modelo-de-navegacao.md), agora como comandos do Core.
    if (e.code === 'ArrowRight') {
      run('preset.next', { cut })
    } else if (e.code === 'ArrowLeft') {
      run('preset.previous', { cut })
    } else if (e.code === 'KeyX') {
      // X cicla o Caráter; Shift+X a Memória (spec 015).
      if (e.shiftKey) {
        const i = EXPRESSION_ADAPTATIONS.indexOf(settings.expression.adaptation)
        run('expression.set', { adaptation: EXPRESSION_ADAPTATIONS[(i + 1) % EXPRESSION_ADAPTATIONS.length] })
        showToast(`Memória ${EXPRESSION_ADAPTATION_LABEL[settings.expression.adaptation]}`)
      } else {
        const i = EXPRESSION_CURVES.indexOf(settings.expression.curve)
        run('expression.set', { curve: EXPRESSION_CURVES[(i + 1) % EXPRESSION_CURVES.length] })
        showToast(`Caráter: ${EXPRESSION_CURVE_LABEL[settings.expression.curve]}`)
      }
    } else if (e.code === 'Space') {
      run('preset.random', { cut })
    } else if (e.code === 'KeyB') {
      // B / Shift+B: ciclo do tipo da troca manual.
      run('blend.set', { target: 'manual', type: cycleBlendType(settings.blend.manual.type, e.shiftKey ? -1 : 1) })
      showToast(blendText())
    } else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      // ↑ / ↓: tempo da troca manual (0,25 · 0,5 · 1 · 2 · 4 · 8 s).
      const seconds = stepBlendSeconds(settings.blend.manual.seconds, e.code === 'ArrowUp' ? 1 : -1)
      run('blend.set', { target: 'manual', seconds })
      showToast(settings.blend.manual.type === 'cut' ? `Tempo da transição: ${secondsText(seconds)} (Corte seco ativo)` : blendText())
    } else if (e.code === 'KeyF') {
      // F = tela cheia (como F11), por decisão do usuário; ver DIVERGENCIAS.
      run('window.fullscreen')
    } else if (e.code === 'KeyT') {
      // Modo limpo (spec 014): a confirmação sempre aparece, uma vez.
      run('overlayText.set', { clean: !settings.overlayText.clean })
      showToast(settings.overlayText.clean ? 'Modo limpo ligado' : 'Modo limpo desligado', { force: true })
    } else if (e.code === 'KeyH') {
      idle.hideNow()
    } else if (e.code === 'KeyR') {
      run('rotation.set', { enabled: !settings.rotation.enabled })
      showToast(settings.rotation.enabled ? `Rotação a cada ${core.rotationIntervalSeconds} s.` : 'Rotação desligada.')
    } else if (e.key === ',') {
      // Ajustes rápidos (spec 011); `[` / `]` saíram: o intervalo da rotação mudou para lá.
      toggleOverlay(core, 'quick')
    } else if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
      // + / − = expressividade (spec 015). O ganho se adapta em segundos (ver expression.ts) e só muda nos Ajustes rápidos.
      run('expression.set', { level: settings.expression.level + (e.key === '+' || e.key === '=' ? 1 : -1) })
      showToast(exprText())
    } else if (e.key === '0') {
      run('expression.set', { level: 0 })
      showToast(exprText())
    } else {
      handled = false
    }
    if (handled) {
      e.preventDefault()
      if (!hudEl.hidden) hud.show(state)
    }
  })

  // Limite de fps: pula quadros do rAF até completar o intervalo-alvo.
  // A tolerância de 1 ms evita perder quadros por jitter em telas múltiplas de 60 Hz.
  let lastFrame = 0
  let lastResting = false
  let lastNotice = false
  let lastRender = performance.now()
  let lastSilenceCheck = 0
  let lastLevelTick = 0
  let lastLoop = performance.now()
  let frames = 0
  let windowStart = performance.now()
  const loop = (now: number): void => {
    requestAnimationFrame(loop)
    const frameInterval = settings.fpsLimit === 'monitor' ? 0 : 1000 / settings.fpsLimit
    if (frameInterval > 0) {
      if (now - lastFrame < frameInterval - 1) return
      // Mantém a cadência sem acumular atraso depois de uma pausa longa.
      lastFrame = now - lastFrame > frameInterval * 2 ? now : lastFrame + frameInterval
    }
    if (now - lastSilenceCheck >= 100) {
      lastSilenceCheck = now
      preGain.getFloatTimeDomainData(preSamples)
      let sq = 0
      for (const v of preSamples) sq += v * v
      silence.update(Math.sqrt(sq / preSamples.length), now)
      document.body.classList.toggle('silent', silence.resting)
      if (silence.resting !== lastResting || silence.showNotice !== lastNotice) {
        lastResting = silence.resting
        lastNotice = silence.showNotice
        core.events.emit('silenceChanged', { resting: lastResting, notice: lastNotice })
      }
    }
    if (now - lastLevelTick >= LEVEL_TICK_MS) {
      lastLevelTick = now
      // Nível depois do ganho, direto aos assinantes (fora do store, sem re-render).
      meter.getFloatTimeDomainData(samples)
      let sum = 0
      for (const v of samples) sum += v * v
      state.level = Math.sqrt(sum / samples.length)
      core.events.emit('levelTick', { level: state.level })
    }
    // Sem som (aviso visível) ou sem captura: a rotação espera, como no protótipo.
    if (silence.showNotice || core.state.capture !== 'ok') rotation.hold(now - lastLoop)
    lastLoop = now
    const dt = Math.min(0.1, Math.max(0.001, (now - lastRender) / 1000))
    lastRender = now
    const speed = silence.step(dt)
    dim.style.opacity = String(((1 - speed) / (1 - 0.15)) * SILENT_DIM)
    if (rotation.due(now)) run('rotation.advance', {}, 'rotation')
    viz.render(dt * speed)
    frames++
    if (now - windowStart >= 1000) {
      state.fps = (frames * 1000) / (now - windowStart)
      frames = 0
      windowStart = now
      if (exprProbe) {
        const ex = settings.expression
        state.expression = `expressividade ${exprLevel()} · caráter ${ex.curve} · memória ${ex.adaptation} · bass ${exprProbe.bassIn.toFixed(2)} → ${exprProbe.bassOut.toFixed(2)}`
      }
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      if (mem) state.heapMb = Math.round(mem.usedJSHeapSize / 1048576)
      if (!hudEl.hidden) hud.show(state)
    }
  }
  requestAnimationFrame(loop)

  // Pacotes extras (já pedidos na abertura) entram quando chegarem.
  extras
    .then((count) => {
      state.presetCount = count
      core.events.emit('stateChanged', { origin: 'startup' }) // Biblioteca e busca veem os presets novos
      console.log(`[viz] ${count} presets após os pacotes extras (${(performance.now() - t0).toFixed(0)} ms)`)
    })
    .catch((err: unknown) => console.error('[viz] falha ao carregar pacotes extras', err))
}

window.addEventListener('error', (e) => window.so.log(`erro: ${e.message} @ ${e.filename}:${e.lineno}`))
window.addEventListener('unhandledrejection', (e) => window.so.log(`promessa rejeitada: ${String(e.reason)}`))

start().catch((err: unknown) => {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  console.error('[start]', err)
  window.so.log(`falha na abertura: ${message}`)
  hudEl.hidden = false
  hud.show({ ...state, error: message })
})
