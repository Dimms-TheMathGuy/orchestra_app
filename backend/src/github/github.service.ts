import { Injectable, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import type { Response, Request } from 'express';

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

  async getActivities(projectId: string) {
    return this.prisma.githubActivity.findMany();
  }

  async sync() {
    const repos = await this.prisma.projectRepository.findMany({
      include: { project: true }
    })

    for (const repo of repos) {
      const response = await axios.get(
        `https://api.github.com/repos/${repo.githubOwner}/${repo.githubRepo}/commits`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json'
          }
        }
      )

      const commits = response.data

      for (const commit of commits) {
        await this.prisma.githubActivity.upsert({
          where: {
            repoId_githubId_type: {
              repoId: repo.id,
              githubId: commit.sha,
              type: 'commit'
            }
          },
          update: {},
          create: {
            projectId: repo.projectId,
            repoId: repo.id,
            type: 'commit',
            githubId: commit.sha,
            title: commit.commit.message.split('\n')[0],
            description: commit.commit.message,
            author: commit.commit.author.name,
            url: commit.html_url,
            createdAt: new Date(commit.commit.author.date)
          }
        })
      }
    }

    return { message: 'Sync complete' }
  }

  async githubStatus(@Req() req: Request) {
    const userId = (req as any).user.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        githubId: true,
        githubUsername: true,
      },
    });

    return {
      connected: !!user?.githubId,
      username: user?.githubUsername ?? null,
    };
  }

}