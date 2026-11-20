# 035 — Testes headless intermitentes no runner do CI (segunda leva)

**Fase:** Manutenção (CI) · **Status:** pronta (rodada 2026-11-20) · **Issue:** [#158](https://github.com/atempel/sonic-obsidian/issues/158) · **Milestone:** v0.11.0 · **Personas:** — (só testes; o app não muda)

## Problema
O job `typecheck` do `build-windows.yml` (Ubuntu, Chromium headless a ~5 fps) falha em testes diferentes a cada execução e passa na seguinte, sem mudança de código. Na nuvem os mesmos testes passam. É a mesma família da #133: checagem por tempo fixo ou leitura única logo depois de um estado aparecer.

Casos vistos (PRs #156, #161, #162 e o build da `rc/v0.10.0`, run 44679753527):

| Teste | Checagem | Por que falha num runner lento |
|---|---|---|
| `028-normalizar` | "o bumbo simulado move o ganho automático (≠ 0)" — `auto = 0` | lê o HUD uma vez, assim que a linha `gain in effect` aparece; o AGC ainda não andou |
| `029-atualizacao` | "o ponteiro alcança os botões da plaquinha" — `[false,false,true]` | `elementFromPoint` lido enquanto a faixa ainda está entrando (ou já voltando ao ocioso) |
| `024-beat` | 4b "botão tracejado durante a espera" | amostra a cada 5 ms por `setInterval`; a ~5 fps o thread fica preso e a classe `.wait` entra e sai entre duas amostras |
| `028-expressividade` | 6 "HUD com imm, média do motor, RMS/pico…" | `waitForTimeout(1500)` e uma leitura; o HUD ainda não tem todas as linhas |
| `031-feedback` | 1c "menu de 224 px dentro da janela" | menu medido durante o deslize da folha — **já corrigido** no #162 (espera o `transform: none`); só conferir que não voltou |

## Proposta
Trocar, nesses testes, a leitura única ou a espera fixa por espera do estado, com o mesmo critério de hoje (nenhuma checagem fica mais frouxa):
- **028-normalizar:** `H.poll` até `|auto| ≥ 0,1` (timeout 10 s); a mensagem de falha leva o último HUD lido.
- **029-atualizacao:** no `press`, `H.poll` até o `elementFromPoint` cair dentro do botão (timeout 5 s, acordando a faixa de novo a cada tentativa); o resultado registrado é o da última tentativa.
- **024-beat 4b:** registrar a classe por `MutationObserver` no botão (como o `027-estudio-extras` 2b) em vez do `setInterval` de 5 ms; o tempo de espera (4a) continua medido como hoje.
- **028-expressividade 6:** `H.poll` até as três linhas (`imm … engine avg`, `RMS … peak`, `gain in effect`) estarem no HUD (timeout 10 s), no lugar dos 1500 ms.
- **031-feedback 1c:** nada a mudar; entra nos critérios para confirmar.

Regra para os próximos (vale para quem escrever teste novo): ler estado depois de animação, de medição de áudio ou do HUD sempre com `H.poll`/`waitForFunction`/`MutationObserver`, nunca com `waitForTimeout` + leitura única. Registrar em `tests/headless/README.md` se existir; senão, um comentário no topo do `harness.cjs`, junto do `poll`.

## Escopo
**P0** — as quatro mudanças acima e a nota da regra. Nenhum arquivo de `src/` muda.

**P1** — se, durante a implementação, o CI do próprio PR acusar outro intermitente da mesma família, corrigir no mesmo PR e acrescentar à tabela do PR.

## Fora de escopo
- Mudar o app para ficar "mais testável" (ex.: expor o AGC na janela).
- Repetir testes automaticamente (`retries`) — esconde regressão de verdade.
- O `perf:win` (corrigido na #133).

## Critérios de aceite
1. `npm run build && npm run test:ui` passa na nuvem com os quatro testes alterados.
2. Os quatro testes passam com a CPU limitada para imitar o runner: Chromium com `--cpu-throttling` via CDP (`Emulation.setCPUThrottlingRate`, taxa 6) ou, se o harness não permitir, `taskset -c 0` + outro processo ocupando o núcleo; três execuções seguidas de cada um sem falha.
3. O job `typecheck` do PR passa na primeira execução; mais uma reexecução manual do job também passa (duas verdes seguidas, sem mudança de código entre elas).
4. Nenhuma checagem perdeu força: o diff mostra os mesmos limites (≥ 0,1 dB, as três linhas do HUD, o tracejado visto durante a espera, o ponteiro dentro do botão).

## Perguntas em aberto
Nenhuma.

## Referências
- Issue #158 (casos e logs dos PRs #156 e #161); #133 (primeira leva).
- `tests/headless/harness.cjs` (`poll`); `tests/headless/027-estudio-extras.test.cjs` 2b (padrão do `MutationObserver`).
- Run 44679753527 (`rc/v0.10.0`, `028-expressividade` 6) — o build do Windows saiu mesmo assim (artifact `sonic-obsidian-win-a6e2876`).
