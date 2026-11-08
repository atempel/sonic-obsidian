# Design v3 — referência para o desenvolvimento

O desenho da interface vive num artefato do Claude Design (link e versão em [SYNC.md](SYNC.md)). Esta pasta é o espelho dele no repo, para que todo agente trabalhe sobre a mesma versão.

## Como usar
- **Ver o protótipo:** abra o HTML de `prototype/` no navegador (precisa de internet para fontes e ícones Lucide). Cada página tem uma barra tracejada "Protótipo" que alterna os estados de demonstração; ela não faz parte do produto. O visual de fundo é uma simulação (`so-v3-viz.js`) e os clipes são animações geradas (`so-v3-clips.js`): no app, isso é o Butterchurn e arquivos de vídeo do usuário.
- **Regras e especificação:** `docs/` — leia nesta ordem: `v3-brief-visual-e-craft.md` (tokens, contraste, craft floor), `v3-modelo-de-navegacao.md` (lugares e atalhos), `v3-fontes-butterchurn-estudio-mcp.md`, `v3-video-vj.md`.
- **Tokens:** `prototype/so-v3-base.css` é a fonte dos tokens de cor, tipo, raio, movimento e das primitivas (botões, sliders, switch, medidor). O renderer deve derivar seus tokens daqui.

## Precedência
1. **Fato técnico** (API, limites, versões): vale o repo — `docs/architecture.md`, specs e `DECISIONS.md`. Ex.: SoundCloud (chaves só Artist Pro, HLS AAC), Butterchurn 3.x (WASM) e BPM (ainda não existe) foram corrigidos lá depois dos briefs.
2. **Comportamento e aparência da interface:** vale o protótipo na versão de [SYNC.md](SYNC.md).
3. **Conflito entre os dois:** registre em [DIVERGENCIAS.md](DIVERGENCIAS.md) e siga o repo até o design responder.

## Páginas → onde entram no roadmap
| Página (`prototype/`) | O que mostra | Fase |
|---|---|---|
| `Sonic Obsidian Palco integrado.html` | Tela padrão: faixa de controle, busca rápida, Biblioteca em gaveta, modo Rack, fontes de áudio, IA conectada | 2 (Rack e MCP: 3+) |
| `Sonic Obsidian Configurações.html` | 10 seções, salvamento automático, Renderização (parâmetros reais do Butterchurn), Integrações (MCP) | 2–3 |
| `Sonic Obsidian Setup.html` | Primeira execução não-modal e diagnósticos (sem som, captura falhou, WebGL 2, duas telas) | 2 |
| `Sonic Obsidian Estúdio.html` | Editor de presets `.milk` com prévia, erros por linha e versões | 3+ |
| `Sonic Obsidian Palco com vídeo.html` | Camada de vídeo no compositor, cenas na Biblioteca | Vídeo (a planejar) |
| `Sonic Obsidian Modo performance.html` | VJ ao vivo: Preview/Program, crossfader, 20 pads, tap tempo | Vídeo (a planejar) |
| `Sonic Obsidian Biblioteca clipes e cenas.html` | Detalhe do clipe (loop), criação de cena, cena no Estúdio | Vídeo (a planejar) |
| `Sonic Obsidian Propostas.html`, `Vídeo Propostas.html`, `A Palco`, `B Biblioteca`, `C Rack` | Exploração e decisões (contexto, não implementar) | — |
