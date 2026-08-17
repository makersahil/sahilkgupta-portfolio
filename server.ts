import type { Server } from 'node:http';

import { createServer as createViteServer } from 'vite';

import { createPortfolioApp } from './server/app.js';
import { env } from './server/config/env.js';
import { log } from './server/lib/logger.js';
import { disconnectPersistence } from './server/lib/prisma.js';
import { managedArtifactStorage } from './server/services/media/managed-artifact-storage.js';
import { closeHttpServer, createConfiguredHttpServer } from './server/runtime/http-server.js';

export interface StartedPortfolioServer {
  server: Server;
  close: (reason?: string) => Promise<void>;
}

export async function startServer(): Promise<StartedPortfolioServer> {
  if (env.ARTIFACT_STORAGE_ENABLED) await managedArtifactStorage.ensureReady();
  const vite = env.NODE_ENV !== 'production'
    ? await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      })
    : null;
  const app = createPortfolioApp({ developmentMiddleware: vite?.middlewares });
  const server = createConfiguredHttpServer(app, env);

  let closing: Promise<void> | null = null;
  const close = (reason = 'shutdown'): Promise<void> => {
    closing ??= (async () => {
      log('info', 'server_shutdown_started', { reason });
      await closeHttpServer(server, env.SHUTDOWN_TIMEOUT_MS);
      await vite?.close().catch(() => undefined);
      await disconnectPersistence();
      log('info', 'server_shutdown_complete', { reason });
    })();
    return closing;
  };

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(env.PORT, '0.0.0.0', () => {
      server.off('error', reject);
      resolve();
    });
  });

  log('info', 'server_started', {
    port: env.PORT,
    environment: env.NODE_ENV,
    persistence: 'prisma',
    managedArtifactStorage: env.ARTIFACT_STORAGE_ENABLED,
  });

  return { server, close };
}

startServer()
  .then(({ close }) => {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        void close(signal).finally(() => process.exit(0));
      });
    }
    process.on('uncaughtException', (error) => {
      log('error', 'uncaught_exception', { error });
      void close('uncaughtException').finally(() => process.exit(1));
    });
    process.on('unhandledRejection', (error) => {
      log('error', 'unhandled_rejection', { error });
      void close('unhandledRejection').finally(() => process.exit(1));
    });
  })
  .catch((error) => {
    log('error', 'server_boot_failed', { error });
    process.exit(1);
  });
