---
name: rodada
description: Use quando uma tarefa agendada (ou o usuário) pedir uma rodada do ciclo automático do Sonic Obsidian — escolher pelas issues do GitHub a próxima unidade de trabalho, fazê-la e encerrar sem depender do usuário.
---

# Rodada do ciclo automático — Sonic Obsidian

Uma rodada = **uma** unidade de trabalho, do começo ao fim, e encerra. Rodadas podem se sobrepor (uma pode levar mais que o intervalo da agenda), então **o estado vive nas issues do GitHub, nunca em arquivo do repo**. `TASKS.md` não serve para escolher trabalho.

O usuário não é o gargalo: ele testa **blocos de funcionalidades** (um milestone inteiro num build só), não PRs. **A release é o único passo que depende do ok expresso dele**: a rodada nunca cria release, nem rascunho, antes de ele aprovar o bloco. Tudo o que precisa dele é **atribuído a ele** (`assignee: atempel`) — essa é a caixa de entrada dele. Nada além disso deve esperar por ele.

## Estado (labels — uma de estado por issue)
| Label | Significa | Quem tira dali |
|---|---|---|
| `backlog` | ideia sem spec | rodada (planeja) |
| `needs-decision` | spec com pergunta que só o usuário responde; atribuída a ele | usuário responde → rodada |
| `needs-design` | precisa de desenho no Claude Design; atribuída a ele | usuário (sessão de design) |
| `blocked` | bloqueio externo (conta, upstream); motivo no último comentário | usuário |
| `ready` | spec pronta, pode implementar | rodada (reivindica) |
| `in-progress` | reivindicada por uma rodada | a própria rodada |
| `test-block` | issue "Testar bloco vX.Y.Z": build congelado para ele testar; atribuída a ele | usuário |

Marcadores extras: `prioridade` (fura a fila), `agent-decided` (a rodada decidiu algo reversível sozinha — revisar no teste do bloco).

**Milestone = bloco de teste = futura release** (`v0.6.0`, `v0.7.0`…). Toda issue `ready` tem milestone; sem milestone aberto, criar o da próxima versão menor. Encher um milestone até ~5 issues de app e então fechar o bloco.

**Branch do bloco:** `rc/vX.Y.Z`, congelada no commit que sobe a versão. O `main` segue com o próximo milestone; correções do bloco vão para a `rc/…` (e voltam ao `main`). A release sai da `rc/…`, do commit que o usuário testou.

## API do GitHub
Na nuvem não há GraphQL: `gh issue list`, `gh pr create` e afins **falham**. Use só REST (`gh api`). Repo: `repos/atempel/sonic-obsidian`. Exemplos:
- listar: `gh api 'repos/atempel/sonic-obsidian/issues?state=open&labels=ready&per_page=100'` (vem PR junto; filtrar `.pull_request == null`)
- labels: `gh api -X POST …/issues/N/labels -f 'labels[]=in-progress'` · `gh api -X DELETE …/issues/N/labels/ready`
- comentar: `gh api -X POST …/issues/N/comments -f body=…` · atribuir: `-X POST …/issues/N/assignees -f 'assignees[]=atempel'`
- PR: `gh api -X POST …/pulls -f title=… -f head=<branch> -f base=main -f body=…`
- checks: `gh api …/commits/<sha>/check-runs --jq '.check_runs[]|{name,status,conclusion}'`
- merge: `gh api -X PUT …/pulls/N/merge -f merge_method=squash`
- build do bloco: `gh api -X POST …/actions/workflows/build-windows.yml/dispatches -f ref=rc/vX.Y.Z`; o link do artifact sai de `…/actions/runs/<id>` (`…/actions/runs?branch=rc/vX.Y.Z&event=workflow_dispatch`)
- release (**só depois do ok do usuário**; tags não sobem da nuvem): `gh api -X POST …/actions/workflows/release.yml/dispatches -f ref=rc/vX.Y.Z -f 'inputs[version]=X.Y.Z'` → rascunho; publicar com `gh api -X PATCH …/releases/<id> -F draft=false`
- build Windows de um PR (só quando o usuário pedir um artifact daquele PR): `-X POST …/issues/<PR>/labels -f 'labels[]=build-windows'`
- `scripts/ciclo-labels.sh` cria as labels que faltarem (idempotente).

## Procedimento — parar no primeiro passo que gerar trabalho
Antes: `git fetch` e partir do `main` atualizado. Ler `AGENTS.md` e `CONTEXT.md` só quando for mexer em código ou spec.

**0. Faxina (sempre, rápido).** Issue `in-progress` cujo último comentário de reivindicação tem mais de 8 h e sem PR aberto que a cite → tirar `in-progress`, devolver `ready`, comentar "reivindicação expirada". Não conta como unidade de trabalho.

**1. Responder ao usuário** (destrava o que ele já fez; tem prioridade):
- `test-block` com comentário dele mais novo que o último da rodada:
  - **problema relatado** → cada um vira issue `bug` + `ready` + `prioridade` no mesmo milestone, citada na issue do bloco. A correção é um PR para a `rc/vX.Y.Z` (depois PR `rc/vX.Y.Z → main`). Com os bugs do bloco corrigidos, disparar novo build da `rc/…` e comentar na issue do bloco: link do build novo e roteiro **só do que mudou**.
  - **"ok"** (sem problema pendente) → é o ok para a release: disparar o workflow `release` na `rc/vX.Y.Z` com a versão, publicar o rascunho quando os arquivos subirem (a menos que ele tenha dito que publica), PR `rc/vX.Y.Z → main` se ainda houver diferença, fechar a issue do bloco e o milestone. Notas da release: as do bloco.
- `needs-decision` com resposta dele → incorporar à spec (branch `docs/…`, PR), tirar a atribuição, label `ready`.
- PR com comentário dele não respondido → tratar no próprio PR.

**2. Mergear o que está verde.** PRs abertos por sessões do Claude (rodada ou manual), com todos os checks `success` ou `skipped` (o build Windows só roda com a label `build-windows`; PR que o CI ignora por só mexer em docs/markdown/`site/` e não tem check nenhum conta como verde) e sem pedido de mudança do usuário:
- só `docs/`, `queue/`, testes, `site/`, `.claude/`, `.github/` → mergear. Pergunta pequena em aberto no PR → decidir pela sugestão (`agent-decided` na issue ligada, DECISIONS.md) antes; conflito (ex.: número de spec repetido) → corrigir na branch do PR;
- mudança no app → mergear se o PR traz a tabela de critérios preenchida (verificado / "testar no bloco") e os testes headless passam. O teste no Windows **não** acontece aqui — acontece no bloco. Check vermelho → consertar na mesma rodada ou comentar o motivo e seguir.

**3. Fechar o bloco de teste** (nunca uma release). Milestone mais antigo aberto sem issues abertas (exceto `needs-design`/`blocked`, que vão para o próximo) **e** menos de 2 issues `test-block` abertas **e** nenhuma branch `rc/vX.Y.Z` dessa versão:
1. PR `chore: versão X.Y.Z` subindo `package.json` e preenchendo `.github/release-notes.md`; mergear quando verde.
2. Criar a branch `rc/vX.Y.Z` nesse commit do `main` e disparar o `build-windows` nela.
3. Abrir a issue `Testar bloco vX.Y.Z` (`test-block`, atribuída a atempel): link do build (artifact); roteiro de teste **agrupado por funcionalidade**, juntando os itens "Testar no bloco" de todos os PRs do milestone, escrito para seguir sem contexto; lista das decisões `agent-decided`; "comente **ok** para eu criar a release, ou descreva cada problema — cada um vira uma issue". Avisar que o artifact expira em 30 dias.
Com 2 blocos esperando teste, **não** fechar outro: seguir para os passos 5–6 e só implementar `bug`.

**4. Implementar.** Escolher a issue `ready`, sem `in-progress`, sem PR aberto que a cite: primeiro `prioridade`, depois o milestone mais antigo, depois o menor número. Com 2 blocos esperando teste, só `bug`.
0. Spec ainda num PR aberto → tratar esse PR pelo passo 2 primeiro (é a unidade de trabalho desta rodada).
1. **Reivindicar antes de ler qualquer arquivo:** label `in-progress` (tirar `ready`) e comentar `Reivindicada por <link da sessão> em <data/hora UTC>`. Reler os comentários: se outra reivindicação chegou primeiro, devolver e escolher outra.
2. Seguir a skill `executar-task`, com estas diferenças: não esperar o teste do usuário; o PR leva `Closes #N`, a tabela de critérios e uma seção **"Testar no bloco"** com o que só se vê no Windows (áudio, fps, visual), escrito como passos que o usuário segue sem contexto. Tarefa de interface → `sincronizar-design` (checar) antes; se o desenho não cobre o caso, `needs-design` + atribuir ao usuário + comentário do que falta, tirar `in-progress`, e voltar ao passo 4 com outra issue.
3. Implementar só a spec. Ideia nova → issue `backlog` (não fazer agora).
4. Ao abrir o PR, tirar `in-progress`. O merge (passo 2 de uma rodada futura, ou desta mesma se os checks ficarem verdes a tempo) fecha a issue.

**5. Planejar.** Nada `ready`: pegar a `backlog` mais antiga (ou um stub `Status: Pending` de `queue/` sem issue — criar a issue `backlog` antes) e seguir `planejar-feature`. Perguntas da spec:
- **reversível e pequena** (valor padrão, faixa de um controle, texto, ordem de itens) → decidir pela opção recomendada, registrar em DECISIONS.md, label `agent-decided`, seguir como `ready`;
- **irreversível ou de direção** (tudo da seção "Limites" do AGENTS.md, dependência nova, mudança de escopo do PRD, conta externa, direção visual) → `needs-decision`, perguntas objetivas com opções e a recomendada, atribuir ao usuário, e **seguir para outra issue** — nunca esperar.
Ao ficar `ready`, pôr no milestone aberto mais antigo com vaga.

**6. Manutenção.** Itens com data vencida (ex.: a checagem de `electron`/`vite` depois de 19/11 em `docs/dependencias.md`), lacunas da suíte headless, critérios "não verificado" de specs antigas que um teste headless cobre.

**7. Nada a fazer** → encerrar sem commit e sem comentário. Não inventar trabalho fora do PRD.

## Encerrar a rodada
- Skill `encerrar-sessao`, com a entrada do SESSIONS.md **dentro do PR da rodada** (sem PR próprio só para o log). `TASKS.md` não é atualizado pelo ciclo. No Notion, `Próximo passo` = "ciclo automático: <o que a próxima rodada deve pegar>".
- Resposta final, 3 linhas: o que fez (issue/PR), o que ficou com o usuário (`assignee: atempel`), o que a próxima rodada pega. Se algo novo foi atribuído ao usuário, dizer isso na primeira linha (vira a notificação).

## Regras
- Uma unidade de trabalho por rodada. Branch por issue; nunca commitar em `main`.
- Nunca esperar o usuário dentro da rodada: atribuir, comentar e seguir.
- Nunca desenhar interface: a separação design × desenvolvimento é do usuário.
- Sobreposição: o que vale é a label + comentário de reivindicação; conflito em SESSIONS.md/DECISIONS.md no rebase → manter as duas entradas.
- Trabalho mecânico (buscas, renomeações, conferência de links, resumo de logs de CI) → subagente menor com tarefa objetiva.
