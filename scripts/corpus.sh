#!/usr/bin/env bash
# Scan a corpus of well-known open-source repositories and emit a Markdown
# results table. Used by the corpus workflow and runnable locally:
#   bash scripts/corpus.sh > docs/CORPUS.md
set -euo pipefail

REPOS=(
  "digitalbazaar/forge"
  "auth0/node-jsonwebtoken"
  "golang-jwt/jwt"
  "pyca/cryptography"
  "hashicorp/vault"
)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/packages/pqc-radar/dist/index.js"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "# Real-world corpus results"
echo
echo "pqc-radar run against unmodified checkouts of well-known open-source projects."
echo "Regenerated with \`bash scripts/corpus.sh\`. Numbers change as upstreams evolve;"
echo "high finding counts in crypto libraries are expected — implementing RSA is their job."
echo
echo "| Repository | Files scanned | Quantum-vulnerable | Legacy-weak | Crypto material | Time (s) |"
echo "|---|---|---|---|---|---|"

for repo in "${REPOS[@]}"; do
  dir="$WORK/${repo//\//__}"
  git clone --quiet --depth 1 "https://github.com/$repo.git" "$dir" 2>/dev/null

  start=$(date +%s%N)
  out=$(node "$CLI" scan "$dir" | head -n 1)
  end=$(date +%s%N)
  secs=$(awk "BEGIN {printf \"%.2f\", ($end - $start) / 1000000000}")

  files=$(sed -E 's/.*scanned ([0-9]+) files.*/\1/' <<<"$out")
  qv=$(sed -E 's/.* ([0-9]+) quantum-vulnerable.*/\1/' <<<"$out")
  legacy=$(sed -E 's/.* ([0-9]+) legacy-weak.*/\1/' <<<"$out")
  material=$(sed -E 's/.* ([0-9]+) crypto-material.*/\1/' <<<"$out")

  echo "| [$repo](https://github.com/$repo) | $files | $qv | $legacy | $material | $secs |"
done

# cygpath handles Git-Bash-on-Windows paths; plain $ROOT works on Linux CI
PKG_ROOT="$ROOT"
command -v cygpath >/dev/null 2>&1 && PKG_ROOT="$(cygpath -m "$ROOT")"
VERSION="$(node -p "require('$PKG_ROOT/packages/pqc-radar/package.json').version" 2>/dev/null || echo dev)"

echo
echo "_Generated: $(date -u +%Y-%m-%d) · pqc-radar ${VERSION}_"
