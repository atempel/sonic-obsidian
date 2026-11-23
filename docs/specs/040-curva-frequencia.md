# 040 — Curva por frequência (EQ de 16 bandas na Expressividade)

**Fase:** 3 (reação ao áudio) · **Status:** pronta · **Issue:** [#112](https://github.com/atempel/sonic-obsidian/issues/112) · **Milestone:** v0.12.0 · **Personas:** DJ de Festa (quer o visual batendo no bumbo e não na linha de baixo), Nostálgico do Winamp (fala "graves/agudos", reconhece um EQ na hora), Criador de presets (quer ver um preset reagir a uma faixa estreita)

## Problema
O preset só recebe três números, `bass`, `mid` e `treb`, e o app não tem como dizer *a quais frequências* o visual reage: o Nível diz quanto, o Caráter diz como, a Memória diz contra o quê. O usuário aprovou na sessão de design de 10/11/2026 uma **curva por frequência**: um EQ gráfico de 16 bandas que não mexe no som, só no quanto cada faixa mexe o visual, sem nomes de instrumento (`docs/design/v3/docs/v3-reatividade.md`). O design pedia um spike antes da spec; o resultado está abaixo.

## Spike (2026-11-23, `spike/040/`)
Medido no Butterchurn `3.0.0-beta.5` (o do app) no Chromium headless, com tons puros e o motor de verdade:
1. **O gancho existe e já é o nosso.** `renderer.audioLevels.updateAudioLevels(fps, frame)` é o que a Expressividade embrulha desde a 015/028 (`src/renderer/src/expression.ts`). Dentro dele o motor soma `audio.freqArray` nas três zonas (`imm`) e calcula `avg`, `longAvg`, `val` e `att` a partir dessa soma. O `freqArray` mono só é lido ali (as ondas de espectro usam `freqArrayL/R`), e é refeito a cada `sampleAudio()`.
2. **Zonas do motor:** raias de ~43 Hz (`sampleRate / 1024`), `bass` = 20–320 Hz, `mid` = 320–2 800 Hz, `treb` = 2 800–11 025 Hz (o pico de um tom cai na raia `f / 43` em 44,1 e 48 kHz). O design fala em 250 Hz e 4 kHz: o fato técnico é este. **Nada acima de 11 kHz entra no motor.**
3. **O motor pesa as raias** (`equalize` do MilkDrop: peso ≈ 0 na raia 0, crescendo para cima) e lê o áudio em 8 bits. Com o `freqArray` dele, as bandas de 20, 31,5 e 50 Hz caem nas mesmas 1–2 raias e quase não pesam: uma curva feita só com ele não separaria os graves de baixo.
4. **Custo de um `AnalyserNode` próprio** (ler o espectro + somar as raias com pesos), por quadro: FFT 2048 = 0,03 ms, 4096 = 0,05 ms, 8192 = 0,09 ms; com a CPU 6× mais lenta (como o runner do CI) 0,13 / 0,28 / 0,59 ms. Desprezível perto do quadro de 16,7 ms.

**Abordagem escolhida (razão por zona):** o `AnalyserNode` próprio (FFT 4096, ~11 Hz por raia, janela de ~90 ms) mede, para cada zona, a razão `r = Σ m·g / Σ m` entre a energia pesada pela curva e a energia sem peso (`m` = magnitude da raia, `g` = ganho da curva naquela frequência). Antes de chamar o `updateAudioLevels` original, o app multiplica as raias do `freqArray` do motor de cada zona pela razão dela. O motor então calcula `imm`, `avg`, `longAvg`, `val` e `att` como sempre, já com a curva. Por quê:
- **Curva plana = o motor intacto**, por construção (`g = 1` → `r = 1`). Nada muda para quem não mexe.
- A Memória continua valendo como o design descreve (em Curta, subir uma zona inteira por igual se desfaz em ~4 s; em Fixa a curva inteira age), porque as médias do motor e a média própria da Expressividade (Longa/Fixa/Viva) passam a ver o `imm` pesado.
- O tempo da batida continua vindo do motor (raias de 23 ms); a razão só muda o peso.
- As bandas de 12,5k e 20k Hz não ficam mortas: no cálculo da razão a zona `treb` vai até o fim do espectro. Com som acima de 11 kHz (pratos, "ar"), subir essas barras sobe o `treb`.

## Proposta
**Bandas e valores** (design): 16 bandas ISO de 2/3 de oitava, 20 · 31,5 · 50 · 80 · 125 · 200 · 315 · 500 · 800 · 1,25k · 2k · 3,15k · 5k · 8k · 12,5k · 20k Hz; cada uma de −12 a +12 dB, passo 1 dB, padrão 0. O ganho de uma raia é a curva interpolada em dB sobre log(f) entre os centros das bandas (constante abaixo de 20 Hz e acima de 20 kHz), `g = 10^(dB/20)`. Cada raia do analisador conta para a zona do motor onde cai (até 320 Hz, até 2 800 Hz, o resto), pesada pelo mesmo `equalize` do motor na frequência dela (fixo no valor de 11 kHz acima disso), para que a razão meça o que o motor mede. Zona sem energia → `r = 1`.

**Predefinições** (dB por banda, 20 Hz → 20 kHz): Plana (tudo 0); Graves `+6 +6 +5 +4 +2 0 −2 −3 −3 −3 −3 −3 −3 −3 −3 −3`; Médios `−3 −3 −3 −2 0 +2 +4 +5 +5 +4 +2 0 −2 −3 −3 −3`; Agudos `−3 −3 −3 −3 −3 −3 −2 −1 0 +1 +2 +4 +5 +6 +6 +5`; Sorriso `+5 +5 +4 +3 +1 0 −2 −3 −3 −2 0 +1 +3 +4 +5 +5`. Editar uma barra à mão → **Personalizada**, que continua mesmo se a curva voltar a ser igual a uma predefinição, até a pessoa escolher outra (decisão do usuário, 10/11).

**Estado:** `settings.expression.curve16: number[16]` (inteiros, −12…+12) e `settings.expression.curvePreset: 'flat' | 'lows' | 'mids' | 'highs' | 'smile' | 'custom'` (padrão `flat`). Sanitizado em `state.ts`: lista com tamanho errado ou valor inválido → curva plana; valor fora da faixa → preso na faixa e arredondado. Comando `expression.set` aceita `curve16` (vira `custom`) e `curvePreset` (aplica os valores da predefinição). O campo `curve` (Caráter) não muda de nome.

**Interface** (página Palco integrado › Ajustes rápidos › Expressividade e Configurações › Visual; versão do espelho `1794603894-598c`, doc idêntico no artefato `1794680346-fb12`):
- **Ajustes rápidos › Expressividade**, depois de Nível, Caráter e Memória: linha **Curva** com o segmentado Plana · Graves · Médios · Agudos · Sorriso (+ "Personalizada" quando for o caso) e, abaixo, o **EQ**: 16 barras finas arrastáveis na vertical (clique define o valor, duplo clique volta a 0 dB), linha de 0 dB, curva em violeta, espectro ao vivo atrás em `text-3` (do analisador próprio), as três zonas desenhadas atrás com o rótulo mono `bass` · `mid` · `treb` nas posições do motor (320 Hz e 2,8 kHz). Balão mono com a banda sob o ponteiro ("80 Hz · +4 dB", M15). Teclado com o EQ em foco: ←/→ escolhem a banda, ↑/↓ ±1 dB, Shift ±3; `Home` volta a banda a 0 dB.
- Com Memória Curta ou Longa (ou Viva) e a curva fora do plano: linha "Com a memória *Fixa*, a curva age por inteiro." e o botão **Usar Fixa** (roda `expression.set { adaptation: 'fixed' }`).
- **Configurações › Visual › Expressividade:** o mesmo EQ com ~160 px de altura, rótulos de frequência embaixo, escala em dB à esquerda e **Restaurar plana**.
- Textos pela spec 030 (chaves em `en.ts`/`pt-BR.ts`; glossário: Frequency curve · Flat · Lows · Mids · Highs · Smile · Custom / Curva por frequência · Plana · Graves · Médios · Agudos · Sorriso · Personalizada).
- **HUD** (`Ctrl+Shift+D`): linha `curve <preset> r <bass> <mid> <treb>` com as razões do quadro (duas casas), em inglês; `curve flat` quando plana.
- **Busca rápida:** comandos "Curva por frequência: <predefinição>".
- Sem Expressividade (motor sem `audioLevels`) a curva fica indisponível do mesmo jeito que o Nível, o Caráter e a Memória ficam hoje.

## Escopo
**P0**
- Módulo puro `src/renderer/src/freq-curve.ts` (predefinições, interpolação, pesos por raia, razão por zona) e o gancho em `expression.ts`, chamando o analisador próprio ligado ao mesmo nó que alimenta o motor (o `gain` de `connectAudio`), com `smoothingTimeConstant = 0`.
- Estado, sanitização, comando `expression.set`, Ajustes rápidos (segmentado + EQ + linha da Fixa), HUD, comandos na busca.
- Teste headless `040-curva-frequencia`: o módulo transpilado (plana → razões 1 exatas; Graves com tom de 60 Hz → `r_bass` > 1,8; Agudos com tom de 60 Hz → `r_bass` < 0,8; tom de 14 kHz com +6 dB em 12,5k/20k → `r_treb` > 1,5; zona muda → 1; interpolação nos centros = valor da banda); na interface, com o `getDisplayMedia` simulado tocando um tom, escolher Graves e ler a razão no HUD, arrastar uma barra → "Personalizada", voltar à predefinição só pelo segmentado, teclado ←/→/↑/↓, "Usar Fixa" muda a Memória, a curva sobrevive a reabrir (`settings.json`), e a sanitização de valores ruins. Os dois idiomas pelo `030-idiomas`.

**P1**
- Configurações › Visual › Expressividade (EQ grande + Restaurar plana).
- Perfis (spec 038): `curve16` e `curvePreset` entram no grupo Expressividade; perfil salvo antes disso aplica a curva plana. Se a 038 ainda não estiver no `main`, isto vai para o PR dela.

## Fora de escopo
- MCP (`set_signal` com `eq_curve`): entra com a fase do MCP.
- Mudar o som que sai das caixas, nomes de instrumento, mais de 16 bandas, curva por preset.
- Mudar as zonas do motor ou o `equalize` dele (sem fork).

## Critérios de aceite
1. Com a curva **Plana**, `bass`/`mid`/`treb` (HUD) são os mesmos de antes da mudança, quadro a quadro (teste headless: razões exatamente 1 e `freqArray` intocado).
2. **Graves** com música: o visual segue mais o grave; **Agudos**: segue mais pratos e chimbal. A diferença se vê em presets que pulsam com `bass` (testar no bloco).
3. Com Memória **Curta**, subir as 7 barras de 20 a 315 Hz por igual (+6 dB): o `bass` do HUD sobe e volta perto do valor anterior em ~4 s. Com **Fixa**, continua alto.
4. Subir 80 Hz e baixar 200 Hz (Curta): o `bass` acompanha o bumbo mais que a linha de baixo (testar no bloco, com uma faixa de bumbo marcado).
5. Arrastar uma barra mostra "Personalizada" e o balão "<banda> · <valor> dB"; duplo clique volta a 0; o rótulo só sai de "Personalizada" escolhendo uma predefinição.
6. Teclado: com o EQ em foco, ←/→ trocam a banda e ↑/↓ mudam 1 dB (Shift 3), presos em −12…+12.
7. Memória fora de Fixa e curva fora do plano → aparece a linha da Fixa; "Usar Fixa" troca a Memória e a linha some.
8. A curva e a predefinição voltam iguais ao reabrir o app; `settings.json` com `curve16` inválido abre com a curva plana.
9. Custo: no `perf:win` (spec 025), o ms por quadro com a curva Sorriso fica a no máximo +0,3 ms do resultado com a curva plana (testar no bloco / CI Windows).
10. Os textos aparecem traduzidos nos dois idiomas, sem corte (teste `030-idiomas`).

## Perguntas em aberto
Nenhuma do usuário. Decididas pela rodada (`agent-decided`, DECISIONS 2026-11-23): razão por zona aplicada ao `freqArray` do motor (não trocar o `imm` depois dele); FFT 4096; zonas pelos cortes do motor (320 Hz e 2,8 kHz) e não pelos 250 Hz e 4 kHz do design (entrada em `DIVERGENCIAS.md`); bandas acima de 11 kHz contam para o `treb`; mudar a curva não refaz a semente da Fixa (a Fixa mede contra a média congelada, então a curva age por inteiro, como o design quer); `Home` zera a banda em foco; nomes `curve16`/`curvePreset` do design.

## Referências
- Design: `docs/design/v3/docs/v3-reatividade.md` (sha `e56774071ca3`, igual no artefato `1794680346-fb12`); páginas Palco integrado (Ajustes rápidos › Expressividade) e Configurações › Visual; M15 (balão de valor) em `v3-microinteracoes.md`.
- Specs 015 (Expressividade), 028 (Memória e ganho automático), 030 (idiomas), 025 (desempenho), 038 (perfis).
- `src/renderer/src/expression.ts`; Butterchurn `AudioLevels`/`AudioProcessor` em `node_modules/butterchurn/dist/butterchurn.min.js`.
- `spike/040/medir.html` + `medir.cjs` (números acima); `docs/research/reatividade/2026-11-11-destravar-reatividade.md` (item A7).
