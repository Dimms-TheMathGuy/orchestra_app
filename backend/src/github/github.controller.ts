import { Controller, Get, Post, Body } from '@nestjs/common';
import { GithubService } from './github.service';

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

  @Get('activities')
  getActivities() {
    return this.githubService.getActivities();
  }

  @Post('sync')
  sync() {
    return this.githubService.sync();
  }

}