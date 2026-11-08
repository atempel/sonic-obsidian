# Sonic Obsidian

Visualizador de áudio para Windows: Electron + Butterchurn (MilkDrop em WebGL 2), capturando o áudio do sistema por loopback, com a interface Sonic Obsidian por cima. Uso pessoal.

## Stack & comandos
- Electron + electron-vite + TypeScript, código em `src/` (`src/main/` = processo main, `src/renderer/` = página com o Butterchurn). Empacotamento com electron-builder (`electron-builder.yml`).
- Comandos:
  - `npm run typecheck` — checa tipos de main e renderer (rodar antes de todo commit; o CI roda também).
  - `npm run build` — compila para `out/` (roda na nuvem).
  - `npm run dist:win` — build + pasta portátil Windows em `release/win-unpacked/` (roda até no Linux; quem testa é o Windows).
  - `npm run dev` — app com HMR; só funciona onde há janela e Electron instalado (não na nuvem, não no host sem Node).
  - Testes automatizados: ainda não há.
- CI: `.github/workflows/build-windows.yml` — typecheck no Ubuntu e build no `windows-latest`; o artifact `sonic-obsidian-win-<sha>` é o que o usuário baixa e testa.
- `butterchurn` + `butterchurn-presets` (MIT), versões fixadas.
- `legacy/python/` é referência histórica — não editar, não rodar junto.
- **Onde roda:** desenvolvimento na nuvem (Linux, sem áudio/janela); validação no Windows com o build do GitHub Actions. Ver [CONTEXT.md](CONTEXT.md#ambiente-de-desenvolvimento).

## Antes de começar qualquer trabalho
1. Ler [PROJECT.md](PROJECT.md) e a seção "Agora" de [TASKS.md](TASKS.md).
2. Ler a spec da tarefa em `docs/specs/`. Sem spec, use a skill `planejar-feature` antes de codar.
3. Conferir [CONTEXT.md](CONTEXT.md) (restrições) e as últimas entradas de [DECISIONS.md](DECISIONS.md).
4. Se houver acesso ao Notion, ler a linha do projeto (estado declarado). IDs e regras de leitura/escrita em [CONTEXT.md](CONTEXT.md#notion-contexto-externo) — seguir à risca.

## Fluxo de trabalho
- **Planejar:** skill `planejar-feature` → spec + entrada em TASKS + issue no GitHub.
- **Executar:** skill `executar-task` → branch, implementação, verificação no app rodando, PR com `Closes #N`.
- **Encerrar:** skill `encerrar-sessao` → SESSIONS.md, TASKS.md, DECISIONS.md e o estado no Notion.

## Limites — não fazer sem perguntar
- Commitar direto em `main`.
- Trocar de motor visual, de shell (Electron) ou adicionar framework grande de UI além do decidido — registrar em DECISIONS.md primeiro.
- Adicionar dependência com licença copyleft (GPL/LGPL) ou paga.
- Remover/renomear créditos de autor dos presets.
- Mexer em `legacy/` ou em `docs/legacy/`.
- Qualquer coisa para capturar áudio com DRM.
- Escrever no Notion fora do que [CONTEXT.md](CONTEXT.md#notion-contexto-externo) permite (apagar, mudar schema, editar outras páginas/projetos).

## Toda sessão
- Antes de encerrar, adicionar uma entrada em [SESSIONS.md](SESSIONS.md) (ferramenta, o que foi feito, estado deixado) — a skill `encerrar-sessao` faz isso.
- Referência salva e ainda não incorporada (nota de áudio, link, doc) → stub em `queue/` (ver `queue/README.md`).
- Decisão relevante tomada → entrada em DECISIONS.md com o porquê e o que foi descartado.

## Ver também
- [docs/PRD.md](docs/PRD.md) — roadmap e escopo (arquivo âncora)
- `docs/design/` — design system, moodboard, protótipo
- `docs/research/` — pesquisa técnica (MilkDrop, FFT, efeitos)
