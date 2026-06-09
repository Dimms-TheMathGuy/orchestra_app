import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { userMatchesAssignee } from '../notion/assignee-match.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    // Independent reads — declared here, then dispatched together via Promise.all
    // below so the user lookup and this projects query run concurrently.
    const projectsPromise = this.prisma.project.findMany({
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Promise.all dispatches both lazy Prisma queries together (a PrismaPromise
    // doesn't run until awaited/.then'd), so user + projects load concurrently.
    const [user, projectsRaw] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, avatarUrl: true },
      }),
      projectsPromise,
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Pull the cached Notion task snapshot for every project up front — it drives
    // both per-project progress (below) and the user's task cards (further down).
    // Progress is the share of *all* tasks (any assignee, any child database) that
    // are done, so it mirrors the Notion board rather than the GitHub branch links.
    const projectIds = projectsRaw.map((p) => p.id);
    const cachedTasks = projectIds.length
      ? await this.prisma.notionTask.findMany({
          where: { projectId: { in: projectIds } },
          select: {
            notionPageId: true,
            projectId: true,
            title: true,
            status: true,
            statusGroup: true,
            url: true,
            dueDate: true,
            assigneeEmails: true,
            assigneeNames: true,
          },
        })
      : [];

    // projectId → { total, done } across the whole Notion board.
    const taskStatsByProject = new Map<string, { total: number; done: number }>();
    for (const task of cachedTasks) {
      const stat = taskStatsByProject.get(task.projectId) ?? { total: 0, done: 0 };
      stat.total += 1;
      if (task.statusGroup === 'done') stat.done += 1;
      taskStatsByProject.set(task.projectId, stat);
    }

    const projects = projectsRaw.map((project) => {
      const stat = taskStatsByProject.get(project.id);
      const progress =
        stat && stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0;

      const currentMember = project.members.find(
        (member) => member.userId === userId,
      );

      const isMember = project.ownerId === userId || !!currentMember;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        notionDbId: project.notionDbId ?? null,
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

    // Board-wide totals from the Notion snapshot (every task, any assignee).
    const totalTasks = cachedTasks.length;
    const doneTasks = cachedTasks.filter((t) => t.statusGroup === 'done').length;

    // Task cards reflect the user's real Notion tasks (assignee = this user).
    // Match on email first, name as fallback (Notion only exposes assignee email
    // when the integration can read it). Matching is done in JS (not a Prisma
    // `has` filter) so it can be case-insensitive and trimmed — a Notion assignee
    // email/name rarely matches the Orchestra account byte-for-byte. See
    // userMatchesAssignee.
    const myNotionTasks = cachedTasks.filter((t) => userMatchesAssignee(t, user));

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
        list: myNotionTasks.map((t) => ({
          notionPageId: t.notionPageId,
          projectId: t.projectId,
          title: t.title,
          status: t.status,
          statusGroup: t.statusGroup,
          url: t.url,
          dueDate: t.dueDate,
        })),
      },
    };
  }
}