# Tarefas — Sonic Obsidian

Índice: cada item aponta para sua spec (`docs/specs/`) e issue. O detalhe vive na spec, não aqui. Roadmap completo em [docs/PRD.md](docs/PRD.md). Referências pendentes em `queue/`; histórico em [SESSIONS.md](SESSIONS.md).

## Agora — Fase 1
- [x] **Presets: biblioteca e navegação** (inclui toast com nome e autor) — [spec 002](docs/specs/002-presets-biblioteca-navegacao.md) · issue [#6](https://github.com/atempel/sonic-obsidian/issues/6)
- [x] **Rotação automática** (depende da 002) — [spec 003](docs/specs/003-rotacao-automatica.md) · issue [#7](https://github.com/atempel/sonic-obsidian/issues/7)
- [x] **Janela: tela cheia, sem moldura e fps** — [spec 004](docs/specs/004-janela.md) · issue [#8](https://github.com/atempel/sonic-obsidian/issues/8)
- [ ] **Sinal de entrada: ganho e silêncio** — [spec 005](docs/specs/005-sinal-entrada.md) · issue [#9](https://github.com/atempel/sonic-obsidian/issues/9)

## Manutenção
- [ ] CI roda duas vezes em branch com PR aberto (`push` + `pull_request`), dobrando os minutos do runner Windows — restringir o gatilho em `.github/workflows/build-windows.yml`.

## Feito
- [x] **Fase 0 — Spike Electron + Butterchurn + loopback** (build Windows pelo CI) — [spec 001](docs/specs/001-spike-electron-butterchurn.md) · issue [#4](https://github.com/atempel/sonic-obsidian/issues/4) · PR [#5](https://github.com/atempel/sonic-obsidian/pull/5). Critério 4 (fone Bluetooth/USB) não verificado.

## Em paralelo — Design (Claude Design, usuário)
- [x] ~~Revisar a interface para o modelo de presets~~ — resolvido pela interface v3 ([docs/design/v3-modelo-de-navegacao.md](docs/design/v3-modelo-de-navegacao.md), DECISIONS 2026-11-08)
- [ ] Trazer o brief visual v3 (tokens, *craft floor*) para o repo — [queue/2026-11-08-design-v3-brief-visual.md](queue/2026-11-08-design-v3-brief-visual.md)
- [ ] Fechar a tipografia (manter Space Grotesk ou alternativa)

## Próximo — Fase 2 (escrever specs com `planejar-feature` quando a Fase 1 fechar)
- [ ] Núcleo de comandos + persistência ([architecture.md §1, §7](docs/architecture.md))
- [ ] Palco + faixa de controle + assinatura de troca
- [ ] Busca rápida
- [ ] Biblioteca (gaveta)
- [ ] Ajustes rápidos + Configurações
- [ ] Setup e diagnóstico

## Spikes de risco (podem rodar em paralelo à Fase 1/2)
- [ ] **Butterchurn 3 (WASM) + pipeline `.milk`** — bloqueia presets próprios e criação via MCP — [spec 006](docs/specs/006-spike-butterchurn3-milk.md) · issue: criar
- [ ] **SoundCloud como fonte** — depende de conta Artist Pro — [spec 007](docs/specs/007-spike-soundcloud.md) · issue: criar

## Depois
- Fase 3 — Fontes e presets · Fase 4 — MCP · Fase 5 — Extras (ver [PRD](docs/PRD.md) e [architecture.md](docs/architecture.md))
