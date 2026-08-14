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
        backend: 'Node.js 22 LTS, Express.js (Layered Clean Architecture), Tsx / esbuild',
        database: 'PostgreSQL 16 with Prisma ORM 5.x (Type-safe migrations & relational constraints)',
        authentication: 'Stateless JWT (HMAC-SHA256) via HttpOnly, SameSite=Lax Cookies & Bearer fallback',
        networking: 'Cisco Packet Tracer simulation engine, BGP/OSPF route state parser',
        sysadmin: 'Sandboxed Linux RHCSA CLI execution engine (Systemd, SELinux, Stratis, VDO)',
        devops: 'GitOps CI/CD Matrix, Cilium eBPF CNI, Docker container optimization, Terraform IaC',
      },
      layers: [
        {
          name: 'Presentation Layer (Frontend Client)',
          description: 'Zero-reload SPA powered by React 19, dynamic category portfolio switcher, terminal emulator, Cisco visualizer, and restricted CMS portal.',
        },
        {
          name: 'Security & Gateway Layer',
          description: 'Express JWT authentication middleware, HttpOnly cookie validation, rate limiting, and CORS/CSRF protection.',
        },
        {
          name: 'Controller & Route Layer',
          description: 'Modular Express routers mapping HTTP endpoints to business domain services (/api/auth, /api/categories, /api/projects, /api/blogs, /api/certifications, /api/skills, /api/terminal, /api/network).',
        },
        {
          name: 'Domain Service Layer',
          description: 'Encapsulates business rules, terminal sandboxing, packet hopping algorithms, audit logging, and payload validation.',
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
