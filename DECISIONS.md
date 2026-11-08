# Decisões — Sonic Obsidian

Registro cronológico: o quê, por quê e alternativas descartadas. Quando passar de ~15 entradas, mover as mais antigas para `decisions/NNN-slug.md` e deixar aqui um índice de uma linha por decisão.

## 2026-03 — Stack v1: Python nativo (substituída)
- **Decisão:** Python + PyAudioWPatch (WASAPI loopback) + NumPy FFT + Pygame, com ModernGL/GLSL planejado para a Fase 3.
- **Por quê:** o browser não capturava o áudio do sistema sem fricção; a via nativa resolvia isso.
- **Resultado:** Fase 1 entregue (4 modos 2D, controles de ganho/graves, fullscreen) — preservada em `legacy/python/`. PRD e plano originais em `docs/legacy/`.

## 2026-11-08 — Motor visual: Butterchurn
- **Decisão:** usar o [Butterchurn](https://github.com/jberg/butterchurn) (MilkDrop 2 em WebGL 2, licença MIT) como motor de renderização, com o pacote `butterchurn-presets`.
- **Por quê:** testado e aprovado; entrega pronta a Fase 3 inteira da v1 (shaders estilo MilkDrop, presets, transições), que era a parte mais difícil. Abre o acervo de presets `.milk` da comunidade (via conversão).
- **Atenção:** o repositório upstream tem pouca atividade recente — tratar como dependência estável, fixar versão.
- **Descartado:** continuar escrevendo shaders próprios em ModernGL (muito trabalho para chegar abaixo do que já existe); projectM nativo (C++, LGPL, integração mais pesada).

## 2026-11-08 — Shell desktop: Electron (por ora)
- **Decisão:** app Electron. A captura usa `session.setDisplayMediaRequestHandler` devolvendo `audio: 'loopback'`, suportado no Windows, e o stream vai para um `AudioContext` conectado ao Butterchurn.
- **Por quê:** é o caminho mais curto para loopback do sistema + WebGL 2 no mesmo processo, e a UI desenhada (React/JSX no protótipo) migra direto.
- **Consequência:** o loopback do Chromium captura a mixagem do sistema; **seleção de dispositivo de saída** (P0 na v1) deixa de ser trivial e vira investigação na Fase 3.
- **Descartado (por ora):** Tauri — exigiria WASAPI em Rust + ponte de áudio até a WebView; reavaliar só se tamanho/memória do Electron incomodarem.

## 2026-11-08 — Python encostado, não apagado
- **Decisão:** `visualizer.py` e docs v1 ficam em `legacy/` como referência (pipeline FFT, beat detection, os 4 modos 2D que podem virar camadas próprias).
- **Por quê:** histórico útil e zero custo de manter; nada nele roda junto com o app novo.

## 2026-11-08 — Estrutura de workspace (workspace//kit)
- **Decisão:** adotar as camadas do [workspace//kit](https://github.com/atempel/workspace-kit): humana (PROJECT/CONTEXT/DECISIONS/TASKS/SESSIONS + `queue/`) e de agente (CLAUDE.md → AGENTS.md + skills em `.claude/skills/`), com o PRD como arquivo âncora.
- **Divisão com o Notion:** o repo é a fonte da documentação técnica e do histórico de decisões; o Notion guarda planejamento/reflexão e o **estado** do projeto (Última ação, Próximo passo) na Tabela Meus Projetos, atualizado pela skill `encerrar-sessao`.

## 2026-11-08 — Ambiente de dev: Claude Code na nuvem + validação no Windows por build de CI
- **Decisão:** desenvolver no Claude Code na nuvem (claude.ai/code, container Linux) e validar no Windows rodando um build gerado pelo GitHub Actions (`windows-latest`), baixado como artifact. **Nada de Node/npm instalado no host Windows.**
- **Por quê:** o usuário não quer toolchain no host. O loopback do Chromium só existe no Windows, então a nuvem serve para escrever, compilar e checar tipos, mas não para ouvir/ver o app; o executável vindo do CI fecha essa lacuna sem instalar nada.
- **Consequências:**
  - O spike (spec 001) ganha um P0: workflow que gera o app Windows (pasta/zip portátil, sem instalador e sem assinatura) a cada push na branch.
  - Na nuvem o `npm install` roda com `ELECTRON_SKIP_BINARY_DOWNLOAD=1` (hook `SessionStart` em `.claude/settings.json`); o binário do Electron só é baixado no CI.
  - Ciclo de teste é mais lento que `npm run dev` com HMR: cada rodada = push → esperar CI → baixar zip → abrir. Critérios de aceite de áudio/fps só contam como verificados quando o usuário confirma rodando esse build.
  - Repo privado: minutos de runner Windows contam em dobro na cota do GitHub Actions.
- **Descartado:** WSL + `npm run dev` no Windows e Claude Code nativo no Windows (ambos exigem Node no host); Node portátil em zip (ainda é toolchain no host).
