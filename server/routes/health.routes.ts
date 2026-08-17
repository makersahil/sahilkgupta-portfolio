import { Router, type Response } from 'express';

import { env } from '../config/env.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { contentRepositories, type PersistenceHealth } from '../repositories/repository.factory.js';
import {
  managedArtifactStorage,
  type ArtifactStorageHealth,
} from '../services/media/managed-artifact-storage.js';

const router = Router();
const SERVICE = 'Systems Infrastructure Portfolio & CMS API';

function noStore(response: Response): void {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
}

async function bounded<T>(label: string, operation: Promise<T>, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), env.READINESS_TIMEOUT_MS);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    void label;
  }
}

router.get('/live', (_request, response) => {
  noStore(response);
  response.json({
    status: 'alive',
    service: SERVICE,
    timestamp: new Date().toISOString(),
    processUptimeSeconds: Number(process.uptime().toFixed(3)),
  });
});

const readinessHandler = asyncHandler(async (_request, response) => {
  noStore(response);
  const persistenceFallback: PersistenceHealth = { mode: 'prisma', ready: false, databaseConnected: false };
  const storageFallback: ArtifactStorageHealth = {
    ready: false,
    provider: 'LOCAL_MANAGED',
    writable: false,
    message: 'Artifact storage readiness check timed out',
  };
  const [persistence, artifactStorage] = await Promise.all([
    bounded('persistence', contentRepositories.checkHealth(), persistenceFallback),
    bounded('artifactStorage', managedArtifactStorage.checkHealth(), storageFallback),
  ]);
  const ready = persistence.ready && artifactStorage.ready;
  response.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'degraded',
    service: SERVICE,
    timestamp: new Date().toISOString(),
    dependencies: { persistence, artifactStorage },
  });
});

router.get('/ready', readinessHandler);
router.get('/health', readinessHandler);

export default router;
