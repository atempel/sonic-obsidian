import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import {
  BLEND_TYPES,
  BLEND_TYPE_LABEL,
  EXPRESSION_ADAPTATIONS,
  EXPRESSION_ADAPTATION_LABEL,
  EXPRESSION_CURVES,
  EXPRESSION_CURVE_LABEL,
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
  type ToastMode
} from '../core/state'
import { Icon } from './icons'

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
export const secondsText = (s: number): string => `${s.toFixed(1).replace('.', ',')} s`
export const exprLevelText = (l: number): string => (l === 0 ? 'Neutra' : sign(l)) + (l === EXPRESSION_DEFAULT.level ? ' · padrão' : '')
/** Spec 028: a opção padrão leva "· padrão" no nome. */
const withDefault = (name: string, isDefault: boolean): string => (isDefault ? `${name} · padrão` : name)
/** "Contraste — picos…" → ["Contraste", "picos…"]. */
const splitLabel = (label: string): [string, string] => {
  const [head, ...rest] = label.split(' — ')
  const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)
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
      <Select<BlendType> id={`blend-${target}-type`} label={label} value={rule.type} options={BLEND_TYPES.map((t) => [t, BLEND_TYPE_LABEL[t]])} onChange={(type) => set({ type })} />
      {rule.type !== 'cut' && (
        <Slider
          id={`blend-${target}-s`}
          label="Tempo"
          value={rule.seconds}
          min={0.1}
          max={Math.max(max, Math.ceil(rule.seconds))}
          step={0.1}
          text={secondsText(rule.seconds)}
          onInput={(seconds) => set({ seconds })}
        />
      )}
      {engineOnly && <p class="note">Indisponível neste motor: o tipo é sorteado.</p>}
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
  const [, curveHint] = splitLabel(EXPRESSION_CURVE_LABEL[expr.curve])
  const [, memoryHint] = splitLabel(EXPRESSION_ADAPTATION_LABEL[expr.adaptation])

  return (
    <aside class="sheet" ref={ref} tabIndex={-1} aria-label="Ajustes rápidos" aria-hidden={!open} inert={!open}>
      <header>
        <h2>Ajustes rápidos</h2>
        <button class="ibtn" aria-label="Fechar ajustes" title="Fechar (Esc)" onClick={() => core.run('ui.close', {}, 'ui')}>
          <Icon name="x" />
        </button>
      </header>
      <div class="body">
        <section>
          <h3>Sinal</h3>
          <Switch id="autoGain" label="Normalizar áudio" checked={settings.autoGain} onChange={(value) => run('audio.autoGain', { value })}>
            {settings.autoGain && <AutoGainReadout core={core} />}
          </Switch>
          {settings.autoGain ? (
            <Slider id="gain" label="Ajuste fino" value={settings.gainDb} min={-FINE_GAIN_DB} max={FINE_GAIN_DB} step={1} text={dbText(settings.gainDb)} onInput={(gainDb) => run('signal.set', { gainDb })} />
          ) : (
            <Slider id="gain" label="Ganho" value={settings.gainDb} min={GAIN_MIN_DB} max={GAIN_MAX_DB} step={1} text={dbText(settings.gainDb)} onInput={(gainDb) => run('signal.set', { gainDb })} />
          )}
          {settings.autoGain && <p class="note hint">Iguala o volume entre faixas em alguns segundos. O som das caixas não muda.</p>}
        </section>

        <section>
          <h3>Expressividade</h3>
          <Slider
            id="expr"
            label="Nível"
            value={expr.level}
            min={EXPRESSION_MIN}
            max={EXPRESSION_MAX}
            step={1}
            text={exprLevelText(expr.level)}
            onInput={(level) => run('expression.set', { level })}
          />
          <Select
            id="exprCurve"
            label="Caráter"
            value={expr.curve}
            options={EXPRESSION_CURVES.map((c) => [c, withDefault(splitLabel(EXPRESSION_CURVE_LABEL[c])[0], c === EXPRESSION_DEFAULT.curve)])}
            onChange={(curve) => run('expression.set', { curve })}
          />
          <p class="note hint">{expr.level === 0 ? 'Sem efeito no nível 0. Suba o Nível para o Caráter agir.' : curveHint}</p>
          <Select
            id="exprMemory"
            label="Memória"
            value={expr.adaptation}
            options={EXPRESSION_ADAPTATIONS.map((a) => [a, withDefault(splitLabel(EXPRESSION_ADAPTATION_LABEL[a])[0], a === EXPRESSION_DEFAULT.adaptation)])}
            onChange={(adaptation) => run('expression.set', { adaptation })}
          />
          <p class="note hint">{memoryHint}</p>
          <button
            class="btn sheet-link"
            id="exprReset"
            disabled={expr.level === EXPRESSION_DEFAULT.level && expr.curve === EXPRESSION_DEFAULT.curve && expr.adaptation === EXPRESSION_DEFAULT.adaptation}
            onClick={() => run('expression.set', { ...EXPRESSION_DEFAULT })}
          >
            <span>Restaurar padrão</span>
            <span class="soon">Nível 0 · Energia · Curta</span>
          </button>
          {!expressionAvailable && <p class="note">Indisponível neste motor.</p>}
        </section>

        <section>
          <h3>Rotação</h3>
          <Switch id="rotSwitch" label="Rotação automática" checked={rot.enabled} onChange={(enabled) => run('rotation.set', { enabled })} />
          {rot.onBeat ? (
            <Select<BeatBars> id="interval" label="Trocar a cada" value={rot.bars} options={BEAT_BARS.map((b) => [b, `${b} compasso${b > 1 ? 's' : ''}`])} onChange={(bars) => run('rotation.set', { bars })} />
          ) : (
            <Select<number> id="interval" label="Trocar a cada" value={rot.intervalSeconds} options={intervals.map((s) => [s, `${s} s`])} onChange={(intervalSeconds) => run('rotation.set', { intervalSeconds })} />
          )}
          {rot.order === 'collection' && <p class="note">Tocando uma coleção: {rot.onBeat ? 'em compassos; sem batida, vale o intervalo dela.' : 'vale o intervalo dela.'}</p>}
          <Switch id="beatSwitch" label="Trocar no beat" checked={rot.onBeat} onChange={(onBeat) => run('rotation.set', { onBeat })} />
          {rot.onBeat && <p class="note hint">Sem batida estável, troca a cada {core.rotationIntervalSeconds} s. Enter segura o visual.</p>}
        </section>

        <section>
          <h3>Transições</h3>
          <BlendControl core={core} target="manual" label="Quando você troca" available={blendTypesAvailable} />
          <BlendControl core={core} target="auto" label="Na troca automática" available={blendTypesAvailable} />
        </section>

        <section>
          <h3>Texto sobre o visual</h3>
          <Select<PresetNameMode>
            id="otPreset"
            label="Nome do preset"
            value={text.presetName}
            options={[
              ['always', 'Sempre'],
              ['manual', 'Só quando eu troco'],
              ['never', 'Nunca']
            ]}
            onChange={(presetName) => run('overlayText.set', { presetName })}
          />
          <Switch id="otTrack" label="Título da faixa" checked={text.trackTitle} onChange={(trackTitle) => run('overlayText.set', { trackTitle })} />
          <Select<ToastMode>
            id="otToasts"
            label="Avisos"
            value={text.toasts}
            options={[
              ['all', 'Todos'],
              ['important', 'Só importantes'],
              ['none', 'Nenhum']
            ]}
            onChange={(toasts) => run('overlayText.set', { toasts })}
          />
          <Switch id="otClean" label="Modo limpo" checked={text.clean} onChange={(clean) => run('overlayText.set', { clean })}>
            <kbd>T</kbd>
          </Switch>
          <p class="note">O crédito do autor continua na faixa de controle e na Biblioteca.</p>
        </section>

        <section>
          <button class="btn sheet-link" onClick={() => core.run('ui.open', { overlay: 'settings' }, 'ui')}>
            <span>
              <Icon name="settings" />
              Todas as configurações
            </span>
            <kbd>Ctrl+,</kbd>
          </button>
        </section>
      </div>
    </aside>
  )
}
