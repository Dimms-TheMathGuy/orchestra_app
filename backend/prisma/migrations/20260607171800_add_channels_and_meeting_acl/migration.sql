-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('GENERAL', 'MANAGEMENT', 'TEAM');

-- AlterTable
ALTER TABLE "ProjectMessage" ADD COLUMN     "channelId" TEXT;

-- CreateTable
CREATE TABLE "ChatChannel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "team" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMeeting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "zoomMeetingId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "organizerTeam" TEXT,
    "allowedTeams" TEXT[],
    "startTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatChannel_projectId_type_team_key" ON "ChatChannel"("projectId", "type", "team");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMeeting_zoomMeetingId_key" ON "ProjectMeeting"("zoomMeetingId");

-- AddForeignKey
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChatChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatChannel" ADD CONSTRAINT "ChatChannel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMeeting" ADD CONSTRAINT "ProjectMeeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
