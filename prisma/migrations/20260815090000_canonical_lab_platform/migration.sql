-- Canonical Lab Platform foundation (Lab Manifest v1).
-- This migration is additive except for replacing the global LabScenario.slug
-- uniqueness rule with a lab-scoped uniqueness rule.

CREATE TYPE "LabInputSourceKind" AS ENUM ('INLINE', 'EXTERNAL', 'ARTIFACT_REFERENCE');

ALTER TABLE "Lab"
  ADD COLUMN "manifestVersion" TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "normalizedState" JSONB;

CREATE TABLE "LabInput" (
  "id" TEXT NOT NULL,
  "labId" TEXT NOT NULL,
  "inputKey" TEXT NOT NULL,
  "inputType" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "sourceKind" "LabInputSourceKind" NOT NULL,
  "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
  "payload" JSONB,
  "externalUrl" TEXT,
  "artifactId" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabInput_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabRunbookStep" (
  "id" TEXT NOT NULL,
  "labId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "command" TEXT,
  "expectedObservation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabRunbookStep_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "LabScenario_slug_key";

CREATE UNIQUE INDEX "LabScenario_labId_slug_key" ON "LabScenario"("labId", "slug");
CREATE INDEX "LabScenario_labId_order_idx" ON "LabScenario"("labId", "order");
CREATE INDEX "Lab_projectId_status_idx" ON "Lab"("projectId", "status");
CREATE UNIQUE INDEX "LabInput_labId_inputKey_key" ON "LabInput"("labId", "inputKey");
CREATE INDEX "LabInput_labId_sortOrder_idx" ON "LabInput"("labId", "sortOrder");
CREATE INDEX "LabInput_artifactId_idx" ON "LabInput"("artifactId");
CREATE UNIQUE INDEX "LabRunbookStep_labId_order_key" ON "LabRunbookStep"("labId", "order");

ALTER TABLE "LabInput"
  ADD CONSTRAINT "LabInput_labId_fkey"
  FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LabInput"
  ADD CONSTRAINT "LabInput_artifactId_fkey"
  FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LabRunbookStep"
  ADD CONSTRAINT "LabRunbookStep_labId_fkey"
  FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
