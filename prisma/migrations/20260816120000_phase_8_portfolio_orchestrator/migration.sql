-- Phase 8: additive optimistic-concurrency and Lab ordering support.
ALTER TABLE "Project" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Lab" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lab" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "Project_status_lifecycleStatus_sortOrder_idx"
  ON "Project"("status", "lifecycleStatus", "sortOrder");
CREATE INDEX "Lab_projectId_status_sortOrder_idx"
  ON "Lab"("projectId", "status", "sortOrder");
