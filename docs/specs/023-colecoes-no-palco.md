# 023 — Adicionar o preset atual a coleções pelo Palco

**Fase:** 3 · **Status:** Feita (PR #65; validada pelo usuário no Windows em 2026-11-10) · **Issue:** [#66](https://github.com/atempel/sonic-obsidian/issues/66) · **Depende de:** [010](010-busca-biblioteca.md) (coleções)

## Problema
Hoje, para pôr o preset que está tocando numa coleção, é preciso abrir a Biblioteca, achar o preset na lista e usar o menu "…" da linha. No Palco a pessoa já está vendo o preset: é o melhor momento para guardá-lo e organizar (pedido do usuário, 2026-11-10).

## Proposta
Um botão de coleção na faixa de controle, ao lado da estrela de favoritar. Ele abre um painel pequeno com todas as coleções, cada uma marcada se o preset atual já está nela. Clicar marca ou desmarca, e o painel continua aberto para pôr em várias. No fim, "Nova coleção" cria uma com o nome digitado ali mesmo, já com o preset.

## Escopo
**P0**
- **Botão** com o ícone `folder-plus` ao lado da estrela, `title` "Adicionar à coleção", `aria-haspopup="menu"`. Sem atalho de teclado (decisão do usuário).
- **Painel** que sobe da faixa, no estilo do menu "…" da Biblioteca (`.menu`):
  - uma linha por coleção (`role="menuitemcheckbox"`, `aria-checked`), com o nome e a contagem de presets;
  - clicar adiciona ou tira o preset (`collection.add`/`collection.remove`) e o toast confirma ("Adicionado a X." / "Removido de X."). O painel fica aberto;
  - "Nova coleção" vira um campo de nome. Enter cria a coleção já com o preset; vazio usa o nome padrão ("Coleção N"); Esc cancela.
  - Sem coleções, o painel mostra só "Nova coleção".
- **Fechar:** Esc, clique fora ou o mesmo botão. Setas, Home e End percorrem os itens, como no menu "…". Com o painel aberto, a faixa não some (auto-hide) e as teclas do Palco não valem.
- O painel acompanha o preset atual: se a rotação trocar o preset com ele aberto, as marcas são atualizadas.

## Fora de escopo
Atalho de teclado; arrastar o preset para uma coleção; reordenar coleções pelo painel.

## Critérios de aceite (Windows)
1. No Palco, o botão ao lado da estrela abre o painel com as coleções, e as que já têm o preset aparecem marcadas.
2. Marcar e desmarcar põe e tira o preset, com toast, sem fechar o painel. A Biblioteca › Coleções mostra o mesmo resultado.
3. "Nova coleção" com um nome cria a coleção já com o preset atual.
4. Esc, clique fora e o próprio botão fecham o painel. Pelo teclado (Tab até o botão, Enter, setas, Espaço/Enter), tudo funciona.
5. Com o painel aberto, a faixa não some e as teclas do Palco (Espaço, setas) não trocam o preset.

## Referências
- Protótipo `1794178325-0fd0` não tem esta tela. Usa o menu "…" da Biblioteca (Palco integrado, `#libMenu`) e o botão de ícone da faixa. Registro em DIVERGENCIAS.

## Verificação
- **Headless (2026-11-10, Chromium + SwiftShader, `window.so` simulado com `presets`):** 30/30 checagens cobrindo os critérios 1–5 (abrir com marcas, marcar/desmarcar com toast e painel aberto, salvar na library, Biblioteca › Coleções, nova coleção com nome e com o nome padrão, Esc no campo, Esc/clique fora/botão fecham, Tab/Enter/setas/Home/End/Espaço, faixa não some, Espaço e setas não trocam o preset, marcas acompanham a troca de preset).
- **Corrigido no teste:** o painel nascia dentro da `.strip`, que tem `overflow: hidden`, e ficava cortado (invisível, o clique caía no canvas). Agora ele é renderizado fora da faixa (portal na `.strip-wrap`, `position: fixed` acima do botão). O foco depois de criar uma coleção também ia para lugar nenhum (`:last-of-type` não achava a linha).
- **Windows (2026-11-10):** o usuário testou e aprovou. O log de ~30 min tem GPU entre 144 e 160 MB, sem erros.
