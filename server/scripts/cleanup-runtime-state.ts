import 'dotenv/config';

import { disconnectPersistence } from '../lib/prisma.js';
import { authRepository } from '../repositories/prisma/auth.repository.js';
import { artifactRepository } from '../repositories/prisma/artifact.repository.js';
import { scenarioRuntimeRepository } from '../services/scenarios/index.js';
import { databaseRateLimitService } from '../security/rate-limit.service.js';
import { managedArtifactStorage } from '../services/media/managed-artifact-storage.js';

async function main(): Promise<void> {
  const now = new Date();
  const authRetentionDays = 7;
  const scenarioRetentionHours = 24;
  const authCutoff = new Date(now.getTime() - authRetentionDays * 24 * 60 * 60 * 1_000);
  const scenarioCutoff = new Date(now.getTime() - scenarioRetentionHours * 60 * 60 * 1_000);

  const managedArtifacts = await artifactRepository.findMany({ storageProvider: 'LOCAL_MANAGED' });
  const referencedStorageKeys = new Set(managedArtifacts.map((artifact) => artifact.storageKey));
  const orphanCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1_000);

  const [authSessions, scenarioRuntimes, rateLimitBuckets, orphanArtifactObjects] = await Promise.all([
    authRepository.deleteStaleSessions(authCutoff),
    scenarioRuntimeRepository.deleteExpired(scenarioCutoff),
    databaseRateLimitService.prune(now),
    managedArtifactStorage.pruneUnreferenced(referencedStorageKeys, orphanCutoff),
  ]);

  console.log(JSON.stringify({
    success: true,
    deleted: { authSessions, scenarioRuntimes, rateLimitBuckets, orphanArtifactObjects },
    retention: { authDays: authRetentionDays, scenarioHours: scenarioRetentionHours },
  }));
}

main()
  .catch((error: unknown) => {
    console.error(`Runtime maintenance cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(disconnectPersistence);
