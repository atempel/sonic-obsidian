# Sonic Obsidian — PRD v2

> Arquivo âncora do projeto. Versão 2 (nov/2026): motor Butterchurn + Electron.
> A v1 (Python/Pygame) está em [legacy/PRD-v1-python.md](legacy/PRD-v1-python.md) — personas, princípios de UI e design system continuam valendo.

## Problema
Os visualizadores que eu gosto (MilkDrop no Winamp) não existem mais num app moderno que simplesmente "escute o computador". O butterchurnviz.com chega perto, mas roda no browser, depende de compartilhar aba/microfone e tem uma interface mínima.

## Proposta
Um app desktop para Windows que:
1. Captura o áudio do sistema automaticamente (loopback), sem configuração.
2. Renderiza com o Butterchurn, usando a biblioteca de presets do MilkDrop.
3. Envolve tudo na interface Sonic Obsidian: navegação de presets, favoritos, rotação automática, controles de sinal, tela cheia limpa.

## Fora de escopo
- Gravar/exportar vídeo ou áudio.
- Capturar conteúdo protegido por DRM.
- macOS/Linux (pode funcionar por acaso; não é testado).
- Editor de presets/equações estilo MilkDrop (talvez um dia; não nesta versão).
- Distribuição pública, loja, assinatura de código.

## Métricas de sucesso
- Abre e reage ao som em < 3 s, sem nenhum clique.
- 60 fps estáveis em tela cheia 1440p na máquina principal.
- Eu uso de verdade: fica aberto durante sessões de música/jogo por semanas seguidas.

## Roadmap

| Fase | Objetivo | Saída |
|---|---|---|
| **0 — Spike** | Provar que loopback + Butterchurn funcionam no Electron | Janela reagindo ao áudio do sistema ([spec 001](specs/001-spike-electron-butterchurn.md)) |
| **1 — Núcleo** | App usável sem UI elaborada | Presets por teclado, rotação automática, fullscreen, ganho |
| **2 — Interface** | O Sonic Obsidian de verdade | Overlay, navegador de presets, painel de sinal, stats |
| **3 — Diferenciais** | O que o Butterchurn não tem | Beat/BPM dirigindo trocas, coleções, `.milk` próprios, camadas próprias |
| **4 — Empacotamento** | Instalar e esquecer | `.exe`, config persistente, ícone, iniciar com o Windows |

### Fase 1 — Núcleo
| Feature | Prioridade |
|---|---|
| Carregar todos os presets de `butterchurn-presets` (+ extras) | P0 |
| Próximo / anterior / aleatório por teclado, com blend configurável | P0 |
| Rotação automática por tempo (ex.: 30 s), pausável | P0 |
| Fullscreen (F11) e janela sem moldura | P0 |
| Ganho de entrada (GainNode antes do analisador) | P0 |
| Estado de silêncio (sem áudio → visual em repouso + aviso discreto) | P1 |
| Nome do preset em toast ao trocar (com crédito do autor) | P1 |

### Fase 2 — Interface (Sonic Obsidian)
Base: [design/ui-exploration.md](design/ui-exploration.md), [design/moodboard.md](design/moodboard.md) e o protótipo em [design/prototype/](design/prototype/index.html). **Revisão necessária antes de implementar:** o design foi feito para 6 "modos" fixos; agora são centenas de presets. A tela "Modes" vira um navegador de presets (busca, favoritos, histórico, coleções), e "Devices" perde peso (ver DECISIONS).

| Feature | Prioridade |
|---|---|
| Overlay que aparece com o mouse e some sozinho | P0 |
| Navegador de presets: busca, favoritos, recentes | P0 |
| Painel de sinal: ganho, suavização, sensibilidade de beat | P1 |
| Status bar: FPS, preset atual, nível de entrada | P1 |
| Stats (FPS, tempo de frame) | P2 |

### Fase 3 — Diferenciais
| Feature | Prioridade |
|---|---|
| Detecção de beat/BPM própria (AnalyserNode) dirigindo trocas de preset no tempo da música | P0 |
| Coleções/playlists de presets + "não mostrar mais" | P1 |
| Importar `.milk` (conversão HLSL→GLSL) | P1 |
| Camadas próprias sobre o Butterchurn (ex.: barras/osciloscópio portados do Python) | P2 |
| Seleção de dispositivo de saída (investigar viabilidade com loopback do Chromium) | P2 |
| Multi-monitor / sempre no topo / modo "wallpaper" | P2 |

### Fase 4 — Empacotamento
| Feature | Prioridade |
|---|---|
| Build `.exe` (electron-builder) | P0 |
| Config persistente (último preset, favoritos, ajustes) | P0 |
| Ícone, nome, iniciar com o Windows (opcional) | P2 |

## Arquitetura (alvo)
```
main process (Electron)                 renderer
──────────────────────                  ─────────────────────────────────────
setDisplayMediaRequestHandler  ──►      getDisplayMedia({audio, video})
  → { video: tela, audio: 'loopback' }    → descarta a track de vídeo
                                          → AudioContext.createMediaStreamSource
                                          → GainNode → butterchurn.connectAudio()
                                          → requestAnimationFrame → visualizer.render()
                                          → UI (overlay) por cima do <canvas>
```
Stack provável: Electron + Vite + TypeScript; React para o overlay (o protótipo já é JSX). Confirmar no spike.

## Riscos
| Risco | Mitigação |
|---|---|
| Loopback não funciona na versão atual do Electron/Windows | É exatamente o que o spike valida primeiro |
| Butterchurn sem manutenção ativa | Fixar versão; é JS puro, dá para vendorizar se precisar |
| Track de vídeo obrigatória no `getDisplayMedia` custa CPU | Parar a track de vídeo logo após obter o stream |
| Alguns presets pesados derrubam o fps | Lista de bloqueio + medir fps por preset na Fase 2 |
