# Sonic Obsidian v3 — Microinterações

> Passagem de 08/11/2026 sobre o Palco integrado. Exploração com laboratório ao vivo (páginas "Microinterações — Faixa e feedback" e "Microinterações — Navegação e estados"). Referências em `docs/v3-microinteracoes-referencias.md`. Status de cada item: **Proposto** até o usuário escolher.

## 0. O que existe hoje
Só fades e deslizamentos (faixa, gaveta, painel, toast, cartão de crédito com linha do blend, wipe no visor do Rack, letreiro). Não há resposta ao pressionar, indicador compartilhado entre abas, animação de valor, balística no medidor, nem transição entre modos.

## 1. Sistema de movimento
Princípio da marca: **a casca não se mexe sozinha.** O visual é o único elemento contínuo. A interface responde a duas coisas: o gesto da pessoa e eventos discretos do áudio (beat, troca de preset). Toda animação de UI termina em menos de 400 ms, salvo o blend (que é do motor).

| Uso | Duração | Curva | Token |
| --- | --- | --- | --- |
| Pressionar (feedback de toque) | 80 ms | linear | `t-beat-in` |
| Hover, cor, ícone | 120 ms | ease-out | `t-fast` |
| Entrar (popover, toast, faixa) | 220 ms | ease-out expo `(0.16,1,0.3,1)` | `t-med` |
| Painéis laterais entrando / saindo | 250 / 180 ms | ease-out | `t-sheet-in` / `t-sheet-out` |
| Sair (qualquer coisa) | ~⅔ da entrada | a mesma ease-out (nunca ease-in) | `ease-out` |
| Liberação de beat, queda de pico | 400 ms | ease-out | `t-beat-out` |

Regras (destiladas das referências): o que acontece muitas vezes por dia não anima (busca, foco, atalhos); saída mais rápida que a entrada e também ease-out; entradas com escala partem de 0,97, nunca de 0; transições CSS (interrompíveis) em vez de keyframes para o que pode ser re-disparado; nada de bounce/elastic; stagger no máximo 20 ms por item e só nos primeiros 8; animar `transform` e `opacity` (nunca layout); nenhuma animação dispara a cada quadro do áudio, exceto medidor e indicador de beat.

## 2. Catálogo

### Faixa de controle e transporte
- **M01 · Faixa entra em degrau** — ao revelar, os três blocos sobem 6 px com 20 ms de diferença (agora tocando → transporte → cauda), `t-med`. Ao esconder, tudo junto, `ease-in` 150 ms.
- **M02 · Troca de título na faixa** — na troca de preset, um flash curto do violeta (120 ms) confirma a troca; o título antigo sobe 4 px e some (120 ms), o novo entra de baixo; o autor vem 40 ms depois. Sincronizado com o início do blend.
- **M03 · Linha de rotação que esvazia** — ao trocar, a linha de progresso não salta para zero: esvazia da direita para a esquerda em 220 ms e recomeça.
- **M04 · Pressão dos botões** — `ibtn` desce para 0,97 em 80 ms ao pressionar e volta com `t-fast`. No clique com o ponteiro, o ícone de anterior/próximo dá um passo de 2 px na sua direção; pelas setas do teclado, nada anima.
- **M05 · Aleatório embaralha** — as duas setas do ícone `shuffle` trocam de lugar uma vez (220 ms) ao sortear.
- **M06 · Rotação liga** — o ícone `repeat` gira 180° uma vez ao ligar; ao desligar, só esmaece.
- **M07 · Favoritar com núcleo** — a estrela preenche a partir do centro (escala 0,6 → 1, 220 ms) e um pequeno losango (o núcleo da marca) sobe 6 px e some (400 ms). Desfavoritar: só esvazia, sem partícula.
- **M08 · Balística do medidor** — como um PPM: ataque de ~10 ms, queda lenta (~1,5 s do topo ao fundo); o pico é essa queda lenta, sem animação extra. Silêncio: os segmentos se apagam um a um, 30 ms cada.
- **M09 · Tap tempo** — cada toque acende o indicador de beat e afunda a tecla; no 4º toque o número do BPM rola até o valor como um odômetro (dígitos tabulares, 300 ms).

### Navegação e sobreposições
- **M10 · Indicador que desliza** — o sublinhado das abas e o "polegar" do controle segmentado deslizam entre as opções (220 ms), em vez de piscar no lugar.
- **M11 · Busca rápida** — abre e fecha sem animação e a seleção pula entre as linhas: é a ação mais frequente do app (versão animada descartada no laboratório).
- **M12 · Gaveta em degrau** — a gaveta entra em 250 ms e as 8 primeiras linhas aparecem com 15 ms de diferença; ao sair, sem degrau, 180 ms.
- **M13 · Toast** — entra 8 px de baixo + fade (220 ms), sai só com fade (150 ms); vive 4 s e pausa no hover; um novo aviso troca o texto no lugar em vez de reentrar.
- **M14 · Switch com peso** — ao pressionar, o botão interno estica (14 → 18 px) e desliza ao soltar; o trilho muda de cor em `t-fast`.
- **M15 · Slider com leitura** — durante o arrasto, o valor aparece num balão mono acima do polegar; ao soltar, some em 120 ms. Setas do teclado mostram o balão por 600 ms.
- **M16 · Controles da janela** — a plaquinha entra deslizando 4 px da direita (120 ms); no hover do fechar, o `x` gira 90° (120 ms).
- **M17 · Copiar → copiado** — o ícone `copy` vira `check` com escala cruzada (120 ms) e volta após 1,5 s.

### Estados e modos
- **M18 · Silêncio com carência** — sem som, o núcleo da marca esvazia em 400 ms e o medidor se apaga em cascata; o painel "Sem áudio" só aparece depois de 1,2 s de silêncio contínuo (pausas curtas não piscam a tela). A volta do som remove o painel com fade de 220 ms.
- **M19 · Modo limpo** — o texto sobre o visual some com fade de 400 ms; o ícone `eye-off` na faixa entra com 120 ms. Ao desligar, o cartão não reaparece sozinho: volta na próxima troca.
- **M20 · Palco → Rack** — a faixa se transforma no rack (FLIP: posição e tamanho interpolados em 300 ms) e o visual encolhe para o visor; o caminho inverso volta pelo mesmo trajeto.
- **M21 · Soltar arquivos** — enquanto arrasta, a borda tracejada "anda" (movimento só durante o gesto); ao soltar, a borda fecha num retângulo sólido por 120 ms e some.
- **M23 · Troca no beat** — com "Sincronizar ao beat" ligado, uma troca pedida espera o próximo beat; o botão mostra borda tracejada enquanto aguarda (Fase 3: precisa de BPM).
- **M22 · Cursor some com a faixa** — em tela cheia o cursor some junto com a faixa (2,5 s) e volta no primeiro movimento, sem atraso.

### Rejeitados (e por quê)
- **Interface pulsando com a música** (faixa, ícones ou bordas "respirando"): quebra "a casca não se mexe"; disputa atenção com o visual.
- **Bounce/elastic e molas com overshoot**: lê como brinquedo; contraria a precisão de hardware.
- **Blur entrando/saindo**: caro sobre um canvas a 60 fps.
- **Parallax ao mover o mouse**: movimento sem intenção.
- **Sons de interface**: o app é sobre o som da pessoa; nenhum clique sonoro.

## 3. Movimento reduzido (`prefers-reduced-motion`)
Mantém mudanças de estado (cor, preenchimento, texto), remove deslocamento e escala: M01–M02, M04–M07, M10–M13, M16, M20 viram troca instantânea ou fade curto (≤120 ms); medidor e indicador de beat continuam (são informação), a partícula de M07 some, o odômetro de M09 vira troca direta, a borda de M21 fica parada.
