import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import {
  BLEND_TYPES,
  EXPRESSION_ADAPTATIONS,
  EXPRESSION_CURVES,
  EXPRESSION_DEFAULT,
  EXPRESSION_MAX,
  EXPRESSION_MIN,
  FINE_GAIN_DB,
  GAIN_MAX_DB,
  GAIN_MIN_DB,
  ROTATION_STEPS_S,
  BEAT_BARS,
  type BeatBars,
  type BlendType,
  type PresetNameMode,
  type ToastMode,
  blendTypeLabel,
  expressionAdaptationLabel,
  expressionCurveLabel
} from '../core/state'
import { Icon } from './icons'
import { fmtFixed, fmtNum, fmtSeconds, t, tn } from '../i18n'

/**
 * Ajustes rápidos (spec 011, PR 1): painel à direita com o que se mexe com a
 * música tocando. Protótipo "Palco integrado" 1794175739-7509, painel `#sheet`.
 * Tudo por comandos do Core; o estado salvo é o mesmo das teclas.
 * Microinterações: M14 (switch, via `.pr` em Overlay) e M15 (balão do slider).
 */

/** Blend nos Ajustes vai até 5 s (as Configurações até 10); acima disso, o slider estica para mostrar o valor. */
const QUICK_BLEND_MAX_S = 5

const sign = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')
export const dbText = (db: number): string => `${sign(db)} dB`
export const secondsText = (s: number): string => `${fmtFixed(s, 1)} s`
export const exprLevelText = (l: number): string => (l === 0 ? t('quick.levelNeutral') : sign(l)) + (l === EXPRESSION_DEFAULT.level ? t('quick.default') : '')
/** Spec 028: a opção padrão leva "· padrão" no nome. */
const withDefault = (name: string, isDefault: boolean): string => (isDefault ? `${name}${t('quick.default')}` : name)
/** "Contraste — picos…" → ["Contraste", "picos…"]. */
const splitLabel = (label: string): [string, string] => {
  const [head, ...rest] = label.split(' — ')
  const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
  return [cap(head!), cap(rest.join(' — '))]
}

// ── Slider com leitura (M15) ──────────────────────────────────
export interface SliderProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  text: string
  onInput: (v: number) => void
}

export function Slider({ id, label, value, min, max, step, text, onInput }: SliderProps) {
  const [bubble, setBubble] = useState(false)
  const drag = useRef(false)
  const keyTimer = useRef<number | undefined>(undefined)
  const pct = ((value - min) / (max - min)) * 100
  useLayoutEffect(() => {
    const up = (): void => {
      if (drag.current) ((drag.current = false), setBubble(false))
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.clearTimeout(keyTimer.current)
    }
  }, [])
  const onKeyDown = (e: KeyboardEvent): void => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) return
    setBubble(true)
    window.clearTimeout(keyTimer.current)
    keyTimer.current = window.setTimeout(() => !drag.current && setBubble(false), 600)
  }
  return (
    <div class="field">
      <div class="field-top">
        <label for={id}>{label}</label>
        <span class="val num">{text}</span>
      </div>
      <div class="range">
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          style={`--fill: ${pct}%`}
          aria-valuetext={text}
          onPointerDown={() => ((drag.current = true), setBubble(true))}
          onKeyDown={onKeyDown}
          onBlur={() => !drag.current && setBubble(false)}
          onInput={(e) => onInput(Number((e.target as HTMLInputElement).value))}
        />
        <span class={bubble ? 'sbub on' : 'sbub'} style={{ left: `calc(7px + (100% - 14px) * ${pct / 100})` }} aria-hidden="true">
          <span class="b num">{text}</span>
        </span>
      </div>
    </div>
  )
}

// ── Normalizar áudio (spec 028, P1) ───────────────────────────
/** "auto +5 dB": o ganho automático em vigor, ao vivo (evento fora do store). */
export function AutoGainReadout({ core }: { core: Core }) {
  const [db, setDb] = useState(core.state.autoGainDb)
  useEffect(() => core.events.on('autoGainTick', (e) => setDb(e.db)), [core])
  const r = Math.round(db)
  return <span class="num autodb">auto {r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : '0'} dB</span>
}

// ── Peças pequenas ────────────────────────────────────────────
export function Switch({ id, label, checked, disabled, onChange, children }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; children?: preact.ComponentChildren }) {
  return (
    <div class="line">
      <span id={`${id}Lbl`}>
        {label}
        {children}
      </span>
      <label class="switch">
        <input type="checkbox" id={id} checked={checked} disabled={disabled} aria-labelledby={`${id}Lbl`} onChange={(e) => onChange?.((e.target as HTMLInputElement).checked)} />
        <span class="track" />
      </label>
    </div>
  )
}

export function Select<T extends string | number>({ id, label, value, options, onChange }: { id: string; label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div class="line">
      <label for={id}>{label}</label>
      <select
        class="sel"
        id={id}
        value={String(value)}
        onChange={(e) => {
          const raw = (e.target as HTMLSelectElement).value
          onChange((typeof value === 'number' ? Number(raw) : raw) as T)
        }}
      >
        {options.map(([v, text]) => (
          <option value={String(v)} key={String(v)}>
            {text}
          </option>
        ))}
      </select>
    </div>
  )
}

export function BlendControl({ core, target, label, available, max = QUICK_BLEND_MAX_S }: { core: Core; target: 'manual' | 'auto'; label: string; available: boolean; max?: number }) {
  const rule = core.state.settings.blend[target]
  const set = (args: Record<string, unknown>): void => void core.run('blend.set', { target, ...args }, 'ui')
  const engineOnly = !available && rule.type !== 'cut' && rule.type !== 'random'
  return (
    <div class="group">
      <Select<BlendType> id={`blend-${target}-type`} label={label} value={rule.type} options={BLEND_TYPES.map((b) => [b, blendTypeLabel(b)])} onChange={(type) => set({ type })} />
      {rule.type !== 'cut' && (
        <Slider
          id={`blend-${target}-s`}
          label={t('quick.blendDuration')}
          value={rule.seconds}
          min={0.1}
          max={Math.max(max, Math.ceil(rule.seconds))}
          step={0.1}
          text={secondsText(rule.seconds)}
          onInput={(seconds) => set({ seconds })}
        />
      )}
      {engineOnly && <p class="note">{t('quick.blendEngineOnly')}</p>}
    </div>
  )
}

// ── Painel ────────────────────────────────────────────────────
export interface QuickSettingsProps {
  core: Core
  blendTypesAvailable: boolean
  expressionAvailable: boolean
}

export function QuickSettings({ core, blendTypesAvailable, expressionAvailable }: QuickSettingsProps) {
  const open = core.state.overlay === 'quick'
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    document.body.classList.toggle('sheet-open', open)
    // Abrir leva o foco ao painel (Tab percorre os controles); fechar o devolve ao visual (Overlay).
    if (open) ref.current?.focus({ preventScroll: true })
  }, [open])
  const { settings } = core.state
  const run = (name: string, args: Record<string, unknown>): void => void core.run(name, args, 'ui')
  const rot = settings.rotation
  const intervals = ROTATION_STEPS_S.includes(rot.intervalSeconds) ? ROTATION_STEPS_S : [...ROTATION_STEPS_S, rot.intervalSeconds].sort((a, b) => a - b)
  const expr = settings.expression
  const text = settings.overlayText
  const [, curveHint] = splitLabel(expressionCurveLabel(expr.curve))
  const [, memoryHint] = splitLabel(expressionAdaptationLabel(expr.adaptation))

  return (
    <aside class="sheet" ref={ref} tabIndex={-1} aria-label={t('quick.title')} aria-hidden={!open} inert={!open}>
      <header>
        <h2>{t('quick.title')}</h2>
        <button class="ibtn" aria-label={t('quick.close')} title={t('quick.closeTitle')} onClick={() => core.run('ui.close', {}, 'ui')}>
          <Icon name="x" />
        </button>
      </header>
      <div class="body">
        <section>
          <h3>{t('quick.signal')}</h3>
          <Switch id="autoGain" label={t('quick.normalize')} checked={settings.autoGain} onChange={(value) => run('audio.autoGain', { value })}>
            {settings.autoGain && <AutoGainReadout core={core} />}
          </Switch>
          {settings.autoGain ? (
            <Slider id="gain" label={t('quick.fineAdjust')} value={settings.gainDb} min={-FINE_GAIN_DB} max={FINE_GAIN_DB} step={1} text={dbText(settings.gainDb)} onInput={(gainDb) => run('signal.set', { gainDb })} />
          ) : (
            <Slider id="gain" label={t('quick.gain')} value={settings.gainDb} min={GAIN_MIN_DB} max={GAIN_MAX_DB} step={1} text={dbText(settings.gainDb)} onInput={(gainDb) => run('signal.set', { gainDb })} />
          )}
          {settings.autoGain && <p class="note hint">{t('quick.normalizeNote')}</p>}
        </section>

        <section>
          <h3>{t('quick.expression')}</h3>
          <Slider
            id="expr"
            label={t('quick.level')}
            value={expr.level}
            min={EXPRESSION_MIN}
            max={EXPRESSION_MAX}
            step={1}
            text={exprLevelText(expr.level)}
            onInput={(level) => run('expression.set', { level })}
          />
          <Select
            id="exprCurve"
            label={t('quick.character')}
            value={expr.curve}
            options={EXPRESSION_CURVES.map((c) => [c, withDefault(splitLabel(expressionCurveLabel(c))[0], c === EXPRESSION_DEFAULT.curve)])}
            onChange={(curve) => run('expression.set', { curve })}
          />
          <p class="note hint">{expr.level === 0 ? t('quick.noEffect') : curveHint}</p>
          <Select
            id="exprMemory"
            label={t('quick.memory')}
            value={expr.adaptation}
            options={EXPRESSION_ADAPTATIONS.map((a) => [a, withDefault(splitLabel(expressionAdaptationLabel(a))[0], a === EXPRESSION_DEFAULT.adaptation)])}
            onChange={(adaptation) => run('expression.set', { adaptation })}
          />
          <p class="note hint">{memoryHint}</p>
          <button
            class="btn sheet-link"
            id="exprReset"
            disabled={expr.level === EXPRESSION_DEFAULT.level && expr.curve === EXPRESSION_DEFAULT.curve && expr.adaptation === EXPRESSION_DEFAULT.adaptation}
            onClick={() => run('expression.set', { ...EXPRESSION_DEFAULT })}
          >
            <span>{t('quick.restoreDefault')}</span>
            <span class="soon">{t('quick.restoreDefaultValues')}</span>
          </button>
          {!expressionAvailable && <p class="note">{t('quick.unavailable')}</p>}
        </section>

        <section>
          <h3>{t('quick.rotation')}</h3>
          <Switch id="rotSwitch" label={t('quick.autoRotation')} checked={rot.enabled} onChange={(enabled) => run('rotation.set', { enabled })} />
          {rot.onBeat ? (
            <Select<BeatBars> id="interval" label={t('quick.switchEvery')} value={rot.bars} options={BEAT_BARS.map((b) => [b, tn('quick.bars', b)])} onChange={(bars) => run('rotation.set', { bars })} />
          ) : (
            <Select<number> id="interval" label={t('quick.switchEvery')} value={rot.intervalSeconds} options={intervals.map((s) => [s, `${fmtNum(s)} s`])} onChange={(intervalSeconds) => run('rotation.set', { intervalSeconds })} />
          )}
          {rot.order === 'collection' && <p class="note">{rot.onBeat ? t('quick.collectionBars') : t('quick.collectionInterval')}</p>}
          <Switch id="beatSwitch" label={t('quick.onBeat')} checked={rot.onBeat} onChange={(onBeat) => run('rotation.set', { onBeat })} />
          {rot.onBeat && <p class="note hint">{t('quick.onBeatNote', { s: fmtSeconds(core.rotationIntervalSeconds) })}</p>}
        </section>

        <section>
          <h3>{t('quick.transitions')}</h3>
          <BlendControl core={core} target="manual" label={t('quick.blendManual')} available={blendTypesAvailable} />
          <BlendControl core={core} target="auto" label={t('quick.blendAuto')} available={blendTypesAvailable} />
        </section>

        <section>
          <h3>{t('quick.text')}</h3>
          <Select<PresetNameMode>
            id="otPreset"
            label={t('quick.presetName')}
            value={text.presetName}
            options={[
              ['always', t('quick.presetName.always')],
              ['manual', t('quick.presetName.manual')],
              ['never', t('quick.presetName.never')]
            ]}
            onChange={(presetName) => run('overlayText.set', { presetName })}
          />
          <Switch id="otTrack" label={t('quick.trackTitle')} checked={text.trackTitle} onChange={(trackTitle) => run('overlayText.set', { trackTitle })} />
          <Select<ToastMode>
            id="otToasts"
            label={t('quick.toasts')}
            value={text.toasts}
            options={[
              ['all', t('quick.toasts.all')],
              ['important', t('quick.toasts.important')],
              ['none', t('quick.toasts.none')]
            ]}
            onChange={(toasts) => run('overlayText.set', { toasts })}
          />
          <Switch id="otClean" label={t('quick.clean')} checked={text.clean} onChange={(clean) => run('overlayText.set', { clean })}>
            <kbd>T</kbd>
          </Switch>
          <p class="note">{t('quick.creditNote')}</p>
        </section>

        <section>
          <button class="btn sheet-link" onClick={() => core.run('ui.open', { overlay: 'settings' }, 'ui')}>
            <span>
              <Icon name="settings" />
              {t('quick.allSettings')}
            </span>
            <kbd>Ctrl+,</kbd>
          </button>
        </section>
      </div>
    </aside>
  )
}
