# 019 — Painel de atalhos (`?`) e busca rápida com comandos

**Fase:** 2 · **Status:** Feito (PR #53) · **Issue:** [#51](https://github.com/atempel/sonic-obsidian/issues/51) · **Depende de:** [010](010-busca-biblioteca.md), [011](011-ajustes-configuracoes.md), [012](012-setup-diagnostico-desempenho.md)

## Problema
Os atalhos só aparecem na tabela de Configurações › Atalhos e em três linhas do cartão de boas-vindas. Para lembrar uma tecla é preciso abrir as Configurações. A busca rápida só acha presets e coleções, e quem procura uma ação ("modo limpo") não encontra nada. Além disso, a lista de atalhos é escrita à mão em vários lugares (tabela das Configurações, dicas da busca, HUD), e uma tecla nova pode ficar fora de algum deles.

## Proposta
Uma lista única de atalhos e comandos (`src/renderer/src/core/shortcuts.ts`) com ação, teclas, grupo e, quando existir, o comando que executa. Três lugares leem dela: a tabela das Configurações, um painel `?` centralizado (filtro e grupos em duas colunas) e um grupo "Comandos" na busca rápida. **Só teclas que existem no app**; nada das Fases 3–5.

## Escopo
**P0**
- **Lista única** com grupos: **Reprodução** (Espaço, ←/→, Shift + troca, B/Shift+B, ↑/↓, R), **Expressividade** (+/−/0, X, Shift+X), **Navegação** (/ ou Ctrl+K, L, `,`, Ctrl+,), **Texto e controles** (H, T), **Janela** (F ou F11, Ctrl+W, Esc, ?), **Diagnóstico** (Ctrl+Shift+D HUD, Ctrl+Shift+L pasta do log). A tabela das Configurações passa a ler dela e ganha as linhas novas.
- **Abrir o painel:** `?` em qualquer lugar fora de campo de texto, inclusive com a Biblioteca aberta; botão com o ícone `keyboard` na cauda da faixa (title "Atalhos (?)"); linha "Aperte ? para ver todos os atalhos" no cartão de boas-vindas. **Fechar:** `?`, `Esc`, o X ou clique fora. Abrir o painel fecha a busca rápida e vice-versa.
- **Forma** (Palco integrado, `0fd0`): diálogo centralizado sobre o visual, que continua rodando; superfície `overlay`, `line-2`, `r-3`, `shadow-pop`, largura até 760 px, altura até 80vh com rolagem interna; **sem animação**; `role="dialog"`, `aria-modal="true"`; foco no campo "Filtrar atalhos", `Tab` percorre e fica preso no diálogo; ao fechar, o foco volta para onde estava.
- **Conteúdo:** grupos em duas colunas (uma abaixo de ~640 px). Cada linha: ação à esquerda e uma tecla por `kbd` à direita, com "ou" entre as alternativas. O filtro procura na ação e na tecla, e os grupos vazios somem. Sem resultado, mostra "Nenhum atalho para “…”". Rodapé: "Personalizar em Configurações › Atalhos" fecha o painel e abre as Configurações na seção Atalhos.
- **"Agora"** (como o protótipo, `ctxGroup`): o primeiro grupo é o do lugar atual. No Palco, "Agora · Palco" (Espaço, ←/→, H, L); com a Biblioteca aberta, "Agora · Biblioteca" (↑/↓ mover, Enter tocar, `/` buscar, Esc limpar a busca ou fechar). A Biblioteca continua aberta atrás do painel.
- **Busca com comandos:** na aba Todos, abaixo dos presets, um grupo "Comandos" com os comandos cujo nome casa com o texto, cada um com a tecla em `kbd` à direita. ↑/↓ passam dos presets para os comandos, e Enter executa e fecha a busca. Com o campo vazio, o grupo não aparece. Comandos: Modo limpo (T), Abrir biblioteca (L), Mostrar atalhos (?), Ajustes rápidos (,), Configurações (Ctrl+,), Tela cheia (F), Rotação automática (R), Preset aleatório (Espaço), Próximo preset (→), Preset anterior (←), Esconder controles (H) e **Favoritar preset atual** (sem tecla no Palco; ver DIVERGENCIAS).

**P1**
- Regravar teclas (continua P1 da 011).

## Fora de escopo
- O teclado dos pads do Modo performance, os grupos Vídeo, IA e Rack, e "Favoritar F" (Fases 3–5; no app, F é tela cheia, decisão do usuário).
- F12 (DevTools) no painel.

## Critérios de aceite (no app rodando)
1. `?` abre o painel no Palco e com a Biblioteca aberta. Com o foco num campo de texto, `?` é digitado e não abre nada. `?` de novo, Esc, o X e um clique fora fecham o painel.
2. O painel abre e fecha sem animação, o visual continua animando atrás, e o foco começa no filtro e não sai do diálogo com Tab.
3. Toda tecla listada funciona de fato no app, e nenhum atalho do app (fora o F12) fica de fora. A tabela das Configurações mostra as mesmas linhas.
4. Digitar "tela" no filtro deixa só "Tela cheia". Digitar "F11" acha a mesma linha. Um texto sem resultado mostra a mensagem de vazio.
5. O primeiro grupo é "Agora · Palco"; com a Biblioteca aberta, é "Agora · Biblioteca", e fechar o painel deixa a Biblioteca aberta.
6. O link do rodapé abre as Configurações já na seção Atalhos.
7. Na busca, "limpo" mostra "Modo limpo T" em Comandos, e Enter liga o Modo limpo e fecha a busca. "favoritar" + Enter favorita o preset atual, com toast.
8. O botão de teclado na faixa e a linha no cartão de boas-vindas existem e abrem o painel.
9. Nenhuma queda de fps com o painel aberto (Ctrl+Shift+D).

## Perguntas em aberto
Nenhuma. As três do planejamento foram respondidas pelo usuário em 2026-11-09: F continua sendo tela cheia, o Diagnóstico fica num grupo próprio sem o F12 e os comandos ficam só na aba Todos, abaixo dos presets.

## Referências
- Protótipo `1794178325-0fd0` (`docs/design/v3/SYNC.md`): `Sonic Obsidian Palco integrado.html` (painel `kpanel`, botão `kbdBtn`, grupo de comandos na paleta); `docs/design/v3/docs/v3-modelo-de-navegacao.md` › "Painel de atalhos".
- `queue/2026-11-08-painel-atalhos.md` (incorporada).
