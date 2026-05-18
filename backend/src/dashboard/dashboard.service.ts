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

    const projectMembers = await this.prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
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
        },
      },
    });

    const projects = projectMembers.map((member) => {
      const tasks = member.project.taskBranchSyncs;

      const doneTasks = tasks.filter(
        (task) => task.syncState === SyncState.DONE,
      ).length;

      const progress =
        tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

      return {
        id: member.project.id,
        name: member.project.name,
        description: member.project.description,
        status: member.project.status,
        progress,
        isMember: true,
        role: member.role,
        leader: member.project.owner,
        members: member.project.members.map((m) => m.user),
        lastActivity:
          member.project.activities[0]?.createdAt ??
          member.project.messages[0]?.createdAt ??
          member.project.createdAt,
      };
    });

    const ongoingProjects = projects.filter(
      (project) => project.status === 'ongoing',
    ).length;

    const completedProjects = projects.filter(
      (project) => project.status === 'completed',
    ).length;

    const totalTasks = projectMembers.reduce((total, member) => {
      return total + member.project.taskBranchSyncs.length;
    }, 0);

    const doneTasks = projectMembers.reduce((total, member) => {
      return (
        total +
        member.project.taskBranchSyncs.filter(
          (task) => task.syncState === SyncState.DONE,
        ).length
      );
    }, 0);

    const activeTasks = projectMembers.reduce((total, member) => {
      return (
        total +
        member.project.taskBranchSyncs.filter(
          (task) =>
            task.syncState === SyncState.IN_PROGRESS ||
            task.syncState === SyncState.IN_REVIEW,
        ).length
      );
    }, 0);

    const meetingSchedule = projectMembers.flatMap((member) =>
      member.project.meetings.map((meeting) => ({
        id: meeting.id,
        projectId: member.project.id,
        projectName: member.project.name,
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
        plannedToday: totalTasks,
        finishedYesterday: doneTasks,
        dueThisWeek: activeTasks,
      },
    };
  }
}