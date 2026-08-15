# Sahil K Gupta — Systems & Infrastructure Portfolio

Interactive infrastructure proof-of-work portfolio with three operator workspaces:

- Networking — topology, routing, Packet Tracer-oriented investigation, and network operations
- Linux — RHEL administration, storage, systemd, SELinux, and systems troubleshooting
- DevOps — Terraform, Kubernetes, GitOps, Cilium/eBPF, delivery pipelines, and runtime operations

The existing dark cyber-terminal/control-plane visual language is intentional. Representative simulations must never be presented as measured production evidence.

## Current architecture

Phase 2B content persistence and Phase 2C persistent authentication/RBAC are exit-verified. Phase 2D-1 provides the canonical multi-project/multi-lab platform and Lab Manifest v1 API foundation. Phase 2D-1 Canonical Lab Platform and Phase 2D-2 Admin Lab Builder/Persistent Admin Core are COMPLETE and exit-verified. The next implementation target is Phase 2E — safe retirement of remaining `MockDatabaseService` runtime paths.

```text
Browser / React
  ├─ public content → Express routes → content services → repository contracts
  │                                      ├─ legacy adapters → MockDatabaseService
  │                                      └─ Prisma adapters → PostgreSQL
  │
  ├─ labs → /api/labs/* → LabService / LabManifestService → PrismaLabRepository
  │                                               → PostgreSQL Lab platform
  │
  ├─ admin auth → /api/auth/* → AuthService → PrismaAuthRepository
  │                               → PostgreSQL User + AuthSession
  │
  └─ admin orchestration → Admin CMS → authenticated content/lab APIs
                         → PostgreSQL content + Lab platform + AuditLog
```

Protected requests use a signed HttpOnly cookie whose JWT contains only user/session identity. Authorization reloads the persisted `AuthSession` and current `User` on every protected request, so role changes, revocation, expiration, and account deactivation take effect immediately. Browser auth tokens are not stored in `localStorage`.

`MockDatabaseService` still exists for explicitly deferred compatibility paths such as media, architecture metrics, Packet Tracer compatibility behavior, and the legacy content adapter. Full retirement remains Phase 2E.

The Prisma schema now implements the canonical relationship model: one Project may own multiple Labs; each Lab can own standardized LabInputs, normalized state, topology nodes/links, scenarios, LabRunbookSteps, evidence, and artifact references. Domain-specific Networking/Linux/DevOps engines remain later phases.

## Repository layout

```text
src/                                  React frontend, context, types, API client
server.ts                             Express/Vite entry point
server/routes/                        HTTP routes
server/services/content/              content application services
server/services/auth/                 persistent authentication service/bootstrap logic
server/services/labs/                 canonical lab validation, input registry, and Manifest v1 services
server/services/admin/                persisted Admin audit application service
server/repositories/contracts/        content + auth + lab + audit repository contracts
server/repositories/legacy/           legacy content adapters
server/repositories/prisma/           PostgreSQL/Prisma content, auth, and lab repositories
server/middlewares/                   persisted auth, async, and error middleware
server/security/                      login abuse controls
server/scripts/                       durable DB/content/auth/lab/admin regression, verification, and maintenance scripts
prisma/schema.prisma                  canonical persistence schema
prisma/migrations/                    immutable versioned migrations
prisma/seed.ts                        idempotent public portfolio baseline seed; no users
```

## Environment

Copy `.env.example` to `.env`. Never commit `.env` or real credentials.

For the current persisted runtime and regression path use Prisma:

```dotenv
NODE_ENV=development
PORT=3000
PERSISTENCE_MODE=prisma
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=replace-with-at-least-32-random-characters
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password-at-least-12-characters
ADMIN_DISPLAY_NAME=Sahil K Gupta
```

`ADMIN_PASSWORD` is consumed only by the explicit bootstrap command. Runtime login validates the persisted bcrypt hash, not the environment password.

## Build and database setup

```bash
npm ci
npx prisma format
npx prisma validate
npx prisma generate
npm run lint
npm run build

npm run db:deploy
npm run db:seed
npm run db:check
npm run auth:bootstrap-admin
```

The normal portfolio seed intentionally creates no administrator or other user credentials.

## Durable verification baseline

Use the consolidated verifier instead of running every regression command manually:

```bash
npm run verify
```

`verify` validates/generates Prisma, typechecks, builds, checks migration status, validates the database baseline, and runs the durable auth/content/lab/Admin regression suites including restart persistence. It stops on the first failure and prints the failing step.

For faster work:

```bash
npm run verify:quick   # schema + typecheck/build + static/API-client checks; no DB required
npm run verify:tests   # all regression suites against the configured DB; skips rebuild
```

Migration deployment and seeding remain explicit one-time operations when a phase changes schema or baseline data; routine verification never mutates migration history automatically.

Individual `test:*` scripts remain available for targeted debugging after the consolidated verifier identifies a failing area.

Optional maintenance:

```bash
npm run auth:cleanup-sessions
```

## Manual auth verification

Run:

```bash
npm start
```

Then verify:

1. `/api/health` is healthy with Prisma persistence.
2. The configured administrator can sign in through the existing Admin CMS UI.
3. Reloading the page restores the session through the HttpOnly cookie.
4. `/api/auth/me` returns the current persisted user and never a password hash.
5. Existing protected Admin content mutations still work.
6. Logout revokes the persisted session.
7. A logged-out request to a protected mutation returns 401.

## Git workflow

Git is the source of truth.

- Never work directly on `main`.
- Use a bounded phase/sub-phase branch.
- Preserve the existing cyber-terminal UI unless the phase explicitly changes it.
- Never invent evidence, metrics, hashes, URLs, credentials, or production state.
- Never edit an already-applied migration casually.
- Never silently fall back from Prisma to mock persistence in production.
- Run validation and inspect `git diff` before committing.
- Read `AGENTS.md` and `docs/DEFERRED_IMPLEMENTATION_REGISTER.md` before every phase.

Phase 2D is COMPLETE and exit-verified. The next implementation target is Phase 2E — safe retirement of the remaining `MockDatabaseService` runtime paths.
