# Revisão do design de UI para o modelo Butterchurn (presets)
Status: Pending
Data: 2026-11-08
Fonte: docs/design/ui-exploration.md, docs/design/moodboard.md, docs/design/prototype/so-app.jsx, so-screens.jsx, so-visualizer.jsx, so-window.jsx, docs/PRD.md (seção "Fase 2 — Interface" e "Fase 1 — Núcleo")
Resumo: Inventário do que do design Python (6 modos fixos + seletor de dispositivo) sobrevive no modelo Butterchurn (centenas de presets, blend, rotação, favoritos/recentes/busca, overlay com auto-hide, sem seletor de dispositivo). Para revisão no Claude Design.
Destino provável: design (docs/design/) + PRD Fase 2

Legenda: **mantém** = reaproveitar como está; **adapta** = o componente fica, mas muda de conteúdo/comportamento; **descarta** = sai do produto.

## Decisões por tela/componente

| Tela/componente | Arquivo de origem | Decisão | Por quê / o que muda |
|---|---|---|---|
| Tokens de cor (`--bg-00..03`, `--border-*`, `--accent-violet/cyan/beat`, `--text-*`) | ui-exploration §2.1; prototype/index.html (`:root`) | mantém | Identidade "obsidiana" independe do motor. Regra "acento é luz, não tinta" continua. Atenção: os presets do Butterchurn são coloridos e claros às vezes, então o overlay precisa de fundo próprio (ver Lacunas). |
| Tipografia (Space Grotesk + JetBrains Mono, escala xs..2xl, data-sm..xl) | ui-exploration §2.2 | mantém | Sem relação com o motor. Empacotar as fontes no Electron (já recomendado). Nome do preset passa a ser o texto mais longo da UI, então definir regra de truncamento/quebra. |
| Espaçamento (base 4px), raios 4/3/6px, glow, blur de overlay | ui-exploration §2.3, §2.4 | mantém | `backdrop-filter` sobre WebGL funciona no Chromium/Electron. Medir custo de blur em cima de canvas a 60 fps em 1440p. |
| Keyboard Shortcut Chip (`keyChip`) | ui-exploration §3.6; so-screens `ModesScreen` | mantém | Reutilizar para atalhos novos (N/P próximo/anterior, R aleatório, espaço pausa rotação, F favoritar, H, F11). Só muda o conjunto de teclas. |
| Slider de parâmetro (`range`, `sliderBlock`) | ui-exploration §3.4; so-screens `SignalScreen` | mantém | Serve para ganho, suavização, sensibilidade de beat, duração do blend, intervalo de rotação. Falta o gradiente transparent→cyan do track (o protótipo usa `accentColor` nativo). |
| Toggle (`signalStyles.toggle`) | so-screens `SignalScreen` | mantém | Reaproveitar para "rotação automática", "só favoritos", "beat dirige trocas" (Fase 3). |
| `sectionLabel` (rótulo mono uppercase 9px) | so-screens `soScreenStyles` | mantém | Padrão de cabeçalho de seção, funciona nas novas telas. |
| Level Meter segmentado | ui-exploration §3.2 (não implementado no protótipo) | adapta | PRD pede "nível de entrada" na status bar (P1). Vira medidor horizontal compacto na status bar, alimentado pelo `AnalyserNode` (ou por RMS pós-`GainNode`). Serve também para o usuário calibrar o ganho. Peak hold/decay continuam. |
| Janela flutuante `FloatWindow` (arrastar, redimensionar, minimizar) | so-window.jsx | adapta | Hoje é janela livre em cima do canvas. No novo modelo o overlay aparece com o mouse e some sozinho (P0). Decidir se continua arrastável/redimensionável ou vira painel ancorado (ver Perguntas). Remover o botão `×` falso e o modo "minimizado" se o auto-hide cobrir o caso. |
| Title bar (`winStyles.titleBar`, ◆ SONIC OBSIDIAN, `version` "V2.4.0 High-Performance") | so-window.jsx; ui-exploration §3.5 | adapta | Janela do Electron é sem moldura (PRD Fase 1), então a barra custom precisa de região `-webkit-app-region: drag` e botões −, □, × reais. Trocar o texto de versão inventado por versão real do app. Ui-exploration §3.5 já prevê "preset ativo separado por |": exibir o nome do preset atual aqui (com crédito do autor). |
| Botão de layout W2/W3 (`onLayoutToggle`, `⊟`/`⊞`) | so-window.jsx | adapta | Manter só um layout em vez de dois (ver W2/W3 abaixo). Se mantidos, vira preferência "compacto" salva na config persistente. |
| Layout W2 (sidebar de ícones + conteúdo) `W2Layout` | so-window.jsx | adapta | Estrutura serve para o overlay completo. Itens novos da sidebar: PRESETS (padrão), SIGNAL, STATS. Remover DEVICE. Revisar os rótulos 7px da sidebar (ilegíveis; abaixo do `xs` de 10px do próprio design system). |
| Layout W3 (accordion compacto) `W3Layout` | so-window.jsx | adapta | O cabeçalho "ACTIVE MODE" vira "PRESET ATUAL" (nome completo + autor, sem o numeral gigante 1-6). Seções: PRESETS, SIGNAL, STATS. Candidato natural para o overlay que aparece com o mouse (menor, menos intrusivo). Decidir W2 ou W3 como padrão. |
| Itens de navegação `NAV_ITEMS` (modes, signal, device, stats, presets) | so-window.jsx | adapta | Fundir `modes` e `presets` em um único item PRESETS (navegador). Remover `device`. Ficam: PRESETS, SIGNAL, STATS (+ talvez AJUSTES para rotação/blend/atalhos). |
| Botão "+" da sidebar (`newPresetBtn`) e "+ NEW PRESET" | so-window.jsx; so-screens `PresetsScreen` | descarta | Criar/salvar preset próprio está fora de escopo (editor de presets é "talvez um dia"; importar `.milk` é Fase 3). Liberar o espaço para "favoritar atual" ou "pausar rotação". |
| Breadcrumb `ENGINE_CORE / <TELA>` | so-window.jsx (`screenHeader`) | adapta | Manter o cabeçalho de tela, mas o texto "ENGINE_CORE" é herdado do app Python. Trocar por contexto útil (ex.: "PRESETS / 1.612 · 38 favoritos") ou só o nome da tela. |
| Barra de status (`ENGINE LIVE`, `FPS`, `SR`, `ms`) | so-window.jsx `statusBar` | adapta | PRD pede: FPS, preset atual, nível de entrada. Remover SR e latência da barra (vão para STATS). `ENGINE LIVE` vira estado de captura (OUVINDO / SILÊNCIO / ERRO DE CAPTURA). Hoje os valores são fixos no protótipo. |
| `ModesScreen` (grade 3x2 de cards: número, renderer, nome, descrição, KEY n, "ACTIVE ENGINE") | so-screens.jsx | descarta | Pressupõe 6 itens fixos com tecla 1-6 e rótulo de renderer (CANVAS 2D/MODERNGL). Com centenas de presets a grade de cards não escala. Substituída por navegador de presets (ver Lacunas). Só o estilo de card ativo (borda violet + glow) é reaproveitado. |
| Atalhos 1-6 para modos (`modeKeys`) | so-app.jsx | descarta | Substituídos por próximo/anterior/aleatório (PRD Fase 1, P0). Teclas 1-9 podem virar slots de favoritos (pergunta ao designer). |
| `PresetsScreen` (lista "SAVED PRESETS": Late Night Session, Bass Heavy...) | so-screens.jsx | adapta | Conceito antigo era "combinação salva de modo + parâmetros". Agora "preset" é um preset Butterchurn. A tela vira o navegador: lista virtualizada, busca, abas Todos / Favoritos / Recentes, item ativo com borda violet, ação de favoritar. Reaproveitar `presetStyles.item/itemActive`. |
| `SignalScreen`: Beat Engine (toggle + BPM) | so-screens.jsx | adapta | Butterchurn não expõe BPM. Detecção de beat própria é Fase 3 (P0 lá). Na Fase 2 esconder BPM ou marcar como "em breve". Se mantido, o toggle passa a significar "beat dirige troca de preset". |
| `SignalScreen`: SENSITIVITY / SMOOTHING | so-screens.jsx | adapta | PRD: "ganho, suavização, sensibilidade de beat". SENSITIVITY vira GANHO (GainNode antes do analisador); SMOOTHING precisa de mapeamento claro para o que o Butterchurn realmente aceita. Confirmar com o spike quais parâmetros existem de fato. |
| `SignalScreen`: DB FLOOR / DB CEILING | so-screens.jsx | descarta | Conceito do FFT do app Python (escala de barras). O Butterchurn normaliza o áudio internamente; ganho único cobre a necessidade. Reavaliar se os presets ficarem fracos em volume baixo. |
| `SignalScreen`: RESET TO DEFAULTS / APPLY CHANGES | so-screens.jsx | adapta | Manter RESET. Remover APPLY: ui-exploration §6 decidiu auto-save e os sliders já aplicam ao vivo. |
| `StatsScreen` (6 métricas + ENGINE STATUS) | so-screens.jsx | adapta | PRD P2: FPS e tempo de frame. Remover BUFFER, FFT SIZE, SMOOTH e o rótulo "WASAPI LOOPBACK" (captura agora é loopback do Chromium/Electron). Acrescentar: tempo de frame, resolução do canvas, contagem de presets, preset lento/bloqueado. |
| `DeviceScreen` (cards WASAPI, FiiO, "DIRECT MODE") | so-screens.jsx | descarta | O app não tem seletor de dispositivo; captura a mixagem do sistema por loopback. Seleção de saída é só investigação P2 na Fase 3. Mostrar, no máximo, uma linha informativa "Capturando: áudio do sistema" na STATS. |
| Device Selector (dropdown) | ui-exploration §3.3, §4.2 | descarta | Mesmo motivo. Remover também da Controls Bar do §2.3 (zona "DEVICE + SETTINGS"). |
| Controls Bar fixa de 64px (zona C) e Mode Switcher 40% | ui-exploration §2.3, §4.1 | descarta | Substituída pelo overlay com auto-hide. Os modos não existem mais. Level meter migra para a status bar. |
| Painel lateral de Settings (280px, slide-in, canvas dimmed) | ui-exploration §4.2 | adapta | Boa base para ajustes (rotação, blend, ganho, atalhos), alternativa ao FloatWindow. Remover a seção "Dispositivo". Avaliar se dimmar o canvas (opacity 0.4) faz sentido: o usuário quer ver o preset ao ajustar o ganho. |
| Fullscreen puro (F11, tudo some) | ui-exploration §4.3; so-app.jsx | mantém | PRD P0. Watermark opcional "SONIC OBSIDIAN" a opacity 0.06 continua válido (decidir). |
| Revelação do overlay por hover no canto/borda (`onMouseMove`, `edgeHover`, 80px no canto inferior direito, 2 s) | so-app.jsx | adapta | O protótipo só revela em fullscreen e só no canto. PRD pede "aparece com o mouse e some sozinho" em qualquer modo, com qualquer movimento. Definir: qualquer movimento revela, 2-3 s de inatividade esconde, cursor também some, overlay não esconde enquanto o mouse está sobre ele ou o campo de busca tem foco. `showControls` e a tecla H continuam como override manual. |
| Botão fullscreen flutuante (`fsBtn`) | so-app.jsx | adapta | Faz parte do overlay (some junto). Hoje fica sempre visível no canto, o que não combina com "fullscreen limpo". |
| Dica `1–6 mode · H controls · F11 exit` (`hint`) | so-app.jsx | adapta | Trocar o texto pelos atalhos novos e exibir só no primeiro uso ou ao revelar o overlay. A cor `rgba(60,60,80,0.7)` é quase invisível, abaixo do necessário para leitura. |
| Painel de Tweaks (`tweaks-ui`, `__activate_edit_mode`) | so-app.jsx | descarta | Ferramenta do protótipo no Claude Design, não é feature do produto. Mantê-lo só no protótipo. `TWEAK_DEFAULTS` (defaultMode, windowOpacity) deixam de fazer sentido. |
| `Visualizer` canvas 2D com 6 funções `draw*` e batida simulada (`scheduleBeat`) | so-visualizer.jsx | descarta | O canvas passa a ser o Butterchurn (WebGL). Para o protótipo de design, usar um placeholder (gradiente animado, screenshots de presets ou vídeo) em vez de áudio fake; a simulação de beat não deve ir para o produto. |
| Beat flash na UI (glow-beat 80 ms no botão ativo e no meter) | ui-exploration §5.3 | adapta | Sem beat do motor na Fase 2, não há evento. Só ligar quando a detecção própria existir (Fase 3). O "botão de modo ativo" vira o item de preset ativo ou o nome do preset na title bar. |
| Princípio de motion (só o canvas reage continuamente) e tabela de transições | ui-exploration §5.1, §5.2 | mantém | Continua valendo. Acrescentar transições novas: toast de preset (entrada/saída), overlay show/hide, blend visual. |
| "Sem splash/loading" e estado de silêncio (3 opções a definir) | ui-exploration §5.4, §4.4 | adapta | O princípio de abrir direto no estado funcional fica. Para silêncio, decisão ainda aberta; com Butterchurn o visual não congela sozinho (presets continuam animando com entrada zero). Ver Lacunas. |
| Tamanhos de janela (mín 640x480, padrão 960x640) e grid A/B/C | ui-exploration §2.3 | adapta | Manter mínimo/padrão. O grid de três zonas (title bar + canvas + controls bar) vira canvas em tela cheia com title bar e overlay por cima. |
| Decisão "Preset picker: inline vs overlay separado" | ui-exploration §6 | adapta | Estava adiada para presets GLSL na Fase 3. Agora é P0 da Fase 2: o navegador é central. Definir como painel do overlay (e/ou paleta de comandos rápida). |
| Decisões fechadas: dark only, ◆ como ícone, tecla H, auto-save, empacotar fontes | ui-exploration §6 | mantém | Todas independem do motor. |
| Moodboard: eixos Winamp / minimalismo / neon e referências de produto | moodboard.md | mantém | Direção estética intacta. Butterchurn/MilkDrop passam de "referência" a motor. |
| Moodboard: recomendação de framework Python (Pygame, Dear PyGui) e paletas Dracula/Catppuccin | moodboard.md | descarta | Framework: obsoleto (stack é Electron + React). Paletas: já serviram para derivar os tokens finais; só histórico. Mover para legacy/ ou marcar como obsoleto. |
| "Próximos passos" para Pygame (specs e motion em `pygame.Surface`) | ui-exploration §7 | descarta | Substituídos pela Fase 2 do PRD (React no overlay). |
| Wireframes (`wireframes.html`) | docs/design/prototype/wireframes.html (não lido em detalhe; 54 KB) | adapta | Presumivelmente reflete os mesmos 6 modos e o seletor de dispositivo. Revisar junto com o protótipo antes de reaproveitar qualquer tela. |

## Lacunas (o que o novo modelo precisa e não existe no design)

1. **Navegador de presets**: busca por texto, lista virtualizada (centenas de itens), filtros Todos / Favoritos / Recentes, ordenação, estado vazio da busca, item ativo e pré-visualização/hover. Nada disso existe; `ModesScreen` e `PresetsScreen` não escalam.
2. **Toast de preset**: nome do preset com crédito do autor ao trocar (PRD Fase 1, P1). Precisa tratar nomes longos (ex.: "Author + Author - Preset Name") sem cortar nem renomear o crédito, posição, duração, comportamento quando o overlay já está aberto.
3. **Estado de silêncio**: visual em repouso + aviso discreto. §4.4 lista 3 opções sem decidir, e nenhuma considera que a rotação continua rodando com entrada zero.
4. **Indicador de rotação automática**: ligado/pausado, tempo até a próxima troca (barra de progresso fina ou contador), intervalo configurável, atalho de pausa. Também: duração do blend e como mostrar uma transição em curso.
5. **Favoritos e recentes**: ação de favoritar (estrela) no item, no toast e na title bar; gestão de lista; "não mostrar mais" (Fase 3).
6. **Crédito do autor**: onde o nome completo do preset fica visível o tempo todo (title bar, status bar, painel do preset atual) e como evitar truncamento.
7. **Estado de erro de captura**: loopback indisponível/negado, perda de áudio, preset que falha ao compilar ou fica lento (lista de bloqueio, medir fps por preset).
8. **Overlay sobre fundos arbitrários**: presets muito claros/saturados; garantir contraste do texto do overlay (hoje 0.97 de opacidade só na janela flutuante, o hint está quase invisível).
9. **Onboarding mínimo de atalhos**: o design diz "sem splash", mas o fullscreen sem UI precisa de uma dica descobrível.
10. **Tela de ajustes**: rotação, blend, qualidade/resolução, iniciar com o Windows (Fase 4); hoje só existe SIGNAL.

## Perguntas para o designer

1. O overlay continua uma janela arrastável/redimensionável (`FloatWindow`) ou vira painel ancorado (lateral ou inferior) que se esconde sozinho? W2 (sidebar) ou W3 (accordion) como padrão?
2. Como navegar entre centenas de presets de forma rápida: lista com busca ou também uma paleta de comandos (Ctrl+K / "/") com troca instantânea? Precisa de miniaturas (custosas de gerar) ou basta texto?
3. Quais atalhos novos e quais teclas livres (as teclas 1-9 viram slots de favoritos?). Que feedback visual mostra uma tecla pressionada com o overlay escondido?
4. Qual a hierarquia visual do nome do preset (toast, title bar, status bar) e como mostrar crédito longo sem truncar nem mudar o texto?
5. Para o silêncio: aviso discreto onde e com que texto? O visual se mantém, congela ou desbota? A rotação pausa durante o silêncio?
6. O level meter segmentado e o beat flash entram na Fase 2 ou esperam a detecção de beat da Fase 3?
7. O watermark "SONIC OBSIDIAN" no fullscreen entra ou fica de fora?
8. O protótipo do Claude Design precisa de um canvas realista (capturas/vídeos de presets) para validar contraste do overlay sobre fundos claros?
