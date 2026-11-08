# Contexto — Sonic Obsidian

O que um agente precisa saber para trabalhar bem aqui: convenções, restrições, vocabulário.

## Convenções
- Documentação e mensagens de commit em português; nomes de arquivo de convenção de ferramenta (CLAUDE.md, AGENTS.md, SKILL.md) e identificadores de código em inglês.
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- Uma feature = uma spec em `docs/specs/NNN-slug.md` + uma entrada em [TASKS.md](TASKS.md) + uma issue no GitHub.
- Branch por task (`feat/<slug>`, `fix/<slug>`, `docs/<slug>`); merge via PR em `main`.

## Restrições
- **Windows é a plataforma-alvo.** A captura de áudio do sistema usa o loopback do Chromium, que no Electron só existe no Windows. O app precisa *rodar* no Windows para ser testado de verdade — WSL serve para editar, não para validar áudio.
- **Butterchurn exige WebGL 2.** Toda a renderização visual passa por ele; efeitos próprios entram como camadas por cima (canvas/WebGL), não como fork do motor, até haver motivo forte (registrar em DECISIONS.md).
- **Conteúdo com DRM fica fora de escopo** — não tentar contornar.
- **Créditos dos presets:** os presets do `butterchurn-presets` são obras de artistas da comunidade MilkDrop; o nome do preset carrega o crédito e a UI nunca o remove ou renomeia.
- **Licença:** o repositório é proprietário (uso pessoal); dependências precisam ser compatíveis (MIT/BSD/Apache ok; perguntar antes de GPL).
- Performance: o render nunca pode engasgar por causa da UI. Alvo 60 fps em tela cheia na máquina principal (RTX 3070).

## Ambiente de desenvolvimento
- **Código:** Claude Code na nuvem (claude.ai/code). O container é Linux: dá para instalar dependências, compilar, rodar typecheck/lint/testes — **não** dá para abrir a janela nem capturar áudio.
- **Validação:** no Windows do usuário, com o build portátil gerado pelo GitHub Actions (`windows-latest`) e baixado como artifact. Não há Node/npm no host Windows — não peça para instalar.
- Na nuvem, o hook `SessionStart` (`.claude/hooks/session-start.sh`) roda `npm ci`/`npm install` com `ELECTRON_SKIP_BINARY_DOWNLOAD=1` quando existe `package.json`.
- O repo local fica no OneDrive; `node_modules/` está no `.gitignore` e não deve existir lá (sem Node no host).
- Decisão completa em [DECISIONS.md](DECISIONS.md) (2026-11-08 — Ambiente de dev).

## Vocabulário
- **Preset** — uma visualização do MilkDrop/Butterchurn (equações + shaders). Substitui o conceito de "modo visual" da v1.
- **Blend** — transição suave entre dois presets (segundos), nativa do Butterchurn.
- **Loopback** — captura do áudio que está saindo pelo sistema, sem microfone nem cabo virtual.
- **Overlay** — a interface Sonic Obsidian desenhada por cima do visual.
- **Spike** — protótipo descartável para validar um risco técnico antes de construir em cima.
- **Camada humana** = PROJECT/CONTEXT/DECISIONS/TASKS/SESSIONS. **Camada de agente** = CLAUDE.md/AGENTS.md/`.claude/skills/` (convenção do workspace//kit).
