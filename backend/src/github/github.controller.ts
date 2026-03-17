import { Controller, Get, Post } from '@nestjs/common';
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
    return [
      {
        id: 1,
        name: "pm-system",
        owner: "your-username",
        private: false
      },
      {
        id: 2,
        name: "mobile-app",
        owner: "your-username",
        private: true
      }
    ];
  }

  @Post('repos/link')
  async linkRepo(body) {
    return this.githubService.linkRepository(
      body.projectId,
      body.repo
    );
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