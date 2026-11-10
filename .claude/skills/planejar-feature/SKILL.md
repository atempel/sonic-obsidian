---
name: planejar-feature
description: Use ao transformar uma ideia, nota ou item do roadmap do Sonic Obsidian em spec + tarefa + issue no GitHub, antes de qualquer código.
---

# Planejar feature — Sonic Obsidian

Transforma uma ideia em trabalho executável. **Não escreve código.**

## Procedimento
1. **Situar.** Ler `docs/PRD.md` (fase e prioridade), `TASKS.md`, as specs existentes em `docs/specs/` e as [personas](../../../docs/research/mercado/personas.md) (a matriz "Funcionalidades por público" está em `docs/research/mercado/pesquisa-de-mercado.md`). Se a ideia já estiver coberta, atualizar a spec existente em vez de criar outra.
   - **Feature de interface?** Rodar `sincronizar-design` no modo "checar" e ler a página do protótipo em `docs/design/v3/prototype/` e os docs em `docs/design/v3/docs/`. A spec cita página e versão (`SYNC.md`) em "Referências" e transforma os estados da barra "Protótipo" em critérios de aceite.
2. **Esclarecer.** Se algo decisivo estiver ambíguo (escopo, comportamento esperado, prioridade), perguntar ao usuário — no máximo 3 perguntas, objetivas.
3. **Escrever a spec** em `docs/specs/NNN-slug.md` (próximo número livre) com:
   - cabeçalho: Fase · Status · Issue · Personas (apelidos de `docs/research/mercado/personas.md` que a feature atende)
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
