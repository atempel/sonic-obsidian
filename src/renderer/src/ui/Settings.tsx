import type { ComponentChildren } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { KeyCaps, takeSettingsSection } from './ShortcutsPanel'
import { SHORTCUT_GROUPS, keysText } from './shortcuts'
import type { Core } from '../core/commands'
import {
  BEAT_BARS,
  type BeatBars,
  BLEND_MAX_S,
  BLEND_MIN_S,
  BLEND_TYPES,
  BLEND_TYPE_LABEL,
  CANVAS_SCALES,
  FPS_LIMITS,
  GAIN_MAX_DB,
  GAIN_MIN_DB,
  MESH_SIZES,
  PIXEL_RATIOS,
  TEXTURE_RATIOS,
  type BlendType,
  type PixelRatio,
  type PresetNameMode,
  type StartupPreset,
  type ToastMode
} from '../core/state'
import { Icon, type IconName } from './icons'
import { Meter, type PalcoBridge } from './Overlay'
import { splitPresetName } from './preset-name'
import { dbText, secondsText } from './QuickSettings'
import { importSummary } from '../importer'
import { useSlideIndicator } from './slide-indicator'

/**
 * Configurações (spec 011, PR 2): tela por cima do Palco, com o visual a 25% atrás.
 * Protótipo "Configurações" (1794175739-7509). Abre em Geral (decisão do usuário).
 * Telas, Integrações, outras fontes e as opções da spec 012 ficam para as fases delas.
 * Tudo por comandos do Core: é o mesmo estado dos Ajustes rápidos e das teclas.
 */

type SectionId = 'geral' | 'captura' | 'visual' | 'render' | 'desempenho' | 'biblioteca' | 'atalhos' | 'sobre'
const SECTIONS: { id: SectionId; label: string; icon: IconName; lead: string }[] = [
  { id: 'geral', label: 'Geral', icon: 'settings-2', lead: 'Como o Sonic Obsidian abre.' },
  { id: 'captura', label: 'Captura', icon: 'audio-lines', lead: 'De onde vem o som que o visual escuta.' },
  { id: 'visual', label: 'Visual', icon: 'sparkles', lead: 'Como os presets passam de um para o outro.' },
  { id: 'render', label: 'Renderização', icon: 'cpu', lead: 'Qualidade e custo do Butterchurn na sua GPU.' },
  { id: 'desempenho', label: 'Desempenho', icon: 'gauge', lead: 'Proteção contra presets lentos e leitura de fps.' },
  { id: 'biblioteca', label: 'Biblioteca', icon: 'library', lead: 'Pacotes de presets, presets ocultos e coleções.' },
  { id: 'atalhos', label: 'Atalhos', icon: 'keyboard', lead: 'Teclas globais do app.' },
  { id: 'sobre', label: 'Sobre', icon: 'info', lead: 'Versão, créditos e links.' }
]

/** Sem acento e minúsculo, para a busca. */
const norm = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// ── Primitivas ────────────────────────────────────────────────
interface RowProps {
  id?: string
  label: string
  help?: ComponentChildren
  /** Palavras extras para a busca. */
  kw?: string
  phase?: string
  stack?: boolean
  children?: ComponentChildren
}

function Row({ id, label, help, kw = '', phase, stack, children }: RowProps) {
  const helpText = typeof help === 'string' ? help : ''
  return (
    <div class={stack ? 'row stack' : 'row'} data-search={`${label} ${helpText} ${kw}`}>
      <div class="txt">
        {id ? (
          <label class="lbl" for={id}>
            {label}
          </label>
        ) : (
          <span class="lbl">{label}</span>
        )}
        {help && <p class="help">{help}</p>}
      </div>
      <div class="ctl">
        {phase && <span class="phase">{phase}</span>}
        {children}
      </div>
    </div>
  )
}

function Sw({ id, checked, disabled, label, onChange }: { id: string; checked: boolean; disabled?: boolean; label: string; onChange?: (v: boolean) => void }) {
  return (
    <label class="switch">
      <input type="checkbox" id={id} checked={checked} disabled={disabled} aria-label={label} onChange={(e) => onChange?.((e.target as HTMLInputElement).checked)} />
      <span class="track" />
    </label>
  )
}

function Sel<T extends string | number>({ id, value, options, disabled, onChange }: { id: string; value: T; options: [T, string][]; disabled?: boolean; onChange: (v: T) => void }) {
  return (
    <select
      class="sel sel-w"
      id={id}
      value={String(value)}
      disabled={disabled}
      onChange={(e) => {
        const raw = (e.target as HTMLSelectElement).value
        const opt = options.find(([v]) => String(v) === raw)
        if (opt) onChange(opt[0])
      }}
    >
      {options.map(([v, text]) => (
        <option value={String(v)} key={String(v)}>
          {text}
        </option>
      ))}
    </select>
  )
}

function Seg<T extends string | number>({ name, value, options, disabled, label, onChange }: { name: string; value: T; options: [T, string][]; disabled?: boolean; label: string; onChange: (v: T) => void }) {
  return (
    <div class="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <label key={String(v)}>
          <input type="radio" name={name} checked={v === value} disabled={disabled} onChange={() => onChange(v)} />
          <span class={typeof v === 'number' ? 'num' : undefined}>{text}</span>
        </label>
      ))}
    </div>
  )
}

function Rng({ id, value, min, max, step, text, disabled, onInput }: { id: string; value: number; min: number; max: number; step: number; text: string; disabled?: boolean; onInput: (v: number) => void }) {
  const pct = ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100
  return (
    <div class="rng">
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={text}
        style={`--fill: ${pct}%`}
        onInput={(e) => onInput(Number((e.target as HTMLInputElement).value))}
      />
      <span class="val num">{text}</span>
    </div>
  )
}

function Grp({ title, children }: { title?: string; children: ComponentChildren }) {
  return (
    <div class="grp">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  )
}

// ── Seções ────────────────────────────────────────────────────
type Run = (name: string, args: Record<string, unknown>) => void

function Geral({ core, run }: { core: Core; run: Run }) {
  const s = core.state.settings
  const favs = core.state.library.favorites
  const favOptions: [string, string][] = favs.map((n) => {
    const { title, author } = splitPresetName(n)
    return [n, author ? `${title} · por ${author}` : title]
  })
  return (
    <>
      <Grp title="Ao iniciar">
        <Row label="Abrir em" help="Tela mostrada quando o app inicia." phase="Fase 5" kw="rack palco">
          <Seg name="openIn" label="Abrir em" value="palco" options={[['palco', 'Palco'], ['rack', 'Rack']]} disabled onChange={() => {}} />
        </Row>
        <Row label="Iniciar com o Windows" help="O app já abre tocando, sem nenhum clique." phase="Fase 5">
          <Sw id="st-boot" label="Iniciar com o Windows" checked={false} disabled />
        </Row>
        <Row id="st-full" label="Abrir em tela cheia" help="Mesmo efeito de F11 ao abrir." kw="fullscreen">
          <Sw id="st-full" label="Abrir em tela cheia" checked={s.startFullscreen} onChange={(v) => run('settings.set', { startFullscreen: v })} />
        </Row>
      </Grp>
      <Grp title="Preset inicial">
        <Row id="st-preset" label="Preset ao abrir">
          <Sel<StartupPreset>
            id="st-preset"
            value={s.startupPreset}
            options={[
              ['last', 'Último usado'],
              ['random', 'Aleatório'],
              ['favorite', 'Um favorito']
            ]}
            onChange={(v) => {
              const args: Record<string, unknown> = { startupPreset: v }
              // Escolher "Um favorito" sem favorito escolhido pega o primeiro da lista.
              if (v === 'favorite' && !s.startupFavorite && favs[0]) args.startupFavorite = favs[0]
              run('settings.set', args)
            }}
          />
        </Row>
        <Row id="st-fav" label="Favorito ao abrir" help="Usado quando o preset ao abrir é “Um favorito”.">
          {favOptions.length === 0 ? (
            <span class="phase">Nenhum favorito ainda</span>
          ) : (
            <Sel<string>
              id="st-fav"
              value={s.startupFavorite && favs.includes(s.startupFavorite) ? s.startupFavorite : favs[0]!}
              options={favOptions}
              disabled={s.startupPreset !== 'favorite'}
              onChange={(v) => run('settings.set', { startupFavorite: v })}
            />
          )}
        </Row>
      </Grp>
    </>
  )
}

function Captura({ bridge, run }: { bridge: PalcoBridge; run: Run }) {
  const { core } = bridge
  const s = core.state.settings
  const capture = core.state.capture
  const info = bridge.captureInfo()
  const [test, setTest] = useState<'idle' | 'running' | 'ok' | 'none'>('idle')
  const testOff = useRef<(() => void) | undefined>(undefined)
  useEffect(() => () => testOff.current?.(), [])
  const runTest = (): void => {
    setTest('running')
    const t0 = performance.now()
    let timer = 0
    const off = core.events.on('levelTick', ({ level }) => {
      if (level > 0.01) finish('ok')
      else if (performance.now() - t0 > 3000) finish('none')
    })
    const finish = (r: 'ok' | 'none'): void => {
      off()
      window.clearTimeout(timer)
      testOff.current = undefined
      setTest(r)
    }
    // Sem levelTick (janela oculta), encerra em 3 s do mesmo jeito.
    timer = window.setTimeout(() => finish('none'), 3200)
    testOff.current = () => (off(), window.clearTimeout(timer))
  }
  const rate = `${(info.sampleRate / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kHz`
  return (
    <>
      <div class="cap" data-search="captura saída padrão windows nível de entrada testar captura dispositivo">
        <div class="cap-top">
          <span class="dot" style={capture === 'ok' ? undefined : `background: var(${capture === 'denied' ? '--beat' : '--warn'})`} />
          <div>
            <b>{capture === 'ok' ? 'Ouvindo a saída padrão do Windows' : capture === 'denied' ? 'A captura foi recusada' : 'Conectando à saída padrão do Windows…'}</b>
            <span>
              {info.device ? `${info.device} · ` : ''}
              <span class="num">{rate}</span>
            </span>
          </div>
        </div>
        <div class="cap-lvl">
          <span>Nível de entrada</span>
          <span role="img" aria-label="Nível de entrada ao vivo">
            <Meter core={core} />
          </span>
        </div>
        <div class="cap-test">
          <button class="btn sm" disabled={test === 'running' || capture !== 'ok'} onClick={runTest}>
            Testar captura
          </button>
          <span class={test === 'ok' ? 'testres done' : 'testres'} role="status">
            {test === 'running' && 'Detectando som…'}
            {test === 'ok' && (
              <>
                <Icon name="check" small />
                Som detectado
              </>
            )}
            {test === 'none' && 'Nenhum som em 3 s. Toque algo no computador e tente de novo.'}
          </span>
        </div>
      </div>
      <Grp title="Entrada">
        <Row id="st-device" label="Dispositivo de captura" help="Por enquanto o app ouve sempre a saída padrão do Windows." phase="Fase 3">
          <Sel<string> id="st-device" value="default" options={[['default', 'Saída padrão do Windows']]} disabled onChange={() => {}} />
        </Row>
      </Grp>
      <Grp title="Nível">
        <Row id="st-gain" label="Ganho padrão" help="Aplicado ao abrir. Durante a música, use os Ajustes rápidos." kw="volume db">
          <Rng id="st-gain" value={s.gainDefaultDb} min={GAIN_MIN_DB} max={GAIN_MAX_DB} step={1} text={dbText(s.gainDefaultDb)} onInput={(v) => run('settings.set', { gainDefaultDb: v })} />
        </Row>
      </Grp>
    </>
  )
}

function BlendRow({ core, run, target, label, help, available }: { core: Core; run: Run; target: 'manual' | 'auto'; label: string; help: string; available: boolean }) {
  const rule = core.state.settings.blend[target]
  const engineOnly = !available && rule.type !== 'cut' && rule.type !== 'random'
  return (
    <Row id={`st-blend-${target}`} label={label} help={engineOnly ? `${help} Indisponível neste motor: o tipo é sorteado.` : help} kw="blend transição corte crossfade plasma" stack>
      <Sel<BlendType>
        id={`st-blend-${target}`}
        value={rule.type}
        options={BLEND_TYPES.map((t) => [t, BLEND_TYPE_LABEL[t]])}
        onChange={(type) => run('blend.set', { target, type })}
      />
      {rule.type !== 'cut' && (
        <Rng id={`st-blend-${target}-s`} value={rule.seconds} min={BLEND_MIN_S} max={BLEND_MAX_S} step={0.1} text={secondsText(rule.seconds)} onInput={(seconds) => run('blend.set', { target, seconds })} />
      )}
    </Row>
  )
}

function Visual({ bridge, run }: { bridge: PalcoBridge; run: Run }) {
  const { core } = bridge
  const s = core.state.settings
  const rot = s.rotation
  const cols = core.state.library.collections
  const text = s.overlayText
  return (
    <>
      <Grp title="Rotação">
        <Row id="st-rot" label="Rotação automática" help="Troca de preset sozinha enquanto toca.">
          <Sw id="st-rot" label="Rotação automática" checked={rot.enabled} onChange={(enabled) => run('rotation.set', { enabled })} />
        </Row>
        <Row id="st-int" label="Intervalo" help="Tempo até o próximo preset.">
          <Rng id="st-int" value={rot.intervalSeconds} min={5} max={120} step={5} text={`${rot.intervalSeconds} s`} disabled={!rot.enabled} onInput={(v) => run('rotation.set', { intervalSeconds: v })} />
        </Row>
        <Row label="Ordem">
          <Seg<'random' | 'collection'>
            name="st-order"
            label="Ordem"
            value={rot.order}
            options={[
              ['random', 'Aleatória'],
              ['collection', 'Coleção']
            ]}
            disabled={!rot.enabled || cols.length === 0}
            onChange={(order) => run('rotation.set', order === 'collection' && !rot.collectionId ? { order, collectionId: cols[0]!.id } : { order })}
          />
        </Row>
        <Row id="st-col" label="Coleção" help={cols.length ? 'Usada quando a ordem é Coleção.' : 'Crie uma coleção na Biblioteca para usar esta ordem.'}>
          {cols.length > 0 && (
            <Sel<string>
              id="st-col"
              value={rot.collectionId ?? cols[0]!.id}
              options={cols.map((c) => [c.id, c.name])}
              disabled={!rot.enabled || rot.order !== 'collection'}
              onChange={(collectionId) => run('rotation.set', { collectionId })}
            />
          )}
        </Row>
      </Grp>
      <Grp title="Transição">
        <BlendRow core={core} run={run} target="auto" label="Na troca automática" help="Tipo e tempo da mistura quando a rotação troca o preset." available={bridge.blendTypesAvailable} />
        <BlendRow core={core} run={run} target="manual" label="Quando você troca" help="Teclado, faixa, Biblioteca e busca. Shift na troca faz corte seco." available={bridge.blendTypesAvailable} />
        <Row id="st-beat" label="Trocar no beat" help="Muda de preset quando detectar uma batida forte." kw="bpm compasso batida segurar">
          <Sw id="st-beat" label="Trocar no beat" checked={rot.onBeat} onChange={(onBeat) => run('rotation.set', { onBeat })} />
        </Row>
        <Row id="st-bars" label="Compassos" help="Com batida estável, troca a cada tantos compassos de 4 batidas. Sem batida, vale o intervalo em segundos.">
          <Sel<BeatBars> id="st-bars" value={rot.bars} options={BEAT_BARS.map((b) => [b, `${b} compassos`])} disabled={!rot.onBeat} onChange={(bars) => run('rotation.set', { bars })} />
        </Row>
      </Grp>
      <Grp title="Texto sobre o visual">
        <Row id="st-name" label="Nome do preset" help="Cartão com o nome e o autor que aparece a cada troca." kw="assinatura crédito">
          <Sel<PresetNameMode>
            id="st-name"
            value={text.presetName}
            options={[
              ['always', 'Sempre'],
              ['manual', 'Só quando eu troco'],
              ['never', 'Nunca']
            ]}
            onChange={(presetName) => run('overlayText.set', { presetName })}
          />
        </Row>
        <Row id="st-track" label="Título da faixa" help="Ao tocar um arquivo ou uma faixa do SoundCloud (Fase 3).">
          <Sw id="st-track" label="Título da faixa" checked={text.trackTitle} onChange={(trackTitle) => run('overlayText.set', { trackTitle })} />
        </Row>
        <Row id="st-toasts" label="Avisos" help="Importantes: ações da IA e falhas. Painéis de erro aparecem sempre." kw="toast">
          <Sel<ToastMode>
            id="st-toasts"
            value={text.toasts}
            options={[
              ['all', 'Todos'],
              ['important', 'Só importantes'],
              ['none', 'Nenhum']
            ]}
            onChange={(toasts) => run('overlayText.set', { toasts })}
          />
        </Row>
        <Row
          id="st-clean"
          label="Modo limpo"
          help={
            <>
              Esconde tudo acima de uma vez, sem mudar estas escolhas. Atalho <kbd>T</kbd>.
            </>
          }
          kw="esconde tudo atalho t"
        >
          <Sw id="st-clean" label="Modo limpo" checked={text.clean} onChange={(clean) => run('overlayText.set', { clean })} />
        </Row>
        <Row label="Mostrar crédito do preset" help="O crédito do autor é sempre exibido." kw="autor">
          <Sw id="st-credit" label="Mostrar crédito do preset" checked disabled />
        </Row>
        <p class="note fixed" data-search="crédito do autor faixa de controle biblioteca">
          O crédito do autor continua na faixa de controle e na Biblioteca.
        </p>
      </Grp>
    </>
  )
}

function Render({ core, run }: { core: Core; run: Run }) {
  const s = core.state.settings
  const r = s.render
  const par = (t: string) => <span class="num par">{t}</span>
  const fpsOptions: [number | 'monitor', string][] = FPS_LIMITS.map((v) => [v, v === 'monitor' ? 'Sem limite' : `${v} fps`])
  if (!FPS_LIMITS.includes(s.fpsLimit as 60)) fpsOptions.splice(-1, 0, [s.fpsLimit, `${s.fpsLimit} fps`])
  return (
    <>
      <Grp title="Qualidade">
        <Row id="st-mesh" label="Malha de distorção" help={<>Mais detalhe nas distorções do preset, mais custo de GPU. {par('meshWidth × meshHeight · setInternalMeshSize')}</>} kw="mesh malha">
          <Sel<string>
            id="st-mesh"
            value={`${r.meshWidth}x${r.meshHeight}`}
            options={MESH_SIZES.map(([w, h]) => [`${w}x${h}`, `${w}×${h}`])}
            onChange={(v) => {
              const [w, h] = v.split('x').map(Number)
              run('render.set', { meshWidth: w, meshHeight: h })
            }}
          />
        </Row>
        <Row id="st-pr" label="Escala de pixels" help={<>Automático segue a densidade da tela. {par('pixelRatio')}</>} kw="pixel ratio dpi">
          <Sel<PixelRatio> id="st-pr" value={r.pixelRatio} options={PIXEL_RATIOS.map((v) => [v, v === 'auto' ? 'Automático' : `${String(v).replace('.', ',')}×`])} onChange={(pixelRatio) => run('render.set', { pixelRatio })} />
        </Row>
        <Row label="Resolução das texturas" help={<>Menos pixels nas texturas internas, mais fps. {par('textureRatio')}</>} kw="textura">
          <Seg<number> name="st-tex" label="Resolução das texturas" value={r.textureRatio} options={TEXTURE_RATIOS.map((v) => [v, String(v).replace('.', ',')])} onChange={(textureRatio) => run('render.set', { textureRatio })} />
        </Row>
        <Row id="st-fxaa" label="Suavização (FXAA)" help={<>Suaviza as bordas da imagem final. {par('outputFXAA · setOutputAA')}</>} kw="antialiasing fxaa">
          <Sw id="st-fxaa" label="Suavização (FXAA)" checked={r.fxaa} onChange={(fxaa) => run('render.set', { fxaa })} />
        </Row>
      </Grp>
      <Grp title="Quadros e tamanho">
        <Row id="st-fps" label="Limite de quadros" help="Teto de fps do visual. Sem limite segue a taxa do monitor." kw="fps hz">
          <Sel<number | 'monitor'> id="st-fps" value={s.fpsLimit} options={fpsOptions} onChange={(fpsLimit) => run('settings.set', { fpsLimit })} />
        </Row>
        <Row label="Tamanho do canvas" help="Menos pixels, mais fps. Afeta só o visual." kw="resolução">
          <Seg<number> name="st-canvas" label="Tamanho do canvas" value={r.canvasScale} options={CANVAS_SCALES.map((v) => [v, v === 1 ? 'Nativo' : `${v * 100}%`])} onChange={(canvasScale) => run('render.set', { canvasScale })} />
        </Row>
      </Grp>
      <Grp title="Texturas">
        <Row id="st-img" label="Carregar pacote de imagens extras" help={<>Alguns presets usam essas imagens. Desligar vale na próxima abertura. {par('loadExtraImages')}</>} kw="imagens">
          <Sw id="st-img" label="Carregar pacote de imagens extras" checked={r.extraImages} onChange={(extraImages) => run('render.set', { extraImages })} />
        </Row>
      </Grp>
    </>
  )
}

function Desempenho({ core, run }: { core: Core; run: Run }) {
  const { perf, showFps } = core.state.settings
  const lib = core.state.library
  const listRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <Grp title="Proteção">
        <Row id="st-skip" label="Pular presets lentos" help="Avisa na faixa quando um preset fica abaixo do mínimo de fps, com “Pular e ocultar”." kw="lento pesado fps">
          <Sw id="st-skip" label="Pular presets lentos" checked={perf.skipSlow} onChange={(skipSlow) => run('perf.set', { skipSlow })} />
        </Row>
        <Row id="st-minfps" label="Mínimo de fps" help="Abaixo disso, o preset é marcado como pesado." kw="fps">
          <Rng id="st-minfps" value={perf.minFps} min={15} max={60} step={5} text={`${perf.minFps} fps`} disabled={!perf.skipSlow} onInput={(minFps) => run('perf.set', { minFps })} />
        </Row>
      </Grp>
      <Grp title="Ocultos por desempenho">
        <div class="hlist" ref={listRef} tabIndex={-1}>
          {lib.hiddenPerf.length === 0 ? (
            <p class="help" style="padding:14px 0" data-search="ocultos por desempenho">
              Nenhum preset oculto por desempenho. Presets que ficarem abaixo do mínimo de fps aparecem aqui.
            </p>
          ) : (
            lib.hiddenPerf.map((n) => {
              const { title, author } = splitPresetName(n)
              const fps = lib.presetFps[n]
              return (
                <div class="row hrow" key={n} data-search={`${title} ${author} desempenho`}>
                  <div class="txt">
                    <div class="nm">{title}</div>
                    {author && <div class="by">por {author}</div>}
                  </div>
                  <div class="ctl">
                    {fps !== undefined && <span class="num count warn">{fps} fps</span>}
                    <button
                      class="btn sm"
                      aria-label={`Restaurar ${title}${author ? `, por ${author}` : ''}`}
                      onClick={() => {
                        run('library.restore', { name: n, reason: 'performance' })
                        listRef.current?.focus()
                      }}
                    >
                      Restaurar
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Grp>
      <Grp title="Faixa de controle">
        <Row id="st-showfps" label="Mostrar fps na faixa" help="Exibe o valor ao vivo ao lado do nível de entrada." kw="fps">
          <Sw id="st-showfps" label="Mostrar fps na faixa" checked={showFps} onChange={(v) => run('settings.set', { showFps: v })} />
        </Row>
      </Grp>
    </>
  )
}

function Biblioteca({ bridge, run }: { bridge: PalcoBridge; run: Run }) {
  const { core } = bridge
  const lib = core.state.library
  const [open, setOpen] = useState(false)
  const [io, setIo] = useState<{ ok: boolean; text: string } | null>(null)
  // Importar .milk (spec 022): resumo do último lote, com os motivos das falhas.
  const [milk, setMilk] = useState<{ ok: boolean; text: string; fails: string[] } | null>(null)
  const [milkBusy, setMilkBusy] = useState(false)
  const importMilk = async (): Promise<void> => {
    const picked = await window.so.presets.pickMilk()
    if (!picked.files.length && !picked.tooBig.length) return
    setMilkBusy(true)
    try {
      const r = await bridge.importMilk(picked.files, (done, total) => setMilk({ ok: true, text: `Importando… ${done}/${total}`, fails: [] }))
      r.extra += picked.extra
      for (const n of picked.tooBig) r.failed.push({ name: n.replace(/\.milk$/i, ''), reason: 'arquivo maior que 256 KB' })
      setMilk({ ok: r.failed.length === 0, text: importSummary(r), fails: r.failed.map((f) => `${f.name}: ${f.reason}`) })
    } finally {
      setMilkBusy(false)
    }
  }
  const listRef = useRef<HTMLDivElement>(null)
  const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

  const exportCollections = async (): Promise<void> => {
    const n = lib.collections.length
    const res = await window.so.collections.export(JSON.stringify({ version: 1, collections: lib.collections }, null, 2))
    if (res.ok) setIo({ ok: true, text: `${plural(n, 'coleção exportada', 'coleções exportadas')} para ${res.name}.` })
    else if (!res.canceled) setIo({ ok: false, text: 'Não foi possível salvar o arquivo. Tente de novo.' })
  }
  const importCollections = async (): Promise<void> => {
    const res = await window.so.collections.import()
    if (res.canceled) return
    const name = res.name ?? 'o arquivo'
    if (!res.ok || res.text === undefined) {
      setIo({ ok: false, text: `Não foi possível abrir ${name}. Tente de novo.` })
      return
    }
    let data: unknown
    try {
      data = JSON.parse(res.text)
    } catch {
      data = null
    }
    const r = core.run<number>('collection.import', { data }, 'ui')
    if (r.ok) setIo({ ok: true, text: `${plural(r.value, 'coleção importada', 'coleções importadas')} de ${name}.` })
    else setIo({ ok: false, text: `Não foi possível ler ${name}. Escolha um arquivo .json exportado pelo Sonic Obsidian.` })
  }

  return (
    <>
      <Grp title="Pacotes">
        <Row label="Base" help="butterchurn-presets e os pacotes extras que vêm com o app." kw="pacote presets">
          <span class="count num">{bridge.presetCount() - bridge.importedCount()} presets</span>
        </Row>
        <Row label="Importar presets .milk" help="Ou arraste arquivos .milk para a janela. Eles são convertidos e ficam marcados como importados." kw="milk arquivos importar importados">
          {bridge.importedCount() > 0 && <span class="count num">{bridge.importedCount()} importados</span>}
          <button class="btn sm" disabled={milkBusy} onClick={() => void importMilk()}>
            Escolher arquivos…
          </button>
        </Row>
        {milk && (
          <div class={milk.ok ? 'note ok' : 'note'} role="status">
            <Icon name={milk.ok ? 'check' : 'circle-alert'} small />
            <span>
              {milk.text}
              {milk.fails.length > 0 && (
                <ul class="fails">
                  {milk.fails.slice(0, 10).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                  {milk.fails.length > 10 && <li>e mais {milk.fails.length - 10} (detalhes no log)</li>}
                </ul>
              )}
            </span>
          </div>
        )}
      </Grp>
      <Grp title="Presets ocultos">
        <Row label="Presets ocultos" help="Escondidos por você com “Não mostrar mais”." kw="ocultos restaurar gerenciar">
          <span class="count">{plural(lib.hidden.length, 'preset', 'presets')}</span>
          <button class="btn sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Fechar lista' : 'Gerenciar'}
          </button>
        </Row>
        {open && (
          <div class="hlist" ref={listRef} tabIndex={-1}>
            {lib.hidden.length === 0 ? (
              <p class="lead-empty">Nenhum preset oculto. Use “Não mostrar mais” no menu de um preset para esconder.</p>
            ) : (
              lib.hidden.map((n) => {
                const { title, author } = splitPresetName(n)
                return (
                  <div class="row hrow" key={n} data-search={`${title} ${author}`}>
                    <div class="txt">
                      <div class="nm">{title}</div>
                      {author && <div class="by">por {author}</div>}
                    </div>
                    <div class="ctl">
                      <button
                        class="btn sm"
                        aria-label={`Restaurar ${title}${author ? `, por ${author}` : ''}`}
                        onClick={() => {
                          run('library.restore', { name: n, reason: 'user' })
                          listRef.current?.focus()
                        }}
                      >
                        Restaurar
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </Grp>
      <Grp title="Coleções">
        <Row label="Exportar e importar coleções" help="Arquivo .json com todas as suas coleções." kw="backup json" stack>
          <button class="btn sm" onClick={() => void exportCollections()} disabled={lib.collections.length === 0}>
            <Icon name="download" small />
            Exportar coleções
          </button>
          <button class="btn sm" onClick={() => void importCollections()}>
            <Icon name="upload" small />
            Importar coleções
          </button>
        </Row>
        {io && (
          <p class={io.ok ? 'note ok' : 'note'} role="status">
            <Icon name={io.ok ? 'check' : 'circle-alert'} small />
            {io.text}
          </p>
        )}
      </Grp>
    </>
  )
}

function Atalhos() {
  return (
    <>
      <div class="tbl">
        <table>
          <caption class="vh">Atalhos de teclado</caption>
          <thead>
            <tr>
              <th scope="col">Ação</th>
              <th scope="col">Tecla</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUT_GROUPS.flatMap((g) => g.rows).map((r) => (
              <tr key={r.label} data-search={`${r.label} ${keysText(r.keys)}`}>
                <th scope="row">{r.label}</th>
                <td>
                  <KeyCaps keys={r.keys} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="keys-foot">
        <p class="note">Trocar uma tecla chega numa próxima versão.</p>
        <button class="btn btn-ghost sm" disabled>
          <Icon name="rotate-ccw" small />
          Restaurar padrões
        </button>
      </div>
    </>
  )
}

function Sobre() {
  const [version, setVersion] = useState('')
  useEffect(() => {
    window.so.app.version().then(setVersion, () => setVersion('—'))
  }, [])
  const link = (url: string, text: string) => (
    <a
      class="lnk"
      href={url}
      onClick={(e) => {
        e.preventDefault()
        void window.so.system.openLink(url)
      }}
    >
      {text}
      <Icon name="external-link" small />
    </a>
  )
  return (
    <>
      <Grp title="Aplicativo">
        <Row label="Sonic Obsidian" help="Versão" kw="versão">
          <span class="count num">{version}</span>
        </Row>
        <Row label="Plataforma" help="Electron, para Windows." />
        <Row label="Motor do visual" help="Butterchurn, licença MIT." />
      </Grp>
      <Grp title="Créditos">
        <Row label="MilkDrop" help="Ryan Geiss" />
        <Row label="Butterchurn" help="Jordan Berg e contribuidores" />
        <Row label="Presets" help="Artistas da comunidade MilkDrop, creditados no nome de cada preset." kw="autores" />
        <Row label="Licenças de terceiros" help="THIRD_PARTY_NOTICES.md, ao lado do app." kw="licença notices">
          <button class="btn sm" onClick={() => void window.so.system.openNotices()}>
            Abrir
          </button>
        </Row>
      </Grp>
      <Grp title="Links">
        <Row label="Repositório no GitHub" help={link('https://github.com/atempel/sonic-obsidian', 'github.com/atempel/sonic-obsidian')} kw="github" />
        <Row label="Butterchurn" help={link('https://github.com/jberg/butterchurn', 'github.com/jberg/butterchurn')} kw="github" />
        <Row label="Butterchurn Visualizer" help={link('https://butterchurnviz.com', 'butterchurnviz.com')} />
      </Grp>
    </>
  )
}

// ── Tela ──────────────────────────────────────────────────────
/** "Salvo": aparece 1,5 s depois da última mudança e some 2,2 s depois (protótipo). */
function useSavedIndicator(core: Core, open: boolean): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!open) return
    let show = 0
    let hide = 0
    const off = core.events.on('stateChanged', ({ origin }) => {
      if (origin !== 'ui') return
      window.clearTimeout(show)
      window.clearTimeout(hide)
      setOn(false)
      show = window.setTimeout(() => {
        setOn(true)
        hide = window.setTimeout(() => setOn(false), 2200)
      }, 1500)
    })
    return () => {
      off()
      window.clearTimeout(show)
      window.clearTimeout(hide)
      setOn(false)
    }
  }, [core, open])
  return on
}

export function Settings({ bridge }: { bridge: PalcoBridge }) {
  const { core } = bridge
  const open = core.state.overlay === 'settings'
  const [section, setSection] = useState<SectionId>('geral')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState<SectionId[]>(SECTIONS.map((s) => s.id))
  const root = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const nav = useRef<HTMLUListElement>(null)
  const saved = useSavedIndicator(core, open)
  const run: Run = (name, args) => void core.run(name, args, 'ui')

  // Abre em Geral (ou na seção pedida, como Atalhos pelo painel `?`), sem busca; foco no item do menu.
  useLayoutEffect(() => {
    document.body.classList.toggle('settings-open', open)
    if (!open) return
    setSection((takeSettingsSection() as SectionId | null) ?? 'geral')
    setQuery('')
    window.setTimeout(() => {
      const target = window.innerWidth >= 900 ? nav.current?.querySelector<HTMLElement>('[aria-current="page"]') : search.current
      target?.focus({ preventScroll: true })
    }, 0)
  }, [open])

  // Busca: destaca as linhas que batem e esconde do menu as seções sem resultado.
  useLayoutEffect(() => {
    const host = root.current
    if (!host) return
    const q = norm(query)
    const next: SectionId[] = []
    for (const sec of SECTIONS) {
      const panel = host.querySelector<HTMLElement>(`[data-panel="${sec.id}"]`)
      let hits = 0
      panel?.querySelectorAll<HTMLElement>('[data-search]').forEach((el) => {
        const hit = q !== '' && norm(el.dataset.search ?? '').includes(q)
        el.classList.toggle('hit', hit)
        if (hit) hits++
      })
      if (!q || hits > 0 || norm(sec.label).includes(q)) next.push(sec.id)
    }
    setVisible((prev) => (prev.join() === next.join() ? prev : next))
    if (next.length && !next.includes(section)) setSection(next[0]!)
    else if (q) host.querySelector(`[data-panel="${section}"] .hit`)?.scrollIntoView({ block: 'nearest' })
  })

  useSlideIndicator(nav, '[aria-current="page"]', 'y', [section, visible.join(), open])

  const show = (id: SectionId): void => {
    setSection(id)
    if (content.current) content.current.scrollTop = 0
  }
  const onNavKey = (e: KeyboardEvent): void => {
    const i = visible.indexOf(section)
    const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? visible.length - 1 : null
    if (to === null) return
    e.preventDefault()
    const id = visible[(to + visible.length) % visible.length]!
    show(id)
    window.setTimeout(() => nav.current?.querySelector<HTMLElement>(`[data-sec="${id}"]`)?.focus(), 0)
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (document.activeElement === search.current && query) setQuery('')
      else core.run('ui.close', {}, 'ui')
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      e.stopPropagation()
      search.current?.focus()
      search.current?.select()
    }
  }

  const current = SECTIONS.find((s) => s.id === section)!
  const empty = visible.length === 0
  return (
    <div class="settings" ref={root} aria-hidden={!open} inert={!open} onKeyDown={onKey}>
      <div class="win" role="dialog" aria-modal="true" aria-labelledby="st-title">
        <div class="hd">
          <h1 id="st-title">Configurações</h1>
          <span class={saved ? 'saved on' : 'saved'} role="status">
            {saved && (
              <>
                <Icon name="check" small />
                Salvo
              </>
            )}
          </span>
          <button class="ibtn" aria-label="Fechar" title="Fechar (Esc)" onClick={() => core.run('ui.close', {}, 'ui')}>
            <Icon name="x" />
          </button>
        </div>
        <div class="body">
          <aside class="side">
            <div class={query ? 'search has-val' : 'search'}>
              <Icon name="search" />
              <label class="vh" for="st-search">
                Buscar configuração
              </label>
              <input id="st-search" ref={search} type="search" placeholder="Buscar" autocomplete="off" spellcheck={false} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
              <kbd>Ctrl+F</kbd>
            </div>
            <select class="sel" id="secsel" aria-label="Seção" value={section} onChange={(e) => show((e.target as HTMLSelectElement).value as SectionId)}>
              {SECTIONS.filter((s) => visible.includes(s.id)).map((s) => (
                <option value={s.id} key={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <nav aria-label="Seções">
              <ul id="navlist" ref={nav} onKeyDown={onNavKey}>
                {SECTIONS.map((s) => (
                  <li key={s.id} hidden={!visible.includes(s.id)}>
                    <button data-sec={s.id} aria-current={s.id === section ? 'page' : undefined} tabIndex={s.id === section ? 0 : -1} onClick={() => show(s.id)}>
                      <Icon name={s.icon} />
                      {s.label}
                    </button>
                  </li>
                ))}
                <i class="ind" aria-hidden="true" />
              </ul>
            </nav>
          </aside>
          <main class="content" ref={content} tabIndex={-1}>
            <div class="wrap">
              {empty && (
                <div class="panel">
                  <h2>Nada encontrado</h2>
                  <p class="lead-empty">
                    Nenhuma configuração corresponde a “{query.trim()}”. Tente outro termo, como “fps” ou “atalho”.
                  </p>
                  <button
                    class="btn sm"
                    style="margin-top:16px"
                    onClick={() => {
                      setQuery('')
                      search.current?.focus()
                    }}
                  >
                    Limpar busca
                  </button>
                </div>
              )}
              {SECTIONS.map((s) => (
                <section class="panel" key={s.id} data-panel={s.id} hidden={empty || s.id !== current.id} aria-labelledby={`st-h-${s.id}`}>
                  <h2 id={`st-h-${s.id}`}>{s.label}</h2>
                  <p class="lead">{s.lead}</p>
                  {s.id === 'geral' && <Geral core={core} run={run} />}
                  {s.id === 'captura' && <Captura bridge={bridge} run={run} />}
                  {s.id === 'visual' && <Visual bridge={bridge} run={run} />}
                  {s.id === 'render' && <Render core={core} run={run} />}
                  {s.id === 'desempenho' && <Desempenho core={core} run={run} />}
                  {s.id === 'biblioteca' && <Biblioteca bridge={bridge} run={run} />}
                  {s.id === 'atalhos' && <Atalhos />}
                  {s.id === 'sobre' && <Sobre />}
                </section>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
