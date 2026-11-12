> **Cópia da pesquisa feita pelo usuário com o Claude (Cowork)**, colada na sessão de 2026-11-11. Auditoria no commit `3e9c620`. Texto como veio; para atualizar, substituir o arquivo inteiro. Conferência no código feita nesta sessão: ver "Conferido no repo" no fim.
> Resumo para o Claude Code, com os mesmos IDs (A1–F2) e as mesmas decisões pendentes: [Sonic Obsidian — Reatividade ao áudio: diagnóstico e plano](https://claude.ai/artifact/T8VRDyCmsZyqWRQeSBdDUm) (Claude Docs, 2026-11-11). O estudo completo no projeto do Cowork chama-se `claude/estudo-reatividade-e-motores.md`; esta cópia é ele.

# Destravar a reatividade do Sonic Obsidian antes de trocar de motor

Convenção de rótulos: **[EVIDÊNCIA]** = lido em código/doc/diff; **[SIMULAÇÃO]** = lógica reproduzida em Node, não medida no app real; **[HIPÓTESE/INFERÊNCIA]** = raciocínio nosso, não verificado. Esforço: P (pequeno, dias), M (médio, 1-3 semanas), G (grande, mais de um mês), tudo estimado a partir da leitura de código, sem protótipo.

## 1. Resumo

- **Suspeito mais forte, um defeito concreto:** a Expressividade com Memória "Fixa" (`locked`) ou "Lenta" inicializa a média própria **uma única vez**, com `imm/val` do motor, e se `val == 0` (música pausada, captura ainda sem sinal) usa `imm`. Em `locked` a média nunca mais é atualizada. Na simulação, `locked` iniciado com 2 s de silêncio deixa `bass` **travado em 1,00 com desvio 0,000 para sempre**; iniciado direto com música satura em 4,00 constante. O valor é persistido em `settings.json` e relido a cada abertura ([`expression.ts#L74-L88`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/expression.ts#L74), [`state.ts#L285`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/core/state.ts#L285)). **[EVIDÊNCIA de código + SIMULAÇÃO]**; falta confirmar no HUD que o seu `settings.json` está em `locked`/`slow`.
- **Os padrões tornam o "Caráter" inerte:** `expression: { level: 0, curve: 'b', adaptation: 'normal' }` e a curva só é aplicada quando `level !== 0` ([`expression.ts#L93`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/expression.ts#L93)). Isso explica o retorno "o Caráter ainda é pouco perceptível". **[EVIDÊNCIA]**
- **Não houve regressão no caminho de áudio:** nenhum commit adiciona suavização ou reduz nível; as constantes do `updateAudioLevels` são idênticas entre Butterchurn 2.6.7 e 3.0.0-beta.5; o motor usa `smoothingTimeConstant = 0`. O "cada vez menos reativo" é mais provável por (a) natureza relativa do motor, (b) fim do ganho "tocável" nas teclas e reset do ganho a cada abertura, (c) o defeito acima. **[EVIDÊNCIA]**
- **Como funciona:** o preset não recebe "volume", recebe `bass = imm / longAvg` (energia agora dividida pela média de ~4 s). Música estável fica em ~1; só **mudanças** pulsam. Isso é projeto do MilkDrop, não bug, mas é a razão de a música "chapada" parecer sem reação.
- **Maior alavanca, barata e fora do motor:** um estado de estrutura musical (build/break/drop) e um "intensity" de janela longa, calculados no próprio app, para dirigir velocidade, troca de preset e valores injetados. A literatura de drops é toda offline; um detector causal precisa ser projetado e afinado por nós. **[INFERÊNCIA]**
- **Do MilkDrop 3 vale reproduzir primeiro:** modos de hardcut por limiar (bass > 1,5 etc.), mistura fixa de dois presets (`.milk2`), `get_fft` como textura. `.milk2` é portável para WebGL (o cálculo é matemática de malha em CPU), mas o código-fonte atual do MD3 **não é público**; os detalhes vêm de engenharia reversa de terceiros.
- **Motor:** a recomendação para decidir é manter o Butterchurn, prototipar por patch em runtime e vendorizar/forkar (MIT) só quando precisar de áudio float, relógio próprio, variáveis novas ou mistura fixa. Trocar de motor custa muito e não resolve a reatividade. Electron/ANGLE provavelmente **não** é o gargalo (inferência; medir antes).

## 2. Como a reatividade funciona (didático)

### 2.1 O caminho do sinal

```
Spotify/Windows → captura loopback (getDisplayMedia) → GainNode (ganho do app)
   → Butterchurn: 3 AnalyserNodes (mono, L, R; fftSize 1024; smoothing 0)
   → bytes de 8 bits (getByteTimeDomainData, centro em 128)
   → suavização de 2 amostras + FFT própria (512 bins, tabela de equalização MilkDrop)
   → 3 bandas somadas: graves 20-320 Hz | médios 320-2800 Hz | agudos 2800-11025 Hz  = "imm"
   → avg   (média rápida: taxa 0,2 subindo / 0,5 descendo)
   → longAvg (média lenta: 0,9 nos 50 primeiros quadros, depois 0,992; base 30 fps ≈ 4 s)
   → bass = imm / longAvg      bass_att = avg / longAvg     (idem mid, treb)
   → equações per_frame / per_pixel (WASM) e shaders do preset
```

Fontes: [`audioProcessor.js`/`audioLevels.js` do Butterchurn](https://github.com/jberg/butterchurn) (leitura de código), e a comparação 2.6.7 × 3.0.0-beta.5 no bundle ([2.6.7](https://unpkg.com/butterchurn@2.6.7/lib/butterchurn.js), [3.0.0-beta.5](https://unpkg.com/butterchurn@3.0.0-beta.5/dist/butterchurn.js)). Valores de fps são limitados a 15-144 e as taxas são corrigidas pelo fps real.

### 2.2 O que isso significa na prática

| Pergunta | Resposta curta |
|---|---|
| Por que música estável lê ~1? | Porque `bass = agora / média de ~4 s`. Se o agora é igual à média, dá 1. Só desvios (kick mais forte, entrada de um instrumento) fazem `bass` subir ou cair. O próprio repo documenta isso (spec 015, "Problema"). |
| O ganho (dB) ajuda? | Pouco para a relatividade: o ganho entra no numerador **e** no denominador e é anulado em ~4 s. Ele só ajuda a vencer clipping e a quantização de 8 bits (passo de 1/128 ≈ −42 dBFS de pico). |
| 8 bits é regressão? | Não. O MilkDrop 2 original também recebia 576 amostras de 8 bits do Winamp ([vis_milk2](https://github.com/wacup/vis_milk2), `pluginshell.cpp`). É limite de precisão frente a PCM float moderno, relevante em níveis baixos (não medido). |
| O que é absoluto e o que é relativo? | **Relativo:** `bass/mid/treb` e `_att`. **Absoluto (inferência a partir da arquitetura):** ondas e espectro desenhados direto do sinal (waveform/custom waves), que sobem e descem com o nível real. Um preset que usa só ondas reage mais ao volume; um que usa `bass` reage só a mudanças. |
| Por que alguns presets parecem não reagir? | Muitos são dominados por `time` (relógio) e `baseVals`: o movimento vem do tempo, não do áudio. Presets novos do pacote 3.x (+77) podem reagir menos que os antigos **[HIPÓTESE]**: o repo não mede reatividade por preset. |
| E no silêncio? | O app em silêncio (RMS < 0,0005, ~−66 dBFS por 3 s) reduz o relógio a 15 % e escurece ~35 %. Mas as equações com `time` continuam andando. No motor, `imm = 0` dá `bass = 0` (não 1) por vários minutos, até `longAvg < 0,001`, quando salta para 1,0 de uma vez. **[SIMULAÇÃO/derivação]** |
| Diferenças entre motores | O MilkDrop 2 usa bandas log-espaçadas (~200-761 / 761-2897 / 2897-11025 Hz), médias (não somas) e `long_avg` mais curta (0,96 a 14 fps ≈ 0,981 por quadro de 30 fps, ~1,7 s contra ~4,2 s). O projectM 4 divide o espectro em terços lineares. O Butterchurn inclui sub-graves 20-200 Hz no "bass". Tudo isso são constantes pequenas em `audioLevels.js`. ([Butterchurn × MD2 × projectM](https://github.com/projectM-visualizer/projectm), leitura de código) |

## 3. Por que ficou menos reativo: causas ranqueadas

O repo foi auditado no commit [`3e9c620`](https://github.com/atempel/sonic-obsidian/commit/3e9c620) (54 commits desde 2026-03, Butterchurn 3.0.0-beta.5). Não temos o `settings.json` nem logs do usuário, e o app não foi executado; a causa dominante só se confirma com o HUD (Ctrl+Shift+D, linha `expressividade … bass x → y`).

| # | Causa | Nível | Evidência | Como confirmar |
|---|---|---|---|---|
| 1 | **Memória "Fixa/Lenta" persistida e inicializada com `val = 0`**: `locked` congela `bass/mid/treb` em 1,0 (ou satura em 4,0); `slow` parte frio e fica saturado dezenas de segundos | EVIDÊNCIA de código + SIMULAÇÃO (não medido no app) | [`expression.ts#L74-L88`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/expression.ts#L74); persistência em [`state.ts#L285-L289`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/core/state.ts#L285); script `sim_expression_locked.js` nas notas | HUD: se `bass` mostra `1.00 → 1.00` fixo com música tocando, é isto. Alternar Memória para `normal` e voltar deve destravar |
| 2 | **Natureza relativa do motor** + hábito (constante desde o spike `d22b439`) | EVIDÊNCIA (documentada no repo: spec 015, DECISIONS) | Constantes idênticas 2.6.7 × 3.0.0-beta.5 | HUD: com música estável, `bass` ≈ 1 é esperado; comparar em trecho com variação |
| 3 | **Fim do ganho "tocável" e reset do ganho a cada abertura**: as teclas +/− deixaram de mexer no ganho ([`c8d2147`](https://github.com/atempel/sonic-obsidian/commit/c8d2147)); ganho volta ao padrão 0 dB ([`683e8d0`](https://github.com/atempel/sonic-obsidian/commit/683e8d0)) | EVIDÊNCIA de commit/decisão; impacto maior em faixas baixas | Relatos de nível baixo desde a spec 005; [queue de ganho automático](https://github.com/atempel/sonic-obsidian/blob/3e9c620/queue/2026-11-10-nivel-ganho-automatico.md): faixas dos anos 90 pedem +6 dB | HUD: medidor de nível; testar +6 dB em faixa baixa |
| 4 | **Silêncio/ruído de fundo**: o app considera silêncio só abaixo de −66 dBFS RMS, mas o motor lê oscilação de ±1 LSB abaixo de −42 dBFS de pico e a normaliza por `longAvg` | HIPÓTESE (explica "pulsar falso", não a perda com música) | [`silence.ts#L8`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/silence.ts#L8) + derivação | Pausar o Spotify e observar `imm/longAvg` no HUD; verificar se o loopback entrega zeros exatos ou ruído |
| 5 | **Presets novos 3.x e equações WASM** | HIPÓTESE; sem evidência de diferença nos níveis | Migração [`9195dcf`](https://github.com/atempel/sonic-obsidian/commit/9195dcf): 395 → 472 presets, fps igual | Comparar o mesmo preset em 2.6.7 e 3.x com a mesma faixa |
| 6 | **Respiro** (`Shift+Enter`): `longAvg` decai durante o Respiro e `val` pode disparar sem teto ao voltar, quando `level = 0` e `adaptation = normal` | HIPÓTESE | [`main.ts#L275-L279`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/main.ts#L275) | Acionar Respiro e ver `bass` no HUD |

**Descartadas com evidência:** suavização nova (não existe; `grep` só acha CSS), `smoothingTimeConstant` (0 no motor), ganho antes do motor (só reduz se negativo), adiantamento do beat (só desloca eventos de troca), mudança de constantes na migração (idênticas), fps 60 (taxas corrigidas por fps; `fpsLimit` padrão 60 vs. 180 Hz do monitor foi decisão por queda do driver).

**Lacunas que o HUD fecha:** HUD hoje mede `bass` antes/depois da Expressividade. Faltam `imm`, `longAvg` e o piso de ruído, que a investigação da fila ([`queue/2026-11-11-reacao-ao-audio.md`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/queue/2026-11-11-reacao-ao-audio.md)) pede. A fila já suspeita de que "Memória lenta/travada achata a reação", mas não identifica o mecanismo de inicialização.

## 4. Catálogo de funcionalidades

Legenda de status no repo: **feito**, **spec**, **fila**, **ideia**, **nada** (sem menção). "Fork?" = exige alterar o motor (vendorizar/forkar Butterchurn); "não" = dá para fazer no app, em ganchos já usados (`updateAudioLevels`, `render({audioLevels})`) ou em camadas fora do motor. Ganchos em internos do beta fixado são frágeis (decisão registrada: dependência fixada, `patch-package` como degrau seguinte).

### A. Análise de áudio e reatividade

| Item | O que é | De onde vem | Valor para reatividade/performance | Esforço | Fork? | Status no repo |
|---|---|---|---|---|---|---|
| A1 | **Corrigir inicialização da Memória** (não semear média com `val=0`; só semear com música) + teste de regressão | Defeito do próprio app | **Alto**, se o `settings.json` estiver em `locked/slow` | P | não | nada (mecanismo não identificado na fila) |
| A2 | **Padrões que façam o Caráter agir** (hoje `level 0` o deixa inerte) | Decisão de produto do app | Alto para percepção; é escolha, não técnica | P | não | nada |
| A3 | **AGC lento** (normalizar contra referência lenta; ataque rápido, soltura lenta; Normal/Vivid/Lazy) | [WLED](https://kno.wled.ge/advanced/audio-reactive/) | Médio: só vence 8 bits/clipping e faixas baixas; não muda a relatividade (inferência). Não achatar a dinâmica, senão se perde o contraste de drop | P-M | não | fila |
| A4 | **Gate de silêncio / squelch** alinhado ao que o motor lê (fechar a faixa entre −66 dBFS RMS e −42 dBFS de pico) | WLED (ganho, depois squelch) | Médio: remove "pulsar falso" | P | não | feito em parte (silêncio, spec 005/012) |
| A5 | **Áudio float** em vez de 8 bits | foo_vis_milk2 ([doc](https://jecassis.github.io/md2-docs/highlights/)); projectM 4 aceita float | Baixo-médio, mais em níveis baixos (não medido) | P-M | **sim**: `render({audioLevels})` também recebe bytes de 8 bits | nada |
| A6 | **Bandas e janela configuráveis** (bordas 200/4000 Hz do foo_vis_milk2; log-espaçadas do MD2; `longAvg` ~1,7 s em vez de ~4,2 s) | MD2, foo_vis_milk2 | Médio: janela mais curta = mais contraste em música estável. Suspeita nossa, não testada | P (constantes) | sim para mexer na constante; parcial via gancho (a verificar) | nada |
| A7 | **EQ de 16 bandas / "curva"** dentro da Expressividade (Plana/Graves/Médios/Agudos/Sorriso) | Design do app; SYQEL tem curva tipo EQ | Médio-alto: dá controle por faixa de frequência | M | não (gancho de `updateAudioLevels`) | ideia (design `42d3`, sem spec; spike do gancho no 3.x pendente) |
| A8 | **Variáveis novas** `bass_smooth`, `vol_smooth`, `vis_intensity` | [Milkwave 3.0/3.1](https://github.com/IkeC/Milkwave/blob/main/Changes.md) | Baixo para presets existentes (não as leem); alto só para presets novos/editados no Estúdio | P (adicionar em listas e uniforms) | **sim** | nada |
| A9 | **"Hits" por banda, "tempo guiado por volume", "intensity" de longa janela** | [Synesthesia](https://synesthesia.live/docs/ssf/audio_uniforms.html) (algoritmos internos não documentados; o cálculo seria nosso) | Alto se dirigir velocidade/troca/injeção do lado do app | M | não (host) / sim (para chegar ao preset) | nada |
| A10 | **BPM contínuo** (50-220) e fase | Synesthesia, NestDrop | Médio: base para velocidade por BPM e relógio de batida | M | não | feito em parte (beat tracker 70-180 BPM, spec 024); "batida principal" na fila |
| A11 | **Textura FFT / `get_fft(pos)`, `get_fft_hz`** com attack/decay | MD3 3.33; foo_vis_milk2; MDropDX12 | Médio: abre presets estilo "equalizador"; presets existentes não usam | M | **sim** (textura + sampler; conversor de shader pode precisar mudar, não verificado) | nada |
| A12 | **Alinhamento de waveform** (osciloscópio sem tremer) | MD2 `AlignWaves`; projectM `WaveformAligner` | Baixo para reatividade, bom para ondas | M | sim | nada |
| A13 | **Estrutura build / break / drop** (estado + "tensão" 0-1 + evento de drop) | Proposta nossa a partir de [Yadati et al. 2014](https://archives.ismir.net/ismir2014/paper/000297.pdf) e [drop-detector](https://github.com/felixmeyer6/drop-detector), ambos offline | **Alto** como diretor de velocidade, troca e brilho; risco: não há detector causal validado, será afinado por ouvido | M-G | não | nada |

Receita de A13 (toda **INFERÊNCIA**, a afinar): três envelopes por banda (rápido ~150 ms, médio ~2-3 s, lento ~15-30 s); **break** = sub-graves/graves abaixo de ~30-40 % da linha de base lenta por 1-2 batidas; **build** = inclinação positiva de agudos, centroide, densidade de onsets e planicidade durante/após o break, gerando "tensão" que só sobe (máximo com vazamento); **drop** = salto de graves ≥ 3-6× (+10 a +15 dB) em relação ao nível recente, junto de um kick, com refratário de 8-16 s. Um drop causal só é percebido quando já aconteceu; a antecipação vem do estado BUILD (pré-armar flash/vinheta). Descritores de apoio: centroide, fluxo espectral, rolloff, planicidade ([Meyda](https://meyda.js.org/audio-features)), normalizados por percentil em ~30 s. Estimativa de custo: FFT + 32 bandas + fluxo + envelopes bem abaixo de 1 ms por quadro em JS (estimativa, não medida).

Bibliotecas de tempo/beat: `realtime-bpm-analyzer` (AudioWorklet, só candidatos de tempo, sem fase) ([repo](https://github.com/dlepaux/realtime-bpm-analyzer)); Essentia.js é AGPL-3.0 ([repo](https://github.com/mtg/essentia.js)); BTrack é GPL v3, sem port JS encontrado ([repo](https://github.com/adamstark/BTrack)). Como o Sonic Obsidian é público, a licença precisa ser compatível, decisão sua. O app já tem beat tracker próprio, o que reduz a necessidade.

### B. Automação de troca de presets

| Item | O que é | De onde vem | Valor | Esforço | Fork? | Status |
|---|---|---|---|---|---|---|
| B1 | **Hardcut por limiar do MD3**: 1 = bass > 1,5 (0,2 s); 2-3-5 = treb > 2,9 (0,5/1/5 s); 4 = treb > 2,9 (3 s) e > 8; 6 = bass > 1,5 + preset branco se bass > 4,90; 7 = injeta efeito (treb > 2,9, 1,5 s) | [README do MD3](https://github.com/milkdrop2077/MilkDrop3/blob/main/README.md) | Alto, barato: usa `bass/treb` que o Butterchurn já expõe com a mesma semântica | P-M | não | nada |
| B2 | **Modos do foo_vis_milk2** (13, incl. Bass Blend ~0,95 s, Rhythmic ~0,23 s, 2/4 beats; limiar padrão 2,5; sensibilidade em runtime) | [md2-docs](https://jecassis.github.io/md2-docs/manual/) | Idem; modos por banda e por contagem de batidas | P-M | não | nada |
| B3 | **Troca a cada N compassos** (NestDrop 2-64; SYQEL 4-64) + segurar preset | NestDrop, SYQEL | Alto | já feito | não | **feito** (spec 024: 1/2/4/8/16 compassos, `Enter` segura, Respiro) |
| B4 | **"Volume Peak Trigger"** (esperar pico de grave dentro da janela de N batidas) | [NestDrop](https://nestimmersion.ca/assets/nestdrop_user_manual_V2x2.pdf) | Médio-alto: troca mais musical | P-M | não | nada |
| B5 | **Hardcut 7: injeção de efeito sem trocar preset** | MD3 3.31 (biblioteca de efeitos não documentada) | Médio; depende de definir os efeitos | M | possivelmente (efeito em shader) | nada |
| B6 | **Agenda/performance sincronizada** (presets programados sobre uma faixa; CSV no foo_vis_milk2) | foo_vis_milk2 | Médio (uso em shows) | M | não | fila/adiada |
| B7 | **Troca guiada pela estrutura** (preset novo no drop; calmo no break) | A13 | Alto, se A13 existir | P depois de A13 | não | nada |

Cuidado, **INFERÊNCIA**: as thresholds do MD3 funcionam porque `bass/treb` estão na escala "relativo à média longa"; se mudarmos a janela (A6) ou aplicarmos Expressividade, é preciso recalibrar. Também há divergência entre forks (limiar 1,5 no MD3, 1,75 no Milkwave/MDropDX12), sinal de que são afinados por ouvido ([MDropDX12 engine.cpp](https://github.com/IkeC/MDropDX12/blob/main/src/mDropDX12/engine.cpp)).

### C. Performance ao vivo

| Item | O que é | De onde vem | Valor | Esforço | Fork? | Status |
|---|---|---|---|---|---|---|
| C1 | **Controle de velocidade/tempo** (0,25×-2×) | NestDrop (Animation Speed global e por preset) | **Alto**: pedido do usuário | P (app) / P (motor) | não obrigatório; fork resolve melhor | fila |
| C2 | **Velocidade modulada por BPM / por volume** (relógios guiados por volume do Synesthesia) | NestDrop, Synesthesia | Médio-alto | M | não | nada |
| C3 | **Intensidade global** (`vis_intensity`, `vis_shift`) | Milkwave 3.1 (ajustável pelo Remote) | Depende de o preset ler; a Expressividade é a versão do app | P-M | sim, para chegar ao preset | feito em parte (Expressividade) |
| C4 | **Deslocamento global de matiz/saturação/brilho (HSV)** | Milkwave 3.3; foo_vis_milk2 (`colshift_*`) | Médio: muda a cara de qualquer preset ao vivo. Passe de pós-processo sobre o canvas (inferência) | P-M | não (pós-processo) | nada |
| C5 | **Controles momentâneos e modulação Strobe/LFO** (fonte: tempo, BPM, volume, banda) | NestDrop | Médio | M | não | nada |
| C6 | **MIDI** (mapeamento/learn; até 50 slots no Milkwave/MDropDX12; velocity acima de limiar = corte) | Milkwave, MDropDX12, NestDrop, Synesthesia | Alto para uso ao vivo; Web MIDI em Electron é viável (inferência, não verificada nas fontes) | M | não | nada (MCP planejado) |
| C7 | **OSC** | NestDrop Pro, Synesthesia Pro; OSC não aparece nos README do Milkwave/MDropDX12 | Médio (integração com outros softwares) | M | não | nada |
| C8 | **Tap tempo, Ableton Link, MIDI clock** | NestDrop | Médio | P (tap) / M | não | ideia/descartado por ora (DECISIONS 2026-11-10) |
| C9 | **Crossfader A/B** | NestDrop (decks), Milkwave | Alto no modo performance | M | não (se for entre camadas) | fila (design de vídeo/VJ) |
| C10 | **Sensibilidade em runtime** (ALT+↑/↓ no foo_vis_milk2) | foo_vis_milk2 | Alto | P | não | feito em parte (Nível −3…+3) |
| C11 | **Respiro, transições (corte/crossfade/varredura/plasma/radial)** | Spec 013, 024 | — | — | — | **feito** |

**Sobre C1 (velocidade):** o ponto de entrada já existe (`renderSafe(dt * speed)`, [`main.ts#L828`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/main.ts#L828)). O risco é de acoplamento: o motor faz `time += 1/fps` e deriva `fps` do mesmo `elapsedTime` (histórico de 120 quadros, amortecimento 0,93; [`calcTimeAndFPS`](https://github.com/jberg/butterchurn)). Multiplicar `elapsedTime` altera `fps`, logo as taxas de `avg/longAvg`, ou seja, **a reatividade passa a depender da velocidade escolhida** (inferência a partir de DECISIONS 005 e do código). Presets que integram por quadro (`frame`/`fps`) também não desaceleram só com `time`, como a própria fila aponta. No fork, `time += scale/fps` resolve em uma linha, mas afeta também `blendProgress` e a animação do título ([notas do motor](https://github.com/jberg/butterchurn), `renderer.js` ~382-418).

### D. Presets duplos (`.milk2`)

**Como funciona (secundária; engenharia reversa).** Um `.milk2` são dois presets MD2 completos mais um cabeçalho (`blending_pattern`, `blending_progress`, `blending_direction`, `random_1..5`) com blocos `[PRESET1_BEGIN]…[PRESET1_END]` e `[PRESET2_BEGIN]…[PRESET2_END]`, mais blocos opcionais de sprites ([MDropDX12 `engine_presets.cpp`](https://github.com/IkeC/MDropDX12/blob/main/src/mDropDX12/engine_presets.cpp)). Ele reusa a máquina de transição do MD2, mas **congela o progresso**: cada vértice da malha tem um peso de mistura `mix = clamp(a·progress + c, 0, 1)`, os shaders antigo e novo rodam, e formas/ondas dos dois presets são desenhadas ([MD2 `milkdropfs.cpp`](https://github.com/milkdrop2077/MilkDrop3/blob/main/code/vis_milk2/milkdropfs.cpp); [MDropDX12 `docs/Development.md`](https://github.com/IkeC/MDropDX12/blob/main/docs/Development.md)). Não é blend aditivo/multiplicativo entre dois quadros prontos; é crossfade espacial por padrão (30 padrões: zoom, side, plasma, cercle, snail, clock, nuclear, cross2…). Custo: ~2× de trabalho de shader (comentário do próprio MD2). Nada é intrinsecamente DirectX: é matemática de malha em CPU e alpha blending. O código atual do MD3 **não é público**; o `code/` do repo é da era BeatDrop/MD2. Detalhes de 26 dos 30 padrões não estão verificados.

| Item | O que é | De onde vem | Valor | Esforço | Fork? | Status |
|---|---|---|---|---|---|---|
| D1 | **Mistura fixa de dois presets** (progresso congelado) com um dos 4 padrões já existentes | MD3 `.milk2`; Butterchurn já faz a renderização dupla na transição | Alto visualmente (mais riqueza por preset); não muda reatividade | M | **sim, provavelmente**: parar de limpar `blending` e expor um setter; qualidade precisa ser checada, pois a mistura foi desenhada como transição (easing em cosseno, fade das formas antigas) | nada |
| D2 | **Mais padrões de mistura** (30 no MD3) | MD3 3.21 | Médio (variedade); exige geradores de `(a,c)` por padrão; MDropDX12 mesmo lançou aproximações antes de "acertar os trinta" | M-G | sim | nada |
| D3 | **Ler `.milk2`** (dois blocos + cabeçalho) e converter cada preset | Importador `.milk` já existe (spec 022: 463/504 fontes oficiais) | Médio | M | não | nada |
| D4 | **Criar/salvar misturas** (UI de mixer, salvar com crédito) | MD3 (F9, `s`, `p/P/o/u/U/b/B`) | Médio; combina com Estúdio P1 | M | não | nada |
| D5 | **Transição suave entre `.milk2`** | MD3 3.33 ("a coding nightmare" nas palavras do autor) | Baixo agora | G | sim | nada |
| D6 | **Mashup profundo** (recombinar seções de presets) | MD3 (`a`, `z`) | Baixo-médio; autor avisa instabilidade | G | sim | nada |

Nota de licença, **INCERTA**: no Wikipedia o MilkDrop é descrito como BSD-3, mas os metadados do repo do MD3 não mostram licença; o MDropDX12 é CC BY-NC 4.0 (não comercial). Reimplementar o *formato* a partir da descrição pública é diferente de copiar código; a decisão e a checagem jurídica são suas. Existem presets MD3 com cache de shader (`MD31=`/`MD32=`) que não se reproduzem a partir do texto (51 de 933 na pasta presets1 do MD3, segundo MDropDX12 `state.h`).

### E. Vídeo e camadas

**Como as ferramentas fazem.** O NestDrop não carrega arquivo de vídeo; recebe fluxos por Spout/NDI e os trata como sprites sobre o deck, com modos de mistura (0 Blend, 1 Decal, 2 Additive, 3 SrcColor ≈ Screen, 4 ColorKey), sliders de Alpha e LumaKey e Strobe/LFO ([manual V2](https://www.nestimmersion.ca/assets/nestdrop_user_manual_V2.pdf), pp. 21-23, 44-47). O Milkwave v3.5 mistura a saída com webcam ou fontes Spout, com ordem de camadas e blend modes ([Changes.md](https://github.com/IkeC/Milkwave/blob/main/Changes.md)); o MDropDX12 aceita webcam e arquivo de vídeo com luma key como fundo ou overlay ([README](https://github.com/IkeC/MDropDX12)). O vocabulário de camadas do Resolume (Alpha, Add, Screen, Multiply, Difference, Luma Key, AlphaCut para strobe) é a referência comum ([Resolume](https://resolume.com/support/en/blend-modes)).

| Item | O que é | De onde vem | Valor | Esforço | Fork? | Status |
|---|---|---|---|---|---|---|
| E1 | **Compositor de camadas fora do motor**: canvas Butterchurn + até 2 clipes em WebGL 2, com modos Alpha/Add/Screen/Multiply/Luma key/Chroma key | NestDrop, Resolume; design do app (`v3-video-vj.md`) | Alto para uso VJ; independe de reatividade do motor | M-G | **não** | fila/design aprovado como direção, sem spec (spike de custo pedido: 2 vídeos 1080p + MilkDrop 1440p a 60 fps) |
| E2 | **Vídeo reativo ao áudio** (opacidade ← graves com ataque rápido e soltura lenta; velocidade ← BPM; corte no beat) | NestDrop modula sliders por BPM/volume/banda; as demais são **propostas nossas, não verificadas em nenhuma ferramenta** | Alto | M | não | fila ("Reação ao áudio" por camada no design) |
| E3 | **Vídeo como sampler dentro do preset** (o feedback do warp carrega o vídeo) | MD3 3.35 (webcam Deep/Top, GIF como textura) | Alto visualmente; os presets precisam ser escritos para isso | M | **sim**: mapear um `sampler_` a uma textura viva exige patch no renderer; como o Butterchurn lê texturas **não foi verificado** | nada |
| E4 | **Imagens/sprites e overlay de texto** (5 camadas, 11 blend modes no MD3; até 256 imagens no NestDrop) | MD3 3.24-3.26; NestDrop | Médio | M | não (se overlay) | nada |
| E5 | **Spout/NDI de entrada ou saída** | NestDrop, Milkwave, BeatDrop | Alto no mundo VJ; Windows; receber Spout no Electron exigiria addon nativo (sem receptor pronto encontrado) | G | não | nada |
| E6 | **Crossfader A/B entre cenas** | NestDrop, SYQEL | Alto | M | não | fila |

**Técnica (inferência, não medida).** Caminho por quadro: `<video>` mudo em loop → `texImage2D` a cada quadro, com `requestVideoFrameCallback` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)) para sincronizar. Codec para loops embarcados: WebM VP9/AV1 (abertos). H.264 só depois de confirmar que o Electron do app o toca; há indício de que o ffmpeg padrão do Electron exclui codecs proprietários, mas a documentação do Electron não foi consultada para isso. HAP exigiria demuxer próprio (suposição). Loops precisam ser pré-codificados com costura limpa.

**Licenças para conteúdo embarcado (app MIT).** Obras de 1930 entraram em domínio público nos EUA em 1/1/2026, pela regra de 95 anos ([Smithsonian](https://www.smithsonianmag.com/arts-culture/happy-public-domain-day-to-all-who-celebrate-you-can-now-use-betty-boop-nancy-drew-and-the-maltese-falcon-for-free-180987927/)); só a versão de 1930 de Betty Boop entrou. Personagens, trilhas e versões posteriores podem continuar protegidos ([Cartoon Brew](https://www.cartoonbrew.com/classic/hundreds-of-cartoons-from-1926-have-just-become-public-domain-212423.html)). O Internet Archive não garante o status de direitos dos itens ([ajuda](https://help.archive.org/help/rights/)). Os VJ loops gratuitos do Beeple são descritos como Creative Commons "para QUALQUER uso", sem versão da licença informada ([Gumroad](https://beeple.gumroad.com/l/GnDA)). CC BY-NC-SA exige atribuição, proíbe uso comercial e impõe ShareAlike ([deed](https://creativecommons.org/licenses/by-nc-sa/4.0/)). **Sugestão** (não é conselho jurídico): o app não embarca vídeo; oferece carregador de arquivos do usuário e um script opcional de download com manifesto por item (fonte, licença, data); embarcar só CC0/domínio público ou CC BY com arquivo de créditos.

### F. Estúdio e criação

| Item | O que é | De onde vem | Valor | Esforço | Fork? | Status |
|---|---|---|---|---|---|---|
| F1 | **Editar equações com prévia** (`per_frame_init/per_frame/per_pixel`), validação em Worker | App | — | — | não | **feito** (spec 026, PR #79) |
| F2 | **Estúdio P1**: sliders de `baseVals`, Ondas/Formas, histórico, comparar com original, shaders, exportar `.milk` | App | Alto: dá parâmetros ao vivo por preset | M | não | **spec** (027, issue #75; "próximo" no TASKS) |
| F3 | **q1-q64** (MD2 tem q1-q32) | MD3 3.0 | Baixo: só importa para presets feitos para o MD3; Butterchurn usa q1-q32 | M | sim | nada |
| F4 | **16 formas e 16 ondas** (MD2/Butterchurn: 4+4, pools fixos no código), 8 waveforms novas (equações não documentadas), formas até 500 lados | MD3 | Médio, mais no Estúdio | M | sim | nada |
| F5 | **Variáveis de mouse** (`mouse.x/y/z/w`, presets marcados [MOUSE]) | MD3 3.33; BeatDrop (Incubo) | Baixo-médio (performance interativa) | P-M | sim (uniform) | nada |
| F6 | **Randomizar cores (`c/C`)** | MD3 | Baixo: depende de linha-marcador `//MilkDrop3 Color Mode:` que só presets MD3 têm; o HSV global (C4) cobre o uso | P | não | nada |
| F7 | **Editor de shader com autocompletar, mashup, busca/substituição, injeção de Q** | MD3 MilkPanel 3.31/3.33 | Médio | M-G | não | spec (shaders em P1) |

## 5. Motor: fork, patch em runtime ou trocar?

### 5.1 Fatos sobre o Butterchurn 3

O núcleo é pequeno (~2.500 linhas), em JS/WebGL 2, MIT ([repo](https://github.com/jberg/butterchurn)). Áudio isolado em 3 arquivos pequenos; caminho fixo de 8 bits; sem textura de áudio; relógio único `time += 1/fps`. Manutenção: beta.5 publicada em 2025-07-13 após lacuna de 4 anos (beta.0-4 em 2021); 16 commits desde 2025-01-01, a maioria de CI/testes; sem versão estável 3.0.0; zero issues abertas e criação restrita no repo (visto numa página sem login; a API do GitHub estava bloqueada). Testes são de regressão visual (jest + puppeteer), reutilizáveis num fork. O app hoje não faz fork nem `patch-package`; usa ganchos em `updateAudioLevels`, `blendPattern.createBlendPattern`, `*Shader.createShader` e um patch global em `WebGL2RenderingContext.prototype.shaderSource` ([`engine-fixes.ts`](https://github.com/atempel/sonic-obsidian/blob/3e9c620/src/renderer/src/engine-fixes.ts#L181)).

### 5.2 Opções

| Opção | O que significa | Esforço | Prós / riscos |
|---|---|---|---|
| **A. Patch em runtime** (continuar como hoje) | Envolver instâncias (`updateAudioLevels`, `render`) e alimentar bytes próprios via `render({audioLevels})` | P | Rápido, bom para protótipo (EQ, AGC, A13, velocidade). **Frágil** num bundle beta fixado; não entrega float real nem `time` desacoplado; relógio e `fps` seguem acoplados |
| **B. Vendorizar/forkar o Butterchurn 3 (MIT)** | Copiar `src/` ou forkar; mexer em `audio/`, variáveis, `time`, uniforms | P-M | Áudio float, 576 amostras, bandas log, alinhamento de onda, `time` próprio, variáveis novas: mudanças contidas. Você assume a manutenção, mas o upstream está quieto. Testes visuais vão mudar (esperado) |
| **C. Fork + trabalho maior de renderer** | Mais formas/ondas, textura FFT/vídeo, mistura fixa e padrões, converter de presets | M-G | Depende também do repo do conversor de presets (não inspecionado). WebGPU: sem base existente, G |
| **D. projectM 4 em WASM** | libprojectM via Emscripten | G | Build existe, mas só como exemplo básico (SDL, GLES3, sem threads, 5 estrelas); sem npm/demo mantido; mas ativo (último commit 2026-10-13) e aceita PCM float; **LGPL-2.1** (implicações para WASM estático não pesquisadas) |
| **E. projectM nativo em addon Node** | Addon C++ com contexto GL próprio | G | Sem binding pronto; readback ou janela separada |
| **F. Motor DirectX (MD3/MDropDX12/BeatDrop) via Spout** | Processo separado | M integração, perde controle | Traz `.milk2`, 16 formas/ondas prontos; Windows; UI e presets fora do app; MDropDX12 é CC BY-NC 4.0, MD3 sem licença declarada no repo; sem API de embutir |
| **G. Tauri no lugar de Electron** | Troca de casca | M | Sem ganho de GPU no Windows (ambos usam Chromium/ANGLE); só tamanho/RAM; WebKit em macOS/Linux é risco para o Butterchurn |

([projectM](https://github.com/projectM-visualizer/projectm), [examples-emscripten](https://github.com/projectM-visualizer/examples-emscripten), [MDropDX12](https://github.com/IkeC/MDropDX12), [issue Tauri #5889](https://github.com/tauri-apps/tauri/issues/5889), [ANGLE](https://chromium.googlesource.com/angle/angle/+/main/README.md).) Não encontramos portagem WebGPU de MilkDrop nem receptor de Spout pronto para Electron.

### 5.3 Recomendação (opções para você decidir)

**Opção recomendada pela evidência:** A agora, B quando um item da lista exigir. Os itens que mais mexem na reatividade percebida (A1-A4, A7, A9, A13, B1-B4, C1) cabem em A. B passa a compensar quando você quiser A5 (float), A6 (bandas), A8/A11 (variáveis e textura FFT), C1 limpo (relógio desacoplado), D1 (mistura fixa) e E3 (vídeo como sampler). Reserve D/F para uma decisão futura, **se o teto for o conjunto de recursos do Butterchurn** (16 formas/ondas, `.milk2` completo, presets "ShaderToy-like" do MD3), não velocidade nem reatividade. Alternativa a considerar: se a identidade do produto for "VJ completo com `.milk2` e Spout", a rota F é mais curta, ao custo de abrir mão do app Electron como casca única.

### 5.4 Performance do stack Electron/WebGL

**Inferência a partir do código, sem medição:** o gargalo provável é **preenchimento de GPU** (warp + comp + 3 passes de blur + `generateMipmap` do quadro anterior, a `pixelRatio × textureRatio`) e **CPU** (equações por pixel numa malha 48×36, WASM), não a tradução do ANGLE; MilkDrop emite poucas chamadas de desenho por quadro. O que perfilar, em ordem:

| Medida | Por quê |
|---|---|
| Tempo de quadro GPU vs CPU por preset, em tela cheia, com `pixelRatio` 1 vs 2 | Separa fill-rate de CPU |
| Custo do salto `OffscreenCanvas` → `drawImage` em canvas 2D a cada quadro | Pode sair do caminho de GPU se mal configurado (o upstream tem commit "force canvas willReadFrequently false to force GPU usage") |
| fps 60 vs taxa do monitor (180 Hz na máquina do usuário) | O repo já registra queda de driver a 180 Hz (DECISIONS 2026-11-08); `fpsLimit` padrão é 60 |
| Flags de GPU do Electron, throttling em segundo plano | Riscos baratos de checar |
| Malha, FXAA, textura (opções "Renderização" já existem) | Compromisso de qualidade × custo |
| Se houver vídeo: 2 vídeos 1080p + MilkDrop 1440p | É o spike que o próprio design pede |

Não achamos benchmark comparando Electron, WebView2 e nativo para shaders pesados.

## 6. Caminho sugerido (sugestão, não plano fechado)

| Fase | Foco | Itens do catálogo | Critério de saída |
|---|---|---|---|
| **0. Diagnóstico e correções baratas** | Confirmar a causa e remover o suspeito | Ler o HUD (Ctrl+Shift+D) com `settings.json`; A1 + teste; decidir A2; estender o HUD com `imm`, `longAvg`, ruído; A4 | `bass` varia com música em `normal`, `slow` e `locked`; o Caráter é perceptível com os novos padrões |
| **1. Base de áudio** | Reatividade com contraste | A3 (AGC), A7 (EQ), A9 (hits/intensity), A10 (batida principal), A13 em versão v1 (estado + tensão); B1/B2/B4 | A mesma faixa mostra diferença clara entre break e drop; preset troca no drop sem falso positivo em 3 faixas de teste |
| **2. Performance ao vivo** | Tocar a visualização | C1/C2, C4, C6 (MIDI), C9; ponto de decisão do fork (B) se C1 ou variáveis novas exigirem | Sessão de teste ao vivo sem tocar no teclado do app |
| **3. `.milk2` e vídeo** | Riqueza visual | D3, D1, D4; E1/E2 (após o spike de custo), depois E3 | Spike de 2 vídeos 1080p + preset 1440p a 60 fps medido; 10 misturas salvas |

Em paralelo, **o perfil de performance (5.4)** deve rodar na Fase 0 para evitar investir no motor errado.

**Decisões que dependem de você:**
1. O `settings.json` está em `locked`/`slow`? (o HUD responde)
2. Os novos padrões devem ligar a Expressividade (`level ≠ 0`) por padrão?
3. A estrutura build/break/drop entra no escopo? Tolera detecção afinada por ouvido, sem validação acadêmica?
4. Aceita comparar janela de `longAvg` mais curta (A6) como teste A/B?
5. Fork do Butterchurn (B) agora, ou só quando um item exigir?
6. `.milk2`: prioridade ou luxo? Aceita o risco de formato reverso-engenheirado e de licença incerta?
7. Vídeo: compositor fora do motor (E1) ou vídeo dentro do preset (E3)? Embarcar clipes ou só carregador de usuário?
8. MIDI/OSC entram agora ou depois do Estúdio P1?
9. Licença do app (MIT) vs dependências AGPL/GPL (Essentia.js, BTrack) se for usar beat/onset de terceiros.

## 7. Lacunas e incertezas

- **Não rodamos o app** (Electron/Windows/WASM). As simulações reimplementam a lógica em Node. Não temos `settings.json` nem logs do usuário.
- Não medimos reatividade por preset (472) nem 2.6.7 × 3.0 com áudio real; não verificamos o loopback do Windows com Spotify pausado (zeros exatos ou ruído).
- Não foi encontrado onde o MD2 original deriva `bass/bass_att` a partir de `imm_rel`/`avg_rel` (UNVERIFIED); a constante de `long_avg` do original (0,96 a 14 fps) vem do código lido, mas a ligação final não foi localizada. Mapeamento em Hz do FFT do projectM (512 bins em 0-22 ou 0-11 kHz) não rastreado.
- **MD3:** o código atual não é público; `.milk2` e hardcut detalhados vêm do README e de engenharia reversa do MDropDX12 (que cita descompilação de uma build "MD3 PRO", termo não definido). Datas conflitantes do repo (último push 2024-12 vs. README com v3.37 em 2026-09); a página de Releases do GitHub é inconsistente. Nomes e equações das 8 waveforms novas, biblioteca de efeitos injetados, atenuação/decay do `get_fft` e mashup profundo não estão documentados.
- **Outros motores:** algoritmos internos de hits/presence/intensity do Synesthesia não documentados; não encontramos documentação do Synesthesia sobre drops; Magic Music Visuals, Plane9, Splodelab e TouchDesigner não verificados; changelog do foo_vis_milk2 não lido (só Highlights e Manual); o repo original do BeatDrop (Volskiy) não abriu; OSC no Milkwave/MDropDX12 não verificado.
- **Estrutura musical:** não existe detector causal publicado de build/break/drop; Yadati et al. (F1 0,61 com tolerância de 3 s; 0,71 com 15 s) e drop-detector são offline. A receita de A13 é nossa e precisa de afinação. Faltam dados de latência do loopback WASAPI no Electron e benchmark de Essentia.js/Meyda.
- **Vídeo:** como o Butterchurn carrega texturas (sampler) não foi verificado (leitura do `src/` foi bloqueada neste ponto); desempenho de upload de vídeo em Electron não medido; codecs padrão do Electron não confirmados na documentação; HAP em navegador sem fonte; versão da licença CC dos loops do Beeple não informada.
- **Motor:** nenhum benchmark Electron × nativo; esforços são estimativas a partir de código, sem protótipo; implicações da LGPL-2.1 para uma build WASM do projectM não pesquisadas; Spout em Electron não pesquisado em profundidade.
- Não lemos integralmente as specs 002, 003, 006-010, 014, 016-020, 023, nem `architecture.md`/`PRD.md`, nem as issues abertas do GitHub do app.

## 8. Fontes

Repositório do app
- https://github.com/atempel/sonic-obsidian (commit `3e9c620`; `expression.ts`, `state.ts`, `silence.ts`, `main.ts`, `engine-fixes.ts`; `DECISIONS.md`; `queue/2026-11-11-reacao-ao-audio.md`; `queue/2026-11-10-nivel-ganho-automatico.md`; specs 005, 011, 013, 015, 022, 024, 026, 027)

Butterchurn, MilkDrop 2, projectM
- https://github.com/jberg/butterchurn
- https://unpkg.com/butterchurn@2.6.7/lib/butterchurn.js
- https://unpkg.com/butterchurn@3.0.0-beta.5/dist/butterchurn.js
- https://github.com/wacup/vis_milk2
- https://github.com/projectM-visualizer/projectm
- https://github.com/projectM-visualizer/examples-emscripten
- https://webaudio.github.io/web-audio-api/ (formato de `getByteTimeDomainData`)

MilkDrop 3 e família
- https://github.com/milkdrop2077/MilkDrop3 (README, linux/README, `code/vis_milk2/`)
- https://en.wikipedia.org/wiki/MilkDrop
- https://github.com/IkeC/MDropDX12 (e https://github.com/shanevbg/MDropDX12)
- https://github.com/IkeC/Milkwave (Changes.md)
- https://jecassis.github.io/md2-docs/highlights/ e https://jecassis.github.io/md2-docs/manual/ (foo_vis_milk2)
- https://github.com/OfficialIncubo/BeatDrop-Music-Visualizer
- https://www.softpedia.com/progChangelog/BeatDrop-Music-Visualizer-Changelog-268963.html
- https://spout.discourse.group/t/my-beatdrop-improvement-now-has-spout-integration/541
- https://github.com/mvsoft74/BeatDrop

VJ e outros motores
- https://nestimmersion.ca/assets/nestdrop_user_manual_V2x2.pdf e https://www.nestimmersion.ca/assets/nestdrop_user_manual_V2.pdf
- https://nestimmersion.ca/nestdrop
- https://synesthesia.live/docs/ssf/audio_uniforms.html
- https://synesthesia.live/docs/manual/osc.html
- https://synesthesia.live/docs/faq/midi_osc.html
- https://resolume.com/support/en/blend-modes
- https://docs.webamp.org/docs/features/mikdrop

Análise de áudio e estrutura musical
- https://meyda.js.org/audio-features
- https://kno.wled.ge/advanced/audio-reactive/
- https://fastled.io/docs/d3/d40/classfl_1_1_audio_reactive.html
- https://github.com/LedFx/LedFx/blob/main/ledfx/effects/audio.py
- https://archives.ismir.net/ismir2013/paper/000175.pdf (SuperFlux)
- https://archives.ismir.net/ismir2014/paper/000297.pdf (Yadati et al., drops)
- https://github.com/felixmeyer6/drop-detector
- https://github.com/dlepaux/realtime-bpm-analyzer
- https://github.com/mtg/essentia.js
- https://github.com/adamstark/BTrack

Vídeo, plataforma e licenças
- https://geisswerks.com/milkdrop/milkdrop_preset_authoring.html
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
- https://chromium.googlesource.com/angle/angle/+/main/README.md
- https://github.com/tauri-apps/tauri/issues/5889
- https://www.smithsonianmag.com/arts-culture/happy-public-domain-day-to-all-who-celebrate-you-can-now-use-betty-boop-nancy-drew-and-the-maltese-falcon-for-free-180987927/
- https://www.cartoonbrew.com/classic/hundreds-of-cartoons-from-1926-have-just-become-public-domain-212423.html
- https://help.archive.org/help/rights/
- https://beeple.gumroad.com/l/GnDA
- https://creativecommons.org/licenses/by-nc-sa/4.0/
- Documento do projeto `claude/analise-competidor-syqel.md` (SYQEL; fontes originais não reverificadas)

---

## Conferido no repo (sessão de 2026-11-11, Claude Code)
- **A1 confirmado por leitura** de `src/renderer/src/expression.ts` e do bundle `node_modules/butterchurn/dist/butterchurn.js` (`AudioLevels.updateAudioLevels`): o motor começa com `longAvg = 1` e no quadro 0 faz `longAvg = 0,9·1 + 0,1·imm`. Em silêncio, `imm = 0` dá `val = 0`, e a Expressividade semeia a média própria com `imm = 0`. Com `adaptation = 'locked'` a média nunca mais muda, e `l < 0,001` devolve `val = 1` em todo quadro. Com música no quadro 0, a semente é a `longAvg` do motor ainda em aquecimento (≈ 0,9 + 0,1·imm), longe da média real, o que pode saturar. A instância expõe `longAvg` direto (`levels.longAvg`), então a correção pode semear dela e só depois do aquecimento (quadro ≥ 50) e com som.
- **A2 confirmado:** padrão `{ level: 0, curve: 'b', adaptation: 'normal' }` em `core/state.ts`; o Caráter só age com `level ≠ 0`.
- Não rodado no app. Plano em [spec 028](../../specs/028-reatividade-ganho-automatico.md).
