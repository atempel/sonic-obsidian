---
name: encerrar-sessao
description: Use ao final de toda sessão de trabalho no Sonic Obsidian para registrar o handoff no repo e atualizar o estado do projeto no Notion.
---

# Encerrar sessão — Sonic Obsidian

## Procedimento
1. **SESSIONS.md** — adicionar no topo de "Entradas":
   ```
   ### AAAA-MM-DD — <ferramenta/superfície> (<branch>)
   **Fez:** …
   **Deixou em:** estado da branch/PR, o que está pendente, o que não foi verificado.
   ```
   Só o handoff; o *porquê* de decisões vai para DECISIONS.md.
2. **TASKS.md** — marcar o que foi concluído; adicionar o que surgiu.
3. **DECISIONS.md** — registrar decisões tomadas na sessão, se ainda não estiverem lá.
4. **queue/** — criar stubs para referências citadas e não incorporadas.
5. **Commit** dessas mudanças (`docs: encerra sessão AAAA-MM-DD`) na branch atual e push.
6. **Notion — linha "Visualizador de Áudio | Sonic Obsidian" na Tabela Meus Projetos** (page id `33ed1673-4c17-803b-bc5c-f5f77a997f92`):
   - `Última ação`: uma frase com o que foi feito + data.
   - `Próximo passo`: a próxima tarefa concreta (igual à seção "Agora" do TASKS).
   - `Atualizado em`: data de hoje.
   - `Status`: só mudar se a fase mudou (Starting / In Development / Paused / Done).
   Só atualizar esses campos; nunca apagar outras propriedades nem mudar tipos.
   Sem acesso ao Notion nesta superfície → imprimir os três valores prontos para colar.
7. Responder ao usuário com 2–3 linhas: o que ficou pronto, o que vem a seguir.
