# 025 — Suíte de testes no CI (interface, estados e regressão de desempenho)

**Fase:** Manutenção · **Status:** Planejada (P0 implementada no PR; a dependência `playwright` aguarda o ok do usuário) · **Issue:** [#73](https://github.com/atempel/sonic-obsidian/issues/73) · **Personas:** todas, indiretamente (menos regressões chegando ao Windows) · **Depende de:** testes headless de 023 e 024 (`tests/headless/`)

## Problema
Hoje, quase tudo é verificado à mão no Windows do usuário: cada PR exige baixar o artifact e repetir roteiros. Bugs de interface que um teste automático pegaria (Configurações deslocadas no #56, painel de coleções cortado na 023) só aparecem no teste manual. O usuário pediu: "não quero testar apenas no meu computador" ([queue](../../queue/2026-11-09-suite-testes-performance.md)).

Já existem dois testes headless (023 e 024), mas só rodam na nuvem, à mão, com o Playwright pré-instalado do ambiente.

## Proposta
Transformar os testes headless em uma suíte versionada que roda em todo PR, no job Ubuntu do CI, e falha o PR quando algo quebra. Depois, medir abertura, custo de render e memória no runner Windows, comparando builds entre si.

## Escopo
**P0 — interface e estados no CI (Ubuntu)**
- `playwright@1.63.0` (mesma versão do ambiente da nuvem; Apache-2.0; checagem em `docs/dependencias.md`). Sem devDependency por enquanto: o CI instala com `npm install --no-save` (o `npm ci` falharia com o lock desatualizado); adicionar ao `package.json` depende do ok do usuário.
- `tests/headless/harness.cjs`: servidor de `out/renderer`, `window.so` simulado e `getDisplayMedia` com áudio sintético (bumbo, ambiente, silêncio), reaproveitados pelos testes.
- `npm run test:ui`: roda todos os `tests/headless/*.test.cjs` em sequência e sai com erro se algum falhar.
- Os testes 023 (coleções) e 024 (beat) passam a usar o harness. Entram testes curtos de regressão de interface:
  - painel `?` abre, filtra e fecha;
  - Configurações abrem em 1280×800 e 1920×1080 sem conteúdo cortado (o bug do #56);
  - busca rápida encontra um preset e um comando.
- CI: no job `typecheck`, depois do `npm run build`, `npx playwright install --with-deps chromium` e `npm run test:ui`. Em falha, as screenshots vão como artifact.

**P1 — desempenho no Windows (comparativo)**
- Abertura: Playwright `_electron.launch` no `windows-latest`, lendo a linha `abertura (ms desde o processo)` do log.
- Render: ms por quadro numa amostra fixa de 20 presets num canvas fixo (WARP/SwiftShader: vale para comparar builds, não como fps real).
- Memória: 5 min de trocas aceleradas, heap JS no começo e no fim.
- Resultado num resumo do job (`$GITHUB_STEP_SUMMARY`) e num JSON de artifact; falha só com piora grande (limites a definir depois de ~10 execuções).

## Fora de escopo
- fps real na GPU do usuário e áudio real do loopback: continuam no Windows dele.
- Testes unitários com outro framework (Vitest/Jest): o Playwright cobre o que importa agora.

## Critérios de aceite
1. Um PR que quebra o painel de coleções (ex.: volta a nascer dentro da `.strip`) fica vermelho no CI, com a screenshot do teste no artifact.
2. `npm run test:ui` roda na nuvem e no CI com o mesmo resultado; os testes 023 e 024 passam.
3. O job Ubuntu não passa de +4 min com a suíte.
4. (P1) O resumo do job Windows mostra abertura, ms por quadro e heap, e o histórico de 10 execuções permite comparar.

## Perguntas em aberto
- **Dependência:** adicionar `playwright@1.63.0` como devDependency (o CI baixa o Chromium da CDN da Microsoft). Precisa do ok do usuário (AGENTS.md, Limites).
- Limites do P1: definir depois de medir.

## Referências
- [queue/2026-11-09-suite-testes-performance.md](../../queue/2026-11-09-suite-testes-performance.md)
- `tests/headless/023-colecoes.test.cjs`, `tests/headless/024-beat.test.cjs`
- `.github/workflows/build-windows.yml`
