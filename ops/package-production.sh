#!/usr/bin/env bash
set -euo pipefail
umask 077
npm ci
npx prisma validate
npx prisma generate
npm run lint
npm run build
npm run test:performance
OUT="${1:-portfolio-production.tgz}"
tar -czf "$OUT" --exclude='.env*' --exclude='.git' --exclude='node_modules' --exclude='.runtime' --exclude='backups' dist package.json package-lock.json prisma prisma.config.ts ops docs
sha256sum "$OUT" > "$OUT.sha256"
echo "$OUT"
