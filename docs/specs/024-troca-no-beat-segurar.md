# 024 — Troca no beat a cada N compassos e segurar visual

**Fase:** 3 · **Status:** Feita — validada no Windows em 2026-11-10 (revisão 3, PR #77) · **Issue:** [#67](https://github.com/atempel/sonic-obsidian/issues/67) · **Personas:** DJ de Festa, Streamer de Set, VJ de Clube ([personas](../research/mercado/personas.md)) · **Depende de:** [003](003-rotacao-automatica.md), [013](013-transicoes.md)

## Problema
A rotação troca o preset a cada N segundos, fora do tempo da música. Para quem toca ou transmite um set, isso parece aleatório: o visual muda no meio de uma frase musical e não acompanha o drop.
- O DJ de Festa quer "os presets trocam a cada 16 compassos" e, no drop principal, "aperta Enter para segurar o visual mais forte" ([personas](../research/mercado/personas.md), cenário 2).
- A [pesquisa de mercado](../research/mercado/pesquisa-de-mercado.md) põe "troca no beat + segurar" à frente do backlog porque "atende três personas de uma vez". O SYQEL oferece o mesmo: avanço no beat a cada 4–64 compassos e Enter para segurar.

## Proposta
Detecção de batida e BPM própria, no renderer, a partir do áudio que já chega ao Butterchurn (sem dependência nova).

- **Trocar no beat:** com a opção ligada, o intervalo da rotação passa a ser contado em compassos de 4 batidas: 4, 8, 16 ou 32. A troca cai numa batida.
- **Trocas manuais:** com a opção ligada, `→`, `←` e `Espaço` também esperam a próxima batida (M23 do protótipo).
- **Segurar:** `Enter` segura o visual atual. Nenhuma troca automática acontece até soltar com `Enter` de novo.
- **Sem batida estável** (música ambiente, silêncio, fala): tudo volta ao comportamento de hoje, por segundos e sem espera. Nada fica parado esperando um beat que não vem.

## Escopo
**P0**
- **Detecção** (`src/renderer/src/beat.ts`):
  - onsets por fluxo espectral na faixa grave do `AnalyserNode` existente;
  - BPM por autocorrelação dos onsets numa janela de ~8 s, entre 70 e 180 BPM, com dobro/metade resolvidos para essa faixa;
  - fase da batida e grau de confiança;
  - custo por quadro < 0,5 ms, medido no HUD;
  - nenhuma animação de UI por quadro além do indicador de beat (brief v3).
- **Estado:**
  - `settings.rotation.onBeat` (padrão desligado);
  - `settings.rotation.bars` (4 | 8 | 16 | 32; padrão 16);
  - comandos `rotation.set { onBeat, bars }` e `preset.hold` (alterna).
  - Segurar não é persistido: ao reabrir, nada está segurado.
- **Rotação em compassos** (`rotation.ts`):
  - com `onBeat` e batida estável, a troca acontece na batida que completa `bars × 4` batidas desde a última troca;
  - a contagem recomeça a cada troca, manual ou automática;
  - sem batida estável por mais de 4 s, volta a contar em segundos (`intervalSeconds`). Quando a batida volta, retoma em compassos a partir da troca seguinte.
- **Troca manual no beat (M23):**
  - com `onBeat` ligado e batida estável, `→`, `←`, `Espaço` e os botões da faixa esperam a próxima batida;
  - espera máxima de 60/BPM s, ou seja ≤ 0,86 s a 70 BPM;
  - o botão mostra borda tracejada enquanto aguarda;
  - um segundo pedido durante a espera substitui o primeiro (vale o último, como na fila de presets da 021);
  - `Shift` (corte seco, 013) também espera a batida.
- **Segurar (`Enter`):**
  - alterna "segurado". Enquanto segurado, a rotação não troca, nem por tempo nem por compasso;
  - trocas manuais continuam funcionando, e o preset escolhido passa a ser o segurado;
  - `R` continua ligando e desligando a rotação, como hoje;
  - na faixa, a área da rotação mostra "Segurado" com ícone de cadeado, no lugar da contagem;
  - `Enter` só vale com o foco fora de controles: num botão ou campo, Enter continua acionando o controle;
  - entra no painel de atalhos (`shortcuts.ts`): "Segurar visual · Enter".
- **Interface (protótipo `1794178325-0fd0`):**
  - **Ajustes rápidos › Rotação:** o switch "Trocar no beat" sai do estado desabilitado ("Fase 3"). Com ele ligado, "Trocar a cada" lista 4 / 8 / 16 / 32 compassos.
  - **Configurações › Visual:** a linha "Trocar no beat" (help "Muda de preset quando detectar uma batida forte.") é habilitada, com o mesmo seletor.
  - **Faixa de controle:** com `onBeat`, a contagem da rotação mostra compassos restantes ("6 c") em vez de segundos. Um ponto `--beat` pisca a cada batida enquanto a detecção estiver estável e some quando não estiver.
- **Diagnóstico:**
  - HUD (`Ctrl+Shift+D`): BPM, confiança, compassos desde a troca e custo da detecção;
  - log: uma linha por mudança de estado ("beat: estável a 124 BPM" / "beat: perdido, voltando a segundos"), nunca por batida.
- **Coleção tocando** (`rotation.order = 'collection'`): com `onBeat`, a coleção também troca em compassos. O intervalo em segundos dela vale como reserva, sem batida.

**P1**
- Tap tempo (`B` no modo performance do protótipo; aqui, só se não houver conflito com o `B` de transições) para forçar o BPM quando a detecção erra.
- Odômetro do BPM (M09) na faixa.

## Fora de escopo
- Detectar o primeiro tempo do compasso (downbeat): os compassos contam de 4 em 4 batidas a partir da última troca.
- Ableton Link, MIDI clock e OSC.
- Ler BPM do rekordbox ou do Serato.
- Separar instrumentos (kick, snare).
- Curva de resposta em frequência.

## Critérios de aceite (Windows, app rodando)
1. Com uma faixa de 4/4 marcada (house/techno, 120–128 BPM) e "Trocar no beat" ligado em 16 compassos, o HUD mostra BPM a ±2 do real em até 8 s. As trocas automáticas caem numa batida, a cada ~30 s a 128 BPM (16 × 4 × 60/128).
2. Em 8 compassos, as trocas ocorrem na metade do tempo das de 16. A faixa mostra os compassos restantes, e o ponto de beat pisca no tempo.
3. Com música sem batida (ambiente) ou em silêncio, o ponto de beat some em até 4 s e a rotação volta a trocar pelo tempo em segundos. Nada fica parado.
4. Com "Trocar no beat" ligado, `→` troca na próxima batida (atraso perceptível ≤ 1 batida), com o botão tracejado durante a espera. Sem batida estável, troca na hora.
5. `Enter` segura: por 2 minutos nenhuma troca automática acontece, e a faixa mostra "Segurado". `→` ainda troca, e o novo preset fica segurado. `Enter` de novo solta, e a contagem recomeça.
6. Com o foco num botão da faixa, `Enter` aciona o botão e não segura. O painel `?` lista "Segurar visual · Enter".
7. Com tudo ligado por 30 min, o fps fica igual ao de antes (HUD) e o custo da detecção fica < 0,5 ms por quadro. O log só tem linhas de mudança de estado.
8. Reabrir o app mantém "Trocar no beat" e o número de compassos. "Segurado" não volta.

## Implementação (2026-11-10)
- `src/renderer/src/beat.ts`: um `AnalyserNode` próprio (`fftSize` 32768 ≈ 0,7 s) no mesmo ramo do medidor de silêncio, antes do ganho, lido **pelo relógio do áudio** (só as amostras novas a cada quadro). Passa-baixas de 2 polos, energia em células de 10 ms, onset = subida da energia em dB. Autocorrelação a cada 250 ms; fase por pente. Todos os limiares em `BEAT`. Ver DECISIONS 2026-11-10 ("Detecção de batida pelo relógio do áudio").
- Quando a batida trava pela primeira vez, a contagem em compassos começa **na troca seguinte** (como a spec pede para a volta da batida); até lá, segundos.
- Sem batida estável: `RECENT_BEATS` (1,5 batida sem onset) + `LOST_AFTER_MS` (1 s) → ~2–3,5 s até perder.
- Teste headless: `tests/headless/024-beat.test.cjs` (bumbo sintético a 124 BPM, ambiente e silêncio), 32/32.

## Revisão 2 (2026-11-10, depois do primeiro teste no Windows)
O usuário testou: a batida quase não travava (o ponto raramente aparecia), as trocas não pareciam no tempo e o `Enter` não teve efeito visível. No log, a batida travava e caía a cada 1–2 s, com o BPM pulando entre 96, 107 e 128.
- **Detecção refeita, calibrada com um simulador** (`tests/sim/beat-sim.cjs`, com house, techno, hip-hop, breakbeat, ambiente e silêncio):
  - energia dos graves suavizada (15 Hz) e comprimida (`log1p`), com um seguidor de pico: assim, o baixo com sidechain e notas graves longas não viram "batidas";
  - nova checagem de "pico agudo";
  - perda só depois de 2,5 s sem confiança.
  - Resultado no simulador: house e techno travam em ~2 s com o BPM a ±1 e não caem; ambiente e silêncio nunca travam.
  - Limites: hip-hop com swing e breakbeat ainda erram o andamento (o breakbeat sai na metade).
  - O teste `tests/headless/024-beat-sim.test.cjs` guarda esses limites no CI.
- **Sincronia (do usuário):**
  - a batida mostrada e as trocas saem 70 ms antes da batida detectada, para compensar captura e desenho. O valor fica em Configurações › Transição › "Adiantar o visual", de 0 a 200 ms;
  - no modo beat, a troca automática mistura no máximo 1 batida.
- **`Enter`:** um botão clicado com o mouse não fica mais com o `Enter`; só um controle focado pelo teclado (`:focus-visible`). Antes, depois de clicar num botão da faixa, o `Enter` repetia o clique.
- **Respiro (`Shift+Enter`, pedido do usuário):** o visual deixa de receber o áudio, como se nada tocasse, e depois o recebe de volta. O áudio cai em ~1 s e volta rápido. A detecção de batida continua ouvindo, porque vem antes do ganho. Não é persistido. A faixa mostra a etiqueta "Respiro".

## Revisão 3 (2026-11-10, segundo teste no Windows)
O usuário viu a trava melhor, mas ela ainda caía quando a música mudava, ficava mais calma ou tinha uma virada. No log, o BPM mudava a cada trava (76, 87, 94, 100, 111, 127, 143). Pedido do usuário: identificar o BPM uma vez e deixá-lo seguir; atualizar só se outro BPM for detectado.
- **Andamento travado:**
  - trava quando o mesmo BPM se confirma por ~2 s;
  - travado, o andamento fica e o volante segue as batidas sozinho;
  - a fase só é corrigida quando as batidas aparecem onde ele prevê, com ajuste fino de no máximo ±3 %;
  - viradas, breaks, trechos calmos e até música ambiente **não soltam a trava**;
  - outro andamento só substitui o travado se confirmado por ~4 s; dobro, metade, 3/2 e 2/3 contam como o mesmo;
  - a trava só solta com silêncio de verdade (3 s, o mesmo critério do aviso de silêncio) ou depois de 30 s sem nenhuma batida no lugar previsto.
- **O critério 3 muda:** com música ambiente depois de uma faixa com batida, o andamento continua. Só em silêncio ou depois de 30 s sem batida o ponto some e a rotação volta aos segundos.
- **Compassos (do usuário):** 1, 2, 4, 8 ou 16; padrão 4 (~8 s a 124 BPM). Quem tinha 32 salvo passa a 16.
- **Simulador:**
  - BPM exato (124,0) e trava em ~3 s;
  - um break de 8 s sem bumbo não solta;
  - o silêncio solta em 3 s;
  - 124 → 140 BPM troca em ~5 s;
  - o ambiente sozinho nunca trava.

## Perguntas em aberto
- O `B` (tipo de transição, 013) conflita com o tap tempo do modo performance do protótipo. Decidir na P1.
- O limiar de confiança e a janela de 8 s se ajustam com músicas reais no Windows. Os valores iniciais ficam numa constante só.

## Referências
- Protótipo `1794178325-0fd0` (`docs/design/v3/SYNC.md`):
  - Palco integrado: switch "Trocar no beat" em Ajustes rápidos (`#onBeat`, "Fase 3 · precisa de detecção de BPM");
  - M23 "Troca no beat" (`docs/design/v3/docs/v3-microinteracoes.md`);
  - M09 odômetro do BPM (Rack);
  - Configurações: linha `beat`.
- [Pesquisa de mercado](../research/mercado/pesquisa-de-mercado.md) ("O que essa pesquisa muda no backlog", item 2) e [análise do SYQEL](../research/mercado/competidor-syqel.md) ("O que aprender").
- [003 — Rotação automática](003-rotacao-automatica.md) (adiou "trocar no tempo da música" para a Fase 3); [013 — Transições](013-transicoes.md); [021](021-migracao-butterchurn3.md) (fila de presets: vale o último pedido).
