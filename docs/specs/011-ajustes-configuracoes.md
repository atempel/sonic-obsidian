# 011 — Ajustes rápidos e Configurações

**Fase:** 2 · **Status:** A fazer · **Issue:** [#24](https://github.com/atempel/sonic-obsidian/issues/24) · **Depende de:** [008](008-nucleo-comandos-persistencia.md), [009](009-palco-faixa-assinatura.md); desenha os controles das specs [013](013-transicoes.md) (transições), [014](014-texto-sobre-visual-janela.md) (texto sobre o visual) e [015](015-expressividade.md) (expressividade)

## Problema
Ganho, rotação, intervalo e blend só mudam por teclas provisórias (`+`/`−`/`0`, `[`/`]`, ver [DIVERGENCIAS](../design/v3/DIVERGENCIAS.md)), e os parâmetros do Butterchurn (malha, resolução, FXAA, limite de fps) estão fixos no código. Falta onde mexer durante a música e onde configurar o resto, com tudo salvo sozinho.

## Proposta
Dois lugares, como no protótipo: **Ajustes rápidos** (painel à direita, só o que se mexe com a música tocando) e **Configurações** (tela completa por cima do Palco, com o visual a 25% de opacidade atrás). Tudo por comandos (`settings.set`, `signal.set`, `rotation.set`, `blend.set`, `overlayText.set`) e salvo pela 008.

## Escopo
**P0 — Ajustes rápidos** (painel à direita, `min(340px, 100vw)`, 250 ms; o visual fica a 40% de opacidade)
- Abre com `,` ou o botão da faixa; fecha com `Esc` ou "Fechar".
- **Sinal:** Ganho −12 a +12 dB, passo 1 ("+3 dB", "−5 dB", "0 dB").
- **Rotação:** switch "Rotação automática"; "Trocar a cada" 15 / 30 / 45 / 90 s.
- **Transições** (spec 013): para "Quando você troca" e "Na troca automática", um seletor de tipo (Corte seco / Crossfade / Varredura / Plasma / Radial / Aleatório) e o tempo, 0,1–5 s, passo 0,1 ("2,7 s"). O tempo some com Corte seco.
- **Texto sobre o visual** (spec 014): Nome do preset (Sempre / Só quando eu troco / Nunca), Título da faixa (switch), Avisos (Todos / Só importantes / Nenhum) e o switch **Modo limpo** `T`.
- Link "Todas as configurações" (`Ctrl+,`).
- Saem as teclas `[`/`]`. O ganho só muda aqui e nas Configurações: `+`/`−`/`0` passaram para a Expressividade (spec 015).
- **Expressividade** (spec 015): nível −3…+3 (slider), Caráter (Contraste / Energia / Nervo) e Memória (Curta / Longa / Fixa), com descrição curta embaixo.

**P0 — Configurações** (`Ctrl+,`; navegação lateral; em tela estreita vira um seletor; `Esc` fecha; abre na seção Geral)
- Busca de configurações (`Ctrl+F`), com o vazio "Nada encontrado".
- Salvamento automático: sem botão Aplicar; ~1,5 s depois de uma mudança aparece "Salvo" discreto, que some ~2,2 s depois.
- **Geral:** Abrir em tela cheia; Preset ao abrir (Último usado / Aleatório / Um favorito) + "Favorito ao abrir". (Abrir em Rack e Iniciar com o Windows: Fase 5, mostrados com o marcador de fase.)
- **Captura** (só áudio do sistema): status "Ouvindo a saída padrão do Windows" + dispositivo · taxa, medidor "Nível de entrada", "Testar captura" ("Detectando som…" → "Som detectado" em até 3 s); Ganho padrão (o ganho ao abrir). "Dispositivo de captura" desabilitado com marcador "Fase 3".
- **Visual:** Rotação automática; Intervalo 5–120 s, passo 5; Ordem (Aleatória / Coleção) + Coleção; Transições: os mesmos seletores de tipo dos Ajustes, com tempo de 0,1–10 s, passo 0,1; grupo **Texto sobre o visual** com os três controles e o Modo limpo, mais a nota fixa "O crédito do autor continua na faixa de controle e na Biblioteca."; "Trocar no beat" desabilitado ("Fase 3"); "Mostrar crédito do preset" ligado e desabilitado, com "O crédito do autor é sempre exibido."
- **Renderização** (aplica na hora, sem reiniciar): Malha de distorção 32×24 / 48×36 / 64×48 / 96×72 / 128×96 (`setInternalMeshSize`); Escala de pixels Automático / 1× / 1,5× / 2× (`pixelRatio`); Resolução das texturas 0,5 / 0,75 / 1 (`textureRatio`); Suavização FXAA (`setOutputAA`); Limite de quadros 30 / 45 / 60 / 144 / Sem limite (código da spec 004); Tamanho do canvas Nativo / 75% / 50%; Carregar pacote de imagens extras (`loadExtraImages`).
- **Desempenho:** "Mostrar fps na faixa". (Pular presets lentos, Mínimo de fps e a lista "Ocultos por desempenho" entram com a 012.)
- **Biblioteca:** pacote base com a contagem; Presets ocultos (Gerenciar, Restaurar por item, vazio do protótipo); Exportar coleções (`sonic-obsidian-colecoes.json`, `{version: 1, collections}`) e Importar coleções, com as mensagens de sucesso e erro do protótipo. Arquivo escolhido pelo diálogo nativo, via main.
- **Atalhos:** tabela Ação | Tecla com os atalhos da Fase 2 (incluindo `B`/`Shift+B`, `↑`/`↓`, Shift na troca = corte seco, `+`/`−`/`0` Expressividade, `X` Caráter, `Shift+X` Memória e `T` Modo limpo) e "Restaurar padrões". `Esc` travado.
- **Sobre:** versão do `package.json`, "Electron, para Windows.", "Butterchurn, licença MIT.", créditos (MilkDrop — Ryan Geiss; Butterchurn — Jordan Berg e contribuidores; presets — artistas da comunidade MilkDrop, creditados no nome de cada preset), links do protótipo e `THIRD_PARTY_NOTICES`.

**P1**
- Atalhos: regravar uma tecla ("Pressione a nova tecla (Esc cancela)"), com aviso de conflito e mensagem de sucesso do protótipo.

## Fora de escopo
Fontes microfone, arquivo e SoundCloud; Integrações (MCP); Telas e Rack; pacote extra de presets e importar `.milk`; atalhos `E`, `M` e `Ctrl+Shift+P` (Fases 3–5).

## Critérios de aceite
1. `,` abre os Ajustes rápidos; mover o ganho muda a barra de nível e a reação do visual, e o valor aparece em dB.
2. Desligar a rotação, trocar o intervalo para 15 s e mudar tipo e tempo das duas transições nos Ajustes: a troca automática passa a usar o novo intervalo e a transição automática, e a manual a outra. Com Corte seco o tempo some.
2a. Os controles de Texto sobre o visual e o switch Modo limpo nos Ajustes fazem o mesmo que o `settings.json` e o `T` da spec 014, e o switch acompanha o `T`.
3. `[` e `]` não fazem mais nada; `+`, `−` e `0` mudam a Expressividade (015), não o ganho.
4. `Ctrl+,` abre as Configurações com o visual rodando atrás, esmaecido; `Esc` fecha.
5. Mudar qualquer opção mostra "Salvo"; fechar e abrir o app mantém o valor.
6. Os valores mudados nos Ajustes aparecem nas Configurações e vice-versa (é o mesmo estado).
7. Renderização: mudar malha, FXAA, resolução das texturas e tamanho do canvas muda a imagem na hora; o Limite de quadros 60 deixa o HUD/fps em 60 numa tela de 144+ Hz.
8. "Testar captura" com música tocando mostra "Som detectado".
9. Exportar coleções gera o `.json`; importar esse mesmo arquivo em outra máquina (ou depois de apagar as coleções) as traz de volta; um `.json` inválido mostra a mensagem de erro do protótipo.
10. Sobre mostra a versão real e todos os créditos.

## Perguntas em aberto e conflitos do protótipo (registrar em DIVERGENCIAS antes do PR)
- **Ganho padrão:** Configurações mostra 0,5–2× (linear), Ajustes mostram dB com padrão +3. Decidido (8/nov): **dB nos dois**, −12 a +12, padrão **0 dB**.
- **Intervalo:** Ajustes 15/30/45/90 s, Configurações 5–120 s; o código usa 10/15/30/60/120. Decidido: seguir o protótipo (o intervalo das Configurações é livre; os Ajustes mostram o valor atual mesmo fora da lista).
- **Blend:** Ajustes até 5 s, Configurações até 10 s. Decidido: seguir o protótipo; Ajustes mostram o valor atual mesmo acima de 5 s.
- **Limite de quadros:** protótipo tem padrão 60 e não tem "monitor"; o código tem padrão `'monitor'`. Proposta: manter "Sem limite" = taxa do monitor e padrão 60, como no protótipo.
- **Seção inicial:** o protótipo abre em Captura; a spec propõe Geral. Confirmar com o design.

## Referências
- Protótipo v3 `1794165177-f126` ([SYNC.md](../design/v3/SYNC.md); a spec foi escrita na `1794154301-3f85` e revista na f126 para Transições e Texto sobre o visual): `Sonic Obsidian Palco integrado.html` (painel `#sheet`) e `Sonic Obsidian Configurações.html` (sem barra de estados; seções Geral, Captura, Visual, Renderização, Desempenho, Biblioteca, Atalhos, Sobre)
- [architecture.md §3](../architecture.md#3-engine-butterchurn) (Configurações → API do Butterchurn)
- DECISIONS 2026-11-08 (spec 004, limite de fps; spec 005, ganho)
