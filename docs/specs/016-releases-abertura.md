# 016 — Releases no GitHub e abertura do repositório (MIT)

**Fase:** Abertura · **Status:** A fazer — o repo já é **público e MIT** desde 2026-11-08 ([#43](https://github.com/atempel/sonic-obsidian/pull/43)); falta o pipeline de release · **Issue:** [#40](https://github.com/atempel/sonic-obsidian/issues/40) · **Relacionada:** [017 — Landing page](017-landing-github-pages.md)

## Problema
Hoje o único jeito de ter o app é baixar o artifact do CI (expira em 7 dias, exige login no GitHub, pasta sem instalador). Para abrir o projeto, uma pessoa qualquer precisa de um link estável que sempre entregue a versão mais nova, e o repo precisa estar pronto para ser público (licença, créditos, como contribuir).

## Proposta
1. **Release por tag:** dar push numa tag `vX.Y.Z` dispara um workflow que gera o instalador e o zip portátil no `windows-latest` e cria um **rascunho** de release com os arquivos e os checksums. O usuário revisa e clica em *Publish* no GitHub — só então ele vira a "latest".
2. **Nomes de arquivo sem versão**, para o link `https://github.com/atempel/sonic-obsidian/releases/latest/download/<arquivo>` funcionar para sempre. A versão aparece no título da release e no app, não no nome do arquivo.
3. **Checklist de abertura** executado no dia em que o repo ficar público.

## Escopo
**P0 — release**
- `electron-builder.yml`: além de `dir` (CI de teste), alvos `nsis` (instalador, por usuário, sem pedir admin) e `zip` (portátil), x64.
- Nomes fixos: `SonicObsidian-Setup.exe` e `SonicObsidian-win-x64.zip` (configurar `artifactName` por alvo; confirmar na doc do electron-builder como nomear o zip).
- `SHA256SUMS.txt` com o hash dos dois arquivos, anexado à release.
- Workflow `.github/workflows/release.yml`: `on: push: tags: ['v*']`; build no `windows-latest`; cria a release como **draft** com os três arquivos (`gh release create --draft` ou action equivalente, versão fixada); corpo da release com link para a landing e o aviso de fotossensibilidade.
- `package.json` `version` alinhada à tag (o workflow falha se divergir).
- Versionamento semver em `0.x` até o app estar estável; *pre-release* marcado para `-beta`/`-rc`.

**P0 — abertura** *(feita no #43, exceto o que está marcado como pendente)*
- ~~`LICENSE` → texto MIT, `Copyright (c) 2026 Alexandre Tempel`.~~ Feito (#43).
- ~~README EN/pt-BR: seção "License" para MIT.~~ Feito (#43). **Pendente:** depois da primeira release, trocar "compile a partir do código" pelo link de download.
- ~~`CONTRIBUTING.md` e templates de issue e de PR.~~ Feito (#43, com SECURITY e CODE_OF_CONDUCT).
- Conferir `THIRD_PARTY_NOTICES.md` (Butterchurn, presets, Preact, Electron) e os créditos dos autores de preset.
- ~~Tornar o repo público.~~ Feito (2026-11-08). **Pendente:** habilitar GitHub Pages (spec 017).
- PRD: "Distribuição pública" sai de "Fora de escopo" (loja e assinatura de código continuam fora).

**P1**
- Atualização automática com `electron-updater` lendo o GitHub Releases (só no instalador; o portátil avisa que há versão nova e abre a página).
- Publicar no winget (`atempel.SonicObsidian`) depois da primeira release estável.
- Corrigir o CI de teste rodando duas vezes em PR (item de Manutenção do TASKS) antes de abrir, para não gastar runner à toa.

## Fora de escopo
Assinatura de código (SmartScreen avisa; a landing explica "Mais informações → Executar assim mesmo"), Microsoft Store, macOS/Linux.

## Critérios de aceite
1. Push de uma tag `v0.1.0` gera, sem intervenção, um rascunho de release com `SonicObsidian-Setup.exe`, `SonicObsidian-win-x64.zip` e `SHA256SUMS.txt`.
2. No Windows: o instalador instala sem pedir admin, cria atalho no menu Iniciar e o app abre e reage ao áudio; desinstalar remove o app.
3. No Windows: o zip, descompactado em qualquer pasta, abre e reage ao áudio.
4. Depois de publicada, `…/releases/latest/download/SonicObsidian-Setup.exe` baixa o instalador da versão nova (testar com duas releases seguidas).
5. `sha256sum` dos arquivos baixados bate com o `SHA256SUMS.txt`.
6. Tag com versão diferente do `package.json` faz o workflow falhar com mensagem clara.

## Respostas do usuário (2026-11-08)
- O repo continua **`atempel/sonic-obsidian`** na abertura (a landing usa esses links).
- O `appId` continua **`dev.atempel.sonic-obsidian`** (não mudar: quebraria atualização e atalhos).
- Copyright do MIT: **`Copyright (c) 2026 Alexandre Tempel`**.

## Referências
- Landing (canvas, versão EN e PT-BR): https://claude.ai/artifact/77UgsmUowPneiFTfduxF2L — seção Download e FAQ.
- Design System (marca, ícone do app): https://claude.ai/artifact/PsbByhFqsyarVehitA8rPZ · espelho em `docs/brand/`.
- DECISIONS 2026-11-08 — "Abertura: GitHub Pages e releases por tag".
