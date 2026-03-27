import { Injectable, ParseEnumPipe, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import crypto from 'crypto';
import type { Response, Request } from 'express';
import { ActivityGateway } from 'src/activity/activity.gateway';
import { NotionService } from 'src/notion/notion.service';

@Injectable()
export class GithubService {

  connect() {
    return { message: 'GitHub connected (service)' };
  }

  constructor(private prisma: PrismaService, private gateway: ActivityGateway, private notion: NotionService) {}

  async linkRepository(projectId: string, repo: any, userId: string) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.githubToken) {
      throw new Error('GitHub not connected');
    }

    const secret = crypto.randomBytes(20).toString('hex');

    await axios.post(
      `https://api.github.com/repos/${repo.owner.login}/${repo.name}/hooks`,
      {
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'issues', 'issue_comment', 'pull_request_review'],
        config: {
          url: 'https://your-domain.com/github/webhook',
          content_type: 'json',
          secret,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${user.githubToken}`,
        },
      },
    );

    return this.prisma.projectRepository.create({
      data: {
        projectId: String(projectId),
        githubOwner: repo.owner.login,
        githubRepo: repo.name,
        githubUrl: repo.html_url,
        webhookSecret: secret
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

  async getUserRepos(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.githubToken) {
      throw new Error('GitHub not connected');
    }

    const response = await axios.get(
      'https://api.github.com/user/repos',
      {
        headers: {
          Authorization: `Bearer ${user.githubToken}`,
        },
      },
    );

    return response.data;
  }

  async processEvent(event: string, payload: any) {
    switch (event) {

      case 'push':
        return this.handlePush(payload);

      case 'pull_request':
        return this.handlePullRequest(payload);

      case 'issues':
        return this.handleIssue(payload);

      case 'pull_request_review':
        return this.handlePullRequestReview(payload);
      
      case 'issue_comment':
        return;
  
      default:
        console.log('Unhandled event:', event);
    }
  }

  async handlePush(payload: any) {

    const repo = payload.repository;

    const projectRepo =
      await this.prisma.projectRepository.findFirst({
        where: {
          githubOwner: repo.owner.login,
          githubRepo: repo.name,
        },
      });

    if (!projectRepo) return;

    for (const commit of payload.commits) {

      const activity =
      await this.prisma.githubActivity.create({
        data: {
          projectId: projectRepo.projectId,
          repoId: projectRepo.id,
          type: 'commit',
          title: commit.message,
          author: commit.author.name,
          githubId: commit.id,
          url: commit.html_url,
          createdAt: new Date(commit.created_at)
        },
      });

      this.gateway.emitToProject(
        activity.projectId,
        activity
      );
    }
  }

  async handlePullRequest(payload: any) {

    const repo = payload.repository;
    const pr = payload.pull_request;

    const projectRepo =
      await this.prisma.projectRepository.findFirst({
        where: {
          githubOwner: repo.owner.login,
          githubRepo: repo.name,
        },
      });

    if (!projectRepo) return;

    const activity =
    await this.prisma.githubActivity.create({
      data: {
        projectId: projectRepo.projectId,
        repoId: projectRepo.id,
        type: 'pull_request',
        title: `${payload.action} PR #${pr.number}: ${pr.title}`,
        author: pr.user.login,
        githubId: String(pr.id),
        url: pr.html_url,
        createdAt: new Date(pr.created_at)
      },
    });

    this.gateway.emitToProject(
        activity.projectId,
        activity
      );

      const branchName = pr.head.ref;
      const baseBranch = pr.base.ref;
      const action = payload.action.toLowerCase();
      const merged = pr.merged;

    // part untuk taskBranchSync
    const linkedTask = await this.prisma.taskBranchSync.findUnique({
      where: {
              repoId_branchName: {
                repoId: projectRepo.id,
                branchName: branchName,
              },
            }
          })
    
    if(!linkedTask) return;

    if(action === 'opened' || action === 'reopened' || action === 'ready_for_review'){
      
      await this.prisma.taskBranchSync.update({
        where: {
          id: linkedTask.id
        },
        data: {
          prNumber: pr.number,
          syncState: 'IN_REVIEW',
          lastSyncedAt: new Date(),
        }
      })
      return;
    }
    
    if(action === 'closed'){
      if(merged === true && baseBranch === linkedTask.targetBranch){

        const prState = payload.review.state.toLowerCase();
        
        if(prState != 'approved') return;

        await this.prisma.taskBranchSync.update({
        where: {
          id: linkedTask.id
        },
        data: {
          prNumber: pr.number,
          syncState: 'DONE',
          lastSyncedAt: new Date(),
          }
        })

        return;
      }

      if(merged === false){
        await this.prisma.taskBranchSync.update({
        where: {
          id: linkedTask.id
        },
        data: {
          prNumber: pr.number,
          syncState: 'IN_PROGRESS',
          lastSyncedAt: new Date(),
          }
        })

        return;
      }
    }
    return;
  }

  async handleIssue(payload: any) {
    const repo = payload.repository;
    const issue = payload.issue;

    const projectRepo =
      await this.prisma.projectRepository.findFirst({
        where: {
          githubOwner: repo.owner.login,
          githubRepo: repo.name,
        },
      });

    if (!projectRepo) return;

    const activity =
    await this.prisma.githubActivity.create({
      data: {
        projectId: projectRepo.projectId,
        repoId: projectRepo.id,
        type: 'issue',
        title: `${payload.action} issue #${issue.number}: ${issue.title}`,
        author: issue.user.login,
        githubId: String(issue.id),
        url: issue.html_url,
        createdAt: new Date(issue.created_at)
      },
    });

    this.gateway.emitToProject(
        activity.projectId,
        activity
      );
  }

  async linkTaskToBranch(projectId: string, repoId: string, taskId: string, branchName: string, targetBranch: string, DatabaseId: string) {

    const LinkedTask = await this.prisma.taskBranchSync.create({
      data: {
        projectId: projectId,
        repoId: repoId,
        notionTaskPageId: taskId,
        notionDatabaseId: DatabaseId,
        branchName: branchName,
        targetBranch: targetBranch,
        syncState: 'LINKED', // untuk MVP gapapa defaultnya linked, tapi nanti untuk production dia harus bisa baca current state branch dari github API
      }
    })

    return LinkedTask;
  }

  async findTaskBranchSync(repoId: string, branchName: string) {

    const found = await this.prisma.taskBranchSync.findUnique({
      where: {
        repoId_branchName: {
          repoId: repoId,
          branchName: branchName
        },
      }
    })

    return found;
  }

  async handlePullRequestReview(payload: any) {
    const repo = payload.repository;
    const pr = payload.pull_request;
    const review = payload.review;

    const prState = review.state.toLowerCase();

      if (prState === 'approved'){

        // update DB
        const projectRepo =
        await this.prisma.projectRepository.findFirst({
          where: {
            githubOwner: repo.owner.login,
            githubRepo: repo.name,
          },
        });

        if (!projectRepo) return; 

        const branchName = pr.head.ref;
        const repoId = projectRepo.id;

        const linkedTask = 
        await this.prisma.taskBranchSync.findUnique({
          where: {
              repoId_branchName: {
                repoId: repoId,
                branchName: branchName,
              },
            }
        });

        if(!linkedTask) return;

        await this.prisma.taskBranchSync.update({
          where: {
            id: linkedTask.id,
          },
          data: {
            prNumber: pr.number,
            lastSyncedAt: new Date(),
          },
        })
      }
  }


  
  
}