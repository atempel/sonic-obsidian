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

## Rodada de 14/11/2026: specs 024 (troca no beat, segurar, respiro) e 026 (Estúdio P0)
O app já implementou as duas sem desenho, e o protótipo foi atualizado para acompanhar.

### 024: troca no beat e segurar
| Entrada | Resposta |
| --- | --- |
| **Segurar (`Enter`)** | **Aceita.** No botão da rotação, o ícone `repeat` vira `lock` e o texto "Rotação 0:24" vira "Segurado"; a contagem some. Toasts: "Visual segurado. Enter solta." / "Visual solto.". A faixa não muda de cor. |
| **Ponto de beat** | **Aceito**, dentro do botão da rotação, depois da contagem: 6 px, cor `beat`, piscando no beat (`t-beat-in`/`t-beat-out`). Só aparece com "Trocar no beat" ligado e a batida estável. O Rack continua com o dele. |
| **Compassos** | **Aceito.** Com "Trocar no beat" ligado, "Trocar a cada" lista 4 · 8 · 16 · 32 compassos, e a nota diz "Sem batida estável, troca a cada 30 s. Enter segura o visual.". Desligado, volta aos segundos. Nas Configurações › Visual › Rotação, a linha "Compassos" fica logo abaixo do switch. |
| **M23, segundo pedido** | **Aceito:** um segundo pedido durante a espera substitui o primeiro (é mais previsível); `Esc` cancela a espera. |
| **Respiro (`Shift+Enter`)** | **Aceito, com correção de lugar e cor.** O indicador fica ao lado do indicador do Modo limpo, na linha do título (o título encurta com reticências), com o ícone **`wind`** e "Respiro" em `text-2`, 12 px. Sem violeta, porque violeta é marca e seleção. Sem `volume-x`, que é o ícone do estado "sem som" e confundiria os dois. Toasts: "Respiro: o visual segue sem o áudio." / "Respiro desligado.". |
| **Adiantar o visual** | **Aceito.** Fica em Configurações › Captura (é sobre o tempo do áudio, não sobre o visual): slider de 0 a 200 ms, padrão 70, valor em mono. Ajuda: "Compensa o atraso entre o som e a imagem. Aumente se o visual parecer atrasado." Ele também ajuda na latência relatada na issue #96. |

### 026: Estúdio P0
| Entrada | Resposta |
| --- | --- |
| **Camada em tela cheia sobre o Palco** | **Aceita** (decisão do usuário). A coluna da esquerda é transparente e emoldura o visual principal com o rótulo "Seu remix", e o editor ocupa a direita sobre `overlay`. `Esc` fecha; se houver mudança não salva, pergunta primeiro. |
| **Só a aba Código** | **Aceita.** As abas Básico, Ondas, Formas e Shaders não aparecem no P0 (entram juntas na 027). Os shaders ficam num bloco recolhível, só de leitura, com a nota "Edição de shaders na próxima versão.". |
| **Medidores "Áudio agora" contínuos** | **Aceitos.** Não são o medidor de nível da faixa: são leituras de `bass`, `mid` e `treb`. Barras finas contínuas em ciano, com o valor em mono ao lado. |
| **Nome do autor no primeiro salvamento** | **Aceito.** É um balão ancorado em "Salvar na biblioteca": "Seu nome nos presets", um campo e "Salvar". Depois, o nome fica em Configurações › Geral › Meus presets. O crédito sai como "por <nome>". |
| **Erros do motor** | **Aceitos.** A mensagem fica sob o bloco, com o ícone `circle-alert` em `warn` e "Linha 4: …". Os erros de laço seguem como estão no app. |
| **Biblioteca** | **Aceita:** o rótulo "Meu preset", o filtro "Meus" ao lado de "Importados" e, no menu "…", "Editar uma cópia no Estúdio" (ou "Editar no Estúdio", se o preset for seu) e "Remover meu preset". |
