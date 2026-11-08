# 010 — Busca rápida e Biblioteca (gaveta)

**Fase:** 2 · **Status:** Em verificação (código pronto; critérios aguardando o teste no Windows) · **Issue:** [#23](https://github.com/atempel/sonic-obsidian/issues/23) · **Depende de:** [008](008-nucleo-comandos-persistencia.md), [009](009-palco-faixa-assinatura.md)

## Problema
Com centenas de presets, só dá para navegar em sequência ou no aleatório. Não há como achar um preset pelo nome ou pelo autor, guardar os preferidos, esconder os que incomodam ou montar coleções para a rotação.

## Proposta
Duas portas para a mesma biblioteca, com o mesmo índice e as mesmas linhas de preset: **busca rápida** (paleta, para tocar algo já) e **Biblioteca em gaveta** (curadoria). Tudo age por comandos do Core e persiste em `library.json` (008).

## Escopo
**P0 — busca rápida** (diálogo "Buscar presets")
- Abre com `/` (fora de campo de texto), `Ctrl+K` (sempre) ou o botão da faixa. Fecha com `Esc`, clique fora ou ao tocar um item. Posição a 14vh do topo, largura `min(640px, 100vw − 32px)`, altura máx. 70vh, foco no campo.
- Campo "Buscar preset ou autor". Abas Todos / Favoritos / Recentes / Coleções, com contagem. Filtro por trecho do nome completo (autor + título), sem diferenciar maiúsculas, com o trecho destacado; no máximo 50 resultados; ocultos não aparecem.
- Linha: miniatura, título (ícone de "tocando" no atual), "por Autor", dica "Enter tocar", estrela.
- Teclado: `↑`/`↓` navega, `Enter` toca, `Tab`/`Shift+Tab` troca de aba, `Ctrl+F` favorita o item ativo. Rodapé com essas dicas.
- Aba Coleções: "Nome / N presets · troca a cada X s" + "Tocar".

**P0 — Biblioteca** (gaveta à esquerda, 360 px, por cima do visual, transição 250 ms)
- Abre com `L`, o botão da faixa ou a alça da borda (009). Fecha com o botão "Fechar biblioteca", `Esc`, `L` ou clique fora. Com ela aberta, a faixa recua para não ficar por baixo.
- Campo "Buscar preset ou autor" com `Esc` para limpar. Abas Todos / Favoritos / Recentes / Coleções (setas, Home/End).
- Linha de preset: miniatura, título, "por Autor", estrela, menu "…" com **Adicionar à coleção** (submenu), **Não mostrar mais**. O preset tocando fica destacado.
- Ocultos: barra "N ocultos · Restaurar".
- Coleções: lista, "Nova coleção" (cria "Coleção N", troca a cada 30 s), detalhe com "Voltar às coleções", "Tocar coleção", seletor "A cada" 15/30/45/90 s e lista numerada (reordenar e remover).
- Toasts da gaveta (2,6 s): "Adicionado aos favoritos." / "Removido dos favoritos." / "Adicionado a <nome>." / "Já está em <nome>." / "Preset oculto." / "Presets restaurados." / "Tocando <nome>.".
- **Tocar coleção** liga a rotação na ordem da coleção com o intervalo dela.

**P0 — estados vazios (textos do protótipo)**
- Busca sem resultado: "Nenhum preset com “…”." / "Tente o nome de um autor, como Geiss ou Flexi." + "Limpar busca".
- Favoritos: "Nenhum favorito ainda." / "Toque na estrela de um preset para guardá-lo aqui."
- Recentes: "Nada tocado ainda." / "Os presets que você tocar aparecem aqui."
- Tudo oculto: "Todos os presets estão ocultos." + "Restaurar ocultos".
- Coleção vazia: "Esta coleção está vazia." / "No menu de um preset, escolha Adicionar à coleção."

**P1**
- Miniaturas: geradas uma vez por preset (quadro renderizado fora da tela, em segundo plano) e guardadas em cache; enquanto não existem, um placeholder com a cor do preset. Nunca bloqueiam o render.
- Renomear e apagar coleção (apagar pede confirmação).

## Fora de escopo
"Novo preset" e "Editar uma cópia no Estúdio", chips Importados/Meus, tags "Importado"/"Meu preset"/"Criado com…", arrastar `.milk` (Fase 3). Exportar/importar coleções (011).

## Critérios de aceite (estados do Palco integrado)
1. `Ctrl+K`, digitar "geiss": aparecem só presets com "geiss" no nome, com o trecho destacado; `↓` + `Enter` toca o escolhido e a busca fecha.
2. `/` abre a busca; com o foco num campo de texto, `/` só digita.
3. `Ctrl+F` na busca favorita o item ativo, e ele aparece na aba Favoritos.
4. `L` abre a gaveta por cima do visual (o visual não encolhe); `Esc` e clique fora fecham.
5. "Não mostrar mais" tira o preset da busca, da Biblioteca e do aleatório/rotação; "Restaurar" traz de volta.
6. Criar uma coleção, adicionar 3 presets, escolher "A cada 15 s" e "Tocar coleção": a rotação passa pelos 3 em ordem, a cada 15 s.
7. Favoritos, ocultos e coleções continuam iguais depois de reabrir o app.
8. Cada estado vazio mostra o texto do protótipo (Favoritos, Recentes, busca sem resultado, tudo oculto, coleção vazia).
9. Abrir e rolar a Biblioteca com o visual em tela cheia não derruba o fps de forma visível (usuário confere).

## Perguntas em aberto
- A aba Recentes da Biblioteca é um retrato no momento em que abre (como no protótipo) ou atualiza ao vivo? Proposta: retrato.
- Miniatura real (quadro do preset) vale o custo, ou fica só o placeholder na Fase 2?

## Referências
- Protótipo v3 `1794154301-3f85` ([SYNC.md](../design/v3/SYNC.md)): `Sonic Obsidian Palco integrado.html` (paleta `#palette`, gaveta `#lib`, estados vazios); exploração em `Sonic Obsidian A Palco.html` e `B Biblioteca.html`; `docs/design/v3/docs/v3-modelo-de-navegacao.md`
- [architecture.md §7](../architecture.md#7-configurações-e-persistência) (`library.json`)
