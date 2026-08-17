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
      api
        .getBlueprint()
        .then((data) => setBlueprintData(data))
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'Failed to load architecture blueprint';
          showToast(message, 'error');
        });
    }
  }, [isArchitectureModalOpen, blueprintData, showToast]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isArchitectureModalOpen) return null;

  const prismaSchemaCode = `// Current persistence architecture excerpt
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  displayName  String
  passwordHash String?
  role         UserRole      @default(ADMIN)
  isActive     Boolean       @default(true)
  authSessions AuthSession[]
  auditLogs    AuditLog[]
}

model Project {
  id                  String   @id @default(cuid())
  slug                String   @unique
  domain              Domain
  mission             String?
  architectureSummary String?
  whatIBuilt           String?
  labs                Lab[]
  artifacts           Artifact[]
}

model Lab {
  id              String            @id @default(cuid())
  projectId       String?
  manifestVersion String            @default("1.0")
  normalizedState Json?
  inputs          LabInput[]
  nodes           LabNode[]
  links           LabLink[]
  scenarios       LabScenario[]
  runbookSteps    LabRunbookStep[]
  evidence        Evidence[]
}

model Artifact {
  id              String   @id @default(cuid())
  fileName        String
  mimeType        String
  storageProvider String
  storageKey      String
  sizeBytes       Int
  sha256          String?
  publicUrl       String?
  isPublic        Boolean  @default(true)
}

// PostgreSQL/Prisma is the only supported runtime persistence path.
// Phase 9 managed storage keeps bytes private and content-addressed, with server-calculated SHA-256 integrity metadata.`;

  const directoryTreeCode = `infra-portfolio-cms/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── server/
│   ├── middlewares/              # auth, CSRF/rate-limit, request context, errors
│   ├── repositories/
│   │   ├── contracts/            # content/auth/lab/audit/artifact/system contracts
│   │   └── prisma/               # PostgreSQL implementations
│   ├── routes/                   # HTTP controllers
│   ├── services/
│   │   ├── auth/
│   │   ├── content/
│   │   ├── labs/
│   │   ├── networking/          # canonical Networking adapter/service
│   │   ├── admin/
│   │   ├── media/
│   │   └── system/
│   ├── security/                 # host/origin policy, signed CSRF, shared rate limits
│   └── scripts/                  # durable verification/regression tools
├── src/
│   ├── components/
│   │   ├── AdminCMS/             # persistent Admin + Lab Builder
│   │   └── networking/           # dynamic Networking explorer/inspectors
│   ├── context/
│   ├── lib/api.ts
│   └── types.ts
├── docs/
│   ├── LAB_PLATFORM_ARCHITECTURE.md
│   ├── NETWORKING_ENGINE_ARCHITECTURE.md
│   ├── ADMIN_ORCHESTRATOR.md
│   ├── AUTHENTICATION_RUNBOOK.md
│   └── PERSISTENCE_ARCHITECTURE.md
└── server.ts

No runtime MockDatabaseService or legacy repository adapter remains.`;

  const jwtMiddlewareCode = `// Current authentication flow (abridged)
Browser HttpOnly cookie
  -> verify signed session JWT (user id + session id only)
  -> load AuthSession from PostgreSQL
  -> load current persisted User
  -> reject revoked/expired sessions or inactive users
  -> populate request role from the database
  -> requireRole('SUPER_ADMIN', 'ADMIN')

The browser does not persist the auth token in localStorage.
Role changes and account deactivation take effect on the next protected request.`;

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
                    SYSTEM ARCHITECTURE BLUEPRINT
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30 uppercase font-mono font-bold">
                    CURRENT + PLANNED
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Implemented runtime architecture plus clearly identified future domain-engine and deployment targets.
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
              <span>Session &amp; RBAC Security</span>
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
              <span>Deployment &amp; Artifact Storage</span>
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
                      React SPA with domain workspaces, representative infrastructure visualizers, contextual operator surfaces, and a restricted persistent Admin CMS.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
                    <span className="text-[11px] text-[#00ff41] font-bold uppercase tracking-wider">
                      API Gateway &amp; Middleware Layer
                    </span>
                    <p className="text-white/70 text-xs font-sans leading-relaxed">
                      Signed session-JWT validation via HttpOnly SameSite cookies, persisted AuthSession/user checks, RBAC route guards, JSON body parsing, and global API error handling.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
                    <span className="text-[11px] text-[#00d4ff] font-bold uppercase tracking-wider">
                      Domain Service Layer
                    </span>
                    <p className="text-white/70 text-xs font-sans leading-relaxed">
                      Encapsulates content, persisted authentication, canonical Lab Manifest v1, Admin orchestration, artifact-reference validation, and representative domain simulations pending the later stateful engines.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
                    <span className="text-[11px] text-yellow-400 font-bold uppercase tracking-wider">
                      Persistence &amp; PostgreSQL Layer
                    </span>
                    <p className="text-white/70 text-xs font-sans leading-relaxed">
                      PostgreSQL with Prisma ORM 7.x providing relational constraints, unique slug enforcement, JSON-backed compatibility fields, and indexed persistence.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-black border border-white/10 space-y-3 font-mono">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                    <Sparkles className="w-4 h-4 text-[#00d4ff]" />
                    Data-Driven Multi-Domain Portfolio Design
                  </h4>
                  <p className="text-xs text-white/60 font-sans leading-relaxed">
                    The platform persists Categories, Projects, Labs, standardized inputs, scenarios, runbooks, evidence metadata, skills, certifications, and audit events in PostgreSQL. Domain engines are designed to consume canonical Lab state instead of adding one-off project components.
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

            {/* Tab 4: Session Security */}
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
                    <li><strong className="text-white">HttpOnly &amp; SameSite=Lax Cookies</strong>: Keeps the session token out of browser JavaScript and reduces cross-site request exposure.</li>
                    <li><strong className="text-white">Bcrypt Password Hashing</strong>: Persistent password hashes with 12 work-factor rounds.</li>
                    <li><strong className="text-white">Role-Based Access Control (RBAC)</strong>: Persisted authorization roles (SUPER_ADMIN, ADMIN, EDITOR).</li>
                    <li><strong className="text-white">Revocable Database Sessions</strong>: Each protected request validates the persisted session and current user state.</li>
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
                      <strong className="text-white">Admin Bootstrap</strong>: Run <code className="text-[#00ff41]">npm run auth:bootstrap-admin</code> with explicit environment credentials. Normal portfolio seed data does not create users.
                    </li>
                    <li>
                      <strong className="text-white">Production Build</strong>: Run <code className="text-[#00ff41]">npm run build</code> to compile the React 19 frontend into static assets and bundle the Express server into <code className="text-[#00ff41]">dist/server.cjs</code>.
                    </li>
                    <li>
                      <strong className="text-white">Media Pipeline Configuration</strong>: Configure a real storage provider, upload pipeline, checksums, provenance, and backups. The current media compatibility endpoint stores artifact-reference metadata only.
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
