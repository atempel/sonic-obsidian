# Sonic Obsidian

Visualizador de áudio para Windows, no espírito do MilkDrop/Winamp: captura o que está tocando no computador e transforma em visuais reativos. Uso pessoal.

## Tipo de projeto
Produto digital (app desktop). Arquivo âncora: [docs/PRD.md](docs/PRD.md).

## Objetivo
Terminar um app que eu abra todo dia: janela ou tela cheia, reagindo ao áudio do sistema sem configuração, com a biblioteca de presets do MilkDrop e uma interface própria (Sonic Obsidian) por cima.

## Estado atual (nov/2026)
- **Retomada com mudança de stack:** o motor visual passa a ser o [Butterchurn](https://github.com/jberg/butterchurn) (MilkDrop em WebGL 2, MIT) dentro de um app **Electron**. O Python (Fase 1 de mar/2026) foi encostado em `legacy/python/` — ver [DECISIONS.md](DECISIONS.md).
- **Fases 0, 1 e 2 concluídas** (interface v3 completa na v0.5.0). **Fase 3 — Fontes e presets em andamento:** v0.6.0 (Butterchurn 3, importar `.milk`, coleções no Palco, troca no beat, Estúdio P0, reação ao áudio e Normalizar áudio) e **v0.7.0, publicada em 16/nov/2026** (atualização automática pelo GitHub Releases, interface em inglês e português, desempenho no CI, ajustes dos Ajustes rápidos). Quem está na 0.6.0 instala a 0.7.0 à mão uma vez; dali em diante o app se atualiza.
- **Agora:** bloco **v0.8.0** — Estúdio de presets P1 ([spec 027](docs/specs/027-estudio-presets-p1.md), issue [#75](https://github.com/atempel/sonic-obsidian/issues/75)), em fatias; Básico e Ondas/Formas já no `main`.
- Estado do trabalho: **issues e milestones do GitHub** (ciclo automático, skill `rodada`); [TASKS.md](TASKS.md) é só índice histórico. Histórico de sessões: [SESSIONS.md](SESSIONS.md).

## Onde está cada coisa
| O quê | Onde |
|---|---|
| Código do app | `src/` (Electron: `main/` e `renderer/`) |
| Produto, roadmap, escopo | [docs/PRD.md](docs/PRD.md) |
| Specs por feature | `docs/specs/` |
| Índice de toda a documentação | [docs/README.md](docs/README.md) |
| Design (exploração, moodboard, protótipo) | `docs/design/` |
| Marca (logo SVG/PNG, regras) | [docs/brand/](docs/brand/README.md) |
| Imagens do README e divulgação | [docs/media/](docs/media/README.md) |
| Pesquisa técnica e de efeitos | `docs/research/` |
| Pesquisa de mercado, personas e concorrentes | [docs/research/mercado/](docs/research/mercado/pesquisa-de-mercado.md) (cópia do Claude Docs) |
| Versão Python e o plano/PRD originais | `legacy/python/`, `docs/legacy/` |
| Referências ainda não incorporadas | `queue/` |
| Planejamento, reflexão, estado do projeto | Notion — [página do projeto](https://app.notion.com/p/334d16734c17814ea20cf9f6dcb8b2fd) e linha na Tabela Meus Projetos |
| Protótipo de UI navegável | Claude Design — [artefato "Sonic Obsidian"](https://claude.ai/artifact/UYomSYJHhGRN9bqUPc21qF); espelho versionado em [docs/design/v3/](docs/design/v3/README.md) |
