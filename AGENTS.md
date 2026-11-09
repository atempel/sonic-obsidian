# Sonic Obsidian

Visualizador de áudio para Windows: Electron + Butterchurn (MilkDrop em WebGL 2), capturando o áudio do sistema por loopback, com a interface Sonic Obsidian por cima. Uso pessoal.

## Stack & comandos
- Electron + electron-vite + TypeScript, código em `src/` (`src/main/` = processo main, `src/renderer/` = página com o Butterchurn). Empacotamento com electron-builder (`electron-builder.yml`).
- Comandos:
  - `npm run typecheck` — checa tipos de main e renderer (rodar antes de todo commit; o CI roda também).
  - `npm run build` — compila para `out/` (roda na nuvem).
  - `npm run dist:win` — build + pasta portátil Windows em `release/win-unpacked/` (roda até no Linux; quem testa é o Windows).
  - `npm run dist:release` — instalador `SonicObsidian-Setup.exe` + `SonicObsidian-win-x64.zip` (spec 016). Release: subir a versão no `package.json`, mergear e dar push na tag `vX.Y.Z` → `.github/workflows/release.yml` cria a release como **rascunho** com os arquivos e o `SHA256SUMS.txt`; o usuário testa e publica. Versão pelo roadmap (1.0 = tudo planejado; DECISIONS 2026-11-09).
  - `npm run site:vendor` — copia motor, presets e fontes para `site/vendor/` (fora do git); depois `npx serve site` (ou `python3 -m http.server -d site`) abre a landing localmente. Publicação: `.github/workflows/pages.yml` (push em `main` com mudança em `site/**`); PR gera o artifact `sonic-obsidian-site-<sha>` (sem as músicas). As músicas da demo ficam criptografadas em `site-media/*.enc` (licença Uppbeat, não MIT, não redistribuir): com `SITE_AUDIO_KEY` no ambiente o `site:vendor` decifra para `site/assets/audio/` (fora do git); sem a chave, a demo usa a faixa sintetizada.
  - `npm run dev` — app com HMR; só funciona onde há janela e Electron instalado (não na nuvem, não no host sem Node).
  - Testes automatizados: ainda não há. Para ver a interface na nuvem: `npm run build`, servir `out/renderer/` e abrir no Chromium headless (Playwright) com `window.so` e `getDisplayMedia` simulados — serve para layout e estados, não para áudio/fps.
  - No app: `?` abre o painel com todos os atalhos (a lista única fica em `src/renderer/src/ui/shortcuts.ts`; tecla nova entra lá). `Ctrl+Shift+D` mostra o HUD de depuração (fps, memória JS, áudio, expressividade).
  - Simular falhas no Windows (spec 012): `test-flags.json` na pasta de dados do app (acima de `logs/`) com `{"captureFail": true}` e/ou `{"noWebgl2": true}`; apagar o arquivo volta ao normal.
  - Log em arquivo no Windows: `logs/sonic-obsidian.log` dentro do `userData` (`Ctrl+Shift+L` abre a pasta; a primeira linha de cada abertura traz o caminho) (abertura, quedas do renderer/GPU, perda do contexto WebGL, memória por processo a cada 5 min). Pedir ao usuário quando o app travar ou fechar sozinho.
- CI: `.github/workflows/build-windows.yml` — typecheck no Ubuntu e build no `windows-latest`; o artifact `sonic-obsidian-win-<sha>` é o que o usuário baixa e testa.
- `butterchurn` + `butterchurn-presets` (MIT) e `preact` (MIT, interface do overlay), versões fixadas. Processo main + preload (`src/preload/`, API estreita em `window.so`) + renderer; estado salvo em `settings.json`/`library.json` no `userData`.
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

## Design (protótipo)
- O desenho da interface vive num artefato do Claude Design; `docs/design/v3/` é o espelho dele no repo, com a versão em `docs/design/v3/SYNC.md`. Ler `docs/design/v3/README.md` antes de qualquer trabalho de interface.
- Skill `sincronizar-design`: modo "checar" no início de toda tarefa de interface; modo "sincronizar" quando o design mudou.
- Specs e PRs de interface citam a página e a versão do protótipo usadas.
- O espelho é somente leitura. Afastar-se do desenho → entrada em `docs/design/v3/DIVERGENCIAS.md` (a sessão de design lê e responde).
- Fato técnico (APIs, limites, versões) segue o repo (`docs/architecture.md`), não o protótipo.

## Limites — não fazer sem perguntar
- Commitar direto em `main`.
- Trocar de motor visual, de shell (Electron) ou adicionar framework grande de UI além do decidido — registrar em DECISIONS.md primeiro.
- Adicionar dependência com licença copyleft (GPL/LGPL) ou paga. Toda dependência nova passa antes pela checagem de [docs/dependencias.md](docs/dependencias.md) (≈1 min), registrada lá; sinal ruim → perguntar.
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
- `docs/design/v3/` — protótipo v3 espelhado do Claude Design (referência de interface)
- `docs/design/` — exploração v1/v2, moodboard
- `docs/research/` — pesquisa técnica (MilkDrop, FFT, efeitos)
