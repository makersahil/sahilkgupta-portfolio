# Backup and Restore Runbook

A complete backup contains PostgreSQL plus the managed artifact directory from the same maintenance window. Quiesce Admin writes and managed uploads (or stop the application briefly) so database metadata and content-addressed bytes represent one consistent checkpoint.

## Create

```bash
DIRECT_URL='postgresql://...' ARTIFACT_STORAGE_DIR='/private/artifacts' \
  ./ops/backup.sh /private/backups
```

The script uses private permissions and produces a PostgreSQL custom-format dump, artifact archive, manifest, and SHA-256 checksums. Copy the completed set to a protected independent location.

## Restore drill

Use a disposable database and empty private directory only:

```bash
I_UNDERSTAND_THIS_IS_DISPOSABLE=YES \
TARGET_DATABASE_URL='postgresql://disposable...' \
TARGET_ARTIFACT_STORAGE_DIR='/tmp/portfolio-restore-artifacts' \
  ./ops/restore-disposable.sh /path/to/backup-set
```

Then configure the application to the disposable target and run:

```bash
npx prisma migrate status
npm run db:check
npm run artifacts:verify
npm run verify:quick
npm run deployment:smoke -- http://127.0.0.1:3000
```

Verify representative public content, Admin authentication, one Lab Manifest, one CLI context, one Scenario Runtime, one Orchestrator preview, and one managed artifact. Record commit SHA, backup ID, restore target, operator, commands, checksums, results, and cleanup. Never test restore by overwriting production.
