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
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
        }
      }
    );

    return response.data;
  }

  constructor(private prisma: PrismaService) {}

  async linkRepository(projectId: string, repo: any) {
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

  async sync() {
    const repos = await this.prisma.projectRepository.findMany()

    for (const repo of repos) {
      const response = await axios.get(
        `https://api.github.com/repos/${repo.githubOwner}/${repo.githubRepo}/commits`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
          }
        }
      )

      console.log(response.data)
    }

    return { message: 'Sync complete' }
  }

}