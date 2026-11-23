#!/usr/bin/env bash
# Confere o .msix gerado pelo `npm run dist:msix` (spec 044): a identidade tem que ser igual à do
# Partner Center (a Store recusa o pacote se um valor for diferente), runFullTrust presente e a versão
# igual à do package.json. Usado pelo msix.yml e pelo store.yml. Escreve `file=<caminho>` no GITHUB_OUTPUT.
set -euo pipefail
file="$(ls release/*.msix | head -n 1)"
echo "pacote: $file"
tmp="$(mktemp -d)"
# O .msix é um zip: unzip (Git Bash) ou, sem ele, o bsdtar do Windows.
if command -v unzip >/dev/null; then unzip -p "$file" AppxManifest.xml > "$tmp/AppxManifest.xml"; else tar -xf "$file" -C "$tmp" AppxManifest.xml; fi
# O manifesto quebra atributos em várias linhas: junta tudo numa linha antes de procurar.
m="$tmp/manifest.txt"
tr '\r\n' '  ' < "$tmp/AppxManifest.xml" > "$m"
grep -o '<Identity[^>]*>' "$m"
grep -q 'Name="AlexandreTempel.SonicObsidian"' "$m" || { echo "::error::Identity Name diferente do Partner Center"; exit 1; }
grep -q 'Publisher="CN=FB52A5F4-E46E-48B7-90A9-D2F6FC05DB7B"' "$m" || { echo "::error::Identity Publisher diferente do Partner Center"; exit 1; }
grep -q '<PublisherDisplayName>Alexandre Tempel</PublisherDisplayName>' "$m" || { echo "::error::PublisherDisplayName diferente do Partner Center"; exit 1; }
grep -q 'Name="runFullTrust"' "$m" || { echo "::error::falta a capability runFullTrust"; exit 1; }
version="$(node -p "require('./package.json').version").0"
grep -q "Version=\"$version\"" "$m" || { echo "::error::a versão do pacote não é $version"; exit 1; }
echo "ok: identidade, runFullTrust e versão $version"
if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "file=$file" >> "$GITHUB_OUTPUT"; fi
