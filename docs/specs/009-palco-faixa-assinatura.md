# 009 — Palco: faixa de controle e assinatura na troca

**Fase:** 2 · **Status:** A fazer · **Issue:** [#22](https://github.com/atempel/sonic-obsidian/issues/22) · **Depende de:** [008](008-nucleo-comandos-persistencia.md)

## Problema
Hoje o app só se controla por teclas que é preciso decorar, o HUD é de depuração e o nome do preset aparece num toast provisório. O Palco v3 é a tela padrão: só o visual, com uma faixa de controle que aparece ao mexer o mouse e uma assinatura com o crédito do autor a cada troca.

## Proposta
Construir em Preact a faixa de controle, a alça da borda, a assinatura da troca, os toasts e os avisos de silêncio e de captura negada do Palco, todos agindo por comandos do Core (008). O HUD de depuração sai da tela padrão.

## Escopo
**P0 — faixa de controle** (`.strip`, `role="toolbar"`, "Controles do visual")
- Fixa embaixo, centrada, largura máx. 1120 px. Esquerda: botão Biblioteca (abre a gaveta da 010; até lá, desabilitado), título do preset, "por Autor", estrela (favoritar). Centro: Anterior (←), Aleatório (Espaço), Próximo (→), botão Rotação com o tempo restante (`m:ss` ou "off"). Direita: medidor de nível, Buscar (/ ou Ctrl+K), Ajustes rápidos (,), Tela cheia (F11). Cada botão com `title` mostrando o atalho, como no protótipo.
- Linha de 2 px no topo da faixa com o progresso da rotação (vazia com a rotação desligada), atualizada direto no DOM.
- **Auto-hide:** depois de **2,5 s** sem mouse, a faixa some (opacidade 0, desce 12 px) e o cursor some. Não some com gaveta, busca, ajustes ou popover abertos, com foco dentro da faixa, nem com os controles fixados. `H` esconde na hora.
- **Alça da borda:** botão 28×96 px com ícone de biblioteca aparece quando o mouse chega a menos de 24 px da borda esquerda e some depois de 40 px; não aparece com a Biblioteca ou a busca abertas.
- Controles com `-webkit-app-region: no-drag` (DECISIONS, spec 004); a área de arrasto continua funcionando fora deles.
- **Assinatura na troca:** no topo, título do preset (28–48 px, máx. 22ch) e "por Autor", com uma barra de 240×2 px que enche durante o blend usado (mínimo 400 ms). Visível por `max(4 s, blend + 1,5 s)`, com fade-in de 180 ms e fade-out de 600 ms. O crédito do autor nunca é cortado nem omitido.
- Toast global (centro, 128 px acima da base, 3,2 s) para mensagens de comando ("Adicionado aos favoritos." etc.).
- Ícones Lucide empacotados localmente (não por CDN); tokens de cor, tipo e movimento derivados de `so-v3-base.css`.

**P0 — estados do Palco**
- **Silêncio:** cartão "Sem áudio" / "Toque algo no computador e o visual reage. A captura continua ligada.", ligado ao estado de silêncio da 005 (mesmos 10 s); o medidor zera e a rotação pausa a contagem.
- **Captura negada:** alerta "Não foi possível capturar o áudio" / "O Windows recusou a captura da saída padrão. Feche apps que usam o áudio em modo exclusivo e tente de novo.", com "Tentar de novo" (refaz a captura) e "Abrir configurações de som" (`ms-settings:sound`). Rotação pausa.

**P1**
- Configuração interna "fixar controles" (sem UI própria até a 011) que impede o auto-hide.
- HUD de depuração (fps, ganho) só com uma tecla de desenvolvedor ou em Configurações › Desempenho "Mostrar fps na faixa" (011).

## Fora de escopo
Botões de fonte de áudio, modo Rack (`M`), chip de IA, aviso de preset pesado (012), Biblioteca, busca e ajustes (010, 011 — aqui só os botões que os abrem).

## Critérios de aceite (estados da barra "Protótipo" do Palco integrado)
1. **Normal:** ao mexer o mouse a faixa aparece com título, autor, estrela e os botões; 2,5 s parado ela some junto com o cursor; `H` esconde na hora.
2. Cada botão da faixa faz o mesmo que sua tecla (anterior, aleatório, próximo, rotação, favoritar, tela cheia) e o `title` mostra a tecla.
3. Com o foco num botão da faixa (Tab), ela não some.
4. A linha de progresso enche até a troca automática e o tempo restante conta em `m:ss`; com a rotação desligada aparece "off" e a linha fica vazia.
5. A cada troca de preset aparecem título e "por Autor" no topo, com a barra acompanhando o blend, e somem depois de ~4 s.
6. Encostar o mouse na borda esquerda mostra a alça; afastar mais de 40 px a esconde.
7. **Silêncio:** pausando a música, depois de 10 s aparece "Sem áudio", o medidor zera e o tempo da rotação para; ao voltar o som, tudo some e a contagem continua.
8. **Captura negada:** simulando a recusa (ex.: outro app em modo exclusivo), aparece o alerta; "Tentar de novo" volta a capturar quando a causa some.
9. **Fixar controles:** ligado, a faixa não some.
10. O fps em tela cheia com a faixa visível e escondida fica igual ao da Fase 1 (usuário confere).

## Perguntas em aberto
- O texto do silêncio do Palco ("Sem áudio") difere do aviso do Setup ("Nenhum som chegando", já no código pela 005). Proposta: Palco usa "Sem áudio"; registrar em DIVERGENCIAS e pedir ao design um texto só.
- O aviso de captura negada substitui o diagnóstico completo da 012 ou abre ele? Proposta: "Tentar de novo" aqui; o checklist detalhado fica na 012.

## Referências
- Protótipo v3 `1794154301-3f85` ([SYNC.md](../design/v3/SYNC.md)): `Sonic Obsidian Palco integrado.html` — estados Normal, Silêncio, Captura negada, Fixar controles; `docs/design/v3/docs/v3-modelo-de-navegacao.md` (atalhos globais) e `v3-brief-visual-e-craft.md` (tokens, contraste)
- Specs [004](004-janela.md) (arrasto, cursor), [005](005-sinal-entrada.md) (silêncio)
