# 004 — Janela: tela cheia, sem moldura e fps

**Fase:** 1 · **Status:** A fazer · **Issue:** [#8](https://github.com/atempel/sonic-obsidian/issues/8)

## Problema
O spike já alterna tela cheia com `F11`, mas a janela ainda tem a moldura padrão do Windows, o cursor fica visível sobre o visual e o loop segue a taxa do monitor (180 fps num monitor de 180 Hz), gastando GPU além do necessário.

## Proposta
Fazer da janela parte do visual: sem moldura, arrastável, redimensionável e fechável pelo teclado, com `F11`/`Esc` formalizados e o cursor sumindo quando parado em tela cheia. Opcionalmente, permitir limitar o fps para poupar a GPU.

## Escopo
**P0**
- Formalizar `F11` (alterna tela cheia) e `Esc` (sai da tela cheia; fora dela não faz nada), como já existem em `src/main/index.ts`.
- Janela sem moldura (`frame: false`), que pode ser arrastada pelo mouse e redimensionada pelas bordas, sem barra de título visível.
- Fechar por teclado (`Alt+F4` e `Ctrl+W`).
- Em tela cheia, o cursor some após ~3 s sem mexer o mouse e volta ao mexer.

**P1**
- Limite opcional de fps: "monitor" (padrão, como hoje) ou 60 fps, como valor em `src/renderer/src/config.ts` (sem tecla: `F` é favoritar nos atalhos v3; a opção ganha UI em Configurações › Renderização, "limite de quadros", na Fase 2). Para testar na Fase 1, o build pode sair com o limite ligado. O HUD mostra o modo ativo.
- Registrar em DECISIONS.md a técnica escolhida para limitar.

## Fora de escopo
Botões de janela desenhados (minimizar/maximizar/fechar) e barra de título própria (Fase 2). Persistir tamanho, posição e modo (Fase 4). Múltiplos monitores e escolha de tela. Ícone e bandeja do sistema.

## Critérios de aceite
1. `F11` entra e sai da tela cheia; em tela cheia, `Esc` sai; em janela, `Esc` não fecha nem faz nada.
2. A janela não mostra barra de título nem bordas do Windows.
3. É possível arrastar a janela pelo visual e redimensioná-la pelas bordas; o visual acompanha o novo tamanho sem esticar.
4. `Alt+F4` e `Ctrl+W` fecham o app.
5. Em tela cheia, parar o mouse faz o cursor sumir em cerca de 3 s; mexer o mouse o traz de volta.
6. (P1) Com o limite ligado, o fps no HUD fica em 60 (±2) num monitor de 180 Hz; desligado, volta a acompanhar o monitor.
7. (P1) Com o limite em 60 fps, o uso de GPU no Gerenciador de Tarefas cai de forma visível em relação ao modo "monitor", com o mesmo preset.

## Perguntas em aberto
- Como limitar o fps: pular quadros no `requestAnimationFrame` (descartar quadros por intervalo de tempo) ou outra técnica (por exemplo, `setTimeout` com agendamento, ou flag do Chromium para a taxa de quadros)? Pular quadros no rAF é a opção mais simples, mas fica irregular em taxas que não são múltiplas de 60; medir e registrar a decisão.
- Sem moldura, como arrastar sem barra de título: `-webkit-app-region: drag` cobrindo a janela inteira conflita com cliques e teclado? Definir uma área de arrasto mínima.

## Referências
- [docs/PRD.md](../PRD.md) — Fase 1, "Fullscreen (F11) e janela sem moldura"
- DECISIONS.md, "Spike 001: respostas" — loop segue o monitor (180 fps em 180 Hz)
- [CONTEXT.md](../../CONTEXT.md) — alvo de 60 fps em tela cheia (RTX 3070)
- `src/main/index.ts` (criação da janela, `F11`/`Esc`), `src/renderer/src/main.ts` (loop por `requestAnimationFrame`)
