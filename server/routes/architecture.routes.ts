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
      runtimeStage: 'Phase 3A dynamic Networking Engine',
      stack: {
        frontend: 'React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons',
        backend: 'Node.js, Express 4, TypeScript/tsx, esbuild',
        database: 'PostgreSQL with Prisma ORM 7.x',
        authentication: 'Signed session JWT in HttpOnly SameSite=Lax cookie with revocable PostgreSQL AuthSession validation; Bearer fallback for non-browser clients',
        networking: 'Persisted multi-project Networking Lab engine with canonical topology, device/interface/configuration inspection, control-plane snapshots, and deterministic topology reachability; protocol-aware operations follow in Phase 3B',
        sysadmin: 'Representative RHEL systems workspace; dynamic Linux systems engine is planned for Phase 4',
        devops: 'Representative GitOps/Kubernetes/Terraform workspace; dynamic DevOps engine is planned for Phase 5',
      },
      layers: [
        {
          name: 'Presentation Layer',
          description: 'React SPA with domain workspaces, restricted Admin CMS, canonical Lab Builder, a persisted dynamic Networking Control Plane, and explicit representative-vs-persisted UX boundaries.',
        },
        {
          name: 'Security & Gateway Layer',
          description: 'Express session authentication with persisted user/session validation, role guards, HttpOnly cookie handling, and process-local failed-login throttling.',
        },
        {
          name: 'Controller & Route Layer',
          description: 'Modular Express routers mapped to application services for content, authentication, labs, Admin audit, artifacts, and system metadata.',
        },
        {
          name: 'Domain Service Layer',
          description: 'Content, authentication, canonical Lab Manifest v1, dynamic Networking Lab adaptation/inspection, Admin orchestration, media-reference validation, and truthful runtime-metrics services.',
        },
        {
          name: 'Persistence Layer',
          description: 'Prisma repositories over PostgreSQL. Legacy in-memory runtime persistence has been retired; database outages fail closed instead of falling back to mock state.',
        },
      ],
      metrics,
    },
  });
}));

export default router;
