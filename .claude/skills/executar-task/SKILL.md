---
name: executar-task
description: Use ao implementar uma tarefa do Sonic Obsidian que já tem spec e issue — da branch ao PR.
---

# Executar task — Sonic Obsidian

## Pré-condição
A tarefa tem spec em `docs/specs/` e issue. Se não tiver, pare e use `planejar-feature`.

## Procedimento
1. **Ler** a spec inteira, `CONTEXT.md` (restrições) e as decisões recentes em `DECISIONS.md`.
2. **Branch:** `git switch -c feat/<slug>` a partir de `main` atualizado (ou worktree, se houver outra tarefa em andamento).
3. **Planejar em voz alta:** listar os arquivos que vão mudar e a ordem. Mudança estrutural → plan mode e aprovação do usuário.
4. **Implementar em fatias pequenas**, cada uma deixando o app rodando. Commits Conventional (`feat:`, `fix:`…) em português.
5. **Verificar contra os critérios de aceite da spec**, um por um:
   - rodar typecheck/lint/testes que existirem;
   - na nuvem não há janela nem áudio: fazer push, esperar o build Windows do GitHub Actions e pedir ao usuário para baixar o artifact, rodar no Windows e confirmar áudio, fps e visual critério por critério;
   - o que não puder ser verificado, marcar explicitamente como "não verificado" com o motivo.
6. **Atualizar documentação:** comandos novos em `AGENTS.md`, decisões em `DECISIONS.md`, status no cabeçalho da spec, checkbox em `TASKS.md`.
7. **PR:** `git push -u origin feat/<slug>` e `gh pr create` com: o que mudou, como testar, checklist dos critérios de aceite (verificado / não verificado) e `Closes #N`.
8. Rodar a skill `encerrar-sessao` se a sessão terminar aqui.

## Regras
- Não ampliar escopo além da spec; ideia nova → stub em `queue/` ou nota para `planejar-feature`.
- Tarefas mecânicas (buscas, renomeações, checagens) podem ir para subagentes menores com instruções objetivas.
