# 018 — Microinterações da faixa e da gaveta

**Fase:** 2 · **Status:** Em andamento · **Issue:** [#45](https://github.com/atempel/sonic-obsidian/issues/45) · **Depende de:** [009](009-palco-faixa-assinatura.md), [010](010-busca-biblioteca.md), [011](011-ajustes-configuracoes.md)

## Problema
A faixa de controle só aparece e some com um fade. Trocar de preset, sortear, ligar a rotação, favoritar e o medidor não dão a resposta curta e precisa que o design aprovou (DECISIONS 2026-11-08, "Microinterações: o que entra e quando"). As da 011 (M04, M10, M13–M16, M19) já estão no app.

## Proposta
Implementar as microinterações da faixa e da gaveta do catálogo `docs/design/v3/docs/v3-microinteracoes.md`, com a implementação de referência do Palco integrado. Seguir o sistema de movimento: tudo abaixo de 400 ms, ease-out, saída mais rápida que a entrada, só `transform` e `opacity`, nada animando a cada quadro além do medidor. Com `prefers-reduced-motion`, sem deslocamento nem escala e com a partícula do M07 desligada.

## Escopo
**P0**
- **M01 · Faixa em degrau:** ao aparecer, agora tocando → transporte → cauda sobem 6 px com 20 ms entre eles (t-med); ao sumir, juntos, 150 ms.
- **M02 · Troca de título:** na troca de preset, flash violeta de 120 ms no título; o antigo sobe 4 px e some (120 ms), o novo entra de baixo (t-med) e o autor vem 40 ms depois.
- **M03 · Linha da rotação esvazia:** na troca, a linha de progresso esvazia da direita para a esquerda em 220 ms antes de recomeçar.
- **M05 · Aleatório:** as duas setas do `shuffle` se afastam e voltam uma vez (220 ms) ao sortear com o ponteiro.
- **M06 · Rotação liga:** o ícone `repeat` gira 180° ao ligar; ao desligar, só a cor muda.
- **M07 · Favoritar:** a estrela enche do centro (0,6 → 1, t-med) e um losango pequeno (o núcleo da marca) sobe e some em 400 ms; desfavoritar só esvazia.
- **M08 · Balística do medidor:** ataque rápido (~10 ms), queda linear de ~1,5 s do topo ao fundo, pico retido; no silêncio os segmentos se apagam um a um, 30 ms cada.
- **M12 · Gaveta em degrau:** ao abrir a Biblioteca, as 8 primeiras linhas aparecem com 15 ms entre elas; ao fechar, sem degrau.
- **M22 · Cursor some com a faixa:** conferir que o cursor some junto com a faixa (2,5 s) e volta no primeiro movimento, sem atraso (já existe desde a 004; só ajustar se divergir).

## Fora de escopo
M09, M17, M20, M21 e M23 (Fases 3–4); M18 além do fade (DIVERGENCIAS: o painel "Sem áudio" continua em 10 s).

## Critérios de aceite
1. Mexer o mouse com a faixa escondida: os três blocos sobem em degrau; parar 2,5 s: somem juntos, mais rápido do que entraram.
2. `→` e `Espaço`: o título pisca violeta, o antigo sobe e some, o novo entra e o autor vem logo depois; a linha da rotação esvazia antes de recomeçar.
3. Clicar no aleatório anima as setas; pelo `Espaço`, nada anima no ícone.
4. Ligar a rotação gira o ícone; desligar não gira.
5. Favoritar enche a estrela com o losango subindo; desfavoritar só esvazia.
6. O medidor sobe na hora e cai devagar; ao parar a música, apaga em cascata.
7. Abrir a Biblioteca: as primeiras linhas entram em degrau; fechar: a gaveta sai sem degrau.
8. Com "reduzir movimento" do Windows ligado, nada desliza nem escala, mas as mudanças de estado continuam.
9. O fps não cai com a faixa aparecendo e sumindo (HUD, `Ctrl+Shift+D`).

## Perguntas em aberto
Nenhuma: o design marcou os itens como aprovados e o usuário escolheu este PR (DECISIONS).

## Referências
- Protótipo v3 `1794178325-0fd0` ([SYNC.md](../design/v3/SYNC.md)): `docs/v3-microinteracoes.md` (catálogo e sistema de movimento) e `Sonic Obsidian Palco integrado.html` (implementação de referência); laboratórios `Micro Faixa.html` e `Micro Navegação.html`.
- [queue/2026-11-08-microinteracoes.md](../../queue/2026-11-08-microinteracoes.md)
