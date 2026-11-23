# 042 — Faixa presa sob o mouse e Ajustes rápidos fechando com clique fora

**Fase:** Manutenção (interface) · **Status:** implementada · **Issue:** [#181](https://github.com/atempel/sonic-obsidian/issues/181) · **Design:** `Palco integrado`, versão `1794680346-fb12`

## Problema (pedido do usuário, 2026-11-23)
1. Com o ponteiro parado em cima da faixa de controle, ela some depois de 2,5 s como se o mouse estivesse sobre o visual.
2. Os Ajustes rápidos só fecham pelo `x`, pela tecla `,` ou por `Esc`. O protótipo já fecha com clique fora do painel; o app não.

## Proposta
- **Faixa:** o auto-hide (`src/renderer/src/ui/idle.ts`) não esconde enquanto o ponteiro estiver sobre o `.strip-wrap` (faixa, plaquinha de atualização, painel de coleções). Saiu dele, volta a contar os 2,5 s. `H` continua escondendo na hora.
- **Ajustes rápidos:** clique fora do painel fecha, e o clique segue para o alvo (um botão da faixa fecha os Ajustes e faz o seu). Não fecham: o próprio painel, o botão dos Ajustes na faixa (ele alterna), o menu e o diálogo de Feedback abertos dos Ajustes e o painel de atalhos `?`. Fora da faixa fecha no `pointerdown`, como no protótipo; dentro da faixa fecha no `click`, porque fechar desloca a faixa (ela abre 356 px para o painel) e o botão sairia de baixo do ponteiro antes de soltar.

## Critérios de aceite
1. Ponteiro parado sobre a faixa por mais de 2,5 s: a faixa e o cursor continuam visíveis. Ao sair, somem depois de 2,5 s.
2. `H` esconde a faixa na hora, mesmo com o ponteiro em cima.
3. Com os Ajustes abertos, clicar no visual fecha; clicar dentro do painel não fecha.
4. O botão dos Ajustes na faixa abre e fecha com um clique cada.
5. Com os Ajustes abertos, clicar noutro botão da faixa (ex.: Biblioteca) fecha os Ajustes e faz a ação do botão.
6. Menu e diálogo "Relatar um problema" (Feedback) abertos dos Ajustes continuam funcionando sem fechar o painel por baixo.

## Verificação
Teste headless `042-faixa-ajustes` (critérios 1–5; o 6 pelo `031-feedback`, que segue passando). Mouse de verdade e o visual, no teste do bloco no Windows.
