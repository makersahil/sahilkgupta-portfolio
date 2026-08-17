import express, { type RequestHandler } from 'express';
import path from 'node:path';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import blogsRoutes from './routes/blogs.routes.js';
import certificationsRoutes from './routes/certifications.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import mediaRoutes from './routes/media.routes.js';
import terminalRoutes from './routes/terminal.routes.js';
import networkRoutes from './routes/network.routes.js';
import linuxRoutes from './routes/linux.routes.js';
import devopsRoutes from './routes/devops.routes.js';
import contactRoutes from './routes/contact.routes.js';
import architectureRoutes from './routes/architecture.routes.js';
import labsRoutes from './routes/labs.routes.js';
import scenarioRoutes from './routes/scenario.routes.js';
import adminRoutes from './routes/admin.routes.js';
import orchestratorRoutes from './routes/orchestrator.routes.js';
import healthRoutes from './routes/health.routes.js';
import securityRoutes from './routes/security.routes.js';
import { env, type EnvironmentSnapshot } from './config/env.js';
import { NotFoundError } from './lib/errors.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { requestContext } from './middlewares/request-context.js';
import { createCsrfProtection } from './security/csrf.js';
import { createSecurityPolicy } from './security/security-policy.js';

export interface CreatePortfolioAppOptions {
  environment?: EnvironmentSnapshot;
  enforceSecurity?: boolean;
  enforceCsrf?: boolean;
  serveFrontend?: boolean;
  developmentMiddleware?: RequestHandler;
}

export function createPortfolioApp(options: CreatePortfolioAppOptions = {}) {
  const environment = options.environment ?? env;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', environment.TRUST_PROXY);

  app.use(requestContext);
  app.use(createSecurityPolicy({ environment, enforce: options.enforceSecurity }));
  app.use(cookieParser());
  app.use('/api', createCsrfProtection({
    enforce: options.enforceCsrf ?? environment.CSRF_ENFORCEMENT,
    production: environment.NODE_ENV === 'production',
  }));

  const jsonLimit = `${environment.REQUEST_BODY_LIMIT_BYTES}b`;
  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: false, limit: jsonLimit, parameterLimit: 1_000 }));

  app.use('/api', healthRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/blogs', blogsRoutes);
  app.use('/api/certifications', certificationsRoutes);
  app.use('/api/skills', skillsRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/terminal', terminalRoutes);
  app.use('/api/network', networkRoutes);
  app.use('/api/linux', linuxRoutes);
  app.use('/api/devops', devopsRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/architecture', architectureRoutes);
  app.use('/api/labs', labsRoutes);
  app.use('/api/scenarios', scenarioRoutes);
  app.use('/api/admin/orchestrator', orchestratorRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', (_request, _response, next) => next(new NotFoundError('API route not found')));

  if (options.serveFrontend !== false) {
    if (environment.NODE_ENV !== 'production' && options.developmentMiddleware) {
      app.use(options.developmentMiddleware);
    } else if (environment.NODE_ENV === 'production') {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath, {
        etag: true,
        immutable: true,
        maxAge: '1y',
        setHeaders(response, filePath) {
          if (filePath.endsWith('index.html')) {
            response.setHeader('Cache-Control', 'no-cache');
          }
        },
      }));
      app.get('*', (_request, response) => {
        response.setHeader('Cache-Control', 'no-cache');
        response.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.use(errorHandler);
  return app;
}
