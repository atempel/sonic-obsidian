---
name: rodada
description: Use quando uma tarefa agendada (ou o usuário) pedir uma rodada do ciclo automático do Sonic Obsidian — escolher pelas issues do GitHub a próxima unidade de trabalho, fazê-la e encerrar sem depender do usuário.
---

# Rodada do ciclo automático — Sonic Obsidian

Uma rodada = **uma** unidade de trabalho, do começo ao fim, e encerra. Rodadas podem se sobrepor (uma pode levar mais que o intervalo da agenda), então **o estado vive nas issues do GitHub, nunca em arquivo do repo**. `TASKS.md` não serve para escolher trabalho.

O usuário não é o gargalo: ele testa **releases**, não PRs. Tudo o que precisa dele é **atribuído a ele** (`assignee: atempel`) — essa é a caixa de entrada dele. Nada além disso deve esperar por ele.

## Estado (labels — uma de estado por issue)
| Label | Significa | Quem tira dali |
|---|---|---|
| `backlog` | ideia sem spec | rodada (planeja) |
| `needs-decision` | spec com pergunta que só o usuário responde; atribuída a ele | usuário responde → rodada |
| `needs-design` | precisa de desenho no Claude Design; atribuída a ele | usuário (sessão de design) |
| `blocked` | bloqueio externo (conta, upstream); motivo no último comentário | usuário |
| `ready` | spec pronta, pode implementar | rodada (reivindica) |
| `in-progress` | reivindicada por uma rodada | a própria rodada |
| `release-candidate` | issue de teste de uma release em rascunho; atribuída a ele | usuário |

Marcadores extras: `prioridade` (fura a fila), `agent-decided` (a rodada decidiu algo reversível sozinha — revisar no teste da release).

**Milestones = releases** (`v0.6.0`, `v0.7.0`…). Toda issue `ready` tem milestone; sem milestone aberto, criar o da próxima versão menor. Encher um milestone até ~5 issues de app e então fechar a release.

## API do GitHub
Na nuvem não há GraphQL: `gh issue list`, `gh pr create` e afins **falham**. Use só REST (`gh api`). Repo: `repos/atempel/sonic-obsidian`. Exemplos:
- listar: `gh api 'repos/atempel/sonic-obsidian/issues?state=open&labels=ready&per_page=100'` (vem PR junto; filtrar `.pull_request == null`)
- labels: `gh api -X POST …/issues/N/labels -f 'labels[]=in-progress'` · `gh api -X DELETE …/issues/N/labels/ready`
- comentar: `gh api -X POST …/issues/N/comments -f body=…` · atribuir: `-X POST …/issues/N/assignees -f 'assignees[]=atempel'`
- PR: `gh api -X POST …/pulls -f title=… -f head=<branch> -f base=main -f body=…`
- checks: `gh api …/commits/<sha>/check-runs --jq '.check_runs[]|{name,status,conclusion}'`
- merge: `gh api -X PUT …/pulls/N/merge -f merge_method=squash`
- release (tags não sobem da nuvem): `gh api -X POST …/actions/workflows/release.yml/dispatches -f ref=main -f 'inputs[version]=X.Y.Z'`
- `scripts/ciclo-labels.sh` cria as labels que faltarem (idempotente).

## Procedimento — parar no primeiro passo que gerar trabalho
Antes: `git fetch` e partir do `main` atualizado. Ler `AGENTS.md` e `CONTEXT.md` só quando for mexer em código ou spec.

**0. Faxina (sempre, rápido).** Issue `in-progress` cujo último comentário de reivindicação tem mais de 8 h e sem PR aberto que a cite → tirar `in-progress`, devolver `ready`, comentar "reivindicação expirada". Não conta como unidade de trabalho.

**1. Responder ao usuário** (destrava o que ele já fez; tem prioridade):
- `release-candidate` com comentário dele mais novo que o último da rodada → cada problema relatado vira issue `bug` + `ready` + `prioridade` no milestone de correção (`vX.Y.Z+1`), citada na issue da RC. "ok"/"publiquei" → fechar a issue e o milestone.
- `needs-decision` com resposta dele → incorporar à spec (branch `docs/…`, PR), tirar a atribuição, label `ready`.
- PR com comentário dele não respondido → tratar no próprio PR.

**2. Mergear o que está verde.** PRs abertos por sessões do Claude (rodada ou manual), com todos os checks `success` e sem pedido de mudança do usuário:
- só `docs/`, `queue/`, testes, `site/`, `.claude/`, `.github/` → mergear. Pergunta pequena em aberto no PR → decidir pela sugestão (`agent-decided` na issue ligada, DECISIONS.md) antes; conflito (ex.: número de spec repetido) → corrigir na branch do PR;
- mudança no app → mergear se o PR traz a tabela de critérios preenchida (verificado / "testar na release") e os testes headless passam. O teste no Windows **não** acontece aqui — acontece na release. Check vermelho → consertar na mesma rodada ou comentar o motivo e seguir.

**3. Fechar release.** Milestone mais antigo aberto sem issues abertas (exceto `needs-design`/`blocked`, que vão para o próximo) **e** menos de 2 issues `release-candidate` abertas **e** nenhum PR aberto chamado `release: v…`:
1. PR `release: vX.Y.Z` subindo `package.json` e as notas em `.github/release-notes.md`; mergear quando verde.
2. Disparar o workflow `release` com `version`. Ele cria o **rascunho** da release.
3. Abrir a issue `Testar vX.Y.Z` (`release-candidate`, atribuída a atempel): link do rascunho; roteiro de teste **agrupado por funcionalidade**, juntando os itens "testar na release" de todos os PRs do milestone; lista das decisões `agent-decided`; "comente 'ok' para publicar, ou descreva o problema — cada problema vira uma issue".
Com 2 RCs esperando, **não** fechar outra release: seguir para os passos 5–6 e só implementar `bug`.

**4. Implementar.** Escolher a issue `ready`, sem `in-progress`, sem PR aberto que a cite: primeiro `prioridade`, depois o milestone mais antigo, depois o menor número. Com 2 RCs esperando, só `bug`.
0. Spec ainda num PR aberto → tratar esse PR pelo passo 2 primeiro (é a unidade de trabalho desta rodada).
1. **Reivindicar antes de ler qualquer arquivo:** label `in-progress` (tirar `ready`) e comentar `Reivindicada por <link da sessão> em <data/hora UTC>`. Reler os comentários: se outra reivindicação chegou primeiro, devolver e escolher outra.
2. Seguir a skill `executar-task`, com estas diferenças: não esperar o teste do usuário; o PR leva `Closes #N`, a tabela de critérios e uma seção **"Testar na release"** com o que só se vê no Windows (áudio, fps, visual), escrito como passos que o usuário segue sem contexto. Tarefa de interface → `sincronizar-design` (checar) antes; se o desenho não cobre o caso, `needs-design` + atribuir ao usuário + comentário do que falta, tirar `in-progress`, e voltar ao passo 4 com outra issue.
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
