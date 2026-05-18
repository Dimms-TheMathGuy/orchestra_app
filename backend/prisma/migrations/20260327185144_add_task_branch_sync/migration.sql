-- CreateEnum
CREATE TYPE "SyncState" AS ENUM ('LINKED', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "TaskBranchSync" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "notionTaskPageId" TEXT NOT NULL,
    "notionDatabaseId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "prNumber" INTEGER,
    "syncState" "SyncState" NOT NULL,
    "latestRepoChange" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskBranchSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskBranchSync_repoId_branchName_key" ON "TaskBranchSync"("repoId", "branchName");

-- CreateIndex
CREATE UNIQUE INDEX "TaskBranchSync_notionTaskPageId_key" ON "TaskBranchSync"("notionTaskPageId");

-- AddForeignKey
ALTER TABLE "TaskBranchSync" ADD CONSTRAINT "TaskBranchSync_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskBranchSync" ADD CONSTRAINT "TaskBranchSync_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "ProjectRepository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
