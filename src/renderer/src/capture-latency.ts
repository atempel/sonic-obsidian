/**
 * "Medir atraso da captura" (spec 032, P1): toca um clique curto pela saída, num AudioContext à
 * parte, e procura o pico no ramo da captura **antes** do DelayNode do "Atrasar o visual".
 * Os dois lados vão para o relógio da página (`performance.now()`) pelo relógio do áudio de cada
 * contexto (amostras contadas por `currentTime`, como a batida da spec 024), então o fps não entra.
 *
 * Mede só o caminho mixagem → loopback → app. O atraso depois do loopback (fone Bluetooth, TV)
 * o app não vê; o toast não promete isso.
 */
export const CLICK = {
  /** Duração do clique (ms) e nível de pico (dBFS). */
  MS: 10,
  DBFS: -20,
  /** Seno dentro de uma janela de Hann: agudo, para escapar dos graves da música. */
  FREQ_HZ: 3000,
  /** Cliques por medição; o resultado é a mediana (precisa de pelo menos `MIN_FOUND`). */
  COUNT: 3,
  MIN_FOUND: 2,
  /** Sem pico até este tempo depois do clique: não achou. */
  TIMEOUT_MS: 1000,
  /** Linha de base antes do clique (ms) e quanto o pico precisa passar dela. */
  BASELINE_MS: 250,
  OVER_BASELINE: 4,
  /** Pico mínimo da correlação (1 = o clique no nível original, −20 dBFS): abaixo é ruído ou som mudo. */
  MIN_PEAK: 0.05,
  /** Intervalo de leitura do analyser (ms) e pausa entre cliques (ms). */
  POLL_MS: 40,
  GAP_MS: 300,
  /** O clique é agendado com esta folga (s), para cair inteiro dentro da gravação. */
  LEAD_S: 0.1
} as const

/** O analyser lido (o ramo antes do DelayNode). */
export interface TapLike {
  readonly fftSize: number
  getFloatTimeDomainData(out: Float32Array<ArrayBuffer>): void
}
/** O relógio do áudio do contexto da captura. */
export interface ClockLike {
  readonly currentTime: number
  readonly sampleRate: number
}

/**
 * Grava o que passa pelo analyser desde `start()`, lendo só as amostras novas pelo relógio do
 * áudio. `perfAt(i)` dá o horário da página da amostra i pela leitura mais recente.
 */
export class TapRecorder {
  private chunks: Float32Array[] = []
  private length = 0
  private lastTotal = 0
  private lastPerf = 0
  private readonly buf: Float32Array<ArrayBuffer>

  constructor(
    private readonly tap: TapLike,
    private readonly clock: ClockLike,
    private readonly now: () => number = () => performance.now()
  ) {
    this.buf = new Float32Array(tap.fftSize)
  }

  start(): void {
    this.chunks = []
    this.length = 0
    this.lastTotal = Math.round(this.clock.currentTime * this.clock.sampleRate)
    this.lastPerf = this.now()
  }

  poll(): void {
    const total = Math.round(this.clock.currentTime * this.clock.sampleRate)
    const fresh = total - this.lastTotal
    this.lastPerf = this.now()
    if (fresh <= 0) return
    this.lastTotal = total
    this.tap.getFloatTimeDomainData(this.buf)
    const n = Math.min(fresh, this.buf.length)
    // Leitura atrasada além do buffer (janela oculta): o que se perdeu entra como silêncio.
    if (fresh > n) this.push(new Float32Array(fresh - n))
    this.push(this.buf.slice(this.buf.length - n))
  }

  private push(c: Float32Array): void {
    this.chunks.push(c)
    this.length += c.length
  }

  get samples(): Float32Array {
    if (this.chunks.length !== 1) {
      const all = new Float32Array(this.length)
      let o = 0
      for (const c of this.chunks) {
        all.set(c, o)
        o += c.length
      }
      this.chunks = [all]
    }
    return this.chunks[0] ?? new Float32Array(0)
  }

  /** Horário da página (ms) da amostra `i`. */
  perfAt(i: number): number {
    return this.lastPerf - ((this.length - 1 - i) / this.clock.sampleRate) * 1000
  }

  /** Índice da amostra no horário `perf` (pode cair fora da gravação). */
  indexAt(perf: number): number {
    return Math.round(this.length - 1 - ((this.lastPerf - perf) / 1000) * this.clock.sampleRate)
  }
}

/**
 * Procura o clique em `samples[from, to)` por correlação com o próprio clique (filtro casado: o seno
 * agudo em janela some nos graves e se destaca do chimbal e do ruído largo). O pico da correlação
 * precisa passar `OVER_BASELINE` vezes o maior valor dos `BASELINE_MS` antes de `from` e o mínimo
 * absoluto. Devolve o índice do meio do clique ou -1.
 */
export function findClick(samples: Float32Array, sampleRate: number, from: number, to: number): number {
  const tpl = clickSamples(sampleRate)
  const n = tpl.length
  let energy = 0
  for (const v of tpl) energy += v * v
  // Normalizada pela energia do clique: o próprio clique, no nível original, dá 1.
  const corr = (i: number): number => {
    let acc = 0
    for (let k = 0; k < n; k++) acc += samples[i + k]! * tpl[k]!
    return Math.abs(acc) / energy
  }
  const last = samples.length - n
  const b0 = Math.max(0, from - Math.round((CLICK.BASELINE_MS / 1000) * sampleRate))
  let base = 0
  for (let i = b0; i < Math.min(from - n, last); i++) base = Math.max(base, corr(i))
  let peak = 0
  let at = -1
  for (let i = Math.max(0, from); i <= Math.min(to, last); i++) {
    const v = corr(i)
    if (v > peak) {
      peak = v
      at = i
    }
  }
  if (at < 0 || peak < CLICK.MIN_PEAK || peak < base * CLICK.OVER_BASELINE) return -1
  return at + (n >> 1)
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/** O clique: seno em janela de Hann, `MS` de duração, pico em `DBFS`. */
export function clickSamples(sampleRate: number): Float32Array<ArrayBuffer> {
  const n = Math.round((CLICK.MS / 1000) * sampleRate)
  const amp = 10 ** (CLICK.DBFS / 20)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
    out[i] = amp * w * Math.sin((2 * Math.PI * CLICK.FREQ_HZ * i) / sampleRate)
  }
  return out
}

/** Quem toca o clique. `play()` devolve o horário da página (ms) em que o clique começa a sair. */
export interface ClickPlayer {
  play(): number
  close(): void
}

/** O clique pela saída padrão, num AudioContext à parte (o da captura não toca nada, para não ecoar). */
export function webClickPlayer(): ClickPlayer {
  const out = new AudioContext({ latencyHint: 'interactive' })
  void out.resume()
  const buffer = out.createBuffer(1, Math.round((CLICK.MS / 1000) * out.sampleRate), out.sampleRate)
  buffer.copyToChannel(clickSamples(out.sampleRate), 0)
  return {
    play() {
      const c0 = out.currentTime
      const p0 = performance.now()
      const src = out.createBufferSource()
      src.buffer = buffer
      src.connect(out.destination)
      const when = c0 + CLICK.LEAD_S
      src.start(when)
      // Sai do contexto para a mixagem do sistema depois do buffer dele (baseLatency); o loopback
      // lê a mixagem, então a latência do dispositivo de saída não entra.
      return p0 + (when - c0 + (out.baseLatency || 0)) * 1000
    },
    close() {
      void out.close().catch(() => undefined)
    }
  }
}

export interface CaptureMeasure {
  /** Mediana (ms) ou `null` se não achou cliques suficientes. */
  ms: number | null
  /** Cada clique (ms) ou `null` quando não achou. */
  runs: (number | null)[]
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Três cliques, um de cada vez; a mediana dos achados. */
export async function measureCapture(
  tap: TapLike,
  clock: ClockLike,
  player: ClickPlayer,
  now: () => number = () => performance.now()
): Promise<CaptureMeasure> {
  const rec = new TapRecorder(tap, clock, now)
  const runs: (number | null)[] = []
  try {
    for (let k = 0; k < CLICK.COUNT; k++) {
      if (k) await sleep(CLICK.GAP_MS)
      rec.start()
      // Linha de base antes do clique.
      const baseEnd = now() + CLICK.BASELINE_MS
      while (now() < baseEnd) {
        await sleep(CLICK.POLL_MS)
        rec.poll()
      }
      const clickAt = player.play()
      // Meio do clique: o pico da janela de Hann.
      const mid = clickAt + CLICK.MS / 2
      const deadline = clickAt + CLICK.TIMEOUT_MS + CLICK.MS
      while (now() < deadline) {
        await sleep(CLICK.POLL_MS)
        rec.poll()
      }
      rec.poll()
      const s = rec.samples
      const from = Math.max(0, rec.indexAt(clickAt))
      const to = rec.indexAt(deadline)
      const at = findClick(s, clock.sampleRate, from, to)
      runs.push(at < 0 ? null : rec.perfAt(at) - mid)
    }
  } finally {
    player.close()
  }
  const found = runs.filter((r): r is number => r !== null)
  return { ms: found.length >= CLICK.MIN_FOUND ? median(found) : null, runs }
}
