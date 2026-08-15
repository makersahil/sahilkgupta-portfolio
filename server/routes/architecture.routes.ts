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
          description: 'Modular Express routers mapping HTTP endpoints to business domain services (/api/auth, /api/categories, /api/projects, /api/blogs, /api/certifications, /api/skills, /api/terminal, /api/network).',
        },
        {
          name: 'Domain Service Layer',
          description: 'Encapsulates content/authentication business rules, payload validation, and current representative terminal/network simulation behavior.',
        },
        {
          name: 'Persistence & Data Layer',
          description: 'Prisma ORM over PostgreSQL with indexed relational models: Users, Categories, Projects, BlogPosts, Certifications, Skills, MediaAssets, AuditLogs, and Inquiries.',
        },
      ],
      metrics,
    },
  });
});

export default router;
