# Phase 7 — Session-Scoped Scenario Engine Validation Runbook

## Goal

Validate that a visitor can run, inspect, verify, remediate, verify recovery, and reset a supported Lab scenario while canonical `Lab.normalizedState` remains unchanged and no infrastructure command is executed.

## Automated exit gate

After applying the Phase 7 package and preserving your local `.env`:

```bash
npm ci
npm run db:deploy
npm run db:check
npm run test:scenarios:static
npm run test:scenarios
npm run test:scenarios:http
npm run test:cli:static
npm run test:cli
npm run test:cli:http
npm run verify
```

`npm run db:deploy` applies the new immutable Phase 7 migration that creates `LabScenarioRuntime`.

## Browser validation

### Networking

1. Open the Networking Lab.
2. Run **Primary ISP Failover**.
3. Confirm the topology/operations view reflects the primary carrier link as down for the current browser session.
4. Open the terminal in the same browser session and run:

```text
scenario status
show health
scenario verify
```

5. Confirm active-scenario verification reports PASS for the recorded-state scenario condition.
6. Run:

```text
scenario remediate
show health
scenario verify
scenario reset
```

7. Confirm remediation returns reads to the canonical baseline and recovery verification passes.

### Session isolation

1. Start a scenario in the normal browser session.
2. Refresh the page. The scenario runtime should still be selected because the opaque session identifier is stored in `sessionStorage`.
3. Open a separate incognito/private browser session. It should see the canonical baseline and no runtime from the first session.

### Linux

Run **systemd Service Failure** and confirm the selected service is degraded only in the current session. Verify, remediate, verify recovery, and reset.

### DevOps

Run **CI/CD Pipeline Failure** and confirm the recorded `stage-3` build stage becomes `FAILED` only in the current session. Verify, remediate, verify recovery, and reset.

## Database truthfulness check

Optionally inspect PostgreSQL with:

```bash
npx prisma studio
```

Confirm:

- `LabScenarioRuntime` contains the session runtime while a scenario is in use.
- `Lab.normalizedState` is unchanged by scenario lifecycle operations.
- Reset removes the runtime row for that browser session + Lab.

## Safety checks

Phase 7 must not:

- execute shell commands
- SSH to a host/device
- send packets
- invoke IOS tooling
- run `systemctl` mutations
- run `kubectl`, Terraform, Helm, ArgoCD, Cilium, or cloud provider commands
- accept arbitrary client-supplied mutation objects
- write the simulated scenario overlay into canonical `Lab.normalizedState`

## Exit decision

Treat Phase 7 as complete only when the canonical `npm run verify` passes from step 1 through step 45 after the closeout patch and the browser/session-isolation checks above pass. If any item fails, keep the Phase 7 branch open and capture the exact command output before changing scope.
