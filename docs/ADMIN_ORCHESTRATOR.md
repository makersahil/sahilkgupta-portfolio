# Admin Orchestrator

The Admin CMS is the authenticated control surface for persistent portfolio content and canonical lab configuration. It is operational product documentation, not a phase checklist.

## Persistent workflow

```text
Project
  -> Lab
     -> standardized Inputs
     -> normalized state / topology
     -> Scenarios
     -> Runbook
     -> Evidence
     -> Manifest preview
     -> publish when ready
```

ADMIN and SUPER_ADMIN can manage this state through authenticated APIs. The UI never claims that entering metadata uploads a real artifact or parses an arbitrary source format unless a later implementation actually provides that capability.

## Admin surfaces

- Projects, including persisted `mission`, `architectureSummary`, and `whatIBuilt` story fields.
- Lab Builder for multiple Labs per Project.
- LabInputs constrained by the domain input registry.
- Atomic topology replacement for normalized nodes and links.
- Scenario, runbook, and evidence metadata management.
- Canonical Lab Manifest v1 preview before publication.
- Blogs and Categories.
- Certification/preparation-track CRUD.
- Skill/competency CRUD.
- Inquiry status management.
- Persisted system audit log.

## Audit behavior

Admin mutations write `AuditLog` records containing the authenticated actor, action, entity type/id, request method/path, and limited request metadata. The audit UI reads these persisted records through `GET /api/admin/audit`.

Audit display rules:

- Never synthesize events or timestamps when the table is empty.
- Audit-write failure is logged server-side and does not turn an already-committed business mutation into a false client failure.
- Audit records are visible only to ADMIN/SUPER_ADMIN.
- Secrets, password hashes, session tokens, and full request bodies are not stored in audit metadata.

## Verification

The durable project verifier includes Admin orchestration checks:

```bash
npm run verify
```

For focused debugging:

```bash
npm run test:admin:static
npm run test:admin:http
```

The HTTP regression creates only `__smoke_*`/temporary fixture data and removes it in cleanup.
