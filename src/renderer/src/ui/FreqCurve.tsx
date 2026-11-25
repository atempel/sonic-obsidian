import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Core } from '../core/commands'
import { CURVE_BANDS, CURVE_DB_MAX, CURVE_DB_MIN, CURVE_PRESETS, clampDb, isFlat, type CurvePreset, type CurvePresetId } from '../freq-curve'
import { curveLive } from '../curve-live'
import { fmtNum, includesText, t } from '../i18n'
import { curvePresetLabel } from '../core/state'
export { curvePresetLabel }
import { showToast } from './toast'

/**
 * Curva por frequência (spec 040): o segmentado de predefinições, o EQ de 16 barras e a linha
 * "Com a memória Fixa…". Protótipo "Palco integrado" (`createEQ`, `#eqSeg`, `#eqWarn`) e
 * "Configurações" (EQ de 160 px com escala), versão 1794680346-fb12.
 */

const N = CURVE_BANDS.length
/** Zonas do motor (fato técnico, spec 040): o desenho usa os cortes dele, não os 250 Hz/4 kHz do design. */
const ZONE_EDGES_HZ = [320, 2800]
/** "0 dB", "+4 dB", "−3 dB". */
export const dbBandText = (v: number): string => (v === 0 ? '0 dB' : `${v > 0 ? '+' : '−'}${Math.abs(v)} dB`)
/** "80 Hz", "31,5 Hz", "1,25 kHz". */
export const hzText = (hz: number): string => (hz >= 1000 ? `${fmtNum(hz / 1000)} kHz` : `${fmtNum(hz)} Hz`)
/** Rótulo curto embaixo do EQ grande: "31,5", "1,25k", "20k". */
const shortHz = (hz: number): string => (hz >= 1000 ? `${fmtNum(hz / 1000)}k` : fmtNum(hz))

/** Escolhe uma predefinição (aviso "Curva: Graves"). */
export function applyCurvePreset(core: Core, id: CurvePresetId, toast = true): void {
  void core.run('expression.set', { curvePreset: id }, 'ui')
  if (toast) showToast(t('toast.curve', { label: curvePresetLabel(id) }))
}

// ── Busca rápida: "Curva por frequência: <predefinição>" ─────
export interface CurveCommand {
  key: string
  text: string
  keys: string[]
  icon: 'activity'
  run: () => void
}
export function matchCurveCommands(core: Core, q: string, available: boolean): CurveCommand[] {
  if (!q.trim() || !available) return []
  return CURVE_PRESETS.map((id) => ({
    key: `curve:${id}`,
    text: t('curve.cmd', { label: curvePresetLabel(id) }),
    keys: [] as string[],
    icon: 'activity' as const,
    run: () => applyCurvePreset(core, id)
  })).filter((c) => includesText(c.text, q.trim()))
}

// ── Segmentado (Ajustes rápidos) ──────────────────────────────
/** Plana · Graves · Médios · Agudos · Sorriso (+ Personalizada depois de uma edição à mão). */
export function CurveSegmented({ core, id }: { core: Core; id: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const value = core.state.settings.expression.curvePreset
  const custom = value === 'custom'
  const ids: CurvePreset[] = custom ? [...CURVE_PRESETS, 'custom'] : [...CURVE_PRESETS]
  const onKeyDown = (e: KeyboardEvent): void => {
    const n = CURVE_PRESETS.length
    const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key]
    let i = CURVE_PRESETS.indexOf(value as CurvePresetId)
    if (step) i = i < 0 ? (step > 0 ? 0 : n - 1) : (i + step + n) % n
    else if (e.key === 'Home') i = 0
    else if (e.key === 'End') i = n - 1
    else return
    e.preventDefault()
    e.stopPropagation()
    applyCurvePreset(core, CURVE_PRESETS[i]!)
    ref.current?.querySelector<HTMLButtonElement>(`button[data-v="${CURVE_PRESETS[i]}"]`)?.focus()
  }
  return (
    <div class={custom ? 'seg seg-eq has-custom' : 'seg seg-eq'} id={id} ref={ref} role="radiogroup" aria-labelledby={`${id}Lbl`} onKeyDown={onKeyDown}>
      {ids.map((v) => (
        <button
          type="button"
          role="radio"
          key={v}
          data-v={v}
          class={v === 'flat' ? 'def' : undefined}
          aria-checked={v === value}
          tabIndex={v === value ? 0 : -1}
          onClick={() => v !== 'custom' && applyCurvePreset(core, v)}
        >
          {curvePresetLabel(v)}
          {v === 'flat' && <span class="vh">{t('quick.defaultSr')}</span>}
        </button>
      ))}
    </div>
  )
}

// ── Linha da Fixa ─────────────────────────────────────────────
/** Memória fora de Fixa e curva fora do plano: "Com a memória Fixa, a curva age por inteiro." + Usar Fixa. */
export function CurveFixedHint({ core, id }: { core: Core; id: string }) {
  const ex = core.state.settings.expression
  if (ex.adaptation === 'locked' || isFlat(ex.curve16)) return null
  return (
    <div class="eq-warn" id={id}>
      <span>{t('curve.fixedHint')}</span>
      <button
        type="button"
        class="btn"
        id={`${id}Btn`}
        onClick={() => {
          void core.run('expression.set', { adaptation: 'locked' }, 'ui')
          // O botão some: o foco vai para o EQ em vez de se perder.
          document.getElementById(id.replace(/Warn$/, 'Plot'))?.focus()
        }}
      >
        {t('curve.useFixed')}
      </button>
    </div>
  )
}

// ── O EQ ──────────────────────────────────────────────────────
interface EqProps {
  core: Core
  /** Prefixo dos ids (`eq` nos Ajustes rápidos, `st-eq` nas Configurações). */
  id: string
  /** Altura do gráfico (px): 96 nos Ajustes, 160 nas Configurações. */
  height: number
  /** Escala em dB à esquerda (px de margem); 0 = sem escala. */
  gutter?: number
  barW?: number
  /** Rótulos de frequência: `sparse` (5, Ajustes) ou `full` (todos com espaço; metade sem). */
  labels: 'sparse' | 'full'
  /** Desenha e lê o espectro só enquanto visível. */
  active: boolean
}

const SPARSE_LABELS: [number, string][] = [
  [2, '50'],
  [5, '200'],
  [8, '800'],
  [11, '3k'],
  [14, '12k']
]
const PT = 8
const PB = 8
/** Colunas do espectro ao vivo e o piso/teto em dB do analisador (`getFloatFrequencyData`). */
const SPEC_COLS = 48
const SPEC_FLOOR_DB = -90
const SPEC_RANGE_DB = 65

/** Posição fracionária (0 = centro da 1ª banda) de uma frequência, sobre log(f). */
function bandPos(hz: number): number {
  const lf = Math.log(hz)
  if (hz <= CURVE_BANDS[0]) return (lf - Math.log(CURVE_BANDS[0])) / (Math.log(CURVE_BANDS[1]) - Math.log(CURVE_BANDS[0]))
  for (let i = 0; i < N - 1; i++) {
    const a = Math.log(CURVE_BANDS[i]!)
    const b = Math.log(CURVE_BANDS[i + 1]!)
    if (lf <= b) return i + (lf - a) / (b - a)
  }
  const a = Math.log(CURVE_BANDS[N - 2]!)
  const b = Math.log(CURVE_BANDS[N - 1]!)
  return N - 1 + (lf - b) / (b - a)
}
/** Frequência numa posição fracionária (inverso de `bandPos`). */
function posHz(p: number): number {
  const i = Math.max(0, Math.min(N - 2, Math.floor(p)))
  const a = Math.log(CURVE_BANDS[i]!)
  const b = Math.log(CURVE_BANDS[i + 1]!)
  return Math.exp(a + (b - a) * (p - i))
}

export function CurveEq({ core, id, height: H, gutter: G = 0, barW: BW = 3, labels, active }: EqProps) {
  const cv = useRef<HTMLCanvasElement>(null)
  const bub = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState(-1)
  const [focused, setFocused] = useState(false)
  const [bubble, setBubble] = useState<{ band: number; keep: boolean } | null>(null)
  const [live, setLive] = useState('')
  const [width, setWidth] = useState(0)
  const drag = useRef<{ last: { b: number; v: number } | null } | null>(null)
  const curveRef = useRef<number[]>(core.state.settings.expression.curve16)
  const spec = useRef(new Float32Array(SPEC_COLS))
  const st = useRef({ sel, focused })
  st.current = { sel, focused }
  const curve = core.state.settings.expression.curve16
  curveRef.current = curve
  const PH = H - PT - PB
  const Y = (v: number): number => PT + ((CURVE_DB_MAX - v) / (CURVE_DB_MAX - CURVE_DB_MIN)) * PH

  const draw = (): void => {
    const c = cv.current
    if (!c) return
    const w = c.clientWidth
    if (!w) return
    const dpr = window.devicePixelRatio || 1
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(w * dpr)
      c.height = Math.round(H * dpr)
    }
    const ctx = c.getContext('2d')
    if (!ctx) return
    const cs = getComputedStyle(document.documentElement)
    const col = (n: string): string => cs.getPropertyValue(n).trim()
    const cur = curveRef.current
    const slot = (w - G) / N
    const y0 = Y(0)
    const xAt = (p: number): number => G + (p + 0.5) * slot
    const { sel: s, focused: f } = st.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, H)
    // Zonas do motor atrás das barras, com o nome do valor do preset.
    ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace"
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    const edges = [G, ...ZONE_EDGES_HZ.map((hz) => xAt(bandPos(hz))), w]
    ;['bass', 'mid', 'treb'].forEach((name, k) => {
      const x0 = edges[k]!
      const x1 = edges[k + 1]!
      if (k !== 1) {
        ctx.fillStyle = 'rgba(238,238,245,0.035)'
        ctx.fillRect(x0, 0, x1 - x0, H)
      }
      if (k > 0) {
        ctx.fillStyle = col('--line-2')
        ctx.fillRect(Math.round(x0), 0, 1, H)
      }
      ctx.fillStyle = col('--text-3')
      ctx.fillText(name, x0 + 6, 15)
    })
    // Escala em dB (Configurações).
    if (G) {
      ctx.fillStyle = col('--line-1')
      for (const v of [6, -6]) ctx.fillRect(G, Math.round(Y(v)), w - G, 1)
      ctx.fillStyle = col('--text-3')
      ctx.textAlign = 'right'
      for (const [v, s2] of [
        [12, '+12'],
        [0, '0'],
        [-12, '−12']
      ] as [number, string][])
        ctx.fillText(s2, G - 8, Y(v) + (v === 12 ? 10 : v === -12 ? -1 : 4))
      ctx.textAlign = 'left'
    }
    // Espectro ao vivo (analisador próprio), em text-3.
    const probe = curveLive.probe
    const sp = spec.current
    if (probe && probe.spectrum.length && probe.spectrumBinHz > 0) {
      const mags = probe.spectrum
      for (let i = 0; i < SPEC_COLS; i++) {
        const pa = (i / SPEC_COLS) * N - 0.5
        const pb = ((i + 1) / SPEC_COLS) * N - 0.5
        const ka = Math.max(1, Math.floor(posHz(pa) / probe.spectrumBinHz))
        const kb = Math.min(mags.length - 1, Math.max(ka, Math.floor(posHz(pb) / probe.spectrumBinHz)))
        let sum = 0
        for (let k = ka; k <= kb; k++) sum += mags[k]! * mags[k]!
        const db = 10 * Math.log10(sum / (kb - ka + 1) + 1e-12)
        const a = Math.max(0, Math.min(1, (db - SPEC_FLOOR_DB) / SPEC_RANGE_DB))
        // Sobe na hora, desce devagar (o espectro de um quadro pisca demais).
        sp[i] = a > sp[i]! ? a : sp[i]! * 0.85 + a * 0.15
      }
    } else sp.fill(0)
    ctx.fillStyle = col('--text-3')
    ctx.globalAlpha = 0.35
    for (let i = 0; i < SPEC_COLS; i++) {
      const a = sp[i]!
      if (a < 0.01) continue
      const xa = G + (i / SPEC_COLS) * (w - G)
      const xb = G + ((i + 1) / SPEC_COLS) * (w - G)
      ctx.fillRect(xa + 0.5, H - PB - a * PH * 0.9, Math.max(1, xb - xa - 1), a * PH * 0.9)
    }
    ctx.globalAlpha = 1
    // Linha de 0 dB.
    ctx.fillStyle = col('--line-3')
    ctx.fillRect(G, Math.round(y0), w - G, 1)
    const hot = s >= 0 && (f || !!drag.current)
    if (hot) {
      ctx.fillStyle = col('--violet-soft')
      ctx.fillRect(G + s * slot, 0, slot, H)
    }
    // Barras finas e a curva em violeta.
    ctx.fillStyle = col('--violet')
    ctx.globalAlpha = 0.55
    for (let i = 0; i < N; i++) {
      const yy = Y(cur[i]!)
      ctx.fillRect(Math.round(xAt(i) - BW / 2), Math.min(y0, yy), BW, Math.abs(yy - y0))
    }
    ctx.globalAlpha = 1
    ctx.strokeStyle = col('--violet')
    ctx.lineWidth = 1.75
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i < N; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, xAt(i), Y(cur[i]!))
    ctx.stroke()
    for (let i = 0; i < N; i++) {
      const on = hot && i === s
      ctx.beginPath()
      ctx.arc(xAt(i), Y(cur[i]!), on ? 4.5 : 2.5, 0, Math.PI * 2)
      ctx.fillStyle = on ? col('--text-1') : col('--violet')
      ctx.fill()
      if (on) {
        ctx.lineWidth = 2
        ctx.strokeStyle = col('--violet')
        ctx.stroke()
      }
    }
  }

  // Laço de desenho só com o EQ visível; o espectro é lido do analisador só então (curveLive.want).
  useEffect(() => {
    if (!active) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    curveLive.want++
    let raf = 0
    let timer = 0
    const loop = (): void => {
      draw()
      raf = requestAnimationFrame(loop)
    }
    // Movimento reduzido: o espectro muda 4× por segundo, sem animação contínua.
    if (reduce.matches) timer = window.setInterval(draw, 250)
    else raf = requestAnimationFrame(loop)
    return () => {
      curveLive.want--
      cancelAnimationFrame(raf)
      window.clearInterval(timer)
    }
  }, [active])
  useLayoutEffect(draw)
  useLayoutEffect(() => {
    const c = cv.current
    if (!c) return
    const ro = new ResizeObserver(() => setWidth(c.clientWidth))
    ro.observe(c)
    return () => ro.disconnect()
  }, [])

  const setBand = (b: number, v: number): void => {
    const next = [...curveRef.current]
    if (next[b] === v) return
    next[b] = v
    curveRef.current = next
    void core.run('expression.set', { curve16: next }, 'ui')
  }
  const setBands = (pairs: [number, number][]): void => {
    const next = [...curveRef.current]
    let changed = false
    for (const [b, v] of pairs) {
      if (next[b] !== v) ((next[b] = v), (changed = true))
    }
    if (!changed) return
    curveRef.current = next
    void core.run('expression.set', { curve16: next }, 'ui')
  }
  const announce = (b: number): void => setLive(`${hzText(CURVE_BANDS[b]!)}, ${dbBandText(curveRef.current[b]!)}`)
  const at = (e: PointerEvent | MouseEvent): { b: number; v: number } => {
    const r = cv.current!.getBoundingClientRect()
    return {
      b: Math.max(0, Math.min(N - 1, Math.floor((e.clientX - r.left - G) / ((r.width - G) / N)))),
      v: clampDb(CURVE_DB_MAX - ((e.clientY - r.top - PT) / PH) * (CURVE_DB_MAX - CURVE_DB_MIN))
    }
  }
  const apply = (p: { b: number; v: number }): void => {
    const last = drag.current?.last
    // Arrasto rápido que pula barras: as do meio seguem a reta entre os dois pontos.
    if (last && last.b !== p.b) {
      const pairs: [number, number][] = []
      const dir = p.b > last.b ? 1 : -1
      for (let k = last.b + dir; ; k += dir) {
        pairs.push([k, Math.round(last.v + (p.v - last.v) * ((k - last.b) / (p.b - last.b)))])
        if (k === p.b) break
      }
      setBands(pairs)
    } else setBand(p.b, p.v)
    if (drag.current) drag.current.last = p
    setSel(p.b)
    setBubble({ band: p.b, keep: false })
  }
  useEffect(() => {
    if (!bubble?.keep) return
    const timer = window.setTimeout(() => setBubble(null), 600)
    return () => window.clearTimeout(timer)
  }, [bubble])

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    e.preventDefault()
    drag.current = { last: null }
    try {
      cv.current?.setPointerCapture(e.pointerId)
    } catch {
      /* sem captura: o arrasto segue enquanto o ponteiro estiver em cima */
    }
    document.getElementById(`${id}Plot`)?.focus({ preventScroll: true })
    apply(at(e))
  }
  const onPointerMove = (e: PointerEvent): void => {
    if (drag.current) apply(at(e))
  }
  const onPointerUp = (): void => {
    if (!drag.current) return
    drag.current = null
    setBubble(null)
    if (st.current.sel >= 0) announce(st.current.sel)
  }
  const onDblClick = (e: MouseEvent): void => {
    const p = at(e)
    setSel(p.b)
    setBand(p.b, 0)
    announce(p.b)
    setBubble({ band: p.b, keep: true })
  }
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    let s = sel < 0 ? 0 : sel
    if (e.key === 'ArrowLeft') s = Math.max(0, s - 1)
    else if (e.key === 'ArrowRight') s = Math.min(N - 1, s + 1)
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') setBand(s, clampDb(curveRef.current[s]! + (e.shiftKey ? 3 : 1) * (e.key === 'ArrowUp' ? 1 : -1)))
    else if (e.key === 'Home') setBand(s, 0)
    else return
    e.preventDefault()
    e.stopPropagation()
    setSel(s)
    announce(s)
    setBubble({ band: s, keep: true })
  }

  // Balão (M15): acima do ponto, ou abaixo perto do topo.
  let bubStyle: Record<string, string> | undefined
  let bubDown = false
  if (bubble && cv.current) {
    const w = cv.current.clientWidth || width
    const slot = (w - G) / N
    const cx = G + (bubble.band + 0.5) * slot
    const yy = Y(curve[bubble.band]!)
    const bw = bub.current?.offsetWidth || 90
    bubDown = yy < 34
    bubStyle = { left: `${Math.max(bw / 2 + 2, Math.min(w - bw / 2 - 2, cx))}px`, top: `${bubDown ? yy + 10 : yy - 10}px` }
  }
  const slotW = width ? (width - G) / N : 0
  const freqLabels: [number, string][] =
    labels === 'sparse' ? SPARSE_LABELS : CURVE_BANDS.map((hz, i) => [i, shortHz(hz)] as [number, string]).filter(([i]) => slotW >= 34 || i % 2 === 0)

  return (
    <>
      <div
        class="eq-plot"
        id={`${id}Plot`}
        tabIndex={0}
        role="group"
        aria-label={t('curve.title')}
        aria-describedby={`${id}Hint`}
        data-sel={sel}
        onFocus={() => {
          setFocused(true)
          if (sel < 0) setSel(0)
        }}
        onBlur={() => {
          setFocused(false)
          setBubble(null)
        }}
        onKeyDown={onKeyDown}
      >
        <canvas ref={cv} style={{ height: `${H}px` }} aria-hidden="true" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDblClick={onDblClick} />
        <div ref={bub} class={`eq-bub num${bubble ? ' on' : ''}${bubDown ? ' dn' : ''}`} id={`${id}Bub`} style={bubStyle} aria-hidden="true">
          {bubble && (
            <>
              {hzText(CURVE_BANDS[bubble.band]!)} · <b>{dbBandText(curve[bubble.band]!)}</b>
            </>
          )}
        </div>
      </div>
      <div class="eq-freq" aria-hidden="true" style={G ? { marginLeft: `${G}px` } : undefined}>
        {freqLabels.map(([i, s]) => (
          <span key={i} style={{ left: `${(((i + 0.5) / N) * 100).toFixed(3)}%` }}>
            {s}
          </span>
        ))}
      </div>
      <span class="eq-sr" id={`${id}Hint`}>
        {t('curve.hint')}
      </span>
      <span class="eq-sr" id={`${id}Live`} aria-live="polite">
        {live}
      </span>
    </>
  )
}
