# Sahil K Gupta — Systems & Infrastructure Portfolio

Interactive infrastructure proof-of-work portfolio with three operator workspaces:

- Networking — topology, routing, Packet Tracer-oriented investigation, and network operations
- Linux — RHEL administration, storage, systemd, SELinux, and systems troubleshooting
- DevOps — Terraform, Kubernetes, GitOps, Cilium/eBPF, delivery pipelines, and runtime operations

The existing dark cyber-terminal/control-plane visual language is intentional. Representative simulations must never be presented as measured production evidence.

## Current architecture

Phase 2B content persistence and Phase 2C persistent authentication/RBAC are exit-verified. The next implementation target is Phase 2D — canonical multi-project/multi-lab platform and Admin core.

```text
Browser / React
  ├─ public content → Express routes → content services → repository contracts
  │                                      ├─ legacy adapters → MockDatabaseService
  │                                      └─ Prisma adapters → PostgreSQL
  │
  └─ admin auth → /api/auth/* → AuthService → PrismaAuthRepository
                                  → PostgreSQL User + AuthSession
```

Protected requests use a signed HttpOnly cookie whose JWT contains only user/session identity. Authorization reloads the persisted `AuthSession` and current `User` on every protected request, so role changes, revocation, expiration, and account deactivation take effect immediately. Browser auth tokens are not stored in `localStorage`.

`MockDatabaseService` still exists for explicitly deferred compatibility paths such as media, architecture metrics, Packet Tracer compatibility behavior, and the legacy content adapter. Full retirement remains Phase 2E.

The Prisma schema preserves the multi-project/multi-lab foundation: one Project may own multiple Labs, and later phases will standardize lab inputs, normalized state, scenarios, runbooks, evidence, and reusable domain renderers.

## Repository layout

```text
src/                                  React frontend, context, types, API client
server.ts                             Express/Vite entry point
server/routes/                        HTTP routes
server/services/content/              content application services
server/services/auth/                 persistent authentication service/bootstrap logic
server/repositories/contracts/        content + auth repository contracts
server/repositories/legacy/           legacy content adapters
server/repositories/prisma/           PostgreSQL/Prisma repositories
server/middlewares/                   persisted auth, async, and error middleware
server/security/                      login abuse controls
server/scripts/                       durable DB/content/auth regression and maintenance scripts
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

## Durable regression baseline

These names are intentionally phase-neutral so they remain useful after later phases:

```bash
npm run test:content:static
npm run test:content:legacy
npm run test:api-client
npm run test:content:http
npm run test:content:smoke
npm run test:content:prisma

npm run test:content:restart -- create
npm run test:content:restart -- verify
npm run test:content:restart -- cleanup

npm run test:auth:static
npm run test:auth
```

`test:content:http`, `test:auth`, and other Prisma-backed checks require a migrated PostgreSQL database.

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

The next implementation target is Phase 2D — canonical multi-project/multi-lab platform and Admin core.
