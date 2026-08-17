import http, { type Server } from 'node:http';

import type { Express } from 'express';

import { env, type EnvironmentSnapshot } from '../config/env.js';

export function createConfiguredHttpServer(app: Express, environment: EnvironmentSnapshot = env): Server {
  const server = http.createServer(app);
  server.requestTimeout = environment.HTTP_REQUEST_TIMEOUT_MS;
  server.headersTimeout = environment.HTTP_HEADERS_TIMEOUT_MS;
  server.keepAliveTimeout = environment.HTTP_KEEP_ALIVE_TIMEOUT_MS;
  server.maxHeadersCount = 100;
  server.maxRequestsPerSocket = 1_000;
  server.setTimeout(environment.HTTP_REQUEST_TIMEOUT_MS + 5_000, (socket) => socket.destroy());
  return server;
}

export async function closeHttpServer(server: Server, timeoutMs = env.SHUTDOWN_TIMEOUT_MS): Promise<void> {
  const forceTimer = setTimeout(() => server.closeAllConnections?.(), timeoutMs);
  forceTimer.unref();
  await new Promise<void>((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
    server.closeIdleConnections?.();
  });
  clearTimeout(forceTimer);
}
