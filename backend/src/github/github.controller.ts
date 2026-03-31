import { Controller, Get, Post, Body, Req, Param, Headers, BadRequestException } from '@nestjs/common';
import { GithubService } from './github.service';
import type { Request } from 'express';
import { linkTaskBranchSchema } from './dto/link-task-branch.dto';

@Controller('api/github')
export class GithubController {

  constructor(private readonly githubService: GithubService) {}

  @Post('connect')
  connect() {
    return this.githubService.connect();
  }

  @Get('repos')
  getRepos(@Req() req: Request) {
    const userId = (req as any).user?.id;

    if (!userId) {
      return { error: 'User not authenticated' };
    }

    return this.githubService.getUserRepos(userId);
  }

  @Post(':projectId/repository')
  linkRepo(
    @Param('projectId') projectId: string, @Body() repo: any, @Req() req: any) {
    const userId = req.user.id; 

    return this.githubService.linkRepository(
      projectId,
      repo,
      userId
    );
  }

  @Post(':projectId/task-branch-sync')
  async linkTaskToBranch(@Param('projectId') projectId: string, @Body() body: unknown) {
    try {
      const validated = linkTaskBranchSchema.parse(body);

      return this.githubService.linkTaskToBranch(
        projectId,
        validated.repoId,
        validated.taskId,
        validated.branchName,
        validated.targetBranch,
        validated.databaseId,
        validated.completionPropertyName,
        validated.completionPropertyType,
        validated.completionValue,
      );
    } catch (error: any) {
      throw new BadRequestException(error.errors ?? error.message);
    }
  }

  @Get('projects/:projectId/github-activity')
  getActivities(@Param('projectId') projectId: string) {
    return this.githubService.getActivities(projectId);
  }

  @Post('sync')
  sync() {
    return this.githubService.sync();
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any, @Headers() headers: any, @Req() req: Request & { rawBody?: Buffer }) {
    const event = headers['x-github-event'];
    const signature = headers['x-hub-signature-256'];

    await this.githubService.verifyWebhookSignature(payload, req.rawBody, signature);

    await this.githubService.processEvent(event, payload);

    return { ok: true };
  }

  @Get('github/status')
  async githubStatus(@Req() req: Request) {
    return this.githubService.githubStatus(req);
  }

}
