#!/bin/bash
# Prepara o ambiente do Claude Code na nuvem. No host (Windows) não faz nada.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}"
[ -f package.json ] || { echo "session-start: sem package.json ainda (spike não começou)"; exit 0; }
# O binário do Electron não roda no container; só o CI Windows precisa dele.
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
