---
name: executar-task
description: Use ao implementar uma tarefa do Sonic Obsidian que já tem spec e issue — da branch ao PR.
---

# Executar task — Sonic Obsidian

## Pré-condição
A tarefa tem spec em `docs/specs/` e issue. Se não tiver, pare e use `planejar-feature`.

## Procedimento
1. **Ler** a spec inteira, `CONTEXT.md` (restrições) e as decisões recentes em `DECISIONS.md`.
   - **Tarefa de interface?** Rodar `sincronizar-design` no modo "checar". Se a versão mudou desde a spec, avisar antes de codar. Implementar a partir da página citada na spec (tokens de `docs/design/v3/prototype/so-v3-base.css`). Se precisar se afastar do desenho, registrar em `docs/design/v3/DIVERGENCIAS.md` e citar no PR.
2. **Branch:** `git switch -c feat/<slug>` a partir de `main` atualizado (ou worktree, se houver outra tarefa em andamento).
3. **Planejar em voz alta:** listar os arquivos que vão mudar e a ordem. Mudança estrutural → plan mode e aprovação do usuário.
4. **Dependência nova?** Antes de instalar, fazer a checagem de `docs/dependencias.md` e registrar a linha no mesmo commit. Sinal ruim → parar e perguntar.
5. **Implementar em fatias pequenas**, cada uma deixando o app rodando. Commits Conventional (`feat:`, `fix:`…) em português.
6. **Verificar contra os critérios de aceite da spec**, um por um:
   - rodar typecheck/lint/testes que existirem;
   - na nuvem não há janela nem áudio: fazer push, esperar o build Windows do GitHub Actions e pedir ao usuário para baixar o artifact, rodar no Windows e confirmar áudio, fps e visual critério por critério;
   - o que não puder ser verificado, marcar explicitamente como "não verificado" com o motivo.
7. **Atualizar documentação:** comandos novos em `AGENTS.md`, decisões em `DECISIONS.md`, status no cabeçalho da spec, checkbox em `TASKS.md`.
8. **PR:** `git push -u origin feat/<slug>` e `gh pr create` com: o que mudou, como testar, checklist dos critérios de aceite (verificado / não verificado) e `Closes #N`.
9. Rodar a skill `encerrar-sessao` se a sessão terminar aqui.

## Regras
- Não ampliar escopo além da spec; ideia nova → stub em `queue/` ou nota para `planejar-feature`.
- Tarefas mecânicas (buscas, renomeações, checagens) podem ir para subagentes menores com instruções objetivas.
