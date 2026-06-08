import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncState } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const projectsRaw = await this.prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        meetings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        taskBranchSyncs: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const projects = projectsRaw.map((project) => {
      const tasks = project.taskBranchSyncs;

      const doneTasks = tasks.filter(
        (task) => task.syncState === SyncState.DONE,
      ).length;

      const progress =
        tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

      const currentMember = project.members.find(
        (member) => member.userId === userId,
      );

      const isMember = project.ownerId === userId || !!currentMember;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        progress,
        isMember,
        role: project.ownerId === userId ? 'owner' : currentMember?.role ?? null,
        leader: project.owner,
        members: project.members.map((m) => m.user),
        lastActivity:
          project.activities[0]?.createdAt ??
          project.messages[0]?.createdAt ??
          project.createdAt,
      };
    });

    const ongoingProjects = projects.filter(
      (project) => project.status === 'ongoing',
    ).length;

    const completedProjects = projects.filter(
      (project) => project.status === 'completed',
    ).length;

    const totalTasks = projectsRaw.reduce((total, project) => {
      return total + project.taskBranchSyncs.length;
    }, 0);

    const doneTasks = projectsRaw.reduce((total, project) => {
      return (
        total +
        project.taskBranchSyncs.filter(
          (task) => task.syncState === SyncState.DONE,
        ).length
      );
    }, 0);

    // Task cards reflect the user's real Notion tasks (assignee = this user),
    // pulled from the cached NotionTask snapshot. Match on email first, name as
    // fallback (Notion only exposes assignee email when the integration can read it).
    const myNotionTasks = await this.prisma.notionTask.findMany({
      where: {
        project: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        OR: [
          { assigneeEmails: { has: user.email } },
          { assigneeNames: { has: user.name } },
        ],
      },
      select: { statusGroup: true },
    });

    const completedNotionTasks = myNotionTasks.filter(
      (t) => t.statusGroup === 'done',
    ).length;
    const inProgressNotionTasks = myNotionTasks.filter(
      (t) => t.statusGroup === 'in_progress',
    ).length;
    const activeNotionTasks = myNotionTasks.filter(
      (t) => t.statusGroup !== 'done',
    ).length;

    const meetingSchedule = projectsRaw.flatMap((project) =>
      project.meetings.map((meeting) => ({
        id: meeting.id,
        projectId: project.id,
        projectName: project.name,
        title: meeting.topic ?? 'Untitled Meeting',
        status: meeting.status,
        date: meeting.createdAt,
        recordingUrl: meeting.recordingUrl,
      })),
    );

    const ongoingMeeting =
      meetingSchedule.find((meeting) => meeting.status === 'ongoing') ?? null;

    const contributionData = projects.map((project) => ({
      name: project.name,
      value: project.progress > 0 ? project.progress : 1,
    }));

    return {
      user,
      performanceData: [
        {
          month: 'Projects',
          performance: projects.length,
        },
        {
          month: 'Ongoing',
          performance: ongoingProjects,
        },
        {
          month: 'Completed',
          performance: completedProjects,
        },
        {
          month: 'Tasks',
          performance: totalTasks,
        },
        {
          month: 'Done',
          performance: doneTasks,
        },
      ],
      contributionData,
      projects,
      ongoingMeeting,
      meetingSchedule,
      tasks: {
        active: activeNotionTasks,
        completed: completedNotionTasks,
        inProgress: inProgressNotionTasks,
      },
    };
  }
}