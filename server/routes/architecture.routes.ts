import { Router } from 'express';

import { asyncHandler } from '../middlewares/async-handler.js';
import { systemMetricsService } from '../services/system/system-metrics.service.js';

const router = Router();

router.get('/blueprint', asyncHandler(async (_request, response) => {
  const metrics = await systemMetricsService.getPortfolioRuntimeMetrics();

  response.json({
    success: true,
    data: {
      systemName: 'Sahil K Gupta Infrastructure Portfolio & Enterprise CMS',
      runtimeStage: 'Phase 9 production-hardening candidate',
      stack: {
        frontend: 'React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons',
        backend: 'Node.js, Express 4, TypeScript, Vite and esbuild',
        database: 'PostgreSQL/Neon with Prisma ORM 7 and the pg driver adapter',
        authentication: 'HttpOnly signed session cookie backed by revocable PostgreSQL AuthSession records; persisted roles are rechecked on protected requests',
        security: 'Exact host/origin policy, HTTPS enforcement, signed double-submit CSRF, security headers, bounded request bodies, request IDs, redacted structured logs and PostgreSQL-backed rate limits',
        artifacts: 'Private content-addressed managed byte storage with server-calculated SHA-256 plus explicitly labeled external/S3 reference metadata',
        operations: 'Separate liveness/readiness, bounded dependency checks, HTTP timeouts, graceful shutdown, deployment smoke tests and backup/restore runbooks',
        networking: 'Persisted multi-project Networking Lab engine with recorded topology, control-plane inspection, operations reasoning, CLI context and session-scoped scenarios',
        sysadmin: 'Persisted RHEL 9.4 recorded-state engine with services, storage, SELinux, networking, logs, CLI context and session-scoped scenarios',
        devops: 'Persisted delivery-state engine for repositories, CI/CD, Terraform, Kubernetes, GitOps, Helm, policy observations, CLI context and session-scoped scenarios',
      },
      layers: [
        {
          name: 'Presentation Layer',
          description: 'React SPA with public domain workspaces and one authenticated Portfolio Orchestrator for data-driven Projects and Labs.',
        },
        {
          name: 'Security & Gateway Layer',
          description: 'Trusted-proxy-aware HTTPS/host/origin enforcement, signed CSRF protection, secure headers, persistent authorization, shared throttling and safe request logging.',
        },
        {
          name: 'Controller & Route Layer',
          description: 'Modular Express routers created by one testable application factory, with consistent error envelopes and request identifiers.',
        },
        {
          name: 'Domain Service Layer',
          description: 'Canonical content, Lab Manifest v1, Networking/Linux/DevOps engines, Unified CLI, Scenario Runtime, Portfolio Orchestrator and managed artifact services.',
        },
        {
          name: 'Persistence & Managed Storage Layer',
          description: 'Prisma repositories over PostgreSQL plus private content-addressed artifact storage. Database or required storage outages fail readiness closed; there is no mock fallback.',
        },
      ],
      metrics,
    },
  });
}));

export default router;
