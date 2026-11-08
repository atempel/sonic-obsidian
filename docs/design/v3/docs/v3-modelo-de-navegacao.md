# Brief integrado — Sonic Obsidian v3 (modelo combinado)

Leia também `BRIEF-comum.md` (regras visuais e craft floor continuam valendo integralmente).

## Modelo de navegação decidido
- **Palco (tela padrão):** o app abre aqui, já tocando e reagindo ao som. Só o visual; a faixa de controle inferior aparece ao mexer o mouse e some após 2,5 s. Referência: `project/Sonic Obsidian A Palco.html`.
- **Biblioteca (menu oculto):** gaveta que desliza da esquerda POR CIMA do visual (não redimensiona o visual), 360px, fundo `--bg-01`, borda direita `--line-2`, `--shadow-pop`. Abre por: tecla `L`; botão `library` na faixa de controle (à esquerda do título do preset); ou uma alça discreta que aparece ao encostar o mouse na borda esquerda (aba vertical 28×96px com ícone `library`, só abre no clique). Fecha com `Esc`, `L` ou clique fora. Conteúdo: o da proposta B (`project/Sonic Obsidian B Biblioteca.html`): busca, abas Todos/Favoritos/Recentes/Coleções, linhas com miniatura, estrela, menu "…" (Adicionar à coleção, Não mostrar mais), detalhe de coleção, rodapé de ocultos. Sem o bloco "tocando agora" (a faixa do Palco já faz isso).
- **Busca rápida (`/` ou `Ctrl+K`):** continua existindo como atalho de teclado (paleta da proposta A). Biblioteca = curadoria; busca rápida = tocar algo já.
- **Modo Rack (modo de visualização):** tecla `M` ou botão `picture-in-picture-2` na faixa ("Modo compacto"). A janela vira o mini-player da proposta C (`project/Sonic Obsidian C Rack.html`), sempre por cima. Com 2 telas: visual em tela cheia na tela escolhida. Com 1 tela: o rack ganha um visor de visual próprio (canvas 440×160 acima do display) — o "vis" do Winamp. Sair do Rack: botão `maximize-2` "Voltar ao Palco" ou `M`.
- **Ajustes rápidos (`,`):** painel lateral direito do Palco (já existe na A) só com o que se mexe durante a música: ganho, rotação, intervalo, blend. Ao fim, link "Todas as configurações" (`Ctrl+,`).
- **Configurações (`Ctrl+,`):** tela completa por cima do Palco (o visual continua rodando atrás com opacidade 0.25). Layout de app de configurações: navegação lateral por seções + conteúdo. Tudo salva sozinho ("Salvo" discreto), sem botão Aplicar.
- **Primeira execução / setup:** NUNCA bloqueia (PRD: "abre e reage ao som em < 3 s, sem nenhum clique"; sem splash). O app já abre tocando; o setup é um cartão de boas-vindas não-modal e fluxos de diagnóstico que só aparecem quando algo falha.

## Atalhos globais (use exatamente estes)
Espaço aleatório · ←/→ anterior/próximo · F favoritar · R rotação · H esconder controles · / ou Ctrl+K busca rápida · L Biblioteca · M modo Rack · , ajustes rápidos · Ctrl+, configurações · F11 tela cheia · Esc fecha o que estiver aberto.

## Seções das Configurações (nomes exatos)
1. Geral — abrir em (Palco / Rack), iniciar com o Windows, abrir em tela cheia, preset ao abrir (último / aleatório / um favorito).
2. Captura — status da captura com medidor ao vivo ("Ouvindo a saída padrão do Windows"), dispositivo (FiiO K5 Pro · 48 kHz), botão "Testar captura", ganho padrão, seleção de dispositivo marcada "Fase 3".
3. Visual — rotação automática, intervalo, ordem (aleatória/coleção), duração do blend, trocar no beat ("Fase 3"), mostrar crédito do preset (sempre ligado e desabilitado com a nota "O crédito do autor é sempre exibido").
4. Desempenho — resolução de render (50/75/100%), limite de fps, pular presets abaixo de N fps, lista "Ocultos por desempenho" com restaurar, mostrar fps na faixa.
5. Biblioteca — pacotes (butterchurn-presets base, extra; contagem), pasta de presets .milk próprios ("Fase 3"), presets ocultos (lista + restaurar), exportar/importar coleções (.json).
6. Telas — tela do visual (radio com as telas detectadas), Rack sempre por cima, posição do Rack (canto).
7. Atalhos — tabela de atalhos (ação | tecla), com botão "Restaurar padrões" (edição de tecla pode ser só visual).
8. Sobre — Sonic Obsidian versão 0.3.0, Electron, Butterchurn (MIT), créditos: MilkDrop — Ryan Geiss; Butterchurn — Jordan Berg e contribuidores; presets — artistas da comunidade MilkDrop, creditados no nome de cada preset.
