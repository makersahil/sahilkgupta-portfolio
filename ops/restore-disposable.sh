#!/usr/bin/env bash
set -euo pipefail
umask 077

BACKUP="${1:-}"
: "${I_UNDERSTAND_THIS_IS_DISPOSABLE:?Set I_UNDERSTAND_THIS_IS_DISPOSABLE=YES}"
[[ "$I_UNDERSTAND_THIS_IS_DISPOSABLE" == "YES" ]] || { echo "Disposable confirmation must be YES" >&2; exit 2; }
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"
: "${TARGET_ARTIFACT_STORAGE_DIR:?TARGET_ARTIFACT_STORAGE_DIR is required}"
[[ "$TARGET_ARTIFACT_STORAGE_DIR" = /* && "$TARGET_ARTIFACT_STORAGE_DIR" != "/" && ${#TARGET_ARTIFACT_STORAGE_DIR} -ge 12 ]] || { echo "TARGET_ARTIFACT_STORAGE_DIR must be a specific absolute disposable path" >&2; exit 2; }
[[ -d "$BACKUP" ]] || { echo "Backup directory not found" >&2; exit 2; }
command -v pg_restore >/dev/null
(cd "$BACKUP" && sha256sum -c SHA256SUMS)
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$TARGET_DATABASE_URL" "$BACKUP/database.dump"
rm -rf "$TARGET_ARTIFACT_STORAGE_DIR"
mkdir -p "$TARGET_ARTIFACT_STORAGE_DIR"
tar -C "$TARGET_ARTIFACT_STORAGE_DIR" -xzf "$BACKUP/artifacts.tar.gz"
chmod -R go-rwx "$TARGET_ARTIFACT_STORAGE_DIR"
echo "Disposable restore completed. Run migration, db, artifact, and application verification before use."
