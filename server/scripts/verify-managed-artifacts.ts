import 'dotenv/config';

import { artifactRepository } from '../repositories/prisma/artifact.repository.js';
import { managedArtifactStorage } from '../services/media/managed-artifact-storage.js';
import { disconnectPersistence } from '../lib/prisma.js';

async function main(): Promise<void> {
  const artifacts = await artifactRepository.findMany({ storageProvider: 'LOCAL_MANAGED' });
  let failures = 0;
  for (const artifact of artifacts) {
    if (!artifact.sha256) {
      failures += 1;
      console.error(`${artifact.id}: missing recorded SHA-256`);
      continue;
    }
    const result = await managedArtifactStorage.verify(artifact.storageKey, artifact.sha256, artifact.sizeBytes).catch(() => null);
    if (!result?.valid) {
      failures += 1;
      console.error(`${artifact.id}: integrity verification failed`);
    }
  }
  if (failures > 0) throw new Error(`${failures} managed artifact(s) failed integrity verification`);
  console.log(`Managed artifact integrity audit: PASS (${artifacts.length} artifact(s))`);
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; })
  .finally(() => disconnectPersistence());
