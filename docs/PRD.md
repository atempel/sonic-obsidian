# Sonic Obsidian — PRD v2

> Arquivo âncora do projeto. Versão 2 (nov/2026): motor Butterchurn + Electron. Roadmap revisto em 8/nov com a interface v3, novas fontes de áudio, presets do usuário e MCP — ver [architecture.md](architecture.md) e [design/v3-modelo-de-navegacao.md](design/v3-modelo-de-navegacao.md).
> A v1 (Python/Pygame) está em [legacy/PRD-v1-python.md](legacy/PRD-v1-python.md) — personas, princípios de UI e design system continuam valendo.

## Problema
Os visualizadores que eu gosto (MilkDrop no Winamp) não existem mais num app moderno que simplesmente "escute o computador". O butterchurnviz.com chega perto, mas roda no browser, depende de compartilhar aba/microfone e tem uma interface mínima.

## Proposta
Um app desktop para Windows que:
1. Captura o áudio do sistema automaticamente (loopback), sem configuração.
2. Renderiza com o Butterchurn, usando a biblioteca de presets do MilkDrop.
3. Envolve tudo na interface Sonic Obsidian: navegação de presets, favoritos, rotação automática, controles de sinal, tela cheia limpa.
4. Aceita outras fontes quando o usuário quiser: microfone, arquivo de áudio e, se viável, SoundCloud.
5. Deixa o usuário criar e importar presets no formato `.milk`.
6. Pode ser controlado ao vivo — e ganhar presets novos — pela ferramenta de IA que o usuário já usa, via MCP. O app não embute IA.

## Fora de escopo
- Gravar/exportar vídeo ou áudio.
- Capturar conteúdo protegido por DRM.
- macOS/Linux (pode funcionar por acaso; não é testado).
- IA embutida ou dependência de um provedor de IA (a integração é só via MCP, com a ferramenta do usuário).
- Baixar ou guardar faixas de serviços de streaming.
- Distribuição pública, loja, assinatura de código.

## Métricas de sucesso
- Abre e reage ao som em < 3 s, sem nenhum clique.
- 60 fps estáveis em tela cheia 1440p na máquina principal.
- Eu uso de verdade: fica aberto durante sessões de música/jogo por semanas seguidas.

## Roadmap

| Fase | Objetivo | Saída |
|---|---|---|
| **0 — Spike** ✅ | Provar que loopback + Butterchurn funcionam no Electron | [spec 001](specs/001-spike-electron-butterchurn.md) |
| **1 — Núcleo** ✅ | App usável sem UI elaborada, já sobre o núcleo de comandos | Presets por teclado, rotação, janela, ganho (specs 002–005) |
| **2 — Interface v3** | O Sonic Obsidian de verdade | Palco, Biblioteca, busca, ajustes rápidos, Configurações, setup, persistência |
| **3 — Fontes e presets** | Ouvir outras coisas e criar visuais próprios | Microfone, arquivo, SoundCloud (se viável), importar `.milk`, Estúdio |
| **4 — MCP** | Controle e criação pela IA do usuário | Servidor local, stdio + HTTP, escopos, ferramentas, registro de atividade |
| **5 — Extras** | O que sobra para "terminar" | Rack/multi-monitor, beat/BPM, instalador, iniciar com o Windows |

Empacotamento deixou de ser fase: o CI já gera a pasta portátil Windows a cada push.

### Fase 1 — Núcleo
Specs 002–005. Exigência nova (ver [architecture.md §1](architecture.md#1-princípio-um-único-núcleo-de-comandos)): navegação, rotação, janela e sinal implementados como **comandos** do Core, não como handlers soltos de teclado. Atalhos seguem o modelo v3.

### Fase 2 — Interface v3
Referência: [design/v3-modelo-de-navegacao.md](design/v3-modelo-de-navegacao.md) e o artefato "Sonic Obsidian" no Claude Design.

| Feature | Prioridade |
|---|---|
| Palco + faixa de controle (auto-hide), assinatura na troca de preset com crédito do autor | P0 |
| Busca rápida (`/`, `Ctrl+K`) | P0 |
| Persistência (`settings.json`, `library.json`) | P0 |
| Biblioteca (gaveta): abas, favoritos, recentes, ocultos, coleções | P0 |
| Ajustes rápidos (ganho, rotação, dois tempos de blend) | P0 |
| Configurações: Geral, Captura (sistema), Visual, Renderização (parâmetros do Butterchurn), Desempenho, Atalhos, Sobre | P1 |
| Setup e diagnóstico não-modais (sem som, captura falhou, WebGL 2) | P1 |
| Fps por preset + "Ocultos por desempenho" | P2 |

### Fase 3 — Fontes e presets
| Feature | Prioridade |
|---|---|
| Spike 006 — Butterchurn 3 (WASM) + pipeline `.milk` | P0 (bloqueia os presets) |
| Fonte: arquivo (escolher/arrastar) com transporte | P0 |
| Fonte: microfone | P1 |
| Importar `.milk` (escolher/arrastar), rótulo "Importado" | P0 |
| Estúdio de presets: editar cópia, novo, compilação ao vivo, erros por linha, versões, exportar | P1 |
| Spike 007 — SoundCloud; se aprovado, fonte SoundCloud com crédito e link | P1 |

### Fase 4 — MCP
| Feature | Prioridade |
|---|---|
| Servidor no main, HTTP local + executável stdio, tokens, `Origin`, escopos | P0 |
| Ferramentas de leitura e controle (status, listar, tocar, rotação, sinal, fonte, `show_text`) | P0 |
| UI: Configurações › Integrações, chip na faixa, toasts, registro, pausar IA | P0 |
| `validate_preset`, `create_preset`, `update_preset`, recursos `docs://milkdrop/authoring` | P1 (exige o 006) |
| `capture_frame` | P1 |
| Prompts `criar-preset`, `remixar-preset` | P2 |

### Fase 5 — Extras
| Feature | Prioridade |
|---|---|
| Modo Rack + multi-monitor | P1 |
| Detecção de beat/BPM própria; trocar no beat | P1 |
| Iniciar com o Windows, instalador, ícone | P2 |
| Camadas próprias sobre o Butterchurn (barras/osciloscópio do Python) | P2 |
| Seleção de dispositivo de saída (investigar) | P2 |

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
Stack: Electron + electron-vite + TypeScript (decidido no spike). Arquitetura v3 completa — núcleo de comandos, fontes, pipeline de presets, MCP e segurança — em [architecture.md](architecture.md).

## Riscos
| Risco | Mitigação |
|---|---|
| Loopback não funciona na versão atual do Electron/Windows | É exatamente o que o spike valida primeiro |
| Butterchurn sem manutenção ativa | Fixar versão; é JS puro, dá para vendorizar se precisar |
| Track de vídeo obrigatória no `getDisplayMedia` custa CPU | Parar a track de vídeo logo após obter o stream |
| Alguns presets pesados derrubam o fps | Lista de bloqueio + medir fps por preset na Fase 2 |
| Presets externos (arquivo, Estúdio, MCP) executam código no app | Só via Butterchurn 3 com equações em WASM; sem isso, não entram (spike 006) |
| SoundCloud inviável (chaves só para Artist Pro, CORS do HLS, termos) | Spike 007 antes de qualquer UI; plano B com o widget oficial |
| Servidor MCP local abusado por outra página/processo | Só `127.0.0.1`, `Origin` validado, token por cliente, escopos, pausar IA, apagar só com confirmação no app |
