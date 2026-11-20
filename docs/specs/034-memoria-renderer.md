# 034 — Memória do renderer numa sessão longa: medir antes de consertar

**Fase:** Manutenção (estabilidade) · **Status:** pronta (`agent-decided`, rodada 2026-11-20) · **Issue:** [#98](https://github.com/atempel/sonic-obsidian/issues/98) · **Milestone:** v0.11.0 · **Personas:** Nostálgico do Winamp e DJ de Festa (deixam o app aberto horas seguidas)

## Problema
No teste do bloco v0.6.0 (#91), o log `[mem]` mostrou o processo `Tab` (renderer) em 184 MB ao abrir → 247 → 293 → 297 → 300 MB em 15 min, com a GPU estável (158 → 164 MB). Parece assentar perto de 300 MB, mas uma sessão de 15 min não separa "aquecimento" de vazamento.

O que já existe não responde:
- O passo de memória do `perf:win` (spec 025) roda só 5 min e grava começo e fim. Nos blocos v0.7.0 a v0.10.0 o `Tab` **caiu** (≈ 190 → 150–160 MB) e o heap JS ficou em ~23–26 MB: o runner não reproduz o uso real (sem música, sem interface aberta) e o *working set* do Windows é aparado quando o processo fica ocioso.
- A linha `[mem]` do log (`src/main/log.ts`) também usa o *working set*, que sobe e desce com a pressão de memória do sistema e não indica sozinho o que o processo reteve.
- Não há medida do heap JS nem da contagem de nós/listeners do DOM ao longo do tempo: um vazamento da interface (Preact, listeners de painel) e um do lado nativo (texturas, buffers do Butterchurn) parecem iguais no `Tab`.

## Proposta
Medir de forma que a próxima ocorrência diga **se** há vazamento e **onde** (JS/DOM ou nativo), sem consertar nada ainda.

1. **Log:** a linha `[mem]` passa a trazer, por processo, o *working set* e a memória privada (`privateBytes`, só no Windows; fora dele, omitida). O renderer registra a cada 5 min `[mem] heap=<MB> nodes=<n> listeners=<n>` (heap JS de `performance.memory`; nós por `document.getElementsByTagName('*').length`; listeners, se o Chromium expuser barato — senão só heap e nós).
2. **`perf:win` longo:** `PERF_MEMORY_MINUTES` (padrão 5) e entrada `memoria_min` no disparo manual do `build-windows` (padrão 5, máximo 60). O passo de memória grava uma amostra **por minuto** (heap JS, `privateBytes` e *working set* de cada processo) em `perf.json` → `memory.series`, e o resumo do job mostra a série do `Tab` e da GPU. Áudio sintético do harness ligado, como hoje.
3. **Teste headless `034-memoria`** (nuvem, Chromium): 150 trocas de preset com o áudio simulado e os painéis abrindo e fechando (Biblioteca, Ajustes rápidos, Configurações); com `--js-flags=--expose-gc`, coleta forçada antes de cada leitura. Compara a leitura na troca 50 com a da troca 150: heap JS e nós do DOM.

Regra de leitura (decidida na rodada, reversível): **vazamento** = memória privada do `Tab` crescendo mais de **30 MB entre o minuto 30 e o minuto 60** da sessão longa. Abaixo disso, a curva do #98 é aquecimento e a issue fecha com os números. Acima, abre-se uma issue `bug` com a série e o lado (JS/DOM ou nativo) que o teste e o log apontarem.

## Escopo
**P0**
- `logMetrics` com `privateBytes`; linha `[mem] heap= nodes=` do renderer a cada 5 min (mesmo relógio da `[audio]`).
- `PERF_MEMORY_MINUTES`, `memoria_min` no `workflow_dispatch` do `build-windows`, `memory.series` por minuto no `perf.json` e no resumo (o `perf.json` antigo, sem série, continua comparável no lado a lado).
- `tests/headless/034-memoria.test.cjs`: heap JS após GC cresce ≤ 8 MB e nós do DOM ≤ 5 % entre a troca 50 e a 150; painéis fechados não deixam nós para trás.
- Uma execução manual do `build-windows` na branch da implementação com `memoria_min=60`; a série vai para o PR e para a #98.

**P1**
- Se o `034-memoria` ou a série de 60 min acusarem vazamento: issue `bug` nova com os números (não consertar nesta spec).

## Fora de escopo
- Consertar um vazamento (vira issue própria com dados).
- Mudar o intervalo do log (5 min) ou mostrar memória na interface além do HUD.
- Medir a GPU além do que o log já faz (estável desde a 2026-11-09, ~40 min).

## Critérios de aceite
1. `npm run test:ui` roda o `034-memoria` e ele passa (ou falha com os números da troca 50 e 150 no texto, se houver vazamento de interface).
2. Disparo manual do `build-windows` com `memoria_min=60`: o job leva ~1 h a mais, o resumo mostra a série por minuto do `Tab` e da GPU (memória privada e *working set*), e o `perf-<sha>` traz `memory.series` com 60 amostras. Com `memoria_min` vazio, o job dura o mesmo de hoje.
3. `PERF_QUICK=1` na nuvem (comando do AGENTS.md) continua passando e grava ao menos uma amostra na série.
4. **No Windows (testar no bloco):** deixar o app aberto 1 h tocando música, abrindo a Biblioteca e os Ajustes de vez em quando; no log (`Ctrl+Shift+L`), as linhas `[mem]` trazem `private` por processo e as do renderer trazem `heap=` e `nodes=`. Mandar o log: a rodada compara com a regra de leitura acima.
5. `npm run typecheck` passa.

## Perguntas em aberto
Nenhuma. Decidido pela rodada (reversível): limiar de 30 MB entre os minutos 30 e 60 para chamar de vazamento; 8 MB de heap e 5 % de nós no teste headless; série de até 60 min só no disparo manual (o job de rotina não fica mais lento). Ver DECISIONS 2026-11-20.

## Referências
- Issue #98; teste do bloco v0.6.0 (#91).
- [Spec 025](025-suite-testes-ci.md) P1 (`perf:win`), [spec 012](012-setup-diagnostico-desempenho.md) (log em arquivo).
- `perf-<sha>` dos blocos v0.7.0–v0.10.0: `Tab` 191→157, 202→158, 189→161, 193→148 MB; heap JS 25,5–25,9 → 22,8–23,3 MB (5 min, ~100 trocas).
