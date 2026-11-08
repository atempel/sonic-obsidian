# Tarefas — Sonic Obsidian

Índice: cada item aponta para sua spec (`docs/specs/`) e issue. O detalhe vive na spec, não aqui. Roadmap completo em [docs/PRD.md](docs/PRD.md). Referências pendentes em `queue/`; histórico em [SESSIONS.md](SESSIONS.md).

## Agora — Fase 1
- [ ] **Presets: biblioteca e navegação** (inclui toast com nome e autor) — [spec 002](docs/specs/002-presets-biblioteca-navegacao.md) · issue [#6](https://github.com/atempel/sonic-obsidian/issues/6)
- [ ] **Rotação automática** (depende da 002) — [spec 003](docs/specs/003-rotacao-automatica.md) · issue [#7](https://github.com/atempel/sonic-obsidian/issues/7)
- [ ] **Janela: tela cheia, sem moldura e fps** — [spec 004](docs/specs/004-janela.md) · issue [#8](https://github.com/atempel/sonic-obsidian/issues/8)
- [ ] **Sinal de entrada: ganho e silêncio** — [spec 005](docs/specs/005-sinal-entrada.md) · issue [#9](https://github.com/atempel/sonic-obsidian/issues/9)

## Manutenção
- [ ] CI roda duas vezes em branch com PR aberto (`push` + `pull_request`), dobrando os minutos do runner Windows — restringir o gatilho em `.github/workflows/build-windows.yml`.

## Feito
- [x] **Fase 0 — Spike Electron + Butterchurn + loopback** (build Windows pelo CI) — [spec 001](docs/specs/001-spike-electron-butterchurn.md) · issue [#4](https://github.com/atempel/sonic-obsidian/issues/4) · PR [#5](https://github.com/atempel/sonic-obsidian/pull/5). Critério 4 (fone Bluetooth/USB) não verificado.

## Em paralelo — Design
- [ ] Revisar a interface do Sonic Obsidian para o modelo de presets (ver PRD, Fase 2) — triagem em [queue/2026-11-08-revisao-ui-presets.md](queue/2026-11-08-revisao-ui-presets.md); revisão do design no Claude Design (usuário)

## Depois
- Fase 2 — Interface · Fase 3 — Diferenciais · Fase 4 — Empacotamento (ver PRD)
