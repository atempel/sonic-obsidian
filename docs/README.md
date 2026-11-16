# Documentação — Sonic Obsidian

Índice de tudo o que está em `docs/` e na raiz do repo. Comece pelo [PRD](PRD.md) se quiser entender o produto, ou pelo [AGENTS.md](../AGENTS.md) se for trabalhar no código.

## Produto e arquitetura
| Documento | O que tem |
|---|---|
| [PRD.md](PRD.md) | Problema, proposta, escopo e roadmap por fase. Arquivo âncora do projeto. |
| [architecture.md](architecture.md) | Núcleo de comandos, processos do Electron, motor, fontes de áudio, presets do usuário, MCP, persistência. |
| [dependencias.md](dependencias.md) | Checagem de segurança de cada dependência (licença, idade da versão, scripts, `npm audit`). |

## Specs (uma por feature)
| # | Spec | Fase |
|---|---|---|
| 001 | [Spike Electron + Butterchurn + loopback](specs/001-spike-electron-butterchurn.md) | 0 |
| 002 | [Presets: biblioteca e navegação](specs/002-presets-biblioteca-navegacao.md) | 1 |
| 003 | [Rotação automática](specs/003-rotacao-automatica.md) | 1 |
| 004 | [Janela](specs/004-janela.md) | 1 |
| 005 | [Sinal de entrada](specs/005-sinal-entrada.md) | 1 |
| 006 | [Spike Butterchurn 3 (WASM) + `.milk`](specs/006-spike-butterchurn3-milk.md) | spike |
| 007 | [Spike SoundCloud](specs/007-spike-soundcloud.md) | spike |
| 008 | [Núcleo de comandos e persistência](specs/008-nucleo-comandos-persistencia.md) | 2 |
| 009 | [Palco: faixa de controle e assinatura](specs/009-palco-faixa-assinatura.md) | 2 |
| 010 | [Busca rápida e Biblioteca](specs/010-busca-biblioteca.md) | 2 |
| 011 | [Ajustes rápidos e Configurações](specs/011-ajustes-configuracoes.md) | 2 |
| 012 | [Setup, diagnóstico e desempenho](specs/012-setup-diagnostico-desempenho.md) | 2 |
| 013 | [Transições](specs/013-transicoes.md) | 2 |
| 014 | [Texto sobre o visual e janela](specs/014-texto-sobre-visual-janela.md) | 2 |
| 015 | [Expressividade](specs/015-expressividade.md) | 2 |
| 016 | [Releases no GitHub e abertura do repositório](specs/016-releases-abertura.md) | abertura |
| 017 | [Landing page no GitHub Pages](specs/017-landing-github-pages.md) | abertura |
| 018 | [Microinterações da faixa e da gaveta](specs/018-microinteracoes-faixa.md) | 2 |
| 019 | [Landing: refino de movimento e microinterações](specs/019-landing-refino-movimento.md) | abertura |
| 020 | [Painel de atalhos (`?`) e busca com comandos](specs/020-painel-atalhos-comandos.md) | 2 |
| 021 | [Migração para o Butterchurn 3 (WASM)](specs/021-migracao-butterchurn3.md) | 3 |
| 022 | [Importar presets `.milk`](specs/022-importar-milk.md) | 3 |
| 023 | [Coleções pelo Palco](specs/023-colecoes-no-palco.md) | 3 |
| 024 | [Troca no beat e segurar visual](specs/024-troca-no-beat-segurar.md) | 3 |
| 025 | [Suíte de testes no CI](specs/025-suite-testes-ci.md) | manutenção |
| 026 | [Estúdio de presets (P0)](specs/026-estudio-presets-p0.md) | 3 |
| 027 | [Estúdio de presets (P1)](specs/027-estudio-presets-p1.md) | 3 |
| 028 | [Reação ao áudio e Normalizar áudio](specs/028-reatividade-ganho-automatico.md) | 3 |
| 029 | [Atualização automática pelo GitHub Releases](specs/029-atualizacao-automatica.md) | 5 |
| 030 | [Idiomas: inglês e português (Brasil)](specs/030-idiomas.md) | 3 |

Estado de cada uma: issues e milestones do GitHub ([TASKS.md](../TASKS.md) fica como índice histórico).

## Design
| Onde | O que tem |
|---|---|
| [design/v3/](design/v3/README.md) | Espelho do protótipo v3 do Claude Design (páginas HTML, tokens, briefs). Referência de interface. Versão em [SYNC.md](design/v3/SYNC.md), conflitos em [DIVERGENCIAS.md](design/v3/DIVERGENCIAS.md). |
| [design/landing/](design/landing/README.md) | Espelho do canvas da landing page (EN, PT-BR e imagem de compartilhamento). Referência da [spec 017](specs/017-landing-github-pages.md). Versão em [SYNC.md](design/landing/SYNC.md). |
| [design/v3-modelo-de-navegacao.md](design/v3-modelo-de-navegacao.md) | Lugares da interface (Palco, Biblioteca, Rack, Estúdio) e atalhos. |
| [design/ui-exploration.md](design/ui-exploration.md), [design/moodboard.md](design/moodboard.md), [design/prototype/](design/prototype/) | Exploração v1/v2 (histórico). |
| [brand/](brand/README.md) | Logo ("The Core") em SVG e PNG, regras de uso. |
| [media/](media/) | Imagens do README e de divulgação: prints da interface e quadros reais de presets. |

## Pesquisa
| Documento | O que tem |
|---|---|
| [research/mercado/pesquisa-de-mercado.md](research/mercado/pesquisa-de-mercado.md) | **Pesquisa de mercado (nov/2026):** públicos (ouvintes, DJs, streamers, músicos, VJs), concorrentes, tendências, matriz de funcionalidades por persona e o que muda no backlog. |
| [research/mercado/personas.md](research/mercado/personas.md) | **Sete proto-personas** com apelido (Nostálgico do Winamp, DJ de Festa, Streamer de Set, Artista Independente, VJ de Clube, Criador de Presets, Anfitrião de Ambiente). Specs citam a persona que atendem. |
| [research/mercado/competidor-syqel.md](research/mercado/competidor-syqel.md) | Análise do SYQEL (mesmo motor, Butterchurn): funcionalidades, preços, o que aprender e o que não copiar. |
| [research/audio-visualizer-research.md](research/audio-visualizer-research.md) | MilkDrop, AVS, Web Audio, captura de áudio no browser. |
| [research/exploracao-efeitos-visuais.md](research/exploracao-efeitos-visuais.md) | Catálogo de efeitos visuais. |
| [research/python-pyaudiowpatch-visualizer.md](research/python-pyaudiowpatch-visualizer.md) | Guia técnico da v1 (WASAPI, FFT, Pygame, ModernGL). |

## Histórico (v1 em Python)
[legacy/PRD-v1-python.md](legacy/PRD-v1-python.md) e [legacy/plano-v1-python.md](legacy/plano-v1-python.md); código em [`legacy/python/`](../legacy/python/README.md). Só leitura.

## Raiz do repo
| Arquivo | Para quê |
|---|---|
| [README.md](../README.md) · [README.pt-BR.md](../README.pt-BR.md) | Apresentação pública (inglês e português). |
| [PROJECT.md](../PROJECT.md) | Visão geral e onde está cada coisa. |
| [TASKS.md](../TASKS.md) | Índice histórico das tarefas (o estado vive nas issues do GitHub desde 13/nov). |
| [DECISIONS.md](../DECISIONS.md) | Por que as coisas são como são, e o que foi descartado. |
| [SESSIONS.md](../SESSIONS.md) | Diário das sessões de trabalho. |
| [CONTEXT.md](../CONTEXT.md) | Convenções, restrições e vocabulário. |
| [AGENTS.md](../AGENTS.md) · [CLAUDE.md](../CLAUDE.md) | Instruções para agentes de código. |
| [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) | Licenças das dependências (vai junto com o app). |
| [LICENSE](../LICENSE) | MIT. |
| [CONTRIBUTING.md](../CONTRIBUTING.md) · [SECURITY.md](../SECURITY.md) · [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Como contribuir, como reportar falhas de segurança, código de conduta (em inglês). |
| [`.github/`](../.github/) | CI, templates de issue (bug, ideia, crédito de preset) e de PR. |
| [`queue/`](../queue/README.md) | Referências salvas e ainda não incorporadas. |
