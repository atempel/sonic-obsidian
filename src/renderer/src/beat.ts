/**
 * Detecção de batida e BPM (specs 024 e 047), sem dependência: fluxo de energia em três bandas, tirado
 * do mesmo ramo de áudio que mede o silêncio (antes do ganho), e autocorrelação da curva combinada numa janela de ~8 s.
 *
 * - Spec 047: onsets no grave (< 150 Hz), no médio-grave (~150–400 Hz, corpo da caixa) e no agudo
 *   (~2–8 kHz, ataque do bumbo e da caixa). A função de batida dá peso ao grave que vem com ataque
 *   no agudo (bumbo) e menos ao grave sozinho (nota de baixo). A fase é escolhida entre φ e φ + ½
 *   período pelo padrão: o bumbo nos tempos e a caixa alternando (2 e 4). Com a batida clara
 *   (as bandas concordam), trava com metade das análises.
 *
 * - Cada quadro lê só as amostras novas (pelo relógio do AudioContext) de um AnalyserNode com
 *   buffer longo, filtra os graves (passa-baixas) e mede a energia em células de 20 ms. O onset
 *   é a subida da energia (dB) de uma célula para a seguinte. Não depende do fps: nada se perde
 *   mesmo com quadros lentos.
 * - A cada 250 ms: autocorrelação da grade entre 70 e 180 BPM, reforçada pelos múltiplos do
 *   período (2× e 3×) e com uma leve preferência por ~120 BPM (resolve dobro e metade). O pico
 *   é refinado por interpolação parabólica. A fase sai de um pente sobre os últimos segundos.
 * - Entre as análises, um volante prevê as batidas no período atual e corrige a fase aos poucos.
 * - Trava: o mesmo BPM confirmado por ~2 s. Travado, o andamento fica (o volante prevê as
 *   batidas sozinho); a fase só é corrigida quando as batidas aparecem onde ele prevê, então
 *   viradas, breaks e trechos calmos não soltam nada. O BPM só muda se outro andamento (que não
 *   seja dobro, metade, 3/2 ou 2/3) se confirmar por ~4 s. Silêncio solta na hora; sem nenhuma
 *   batida no lugar previsto por 30 s, também.
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
  /** Análises seguidas com o mesmo BPM (±3 %) para travar o andamento (8 × 250 ms = 2 s). */
  LATCH_RUN: 8,
  /** Análises seguidas com outro andamento confirmado para trocar o travado (16 × 250 ms = 4 s). */
  CHANGE_RUN: 16,
  /** Sem nenhuma batida no lugar previsto por este tempo, solta a trava (silêncio solta na hora). */
  RELEASE_AFTER_MS: 30000,
  /** Ajuste fino do andamento pela deriva da fase (fração por análise). */
  TEMPO_GAIN: 0.02,
  /** Janela (em batidas) e fração do onset típico que contam como "a batida ainda está aqui". */
  RECENT_BEATS: 2,
  RECENT_FRACTION: 0.2,
  /** Correção de fase por análise (0–1). */
  PHASE_GAIN: 0.35,
  /** Preferência por tempos perto de 120 BPM (desvio em oitavas). */
  PRIOR_OCTAVES: 1.1,
  // ── Spec 047: bandas, função de batida e fase pelo padrão ──
  /** Médio-grave: passa-altas de 2 polos em LO e passa-baixas de 2 polos em HI (Hz). */
  MID_LO_HZ: 150,
  MID_HI_HZ: 400,
  /** Agudo: passa-altas de 2 polos em LO e passa-baixas de 1 polo em HI (Hz). */
  TOP_LO_HZ: 2000,
  TOP_HI_HZ: 8000,
  /** Compressão (log1p(k·a)) do médio e do agudo: mais forte, porque o nível dessas bandas é menor. */
  COMPRESS_MID: 30,
  COMPRESS_TOP: 100,
  /** Suavização da energia do médio e do agudo (Hz): mais rápida, o ataque do agudo é curto. */
  BAND_ENV_HZ: 30,
  /** Função de batida: peso do grave, do médio e do agudo. */
  W_LOW: 1,
  W_MID: 0.5,
  W_TOP: 0.3,
  /** Peso do grave sem ataque no agudo junto (nota de baixo) e o ataque que dá peso cheio. */
  LOW_ALONE: 0.4,
  TOP_REF: 0.4,
  /** Peso da alternância da caixa (2 e 4) no placar de cada fase. */
  ALT_W: 2,
  /** Fase: vantagem (fração) da outra hipótese para trocar a fase travada, por PHASE_RUN análises (~2 s). */
  PHASE_SWITCH: 0.15,
  PHASE_RUN: 8,
  /** Batida clara (trava com LATCH_RUN / 2): margem da fase e razão do pente mínimas. */
  CLEAR_MARGIN: 0.2,
  CLEAR_COMB: 4
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
  /** Spec 047 (HUD): força do bumbo e alternância da caixa nas batidas da fase escolhida (sobre a média da banda). */
  kick = 0
  snare = 0
  /** Fase em vigor: 'on' = a hipótese com o melhor placar; 'off' = a outra (meia batida), esperando a troca. */
  phase: 'on' | 'off' = 'on'
  /** Vantagem (fração) da fase em vigor sobre a outra hipótese; negativa quando a outra está ganhando. */
  margin = 0

  /** Curva combinada (função de batida) e as três bandas, na mesma grade. */
  private readonly env = new Float32Array(N)
  private readonly envL = new Float32Array(N)
  private readonly envM = new Float32Array(N)
  private readonly envT = new Float32Array(N)
  private phaseRun = 0
  private readonly mHp: number
  private readonly mA: number
  private readonly tA: number
  private readonly tB: number
  private readonly bandB: number
  private m0 = 0
  private m00 = 0
  private m1 = 0
  private m2 = 0
  private t0 = 0
  private t1 = 0
  private t3 = 0
  private f1 = 0
  private f2 = 0
  private g1 = 0
  private g2 = 0
  private prevM = 0
  private prevT = 0
  /** Índice absoluto da célula atual da grade (em células de HOP_MS no relógio do áudio). */
  private cell = -1
  private nextBeat = 0
  private lastAnalyze = 0
  private run = 0
  private lastCandidate = 0
  private changeRun = 0
  private baseBpm = 0
  private lastGood = 0
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
    private readonly onState?: (locked: boolean, bpm: number) => void,
    /** Spec 047: a fase travada pulou meia batida (para o log). */
    private readonly onPhaseShift?: (margin: number) => void
  ) {
    this.buf = new Float32Array(tap.fftSize)
    this.hopSamples = Math.round((ctx.sampleRate * BEAT.HOP_MS) / 1000)
    // Passa-baixas de 2 polos (dois de 1 polo) no meio da faixa dos graves.
    this.envB = 1 - Math.exp((-2 * Math.PI * BEAT.ENV_HZ) / ctx.sampleRate)
    this.lpA = Math.exp((-2 * Math.PI * BEAT.HIGH_HZ * 0.75) / ctx.sampleRate)
    this.mHp = Math.exp((-2 * Math.PI * BEAT.MID_LO_HZ) / ctx.sampleRate)
    this.mA = Math.exp((-2 * Math.PI * BEAT.MID_HI_HZ) / ctx.sampleRate)
    this.tA = Math.exp((-2 * Math.PI * BEAT.TOP_LO_HZ) / ctx.sampleRate)
    this.tB = Math.exp((-2 * Math.PI * Math.min(BEAT.TOP_HI_HZ, ctx.sampleRate * 0.45)) / ctx.sampleRate)
    this.bandB = 1 - Math.exp((-2 * Math.PI * BEAT.BAND_ENV_HZ) / ctx.sampleRate)
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
      const mh = this.mHp
      const ma = this.mA
      const ta = this.tA
      const tb = this.tB
      const bb = this.bandB
      let l1 = this.lp1
      let l2 = this.lp2
      let m0 = this.m0
      let m00 = this.m00
      let m1 = this.m1
      let m2 = this.m2
      let t0 = this.t0
      let t1 = this.t1
      let t3 = this.t3
      let sample = total - n
      for (let i = this.buf.length - n; i < this.buf.length; i++, sample++) {
        const v = this.buf[i]!
        l1 = a * l1 + (1 - a) * v
        l2 = a * l2 + (1 - a) * l1
        // Médio-grave (spec 047): dois passa-altas de 1 polo (cada um tira o passa-baixas do próprio
        // sinal; subtrair dois passa-baixas deixaria o baixo vazar pela diferença de fase) e 2 polos de passa-baixas.
        m0 = mh * m0 + (1 - mh) * v
        const hp1 = v - m0
        m00 = mh * m00 + (1 - mh) * hp1
        m1 = ma * m1 + (1 - ma) * (hp1 - m00)
        m2 = ma * m2 + (1 - ma) * m1
        const mid = m2
        // Agudo: dois passa-altas de 1 polo em ~2 kHz, suavizado em ~8 kHz.
        t0 = ta * t0 + (1 - ta) * v
        const hq1 = v - t0
        t1 = ta * t1 + (1 - ta) * hq1
        t3 = tb * t3 + (1 - tb) * (hq1 - t1)
        // Energia suavizada (2 polos em ENV_HZ): sem isso, a energia de uma nota grave longa medida
        // em blocos de 10 ms ondula e cria "batidas" falsas e periódicas.
        this.e1 += (l2 * l2 - this.e1) * this.envB
        this.e2 += (this.e1 - this.e2) * this.envB
        this.f1 += (mid * mid - this.f1) * bb
        this.f2 += (this.f1 - this.f2) * bb
        this.g1 += (t3 * t3 - this.g1) * bb
        this.g2 += (this.g1 - this.g2) * bb
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
          // Médio e agudo: o mesmo log1p e o mesmo seguidor de pico.
          const cm = Math.log1p(BEAT.COMPRESS_MID * Math.sqrt(Math.max(0, this.f2)))
          const om = silent ? 0 : Math.max(0, cm - this.prevM)
          this.prevM = Math.max(cm, this.prevM * BEAT.RELEASE)
          const ct = Math.log1p(BEAT.COMPRESS_TOP * Math.sqrt(Math.max(0, this.g2)))
          const ot = silent ? 0 : Math.max(0, ct - this.prevT)
          this.prevT = Math.max(ct, this.prevT * BEAT.RELEASE)
          this.hopN = 0
          this.push(Math.floor(sample / this.hopSamples), onset, om, ot)
        }
      }
      this.lp1 = l1
      this.lp2 = l2
      this.m0 = m0
      this.m00 = m00
      this.m1 = m1
      this.m2 = m2
      this.t0 = t0
      this.t1 = t1
      this.t3 = t3
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

  /** Põe os onsets da célula `c` na grade; células puladas ficam em 0. */
  private push(c: number, low: number, mid: number, top: number): void {
    if (this.cell < 0) this.cell = c - 1
    if (c <= this.cell) return
    const gap = Math.min(N, c - this.cell)
    for (let i = 1; i < gap; i++) {
      const j = (c - i) % N
      this.env[j] = 0
      this.envL[j] = 0
      this.envM[j] = 0
      this.envT[j] = 0
    }
    const j = c % N
    this.envL[j] = low
    this.envM[j] = mid
    this.envT[j] = top
    // Função de batida: o grave vale mais com ataque no agudo junto (bumbo; o agudo chega antes, por
    // isso as duas células anteriores contam) e menos sozinho (nota de baixo).
    const t = Math.max(top, this.envT[(c - 1 + N) % N]!, this.envT[(c - 2 + N) % N]!)
    const gate = BEAT.LOW_ALONE + (1 - BEAT.LOW_ALONE) * Math.min(1, t / BEAT.TOP_REF)
    this.env[j] = BEAT.W_LOW * low * gate + BEAT.W_MID * mid + BEAT.W_TOP * top
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
    let candConfident = false
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

      this.acfPeak = acfPeak
      const mC = this.measure(end, lag)
      candConfident = acfPeak >= BEAT.MIN_ACF && this.passes(mC)
    } else {
      this.estimate = 0
    }

    if (!this.locked) {
      // Procurando: trava quando o mesmo andamento se confirma por LATCH_RUN análises seguidas
      // (metade com a batida clara: o pente forte e uma fase sem rival, spec 047).
      const pC = candidate > 0 ? 60000 / candidate / BEAT.HOP_MS : 0
      const m = pC > 0 ? this.measure(end, pC) : null
      this.show(m)
      const h = m ? this.hypotheses(end, pC, m.phase) : null
      this.showPhase(h, false)
      if (candConfident && m && h) {
        if (this.lastCandidate > 0 && Math.abs(candidate / this.lastCandidate - 1) < 0.03) this.run++
        else this.run = 0
        this.lastCandidate = candidate
        const clear = Math.abs(h.margin) >= BEAT.CLEAR_MARGIN && m.comb >= BEAT.CLEAR_COMB
        if (this.run >= (clear ? BEAT.LATCH_RUN / 2 : BEAT.LATCH_RUN)) {
          // A hipótese vencedora; o pico exato sai do pente perto dela.
          const ph = h.margin >= 0 ? m.phase : this.measure(end, pC, m.phase + pC / 2).phase
          this.latch(candidate, end, ph, now)
          this.showPhase(h, h.margin < 0)
        }
      } else {
        this.run = 0
        this.lastCandidate = candidate
      }
      return
    }

    // Travado: o andamento fica. Silêncio de verdade (ou muito tempo sem nenhuma batida) solta.
    if (silent || now - this.lastGood > BEAT.RELEASE_AFTER_MS) {
      this.locked = false
      this.run = 0
      this.changeRun = 0
      this.onState?.(false, this.bpm)
      this.bpm = 0
      return
    }
    // A fase só é corrigida quando as batidas aparecem onde o andamento travado prevê;
    // viradas, breaks e trechos calmos não mexem em nada (o volante segue sozinho).
    const pCells = this.periodMs / BEAT.HOP_MS
    // Fase prevista pelo volante, em células para trás a partir da célula completa mais recente.
    const p = this.periodMs
    const predicted = end - 0.5 - (this.nextBeat - p) / BEAT.HOP_MS
    // O pente procura só perto da fase prevista: a outra hipótese (meia batida) é decidida abaixo.
    const mL = this.measure(end, pCells, predicted)
    this.show(mL)
    if (this.passes(mL)) {
      this.lastGood = now
      const observed = (end - 1 - mL.phase + 0.5) * BEAT.HOP_MS
      let err = (observed - (this.nextBeat - p)) % p
      if (err > p / 2) err -= p
      if (err < -p / 2) err += p
      this.nextBeat += err * BEAT.PHASE_GAIN
      // Ajuste fino do andamento pela deriva da fase (no máximo ±3 % do que travou).
      const trimmed = this.bpm * (1 - (err / p) * BEAT.TEMPO_GAIN)
      this.bpm = Math.min(this.baseBpm * 1.03, Math.max(this.baseBpm * 0.97, trimmed))
      // Fase em duas hipóteses (spec 047): a meia batida só substitui a fase travada com vantagem
      // clara por PHASE_RUN análises seguidas (~2 s); não passa pelos 4 s de um andamento novo.
      const h = this.hypotheses(end, pCells, mL.phase)
      this.showPhase(h, false)
      if (h.margin < -BEAT.PHASE_SWITCH) this.phaseRun++
      else this.phaseRun = 0
      if (this.phaseRun >= BEAT.PHASE_RUN) {
        this.phaseRun = 0
        let nb = this.nextBeat - this.periodMs / 2
        if (nb <= now + this.leadMs) nb += this.periodMs
        this.nextBeat = nb
        this.showPhase(h, true)
        this.onPhaseShift?.(this.margin)
      }
    }
    // Andamento novo: só quando um BPM diferente (e que não é dobro, metade, 3/2 ou 2/3 do
    // atual) se confirma por CHANGE_RUN análises seguidas.
    const related = candidate > 0 && [1, 2, 0.5, 1.5, 2 / 3].some((r) => Math.abs(candidate / this.bpm / r - 1) < 0.04)
    if (candConfident && !related && this.lastCandidate > 0 && Math.abs(candidate / this.lastCandidate - 1) < 0.03) this.changeRun++
    else this.changeRun = 0
    this.lastCandidate = candidate
    if (this.changeRun >= BEAT.CHANGE_RUN) {
      const m = this.measure(end, 60000 / candidate / BEAT.HOP_MS)
      this.latch(candidate, end, m.phase, now)
    }
  }

  /** Trava (ou troca) o andamento e alinha a fase pela última batida observada. */
  private latch(bpm: number, end: number, phase: number, now: number): void {
    this.bpm = bpm
    this.baseBpm = bpm
    const p = this.periodMs
    const observed = (end - 1 - phase + 0.5) * BEAT.HOP_MS
    this.nextBeat = observed + p * Math.ceil((now - observed) / p + 1e-6)
    this.lastGood = now
    this.run = 0
    this.changeRun = 0
    this.phaseRun = 0
    this.locked = true
    this.onState?.(true, bpm)
  }

  /**
   * Spec 047: placar das duas fases candidatas (φ e φ + ½ período) na janela longa. Cada batida
   * conta o bumbo (grave com ataque no agudo) e a alternância da caixa (médio + agudo, batida sim,
   * batida não: 2 e 4). As bandas são divididas pela média delas, então nenhuma domina pelo volume.
   * `margin` > 0: φ ganha; < 0: a meia batida ganha (fração da maior).
   */
  private hypotheses(end: number, pCells: number, phi: number): Hyp {
    const len = N - 2
    const idx = (i: number): number => (end - 1 - i + N * 4) % N
    let mL = 1e-9
    let mM = 1e-9
    let mT = 1e-9
    for (let i = 0; i < len; i++) {
      const j = idx(i)
      mL += this.envL[j]!
      mM += this.envM[j]!
      mT += this.envT[j]!
    }
    mL /= len
    mM /= len
    mT /= len
    // Soma (não o máximo) das três células: o onset que cai entre duas células conta inteiro. Com o
    // máximo, a divisão muda devagar com a deriva da grade e a alternância some e volta a cada ~20 s.
    const peak = (arr: Float32Array, i: number): number => arr[idx(i - 1)]! + arr[idx(i)]! + arr[idx(i + 1)]!
    const score = (psi: number): [number, number, number] => {
      let kick = 0
      let altM = 0
      let altT = 0
      let k = 0
      for (; ; k++) {
        const i = Math.round(psi + k * pCells)
        if (i + 1 >= len) break
        const low = peak(this.envL, i) / mL
        const top = peak(this.envT, i) / mT
        const mid = peak(this.envM, i) / mM
        kick += low * (BEAT.LOW_ALONE + (1 - BEAT.LOW_ALONE) * Math.min(1, top / 2))
        // Alternância por banda: o bumbo também tem médio, e somar as bandas antes cancelaria a caixa.
        altM += k % 2 ? -mid : mid
        altT += k % 2 ? -top : top
      }
      if (k === 0) return [0, 0, 0]
      kick /= k
      const alt = (Math.abs(altM) + Math.abs(altT)) / k
      return [kick + BEAT.ALT_W * alt, kick, alt]
    }
    const ph = ((phi % pCells) + pCells) % pCells
    const a = score(ph)
    const b = score((ph + pCells / 2) % pCells)
    const top = Math.max(a[0], b[0])
    return { margin: top > 1e-9 ? (a[0] - b[0]) / top : 0, kick: [a[1], b[1]], snare: [a[2], b[2]] }
  }

  /** Guarda a fase para o HUD; `swapped` = a fase em vigor é a meia batida de `h`. */
  private showPhase(h: Hyp | null, swapped: boolean): void {
    if (!h) {
      this.kick = this.snare = this.margin = 0
      this.phase = 'on'
      return
    }
    const s = swapped ? 1 : 0
    this.kick = h.kick[s]!
    this.snare = h.snare[s]!
    this.margin = swapped ? -h.margin : h.margin
    this.phase = this.margin >= 0 ? 'on' : 'off'
  }

  private passes(m: Measure): boolean {
    return m.comb >= BEAT.MIN_COMB && m.recentOk && m.crest >= BEAT.MIN_CREST
  }

  /** Guarda as medidas para o HUD. */
  private show(m: Measure | null): void {
    this.comb = m?.comb ?? 0
    this.crest = m?.crest ?? 0
    this.attack = m && this.levelC > 1e-6 ? m.combMean / this.levelC : 0
    this.confidence = m ? Math.max(0, Math.min(1, (m.comb - 1) / 3)) * Math.min(1, m.crest / (BEAT.MIN_CREST * 1.5)) : 0
  }

  /**
   * Pente com o período `pCells` (em células) sobre a janela curta: fase das batidas, razão do
   * pente, agudeza dos picos e se ainda há batida recente.
   */
  private measure(end: number, pCells: number, around?: number): Measure {
    const env = this.env
    const at = (i: number): number => env[(end - 1 - i + N * 4) % N]!
    const phaseCells = Math.round((BEAT.PHASE_S * 1000) / BEAT.HOP_MS)
    let shortMean = 0
    for (let i = 0; i < phaseCells; i++) shortMean += at(i)
    shortMean /= phaseCells
    let bestPhase = 0
    let bestSum = -Infinity
    // `around`: só as fases a até ¼ de período dela (a outra hipótese fica de fora).
    const ref = around === undefined ? 0 : ((around % pCells) + pCells) % pCells
    for (let ph = 0; ph < Math.ceil(pCells); ph++) {
      if (around !== undefined) {
        const d = Math.abs(ph - ref)
        if (Math.min(d, pCells - d) > pCells / 4) continue
      }
      let sum = 0
      let n = 0
      for (let k = 0; ; k++) {
        const i = Math.round(ph + k * pCells)
        if (i >= phaseCells) break
        // vizinhos ajudam quando o onset cai entre células
        sum += at(i) + 0.5 * (at(i - 1) + at(i + 1))
        n++
      }
      if (n > 0 && sum / n > bestSum) {
        bestSum = sum / n
        bestPhase = ph
      }
    }
    const combMean = bestSum / 2 // o pente soma 2 células de peso (1 + 0,5 + 0,5)
    const comb = shortMean > 1e-6 ? combMean / shortMean : 0
    // Batida recente: nas últimas RECENT_BEATS batidas houve um onset do tamanho dos do pente.
    let recentMax = 0
    const recentCells = Math.ceil(BEAT.RECENT_BEATS * pCells) + 1
    for (let i = 0; i < recentCells; i++) recentMax = Math.max(recentMax, at(i))
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
        const v = at(i)
        sum += v
        if (v > mx) mx = v
      }
      if (sum > 1e-9) {
        crestSum += mx / (sum / (to - from))
        crestN++
      }
    }
    return { phase: bestPhase, combMean, comb, recentOk: recentMax >= BEAT.RECENT_FRACTION * combMean && combMean > 0, crest: crestN ? crestSum / crestN : 0 }
  }
}

interface Hyp {
  margin: number
  /** [φ, φ + ½]: força do bumbo e alternância da caixa. */
  kick: [number, number]
  snare: [number, number]
}

interface Measure {
  phase: number
  combMean: number
  comb: number
  recentOk: boolean
  crest: number
}

