-- AlterTable
ALTER TABLE "TaskBranchSync" ADD COLUMN     "inProgressValue" JSONB,
ADD COLUMN     "requireApproval" BOOLEAN NOT NULL DEFAULT false;
