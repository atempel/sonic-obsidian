#!/usr/bin/env bash
# Cria as labels do ciclo automático (skill `rodada`) que ainda não existem. Idempotente.
# Uso: bash scripts/ciclo-labels.sh   (precisa de `gh` autenticado; usa só a API REST)
set -euo pipefail
REPO="repos/atempel/sonic-obsidian"
existing="$(gh api "$REPO/labels?per_page=100" --jq '.[].name')"
while IFS='|' read -r name color desc; do
  [ -z "$name" ] && continue
  if grep -qxF "$name" <<<"$existing"; then echo "ok      $name"; continue; fi
  gh api -X POST "$REPO/labels" -f name="$name" -f color="$color" -f description="$desc" >/dev/null
  echo "criada  $name"
done <<'EOF'
backlog|cfd3d7|Ideia sem spec — a rodada planeja
needs-decision|d93f0b|Pergunta que só o usuário responde (atribuída a ele)
needs-design|c5def5|Precisa de desenho no Claude Design (atribuída ao usuário)
blocked|b60205|Bloqueio externo; motivo no último comentário
ready|0e8a16|Spec pronta; a rodada pode implementar
in-progress|fbca04|Reivindicada por uma rodada do ciclo
release-candidate|5319e7|Teste de uma release em rascunho (atribuída ao usuário)
prioridade|e11d21|Fura a fila do ciclo
agent-decided|bfdadc|A rodada decidiu algo reversível sozinha — revisar no teste da release
bug|d73a4a|Algo não funciona
EOF
