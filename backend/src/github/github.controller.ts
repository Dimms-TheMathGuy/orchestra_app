import { Controller, Get, Post, Body, Req, Param } from '@nestjs/common';
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
  getRepos() {
    return this.githubService.getRepos();
  }

  @Post('repos/link')
  linkRepo(@Body() body) {
    return this.githubService.linkRepository(
      body.projectId,
      body.repo
    )
  }

  @Get(':id/github-activity')
  getActivities(@Param('id') id: string) {
    return this.githubService.getActivities(id);
  }

  @Post('sync')
  sync() {
    return this.githubService.sync();
  }

  @Post('webhook/github')
  handleWebhook(@Body() payload: any) {
    console.log(payload);
  }

  @Get('github/status')
  async githubStatus(@Req() req: Request) {
    return this.githubService.githubStatus(req);
  }

}