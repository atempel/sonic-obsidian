import { captureSystemAudio } from './capture'
import { Core, type CaptureCheck, type Origin, type WaitKey } from './core/commands'
import { BeatTracker } from './beat'
import {
  BLEND_TYPE_LABEL,
  EXPRESSION_ADAPTATIONS,
  EXPRESSION_ADAPTATION_LABEL,
  EXPRESSION_CURVES,
  EXPRESSION_CURVE_LABEL,
  EXPRESSION_DEFAULT,
  cycleBlendType,
  sanitizeLibrary,
  sanitizeSettings,
  stepBlendSeconds
} from './core/state'
import { fixPointSize, hookShaderCleanup } from './engine-fixes'
import { hookExpression } from './expression'
import { Hud, type HudState } from './hud'
import { PresetLibrary } from './presets'
import { importMilks, shaderError, type MilkInput } from './importer'
import { SILENT_DIM, SilenceState } from './silence'
import { AutoRotation } from './rotation'
import { mountOverlay, toggleOverlay } from './ui/Overlay'
import { dismissFloat, mountWebglError } from './ui/Diagnostics'
import { closeShortcuts, isShortcutsOpen, toggleShortcuts } from './ui/ShortcutsPanel'
import { setActionRunner, type ActionId } from './ui/shortcuts'
import { closeStudio, openStudio } from './ui/Studio'
import { setMineLookup } from './ui/preset-name'
import { StudioCompiler } from './studio/compile'
import type { Preset } from 'butterchurn'
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
  // Tempos da abertura no log (passagem de performance): ver src/main/startup.ts.
  window.so.mark('renderer')
  const [rawSettings, rawLibrary] = await Promise.all([
    window.so.settings.load().catch(() => null),
    window.so.library.load().catch(() => null)
  ])
  window.so.mark('ajustes lidos')

  const testFlags = await window.so.system.testFlags().catch(() => ({ captureFail: false, noWebgl2: false }))
  // WebGL 2 (spec 012): sem ele o Butterchurn não desenha; mostra o diagnóstico em vez de tela preta.
  if (testFlags.noWebgl2 || !document.createElement('canvas').getContext('webgl2')) {
    window.so.log(`WebGL 2 indisponível${testFlags.noWebgl2 ? ' (simulado por test-flags.json)' : ''}`)
    mountWebglError(document.getElementById('ui') as HTMLElement)
    return
  }

  const ctx = new AudioContext()
  if (ctx.state === 'suspended') await ctx.resume()

  // fonte (quando a captura existir) → ganho → Butterchurn. Nada vai para ctx.destination (evita eco).
  const gain = ctx.createGain()
  // Medidor de silêncio antes do ganho.
  const preGain = ctx.createAnalyser()
  preGain.fftSize = 1024
  const preSamples = new Float32Array(preGain.fftSize)
  // Detecção de batida (spec 024): ramo do mesmo sinal antes do ganho, com buffer longo,
  // lido pelo relógio do áudio (não depende do fps). O analyser repassa o som sem mudá-lo.
  const beatTap = ctx.createAnalyser()
  beatTap.fftSize = 32768
  preGain.connect(beatTap)
  const silence = new SilenceState()
  const dim = document.getElementById('dim') as HTMLElement

  const meter = ctx.createAnalyser()
  meter.fftSize = 1024
  gain.connect(meter)
  const samples = new Float32Array(meter.fftSize)

  const initialSettings = sanitizeSettings(rawSettings)
  // Antes de criar o motor: os shaders são compilados na criação (onda em pontos, 2026-11-10).
  fixPointSize()
  const viz = new PresetVisualizer(ctx, canvas, initialSettings.render)
  viz.visualizer.connectAudio(gain)
  hookShaderCleanup(viz.visualizer)
  window.so.mark('motor')

  // Driver de vídeo reiniciado (TDR) ou GPU sem memória: o contexto WebGL cai.
  // Registra e recarrega a página (os ajustes já estão salvos) em vez de travar.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    window.so.log('contexto WebGL perdido; recarregando em 1,5 s')
    setTimeout(() => location.reload())
  })

  // ── Núcleo de comandos (spec 008) ─────────────────────────
  const library = new PresetLibrary()
  await library.loadBasePack()
  // Importados pelo usuário (spec 022), antes do primeiro preset: o último usado pode ser um deles.
  for (const imp of await window.so.presets.listImported().catch(() => [])) library.addImported(imp.name, imp.preset)
  // Meus presets (Estúdio, spec 026): o título é o nome; o crédito "baseado em" vem do meta.
  for (const m of await window.so.presets.listMine().catch(() => [])) library.setMine(library.mineInfo(m.meta.title) ? m.meta.title : library.freeName(m.meta.title), m.id, m.meta, m.preset)
  setMineLookup((name) => library.mineInfo(name)?.meta ?? null)
  const core = new Core(library, initialSettings, sanitizeLibrary(rawLibrary), {
    saveSettings: (s) => window.so.settings.save(s),
    saveLibrary: (l) => window.so.library.save(l),
    toggleFullScreen: () => window.so.window.toggleFullScreen()
  })
  const settings = core.state.settings
  // Spec 028: a Memória só semeia com som; no repouso do silêncio, os presets recebem zero.
  const exprProbe = hookExpression(
    viz.visualizer,
    () => settings.expression,
    () => ({ quiet: silence.quiet, resting: silence.resting, breath: core.state.breath })
  )
  {
    const ex = settings.expression
    window.so.log(`expressividade carregada: nível ${ex.level} · caráter ${ex.curve} · memória ${ex.adaptation}${exprProbe ? '' : ' (indisponível no motor)'}`)
  }
  // A cada 5 min (como a memória no main): bass médio e desvio com som, para "reagindo pouco" virar número.
  if (exprProbe)
    window.setInterval(() => {
      const p = exprProbe
      const ex = settings.expression
      if (p.n < 30) window.so.log(`reação: sem som nos últimos 5 min (memória ${ex.adaptation})`)
      else {
        const mean = p.sum / p.n
        const sd = Math.sqrt(Math.max(0, p.sumSq / p.n - mean * mean))
        window.so.log(`reação: bass médio ${mean.toFixed(2)} · desvio ${sd.toFixed(2)} (${p.n} quadros com som; nível ${ex.level} · caráter ${ex.curve} · memória ${ex.adaptation})`)
      }
      p.n = 0
      p.sum = 0
      p.sumSq = 0
    }, 5 * 60 * 1000)
  // Avisos e Modo limpo decidem quais toasts aparecem (spec 014).
  setToastPolicy(() => settings.overlayText)
  // ── Batida (spec 024): só mudanças de estado vão para o log, nunca cada batida ──
  const beat = new BeatTracker(beatTap, ctx, (locked, bpm) => {
    window.so.log(locked ? `beat: estável a ${bpm.toFixed(0)} BPM` : 'beat: perdido, voltando a segundos')
    if (!locked) {
      rotation.beatLost()
      flushPending()
    }
    core.events.emit('beatState', { locked, bpm })
  })
  const rotation = new AutoRotation(
    performance.now(),
    () => ({
      enabled: settings.rotation.enabled,
      intervalSeconds: core.rotationIntervalSeconds,
      held: core.state.held,
      onBeat: settings.rotation.onBeat,
      bars: settings.rotation.bars
    }),
    () => beat.locked
  )
  // Troca manual no beat (M23): vale o último pedido; sai na próxima batida ou na hora sem batida.
  let pending: { key: WaitKey; go: () => void; since: number } | null = null
  const setPending = (p: typeof pending): void => {
    pending = p
    core.events.emit('beatWait', { key: p?.key ?? null })
  }
  const flushPending = (): void => {
    const p = pending
    if (!p) return
    setPending(null)
    p.go()
  }
  const WAIT_CMD: Record<WaitKey, string> = { next: 'preset.next', previous: 'preset.previous', random: 'preset.random' }
  const request = (key: WaitKey, cut = false, origin: Origin = 'keyboard'): void => {
    const go = (): void => void run(WAIT_CMD[key], { cut }, origin)
    if (!settings.rotation.onBeat || !beat.locked) {
      if (pending) setPending(null)
      go()
      return
    }
    setPending({ key, go, since: performance.now() })
  }

  // ── Captura do áudio do sistema, com checklist (spec 012) e "Tentar de novo" ──
  let source: MediaStreamAudioSourceNode | null = null
  let captureInfo = { device: '', sampleRate: ctx.sampleRate }
  let capturing = false
  // Flag de teste: a primeira tentativa falha como se o Windows recusasse; "Tentar de novo" é real.
  let simulateFail = testFlags.captureFail
  const PERMISSION_HELP = 'Outro app pode estar usando a saída em modo exclusivo (ex.: players com WASAPI exclusivo).'
  let checks: CaptureCheck[] = []
  const setCheck = (i: number, c: Partial<CaptureCheck>): void => {
    checks = checks.map((x, j) => (j === i ? { ...x, ...c } : x))
    core.events.emit('captureChecks', { checks })
  }
  /** RMS antes do ganho acima do limiar em até `ms`. */
  const waitSignal = (ms: number): Promise<boolean> =>
    new Promise((resolve) => {
      const buf = new Float32Array(preGain.fftSize)
      const t0 = performance.now()
      const id = window.setInterval(() => {
        preGain.getFloatTimeDomainData(buf)
        let sq = 0
        for (const v of buf) sq += v * v
        const rms = Math.sqrt(sq / buf.length)
        if (rms > 0.001 || performance.now() - t0 > ms) {
          window.clearInterval(id)
          resolve(rms > 0.001)
        }
      }, 100)
    })
  const connectCapture = async (): Promise<boolean> => {
    if (capturing) return false
    capturing = true
    core.setCapture('pending')
    source?.disconnect()
    source = null
    checks = [
      { label: 'Saída padrão encontrada', state: 'busy', detail: 'verificando…' },
      { label: 'Permissão de captura do sistema', state: 'busy', detail: 'verificando…' },
      { label: 'Formato de áudio', state: 'busy', detail: 'verificando…' },
      { label: 'Teste de sinal', state: 'busy', detail: 'verificando…' }
    ]
    core.events.emit('captureChecks', { checks })
    try {
      // 1. Saída padrão: o Chromium lista a saída "default" do Windows.
      const outputs = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[])
      const out = outputs.find((d) => d.kind === 'audiooutput' && d.deviceId === 'default') ?? outputs.find((d) => d.kind === 'audiooutput')
      const outName = out?.label.replace(/^(Padrão|Default)\s*-\s*/i, '') || 'Saída padrão do Windows'
      setCheck(0, out ? { state: 'ok', detail: outName } : { state: 'fail', detail: 'Nenhuma saída de áudio encontrada' })
      // 2. Permissão (getDisplayMedia com loopback).
      let cap: Awaited<ReturnType<typeof captureSystemAudio>>
      try {
        if (simulateFail) {
          simulateFail = false
          throw new DOMException('simulada por test-flags.json', 'NotAllowedError')
        }
        cap = await captureSystemAudio()
        window.so.mark('captura') // só a primeira vez conta (o main ignora repetidas)
      } catch (err) {
        window.so.mark('captura')
        console.error('[capture] captura recusada ou indisponível', err)
        window.so.log(`captura recusada: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`)
        setCheck(1, { state: 'fail', detail: 'Recusada pelo Windows', help: PERMISSION_HELP })
        setCheck(2, { state: 'pending', detail: 'Aguardando a permissão' })
        setCheck(3, { state: 'pending', detail: 'Aguardando a permissão' })
        state.audio = 'recusada'
        core.setCapture('denied')
        return false
      }
      const { stream, audioTrack } = cap
      setCheck(1, { state: 'ok', detail: 'Concedida', help: undefined })
      // A captura funcionou: a saída existe, mesmo que o sistema não a tenha listado.
      if (checks[0]!.state !== 'ok') setCheck(0, { state: 'ok', detail: audioTrack.label || 'Saída padrão do Windows' })
      // 3. Formato.
      const ts = audioTrack.getSettings()
      captureInfo = { device: audioTrack.label || outName, sampleRate: ts.sampleRate ?? ctx.sampleRate }
      const rate = `${(captureInfo.sampleRate / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kHz`
      setCheck(2, { state: 'ok', detail: ts.channelCount ? `${rate}, ${ts.channelCount} canais` : rate })
      const updateTrack = (): void => {
        state.audio = `${audioTrack.readyState}${audioTrack.muted ? ' (muted)' : ''}`
      }
      updateTrack()
      audioTrack.addEventListener('mute', updateTrack)
      audioTrack.addEventListener('unmute', updateTrack)
      audioTrack.addEventListener('ended', () => {
        updateTrack()
        console.error('[capture] a track de áudio terminou')
        window.so.log('captura: a track de áudio terminou')
        source?.disconnect()
        source = null
        setCheck(1, { state: 'fail', detail: 'A captura parou', help: PERMISSION_HELP })
        core.setCapture('denied')
      })
      source = ctx.createMediaStreamSource(stream)
      source.connect(gain)
      source.connect(preGain)
      core.setCapture('ok')
      // 4. Sinal: até 3 s; sem música, a captura funciona do mesmo jeito.
      const signal = await waitSignal(3000)
      setCheck(3, signal ? { state: 'ok', detail: 'Sinal detectado' } : { state: 'pending', detail: 'Sem som agora: toque algo para testar' })
      return true
    } finally {
      capturing = false
    }
  }

  // Efeitos dos eventos: o Core não toca o Butterchurn nem o áudio.
  let appliedGainDb = Number.NaN // ganho linear aplicado (0 no Respiro)
  let rotationKey = ''
  let renderKey = JSON.stringify(settings.render)
  const applyState = (): void => {
    const rk = JSON.stringify(settings.render)
    if (rk !== renderKey) {
      renderKey = rk
      viz.applyRender(settings.render)
    }
    // Respiro (Shift+Enter): o visual perde o áudio devagar (~1 s) e o recebe de volta rápido.
    const targetGain = core.state.breath ? 0 : 10 ** (settings.gainDb / 20)
    if (targetGain !== appliedGainDb) {
      const back = appliedGainDb === 0 && targetGain > 0
      appliedGainDb = targetGain
      gain.gain.setTargetAtTime(targetGain, ctx.currentTime, core.state.breath ? 0.3 : back ? 0.04 : 0.02)
    }
    beat.leadMs = settings.rotation.beatLeadMs
    // Ligar a rotação ou mudar o intervalo recomeça a contagem (teclado ou faixa).
    // Trocar no beat, compassos e segurar/soltar também recomeçam (spec 024).
    const r = settings.rotation
    const key = `${r.enabled}:${core.rotationIntervalSeconds}:${r.onBeat}:${r.bars}:${core.state.held}`
    if (key !== rotationKey) {
      rotationKey = key
      rotation.restart(performance.now())
    }
    if (!r.onBeat) flushPending()
    state.gainDb = settings.gainDb
    state.audio = state.audio.replace(/ · respiro$/, '') + (core.state.breath ? ' · respiro' : '')
    state.rotation = core.state.held
      ? 'segurada'
      : r.enabled
        ? `${core.rotationIntervalSeconds} s${r.onBeat ? ` ou ${r.bars} compassos` : ''}`
        : 'pausada'
    state.fpsMode = settings.fpsLimit === 'monitor' ? 'monitor' : `limite ${settings.fpsLimit}`
  }
  core.events.on('stateChanged', applyState)
  // Desempenho por preset (spec 012, P2): fps médio de 5 s, 1 s depois do fim do blend.
  // Só mede com a janela visível; o limite de fps vira teto do mínimo.
  let probe: { name: string; from: number; start: number; frames: number; last: number } | null = null
  const PROBE_MS = 5000
  // Um intervalo maior que isso entre quadros é pausa (janela oculta/minimizada: o rAF para), não lentidão.
  const PROBE_GAP_MS = 500
  // Oculta, o rAF para e o probeFrame nem roda: descarta a medida aqui, senão a volta da janela
  // contava os segundos parados como quadros lentos (ex.: "preset pesado … a 6,7 fps" no log).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) probe = null
  })
  const probeFrame = (now: number): void => {
    if (!probe || now < probe.from) return
    if (document.hidden || (probe.last > 0 && now - probe.last > PROBE_GAP_MS)) {
      probe = null
      return
    }
    probe.last = now
    if (probe.start === 0) probe.start = now
    probe.frames++
    if (now - probe.start < PROBE_MS) return
    const fps = (probe.frames * 1000) / (now - probe.start)
    const { name } = probe
    probe = null
    core.run('library.setFps', { name, fps }, 'rotation')
    const cap = settings.fpsLimit === 'monitor' ? Infinity : settings.fpsLimit - 2
    if (settings.perf.skipSlow && fps < Math.min(settings.perf.minFps, cap) && name === core.state.current && !core.isHidden(name)) {
      window.so.log(`preset pesado: ${name} a ${fps.toFixed(1)} fps`)
      core.events.emit('slowPreset', { name, fps })
    }
  }
  // Tela preta sem aviso (relato de 2026-11-10): shader que não compila na GPU do usuário é
  // registrado com a mensagem do driver e pulado até o app fechar; preset que fica todo preto
  // com som tocando é só registrado (pode ser outra causa).
  const badShader = new Set<string>()
  let blackCheck: { name: string; at: number; dark: number } | null = null
  core.events.on('presetChanged', ({ name, blendType, blendSeconds }) => {
    core.events.emit('slowPreset', null)
    probe = { name, from: performance.now() + blendSeconds * 1000 + 1000, start: 0, frames: 0, last: 0 }
    blackCheck = null
    viz
      .load(library.get(name), blendType, blendSeconds)
      .then((applied) => {
        if (!applied || core.state.current !== name) return
        const err = shaderError(viz.visualizer)
        if (!err) {
          blackCheck = { name, at: performance.now() + blendSeconds * 1000 + 2000, dark: 0 }
          return
        }
        window.so.log(`preset com shader que não compila nesta GPU: ${name}: ${err}`)
        if (badShader.has(name)) return
        badShader.add(name)
        showToast('Este preset não funciona nesta placa de vídeo e foi pulado.', { force: true })
        core.run('preset.next', { cut: true }, 'rotation')
      })
      .catch((err: unknown) => {
        // Preset que não compila para WASM: registra; o anterior continua na tela.
        window.so.log(`preset não carregou: ${name}: ${err instanceof Error ? err.message : String(err)}`)
      })
    rotation.restart(performance.now())
    state.preset = name
    console.log(`[viz] preset: ${name} (${blendType}, ${blendSeconds} s)`)
  })
  applyState()
  const idle = mountOverlay(document.getElementById('ui') as HTMLElement, {
    core,
    presets: () => library.all(),
    rotationRemaining: () => rotation.remaining(performance.now()),
    rotationProgress: () => rotation.progress(performance.now()),
    rotationBars: () => (rotation.barsMode ? rotation.barsRemaining() : null),
    beatLocked: () => beat.locked,
    request: (key: WaitKey) => request(key, false, 'ui'),
    retryCapture: () => connectCapture(),
    captureChecks: () => checks,
    openSoundSettings: () => void window.so.system.openSoundSettings(),
    isFullScreen,
    blendTypesAvailable: viz.blendTypesAvailable,
    expressionAvailable: !!exprProbe,
    fps: () => state.fps,
    captureInfo: () => captureInfo,
    presetCount: () => library.count,
    importMilk: async (files: MilkInput[], onProgress?: (done: number, total: number) => void) => {
      const r = await importMilks(files, ctx, library, onProgress)
      if (r.added.length) {
        state.presetCount = library.count
        core.events.emit('stateChanged', { origin: 'ui' }) // Biblioteca e busca veem os novos
      }
      return r
    },
    isImported: (name: string) => library.isImported(name),
    importedCount: () => library.importedCount,
    removeImported: async (name: string) => {
      await window.so.presets.removeImported(name)
      library.removeImported(name)
      if (core.state.current === name) run('preset.next', { cut: false }, 'ui')
      state.presetCount = library.count
      core.events.emit('stateChanged', { origin: 'ui' })
    },
    isMine: (name: string) => !!library.mineInfo(name),
    removeMine: async (name: string) => {
      const info = library.mineInfo(name)
      if (!info) return
      await window.so.presets.removeMine(info.id)
      library.removeMine(name)
      window.so.log(`estúdio: removido ${name}`)
      if (core.state.current === name) run('preset.next', { cut: false }, 'ui')
      state.presetCount = library.count
      core.events.emit('stateChanged', { origin: 'ui' })
    },
    openStudio: (name?: string) => void openStudioFor(name)
  })
  // Abrir em tela cheia (Configurações › Geral).
  if (settings.startFullscreen && !isFullScreen()) core.run('window.fullscreen', {}, 'startup')

  // Preset ao abrir: o último usado, se ainda existir; senão aleatório.
  const t0 = performance.now()
  const extras = library.loadExtraPacks()
  // Preset ao abrir: último usado, aleatório ou um favorito (Configurações › Geral).
  const last =
    settings.startupPreset === 'last' ? settings.lastPreset : settings.startupPreset === 'favorite' ? settings.startupFavorite : null
  if (last && !library.has(last)) {
    // Pode estar nos pacotes extras: espera um pouco por eles, sem passar do limite.
    await Promise.race([extras.catch(() => 0), new Promise((r) => setTimeout(r, STARTUP_EXTRAS_WAIT_MS))])
  }
  const first = last && library.has(last) && !core.isHidden(last) ? core.run('preset.play', { name: last }, 'startup') : null
  if (!first?.ok) core.run('preset.random', {}, 'startup')
  window.so.mark('primeiro preset')
  console.log(`[startup] primeiro preset em ${(performance.now() - t0).toFixed(0)} ms (${first?.ok ? 'último usado' : 'aleatório'})`)
  state.presetCount = library.count
  void connectCapture()

  // ── Estúdio de presets (spec 026) ─────────────────────────
  // Rotação parada enquanto aberto (sem mexer no settings.json); ao sair, volta como estava.
  let studio: { compiler: StudioCompiler; source: string; applied: boolean } | null = null
  /** Do E até fechar, incluindo a carga do Worker: a rotação não pode trocar o preset nesse meio-tempo. */
  let studioBusy = false
  const audioVals = (): Float32Array | null => {
    const v = (viz.visualizer as unknown as { renderer?: { audioLevels?: { val?: unknown } } }).renderer?.audioLevels?.val
    return v instanceof Float32Array ? v : null
  }
  const openStudioFor = async (name?: string): Promise<void> => {
    if (studio || studioBusy) return
    const src = name ?? core.state.current
    if (!src || !library.has(src)) return
    studioBusy = true
    if (src !== core.state.current) run('preset.play', { name: src }, 'ui')
    const { default: EelWorker } = await import('./studio/eel-worker?worker&inline')
    const compiler = new StudioCompiler(ctx, () => new EelWorker(), () => ({ w: settings.render.meshWidth, h: settings.render.meshHeight }))
    const s: { compiler: StudioCompiler; source: string; applied: boolean } = { compiler, source: src, applied: false }
    studio = s
    probe = null
    run('ui.open', { overlay: 'studio' }, 'ui')
    const srcMine = library.mineInfo(src)
    let mineRef: { name: string; id: string } | null = srcMine ? { name: src, id: srcMine.id } : null
    const basedOn = srcMine ? srcMine.meta.basedOn : { name: src, author: src.indexOf(' - ') > 0 ? src.slice(0, src.indexOf(' - ')).trim() : '' }
    window.so.log(`estúdio: aberto com ${src}`)
    openStudio({
      core,
      sourceName: src,
      source: structuredClone(library.get(src)),
      mine: srcMine,
      compile: (p) => compiler.compile(p),
      apply: (p) => {
        s.applied = true
        viz.load(p, 'crossfade', 0.4).catch((err: unknown) => window.so.log(`estúdio: versão não carregou: ${err instanceof Error ? err.message : String(err)}`))
      },
      levels: () => {
        const v = audioVals()
        return v ? [v[0]!, v[1]!, v[2]!] : null
      },
      save: async ({ preset, title, author }) => {
        if (mineRef) {
          const r = await window.so.presets.saveMine({ id: mineRef.id, preset: preset as Record<string, unknown> })
          library.setMine(mineRef.name, r.id, r.meta, preset)
          return { name: mineRef.name, id: r.id, meta: r.meta }
        }
        const free = library.freeName(title)
        const r = await window.so.presets.saveMine({ meta: { title: free, author, basedOn }, preset: preset as Record<string, unknown> })
        const finalName = library.mineInfo(r.meta.title) || !library.has(r.meta.title) ? r.meta.title : library.freeName(r.meta.title)
        library.setMine(finalName, r.id, r.meta, preset)
        mineRef = { name: finalName, id: r.id }
        state.presetCount = library.count
        core.events.emit('stateChanged', { origin: 'ui' }) // Biblioteca e busca veem o novo
        return { name: finalName, id: r.id, meta: r.meta }
      },
      close: (saved) => {
        closeStudio()
        compiler.dispose()
        studio = null
        studioBusy = false
        state.studio = undefined
        run('ui.close', {}, 'ui')
        window.so.log(`estúdio: fechado${saved ? ` com ${saved}` : ''}`)
        // Salvo: o meu preset vira o atual. Sem salvar: volta o original (a prévia mostrava a edição).
        if (saved) run('preset.play', { name: saved }, 'ui')
        else if (s.applied && library.has(src)) run('preset.play', { name: src }, 'ui')
        rotation.restart(performance.now())
      },
      log: (m) => window.so.log(m),
      reportCost: (t) => {
        state.studio = t
      }
    })
  }

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
    exprProbe
      ? `Expressividade ${exprLevel()}${settings.expression.level === EXPRESSION_DEFAULT.level ? ' (padrão)' : ''}`
      : 'Expressividade indisponível (motor sem audioLevels)'
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
  // Ações com nome (spec 020): as mesmas das teclas, com os mesmos toasts; a busca rápida executa por aqui.
  const toggleClean = (): void => {
    run('overlayText.set', { clean: !settings.overlayText.clean })
    showToast(settings.overlayText.clean ? 'Modo limpo ligado' : 'Modo limpo desligado', { force: true })
  }
  const toggleHold = (): void => {
    const r = core.run<boolean>('preset.hold', {}, 'keyboard')
    if (r.ok) showToast(r.value ? 'Visual segurado. Enter solta.' : 'Visual solto.', { force: true })
  }
  const toggleBreath = (): void => {
    const r = core.run<boolean>('audio.breath', {}, 'keyboard')
    if (r.ok) showToast(r.value ? 'Respiro: o visual descansa sem o áudio. Shift+Enter volta.' : 'Áudio de volta no visual.', { force: true })
  }
  const toggleRotation = (): void => {
    run('rotation.set', { enabled: !settings.rotation.enabled })
    showToast(settings.rotation.enabled ? `Rotação a cada ${core.rotationIntervalSeconds} s.` : 'Rotação desligada.')
  }
  const actions: Record<ActionId, () => void> = {
    clean: toggleClean,
    rotation: toggleRotation,
    library: () => toggleOverlay(core, 'library'),
    quick: () => toggleOverlay(core, 'quick'),
    settings: () => toggleOverlay(core, 'settings'),
    shortcuts: () => toggleShortcuts(core),
    fullscreen: () => run('window.fullscreen', {}, 'ui'),
    random: () => request('random', false, 'ui'),
    next: () => request('next', false, 'ui'),
    previous: () => request('previous', false, 'ui'),
    hold: toggleHold,
    breath: toggleBreath,
    hide: () => idle.hideNow(),
    studio: () => void openStudioFor(),
    favorite: () => {
      const r = core.run<boolean>('library.favorite', {}, 'ui')
      if (r.ok) showToast(r.value ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.')
    }
  }
  setActionRunner((id) => actions[id]())

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
    // Estúdio aberto (spec 026): as teclas são dele (Ctrl+S, Ctrl+Enter, Esc, Tab nos campos).
    if (core.state.overlay === 'studio') return
    // Ctrl+K abre e fecha a busca rápida de qualquer lugar (spec 010).
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyK') {
      e.preventDefault()
      toggleOverlay(core, 'search')
      return
    }
    // Ctrl+, abre e fecha as Configurações (spec 011).
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === ',') {
      e.preventDefault()
      toggleOverlay(core, 'settings')
      return
    }
    if (e.ctrlKey || e.altKey || e.metaKey) return
    // Painel de atalhos aberto (spec 020): só `?` e Esc, que o fecham; as teclas do Palco ficam atrás dele.
    if (isShortcutsOpen()) {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        closeShortcuts()
      }
      return
    }
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
      // Cartão de boas-vindas e aviso de silêncio fecham antes (spec 012).
      if (!core.state.overlay && dismissFloat()) return
      if (core.state.overlay) run('ui.close')
      else if (isFullScreen()) run('window.fullscreen')
      return
    }
    // Com as Configurações abertas, as teclas do Palco não valem (só Esc e os atalhos com Ctrl).
    if (core.state.overlay === 'settings') return
    // `?` abre o painel de atalhos no Palco e por cima da Biblioteca (spec 020).
    if (e.key === '?') {
      e.preventDefault()
      toggleShortcuts(core)
      return
    }
    if (e.code === 'KeyL') {
      e.preventDefault()
      toggleOverlay(core, 'library')
      return
    }
    // Dentro da Biblioteca, da busca ou de um menu, as setas e o Espaço são da lista.
    if (t?.closest('.lib, .palette, .menu, .sheet, .settings')) return
    if (e.key === '/') {
      e.preventDefault()
      run('ui.open', { overlay: 'search' })
      return
    }
    // Espaço com foco num botão aciona o botão (acessibilidade), não o aleatório.
    if (e.code === 'Space' && t?.closest('button, a')) return
    // Enter segura o visual (spec 024), mas num botão ou link continua acionando o controle,
    // e com um painel aberto é dele.
    // Só um controle focado pelo teclado (:focus-visible) fica com o Enter: depois de um clique,
    // o foco continua no botão, mas o Enter volta a ser do Palco.
    if (e.key === 'Enter') {
      const ctl = t?.closest('button, a, [role="button"], [role="menuitem"], [tabindex]')
      if ((ctl && ctl.matches(':focus-visible')) || core.state.overlay) return
      e.preventDefault()
      ;(ctl as HTMLElement | null)?.blur()
      if (e.shiftKey) toggleBreath()
      else toggleHold()
      return
    }
    let handled = true
    // Shift na troca = corte seco na hora, sem mudar o ajuste salvo (spec 013).
    const cut = e.shiftKey
    // Atalhos v3 (docs/design/v3-modelo-de-navegacao.md), agora como comandos do Core.
    // Com "Trocar no beat", as trocas esperam a próxima batida (M23), Shift incluído.
    if (e.code === 'ArrowRight') {
      request('next', cut)
    } else if (e.code === 'ArrowLeft') {
      request('previous', cut)
    } else if (e.code === 'KeyX') {
      // X cicla o Caráter; Shift+X a Memória (spec 015).
      if (e.shiftKey) {
        const i = EXPRESSION_ADAPTATIONS.indexOf(settings.expression.adaptation)
        run('expression.set', { adaptation: EXPRESSION_ADAPTATIONS[(i + 1) % EXPRESSION_ADAPTATIONS.length] })
        const a = settings.expression.adaptation
        showToast(`Memória ${EXPRESSION_ADAPTATION_LABEL[a]}${a === EXPRESSION_DEFAULT.adaptation ? ' (padrão)' : ''}`)
      } else {
        const i = EXPRESSION_CURVES.indexOf(settings.expression.curve)
        run('expression.set', { curve: EXPRESSION_CURVES[(i + 1) % EXPRESSION_CURVES.length] })
        const c = settings.expression.curve
        showToast(`Caráter: ${EXPRESSION_CURVE_LABEL[c]}${c === EXPRESSION_DEFAULT.curve ? ' (padrão)' : ''}${settings.expression.level === 0 ? ' · sem efeito no nível 0' : ''}`)
      }
    } else if (e.code === 'Space') {
      request('random', cut)
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
      toggleClean()
    } else if (e.code === 'KeyH') {
      idle.hideNow()
    } else if (e.code === 'KeyE' && !e.shiftKey) {
      // Estúdio com uma cópia do preset atual (spec 026).
      void openStudioFor()
    } else if (e.code === 'KeyR') {
      toggleRotation()
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
  let preRmsDb = -Infinity
  let prePeakDb = -Infinity
  let lastLevelTick = 0
  let lastLoop = performance.now()
  let frames = 0
  let windowStart = performance.now()
  let firstFrame = false
  let beatCost = 0
  let beatFrames = 0
  // Render resiliente (spec 021): um preset pode travar dentro do WASM ("float unrepresentable")
  // ou quebrar a transição seguinte. 3 erros em 1 s = o preset é pulado até o app fechar.
  const broken = new Set<string>()
  const baseSkip = library.isSkipped
  library.isSkipped = (name) => broken.has(name) || badShader.has(name) || baseSkip(name)
  let renderErrors: number[] = []
  const renderSafe = (elapsed: number): void => {
    try {
      viz.render(elapsed)
    } catch (err) {
      const t = performance.now()
      renderErrors = [...renderErrors.filter((x) => t - x < 1000), t]
      if (renderErrors.length < 3) return
      renderErrors = []
      // No Estúdio, a versão em edição que trava no motor volta ao original, sem pular o preset.
      if (studio) {
        window.so.log(`estúdio: a versão em edição travou no motor: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`)
        showToast('A versão em edição travou no motor. Voltei ao preset de origem.', { force: true })
        if (library.has(studio.source)) void viz.load(library.get(studio.source), 'cut', 0)
        return
      }
      const name = core.state.current
      if (!name || broken.has(name)) return
      broken.add(name)
      window.so.log(`preset travou e foi pulado: ${name}: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`)
      showToast('Este preset travou e foi pulado.', { force: true })
      run('preset.next', { cut: true }, 'rotation')
    }
  }
  /** 9 pontos do quadro recém-desenhado, todos quase pretos. Lido logo depois do render. */
  const isBlackFrame = (): boolean => {
    const gl = (viz.visualizer as unknown as { renderer?: { gl?: WebGL2RenderingContext } }).renderer?.gl
    if (!gl) return false
    const px = new Uint8Array(4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    for (const fx of [0.2, 0.5, 0.8])
      for (const fy of [0.2, 0.5, 0.8]) {
        gl.readPixels(Math.floor(gl.drawingBufferWidth * fx), Math.floor(gl.drawingBufferHeight * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
        if (px[0]! > 6 || px[1]! > 6 || px[2]! > 6) return false
      }
    return true
  }
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
      let pk = 0
      for (const v of preSamples) {
        sq += v * v
        if (Math.abs(v) > pk) pk = Math.abs(v)
      }
      const rms = Math.sqrt(sq / preSamples.length)
      // Spec 028: RMS e pico em dBFS antes do ganho, para o HUD.
      preRmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity
      prePeakDb = pk > 0 ? 20 * Math.log10(pk) : -Infinity
      silence.update(rms, now)
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
    if (silence.showNotice || core.state.capture !== 'ok' || studioBusy) rotation.hold(now - lastLoop)
    lastLoop = now
    const dt = Math.min(0.1, Math.max(0.001, (now - lastRender) / 1000))
    lastRender = now
    const speed = silence.step(dt)
    dim.style.opacity = String(((1 - speed) / (1 - 0.15)) * SILENT_DIM)
    const t0Beat = performance.now()
    const crossed = beat.update(now, silence.resting)
    if (crossed > 0) {
      if (!studioBusy) for (let i = 0; i < crossed; i++) rotation.beat()
      core.events.emit('beatTick', {})
      flushPending()
    }
    // Rede de segurança: nada espera mais que ~1 batida.
    if (pending && (!beat.locked || now - pending.since > beat.periodMs * 1.5)) flushPending()
    beatCost += performance.now() - t0Beat
    beatFrames++
    // No modo beat, a troca sai na batida e mistura no máximo 1 batida, para cair no tempo.
    if (!studioBusy && rotation.due(now)) run('rotation.advance', rotation.barsMode ? { maxBlendSeconds: beat.periodMs / 1000 } : {}, 'rotation')
    renderSafe(dt * speed)
    if (blackCheck && now >= blackCheck.at) {
      const c = blackCheck
      if (c.name !== core.state.current || document.hidden) blackCheck = null
      else if (!isBlackFrame()) blackCheck = null
      else if (silence.resting) c.at = now + 1000 // sem som, preto pode ser o preset descansando
      else if (++c.dark >= 3) {
        window.so.log(`preset preto: ${c.name} (os shaders compilaram; 3 s todo preto com som tocando)`)
        blackCheck = null
      } else c.at = now + 1000
    }
    if (!firstFrame) {
      firstFrame = true
      window.so.mark('primeiro quadro')
    }
    probeFrame(now)
    frames++
    if (now - windowStart >= 1000) {
      state.fps = (frames * 1000) / (now - windowStart)
      frames = 0
      windowStart = now
      if (exprProbe) {
        const ex = settings.expression
        const p = exprProbe
        const f = (v: number, d = 2): string => (Number.isFinite(v) ? v.toFixed(d) : '—')
        const db = (v: number): string => (Number.isFinite(v) ? `${v.toFixed(1)}` : '−∞')
        const mem = ex.adaptation === 'normal' ? '' : p.seeding ? ' · memória: semeando' : ` · média memória ${f(p.memLongAvg)}`
        const squelch = p.squelch < 1 ? ` · silêncio ${(p.squelch * 100).toFixed(0)} %` : ''
        state.expression =
          `expressividade ${exprLevel()} · caráter ${ex.curve} · memória ${ex.adaptation} · bass ${f(p.bassIn)} → ${f(p.bassOut)}${squelch}\n` +
          `imm ${f(p.imm)} · média motor ${f(p.engineLongAvg)}${mem} · RMS ${db(preRmsDb)} dBFS · pico ${db(prePeakDb)} dBFS (antes do ganho) · ganho em vigor ${settings.gainDb > 0 ? '+' : ''}${settings.gainDb.toFixed(1)} dB (manual)`
      }
      const bs = rotation.barsMode ? ` · ${rotation.beatsSinceRestart} batidas (${rotation.barsRemaining()} c restantes)` : ''
      state.beat = `beat ${beat.locked ? 'estável' : 'procurando'} · ${(beat.locked ? beat.bpm : beat.estimate).toFixed(1)} BPM · confiança ${beat.confidence.toFixed(2)}${bs} · detecção ${(beatCost / Math.max(1, beatFrames)).toFixed(3)} ms/quadro`
      beatCost = 0
      beatFrames = 0
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
      window.so.mark('pacotes extras')
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
