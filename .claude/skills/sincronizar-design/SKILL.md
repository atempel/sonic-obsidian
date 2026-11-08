---
name: sincronizar-design
description: Use para trazer a versão mais recente do protótipo do Claude Design para docs/design/v3/, ou para checar se o design mudou antes de planejar ou implementar interface no Sonic Obsidian.
---

# Sincronizar design — Sonic Obsidian

O desenho da interface vive no artefato do Claude Design. `docs/design/v3/` é o espelho dele no repo. Esta skill mantém os dois iguais. **Não altera o artefato** (só lê) e não edita código.

## Modo "checar" (rápido, usado por `planejar-feature` e `executar-task`)
1. Ler `docs/design/v3/SYNC.md` (artefato e versão sincronizada).
2. Com a ferramenta de artefatos (Artifact `read` com o link e `path: "project/compat.json"`), ler a versão atual — vem no cabeçalho do resultado ("from version …").
3. Igual → seguir. Diferente → avisar o usuário em uma linha ("o design mudou: versão X → Y") e perguntar se sincroniza antes de continuar. Sem acesso à ferramenta de artefatos nesta superfície → dizer isso e seguir com a versão do espelho, citando-a.

## Modo "sincronizar"
1. Branch `docs/design-sync-<versão curta>` a partir de `main` atualizado.
2. Listar os arquivos do artefato (Artifact `list`, `scope: "files"`) e ler com `paths` só os que entram no espelho (mapa em `SYNC.md`): páginas `.html` v3, `so-v3-*.css|js` e `project/docs/*.md`. Páginas novas que apareceram no artefato entram também; as históricas listadas como "fora do espelho" ficam de fora.
3. Copiar para `docs/design/v3/prototype/` e `docs/design/v3/docs/` (mesmos nomes). Não reescrever conteúdo.
4. Atualizar `SYNC.md`: versão, data, autor e o manifesto (`sha256sum | cut -c1-12`). Atualizar a tabela "Páginas → roadmap" do `README.md` se houver página nova.
5. Ler o diff dos `docs/*.md` e listar em 3–6 linhas o que mudou de comportamento (atalhos, estados, seções, ferramentas MCP).
6. Conferir `DIVERGENCIAS.md`: entradas que a nova versão resolve → marcar "Aceita (design atualizado na versão X)".
7. Se a mudança afeta specs existentes, não editar as specs aqui: criar stub em `queue/` apontando spec e mudança.
8. Commit `docs(design): sincroniza protótipo v3 — versão <id>` e PR com o resumo do passo 5.

## Regras
- O espelho é somente leitura: mudança de desenho se faz no artefato.
- Fato técnico (APIs, limites, versões) segue o repo; ver "Precedência" em `docs/design/v3/README.md`.
