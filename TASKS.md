# Tarefas — Sonic Obsidian

Índice: cada item aponta para sua spec (`docs/specs/`) e issue. O detalhe vive na spec, não aqui. Roadmap completo em [docs/PRD.md](docs/PRD.md). Referências pendentes em `queue/`; histórico em [SESSIONS.md](SESSIONS.md).

## Agora — Fase 2 (escrever specs com `planejar-feature`, com `sincronizar-design` no modo "checar")
- [ ] Planejar as specs da Fase 2 a partir do PRD, de [architecture.md](docs/architecture.md) e do protótipo v3 (`docs/design/v3/`, versão em SYNC.md)

## Manutenção
- [ ] Tirar as teclas provisórias `[`/`]` (intervalo da rotação) e `+`/`−`/`0` (ganho) quando os Ajustes rápidos existirem — [DIVERGENCIAS](docs/design/v3/DIVERGENCIAS.md)
- [ ] CI roda duas vezes em branch com PR aberto (`push` + `pull_request`), dobrando os minutos do runner Windows — restringir o gatilho em `.github/workflows/build-windows.yml`.

## Feito
- [x] **Fase 1 — Núcleo** — specs 002–005, issues #6–#9, PRs [#12](https://github.com/atempel/sonic-obsidian/pull/12), [#13](https://github.com/atempel/sonic-obsidian/pull/13), [#15](https://github.com/atempel/sonic-obsidian/pull/15), [#17](https://github.com/atempel/sonic-obsidian/pull/17). Spec 004 critério 7 (economia de GPU com limite de fps) não atendido; ver DECISIONS.
- [x] **Fase 0 — Spike Electron + Butterchurn + loopback** (build Windows pelo CI) — [spec 001](docs/specs/001-spike-electron-butterchurn.md) · issue [#4](https://github.com/atempel/sonic-obsidian/issues/4) · PR [#5](https://github.com/atempel/sonic-obsidian/pull/5). Critério 4 (fone Bluetooth/USB) não verificado.

## Em paralelo — Design (Claude Design, usuário)
- [x] ~~Revisar a interface para o modelo de presets~~ — resolvido pela interface v3 ([docs/design/v3-modelo-de-navegacao.md](docs/design/v3-modelo-de-navegacao.md), DECISIONS 2026-11-08)
- [x] Trazer o brief visual v3 (tokens, *craft floor*) para o repo — espelhado em [docs/design/v3/](docs/design/v3/README.md) (PR [#14](https://github.com/atempel/sonic-obsidian/pull/14)); versão e checagem em [SYNC.md](docs/design/v3/SYNC.md), skill `sincronizar-design`
- [ ] Frente de vídeo/VJ: decidir se entra no PRD — [queue/2026-11-08-video-vj.md](queue/2026-11-08-video-vj.md)
- [ ] Fechar a tipografia (manter Space Grotesk ou alternativa)

## Próximo — Fase 2 (itens a virar specs)
- [ ] Núcleo de comandos + persistência ([architecture.md §1, §7](docs/architecture.md))
- [ ] Palco + faixa de controle + assinatura de troca
- [ ] Busca rápida
- [ ] Biblioteca (gaveta)
- [ ] Ajustes rápidos + Configurações
- [ ] Setup e diagnóstico

## Spikes de risco (podem rodar em paralelo à Fase 1/2)
- [ ] **Butterchurn 3 (WASM) + pipeline `.milk`** — bloqueia presets próprios e criação via MCP — [spec 006](docs/specs/006-spike-butterchurn3-milk.md) · issue [#19](https://github.com/atempel/sonic-obsidian/issues/19)
- [ ] **SoundCloud como fonte** — depende de conta Artist Pro — [spec 007](docs/specs/007-spike-soundcloud.md) · issue [#20](https://github.com/atempel/sonic-obsidian/issues/20)

## Depois
- Fase 3 — Fontes e presets · Fase 4 — MCP · Fase 5 — Extras (ver [PRD](docs/PRD.md) e [architecture.md](docs/architecture.md))
