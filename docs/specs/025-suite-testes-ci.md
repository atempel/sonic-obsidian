# 025 — Suíte de testes no CI (interface, estados e regressão de desempenho)

**Fase:** Manutenção · **Status:** P0 implementada (#76); P1 pronta para implementar (planejada na rodada de 2026-11-13) · **Issue:** [#73](https://github.com/atempel/sonic-obsidian/issues/73) · **Personas:** todas, indiretamente (menos regressões chegando ao Windows) · **Depende de:** testes headless de 023 e 024 (`tests/headless/`)

## Problema
Hoje, quase tudo é verificado à mão no Windows do usuário: cada PR exige baixar o artifact e repetir roteiros. Bugs de interface que um teste automático pegaria (Configurações deslocadas no #56, painel de coleções cortado na 023) só aparecem no teste manual. O usuário pediu: "não quero testar apenas no meu computador" ([queue](../../queue/2026-11-09-suite-testes-performance.md)).

Já existem dois testes headless (023 e 024), mas só rodam na nuvem, à mão, com o Playwright pré-instalado do ambiente.

## Proposta
Transformar os testes headless em uma suíte versionada que roda em todo PR, no job Ubuntu do CI, e falha o PR quando algo quebra. Depois, medir abertura, custo de render e memória no runner Windows, comparando builds entre si.

## Escopo
**P0 — interface e estados no CI (Ubuntu)**
- `playwright@1.63.0` (mesma versão do ambiente da nuvem; Apache-2.0; checagem em `docs/dependencias.md`), **só no CI**: o job instala com `npm install --no-save`; fora do `package.json` (aprovado assim pelo usuário em 2026-11-10).
- `tests/headless/harness.cjs`: servidor de `out/renderer`, `window.so` simulado e `getDisplayMedia` com áudio sintético (bumbo, ambiente, silêncio), reaproveitados pelos testes.
- `npm run test:ui`: roda todos os `tests/headless/*.test.cjs` em sequência e sai com erro se algum falhar.
- Os testes 023 (coleções) e 024 (beat) passam a usar o harness. Entram testes curtos de regressão de interface:
  - painel `?` abre, filtra e fecha;
  - Configurações abrem em 1280×800 e 1920×1080 sem conteúdo cortado (o bug do #56);
  - busca rápida encontra um preset e um comando.
- CI: no job `typecheck`, depois do `npm run build`, `npx playwright install --with-deps chromium` e `npm run test:ui`. Em falha, as screenshots vão como artifact.

**P1 — desempenho no Windows (comparativo)**
Roda no **app empacotado** (`release/win-unpacked/`), como passo extra do job `build-windows`, depois do `dist:win` — ou seja, só quando o build Windows roda (label `build-windows`, disparo manual, build de bloco). Não roda em todo PR.
- `tests/perf/windows.cjs` (Playwright `_electron.launch` com `executablePath` do `.exe` empacotado; `--user-data-dir` temporário, sem `settings.json` de ninguém). `npm run perf:win` chama o script; fora do Windows sai com aviso, sem erro.
- Captura: o script responde ao `getDisplayMedia` com o áudio sintético do harness (bumbo a 124 BPM), como os testes headless; o runner não tem loopback.
- **Abertura:** 3 aberturas a frio seguidas; de cada uma, a linha `abertura (ms desde o processo)` do `logs/sonic-obsidian.log` (`src/main/startup.ts`). Registra a mediana de `primeiro quadro` e as etapas.
- **Render:** amostra fixa de 20 presets, listada em `tests/perf/presets.json` (os 20 primeiros em ordem alfabética do pacote embutido no dia da implementação; a lista não muda sozinha quando o pacote mudar). Janela fixa de 1280×720, 5 s por preset depois de 1 s de transição; registra ms por quadro (mediana e p95) por preset e a mediana geral. WARP/SwiftShader no runner: serve para comparar builds, não como fps real.
- **Memória:** 5 min de trocas a cada 2 s pela lista inteira do pacote; heap JS do renderer e memória de trabalho de cada processo (`app.getAppMetrics`) no começo e no fim.
- **Saída:** `perf.json` (versão, sha, números acima) num artifact `perf-<sha>` (90 dias) e um resumo em `$GITHUB_STEP_SUMMARY` com os números desta execução **ao lado dos da execução anterior** com `perf.json` (baixado com `gh run download`, `GITHUB_TOKEN` do próprio job; sem action nova). Sem execução anterior → só os números.
- **Nunca falha o job por número** nesta fase; só falha se o script quebrar (app não abre, preset não desenha). Limites de piora entram numa spec futura, depois de ~10 execuções.
- Orçamento: o passo leva no máximo ~10 min a mais no job Windows (abertura ~1 min, render ~2,5 min, memória 5 min).

## Fora de escopo
- fps real na GPU do usuário e áudio real do loopback: continuam no Windows dele.
- Testes unitários com outro framework (Vitest/Jest): o Playwright cobre o que importa agora.

## Critérios de aceite
1. Um PR que quebra o painel de coleções (ex.: volta a nascer dentro da `.strip`) fica vermelho no CI, com a screenshot do teste no artifact.
2. `npm run test:ui` roda na nuvem e no CI com o mesmo resultado; os testes 023 e 024 passam.
3. O job Ubuntu não passa de +4 min com a suíte.
4. (P1) Num build Windows disparado à mão, o resumo do job mostra abertura (mediana de 3), ms por quadro (mediana e p95 dos 20 presets) e memória (começo e fim dos 5 min), e o artifact `perf-<sha>` traz o `perf.json`.
5. (P1) Num segundo disparo, o resumo mostra os números da execução anterior ao lado dos atuais.
6. (P1) Um build que não abre (ex.: `test-flags.json` com `noWebgl2` copiado para o perfil temporário) deixa o passo vermelho; números piores, não.
7. (P1) O passo de desempenho não soma mais de ~10 min ao job Windows.

## Perguntas em aberto
- Nenhuma. Decididas na rodada (DECISIONS 2026-11-13, `agent-decided`): Playwright segue só no CI (como aprovado); o P1 roda no app empacotado e só quando o build Windows roda; amostra fixa em arquivo; comparação com a execução anterior, sem falhar por número. Limites de piora: spec futura, depois de ~10 execuções.

## Referências
- [queue/2026-11-09-suite-testes-performance.md](../../queue/2026-11-09-suite-testes-performance.md)
- `tests/headless/023-colecoes.test.cjs`, `tests/headless/024-beat.test.cjs`
- `.github/workflows/build-windows.yml`
- `src/main/startup.ts` (linha de abertura no log), `tests/headless/harness.cjs` (áudio sintético)
