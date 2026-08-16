-- Phase 7: session-scoped mutable scenario runtime.
-- Canonical Lab state remains immutable; active simulations are persisted as
-- per-browser-session overlays keyed by sessionKey + labId.

CREATE TYPE "ScenarioRuntimeStatus" AS ENUM ('ACTIVE', 'REMEDIATED', 'VERIFIED');

CREATE TABLE "LabScenarioRuntime" (
  "id" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "labId" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "status" "ScenarioRuntimeStatus" NOT NULL DEFAULT 'ACTIVE',
  "appliedActions" JSONB,
  "verification" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "remediatedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabScenarioRuntime_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LabScenarioRuntime_sessionKey_labId_key"
  ON "LabScenarioRuntime"("sessionKey", "labId");
CREATE INDEX "LabScenarioRuntime_labId_status_idx"
  ON "LabScenarioRuntime"("labId", "status");
CREATE INDEX "LabScenarioRuntime_sessionKey_updatedAt_idx"
  ON "LabScenarioRuntime"("sessionKey", "updatedAt");
CREATE INDEX "LabScenarioRuntime_scenarioId_idx"
  ON "LabScenarioRuntime"("scenarioId");

ALTER TABLE "LabScenarioRuntime"
  ADD CONSTRAINT "LabScenarioRuntime_labId_fkey"
  FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LabScenarioRuntime"
  ADD CONSTRAINT "LabScenarioRuntime_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "LabScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
