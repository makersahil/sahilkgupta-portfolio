import { Router } from 'express';
import { dbService } from '../services/db.service.js';

const router = Router();

router.get('/blueprint', async (req, res) => {
  const metrics = dbService.getSystemMetrics();

  res.json({
    success: true,
    data: {
      systemName: 'Sahil K Gupta Infrastructure Portfolio & Enterprise CMS',
      version: '2.4.0',
      stack: {
        frontend: 'React 19, TypeScript, Tailwind CSS, Motion (Framer Motion v12), Lucide Icons',
        backend: 'Node.js, Express 4, TypeScript/tsx, esbuild',
        database: 'PostgreSQL with Prisma ORM 7.x (migrations & relational constraints)',
        authentication: 'Signed session JWT via HttpOnly, SameSite=Lax cookie with revocable PostgreSQL AuthSession validation; Bearer fallback for non-browser clients',
        networking: 'Cisco-oriented topology explorer with representative packet/topology simulation',
        sysadmin: 'RHEL systems workspace with representative CLI/system investigation surfaces',
        devops: 'GitOps/Kubernetes/Terraform delivery workspace with representative runtime views',
      },
      layers: [
        {
          name: 'Presentation Layer (Frontend Client)',
          description: 'Zero-reload SPA powered by React 19, dynamic category portfolio switcher, terminal emulator, Cisco visualizer, and restricted CMS portal.',
        },
        {
          name: 'Security & Gateway Layer',
          description: 'Express session authentication with persisted user/session validation, role guards, HttpOnly cookie handling, and process-local failed-login throttling.',
        },
        {
          name: 'Controller & Route Layer',
          description: 'Modular Express routers mapping HTTP endpoints to business domain services, including /api/labs for canonical lab configuration and Lab Manifest v1 delivery.',
        },
        {
          name: 'Domain Service Layer',
          description: 'Encapsulates content, authentication, and canonical lab business rules. LabService validates project/domain ownership, standardized inputs, topology, scenarios, runbooks, and evidence; domain simulation engines remain planned for later phases.',
        },
        {
          name: 'Persistence & Data Layer',
          description: 'Prisma ORM over PostgreSQL with indexed relational models for content/authentication plus Projects, Labs, LabInputs, topology nodes/links, scenarios, lab runbooks, evidence, and artifact metadata.',
        },
      ],
      metrics,
    },
  });
});

export default router;
