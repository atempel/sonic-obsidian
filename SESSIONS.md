# Sessões — Sonic Obsidian

Log append-only de quem mexeu no workspace, em que ferramenta, e em que estado deixou. Uma entrada por sessão (a skill `encerrar-sessao` adiciona). É handoff, não histórico de produto: o *porquê* fica em DECISIONS.md.

## Entradas

### 2026-11-08 (continuação) — Claude Code (nuvem) — branch `claude/amazing-clarke-wbr2td`
**Fez:** Executou e o usuário validou no Windows as specs **008** (núcleo de comandos + persistência, PR #27), **009** (Palco: faixa de controle, assinatura, cartões de silêncio/captura negada, PR #28) e **010** (busca rápida + Biblioteca em gaveta, PR #30), todas mergeadas. Sincronizou o design para `1794165177-f126` (PR #29: texto sobre o visual, Modo limpo `T`, controles da janela → `queue/2026-11-08-design-f126-texto-e-janela.md`). Planejou a spec **013 — Transições** (issue #31) a pedido do usuário. Processo novo: checagem de segurança de dependências (`docs/dependencias.md`, regra em CONTEXT/AGENTS/`executar-task`). Dependências novas: `preact@11.0.2`, `@fontsource/space-grotesk@5.3.0`, `@fontsource/jetbrains-mono@5.3.0`; 13+ ícones Lucide copiados (ISC). Decisões do usuário registradas: `F` = tela cheia, arrasto só pela faixa de 40 px do topo, fontes embutidas, transições escolhíveis (tipo forçado em tempo de execução). Teste visual na nuvem com Chromium headless (Playwright) pegou 4 bugs antes do Windows.
**Deixou em:** `main` com 008–010 e a spec 013. Próximo: **executar a 013** (transições). Depois 011 (incorporando o design f126 e a decisão sobre as teclas de ganho) e 012. Pendentes: decidir `electron@45.2.3`/`vite@8.3.6` (menos de 14 dias na checagem retroativa) e os 6 *moderate* de `minimatch` (TASKS › Manutenção); 11 branches antigas no remoto (não apagadas, pedem ok); posicionamento "playground" no PRD (`queue/2026-11-08-playground-transicoes.md`). Push forçado é bloqueado pelo modo automático: esta sessão reaproveitou o branch com `git merge -s ours` do histórico antigo (sem mudar arquivos).

### 2026-11-08 — Claude Code (nuvem) — branch `claude/amazing-clarke-wbr2td`
**Fez:** Mergeou o PR #18 (squash, com o ok do usuário). `sincronizar-design` no modo checar: artefato na versão `1794154301-3f85`, igual ao SYNC.md. Criou as issues #19 (spike 006) e #20 (spike 007) com o label `fase-3`. Planejou a Fase 2 com `planejar-feature`, extraindo os estados do protótipo (Palco integrado, Configurações, Setup) com subagentes: specs 008 (núcleo + persistência), 009 (Palco: faixa + assinatura), 010 (busca + Biblioteca), 011 (Ajustes rápidos + Configurações) e 012 (setup, diagnóstico e fps por preset), com as issues #21–#25 (label `fase-2`). Decisão do usuário: overlay em Preact (DECISIONS). Três divergências novas em DIVERGENCIAS (ganho padrão em dB, limite de quadros, texto do aviso de silêncio). TASKS e PROJECT apontando para a Fase 2.
**Deixou em:** branch `claude/amazing-clarke-wbr2td` com PR para `main` (só docs, sem código). O Preact ainda não foi instalado: entra na execução da spec 008. Próximo: `executar-task` da 008. Nada de áudio/fps a verificar nesta sessão.

### 2026-11-08 — Claude Code (nuvem, claude.ai/code) — branches `feat/presets-navegacao`, `feat/rotacao-automatica`, `feat/janela`, `feat/sinal-entrada`
**Fez:** Fase 1 inteira, cada spec validada pelo usuário no Windows com o build do CI:
- 002 (395 presets, navegação, toast; corrigida a CSP que bloqueava texturas `data:` dos presets) — PR #12;
- 003 (rotação automática, atalhos v3, blend manual 0 s/automático 2,7 s em `config.ts`) — PR #13;
- 004 (janela sem moldura, `Ctrl+W`, cursor some em tela cheia, limite de fps opcional) — PR #15;
- 005 (ganho −12…+12 dB, silêncio que desacelera/escurece em 3 s e avisa em 10 s) — PR #17.
Também: spec 005 ajustada ao pedido do usuário (desacelerar e escurecer) no PR #10; PR #11 (planejamento v3) redirecionado para `main` e conflitos resolvidos; divergências com o protótipo registradas em `docs/design/v3/DIVERGENCIAS.md`.
**Deixou em:** `main` com a Fase 1 completa; nenhum PR aberto desta sessão. Pendências: specs da Fase 2; issues dos spikes 006/007; teclas provisórias de rotação/ganho saem com os Ajustes rápidos; CI duplicado em branch com PR. Não verificado ou não atendido: fone Bluetooth/USB (001), 1440p, economia de GPU com o limite de fps (004, critério 7 não atendido).

### 2026-11-08 — Claude Code (nuvem) — branch `claude/jolly-shannon-i4sq2a`
**Fez:** Revisou o PR #14 (`docs/design-sync`): o `main` não tinha andado, então não precisou de rebase; links relativos e arquivos citados em `docs/design/v3/README.md` conferidos; CI verde. Squash merge com o ok do usuário (`cbd7c81`). Testou `sincronizar-design` no modo "checar": a ferramenta de artefatos funciona nesta superfície e `project/compat.json` vem da versão `1794154301-3f85`, igual ao `SYNC.md`, então está sincronizado. TASKS: brief visual marcado como feito e a frente de vídeo/VJ apontando para a queue.
**Deixou em:** `main` com o espelho v3. Nenhuma feature implementada. Fase 1 continua com as specs 004 e 005. A branch `docs/design-sync` não foi apagada.

### 2026-11-08 — Claude (chat, sessão de design no projeto "Audio Visualizer") — branch `docs/design-sync`
**Fez:** Espelhou o protótipo v3 do Claude Design (versão `1794154301-3f85`) em `docs/design/v3/`: 12 páginas, tokens e scripts compartilhados, e os 4 docs (brief visual/craft, navegação, fontes/Butterchurn/Estúdio/MCP, vídeo/VJ). Criou `SYNC.md`, `README.md` (precedência e mapa página → fase) e `DIVERGENCIAS.md`; skill `sincronizar-design`; passos de design em `planejar-feature` e `executar-task`; seção "Design (protótipo)" no AGENTS.md; decisão em DECISIONS; queue do brief visual marcada como Ingested; stub novo `queue/2026-11-08-video-vj.md`.
**Deixou em:** PR `docs/design-sync` → `main`. Sem código. Notion não atualizado nesta sessão. Frente de vídeo/VJ ainda fora do PRD (ver o stub na queue).

### 2026-11-08 — Claude (chat, projeto "Audio Visualizer") — branch `plan/fontes-presets-mcp`
**Fez:** Registrou as decisões da sessão de design (Claude Design): interface v3 (Palco, Biblioteca, Rack, Configurações, setup), fontes de áudio (sistema, microfone, arquivo, SoundCloud), presets do usuário (`.milk` + Estúdio) e MCP sem IA embutida. Pesquisa com subagentes: SoundCloud (chaves só Artist Pro desde mai/2026, HLS AAC, CORS não documentado, termos), Butterchurn (3.0 beta compila equações em WASM — saída para presets externos seguros), MCP (SDK v2, Claude Desktop só stdio, `Origin` obrigatório). Escreveu `docs/architecture.md`, `docs/design/v3-modelo-de-navegacao.md`, specs 006 (Butterchurn 3 + `.milk`) e 007 (SoundCloud), PRD com roadmap revisto (Fases 2–5), TASKS, CONTEXT, DECISIONS. Ajustou os atalhos das specs 002/003 ao modelo v3 (`R` = rotação, dois tempos de blend).
**Deixou em:** PR `plan/fontes-presets-mcp` com base em `docs/fase-1-specs` (PR #10) — mergear o #10 antes. Sem código. Issues das specs 006/007 não criadas. Brief visual v3 pendente em `queue/`. Próximo continua sendo a spec 002, agora como comando do núcleo.

### 2026-11-08 — Claude Code (nuvem, claude.ai/code) — branches `feat/spike-electron-butterchurn`, `docs/fase-1-specs`
**Fez:** Issue #4 e label `fase-0`. Spike implementado (electron-vite + TypeScript, loopback, Butterchurn, HUD, F11) com workflow que gera a pasta portátil Windows como artifact; validado pelo usuário no Windows — critérios 1–3 ok, 4 (fone BT/USB) não verificado (sem segundo dispositivo; funciona com Voicemeeter). PR #5 mergeado (squash). DECISIONS: respostas do spike e "Butterchurn como dependência fixada, sem fork, com créditos" (`THIRD_PARTY_NOTICES.md`, README). AGENTS.md com comandos reais. Regras de acesso ao Notion para agentes em CONTEXT.md. Página do projeto no Notion reescrita para a v2. Fase 1: specs 002–005 e issues #6–#9 (label `fase-1`).
**Deixou em:** PR `docs/fase-1-specs` → `main` aberto (specs + TASKS + PROJECT + esta entrada). Labels `fase-2`…`fase-4` ainda não existem (MCP do GitHub não cria label avulso; nascem com a primeira issue de cada fase). Próximo: executar a spec 002 (`feat/presets-navegacao`). Não verificado: 1440p, fone Bluetooth/USB, custo de CPU da track de vídeo.

### 2026-11-08 — Claude Code (desktop, Windows) — branch `chore/cloud-ready`
**Fez:** PR #2 mesclado (squash). Branch padrão do GitHub renomeada para `main` (era `feat/project-config` → `master` → `main`); `feat/project-config` e `chore/workspace-electron` apagadas. Remote local sem token embutido (usa o login do `gh`). Ambiente decidido: dev na nuvem + validação no Windows por build do CI, sem Node no host (DECISIONS). Hook `SessionStart` para a nuvem. Spec 001 ganhou o P0 do workflow Windows. Revisão de UI para presets delegada a subagente → `queue/2026-11-08-revisao-ui-presets.md`.
**Deixou em:** PR `chore/cloud-ready` → `main`. Sessão continua no Claude Code na nuvem. Pendente, na ordem:
1. Skill `planejar-feature` só para criar a issue da spec 001 (label `fase-0`) e os labels `fase-0`…`fase-4`; pôr o número na spec e no TASKS.
2. Skill `executar-task` na branch `feat/spike-electron-butterchurn`: plan mode com template (electron-vite × Forge+Vite), estrutura de `src/`, fluxo main → renderer → AudioContext → Butterchurn, **e o workflow Windows**; esperar aprovação. `audio: 'loopback'` (nunca `loopbackWithMute`), parar tracks de vídeo. Fatias pequenas. No fim, o usuário testa o build do CI com música e confirma os 4 critérios um por um — nada marcado sem confirmação. Responder "Perguntas a responder" em DECISIONS, trocar "Stack & comandos" do AGENTS.md, PR com `Closes #N`.
3. Com o spike aprovado: `planejar-feature` para a Fase 1 — no máximo 4 specs, mostrar a lista antes de escrever.
4. Encerrar com `encerrar-sessao` (Notion: linha do projeto, page id na skill).
Não verificado: nada de código existe ainda.

### 2026-11-08 — Claude (chat, projeto "Audio Visualizer") — branch `chore/workspace-electron`
**Fez:** Retomada do projeto. Repo reorganizado no padrão workspace//kit: Python movido para `legacy/python/`; docs soltos da pasta local (PRD v1, plano, pesquisas, exploração de UI, moodboard, protótipo do Claude Design) trazidos para `docs/`; camadas humana e de agente criadas; PRD v2 (Electron + Butterchurn) e spec 001 do spike escritos; skills `planejar-feature`, `executar-task`, `encerrar-sessao`.
**Deixou em:** PR aberto para `master`. Nenhum código novo — `src/` vazio. Próximo: spike (spec 001) no Claude Code, rodando no Windows. Issue do spike ainda não criada (fazer com `planejar-feature` ou à mão no início do spike).

### 2026-03-26 — Claude Code
**Fez:** Fase 1 em Python (4 modos 2D, controles, fullscreen) — commit inicial + `.gitignore`.
**Deixou em:** `master` com a Fase 1; projeto pausado até nov/2026.
