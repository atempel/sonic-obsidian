# 003 — Rotação automática

**Fase:** 1 · **Status:** Concluído (7/7 critérios verificados pelo usuário) · **Issue:** [#7](https://github.com/atempel/sonic-obsidian/issues/7) · **Depende de:** [002](002-presets-biblioteca-navegacao.md)

## Problema
Deixar o app rodando como pano de fundo de uma música ou de uma sessão longa exige apertar uma tecla a cada troca. O visual deveria se renovar sozinho, sem tirar o controle do usuário.

## Proposta
Um temporizador troca para um preset aleatório a cada N segundos, usando a mesma troca (e o mesmo blend) da 002. Pode ser pausado e retomado por tecla, e qualquer troca manual reinicia a contagem, para o preset que o usuário acabou de escolher não ser trocado logo em seguida.

## Escopo
**P0**
- Rotação ligada ao abrir, com intervalo padrão de 30 s, sorteando um preset diferente do atual.
- A troca usa o blend de troca automática definido na 002 (padrão 2,7 s) e entra no histórico de navegação, então `←` volta ao preset anterior.
- Tecla `R` pausa e retoma a rotação (atalho v3).
- Indicador discreto enquanto pausada (por exemplo "rotação pausada" no HUD); some ao retomar.
- Troca manual (`→`, `←`, `Espaço`) reinicia o contador do intervalo. Pausar e retomar também recomeça a contagem do zero.

**P1**
- Ajustar o intervalo por teclado, em passos fixos (por exemplo `[` diminui e `]` aumenta entre 10, 15, 30, 60 e 120 s). O valor atual aparece no HUD.

## Fora de escopo
Trocar no tempo da música / detecção de beat (Fase 3). Rotação por coleção ou favoritos (Fase 2). Persistir intervalo e estado de pausa (Fase 4).

## Critérios de aceite
1. Ao abrir o app e não tocar em nada, o preset muda sozinho cerca de 30 s depois (±2 s), com transição gradual (blend automático, 2,7 s), e continua mudando a cada 30 s.
2. Apertar `R` interrompe as trocas automáticas: em 1 minuto sem tocar em nada o preset não muda, e o indicador de pausa está visível.
3. Apertar `R` de novo retoma a rotação, o indicador some, e a próxima troca ocorre cerca de 30 s depois.
4. Uma troca manual aos 25 s de contagem não é seguida de troca automática logo depois: a próxima automática vem ~30 s após a manual.
5. `←` depois de uma troca automática volta ao preset anterior.
6. (P1) Mudar o intervalo para 10 s faz as trocas automáticas passarem a ocorrer a cada ~10 s, e o HUD mostra o valor.
7. A rotação não causa queda de fps nem engasgo perceptível no momento da troca.

## Perguntas em aberto
- A rotação deve continuar se a janela estiver minimizada ou sem foco? Proposta: sim, o render já segue a política do Chromium.
- Pausar por inatividade de áudio (silêncio, ver 005) deve congelar o contador? Decidir ao implementar a 005.

## Referências
- [docs/PRD.md](../PRD.md) — Fase 1, "Rotação automática por tempo, pausável"
- [002 — Presets: biblioteca e navegação](002-presets-biblioteca-navegacao.md)
- [CONTEXT.md](../../CONTEXT.md) — créditos dos presets e performance
