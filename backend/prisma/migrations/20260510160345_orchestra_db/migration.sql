-- AlterTable
ALTER TABLE "TaskBranchSync" ADD COLUMN     "targetBranch" TEXT NOT NULL DEFAULT 'main';
