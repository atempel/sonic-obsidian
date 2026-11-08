# 005 — Sinal de entrada: ganho e silêncio

**Fase:** 1 · **Status:** A fazer · **Issue:** [#9](https://github.com/atempel/sonic-obsidian/issues/9)

## Problema
No teste do spike a barra de nível ficou quase vazia com música tocando: o loopback chega baixo e o visual reage pouco. Hoje o `GainNode` fica fixo em 1 e não há como compensar. Além disso, quando não há áudio o app não diz nada, e fica difícil saber se o visual parado é falha de captura ou só silêncio.

## Proposta
Dar ao usuário um ganho de entrada ajustável por teclado, aplicado no `GainNode` que já existe antes do Butterchurn, com o valor visível no HUD. Como complemento, detectar silêncio prolongado e avisar de forma discreta.

## Escopo
**P0**
- Ganho de entrada por teclado: `+` aumenta e `−` diminui, em passos de ~1,5 dB, entre −12 dB e +24 dB (padrão 0 dB = ganho 1). A tecla `0` volta ao padrão.
- O ajuste vai no `GainNode` existente, antes do `connectAudio` do Butterchurn, para afetar o visual; o medidor de nível do HUD também lê depois do ganho.
- O valor em dB aparece no HUD.
- Nada vai para `ctx.destination`: o som que o usuário ouve não muda.

**P1**
- Estado de silêncio: se o RMS ficar abaixo de um limiar por alguns segundos (proposta: ~3 s), mostrar um aviso discreto "sem áudio" e deixar o visual em repouso. O aviso some e o visual volta a reagir quando o som volta.

## Fora de escopo
Persistir o ganho entre sessões (Fase 4). Painel de sinal com suavização e sensibilidade de beat (Fase 2). Escolha de dispositivo de captura. Normalização automática (ver pergunta em aberto).

## Critérios de aceite
1. Com música tocando, apertar `+` repetidamente faz a barra de nível e a reação do visual aumentarem de forma visível; apertar `−` faz diminuírem.
2. O HUD mostra o ganho em dB e ele muda em passos de ~1,5 dB, parando nos limites (−12 e +24 dB) sem passar deles.
3. `0` volta o ganho a 0 dB.
4. O volume ouvido nos alto-falantes não muda ao ajustar o ganho.
5. Com a música numa faixa tocando baixo, existe um ajuste de ganho em que a barra de nível chega perto de metade da escala e o visual reage com clareza (registrar o valor usado).
6. (P1) Pausando a música por cerca de 5 s, aparece o aviso "sem áudio" e o visual fica em repouso; ao voltar a tocar, o aviso some em até 1 s e o visual reage de novo.
7. (P1) Música baixa, mas audível, não dispara o aviso.

## Perguntas em aberto
- Ganho automático (normalização) seria melhor que o manual? Prós: some a necessidade de ajustar a cada faixa. Contras: o pumping atrapalha a dinâmica que o preset deveria acompanhar. Avaliar depois de usar o manual por um tempo; se valer, vira spec própria (Fase 2 ou 3).
- O limiar de silêncio deve ser fixo ou relativo ao ganho atual? Proposta: medir antes do ganho, para o aviso não depender do ajuste.
- Em silêncio, o contador da rotação (003) deve congelar?

## Referências
- [docs/PRD.md](../PRD.md) — Fase 1, "Ganho de entrada" e "Estado de silêncio"
- DECISIONS.md, "Spike 001: respostas" — track de áudio `live` mesmo com música pausada
- `src/renderer/src/main.ts` (`GainNode`, medidor RMS), `src/renderer/src/hud.ts`
