# Sincronização com o protótipo

Espelho **somente leitura** do artefato do Claude Design. Não edite estes arquivos à mão: mude o desenho no artefato e sincronize com a skill `sincronizar-design`.

| Campo | Valor |
|---|---|
| Artefato | https://claude.ai/artifact/UYomSYJHhGRN9bqUPc21qF |
| Versão sincronizada | `1794178325-0fd0` |
| Sincronizado em | 2026-11-08 |
| Por | Claude Code (nuvem), skill `sincronizar-design` |

## Mapa de arquivos (artefato → repo)
- `project/<página>.html`, `project/so-v3-*.css|js` → `prototype/`
- `project/docs/*.md` → `docs/`
- Fora do espelho (histórico, já em `docs/design/prototype/` ou descartado): `Sonic Obsidian Carbon.html`, `Sonic Obsidian.html`, `Sonic Obsidian Wireframes.html`, `carbon-*.jsx`, `so-*.jsx`, `project/uploads/`.

## Manifesto (sha256, 12 primeiros caracteres)
| Arquivo | sha256 |
|---|---|
| `docs/v3-brief-visual-e-craft.md` | `7e74bd67ab6b` |
| `docs/v3-fontes-butterchurn-estudio-mcp.md` | `76d83b3fa8d4` |
| `docs/v3-microinteracoes-referencias.md` | `94dc6d66c110` |
| `docs/v3-microinteracoes.md` | `a1f06fa151d0` |
| `docs/v3-modelo-de-navegacao.md` | `b10ea3c0e6d7` |
| `docs/v3-video-vj.md` | `d9c7a4af4a58` |
| `prototype/Sonic Obsidian A Palco.html` | `af2a8d138f04` |
| `prototype/Sonic Obsidian B Biblioteca.html` | `623ad581c90e` |
| `prototype/Sonic Obsidian Biblioteca clipes e cenas.html` | `37b0552cdb19` |
| `prototype/Sonic Obsidian C Rack.html` | `96541cfe4d0e` |
| `prototype/Sonic Obsidian Configurações.html` | `9c656e7ce198` |
| `prototype/Sonic Obsidian Estúdio.html` | `cf117255466f` |
| `prototype/Sonic Obsidian Micro Faixa.html` | `1d93c3b549a1` |
| `prototype/Sonic Obsidian Micro Navegação.html` | `3c79f9abb048` |
| `prototype/Sonic Obsidian Modo performance.html` | `86dc5d37978f` |
| `prototype/Sonic Obsidian Palco com vídeo.html` | `ae6b21687def` |
| `prototype/Sonic Obsidian Palco integrado.html` | `f3207ad16e8e` |
| `prototype/Sonic Obsidian Propostas.html` | `5a65f99d0eed` |
| `prototype/Sonic Obsidian Setup.html` | `0127be957c40` |
| `prototype/Sonic Obsidian Vídeo Propostas.html` | `3c35b472e080` |
| `prototype/so-v3-base.css` | `71c0aa77fd14` |
| `prototype/so-v3-clips.js` | `f59bac104289` |
| `prototype/so-v3-data.js` | `8339914ac628` |
| `prototype/so-v3-viz.js` | `3500382a3b40` |

## Histórico
- `1794178325-0fd0` (2026-11-08, Claude Code): mudaram `docs/v3-modelo-de-navegacao.md`, `Palco integrado`, `Configurações` e `Modo performance`. Duas coisas novas: o **Painel de atalhos** (`?`, mapa de todas as teclas agrupado, com filtro e o grupo do lugar atual em "Agora", aberto sem animação; dica "`?` Atalhos" na faixa) e a **busca rápida com comandos** (grupo "Comandos" abaixo dos presets, cada um com a tecla em `kbd`). As Configurações agora abrem na seção do `#hash` (o painel leva a "Personalizar em Configurações › Atalhos"). O Modo performance ganhou a versão do painel com o teclado dos pads. Nada muda nas microinterações. Efeito nas specs: [queue/2026-11-08-painel-atalhos.md](../../../queue/2026-11-08-painel-atalhos.md).
- `1794175739-7509` (2026-11-08, Claude Code): mudaram `docs/v3-microinteracoes.md` e `Palco integrado`. O doc agora diz **"aprovado em 08/11/2026: os 23 itens (M01–M23) entram no app"**, com o Palco integrado como implementação de referência (M01 descia com ease-in, agora ease-out). O Palco integrado implementa M01–M08, M10, M13–M16 e M20–M23 inteiras e M09, M12, M18 e M19 em parte; M17 não aparece. Fora do catálogo: toasts de 4 s em todo lugar e clicáveis (antes 2,6/3,2 s), painel "Sem áudio" com fade depois de 1,2 s, Espaço e setas esperando o beat quando "Trocar no beat" está ligado (switch novo, desligado por padrão), `.gtoast` entrando de baixo. Efeito nas specs: [queue/2026-11-08-microinteracoes.md](../../../queue/2026-11-08-microinteracoes.md).
- `1794171149-6542` (2026-11-08, Claude Code): só acréscimos. Páginas novas `Micro Faixa` e `Micro Navegação` (laboratórios) e docs `v3-microinteracoes.md` e `v3-microinteracoes-referencias.md`: catálogo M01–M23 de microinterações, todas **Propostas** até o usuário escolher. Nenhuma página ou doc existente mudou. Efeito nas specs: [queue/2026-11-08-microinteracoes.md](../../../queue/2026-11-08-microinteracoes.md).
- `1794165177-f126` (2026-11-08, Claude Code): mudaram `docs/v3-modelo-de-navegacao.md`, `Configurações`, `Palco integrado` e `Palco com vídeo` — texto sobre o visual (nome do preset, título da faixa, avisos, Modo limpo `T`) e controles da janela (minimizar/fechar no canto superior direito). Efeito nas specs: [queue/2026-11-08-design-f126-texto-e-janela.md](../../../queue/2026-11-08-design-f126-texto-e-janela.md).
- `1794154301-3f85` (2026-11-08, sessão de design): primeiro espelho.
