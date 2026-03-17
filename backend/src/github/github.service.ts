import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class GithubService {

  connect() {
    return { message: 'GitHub connected (service)' };
  }

  async getRepos() {
    const response = await axios.get(
      'https://api.github.com/user/repos',
      {
        headers: {
          Authorization: `Bearer YOUR_GITHUB_TOKEN`
        }
      }
    );

    return response.data;
  }

  constructor(private prisma: PrismaService) {}

  async linkRepository(repo: any, projectId: number) {
    return this.prisma.projectRepository.create({
      data: {
        projectId: String(projectId),
        githubOwner: repo.owner.login,
        githubRepo: repo.name,
        githubUrl: repo.html_url,
        webhookSecret: null
      }
    });
  }

  getActivities() {
    // Later: fetch from DB
    return [
      { type: 'commit', message: 'Initial commit' }
    ];
  }

  sync() {
    // Later: fetch GitHub data → save to DB
    return { message: 'Sync started (service)' };
  }

}