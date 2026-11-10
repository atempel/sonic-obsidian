# Sonic Obsidian v3 — Respostas às divergências

> Sessão de design, 10/11/2026. Responde às entradas abertas de `docs/design/v3/DIVERGENCIAS.md` no repo (até a spec 023, PR #65). O desenho foi atualizado nesta versão do canvas. Ao sincronizar, a sessão do repo marca cada entrada como **Aceita (design atualizado na versão X)** ou como pede a coluna "Ação no repo".

Regra geral: o que já foi validado no Windows é o fato. O protótipo vai ao app, salvo quando a resposta abaixo diz o contrário.

| Entrada | Resposta | O que mudou no protótipo | Ação no repo |
| --- | --- | --- | --- |
| Expressividade (015) | **Aceita.** | Ajustes rápidos e Configurações › Visual ganham a seção "Expressividade": slider −3…+3 (mono, com sinal), Caráter (Contraste · Energia · Nervo) e Memória (Curta · Longa · Fixa) em segmentados, com a descrição da opção escolhida embaixo. Atalhos: `+`/`−`/`0`, `X`, `Shift+X`. | Nenhuma. |
| Arrasto da janela (009/014) | **Aceita.** Sem indicação visual na faixa do topo: um realce chamaria atenção sobre o visual a cada passada do mouse. | Navegação: "Arrastar a janela: pela faixa do topo (40 px), fora do canto dos controles." | Nenhuma. |
| Tipo de transição (013) | **Aceita.** | Seção "Transições" com dois blocos, "Quando você troca" e "Na troca automática". Cada um tem um Select de tipo (Corte seco · Crossfade · Varredura · Plasma · Radial · Aleatório) e o tempo (0,1–5 s nos Ajustes, 0,1–10 s nas Configurações). O tempo some com Corte seco. Prévia da forma: P2, fora deste desenho. | Nenhuma. |
| `B` | **Conflito resolvido.** `B` cicla o tipo da transição manual no Palco e no Rack. Dentro do Modo performance, `B` volta a ser tap tempo (como o `P`, que lá é pad). | Atalhos e Modo performance. | Nenhuma. |
| Biblioteca · "Nova coleção" no submenu e vazio da busca | **Aceita.** Vazio: "Nenhuma coleção ainda." · "Crie uma pelo botão de coleção na faixa ou na Biblioteca (L)." | Submenu e aba Coleções da busca. | Trocar o texto do vazio. |
| Faixa · itens fora da Fase 2 | Registro. | — | — |
| `F` | **Aceita:** `F` = tela cheia, como `F11`. Favoritar fica sem tecla global (estrela, `Ctrl+F` na busca). | `title` da estrela: "Favoritar". Painel `?`, Configurações › Atalhos, boas-vindas. | Nenhuma. |
| Ganho padrão em dB | **Aceita:** −12 a +12 dB, padrão 0 dB, nos dois lugares. | Configurações › Captura e Ajustes rápidos (padrão 0 dB). | Nenhuma. |
| Limite de quadros | Registro (o código vai ao desenho). | — | — |
| Texto do silêncio | **Um texto só, aos 10 s:** título "Nenhum som chegando", corpo "Toque algo no computador e o visual reage.", ação "Testar captura". O núcleo da marca esvazia na hora (M18); só o painel espera. | Palco integrado, Setup, *States* do design system. | Nenhuma. |
| `[` / `]` | **Aceita a proposta:** `[`/`]` ficam na rotação até a camada de vídeo existir; então passam a ser opacidade do vídeo, e o intervalo fica só nos Ajustes. | — | Na spec do vídeo. |
| M18 · carência de 10 s | **Aceita** (decisão do usuário). | `docs/v3-microinteracoes.md` M18 atualizado. | Nenhuma. |
| Configurações abrem em Geral | **Aceita.** | Configurações abrem em Geral. | Nenhuma. |
| Diferenças da 011 (M10 vertical, tempo até 10 s, "Testar captura" sem som, licenças) | **Aceitas todas.** | Barra de 2 px deslizante no menu lateral, estado "Nenhum som em 3 s…", linha "Licenças de terceiros" em Sobre. | Nenhuma. |
| Diferenças da 012 (aviso, boas-vindas, WebGL 2, checklist, preset pesado acima da faixa) | **Aceitas todas.** | Setup e Palco: aviso de preset pesado acima da faixa, à direita. | Nenhuma. |
| Diferenças da 020 (grupos reais, comandos extra, linha clicável) | **Aceitas todas.** O painel `?` do protótipo mostra também os grupos de fases futuras, marcados "Fase N", para o desenho continuar completo. No app, só o que existe. | Painel `?`: grupos Transição, Expressividade, Diagnóstico. | Nenhuma. |
| Importar `.milk` (022) | **Aceitas todas.** Resumo no toast: "8 presets adicionados · 2 já estavam · 2 não converteram". A falha detalhada fica nas Configurações. | Área de soltar sem a linha de áudio (volta com a fonte "arquivo"), "Remover importado" no menu "…", contagem "Base · N importados". | Nenhuma. |
| Coleções pelo Palco (023) | **Desenho definitivo, igual ao implementado,** com três detalhes: (1) o botão mostra um ponto violeta de 4 px quando o preset atual está em alguma coleção; (2) a linha marcada usa `check` à esquerda, e a contagem fica em mono à direita; (3) "Nova coleção" abre o campo no lugar, com Enter para criar, e o toast diz "Criada “Nome” com este preset.". | Palco integrado: botão `folder-plus` ao lado da estrela, painel `#colPop`. | Ponto no botão e texto do toast. |

## Fora desta rodada
- Modos de interface (Simples · Completo · Rack): proposta em `docs/v3-modos.md`, **ainda não decidida**. Nada a implementar.
- O design system (tokens, *App › Keyboard*, *States*) recebe os mesmos textos e teclas na próxima publicação dele.
