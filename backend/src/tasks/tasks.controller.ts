import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('projects/:projectId/notion')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /** Refresh the cached task snapshot from Notion. */
  @Post('sync-tasks')
  sync(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.syncProjectTasks(projectId, req.user.id);
  }

  /** Cached Notion tasks for this project. */
  @Get('tasks')
  list(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.getProjectTasks(projectId, req.user.id);
  }

  /** Schema of a specific Notion database (for the completion picker). */
  @Get('schema/:databaseId')
  schema(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasks.getDatabaseSchema(projectId, req.user.id, databaseId);
  }
}
