---
name: planejar-feature
description: Use ao transformar uma ideia, nota ou item do roadmap do Sonic Obsidian em spec + tarefa + issue no GitHub, antes de qualquer código.
---

# Planejar feature — Sonic Obsidian

Transforma uma ideia em trabalho executável. **Não escreve código.**

## Procedimento
1. **Situar.** Ler `docs/PRD.md` (fase e prioridade), `TASKS.md` e as specs existentes em `docs/specs/`. Se a ideia já estiver coberta, atualizar a spec existente em vez de criar outra.
2. **Esclarecer.** Se algo decisivo estiver ambíguo (escopo, comportamento esperado, prioridade), perguntar ao usuário — no máximo 3 perguntas, objetivas.
3. **Escrever a spec** em `docs/specs/NNN-slug.md` (próximo número livre) com:
   - cabeçalho: Fase · Status · Issue
   - Problema · Proposta · Escopo (P0 / P1) · Fora de escopo
   - Critérios de aceite **verificáveis com o app rodando** (o que se vê, ouve, mede)
   - Perguntas em aberto · Referências
   Mantenha curta: se passar de ~150 linhas, quebre em duas specs.
4. **Registrar em `TASKS.md`:** uma linha na seção certa, apontando para a spec.
5. **Criar a issue:** `gh issue create --title "<título>" --body "<resumo + link da spec + critérios de aceite>" --label <fase-N>` (criar o label se não existir). Atualizar o cabeçalho da spec e a linha do TASKS com o número.
6. **Decisões:** se o planejamento decidiu algo (lib, abordagem, corte de escopo), registrar em `DECISIONS.md`.
7. **Commit** em branch `docs/<slug>` e abrir PR, ou incluir no PR da sessão se já houver um.

## Saída
Resumo de 3–5 linhas: spec criada, issue, o que ficou em aberto.
