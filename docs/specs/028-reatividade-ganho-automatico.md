# 028 — Reação ao áudio: corrigir a Memória, medir de verdade e ganho automático

**Fase:** 3 · **Status:** Feita — P0 e P1 validados no Windows no bloco v0.6.0 (#91) e lançados na v0.6.0; Memória Viva fica · **Issues:** [#81](https://github.com/atempel/sonic-obsidian/issues/81) (P0), [#86](https://github.com/atempel/sonic-obsidian/issues/86) (P1) · **Personas:** Nostálgico do Winamp, DJ de Festa, Streamer de Set, Anfitrião de Ambiente ([personas](../research/mercado/personas.md)) · **Depende de:** [015](015-expressividade.md), [005](005-sinal-entrada.md)

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

**Primeira leitura no Windows (2026-11-11, build atual):** Caráter Nervo, Memória Fixa, Nível 0.
- `bass` antes = depois, variando de 0,5 a 1,9. **O Caráter inerte se confirma:** com Nível 0, a curva não age.
- **A trava em 1,00 não apareceu nesta abertura** (o app provavelmente abriu já com som). Continua por reproduzir abrindo com o Spotify pausado (critério 2).
- Mesmo sem travar, a Fixa compara tudo com a média congelada na abertura. Uma faixa mais baixa que aquela lê abaixo de 1 o tempo todo, e uma mais alta fica perto do teto. A reação passa a depender de qual música tocava ao abrir.

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
- **Silêncio (squelch, decisão do usuário):** com `SilenceState.resting`, os presets recebem **zero** (`bass/mid/treb` e `_att` = 0), em vez de ruído normalizado.
  - Os efeitos não congelam: o relógio segue mais lento (15 %) e a tela escurece, como hoje. O efeito de "parou" fica claro.
  - Zero já é o que o motor entrega sozinho nos primeiros minutos de silêncio. Hoje, depois de alguns minutos, ele salta para 1, e isso deixa de acontecer.
  - A volta do som sai do zero em ~1 s, sem degrau. O limiar do medidor continua o mesmo; o piso de `imm` usado na semente é medido no Windows (HUD) antes de ser fixado.
- **Padrão visível (pedido do usuário):** a interface mostra qual opção é a padrão, para ficar fácil voltar a "tudo como esperado".
  - Nos Ajustes rápidos › Expressividade, as opções de Caráter e Memória levam "· padrão" na padrão (Energia, Curta), e o Nível marca o 0.
  - O toast de `X`/`Shift+X` diz "(padrão)" quando cai nela.
  - Um "Restaurar padrão" volta Nível, Caráter e Memória de uma vez.
  - Com Nível 0, o Caráter aparece como "sem efeito no nível 0".
  - Sem desenho para isso: entra em `DIVERGENCIAS.md` para a sessão de design responder.
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

**P1 — Normalizar áudio (ganho automático, AGC; nome do usuário, desligado por padrão)**
Como funciona, para quem usa: o app ouve o nível médio dos últimos ~10 s e sobe ou desce o volume que entra no visual (o som das caixas não muda) até um nível de referência. É a mesma ideia do "normalizar volume" do Spotify, só que medida ao vivo. Uma faixa dos anos 90 mais baixa ganha alguns dB, e uma faixa atual alta perde alguns. A mudança é lenta, de segundos, para não apagar a diferença entre o break e o drop dentro da música. O ganho manual continua, como ajuste fino em cima.
- **Onde:** um `GainNode` antes do motor, depois do medidor de silêncio e da detecção de batida (que seguem medindo antes de qualquer ganho).
- **Como:**
  - mede RMS numa janela de ~10 s e mira uma referência (a definir no Windows, perto do nível de uma faixa atual masterizada);
  - ataque de ~1 s para baixar, soltura de ~8 s para subir, e teto de +12 dB;
  - congela no silêncio e no Respiro, para não "bombear" em breaks.
  - Não comprime: não achata a dinâmica dentro da faixa, porque o contraste do drop é o que move o visual.
- **Manual:** o ganho dos Ajustes rápidos vira **ajuste fino** de −6 a +6 dB sobre o AGC; desligado o AGC, volta a ser o ganho de hoje.
- **Estado:** `settings.autoGain: boolean` (padrão: desligado) e comando `audio.autoGain`.
- **Interface:** item "Normalizar áudio" nos Ajustes rápidos, junto do Ganho, e em Configurações › Áudio, com o valor aplicado em mono ("auto +5 dB"). Não há desenho: ver Referências.
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
1. **Antes de instalar o build novo:** o HUD do build atual mostra a Memória salva e `bass x → y`. Feito em 2026-11-11: Nervo + Fixa + Nível 0; antes = depois, 0,5–1,9 (ver Problema).
2. Abrir o app **com o Spotify pausado** e Memória Fixa, dar play: `bass` (depois) varia com a música em ≤ 5 s. Desvio visível no HUD; nada de `1.00 → 1.00` fixo. O mesmo em Longa e Curta.
3. Abrir **com música tocando** em Fixa: `bass` não fica em 4,00 por mais de 2 s.
4. Pausar a música: em ≤ 4 s `bass/mid/treb` (depois) ficam em 0,00, sem pulso que siga o ruído, e continuam em 0 depois de 5 min. Os efeitos seguem animando, mais lentos e escuros. Dar play: a reação volta em ~1 s.
4b. Ajustes rápidos mostram "· padrão" em Energia e Curta e "sem efeito no nível 0" no Caráter com Nível 0; "Restaurar padrão" volta tudo, e o toast de `X` diz "(padrão)".
5. Respiro (`Shift+Enter`) e volta: sem `bass` acima de 4 nem travado.
6. HUD mostra `imm`, `longAvg`, RMS/pico em dBFS e ganho em vigor; o log tem a linha da abertura e a amostra de 5 min.
7. (P1) Com "Normalizar áudio" ligado, "Children (Dream Version)" (Robert Miles) e uma faixa atual alta chegam ao motor com nível parecido (HUD, ≤ 3 dB de diferença em 15 s). Num break, o ganho não sobe mais de 3 dB.
8. (P1) Memória Viva: o usuário compara com Curta em 2 faixas estáveis e decide se fica.
9. `npm run typecheck` e `npm run test:ui` passam; fps igual ao de antes no HUD (o gancho e o AGC custam < 0,1 ms por quadro).

## Respostas do usuário (2026-11-11)
- **Memória:** continua salva entre aberturas.
- **Normalizar áudio:** é o nome do ganho automático. Vem desligado, e o manual vira ajuste fino (±6 dB).
- **Silêncio:** zero; os efeitos não congelam, só ficam sem input e mais lentos.
- **Pedido novo:** marcar as opções padrão na interface (P0).

## Perguntas em aberto
Nenhuma. Nível padrão (2026-11-13, do usuário): **continua 0**, com o aviso "sem efeito no nível 0" no Caráter (P0, padrão visível).

## Referências
- Pesquisa: [docs/research/reatividade/2026-11-11-destravar-reatividade.md](../research/reatividade/2026-11-11-destravar-reatividade.md) (seções 2, 3 e 4.A; itens A1–A4, A6).
- Código: `src/renderer/src/expression.ts` (`hookExpression`), `src/renderer/src/silence.ts`, `src/renderer/src/main.ts` (cadeia `gain → meter`, linha do HUD), `src/renderer/src/core/state.ts` (`expression`, `gainDb`); motor: `AudioLevels.updateAudioLevels` em `node_modules/butterchurn/dist/butterchurn.js`.
- Fila: [nível e ganho automático](../../queue/2026-11-10-nivel-ganho-automatico.md), [reação ao áudio](../../queue/2026-11-11-reacao-ao-audio.md).
- **Design:** espelho `1794281099-42d3`, `docs/design/v3/docs/v3-reatividade.md` (curva, fora desta spec). O ganho automático não tem desenho. O artefato está em `1794352628-1d72`, mais nova que o espelho: sincronizar e conferir antes de implementar o P1 de interface. Se continuar sem desenho, registrar em `DIVERGENCIAS.md`.
