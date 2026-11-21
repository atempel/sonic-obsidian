# 036 — "Preset preto" no log de um preset que desenha (detector de 9 pontos)

**Fase:** 3 (diagnóstico) · **Status:** pronta · **Issue:** [#99](https://github.com/atempel/sonic-obsidian/issues/99) · **Milestone:** v0.11.0 · **Personas:** — (só o log; nada muda na tela)

## Problema
No teste do bloco v0.6.0 (#91) o log trouxe `black preset: martin - reflections on black tiles (shaders compiled; 3 s all black with sound playing)`. O usuário não relatou tela preta, só a linha do log.

Investigação no headless (Chromium + SwiftShader, áudio simulado a 124 BPM, rodada de 2026-11-21):
- o preset **desenha**: fundo quase preto de propósito (o `warp` multiplica o quadro anterior por `q32 ≈ 0,996` e subtrai 0,02 a cada quadro), com formas pequenas que andam (círculo de raio 0,049 com alfa ≥ 0,2, quadradinhos no beat) e a onda em pontos só nos picos;
- em 8 s, de 5 % a 23 % dos pixels ficam acesos (média 6–25 de 765), e a imagem é a de "ladrilhos pretos" do nome;
- as equações e os shaders não têm nada suspeito para o Windows (o `tan` do `warp` é `sin/cos` com `clamp` de ±20; não gera NaN).

O detector de `src/renderer/src/main.ts` (`isBlackFrame`) lê **9 pixels** (grade 3×3 em 20/50/80 %) e dá "preto" se os nove ficarem ≤ 6 por 3 s. Num preset escuro com detalhes pequenos, os nove pontos caem no fundo. É **falso positivo** do detector, não um preset quebrado. Um log com alarme falso esconde o caso de verdade (PR #80: a onda em pontos sumindo no ANGLE).

## Proposta
Trocar a amostra de 9 pontos por uma **miniatura do quadro inteiro**:
- logo depois do render (o mesmo ponto de hoje), copiar o framebuffer padrão para um framebuffer de 64×36 com `blitFramebuffer` (filtro `LINEAR`) e ler os 2304 pixels com um único `readPixels`;
- "preto" = **todos** os pixels da miniatura com R, G e B ≤ 6 (o mesmo limite de hoje); o resto da regra fica igual (3 leituras seguidas, uma por segundo, só depois da troca, pausa no silêncio);
- o framebuffer da miniatura é criado na primeira leitura e reaproveitado; refeito se o contexto for perdido/recriado (a referência do `gl` mudou).

Custo: só roda nos ~3 s depois de cada troca, uma vez por segundo — um blit pequeno e uma leitura de 9 KB, contra nove `readPixels` hoje.

## Escopo
**P0** — `isBlackFrame` com a miniatura; teste headless `036-preset-preto`.

## Fora de escopo
- Pular presets pretos (DECISIONS 2026-11-10: alguns são escuros de propósito; o log continua só registrando).
- Mudar o preset ou o `warp` dele.
- O detector de shader que não compila (`shaderError`), que não muda.

## Critérios de aceite
1. **Headless, sem alarme falso:** com "martin - reflections on black tiles" carregado e o áudio simulado tocando, nenhuma linha `black preset` no log em 8 s (o teste confere que a checagem rodou: o `blackCheck` chega ao fim sem log).
2. **Headless, preto de verdade continua detectado:** uma cópia do preset com o `comp` trocado por `ret = vec3(0.0);` (entra pela biblioteca simulada, como os importados) registra `black preset: …` em até 6 s.
3. **Headless, preto quase todo:** o mesmo preset preto com um quadradinho aceso de ~3 % da tela (forma com `rad` pequeno e alfa 1) **não** registra — garante que a miniatura enxerga detalhe pequeno fora da grade antiga.
4. `npm run test:ui` passa (o `021-pontos-onda` continua igual).
5. **Windows (testar no bloco):** tocar "martin - reflections on black tiles" por 10 s com música; o log (`Ctrl+Shift+L`) não traz `black preset` para ele.

## Perguntas em aberto
Nenhuma. Decidido pela rodada (`agent-decided`, reversível): tamanho da miniatura 64×36 e o mesmo limite ≤ 6 (DECISIONS 2026-11-21).

## Referências
- Issue #99; bloco v0.6.0 (#91); PR #80 e DECISIONS 2026-11-10 ("Tela preta sem aviso").
- `src/renderer/src/main.ts` (`isBlackFrame`, `blackCheck`); `tests/headless/021-pontos-onda.test.cjs` (padrão de teste com preset fixo).
- Preset: `node_modules/butterchurn-presets/presets/converted/martin - reflections on black tiles.json`.
