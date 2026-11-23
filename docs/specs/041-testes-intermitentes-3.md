# 041 — Testes headless intermitentes no runner do CI (terceira leva)

**Fase:** Manutenção (CI) · **Status:** implementada (PR da rodada 2026-11-23) · **Issue:** [#178](https://github.com/atempel/sonic-obsidian/issues/178) · **Personas:** — (só testes; o app não muda)

## Problema
No PR #177 (só docs e `spike/040/`) o job `typecheck` falhou três vezes, cada uma num teste diferente, todos de tempo no runner lento (run 45173472807):

| Teste | Checagem | O que se viu | Causa |
|---|---|---|---|
| `036-preset-preto` 2 | "black preset" em até 6 s | 6,8 s e 6,6 s | o teste já queria folga no runner lento, mas só olhava `SO_CPU_THROTTLE`, que o CI não define |
| `032-medir-captura` 7f | três cliques com variação < 20 ms | `[null, 50.9, 52.3]` | com o desenho prendendo o thread da página por mais de 0,68 s (o buffer do `AnalyserNode`), o trecho do clique vira silêncio; o app já aceita um clique perdido (`CLICK.MIN_FOUND = 2`) |
| `027-estudio-basico` 6a | "Ir para a linha" foca o bloco | `foco=false` | não reproduziu em 5 execuções com `SO_CPU_THROTTLE=6`; falta saber quem ficou com o foco |

## Proposta
- **036 2:** o runner lento é `CI=true` (o GitHub Actions define) ou `SO_CPU_THROTTLE > 1`. O limite de 6 s continua valendo fora disso; o teto de 15 s do `poll` não muda.
- **032 7f:** pelo menos dois dos três cliques achados (o mesmo mínimo do app) e os achados com variação < 20 ms. O 7d continua exigindo três entradas no log e o 7e o resultado entre 20 e 150 ms.
- **027 6a:** a mensagem de falha passa a dizer qual elemento está com o foco. A correção fica para quando aparecer de novo (a #178 continua aberta só por ela).

## Fora de escopo
- `retries` automáticos (escondem regressão de verdade; spec 035).
- Mudar o "Medir atraso da captura" para gravar fora do thread da página (`AudioWorklet`): com o app a 60 fps no Windows o buffer de 0,68 s sobra; abaixo de ~2 fps a medição falha inteira (visto localmente com a CPU 3× mais lenta) e o app mostra o aviso de "não deu para medir", o que é aceitável.

## Critérios de aceite
1. `036` e `032` passam na nuvem com `CI=true`; o `032` passa com `SO_CPU_THROTTLE=3` quando um clique se perde.
2. O job `typecheck` do PR passa.
3. Nenhuma outra checagem muda: só o 7f perde a exigência do terceiro clique, alinhada ao `MIN_FOUND` do app.

## Referências
- #178; specs 035 (segunda leva) e 032 (critério 7: três **medições** com variação < 20 ms — o teste conferia cliques).
