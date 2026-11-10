/**
 * Detecção de batida e BPM (spec 024), sem dependência: fluxo de energia nos graves, tirado
 * do mesmo ramo de áudio que mede o silêncio (antes do ganho), e autocorrelação dessa curva numa janela de ~8 s.
 *
 * - Cada quadro lê só as amostras novas (pelo relógio do AudioContext) de um AnalyserNode com
 *   buffer longo, filtra os graves (passa-baixas) e mede a energia em células de 20 ms. O onset
 *   é a subida da energia (dB) de uma célula para a seguinte. Não depende do fps: nada se perde
 *   mesmo com quadros lentos.
 * - A cada 250 ms: autocorrelação da grade entre 70 e 180 BPM, reforçada pelos múltiplos do
 *   período (2× e 3×) e com uma leve preferência por ~120 BPM (resolve dobro e metade). O pico
 *   é refinado por interpolação parabólica. A fase sai de um pente sobre os últimos segundos.
 * - Entre as análises, um volante prevê as batidas no período atual e corrige a fase aos poucos.
 * - Estável = BPM consistente por ~1 s, autocorrelação acima do limiar e batidas reais caindo
 *   onde o pente prevê. Perdida a estabilidade, o volante segue por `LOST_AFTER_MS` e então
 *   desiste (a rotação volta aos segundos).
 *
 * Os limiares ainda serão ajustados com músicas reais no Windows: ficam todos em `BEAT`.
 */
export const BEAT = {
  MIN_BPM: 70,
  MAX_BPM: 180,
  /** Grade da curva de onsets (ms). */
  HOP_MS: 10,
  /** Janela da autocorrelação (s). */
  WINDOW_S: 8,
  /** Janela do pente de fase e da confiança (s): curta, para perceber logo quando a batida some. */
  PHASE_S: 2.5,
  /** Intervalo entre análises (ms). */
  ANALYZE_MS: 250,
  /** Razão mínima entre o pico de onset de cada batida e a média dela ("agudeza"). */
  MIN_CREST: 5,
  /** Queda do seguidor de pico por célula (0,93 ≈ 140 ms de constante com células de 10 ms). */
  RELEASE: 0.93,
  /** Suavização da energia dos graves (Hz): tira a ondulação das notas graves e mantém o ataque. */
  ENV_HZ: 15,
  /** Compressão da amplitude antes do onset (log1p(k·a)). */
  COMPRESS: 10,
  /** Graves: passa-baixas de 2 polos em 0,75 × este valor (Hz). */
  HIGH_HZ: 200,
  /** Autocorrelação normalizada mínima no período escolhido. */
  MIN_ACF: 0.05,
  /** Razão mínima entre a curva nas batidas previstas e a média da curva (pente). */
  MIN_COMB: 2.8,
  /** Análises seguidas com BPM a ±3 % para travar (4 × 250 ms = 1 s). */
  LOCK_RUN: 4,
  /** Janela (em batidas) e fração do onset típico que contam como "a batida ainda está aqui". */
  RECENT_BEATS: 2,
  RECENT_FRACTION: 0.2,
  /** Sem confiança por este tempo, a batida é dada como perdida. */
  LOST_AFTER_MS: 2500,
  /** Correção de fase por análise (0–1). */
  PHASE_GAIN: 0.35,
  /** Preferência por tempos perto de 120 BPM (desvio em oitavas). */
  PRIOR_OCTAVES: 1.1
} as const

/** Pausa maior que isto (janela oculta) recomeça o volante. */
const MAX_GAP_MS = 2000
const N = Math.round((BEAT.WINDOW_S * 1000) / BEAT.HOP_MS)

export class BeatTracker {
  /** BPM em vigor (0 = nenhum). */
  bpm = 0
  /** Diagnóstico da última análise: agudeza dos picos, razão do pente e autocorrelação. */
  crest = 0
  comb = 0
  acfPeak = 0
  /** Onset típico nas batidas sobre o nível médio: ataque de bumbo é alto; ondulação lenta, baixo. */
  attack = 0
  /** Última estimativa, mesmo sem travar (HUD). */
  estimate = 0
  /** 0–1: força da batida na janela curta. */
  confidence = 0
  /** Batida estável: a rotação conta compassos e as trocas esperam a batida. */
  locked = false
  /** Batidas desde a abertura (só cresce). */
  beats = 0
  /** Quanto adiantar a batida mostrada (ms), compensando captura e desenho. */
  leadMs = 0
  /** Custo médio da detecção por quadro (ms), para o HUD. */
  costMs = 0

  private readonly env = new Float32Array(N)
  /** Índice absoluto da célula atual da grade (em células de HOP_MS no relógio do áudio). */
  private cell = -1
  private nextBeat = 0
  private lastAnalyze = 0
  private run = 0
  private lastCandidate = 0
  private unsureSince: number | null = null
  private readonly acf = new Float32Array(N)
  private readonly buf: Float32Array<ArrayBuffer>
  private readonly hopSamples: number
  private readonly lpA: number
  /** Amostra absoluta (relógio do AudioContext) até onde já se leu. */
  private lastSample = -1
  private lp1 = 0
  private lp2 = 0
  private e1 = 0
  private e2 = 0
  private readonly envB: number
  private hopN = 0
  private prevC = 0
  private levelC = 0

  /**
   * `tap`: um AnalyserNode com buffer longo (fftSize 32768 ≈ 0,7 s), lido pelo tempo do
   * próprio áudio. Assim a curva não depende do fps: mesmo a 5 fps nenhuma amostra se perde.
   */
  constructor(
    private readonly tap: AnalyserNode,
    private readonly ctx: BaseAudioContext,
    /** Mudanças de estado (travou / perdeu), para o log. */
    private readonly onState?: (locked: boolean, bpm: number) => void
  ) {
    this.buf = new Float32Array(tap.fftSize)
    this.hopSamples = Math.round((ctx.sampleRate * BEAT.HOP_MS) / 1000)
    // Passa-baixas de 2 polos (dois de 1 polo) no meio da faixa dos graves.
    this.envB = 1 - Math.exp((-2 * Math.PI * BEAT.ENV_HZ) / ctx.sampleRate)
    this.lpA = Math.exp((-2 * Math.PI * BEAT.HIGH_HZ * 0.75) / ctx.sampleRate)
  }

  /** Período atual (ms). */
  get periodMs(): number {
    return this.bpm > 0 ? 60000 / this.bpm : 0
  }

  /**
   * Chamar a cada quadro. Devolve quantas batidas previstas caíram desde o quadro anterior
   * (normalmente 0 ou 1; só com a batida travada). Tudo é contado no relógio do áudio (`ctx.currentTime`).
   */
  update(_now: number, silent: boolean): number {
    const t0 = performance.now()
    const sr = this.ctx.sampleRate
    const total = Math.round(this.ctx.currentTime * sr)
    const aud = (total / sr) * 1000
    if (this.lastSample < 0) this.lastSample = total
    let n = total - this.lastSample
    if (n > this.buf.length) {
      // Pausa longa (janela oculta): recomeça a leitura; as células do meio ficam vazias.
      n = this.buf.length
      this.hopN = 0
    }
    if (n > 0) {
      this.tap.getFloatTimeDomainData(this.buf)
      const a = this.lpA
      let l1 = this.lp1
      let l2 = this.lp2
      let sample = total - n
      for (let i = this.buf.length - n; i < this.buf.length; i++, sample++) {
        l1 = a * l1 + (1 - a) * this.buf[i]!
        l2 = a * l2 + (1 - a) * l1
        // Energia suavizada (2 polos em ENV_HZ): sem isso, a energia de uma nota grave longa medida
        // em blocos de 10 ms ondula e cria "batidas" falsas e periódicas.
        this.e1 += (l2 * l2 - this.e1) * this.envB
        this.e2 += (this.e1 - this.e2) * this.envB
        if (++this.hopN === this.hopSamples) {
          // Onset = subida da energia dos graves (dB) de uma célula para a seguinte.
          // Amplitude comprimida (log1p): o bumbo sobe de uma célula para a outra; o baixo que volta
          // do sidechain sobe devagar. Em dB, um baixo saindo do silêncio dava saltos enormes.
          const c = Math.log1p(BEAT.COMPRESS * Math.sqrt(Math.max(0, this.e2)))
          // Seguidor de pico (sobe na hora, desce com RELEASE): só conta o que passa do nível
          // recente. Tremores rápidos do volume (bumbo e baixo batendo, chorus) quase não contam.
          const onset = silent ? 0 : Math.max(0, c - this.prevC)
          this.prevC = Math.max(c, this.prevC * BEAT.RELEASE)
          this.levelC += (c - this.levelC) * 0.01 // nível médio (~1 s), para medir o ataque relativo
          this.hopN = 0
          this.push(Math.floor(sample / this.hopSamples), onset)
        }
      }
      this.lp1 = l1
      this.lp2 = l2
    }
    this.lastSample = total

    if (aud - this.lastAnalyze >= BEAT.ANALYZE_MS || aud < this.lastAnalyze) {
      this.lastAnalyze = aud
      this.analyze(aud, silent)
    }

    // Batidas que passaram desde o quadro anterior (um quadro lento pode cruzar mais de uma).
    let crossed = 0
    const p = this.periodMs
    if (p > 0) {
      if (this.nextBeat === 0) this.nextBeat = aud + p
      // Volante: depois de uma pausa longa (janela oculta), recomeça em vez de contar batidas que ninguém viu.
      if (aud - this.nextBeat > MAX_GAP_MS) this.nextBeat = aud + p
      // Adiantado: o quadro chega à tela depois da captura e do desenho (`leadMs`, Configurações).
      while (aud + this.leadMs >= this.nextBeat) {
        this.nextBeat += p
        if (this.locked) crossed++
      }
      this.beats += crossed
    }
    const dt = performance.now() - t0
    this.costMs += (dt - this.costMs) * 0.02
    return crossed
  }

  /** Põe o onset da célula `c` na grade; células puladas ficam em 0. */
  private push(c: number, v: number): void {
    if (this.cell < 0) this.cell = c - 1
    if (c <= this.cell) return
    const gap = Math.min(N, c - this.cell)
    for (let i = 1; i < gap; i++) this.env[(c - i) % N] = 0
    this.env[c % N] = v
    this.cell = c
  }

  private analyze(now: number, silent: boolean): void {
    const env = this.env
    const end = this.cell + 1 // `end - 1` = célula completa mais recente
    const len = N - 1
    // Média para tirar o nível contínuo.
    let mean = 0
    for (let i = 1; i <= len; i++) mean += env[(end - i + N * 4) % N]!
    mean /= len
    const x = (i: number): number => env[(end - 1 - i + N * 4) % N]! - mean // i = 0 é a célula completa mais recente
    let e0 = 0
    for (let i = 0; i < len; i++) e0 += x(i) * x(i)
    const minLag = Math.floor(60000 / BEAT.MAX_BPM / BEAT.HOP_MS)
    const maxLag = Math.ceil(60000 / BEAT.MIN_BPM / BEAT.HOP_MS)
    let confident = false
    let candidate = 0
    if (!silent && e0 > 1e-6) {
      // Autocorrelação normalizada até 3 × o maior período.
      const top = Math.min(len - 1, maxLag * 3 + 1)
      for (let L = minLag - 1; L <= top; L++) {
        let s = 0
        for (let i = 0; i + L < len; i++) s += x(i) * x(i + L)
        this.acf[L] = s / e0
      }
      const acfAt = (l: number): number => {
        const a = Math.floor(l)
        const f = l - a
        return a + 1 <= top ? this.acf[a]! * (1 - f) + this.acf[a + 1]! * f : 0
      }
      let best = -Infinity
      let bestLag = 0
      const score = (L: number): number => {
        const bpm = 60000 / (L * BEAT.HOP_MS)
        const oct = Math.log2(bpm / 120) / BEAT.PRIOR_OCTAVES
        const prior = Math.exp(-0.5 * oct * oct)
        return (acfAt(L) + 0.5 * acfAt(2 * L) + 0.25 * acfAt(3 * L)) * (0.6 + 0.4 * prior)
      }
      const scores: number[] = []
      for (let L = minLag; L <= maxLag; L++) {
        const sc = score(L)
        scores[L] = sc
        if (sc > best) {
          best = sc
          bestLag = L
        }
      }
      // Pico refinado (parábola nos vizinhos).
      let lag = bestLag
      const a = scores[bestLag - 1]
      const b = scores[bestLag + 1]
      if (a !== undefined && b !== undefined) {
        const den = a - 2 * best + b
        if (den < 0) lag = bestLag + (0.5 * (a - b)) / den
      }
      const acfPeak = acfAt(lag)
      candidate = 60000 / (lag * BEAT.HOP_MS)
      this.estimate = candidate

      // Fase: pente com o período sobre a janela curta; a melhor fase é onde a curva mais se acumula.
      const phaseCells = Math.round((BEAT.PHASE_S * 1000) / BEAT.HOP_MS)
      const pCells = lag
      let bestPhase = 0
      let bestSum = -Infinity
      let shortMean = 0
      for (let i = 0; i < phaseCells; i++) shortMean += env[(end - 1 - i + N * 4) % N]!
      shortMean /= phaseCells
      for (let ph = 0; ph < Math.ceil(pCells); ph++) {
        let s = 0
        let n = 0
        for (let k = 0; ; k++) {
          const i = Math.round(ph + k * pCells)
          if (i >= phaseCells) break
          // vizinhos ajudam quando o onset cai entre células
          s += env[(end - 1 - i + N * 4) % N]! + 0.5 * (env[(end - i + N * 4) % N]! + env[(end - 2 - i + N * 4) % N]!)
          n++
        }
        if (n > 0 && s / n > bestSum) {
          bestSum = s / n
          bestPhase = ph
        }
      }
      const combMean = bestSum / 2 // o pente soma 2 células de peso (1 + 0,5 + 0,5)
      const comb = shortMean > 1e-6 ? combMean / shortMean : 0
      this.confidence = Math.max(0, Math.min(1, (comb - 1) / 3)) * Math.min(1, acfPeak / (BEAT.MIN_ACF * 2))
      // Batida recente: nas últimas `RECENT_BEATS` batidas houve um onset do tamanho dos que
      // caem no pente. Sem isso, a janela curta ainda "lembraria" a batida por segundos.
      let recentMax = 0
      const recentCells = Math.ceil(BEAT.RECENT_BEATS * pCells) + 1
      for (let i = 0; i < recentCells; i++) recentMax = Math.max(recentMax, env[(end - 1 - i + N * 4) % N]!)
      const recentOk = recentMax >= BEAT.RECENT_FRACTION * combMean
      // Pico agudo: em cada período, o maior onset contra a média do período. Bumbo dá um pico
      // estreito (razão alta); um volume que ondula devagar (pad, chorus) dá uma curva larga.
      let crestSum = 0
      let crestN = 0
      for (let k = 0; (k + 1) * pCells <= phaseCells; k++) {
        let mx = 0
        let sum = 0
        const from = Math.round(k * pCells)
        const to = Math.round((k + 1) * pCells)
        for (let i = from; i < to; i++) {
          const v = env[(end - 1 - i + N * 4) % N]!
          sum += v
          if (v > mx) mx = v
        }
        if (sum > 1e-9) {
          crestSum += mx / (sum / (to - from))
          crestN++
        }
      }
      this.crest = crestN ? crestSum / crestN : 0
      this.comb = comb
      this.attack = this.levelC > 1e-6 ? combMean / this.levelC : 0
      this.acfPeak = acfPeak
      confident = acfPeak >= BEAT.MIN_ACF && comb >= BEAT.MIN_COMB && recentOk && this.crest >= BEAT.MIN_CREST

      if (confident) {
        // Consistência do BPM entre análises.
        if (this.lastCandidate > 0 && Math.abs(candidate / this.lastCandidate - 1) < 0.03) this.run++
        else this.run = 0
        this.lastCandidate = candidate
        const lockedNow = this.locked || this.run >= BEAT.LOCK_RUN
        if (lockedNow) {
          // BPM: suaviza se perto do atual; troca se a música mudou de andamento (já consistente).
          if (this.bpm > 0 && Math.abs(candidate / this.bpm - 1) < 0.04) this.bpm += (candidate - this.bpm) * 0.3
          else if (this.run >= BEAT.LOCK_RUN || this.bpm === 0) this.bpm = candidate
          // Fase: última batida observada = célula `bestPhase` atrás (+ meia célula).
          const p = this.periodMs
          const observed = (end - 1 - bestPhase + 0.5) * BEAT.HOP_MS
          const predictedLast = this.nextBeat - p
          let err = (observed - predictedLast) % p
          if (err > p / 2) err -= p
          if (err < -p / 2) err += p
          if (this.nextBeat === 0 || !this.locked) this.nextBeat = observed + p * Math.ceil((now - observed) / p + 1e-6)
          else this.nextBeat += err * BEAT.PHASE_GAIN
          if (!this.locked) {
            this.locked = true
            this.onState?.(true, this.bpm)
          }
        }
      } else {
        this.run = 0
        this.lastCandidate = candidate
      }
    } else {
      this.confidence = 0
      this.estimate = 0
      this.run = 0
    }

    if (confident || !this.locked) this.unsureSince = null
    else {
      if (this.unsureSince === null) this.unsureSince = now
      if (silent || now - this.unsureSince >= BEAT.LOST_AFTER_MS) {
        this.locked = false
        this.unsureSince = null
        this.onState?.(false, this.bpm)
      }
    }
    if (!this.locked && !confident) this.bpm = 0
  }
}
