# 028 — Reação ao áudio: corrigir a Memória, medir de verdade e ganho automático

**Fase:** 3 · **Status:** Planejada (perguntas em aberto) · **Issue:** [#81](https://github.com/atempel/sonic-obsidian/issues/81) · **Personas:** Nostálgico do Winamp, DJ de Festa, Streamer de Set, Anfitrião de Ambiente ([personas](../research/mercado/personas.md)) · **Depende de:** [015](015-expressividade.md), [005](005-sinal-entrada.md)

## Problema
Relatos do usuário (2026-11-10/11, Windows, Spotify):
1. o visual reflete o áudio "cada vez menos";
2. no silêncio, os efeitos seguem pulsando "como se fosse falso";
3. o nível varia muito de faixa para faixa (anos 90 pedem +6 dB);
4. o Caráter (`X`) quase não se nota.

A pesquisa [destravar a reatividade](../research/reatividade/2026-11-11-destravar-reatividade.md) (feita pelo usuário com o Cowork e conferida no código nesta sessão) aponta as causas, em ordem:
- **Defeito na Memória (confirmado no código):** em Longa/Fixa, a média própria da Expressividade é semeada **uma vez**, com `imm/val` do motor. Se o primeiro quadro chega em silêncio (`val = 0`), a semente é `imm = 0`. Com Memória Fixa, `bass/mid/treb` ficam em **1,00 para sempre**. Com música no quadro 0, a semente sai da média do motor ainda em aquecimento, e a leitura satura em 4. A Memória é salva e relida a cada abertura, e o app abre quase sempre antes da música.
- **Padrão inerte:** `level: 0` desliga o Caráter (a curva só age com `level ≠ 0`).
- **Natureza relativa do motor** (`bass = agora ÷ média de ~4 s`): música estável lê ~1. É projeto do MilkDrop. O ganho não muda isso, mas vence o passo de 8 bits em faixas baixas.
- **Faixa cega no silêncio:** o app só chama de silêncio abaixo de −66 dBFS RMS. Entre isso e ~−42 dBFS de pico, o motor normaliza ruído de ±1 LSB pela média e o transforma em pulso (hipótese).

Sem regressão no caminho de áudio: as constantes do motor são iguais nas versões 2.6.7 e 3.0, sem suavização nova.

## Proposta
Três passos, nesta ordem e no mesmo gancho de hoje (`audioLevels.updateAudioLevels`, sem fork):
1. **Corrigir** a Memória e cobrir com teste.
2. **Medir** o que o motor lê, no HUD.
3. **Ganho automático (AGC)** lento antes do motor, com o ganho manual como ajuste fino.

Cada passo tem critério próprio e pode ser entregue separado.

## Escopo
**P0 — corrigir e medir**
- **Semente da Memória:**
  - a média própria nasce da `longAvg` do motor (`levels.longAvg`, exposta na instância), não de `imm/val`;
  - só depois do aquecimento do motor (quadro ≥ 50) e com som (`imm` acima do piso);
  - antes disso, `val/att` passam como o motor entrega.
  - **Fixa** congela a média na primeira semente válida e de novo ao ser escolhida (como na 015).
  - **Longa** nunca parte de 0.
  - Ao voltar do silêncio longo, que o app já detecta (`SilenceState.resting`), a Memória Longa não reaproveita uma média de minutos atrás: semeia de novo.
- **Silêncio (squelch):** com `SilenceState.resting`, a Expressividade entrega `bass/mid/treb` neutros (1) em vez de ruído normalizado, sem mudar o relógio que já desacelera. O limiar do medidor continua o mesmo; o piso de `imm` usado na semente é medido no Windows (P0 do HUD) antes de ser fixado.
- **Respiro:** ao voltar do `Shift+Enter`, a mesma regra de nova semente; `val` limitado a 0–4 também com `level = 0` (hoje só a curva limita).
- **HUD (`Ctrl+Shift+D`), linha de áudio:**
  - `imm`, `longAvg` do motor e da Memória, `bass` antes → depois;
  - RMS em dBFS e pico em dBFS antes do ganho;
  - ganho em vigor (manual + automático).
  - Serve para o usuário confirmar a causa no Windows antes e depois.
- **Log:** uma linha por abertura com a Expressividade carregada (`level/curve/adaptation`) e, a cada 5 min (junto da memória), `bass` médio e desvio. Assim, "reagindo pouco" vira número no `sonic-obsidian.log`.
- **Teste headless** `028-expressividade.test.cjs`: transpila `expression.ts` (como a 026 faz com `mine.ts`) e roda o gancho sobre um `audioLevels` falso com a fórmula do motor.
  - Casos: abrir em silêncio e depois música, em Curta/Longa/Fixa (desvio de `bass` > 0,1 com música);
  - abrir com música (sem saturar em 4 por mais de 2 s);
  - silêncio → neutro;
  - Respiro e volta.

**P1 — ganho automático (AGC)**
- **Onde:** um `GainNode` antes do motor, depois do medidor de silêncio e da detecção de batida (que seguem medindo antes de qualquer ganho).
- **Como:**
  - mede RMS numa janela de ~10 s e mira uma referência (a definir no Windows, perto do nível de uma faixa atual masterizada);
  - ataque de ~1 s para baixar, soltura de ~8 s para subir, e teto de +12 dB;
  - congela no silêncio e no Respiro, para não "bombear" em breaks.
  - Não comprime: não achata a dinâmica dentro da faixa, porque o contraste do drop é o que move o visual.
- **Manual:** o ganho dos Ajustes rápidos vira **ajuste fino** de −6 a +6 dB sobre o AGC; desligado o AGC, volta a ser o ganho de hoje.
- **Estado:** `settings.autoGain: boolean` (padrão: pergunta 2) e comando `audio.autoGain`.
- **Interface:** item "Ganho automático" nos Ajustes rápidos, junto do Ganho, e em Configurações › Áudio, com o valor aplicado em mono ("auto +5 dB"). Não há desenho: ver Referências.
- **Teste no simulador** (`tests/sim/`): a mesma faixa a −20 e a −8 dBFS chega ao motor com ≤ 2 dB de diferença em 15 s, e um break de 8 s não sobe o ganho mais de 3 dB.

**P1 — janela curta (teste A/B)**
- Uma Memória "Viva" (~1,7 s, a do MilkDrop 2) como 4ª opção do `Shift+X`, calculada no gancho.
- Serve para comparar no Windows se dá mais contraste em música estável. Fica ou sai depois do teste.

## Fora de escopo (fila: [queue/2026-11-11-pesquisa-reatividade-roadmap.md](../../queue/2026-11-11-pesquisa-reatividade-roadmap.md))
- Curva de 16 bandas da Expressividade (design `v3-reatividade.md`): spec própria, depois desta.
- Estrutura build/break/drop e troca guiada por ela.
- Hardcut por limiar (MD3) e "Volume Peak Trigger".
- Controle de velocidade (queue própria; o acoplamento `time`/`fps` descrito na pesquisa vai para ela).
- Batida principal.
- Áudio float, bandas novas e variáveis novas, que exigem fork do motor. Também `.milk2`, vídeo, MIDI/OSC e perfil de GPU.

## Critérios de aceite (no Windows, com o build do CI)
1. **Antes de instalar o build novo:** o HUD do build atual mostra a Memória salva e `bass x → y`. O resultado é anotado na issue: confirma ou descarta a causa 1.
2. Abrir o app **com o Spotify pausado** e Memória Fixa, dar play: `bass` (depois) varia com a música em ≤ 5 s. Desvio visível no HUD; nada de `1.00 → 1.00` fixo. O mesmo em Longa e Curta.
3. Abrir **com música tocando** em Fixa: `bass` não fica em 4,00 por mais de 2 s.
4. Pausar a música: em ≤ 4 s `bass/mid/treb` (depois) ficam em 1,00, sem pulso que siga o ruído. O relógio desacelera como hoje.
5. Respiro (`Shift+Enter`) e volta: sem `bass` acima de 4 nem travado.
6. HUD mostra `imm`, `longAvg`, RMS/pico em dBFS e ganho em vigor; o log tem a linha da abertura e a amostra de 5 min.
7. (P1) Com AGC ligado, "Children (Dream Version)" (Robert Miles) e uma faixa atual alta chegam ao motor com nível parecido (HUD, ≤ 3 dB de diferença em 15 s). Num break, o ganho não sobe mais de 3 dB.
8. (P1) Memória Viva: o usuário compara com Curta em 2 faixas estáveis e decide se fica.
9. `npm run typecheck` e `npm run test:ui` passam; fps igual ao de antes no HUD (o gancho e o AGC custam < 0,1 ms por quadro).

## Perguntas em aberto
1. **Padrões da Expressividade:**
   - ligar o Nível em +1 por padrão (o Caráter passa a agir sem ninguém mexer) ou manter 0?
   - a Memória continua salva entre aberturas (como hoje) ou volta para Curta ao abrir, como o ganho?
2. **AGC:** ligado por padrão? O ganho manual vira ajuste fino (±6 dB) ou continua com a faixa de hoje somada ao automático?
3. **Silêncio:** com a música parada, os presets devem receber neutro (`bass = 1`, só o relógio anda devagar, proposta) ou zero (`bass = 0`, como o motor faz sozinho nos primeiros minutos)?

## Referências
- Pesquisa: [docs/research/reatividade/2026-11-11-destravar-reatividade.md](../research/reatividade/2026-11-11-destravar-reatividade.md) (seções 2, 3 e 4.A; itens A1–A4, A6).
- Código: `src/renderer/src/expression.ts` (`hookExpression`), `src/renderer/src/silence.ts`, `src/renderer/src/main.ts` (cadeia `gain → meter`, linha do HUD), `src/renderer/src/core/state.ts` (`expression`, `gainDb`); motor: `AudioLevels.updateAudioLevels` em `node_modules/butterchurn/dist/butterchurn.js`.
- Fila: [nível e ganho automático](../../queue/2026-11-10-nivel-ganho-automatico.md), [reação ao áudio](../../queue/2026-11-11-reacao-ao-audio.md).
- **Design:** espelho `1794281099-42d3`, `docs/design/v3/docs/v3-reatividade.md` (curva, fora desta spec). O ganho automático não tem desenho. O artefato está em `1794352628-1d72`, mais nova que o espelho: sincronizar e conferir antes de implementar o P1 de interface. Se continuar sem desenho, registrar em `DIVERGENCIAS.md`.
