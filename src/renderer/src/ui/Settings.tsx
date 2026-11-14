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
  type ToastMode,
  blendTypeLabel
} from '../core/state'
import { Icon, type IconName } from './icons'
import { LANG_NAME, getSystemLang, fmtNum, fmtSeconds, includesText, t, tn, type LanguagePref, type MessageKey } from '../i18n'
import { Meter, type PalcoBridge } from './Overlay'
import { splitPresetName } from './preset-name'
import { AutoGainReadout, dbText, secondsText } from './QuickSettings'
import { importSummary } from '../importer'
import { useSlideIndicator } from './slide-indicator'

/**
 * Configurações (spec 011, PR 2): tela por cima do Palco, com o visual a 25% atrás.
 * Protótipo "Configurações" (1794175739-7509). Abre em Geral (decisão do usuário).
 * Telas, Integrações, outras fontes e as opções da spec 012 ficam para as fases delas.
 * Tudo por comandos do Core: é o mesmo estado dos Ajustes rápidos e das teclas.
 */

type SectionId = 'geral' | 'captura' | 'visual' | 'render' | 'desempenho' | 'biblioteca' | 'atalhos' | 'sobre'
// Rótulos por chave (spec 030): o texto sai de `t()` na hora de desenhar, então a troca de idioma vale na hora.
const SECTIONS: { id: SectionId; label: MessageKey; icon: IconName; lead: MessageKey }[] = [
  { id: 'geral', label: 'settings.section.geral', icon: 'settings-2', lead: 'settings.section.geralLead' },
  { id: 'captura', label: 'settings.section.captura', icon: 'audio-lines', lead: 'settings.section.capturaLead' },
  { id: 'visual', label: 'settings.section.visual', icon: 'sparkles', lead: 'settings.section.visualLead' },
  { id: 'render', label: 'settings.section.render', icon: 'cpu', lead: 'settings.section.renderLead' },
  { id: 'desempenho', label: 'settings.section.desempenho', icon: 'gauge', lead: 'settings.section.desempenhoLead' },
  { id: 'biblioteca', label: 'settings.section.biblioteca', icon: 'library', lead: 'settings.section.bibliotecaLead' },
  { id: 'atalhos', label: 'settings.section.atalhos', icon: 'keyboard', lead: 'settings.section.atalhosLead' },
  { id: 'sobre', label: 'settings.section.sobre', icon: 'info', lead: 'settings.section.sobreLead' }
]

/** Busca sem acento nem caixa, no idioma do app (a vazia não destaca nada). */
const matches = (text: string, q: string): boolean => q !== '' && includesText(text, q)
/** "Fase 5" / "Phase 5": opções que chegam numa fase futura do roadmap. */
const phase = (n: number): string => t('settings.phase', { n })
/** Rótulo de leitor de tela do botão Restaurar de um preset oculto. */
const restoreLabel = (title: string, author: string | null): string => (author ? t('settings.restoreItemBy', { title, author }) : t('settings.restoreItem', { title }))

// ── Primitivas ────────────────────────────────────────────────
interface RowProps {
  id?: string
  label: string
  help?: ComponentChildren
  /** Palavras extras para a busca (nos dois idiomas: não aparecem na tela). */
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

/** Texto com `{key}` no lugar de uma tecla: a tecla vira `<kbd>` (a ordem das palavras muda entre idiomas). */
function withKey(text: string, key: string): ComponentChildren {
  const [before, after = ''] = text.split('{key}')
  return (
    <>
      {before}
      <kbd>{key}</kbd>
      {after}
    </>
  )
}

// ── Seções ────────────────────────────────────────────────────
type Run = (name: string, args: Record<string, unknown>) => void

function Geral({ core, run }: { core: Core; run: Run }) {
  const s = core.state.settings
  const favs = core.state.library.favorites
  const favOptions: [string, string][] = favs.map((n) => {
    const { title, author } = splitPresetName(n)
    return [n, author ? `${title} · ${t('credit.by', { author })}` : title]
  })
  const lang = s.language
  return (
    <>
      <Grp>
        {/* Idioma (spec 030; design 1794607492-78f0, Configurações › Geral): no topo, vale na hora. */}
        <Row
          id="st-lang"
          label={t('settings.general.language')}
          help={lang === 'auto' ? t('settings.general.languageHelpAuto', { lang: LANG_NAME[getSystemLang()] }) : t('settings.general.languageHelp')}
          kw="idioma language english português inglês"
        >
          <Sel<LanguagePref>
            id="st-lang"
            value={lang}
            options={[
              ['auto', t('settings.general.languageAuto')],
              ['en', LANG_NAME.en],
              ['pt-BR', LANG_NAME['pt-BR']]
            ]}
            onChange={(language) => run('app.setLanguage', { language })}
          />
        </Row>
      </Grp>
      <Grp title={t('settings.general.onStart')}>
        <Row label={t('settings.general.openIn')} help={t('settings.general.openInHelp')} phase={phase(5)} kw="rack palco stage">
          <Seg
            name="openIn"
            label={t('settings.general.openIn')}
            value="palco"
            options={[
              ['palco', t('settings.general.openStage')],
              ['rack', t('settings.general.openRack')]
            ]}
            disabled
            onChange={() => {}}
          />
        </Row>
        <Row label={t('settings.general.boot')} help={t('settings.general.bootHelp')} phase={phase(5)} kw="boot startup inicializar">
          <Sw id="st-boot" label={t('settings.general.boot')} checked={false} disabled />
        </Row>
        <Row id="st-full" label={t('settings.general.fullscreen')} help={t('settings.general.fullscreenHelp')} kw="fullscreen tela cheia f11">
          <Sw id="st-full" label={t('settings.general.fullscreen')} checked={s.startFullscreen} onChange={(v) => run('settings.set', { startFullscreen: v })} />
        </Row>
      </Grp>
      <Grp title={t('settings.general.mine')}>
        <Row id="st-author" label={t('settings.general.author')} help={t('settings.general.authorHelp', { me: t('credit.mine.defaultAuthor') })} kw="autor estúdio crédito nome author studio credit name">
          <input
            class="sel sel-w txt"
            id="st-author"
            type="text"
            maxLength={60}
            autocomplete="off"
            spellcheck={false}
            placeholder={t('credit.mine.defaultAuthor')}
            value={s.authorName ?? ''}
            onChange={(e) => run('settings.set', { authorName: (e.target as HTMLInputElement).value })}
          />
        </Row>
      </Grp>
      <Grp title={t('settings.general.startPreset')}>
        <Row id="st-preset" label={t('settings.general.presetOnOpen')} kw="startup inicial">
          <Sel<StartupPreset>
            id="st-preset"
            value={s.startupPreset}
            options={[
              ['last', t('settings.general.preset.last')],
              ['random', t('settings.general.preset.random')],
              ['favorite', t('settings.general.preset.favorite')]
            ]}
            onChange={(v) => {
              const args: Record<string, unknown> = { startupPreset: v }
              // Escolher "Um favorito" sem favorito escolhido pega o primeiro da lista.
              if (v === 'favorite' && !s.startupFavorite && favs[0]) args.startupFavorite = favs[0]
              run('settings.set', args)
            }}
          />
        </Row>
        <Row id="st-fav" label={t('settings.general.favOnOpen')} help={t('settings.general.favOnOpenHelp')}>
          {favOptions.length === 0 ? (
            <span class="phase">{t('settings.general.noFavorites')}</span>
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
  const rate = `${fmtNum(info.sampleRate / 1000, 1)} kHz`
  return (
    <>
      <div class="cap" data-search={`${t('settings.capture.listening')} ${t('settings.capture.level')} ${t('settings.capture.test')} captura saída capture output device dispositivo`}>
        <div class="cap-top">
          <span class="dot" style={capture === 'ok' ? undefined : `background: var(${capture === 'denied' ? '--beat' : '--warn'})`} />
          <div>
            <b>{capture === 'ok' ? t('settings.capture.listening') : capture === 'denied' ? t('settings.capture.denied') : t('settings.capture.connecting')}</b>
            <span>
              {info.device ? `${info.device} · ` : ''}
              <span class="num">{rate}</span>
            </span>
          </div>
        </div>
        <div class="cap-lvl">
          <span>{t('settings.capture.level')}</span>
          <span role="img" aria-label={t('settings.capture.levelLive')}>
            <Meter core={core} />
          </span>
        </div>
        <div class="cap-test">
          <button class="btn sm" disabled={test === 'running' || capture !== 'ok'} onClick={runTest}>
            {t('settings.capture.test')}
          </button>
          <span class={test === 'ok' ? 'testres done' : 'testres'} role="status">
            {test === 'running' && t('settings.capture.testing')}
            {test === 'ok' && (
              <>
                <Icon name="check" small />
                {t('settings.capture.testOk')}
              </>
            )}
            {test === 'none' && t('settings.capture.testNone')}
          </span>
        </div>
      </div>
      <Grp title={t('settings.capture.input')}>
        <Row id="st-device" label={t('settings.capture.device')} help={t('settings.capture.deviceHelp')} phase={phase(3)} kw="device dispositivo">
          <Sel<string> id="st-device" value="default" options={[['default', t('settings.capture.deviceDefault')]]} disabled onChange={() => {}} />
        </Row>
      </Grp>
      <Grp title={t('settings.capture.levelGroup')}>
        <Row
          id="st-autogain"
          label={t('quick.normalize')}
          help={s.autoGain ? t('settings.capture.normalizeHelpOn') : t('settings.capture.normalizeHelpOff')}
          kw="ganho automático agc volume nível normalizar auto gain level normalize"
        >
          {s.autoGain && <AutoGainReadout core={core} />}
          <Sw id="st-autogain" checked={s.autoGain} label={t('quick.normalize')} onChange={(value) => run('audio.autoGain', { value })} />
        </Row>
        <Row id="st-gain" label={t('settings.capture.gain')} help={t('settings.capture.gainHelp')} kw="volume db ganho gain">
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
    <Row id={`st-blend-${target}`} label={label} help={engineOnly ? `${help} ${t('quick.blendEngineOnly')}` : help} kw="blend transição transition corte cut crossfade plasma" stack>
      <Sel<BlendType>
        id={`st-blend-${target}`}
        value={rule.type}
        options={BLEND_TYPES.map((b) => [b, blendTypeLabel(b)])}
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
      <Grp title={t('quick.rotation')}>
        <Row id="st-rot" label={t('quick.autoRotation')} help={t('settings.visual.rotationHelp')} kw="rotação rotation">
          <Sw id="st-rot" label={t('quick.autoRotation')} checked={rot.enabled} onChange={(enabled) => run('rotation.set', { enabled })} />
        </Row>
        <Row id="st-int" label={t('settings.visual.interval')} help={t('settings.visual.intervalHelp')}>
          <Rng id="st-int" value={rot.intervalSeconds} min={5} max={120} step={5} text={fmtSeconds(rot.intervalSeconds)} disabled={!rot.enabled} onInput={(v) => run('rotation.set', { intervalSeconds: v })} />
        </Row>
        <Row label={t('settings.visual.order')}>
          <Seg<'random' | 'collection'>
            name="st-order"
            label={t('settings.visual.order')}
            value={rot.order}
            options={[
              ['random', t('settings.visual.order.random')],
              ['collection', t('settings.visual.order.collection')]
            ]}
            disabled={!rot.enabled || cols.length === 0}
            onChange={(order) => run('rotation.set', order === 'collection' && !rot.collectionId ? { order, collectionId: cols[0]!.id } : { order })}
          />
        </Row>
        <Row id="st-col" label={t('settings.visual.collection')} help={cols.length ? t('settings.visual.collectionHelp') : t('settings.visual.collectionNone')}>
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
      <Grp title={t('settings.visual.transition')}>
        <BlendRow core={core} run={run} target="auto" label={t('quick.blendAuto')} help={t('settings.visual.blendAutoHelp')} available={bridge.blendTypesAvailable} />
        <BlendRow core={core} run={run} target="manual" label={t('quick.blendManual')} help={t('settings.visual.blendManualHelp')} available={bridge.blendTypesAvailable} />
        <Row id="st-beat" label={t('quick.onBeat')} help={t('settings.visual.onBeatHelp')} kw="bpm compasso batida segurar beat bar hold">
          <Sw id="st-beat" label={t('quick.onBeat')} checked={rot.onBeat} onChange={(onBeat) => run('rotation.set', { onBeat })} />
        </Row>
        <Row id="st-lead" label={t('settings.visual.lead')} help={t('settings.visual.leadHelp')} kw="latência latency atraso delay">
          <Rng id="st-lead" value={rot.beatLeadMs} min={0} max={200} step={10} text={`${fmtNum(rot.beatLeadMs)} ms`} disabled={!rot.onBeat} onInput={(v) => run('rotation.set', { beatLeadMs: v })} />
        </Row>
        <Row id="st-bars" label={t('settings.visual.bars')} help={t('settings.visual.barsHelp')} kw="compassos bars">
          <Sel<BeatBars> id="st-bars" value={rot.bars} options={BEAT_BARS.map((b) => [b, tn('quick.bars', b)])} disabled={!rot.onBeat} onChange={(bars) => run('rotation.set', { bars })} />
        </Row>
      </Grp>
      <Grp title={t('quick.text')}>
        <Row id="st-name" label={t('quick.presetName')} help={t('settings.visual.presetNameHelp')} kw="assinatura crédito credit name">
          <Sel<PresetNameMode>
            id="st-name"
            value={text.presetName}
            options={[
              ['always', t('quick.presetName.always')],
              ['manual', t('quick.presetName.manual')],
              ['never', t('quick.presetName.never')]
            ]}
            onChange={(presetName) => run('overlayText.set', { presetName })}
          />
        </Row>
        <Row id="st-track" label={t('quick.trackTitle')} help={t('settings.visual.trackTitleHelp')} kw="soundcloud track faixa">
          <Sw id="st-track" label={t('quick.trackTitle')} checked={text.trackTitle} onChange={(trackTitle) => run('overlayText.set', { trackTitle })} />
        </Row>
        <Row id="st-toasts" label={t('quick.toasts')} help={t('settings.visual.toastsHelp')} kw="toast avisos notifications">
          <Sel<ToastMode>
            id="st-toasts"
            value={text.toasts}
            options={[
              ['all', t('quick.toasts.all')],
              ['important', t('quick.toasts.important')],
              ['none', t('quick.toasts.none')]
            ]}
            onChange={(toasts) => run('overlayText.set', { toasts })}
          />
        </Row>
        <Row
          id="st-clean"
          label={t('quick.clean')}
          help={withKey(t('settings.visual.cleanHelp'), 'T')}
          kw={`${t('settings.visual.cleanHelp')} esconde tudo atalho hide clean t`}
        >
          <Sw id="st-clean" label={t('quick.clean')} checked={text.clean} onChange={(clean) => run('overlayText.set', { clean })} />
        </Row>
        <Row label={t('settings.visual.credit')} help={t('settings.visual.creditHelp')} kw="autor author">
          <Sw id="st-credit" label={t('settings.visual.credit')} checked disabled />
        </Row>
        <p class="note fixed" data-search={t('quick.creditNote')}>
          {t('quick.creditNote')}
        </p>
      </Grp>
    </>
  )
}

function Render({ core, run }: { core: Core; run: Run }) {
  const s = core.state.settings
  const r = s.render
  const par = (t: string) => <span class="num par">{t}</span>
  const fpsOptions: [number | 'monitor', string][] = FPS_LIMITS.map((v) => [v, v === 'monitor' ? t('settings.render.noLimit') : `${v} fps`])
  if (!FPS_LIMITS.includes(s.fpsLimit as 60)) fpsOptions.splice(-1, 0, [s.fpsLimit, `${s.fpsLimit} fps`])
  return (
    <>
      <Grp title={t('settings.render.quality')}>
        <Row id="st-mesh" label={t('settings.render.mesh')} help={<>{t('settings.render.meshHelp')} {par('meshWidth × meshHeight · setInternalMeshSize')}</>} kw={`${t('settings.render.meshHelp')} mesh malha`}>
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
        <Row id="st-pr" label={t('settings.render.pixelRatio')} help={<>{t('settings.render.pixelRatioHelp')} {par('pixelRatio')}</>} kw="pixel ratio dpi">
          <Sel<PixelRatio> id="st-pr" value={r.pixelRatio} options={PIXEL_RATIOS.map((v) => [v, v === 'auto' ? t('settings.render.auto') : `${fmtNum(v)}×`])} onChange={(pixelRatio) => run('render.set', { pixelRatio })} />
        </Row>
        <Row label={t('settings.render.texture')} help={<>{t('settings.render.textureHelp')} {par('textureRatio')}</>} kw="textura texture">
          <Seg<number> name="st-tex" label={t('settings.render.texture')} value={r.textureRatio} options={TEXTURE_RATIOS.map((v) => [v, fmtNum(v)])} onChange={(textureRatio) => run('render.set', { textureRatio })} />
        </Row>
        <Row id="st-fxaa" label={t('settings.render.fxaa')} help={<>{t('settings.render.fxaaHelp')} {par('outputFXAA · setOutputAA')}</>} kw="antialiasing fxaa">
          <Sw id="st-fxaa" label={t('settings.render.fxaa')} checked={r.fxaa} onChange={(fxaa) => run('render.set', { fxaa })} />
        </Row>
      </Grp>
      <Grp title={t('settings.render.frames')}>
        <Row id="st-fps" label={t('settings.render.fps')} help={t('settings.render.fpsHelp')} kw="fps hz">
          <Sel<number | 'monitor'> id="st-fps" value={s.fpsLimit} options={fpsOptions} onChange={(fpsLimit) => run('settings.set', { fpsLimit })} />
        </Row>
        <Row label={t('settings.render.canvas')} help={t('settings.render.canvasHelp')} kw="resolução resolution canvas">
          <Seg<number> name="st-canvas" label={t('settings.render.canvas')} value={r.canvasScale} options={CANVAS_SCALES.map((v) => [v, v === 1 ? t('settings.render.native') : `${fmtNum(v * 100)}%`])} onChange={(canvasScale) => run('render.set', { canvasScale })} />
        </Row>
      </Grp>
      <Grp title={t('settings.render.textures')}>
        <Row id="st-img" label={t('settings.render.images')} help={<>{t('settings.render.imagesHelp')} {par('loadExtraImages')}</>} kw="imagens images">
          <Sw id="st-img" label={t('settings.render.images')} checked={r.extraImages} onChange={(extraImages) => run('render.set', { extraImages })} />
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
      <Grp title={t('settings.perf.protection')}>
        <Row id="st-skip" label={t('settings.perf.skip')} help={t('settings.perf.skipHelp')} kw="lento pesado slow heavy fps">
          <Sw id="st-skip" label={t('settings.perf.skip')} checked={perf.skipSlow} onChange={(skipSlow) => run('perf.set', { skipSlow })} />
        </Row>
        <Row id="st-minfps" label={t('settings.perf.minFps')} help={t('settings.perf.minFpsHelp')} kw="fps">
          <Rng id="st-minfps" value={perf.minFps} min={15} max={60} step={5} text={`${fmtNum(perf.minFps)} fps`} disabled={!perf.skipSlow} onInput={(minFps) => run('perf.set', { minFps })} />
        </Row>
      </Grp>
      <Grp title={t('settings.perf.hidden')}>
        <div class="hlist" ref={listRef} tabIndex={-1}>
          {lib.hiddenPerf.length === 0 ? (
            <p class="help" style="padding:14px 0" data-search={t('settings.perf.hidden')}>
              {t('settings.perf.hiddenNone')}
            </p>
          ) : (
            lib.hiddenPerf.map((n) => {
              const { title, author } = splitPresetName(n)
              const fps = lib.presetFps[n]
              return (
                <div class="row hrow" key={n} data-search={`${title} ${author ?? ''} ${t('settings.perf.hidden')}`}>
                  <div class="txt">
                    <div class="nm">{title}</div>
                    {author && <div class="by">{t('credit.by', { author })}</div>}
                  </div>
                  <div class="ctl">
                    {fps !== undefined && <span class="num count warn">{fmtNum(fps)} fps</span>}
                    <button
                      class="btn sm"
                      aria-label={restoreLabel(title, author)}
                      onClick={() => {
                        run('library.restore', { name: n, reason: 'performance' })
                        listRef.current?.focus()
                      }}
                    >
                      {t('settings.restore')}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Grp>
      <Grp title={t('settings.perf.strip')}>
        <Row id="st-showfps" label={t('settings.perf.showFps')} help={t('settings.perf.showFpsHelp')} kw="fps">
          <Sw id="st-showfps" label={t('settings.perf.showFps')} checked={showFps} onChange={(v) => run('settings.set', { showFps: v })} />
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
      const r = await bridge.importMilk(picked.files, (done, total) => setMilk({ ok: true, text: t('settings.library.importing', { done, total }), fails: [] }))
      r.extra += picked.extra
      for (const n of picked.tooBig) r.failed.push({ name: n.replace(/\.milk$/i, ''), reason: t('settings.library.tooBig') })
      setMilk({ ok: r.failed.length === 0, text: importSummary(r), fails: r.failed.map((f) => `${f.name}: ${f.reason}`) })
    } finally {
      setMilkBusy(false)
    }
  }
  const listRef = useRef<HTMLDivElement>(null)

  const exportCollections = async (): Promise<void> => {
    const n = lib.collections.length
    const res = await window.so.collections.export(JSON.stringify({ version: 1, collections: lib.collections }, null, 2))
    if (res.ok) setIo({ ok: true, text: tn('settings.library.exported', n, { file: res.name ?? t('settings.library.theFile') }) })
    else if (!res.canceled) setIo({ ok: false, text: t('settings.library.saveFailed') })
  }
  const importCollections = async (): Promise<void> => {
    const res = await window.so.collections.import()
    if (res.canceled) return
    const file = res.name ?? t('settings.library.theFile')
    if (!res.ok || res.text === undefined) {
      setIo({ ok: false, text: t('settings.library.openFailed', { file }) })
      return
    }
    let data: unknown
    try {
      data = JSON.parse(res.text)
    } catch {
      data = null
    }
    const r = core.run<number>('collection.import', { data }, 'ui')
    if (r.ok) setIo({ ok: true, text: tn('settings.library.importedFrom', r.value, { file }) })
    else setIo({ ok: false, text: t('settings.library.readFailed', { file }) })
  }

  return (
    <>
      <Grp title={t('settings.library.packs')}>
        <Row label={t('settings.library.base')} help={t('settings.library.baseHelp')} kw="pacote pack presets">
          <span class="count num">{tn('library.presets', bridge.presetCount() - bridge.importedCount())}</span>
        </Row>
        <Row label={t('settings.library.importMilk')} help={t('settings.library.importMilkHelp')} kw="milk arquivos importar importados files import imported">
          {bridge.importedCount() > 0 && <span class="count num">{tn('settings.library.imported', bridge.importedCount())}</span>}
          <button class="btn sm" disabled={milkBusy} onClick={() => void importMilk()}>
            {t('settings.library.chooseFiles')}
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
                  {milk.fails.length > 10 && <li>{t('settings.library.moreFails', { n: milk.fails.length - 10 })}</li>}
                </ul>
              )}
            </span>
          </div>
        )}
      </Grp>
      <Grp title={t('settings.library.hidden')}>
        <Row label={t('settings.library.hidden')} help={t('settings.library.hiddenHelp')} kw="ocultos restaurar gerenciar hidden restore manage">
          <span class="count">{tn('library.presets', lib.hidden.length)}</span>
          <button class="btn sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? t('settings.library.closeList') : t('settings.library.manage')}
          </button>
        </Row>
        {open && (
          <div class="hlist" ref={listRef} tabIndex={-1}>
            {lib.hidden.length === 0 ? (
              <p class="lead-empty">{t('settings.library.hiddenNone')}</p>
            ) : (
              lib.hidden.map((n) => {
                const { title, author } = splitPresetName(n)
                return (
                  <div class="row hrow" key={n} data-search={`${title} ${author ?? ''}`}>
                    <div class="txt">
                      <div class="nm">{title}</div>
                      {author && <div class="by">{t('credit.by', { author })}</div>}
                    </div>
                    <div class="ctl">
                      <button
                        class="btn sm"
                        aria-label={restoreLabel(title, author)}
                        onClick={() => {
                          run('library.restore', { name: n, reason: 'user' })
                          listRef.current?.focus()
                        }}
                      >
                        {t('settings.restore')}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </Grp>
      <Grp title={t('settings.library.collections')}>
        <Row label={t('settings.library.io')} help={t('settings.library.ioHelp')} kw="backup json coleções collections" stack>
          <button class="btn sm" onClick={() => void exportCollections()} disabled={lib.collections.length === 0}>
            <Icon name="download" small />
            {t('settings.library.export')}
          </button>
          <button class="btn sm" onClick={() => void importCollections()}>
            <Icon name="upload" small />
            {t('settings.library.import')}
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
          <caption class="vh">{t('settings.keys.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('settings.keys.action')}</th>
              <th scope="col">{t('settings.keys.key')}</th>
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
        <p class="note">{t('settings.keys.rebindSoon')}</p>
        <button class="btn btn-ghost sm" disabled>
          <Icon name="rotate-ccw" small />
          {t('settings.keys.restoreDefaults')}
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
      <Grp title={t('settings.about.app')}>
        <Row label="Sonic Obsidian" help={t('settings.about.version')} kw="versão version">
          <span class="count num">{version}</span>
        </Row>
        <Row label={t('settings.about.platform')} help={t('settings.about.platformHelp')} />
        <Row label={t('settings.about.engine')} help={t('settings.about.engineHelp')} kw="engine motor" />
      </Grp>
      <Grp title={t('settings.about.credits')}>
        <Row label="MilkDrop" help="Ryan Geiss" />
        <Row label="Butterchurn" help={t('settings.about.butterchurnBy')} />
        <Row label={t('settings.about.presets')} help={t('settings.about.presetsHelp')} kw="autores authors" />
        <Row label={t('settings.about.licenses')} help={t('settings.about.licensesHelp')} kw="licença license notices">
          <button class="btn sm" onClick={() => void window.so.system.openNotices()}>
            {t('settings.about.open')}
          </button>
        </Row>
      </Grp>
      <Grp title={t('settings.about.links')}>
        <Row label={t('settings.about.repo')} help={link('https://github.com/atempel/sonic-obsidian', 'github.com/atempel/sonic-obsidian')} kw="github" />
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
    const q = query.trim()
    const next: SectionId[] = []
    for (const sec of SECTIONS) {
      const panel = host.querySelector<HTMLElement>(`[data-panel="${sec.id}"]`)
      let hits = 0
      panel?.querySelectorAll<HTMLElement>('[data-search]').forEach((el) => {
        const hit = matches(el.dataset.search ?? '', q)
        el.classList.toggle('hit', hit)
        if (hit) hits++
      })
      if (!q || hits > 0 || matches(t(sec.label), q)) next.push(sec.id)
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
          <h1 id="st-title">{t('settings.title')}</h1>
          <span class={saved ? 'saved on' : 'saved'} role="status">
            {saved && (
              <>
                <Icon name="check" small />
                {t('settings.saved')}
              </>
            )}
          </span>
          <button class="ibtn" aria-label={t('settings.close')} title={t('settings.closeTitle')} onClick={() => core.run('ui.close', {}, 'ui')}>
            <Icon name="x" />
          </button>
        </div>
        <div class="body">
          <aside class="side">
            <div class={query ? 'search has-val' : 'search'}>
              <Icon name="search" />
              <label class="vh" for="st-search">
                {t('settings.search')}
              </label>
              <input id="st-search" ref={search} type="search" placeholder={t('settings.searchPlaceholder')} autocomplete="off" spellcheck={false} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
              <kbd>Ctrl+F</kbd>
            </div>
            <select class="sel" id="secsel" aria-label={t('settings.sectionSelect')} value={section} onChange={(e) => show((e.target as HTMLSelectElement).value as SectionId)}>
              {SECTIONS.filter((s) => visible.includes(s.id)).map((s) => (
                <option value={s.id} key={s.id}>
                  {t(s.label)}
                </option>
              ))}
            </select>
            <nav aria-label={t('settings.sections')}>
              <ul id="navlist" ref={nav} onKeyDown={onNavKey}>
                {SECTIONS.map((s) => (
                  <li key={s.id} hidden={!visible.includes(s.id)}>
                    <button data-sec={s.id} aria-current={s.id === section ? 'page' : undefined} tabIndex={s.id === section ? 0 : -1} onClick={() => show(s.id)}>
                      <Icon name={s.icon} />
                      {t(s.label)}
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
                  <h2>{t('settings.noMatch')}</h2>
                  <p class="lead-empty">{t('settings.noMatchHint', { q: query.trim() })}</p>
                  <button
                    class="btn sm"
                    style="margin-top:16px"
                    onClick={() => {
                      setQuery('')
                      search.current?.focus()
                    }}
                  >
                    {t('settings.clearSearch')}
                  </button>
                </div>
              )}
              {SECTIONS.map((s) => (
                <section class="panel" key={s.id} data-panel={s.id} hidden={empty || s.id !== current.id} aria-labelledby={`st-h-${s.id}`}>
                  <h2 id={`st-h-${s.id}`}>{t(s.label)}</h2>
                  <p class="lead">{t(s.lead)}</p>
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
