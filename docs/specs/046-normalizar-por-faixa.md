# 046 — Normalizar áudio por faixa, não por trecho

**Fase:** 5 — Extras (reatividade) · **Status:** pronta (rodada 2026-11-25; números decididos pela rodada, `agent-decided`) · **Issue:** [#186](https://github.com/atempel/sonic-obsidian/issues/186) · **Milestone:** v0.11.0 (vai na versão da Microsoft Store, pedido do usuário) · **Personas:** Nostálgico do Winamp (faixas com break longo), DJ de Festa (break × drop é o show), Anfitrião de Ambiente · **Revê:** [028](028-reatividade-ganho-automatico.md) P1 e [033](033-normalizar-teto.md)

## Problema
Relato do usuário (2026-11-23): com "Normalizar áudio" ligado, o visual perde o contraste dentro da música — o break não fica quieto e o drop não "explode". O ganho automático reage rápido demais.

O código (`src/renderer/src/agc.ts`) mede o RMS dos **últimos ~10 s**, baixa em ~1 s e sobe em ~8 s. A spec 028 promete que break e drop continuam diferentes, mas com 10 s de janela um break de 16 s é quase todo igualado e o drop é puxado para baixo logo em seguida. No simulador (`tests/sim/agc-sim.cjs`, faixa sintética, break ~8 dB abaixo do resto), medido nesta rodada:

| Break depois de 60 s de música | ganho sobe no break | o drop é puxado depois | contraste que sobra |
|---|---|---|---|
| 8 s | +1,8 dB | 2,9 dB | 78 % |
| 16 s | +5,9 dB | 6,1 dB | 25 % |
| 32 s | +8,2 dB | 8,3 dB | ~0 % |

Por cima disso, a Memória Curta da Expressividade (~4 s, a do motor) também se acostuma ao volume.

## Proposta
Normalizar **por faixa**: medir numa janela longa e mexer devagar, com duas saídas rápidas para o que de fato é troca de faixa.
- **Janela de 45 s** (era 10 s); **baixar em ~4 s, subir em ~10 s** (era 1 s / 8 s). Referência −14 dBFS, teto +18 dB (033), piso −12 dB e ajuste fino ±6 dB não mudam.
- **Estouro:** o nível dos últimos **3 s**, já com o ganho, passa de **4 dB acima da referência** → baixa rápido (~0,7 s) até a referência por esse nível curto e **recomeça a janela longa** a partir dele (é uma faixa nova, mais alta). Evita saturar o visual na troca para uma faixa muito mais alta.
- **Silêncio de ≥ 1,5 s** (o `silence.quiet` do app, que já congela o AGC) → ao voltar o som, **recomeça a janela longa** mantendo o ganho atual (troca de faixa com pausa, o caso comum no Spotify sem crossfade). O Respiro continua só congelando, sem recomeçar.
- Nada muda na interface, no HUD ou no log: o `auto +X dB` e o "measured level" passam a mostrar a janela longa.

Resultado no protótipo do simulador (mesma faixa sintética): break de 16 s guarda ~90 % do contraste, de 32 s ~67 %; abrir com uma faixa a −20 dBFS chega a ~1,4 dB da referência em 15 s; troca alta → baixa **com** 2 s de silêncio fica a ~2,6 dB em 15 s e ~0,5 dB em 30 s; baixa → alta sem silêncio passa no máximo ~2,5 dB da referência depois de 5 s.

**Custo aceito:** troca alta → baixa **sem** silêncio nem crossfade (mixagem contínua) leva ~1 min para igualar — é indistinguível de um break longo, e preservar o break é o pedido. A spec 033 dizia "corrige mais da metade em 15 s"; passa a valer só com a pausa entre as faixas.

## Escopo
**P0**
- `AGC` em `src/renderer/src/agc.ts`: `windowS` 45, `attackS` 4, `releaseS` 10; novos `shortS` 3, `burstDb` 4, `burstS` 0,7, `trackGapS` 1,5. Comentário do cabeçalho atualizado (o "~10 s / ~1 s / ~8 s" some).
- `AutoGain.step` separa silêncio de Respiro (ex.: `step(rms, dt, { quiet, breath })`): os dois congelam; só o silêncio conta tempo para recomeçar a janela. A chamada em `src/renderer/src/main.ts` acompanha. A janela curta (3 s) usa o mesmo buffer ponderado pelo tempo (sem alocar por leitura).
- Simulador e `028-agc-sim`, com os casos novos e os antigos revistos:
  - break de 16 s depois de 60 s de música: ganho sobe ≤ 1,5 dB (≥ 80 % do contraste); break de 32 s: ≥ 60 %;
  - o drop depois do break de 16 s: ganho varia ≤ 1,5 dB nele;
  - mesma faixa a −20 e −8 dBFS chega ao motor com ≤ 2 dB de diferença em 15 s (mantido);
  - baixa → alta sem silêncio: ≤ 3 dB acima da referência em 5 s e ≤ 1 dB em 15 s;
  - alta → baixa com 2 s de silêncio: ≤ 3 dB em 15 s e ≤ 1 dB em 30 s; sem silêncio: ≤ 1,5 dB em 60 s (substitui "mais da metade em 15 s");
  - mantidos: silêncio congela, teto +18, −30 dBFS chega a ≤ 2 dB em 30 s, oscilação < 1 dB com a faixa assentada; novo: Respiro congela sem recomeçar a janela.
- Specs 028 (P1, o "~10 s" do texto) e 033 (critério da troca alta → baixa) apontam para esta.

**P1**
- `028-normalizar` (CI do PR #182): "silêncio: o ganho automático congela" falhou com 1,6 → 1,3 dB em 4 s. A espera fixa de 800 ms antes da primeira leitura vira `poll` até o HUD mostrar o silêncio (spec 035); se a causa for outra, registrar na #178.

## Fora de escopo
- Controle de janela/velocidade na interface; mudar a referência ou o teto.
- Medir loudness com filtro K / LUFS ou portas de nível (gating) — só se o teste no bloco mostrar que a janela longa não basta.
- Mudar o padrão da Memória da Expressividade (continua Curta; ver Perguntas).

## Critérios de aceite
1. `npm run sim:agc` imprime janela 45 s, ataque 4 s, soltura 10 s e os casos acima; `npm run test:ui` (028-agc-sim, 028-normalizar) passa; `npm run typecheck` passa.
2. **No Windows (testar no bloco):** "Normalizar áudio" ligado, uma faixa com break longo e drop (ex.: "Children (Dream Version)", Robert Miles): no break o visual fica quieto e o `auto` do HUD (`Ctrl+Shift+D`) sobe ≤ 1,5 dB; no drop o visual explode e o `auto` não cai mais que ~1,5 dB nos segundos seguintes.
3. **No Windows:** trocar de uma faixa atual alta para uma dos anos 90 mais baixa (com a pausa normal do Spotify): em ~15–30 s as duas reagem parecido; o contrário (baixa → alta) não satura o visual por mais de ~5 s.
4. **No Windows:** pausar a música e voltar não faz o visual reagir a ruído; abrir o Respiro e voltar não muda o `auto`.
5. **No Windows (só observar):** com o Normalizar ligado, comparar Memória Curta e Longa (`Shift+X`) no mesmo break → drop e dizer no bloco qual guarda melhor o contraste.

## Perguntas em aberto
Nenhuma que pare a implementação. Decidido pela rodada (reversível, constantes): janela 45 s, 4 s / 10 s, estouro +4 dB em 3 s, pausa de 1,5 s recomeça a janela; Memória continua Curta por padrão e o critério 5 traz o dado para o usuário decidir. Ver DECISIONS 2026-11-25.

## Referências
- Issue #186 (relato e direção); #97 / spec 033 (teto +18); spec 028 P1; spec 015 (Memória); spec 035 (testes sem espera fixa).
- Protótipo dos números: variações de `AutoGain` rodadas sobre a faixa sintética de `tests/sim/agc-sim.cjs` nesta rodada (não commitado; os casos viram o simulador no P0).
