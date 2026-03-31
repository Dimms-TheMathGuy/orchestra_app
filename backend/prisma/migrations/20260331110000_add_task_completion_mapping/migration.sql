-- Add completion mapping fields for flexible Notion task templates
ALTER TABLE "TaskBranchSync"
ADD COLUMN "completionPropertyName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "completionPropertyType" TEXT NOT NULL DEFAULT 'checkbox',
ADD COLUMN "completionValue" JSONB NOT NULL DEFAULT 'false'::jsonb;

-- Remove temporary defaults after existing rows are backfilled
ALTER TABLE "TaskBranchSync"
ALTER COLUMN "completionPropertyName" DROP DEFAULT,
ALTER COLUMN "completionPropertyType" DROP DEFAULT,
ALTER COLUMN "completionValue" DROP DEFAULT;
