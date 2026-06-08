-- CreateTable
CREATE TABLE "NotionTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "notionPageId" TEXT NOT NULL,
    "notionDatabaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT,
    "statusGroup" TEXT NOT NULL DEFAULT 'todo',
    "assigneeEmails" TEXT[],
    "assigneeNames" TEXT[],
    "url" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotionTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotionTask_notionPageId_key" ON "NotionTask"("notionPageId");

-- CreateIndex
CREATE INDEX "NotionTask_projectId_idx" ON "NotionTask"("projectId");

-- AddForeignKey
ALTER TABLE "NotionTask" ADD CONSTRAINT "NotionTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
