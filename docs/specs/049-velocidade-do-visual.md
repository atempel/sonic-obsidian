# 049 — Velocidade do visual

**Fase:** 3 (reatividade, item C1 da pesquisa) · **Status:** esperando decisão do usuário (direção técnica) e depois desenho · **Issue:** [#216](https://github.com/atempel/sonic-obsidian/issues/216) · **Personas:** as mesmas da 028 (quem fica "tocando" o visual ao vivo) · **Design:** nenhum ainda; o protótipo `1794680346-fb12` só tem velocidade de **clipe de vídeo** (`Modo performance`, 0,25×–2×), não do preset

## Problema
Pedido do usuário (2026-11-11, `queue/2026-11-11-controle-velocidade.md`), depois de testar a Expressividade: um controle de velocidade do visual, ao lado da Expressividade e da Memória, para deixar um preset mais calmo numa música lenta ou mais agitado num drop.

O app já desacelera o relógio do preset no silêncio (`renderSafe(dt * speed)` em `main.ts`, até 15 %). A ideia óbvia é pôr um multiplicador do usuário no mesmo ponto. **Mas isso só desacelera parte do preset** (levantamento abaixo), e a escolha de como ir além é de direção.

## O que o relógio controla hoje (Butterchurn 3, `calcTimeAndFPS`)
Passar `elapsedTime = dt × v` ao `render`:
- `time` anda `v×` mais devagar/rápido (`time += 1/fps`, e o `fps` que o motor estima passa a ser `fps_real / v`).
- Equações que integram por `1/fps` acompanham (o `fps` delas muda junto).
- A animação do warp (`time × warpanimspeed`) e os shaders que usam `time` acompanham.
- **As misturas entre presets também** (`blendProgress` é medido em `time`): a 0,5× uma troca de 2,7 s leva 5,4 s.
- **Não acompanham:** o movimento por quadro — `zoom`, `rot`, `dx`, `dy`, `warp` aplicados a cada quadro sobre o quadro anterior (feedback) — e contadores por quadro (`frame`).

Nos 504 presets convertidos do `butterchurn-presets` 3: 123 citam `time` nas equações ou nos shaders; **403 têm movimento por quadro** (zoom ≠ 1, rot, ou equação que escreve `zoom`/`rot`/`dx`/`dy`). Na maioria dos presets, a sensação de velocidade vem do feedback por quadro, que o relógio sozinho não muda. É por isso que o silêncio "desacelera" mas não congela.

## Opções (decisão do usuário)
| | Como | Efeito | Custo / risco |
|---|---|---|---|
| **A. Só o relógio** | multiplicador no `elapsedTime`, como o silêncio | parcial: ondas, formas, shaders e warp; o zoom/rotação contínuo segue igual na maioria | quase nenhum; pronto numa rodada |
| **B. A + movimento por quadro** (recomendada) | A, mais um gancho **por instância** no `runFrameEquations` do motor (como o do `blendPattern` em `visualizer.ts`, sem patch no pacote): escala `zoom−1`, `rot`, `dx`, `dy` e `warp` por `v` antes da malha | quase completo: o feedback anda `v×`; equações por pixel que reescrevem `zoom`/`rot` (rodam no WASM) ficam fora | médio; método interno do Butterchurn 3 (versão fixada), coberto por teste headless; 1 spike curto antes |
| **C. Ritmo de quadros** | acima de 1× renderiza o motor mais vezes por quadro; abaixo, menos vezes | completo e fiel | caro: 2× = o dobro de GPU; abaixo de 1× perde fluidez (parece travado). Não recomendada |

Em qualquer opção:
- Faixa **0,25× a 2×**, passo 0,05, padrão 1× (mesma faixa do clipe no protótipo). Valor salvo em `settings.json`; vale para todos os presets (não por preset).
- O silêncio multiplica por cima (`v × velocidade do silêncio`); o Respiro não muda a velocidade.
- O beat, a rotação e o `Trocar no beat` seguem o relógio real (`performance.now`), não o do preset.
- **Misturas:** com A/B elas também mudam de duração. Proposta: compensar (passar ao motor `blendTime × v`) para a troca durar o que o usuário escolheu.
- HUD (`Ctrl+Shift+D`): `speed 0.50x`. Log na mudança: `[speed] 0.50x`.

## Escopo (depois da decisão)
- **P0:** a opção escolhida; comando `visual.speed` no Core; atalhos para diminuir/aumentar/voltar a 1× (teclas a definir pelo desenho, conferidas em `shortcuts.ts`); controle na interface **segundo o desenho**; HUD e log; i18n (en + pt-BR); teste headless (o multiplicador que chega ao motor lido do HUD; com B, um preset de zoom contínuo comparado em 1× e 0,5× por quadros).
- **P1:** campo nos Perfis (spec 038) e linha em Configurações › Visual.
- **Fora de escopo:** velocidade por preset; velocidade pela energia (`bass`/nível, como no clipe do Modo performance) — fica para a frente de vídeo/VJ; revisão do Caráter (`X`), citada no mesmo pedido, vira issue própria se o usuário quiser.

## Critérios de aceite (rascunho; fecham com a decisão e o desenho)
| # | Critério | Como verificar |
|---|---|---|
| 1 | Com 0,5×, a linha `speed` do HUD mostra `0.50x` e o relógio do motor anda metade (`time` do preset lido de volta) | headless |
| 2 | (B) Um preset de zoom contínuo a 0,5× leva o dobro de quadros para o mesmo zoom acumulado | headless (motor real, comparação de quadros) |
| 3 | Uma troca com mistura de 2,7 s dura ~2,7 s em 0,5× e em 2× | headless (log da troca) |
| 4 | No silêncio, a velocidade cai como hoje a partir da escolhida; volta a ela com o som | headless (024/028 simulam áudio) |
| 5 | O valor sobrevive à reabertura (`settings.json`) | headless |
| 6 | No Windows, com música: 0,5× deixa presets de zoom/rotação visivelmente mais calmos; 2× mais agitados, sem queda de fps | teste do bloco |

## Perguntas em aberto (para o usuário)
1. **Direção técnica:** A, B (recomendada) ou C?
2. **Misturas:** compensar para manter a duração escolhida (recomendado) ou deixar acompanharem a velocidade?
3. Depois da resposta: o **desenho** do controle (onde fica nos Ajustes rápidos, teclas, Modo Simples) vai para o Claude Design.

## Referências
- `queue/2026-11-11-controle-velocidade.md`; pesquisa `docs/research/reatividade/2026-11-11-destravar-reatividade.md` (C1)
- `node_modules/butterchurn/dist/butterchurn.js` (3.x fixado): `calcTimeAndFPS`, `PresetEquationRunnerWASM.runFrameEquations`
- `src/renderer/src/main.ts` (laço de render, silêncio), `src/renderer/src/visualizer.ts` (gancho do `blendPattern`), `src/renderer/src/silence.ts`
- Protótipo `1794680346-fb12`: `Sonic Obsidian Modo performance.html` (velocidade do clipe, só como referência de faixa)
