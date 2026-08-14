import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu,
  X,
  Layers,
  Database,
  Lock,
  FolderTree,
  FileCode,
  Copy,
  Check,
  Server,
  Network,
  Sparkles,
  Terminal,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';
import { api } from '../lib/api.js';

export const ArchitectureBlueprintModal: React.FC = () => {
  const { isArchitectureModalOpen, setIsArchitectureModalOpen, showToast } = usePortfolio();
  const [activeTab, setActiveTab] = useState<'stack' | 'prisma' | 'tree' | 'jwt' | 'deploy'>('stack');
  const [blueprintData, setBlueprintData] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isArchitectureModalOpen && !blueprintData) {
      api.getBlueprint().then((data) => setBlueprintData(data));
    }
  }, [isArchitectureModalOpen, blueprintData]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isArchitectureModalOpen) return null;

  const prismaSchemaCode = `// prisma/schema.prisma - PostgreSQL Schema for Systems Portfolio & CMS
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPER_ADMIN
  ADMIN
  EDITOR
  VIEWER
}

enum ProjectStatus {
  COMPLETED
  IN_PROGRESS
  ARCHIVED
  PLANNED
}

enum InquiryStatus {
  NEW
  READ
  RESPONDED
  ARCHIVED
}

model User {
  id           String      @id @default(uuid())
  email        String      @unique
  passwordHash String
  fullName     String
  role         Role        @default(ADMIN)
  avatarUrl    String?
  bio          String?
  lastLoginAt  DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  auditLogs    SystemAuditLog[]
  mediaAssets  MediaAsset[]

  @@index([email])
}

model Category {
  id           String      @id @default(uuid())
  slug         String      @unique
  name         String
  tagline      String
  description  String
  icon         String
  accentColor  String
  terminalTheme String     // green | cyan | amber | violet
  sortOrder    Int         @default(0)
  isPublished  Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  projects       Project[]
  blogPosts      BlogPost[]
  certifications Certification[]
  skills         Skill[]

  @@index([slug])
  @@index([isPublished, sortOrder])
}

model Project {
  id                  String        @id @default(uuid())
  title               String
  slug                String        @unique
  summary             String
  descriptionMarkdown String        @db.Text
  categoryId          String
  category            Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  status              ProjectStatus @default(COMPLETED)
  isFeatured          Boolean       @default(false)
  sortOrder           Int           @default(0)
  
  coverImageUrl       String?
  architectureSvg     String?       @db.Text
  liveUrl             String?
  githubUrl           String?
  packetTracerFile    String?
  topologyConfigJson  String?       @db.Text
  devopsStack         String[]
  tags                String[]
  
  metrics             Json?
  
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@index([categoryId])
  @@index([slug])
  @@index([isFeatured, sortOrder])
}

model BlogPost {
  id                  String      @id @default(uuid())
  title               String
  slug                String      @unique
  excerpt             String
  contentMarkdown     String      @db.Text
  categoryId          String
  category            Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  coverImageUrl       String?
  readTimeMinutes     Int         @default(5)
  tags                String[]
  isPublished         Boolean     @default(true)
  publishedAt         DateTime    @default(now())
  viewCount           Int         @default(0)
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  @@index([categoryId])
  @@index([slug])
  @@index([isPublished, publishedAt])
}

model Certification {
  id                  String      @id @default(uuid())
  title               String
  code                String
  issuer              String
  credentialId        String
  verificationUrl     String?
  badgeIcon           String
  issueDate           DateTime
  expiryDate          DateTime?
  categoryId          String
  category            Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  skillsValidated     String[]
  syllabusBreakdown   Json?
  isFeatured          Boolean     @default(true)
  sortOrder           Int         @default(0)
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  @@index([categoryId])
}

model Skill {
  id                  String      @id @default(uuid())
  name                String
  level               String
  proficiencyPercent  Int
  yearsOfExperience   Float
  categoryId          String
  category            Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  iconName            String?
  terminalSnippet     String?
  sortOrder           Int         @default(0)
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  @@index([categoryId])
}

model MediaAsset {
  id           String      @id @default(uuid())
  filename     String
  originalName String
  mimeType     String
  sizeBytes    Int
  url          String
  s3Key        String?
  uploaderId   String?
  uploader     User?       @relation(fields: [uploaderId], references: [id], onDelete: SetNull)
  
  createdAt    DateTime    @default(now())

  @@index([uploaderId])
}

model SystemAuditLog {
  id           String      @id @default(uuid())
  action       String
  entity       String
  entityId     String?
  adminEmail   String
  ipAddress    String?
  userAgent    String?
  details      Json?
  userId       String?
  user         User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  timestamp    DateTime    @default(now())

  @@index([userId])
  @@index([action])
  @@index([timestamp])
}

model ContactInquiry {
  id           String        @id @default(uuid())
  name         String
  email        String
  subject      String
  message      String        @db.Text
  category     String?
  status       InquiryStatus @default(NEW)
  ipAddress    String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([status])
}`;

  const directoryTreeCode = `infra-portfolio-cms/
├── prisma/
│   └── schema.prisma                 # Complete PostgreSQL relational schema & indexes
├── server/
│   ├── middlewares/
│   │   ├── auth.middleware.ts        # JWT verification (HttpOnly cookie & Bearer header)
│   │   └── error.middleware.ts       # Global error boundary & formatted JSON exceptions
│   ├── routes/
│   │   ├── auth.routes.ts            # /api/auth/login, /api/auth/me, /api/auth/logout
│   │   ├── categories.routes.ts      # Multi-tenant dynamic portfolio categories CRUD
│   │   ├── projects.routes.ts        # Projects CRUD with Packet Tracer metadata & stack
│   │   ├── blogs.routes.ts           # Markdown engineering blog CRUD & view counter
│   │   ├── certifications.routes.ts  # RHCSA/CCNA credentials & domain syllabus breakdown
│   │   ├── skills.routes.ts          # Technical competency matrix with mapped CLI commands
│   │   ├── media.routes.ts           # S3 / disk asset upload pipeline
│   │   ├── terminal.routes.ts        # Sandboxed RHCSA/CCNA/DevOps CLI execution engine
│   │   ├── network.routes.ts         # Cisco Packet Tracer topology & packet hop simulation
│   │   ├── contact.routes.ts         # Contact form ingestion & inquiry status manager
│   │   └── architecture.routes.ts    # System blueprint & telemetry metadata endpoint
│   ├── services/
│   │   └── db.service.ts             # Clean data layer with transactional mutations
│   └── types/
│       └── index.ts                  # Server-side TypeScript interfaces & enums
├── src/
│   ├── components/
│   │   ├── AdminCMS/
│   │   │   └── AdminModal.tsx        # Restricted CMS portal with full CRUD & audit log
│   │   ├── ArchitectureBlueprintModal.tsx  # Interactive Architecture Explorer
│   │   ├── CertificationMatrix.tsx   # Verified badges & syllabus radar
│   │   ├── CiscoTopologyVisualizer.tsx # Cisco Packet Tracer interactive canvas & hops
│   │   ├── ContactSection.tsx        # Terminal-styled contact form & PGP fingerprint
│   │   ├── DevOpsPipelineVisualizer.tsx # CI/CD GitOps matrix & K8s pod board
│   │   ├── Footer.tsx                # System health telemetry & active category
│   │   ├── HeroSection.tsx           # Cyber-industrial hero with live CLI preview
│   │   ├── Navbar.tsx                # Category switcher tabs & terminal quick launcher
│   │   ├── ProjectsShowcase.tsx      # Projects grid with deep-dive modal
│   │   ├── TechnicalBlog.tsx         # Markdown engineering blog with syntax highlighting
│   │   ├── TerminalEmulator.tsx      # Interactive Linux RHCSA terminal emulator
│   │   └── ToastContainer.tsx        # Floating notification stack
│   ├── context/
│   │   └── PortfolioContext.tsx      # Central reactive state & JWT auth provider
│   ├── lib/
│   │   └── api.ts                    # Centralized client-side fetch client
│   ├── types.ts                      # Client TypeScript interfaces
│   ├── App.tsx                       # Main portfolio composition
│   ├── index.css                     # Dark-mode terminal typography & Tailwind styles
│   └── main.tsx                      # React 19 StrictMode entry point
├── server.ts                         # Express applet server with Vite middleware
├── package.json                      # Full-stack dependencies & esbuild scripts
├── tsconfig.json
└── vite.config.ts`;

  const jwtMiddlewareCode = `// server/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Extract token from HttpOnly cookie first, with Bearer header fallback
  const tokenFromHeader = req.headers['authorization']?.startsWith('Bearer ')
    ? req.headers['authorization'].split(' ')[1]
    : null;
  const tokenFromCookie = req.cookies?.['nexus_auth_token'];
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    res.status(401).json({ success: false, message: 'Access denied: No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
      return;
    }
    next();
  };
}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="w-full max-w-5xl rounded-2xl bg-[#111114] border border-white/15 shadow-2xl overflow-hidden font-sans my-6 flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#1a1a1e] border-b border-white/10 font-mono">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-black border border-white/10 text-[#00d4ff]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm sm:text-base uppercase tracking-tight">
                    TARGET PRODUCTION ARCHITECTURE
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30 uppercase font-mono font-bold">
                    PLANNED BLUEPRINT
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Target backend, persistence, security and deployment architecture for the production portfolio.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsArchitectureModalOpen(false)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 bg-[#16161a] border-b border-white/10 flex items-center space-x-2 overflow-x-auto no-scrollbar font-mono text-xs pt-2">
            <button
              onClick={() => setActiveTab('stack')}
              className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'stack'
                  ? 'border-[#00d4ff] text-[#00d4ff]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Layered Architecture</span>
            </button>
            <button
              onClick={() => setActiveTab('prisma')}
              className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'prisma'
                  ? 'border-[#00d4ff] text-[#00d4ff]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>PostgreSQL Prisma Schema</span>
            </button>
            <button
              onClick={() => setActiveTab('tree')}
              className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'tree'
                  ? 'border-[#00d4ff] text-[#00d4ff]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Directory Structure</span>
            </button>
            <button
              onClick={() => setActiveTab('jwt')}
              className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'jwt'
                  ? 'border-[#00d4ff] text-[#00d4ff]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>JWT &amp; RBAC Security</span>
            </button>
            <button
              onClick={() => setActiveTab('deploy')}
              className={`flex items-center space-x-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'deploy'
                  ? 'border-[#00d4ff] text-[#00d4ff]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Deployment &amp; S3 Pipeline</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 font-mono text-xs">
            {/* Tab 1: Architecture Layers */}
            {activeTab === 'stack' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
                    <span className="text-[11px] text-[#00d4ff] font-bold uppercase tracking-wider">
                      Presentation Layer (React 19 SPA)
                    </span>
                    <p className="text-white/70 text-xs font-sans leading-relaxed">
                      Zero page-reload client architecture with Motion layout animations, interactive Cisco Packet Tracer simulation canvas, xterm-style RHCSA terminal emulator, and restricted CMS portal.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
                    <span className="text-[11px] text-[#00ff41] font-bold uppercase tracking-wider">
                      API Gateway &amp; Middleware Layer
                    </span>
                    <p className="text-white/70 text-xs font-sans leading-relaxed">
                      Stateless JWT verification via HttpOnly SameSite cookies, RBAC route guards, JSON body parsers, audit log interceptor, and global error boundaries.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
                    <span className="text-[11px] text-[#00d4ff] font-bold uppercase tracking-wider">
                      Domain Service Layer
                    </span>
                    <p className="text-white/70 text-xs font-sans leading-relaxed">
                      Encapsulates core business logic: dynamic multi-tenant category switching, sandboxed Linux CLI parser, Cisco OSPF/BGP hop simulator, and media asset pipelines.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
                    <span className="text-[11px] text-yellow-400 font-bold uppercase tracking-wider">
                      Persistence &amp; PostgreSQL Layer
                    </span>
                    <p className="text-white/70 text-xs font-sans leading-relaxed">
                      PostgreSQL 16 with Prisma ORM 5.x ensuring strict relational foreign key cascades, unique slug constraints, JSON payload storage, and index optimization.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-black border border-white/10 space-y-3 font-mono">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                    <Sparkles className="w-4 h-4 text-[#00d4ff]" />
                    Multi-Category &amp; Multi-Tenant Engine Design
                  </h4>
                  <p className="text-xs text-white/60 font-sans leading-relaxed">
                    The platform decouples portfolio presentation from hardcoded UI views by introducing a first-class <code className="text-[#00d4ff]">Category</code> entity in PostgreSQL. When an administrator creates or toggles a category (e.g. &ldquo;Networking&rdquo;, &ldquo;Linux&rdquo;, &ldquo;DevOps&rdquo;), all associated projects, blog articles, certifications, and skills adapt reactively without touching any frontend code.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Prisma Schema */}
            {activeTab === 'prisma' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 font-semibold">prisma/schema.prisma (PostgreSQL Engine)</span>
                  <button
                    onClick={() => copyToClipboard(prismaSchemaCode, 'prisma')}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-black hover:bg-white/10 text-white/90 border border-white/10 uppercase tracking-wider text-[11px] transition-colors"
                  >
                    {copiedCode === 'prisma' ? <Check className="w-3.5 h-3.5 text-[#00ff41]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'prisma' ? 'Copied' : 'Copy Schema'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black border border-white/10 text-[#00ff41] leading-relaxed overflow-x-auto text-[11px] max-h-[55vh]">
                  {prismaSchemaCode}
                </pre>
              </div>
            )}

            {/* Tab 3: Directory Tree */}
            {activeTab === 'tree' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 font-semibold">Complete Clean Architecture Directory Layout</span>
                  <button
                    onClick={() => copyToClipboard(directoryTreeCode, 'tree')}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-black hover:bg-white/10 text-white/90 border border-white/10 uppercase tracking-wider text-[11px] transition-colors"
                  >
                    {copiedCode === 'tree' ? <Check className="w-3.5 h-3.5 text-[#00ff41]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'tree' ? 'Copied' : 'Copy Tree'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black border border-white/10 text-[#00d4ff] leading-relaxed overflow-x-auto text-[11px] max-h-[55vh]">
                  {directoryTreeCode}
                </pre>
              </div>
            )}

            {/* Tab 4: JWT Security */}
            {activeTab === 'jwt' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 font-semibold">server/middlewares/auth.middleware.ts</span>
                  <button
                    onClick={() => copyToClipboard(jwtMiddlewareCode, 'jwt')}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-black hover:bg-white/10 text-white/90 border border-white/10 uppercase tracking-wider text-[11px] transition-colors"
                  >
                    {copiedCode === 'jwt' ? <Check className="w-3.5 h-3.5 text-[#00ff41]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'jwt' ? 'Copied' : 'Copy Middleware'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black border border-white/10 text-yellow-400 leading-relaxed overflow-x-auto text-[11px]">
                  {jwtMiddlewareCode}
                </pre>

                <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2 text-xs font-sans">
                  <span className="font-mono font-bold text-white block uppercase tracking-wider text-[11px]">
                    Security Defense in Depth Features:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-white/60">
                    <li><strong className="text-white">HttpOnly &amp; SameSite=Lax Cookies</strong>: Neutralizes client-side XSS token theft.</li>
                    <li><strong className="text-white">Bcrypt Password Hashing</strong>: 10 salt rounds with constant-time verification.</li>
                    <li><strong className="text-white">Role-Based Access Control (RBAC)</strong>: Multi-tier authorization (SUPER_ADMIN, ADMIN, EDITOR, VIEWER).</li>
                    <li><strong className="text-white">Structured System Audit Logs</strong>: Captures IP, User-Agent, entity mutations, and timestamps.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 5: Deployment Strategy */}
            {activeTab === 'deploy' && (
              <div className="space-y-4 font-sans text-xs">
                <div className="p-4 rounded-xl bg-black border border-white/10 space-y-3 font-mono">
                  <span className="text-[#00d4ff] font-bold text-sm block uppercase tracking-wider">
                    Production Container &amp; Database Deployment Steps
                  </span>
                  <ol className="list-decimal list-inside space-y-2 text-white/70 leading-relaxed">
                    <li>
                      <strong className="text-white">Database Migration</strong>: Execute <code className="text-[#00ff41]">npx prisma migrate deploy</code> to apply all PostgreSQL indexes and foreign keys.
                    </li>
                    <li>
                      <strong className="text-white">Admin User Seeding</strong>: Run <code className="text-[#00ff41]">npx prisma db seed</code> to create default Super Admin credentials with bcrypt salt.
                    </li>
                    <li>
                      <strong className="text-white">Production Build</strong>: Run <code className="text-[#00ff41]">npm run build</code> to compile the React 19 frontend into static assets and bundle the Express server into <code className="text-[#00ff41]">dist/server.cjs</code>.
                    </li>
                    <li>
                      <strong className="text-white">Media Pipeline Configuration</strong>: Wire AWS S3 bucket keys or Cloudinary environment secrets to the media controller.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
