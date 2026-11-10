# Tarefas — Sonic Obsidian

Índice: cada item aponta para sua spec (`docs/specs/`) e issue. O detalhe vive na spec, não aqui. Roadmap completo em [docs/PRD.md](docs/PRD.md). Referências pendentes em `queue/`; histórico em [SESSIONS.md](SESSIONS.md).

## Agora — Fase 2 (Interface v3, protótipo `1794165177-f126`; UI do overlay em Preact)
Ordem combinada: **013 → 011 (com o design f126) → 012.**
- [x] **Núcleo de comandos e persistência** (bloqueia as demais) — [spec 008](docs/specs/008-nucleo-comandos-persistencia.md) · issue [#21](https://github.com/atempel/sonic-obsidian/issues/21)
- [x] **Palco: faixa de controle e assinatura** — [spec 009](docs/specs/009-palco-faixa-assinatura.md) · issue [#22](https://github.com/atempel/sonic-obsidian/issues/22)
- [x] **Texto sobre o visual, Modo limpo `T` e controles da janela** (design f126; comportamento aqui, controles visuais na 011) — [spec 014](docs/specs/014-texto-sobre-visual-janela.md) · issue [#34](https://github.com/atempel/sonic-obsidian/issues/34)
- [x] **Busca rápida e Biblioteca (gaveta)** — [spec 010](docs/specs/010-busca-biblioteca.md) · issue [#23](https://github.com/atempel/sonic-obsidian/issues/23)
- [x] **Ajustes rápidos e Configurações** (PRs #39 e #44) — [spec 011](docs/specs/011-ajustes-configuracoes.md) · issue [#24](https://github.com/atempel/sonic-obsidian/issues/24)
- [x] **Transições: tipo e tempo escolhidos pelo usuário** (manual e automática; `B`, `↑`/`↓`, Shift = corte seco) — [spec 013](docs/specs/013-transicoes.md) · issue [#31](https://github.com/atempel/sonic-obsidian/issues/31)
- [x] **Expressividade em `+`/`−`** (Caráter `X`, Memória `Shift+X`; ganho só nos Ajustes) — [spec 015](docs/specs/015-expressividade.md) · issue [#36](https://github.com/atempel/sonic-obsidian/issues/36) · spike no PR #35
- [x] **Escolher as microinterações** (design `7509`, M01–M23 aprovadas): na 011 M04/M13–M16/M19 e M10 — DECISIONS 2026-11-08
- [x] **Microinterações da faixa e da gaveta** (M01–M03, M05–M08, M12, M22) — [spec 018](docs/specs/018-microinteracoes-faixa.md) · issue [#45](https://github.com/atempel/sonic-obsidian/issues/45)
- [x] **Painel de atalhos (`?`) e busca com comandos** (design `0fd0`) — [spec 020](docs/specs/020-painel-atalhos-comandos.md) · issue [#51](https://github.com/atempel/sonic-obsidian/issues/51)
- [x] **Setup, diagnóstico e desempenho por preset** — [spec 012](docs/specs/012-setup-diagnostico-desempenho.md) · issue [#25](https://github.com/atempel/sonic-obsidian/issues/25)

## Manutenção
- [x] **Passagem de performance, segurança e otimização** (PR #56 + log da v0.5.0). A abertura lenta é a primeira execução de um `.exe` novo e sem assinatura (8,3 s antes do `main.js`); aberta de novo, o primeiro quadro sai em ~1,1 s (DECISIONS 2026-11-09). Falta só confirmar com uma terceira abertura.
- [ ] Refazer a checagem de `electron@45.2.3` e `vite@8.3.6` depois de 19/11 (14 dias) — [docs/dependencias.md](docs/dependencias.md)
- [x] Decidir sobre `electron@45.2.3` e `vite@8.3.6`: mantidos; refazer a checagem depois de 19/11 — [docs/dependencias.md](docs/dependencias.md)
- [x] Avaliar as 6 vulnerabilidades *moderate* de `minimatch` via `electron-builder`: aceitas (só empacotamento); rever quando o electron-builder atualizar
- [ ] **Suíte de testes automatizados de performance e regressão no CI** (pedido do usuário: não depender só da máquina dele; vem depois das tarefas abertas) — planejar: [queue/2026-11-09-suite-testes-performance.md](queue/2026-11-09-suite-testes-performance.md)
- [x] Memória da GPU estável numa sessão longa: ~40 min visível, GPU entre 158 e 200 MB, sem tendência de alta (DECISIONS 2026-11-09)
- [x] CI roda duas vezes em branch com PR aberto (`push` + `pull_request`), dobrando os minutos do runner Windows — restringir o gatilho em `.github/workflows/build-windows.yml`.

## Feito
- [x] **Fase 1 — Núcleo** — specs 002–005, issues #6–#9, PRs [#12](https://github.com/atempel/sonic-obsidian/pull/12), [#13](https://github.com/atempel/sonic-obsidian/pull/13), [#15](https://github.com/atempel/sonic-obsidian/pull/15), [#17](https://github.com/atempel/sonic-obsidian/pull/17). Spec 004 critério 7 (economia de GPU com limite de fps) não atendido; ver DECISIONS.
- [x] **Fase 0 — Spike Electron + Butterchurn + loopback** (build Windows pelo CI) — [spec 001](docs/specs/001-spike-electron-butterchurn.md) · issue [#4](https://github.com/atempel/sonic-obsidian/issues/4) · PR [#5](https://github.com/atempel/sonic-obsidian/pull/5). Critério 4 (fone Bluetooth/USB) não verificado.

## Em paralelo — Design (Claude Design, usuário)
- [x] ~~Revisar a interface para o modelo de presets~~ — resolvido pela interface v3 ([docs/design/v3-modelo-de-navegacao.md](docs/design/v3-modelo-de-navegacao.md), DECISIONS 2026-11-08)
- [x] Trazer o brief visual v3 (tokens, *craft floor*) para o repo — espelhado em [docs/design/v3/](docs/design/v3/README.md) (PR [#14](https://github.com/atempel/sonic-obsidian/pull/14)); versão e checagem em [SYNC.md](docs/design/v3/SYNC.md), skill `sincronizar-design`
- [ ] Frente de vídeo/VJ: decidir se entra no PRD — [queue/2026-11-08-video-vj.md](queue/2026-11-08-video-vj.md)
- [ ] Fechar a tipografia (manter Space Grotesk ou alternativa)

## Spikes de risco (podem rodar em paralelo à Fase 1/2)
- [x] **Butterchurn 3 (WASM) + pipeline `.milk`** — aprovado (validado no Windows em 2026-11-09) — [spec 006](docs/specs/006-spike-butterchurn3-milk.md) · issue [#19](https://github.com/atempel/sonic-obsidian/issues/19)
- [ ] **SoundCloud como fonte** — depende de conta Artist Pro — [spec 007](docs/specs/007-spike-soundcloud.md) · issue [#20](https://github.com/atempel/sonic-obsidian/issues/20)

## Abertura (repo público e MIT desde 2026-11-08, PR #43)
- [x] **Releases no GitHub** (v0.5.0 publicada em 2026-11-09; PRs #58/#59; P1 = atualização automática e winget) — tag → rascunho de release com instalador, zip e checksums; nomes sem versão (licença e arquivos de comunidade já feitos no #43) — [spec 016](docs/specs/016-releases-abertura.md) · issue [#40](https://github.com/atempel/sonic-obsidian/issues/40)
- [x] **Landing page no GitHub Pages** (P0 no ar em atempel.github.io/sonic-obsidian, PR #48; P1 = 404 e notas da versão) — [spec 017](docs/specs/017-landing-github-pages.md) · issue [#41](https://github.com/atempel/sonic-obsidian/issues/41)
- [x] **Landing: refino de movimento e microinterações** (sistema de movimento da v3 no `site/` + músicas do Uppbeat criptografadas na demo) — [spec 019](docs/specs/019-landing-refino-movimento.md) · issue [#52](https://github.com/atempel/sonic-obsidian/issues/52)

## Agora — Fase 3 (Fontes e presets)
- [x] **Migração para o Butterchurn 3** — mergeada no #62 (falta o teste do usuário no Windows)
- [ ] **Importar presets `.milk`** — [spec 022](docs/specs/022-importar-milk.md) · issue [#64](https://github.com/atempel/sonic-obsidian/issues/64) · PR #65 (falta o teste no Windows)
- [ ] **Troca no beat a cada N compassos + segurar visual** (próximo; prioridade da pesquisa de mercado) — [spec 024](docs/specs/024-troca-no-beat-segurar.md) · issue [#67](https://github.com/atempel/sonic-obsidian/issues/67)
- [ ] **Estúdio de presets** (depois da 024) — specs a criar
- [ ] Fonte microfone (P1, depois do Estúdio)
- ~~Fonte arquivo de áudio~~ — adiada até a história "performance sincronizada" ([queue](queue/2026-11-10-performance-sincronizada.md), DECISIONS 2026-11-10) · PR #65 (falta o teste no Windows)
- [ ] **Adicionar o preset atual a coleções pelo Palco** (pedido do usuário) — [spec 023](docs/specs/023-colecoes-no-palco.md) · issue [#66](https://github.com/atempel/sonic-obsidian/issues/66) · PR #65, headless 30/30 (falta o teste no Windows)

## Depois
- Fase 3 — Fontes e presets · Fase 4 — MCP · Fase 5 — Extras (ver [PRD](docs/PRD.md) e [architecture.md](docs/architecture.md))
