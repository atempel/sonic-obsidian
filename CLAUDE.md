@AGENTS.md

## Específico do Claude Code
- Use plan mode antes de mudanças estruturais (arquitetura main/renderer, pipeline de áudio, troca de dependência).
- Prefira subagentes com modelos menores (Haiku/Sonnet) para trabalho mecânico e bem delimitado: buscas no código, renomeações em lote, conferência de links, rodar e resumir logs. Dê a eles tarefas objetivas e pequenas.
- Para trabalho em paralelo, use worktrees (`.claude/worktrees/` é ignorado pelo git).
- Áudio e fps só se validam com o app rodando no Windows. Se não conseguir rodar, diga isso no PR e no SESSIONS.md em vez de marcar como verificado.
