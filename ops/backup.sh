#!/usr/bin/env bash
set -euo pipefail
umask 077

DESTINATION="${1:-}"
: "${DIRECT_URL:?DIRECT_URL is required}"
: "${ARTIFACT_STORAGE_DIR:?ARTIFACT_STORAGE_DIR is required}"
[[ -n "$DESTINATION" ]] || { echo "Usage: $0 /private/backup-root" >&2; exit 2; }
command -v pg_dump >/dev/null
command -v sha256sum >/dev/null

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${DESTINATION%/}/portfolio-${STAMP}"
mkdir -p "$OUT"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DIRECT_URL" --file="$OUT/database.dump"
if [[ -d "$ARTIFACT_STORAGE_DIR" ]]; then
  tar -C "$ARTIFACT_STORAGE_DIR" -czf "$OUT/artifacts.tar.gz" .
else
  tar -czf "$OUT/artifacts.tar.gz" --files-from /dev/null
fi
printf '{"createdAt":"%s","database":"database.dump","artifacts":"artifacts.tar.gz"}\n' "$STAMP" > "$OUT/manifest.json"
(cd "$OUT" && sha256sum database.dump artifacts.tar.gz manifest.json > SHA256SUMS)
echo "$OUT"
