-- Phase 2B adds API-compatibility fields and relations without removing content.

-- CreateEnum
CREATE TYPE "ProjectLifecycleStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'ARCHIVED', 'PLANNED');

-- CreateEnum
CREATE TYPE "ProjectFormatType" AS ENUM ('CISCO_PKT_LAB', 'RHCSA_MATRIX', 'DEVOPS_PIPELINE', 'STANDARD');

-- AlterTable
ALTER TABLE "Category"
ADD COLUMN "tagline" TEXT NOT NULL DEFAULT '',
ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'Terminal',
ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#10b981',
ADD COLUMN "terminalTheme" TEXT NOT NULL DEFAULT 'green',
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "descriptionMarkdown" TEXT,
ADD COLUMN "lifecycleStatus" "ProjectLifecycleStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN "formatType" "ProjectFormatType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "architectureSvg" TEXT,
ADD COLUMN "liveUrl" TEXT,
ADD COLUMN "githubUrl" TEXT,
ADD COLUMN "packetTracerFile" TEXT,
ADD COLUMN "topologyConfigJson" TEXT,
ADD COLUMN "metrics" JSONB;

-- Backfill the new lifecycle dimension from the existing publication state.
-- DRAFT cannot distinguish IN_PROGRESS from PLANNED, so it maps conservatively
-- to IN_PROGRESS; all future transitions are explicit in the repository.
UPDATE "Project"
SET "lifecycleStatus" = CASE
  WHEN "status" = 'PUBLISHED' THEN 'COMPLETED'::"ProjectLifecycleStatus"
  WHEN "status" = 'DRAFT' THEN 'IN_PROGRESS'::"ProjectLifecycleStatus"
  WHEN "status" = 'ARCHIVED' THEN 'ARCHIVED'::"ProjectLifecycleStatus"
END;

-- Preserve the established compatibility format for projects that already own
-- a Phase 2A lab. Project/Lab is still one-to-one at this point in the migration.
UPDATE "Project" AS project
SET "formatType" = CASE lab."kind"
  WHEN 'NETWORK_TOPOLOGY' THEN 'CISCO_PKT_LAB'::"ProjectFormatType"
  WHEN 'LINUX_SYSTEM' THEN 'RHCSA_MATRIX'::"ProjectFormatType"
  WHEN 'DEVOPS_PIPELINE' THEN 'DEVOPS_PIPELINE'::"ProjectFormatType"
END
FROM "Lab" AS lab
WHERE lab."projectId" = project."id";

-- AlterTable
ALTER TABLE "BlogPost"
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "readTimeMinutes" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Inquiry"
ADD COLUMN "category" TEXT,
ADD COLUMN "ipAddress" TEXT;

-- Preserve real category identity for Phase 2A blogs where the existing domain
-- maps unambiguously to one of the canonical portfolio categories.
UPDATE "BlogPost" AS blog
SET "categoryId" = category."id"
FROM "Category" AS category
WHERE blog."categoryId" IS NULL
  AND (
    (blog."domain" = 'NETWORKING' AND category."slug" = 'networking') OR
    (blog."domain" = 'LINUX' AND category."slug" = 'linux') OR
    (blog."domain" = 'DEVOPS' AND category."slug" = 'devops')
  );

-- A project may own zero or many labs. Dropping this unique index preserves all
-- existing rows while removing the one-to-one restriction.
DROP INDEX "Lab_projectId_key";

-- CreateIndex
CREATE INDEX "Category_status_sortOrder_idx" ON "Category"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "Project_categoryId_sortOrder_idx" ON "Project"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "BlogPost_categoryId_idx" ON "BlogPost"("categoryId");

-- CreateIndex
CREATE INDEX "Certification_categoryId_sortOrder_idx" ON "Certification"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "Skill_categoryId_sortOrder_idx" ON "Skill"("categoryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Replace nullable-category delete behavior with restriction. This changes only
-- foreign-key actions and preserves all existing rows and category identities.
ALTER TABLE "Project" DROP CONSTRAINT "Project_categoryId_fkey";
ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Certification" DROP CONSTRAINT "Certification_categoryId_fkey";
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Skill" DROP CONSTRAINT "Skill_categoryId_fkey";
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
