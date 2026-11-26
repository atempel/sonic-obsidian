# 033 — Normalizar áudio: teto para o volume baixo do Windows

**Fase:** 5 — Extras (reatividade) · **Status:** implementada (rodada 2026-11-24; teste no Windows no bloco v0.11.0) — decidida pela rodada 2026-11-20 (`agent-decided`) · **Issue:** [#97](https://github.com/atempel/sonic-obsidian/issues/97) · **Milestone:** v0.11.0 · **Personas:** Nostálgico do Winamp (volume do Windows baixo, caixa alta), DJ de Festa (nível do sistema varia com a mesa)

## Problema
No teste do bloco v0.6.0 (#91), com "Normalizar áudio" ligado (spec 028 P1), o log mostrou o ganho automático em +10,0 / +11,9 / +11,3 / +12,0 dB com o nível medido de −23,7 a −32,9 dBFS. A referência é −14 dBFS e o teto é +12 dB: com o volume do sistema do usuário, o AGC passa quase todo o tempo no teto e não tem margem para igualar uma faixa mais baixa (critério 7 da 028). O usuário achou o resultado bom, então é ajuste, não bug.

O loopback lê o som depois do volume do Windows (é o que o log mostra: o nível cai com o volume do sistema), e o app não lê esse volume. As três saídas pensadas no #97:
- **subir o teto** (ex.: +18 dB) — uma constante; cobre −32 dBFS;
- baixar a referência — muda a reação de todo mundo com o volume alto (o motor recebe menos nível de faixas altas, que é o caso que a 028 corrigiu);
- medir antes do volume do Windows — exige API nativa de áudio no main (dependência nova ou módulo nativo); fora do escopo.

## Proposta
Subir o teto do ganho automático de **+12 para +18 dB**, mantendo a referência em −14 dBFS, o ataque/soltura e o congelamento no silêncio e no Respiro. Com isso, o nível medido no log do usuário (−24 a −33 dBFS) chega a −14/−15 dBFS e sobra margem para igualar faixas. O piso continua −12 dB.

Risco: mais ganho também sobe o ruído de fundo. O silêncio já congela o AGC (nem mede, nem mexe) e o medidor de silêncio fica antes do ganho, então ruído sem música não é amplificado como sinal. Uma passagem muito quieta dentro da faixa sobe no máximo o que a soltura de 8 s permite (o teste do break segue valendo).

## Escopo
**P0**
- `AGC.maxDb` = 18 em `src/renderer/src/agc.ts` (comentário do cabeçalho junto).
- Simulador (`tests/sim/agc-sim.cjs`) e `028-agc-sim`: o caso "faixa muito baixa" passa a checar o teto de +18; novo caso: faixa a −30 dBFS chega a ≤ 2 dB da referência em 30 s (hoje para em −18).
- O break de 8 s continua sem subir o ganho mais de 3 dB, e a troca alta → baixa continua corrigindo mais da metade em 15 s. *(Revisto pela [spec 046](046-normalizar-por-faixa.md): a troca alta → baixa passa a valer com a pausa entre as faixas — ≤ 3 dB em 15 s; sem pausa, ≤ 1,5 dB em 60 s.)*
- Spec 028 e `docs/` que citam "+12 dB" do AGC passam a dizer +18 (o ganho manual de ±12 e o ajuste fino de ±6 não mudam).

## Fora de escopo
- Ler o volume do Windows ou capturar antes dele (API nativa, dependência nova).
- Mudar a referência, a janela, o ataque ou a soltura.
- Controle de teto na interface.

## Critérios de aceite
1. `npm run sim:agc` imprime "teto +18 dB" e o caso −30 dBFS termina a ≤ 2 dB de −14 dBFS; `npm run test:ui` (028-agc-sim, 028-normalizar) passa.
2. **No Windows (testar no bloco):** com o volume do sistema de sempre e "Normalizar áudio" ligado, o HUD (`Ctrl+Shift+D`) mostra o nível chegando ao motor perto de −14 dBFS e o "auto" abaixo de +18 dB na maior parte do tempo; o log (`[audio]` a cada 5 min) mostra o mesmo.
3. **No Windows:** numa faixa com break (ex.: "Children"), o visual não "acende" no break (ganho sobe ≤ 3 dB no HUD) e pausar a música não faz o visual reagir a ruído.
4. `npm run typecheck` passa.

## Perguntas em aberto
Nenhuma. Decidido pela rodada (reversível, uma constante): teto +18 dB, referência mantida. Ver DECISIONS 2026-11-20.

## Referências
- [Spec 028](028-reatividade-ganho-automatico.md) P1 (Normalizar áudio) e DECISIONS 2026-11-13 (Spec 028 P1).
- Issue #97; teste do bloco v0.6.0 (#91).
