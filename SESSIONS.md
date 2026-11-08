# Sessões — Sonic Obsidian

Log append-only de quem mexeu no workspace, em que ferramenta, e em que estado deixou. Uma entrada por sessão (a skill `encerrar-sessao` adiciona). É handoff, não histórico de produto: o *porquê* fica em DECISIONS.md.

## Entradas

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
