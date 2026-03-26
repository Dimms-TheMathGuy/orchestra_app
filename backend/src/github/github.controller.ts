import { Controller, Get, Post, Body, Req, Param, Headers } from '@nestjs/common';
import { GithubService } from './github.service';
import type { Request } from 'express';

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

  @Get('projects/:projectId/github-activity')
  getActivities(@Param('projectId') projectId: string) {
    return this.githubService.getActivities(projectId);
  }

  @Post('sync')
  sync() {
    return this.githubService.sync();
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any, @Headers() headers: any) {
    const event = headers['x-github-event'];

    await this.githubService.processEvent(event, payload);

    return { ok: true };
  }

  @Get('github/status')
  async githubStatus(@Req() req: Request) {
    return this.githubService.githubStatus(req);
  }

}