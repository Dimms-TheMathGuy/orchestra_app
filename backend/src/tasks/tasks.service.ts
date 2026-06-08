import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotionService } from '../notion/notion.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notion: NotionService,
  ) {}

  /** Throw unless the user owns or is a member of the project; returns the project. */
  private async ensureAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });
    if (!project) {
      throw new ForbiddenException('You do not have access to this project');
    }
    return project;
  }

  /**
   * Core sync: pull the latest tasks from a Notion database and cache them in
   * NotionTask. Rows that vanished from Notion are removed so stats stay
   * accurate. No access check — callers (user endpoint / scheduler) gate this.
   */
  private async fetchAndCacheTasks(projectId: string, notionDbId: string) {
    // The configured id may be a database or a page that holds child databases.
    const databaseIds = await this.notion.resolveDatabaseIds(notionDbId);

    // Query every resolved database; each task remembers which db it came from
    // (needed so the completion payload targets the right schema).
    const fetched: {
      notionPageId: string;
      notionDatabaseId: string;
      title: string;
      status: string | null;
      statusGroup: string;
      assigneeEmails: string[];
      assigneeNames: string[];
      url: string | null;
    }[] = [];

    for (const dbId of databaseIds) {
      const rows = await this.notion.queryDatabaseTasks(dbId);
      for (const r of rows) fetched.push({ ...r, notionDatabaseId: dbId });
    }

    await this.prisma.$transaction([
      // Drop tasks that vanished from Notion (or moved databases)
      this.prisma.notionTask.deleteMany({
        where: {
          projectId,
          notionPageId: { notIn: fetched.map((t) => t.notionPageId) },
        },
      }),
      ...fetched.map((t) =>
        this.prisma.notionTask.upsert({
          where: { notionPageId: t.notionPageId },
          create: {
            projectId,
            notionPageId: t.notionPageId,
            notionDatabaseId: t.notionDatabaseId,
            title: t.title,
            status: t.status,
            statusGroup: t.statusGroup,
            assigneeEmails: t.assigneeEmails,
            assigneeNames: t.assigneeNames,
            url: t.url,
          },
          update: {
            notionDatabaseId: t.notionDatabaseId,
            title: t.title,
            status: t.status,
            statusGroup: t.statusGroup,
            assigneeEmails: t.assigneeEmails,
            assigneeNames: t.assigneeNames,
            url: t.url,
            lastSyncedAt: new Date(),
          },
        }),
      ),
    ]);

    return fetched.length;
  }

  /** User-triggered sync for one project (access-checked). */
  async syncProjectTasks(projectId: string, userId: string) {
    const project = await this.ensureAccess(projectId, userId);

    if (!project.notionDbId) {
      throw new BadRequestException(
        'No Notion database is configured for this project',
      );
    }

    await this.fetchAndCacheTasks(projectId, project.notionDbId);
    return this.getProjectTasks(projectId, userId);
  }

  /**
   * Background sync of every project that has a Notion database configured.
   * Called by TasksScheduler on an interval. Failures are isolated per project.
   */
  async syncAllProjects() {
    const projects = await this.prisma.project.findMany({
      where: { notionDbId: { not: null } },
      select: { id: true, notionDbId: true },
    });

    let ok = 0;
    let fail = 0;
    for (const p of projects) {
      try {
        await this.fetchAndCacheTasks(p.id, p.notionDbId as string);
        ok++;
      } catch (e: any) {
        fail++;
        console.error(
          `[task-sync] project ${p.id} failed:`,
          e?.message ?? e,
        );
      }
    }
    return { total: projects.length, ok, fail };
  }

  /** Cached Notion tasks for a project (used by the link-task-to-branch form). */
  async getProjectTasks(projectId: string, userId: string) {
    await this.ensureAccess(projectId, userId);
    return this.prisma.notionTask.findMany({
      where: { projectId },
      orderBy: [{ statusGroup: 'asc' }, { title: 'asc' }],
    });
  }

  /**
   * Normalized schema of a specific Notion database — used to build the
   * completion-property picker (status/select options, checkbox) for the task
   * selected in the link-to-branch form. Tasks may live in different databases,
   * so the caller passes the selected task's databaseId.
   */
  async getDatabaseSchema(projectId: string, userId: string, databaseId: string) {
    await this.ensureAccess(projectId, userId);
    const [schema] = await this.notion.fetchAllDatabaseSchema([databaseId]);
    if (!schema) throw new NotFoundException('Notion database schema not found');
    return schema;
  }
}
