import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import crypto from 'crypto';
import type { Request } from 'express';
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

    const webhookUrl = process.env.GITHUB_WEBHOOK_URL;
    const secret = crypto.randomBytes(20).toString('hex');

    if (webhookUrl) {
      await axios.post(
        `https://api.github.com/repos/${repo.owner.login}/${repo.name}/hooks`,
        {
          name: 'web',
          active: true,
          events: ['push', 'pull_request', 'issues', 'issue_comment', 'pull_request_review'],
          config: {
            url: webhookUrl,
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
    } else {
      console.warn('GITHUB_WEBHOOK_URL not set — repository linked without webhook. Set it in production.');
    }

    return this.prisma.projectRepository.create({
      data: {
        projectId: String(projectId),
        githubOwner: repo.owner.login,
        githubRepo: repo.name,
        githubUrl: repo.html_url,
        webhookSecret: secret,
      },
    });
  }

  /**
   * Live branch list across a project's linked repos, annotated with any
   * existing task link. Powers the "Link task to branch" UI.
   */
  async getProjectBranches(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: { owner: true, repositories: true },
    });

    if (!project) {
      throw new ForbiddenException('You do not have access to this project');
    }
    if (!project.owner.githubToken) {
      throw new BadRequestException('Project owner has not connected GitHub');
    }
    if (project.repositories.length === 0) {
      return [];
    }

    // Existing links, keyed by `${repoId}::${branchName}`
    const links = await this.prisma.taskBranchSync.findMany({
      where: { projectId },
      select: {
        id: true,
        repoId: true,
        branchName: true,
        notionTaskPageId: true,
        syncState: true,
      },
    });
    const linkMap = new Map(
      links.map((l) => [`${l.repoId}::${l.branchName}`, l]),
    );

    // Resolve linked task titles from the cached Notion snapshot
    const linkedPageIds = links.map((l) => l.notionTaskPageId);
    const linkedTasks = linkedPageIds.length
      ? await this.prisma.notionTask.findMany({
          where: { notionPageId: { in: linkedPageIds } },
          select: { notionPageId: true, title: true },
        })
      : [];
    const titleMap = new Map(linkedTasks.map((t) => [t.notionPageId, t.title]));

    const branches: {
      repoId: string;
      repoFullName: string;
      name: string;
      linked: boolean;
      linkId: string | null;
      linkedTaskPageId: string | null;
      linkedTaskTitle: string | null;
      syncState: string | null;
    }[] = [];

    for (const repo of project.repositories) {
      try {
        const response = await axios.get(
          `https://api.github.com/repos/${repo.githubOwner}/${repo.githubRepo}/branches`,
          {
            headers: {
              Authorization: `Bearer ${project.owner.githubToken}`,
              Accept: 'application/vnd.github+json',
            },
          },
        );

        for (const branch of response.data) {
          const link = linkMap.get(`${repo.id}::${branch.name}`);
          branches.push({
            repoId: repo.id,
            repoFullName: `${repo.githubOwner}/${repo.githubRepo}`,
            name: branch.name,
            linked: !!link,
            linkId: link?.id ?? null,
            linkedTaskPageId: link?.notionTaskPageId ?? null,
            linkedTaskTitle: link
              ? titleMap.get(link.notionTaskPageId) ?? null
              : null,
            syncState: link?.syncState ?? null,
          });
        }
      } catch (error: any) {
        const msg =
          error?.response?.data?.message ?? error?.message ?? 'Unknown error';
        console.error(
          `Branch fetch failed for ${repo.githubOwner}/${repo.githubRepo}:`,
          msg,
        );
      }
    }

    return branches;
  }

  /** Remove a task↔branch link (lets the user re-link a branch). */
  async unlinkTaskBranch(projectId: string, syncId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    });
    if (!project) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const sync = await this.prisma.taskBranchSync.findFirst({
      where: { id: syncId, projectId },
      select: { id: true },
    });
    if (!sync) {
      throw new NotFoundException('Task link not found');
    }

    await this.prisma.taskBranchSync.delete({ where: { id: sync.id } });
    return { ok: true };
  }

  async getActivities(projectId: string) {
    return this.prisma.githubActivity.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async syncProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        owner: true,
        repositories: true,
      },
    })

    if (!project) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (!project.owner.githubToken) {
      throw new BadRequestException('Project owner has not connected GitHub');
    }

    if (project.repositories.length === 0) {
      return { message: 'No repositories linked to this project' };
    }

    const errors: string[] = [];

    for (const repo of project.repositories) {
      try {
        const response = await axios.get(
          `https://api.github.com/repos/${repo.githubOwner}/${repo.githubRepo}/commits`,
          {
            headers: {
              Authorization: `Bearer ${project.owner.githubToken}`,
              Accept: 'application/vnd.github+json',
            },
          },
        );

        const commits = response.data;

        for (const commit of commits) {
          await this.prisma.githubActivity.upsert({
            where: {
              repoId_githubId_type: {
                repoId: repo.id,
                githubId: commit.sha,
                type: 'commit',
              },
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
              createdAt: new Date(commit.commit.author.date),
            },
          });
        }
      } catch (error: any) {
        const msg = error?.response?.data?.message ?? error?.message ?? 'Unknown error';
        console.error(`Sync failed for ${repo.githubOwner}/${repo.githubRepo}:`, msg);
        errors.push(`${repo.githubOwner}/${repo.githubRepo}: ${msg}`);
      }
    }

    if (errors.length > 0 && errors.length === project.repositories.length) {
      throw new BadRequestException(`Sync failed for all repositories: ${errors.join('; ')}`);
    }

    return { message: 'Sync complete', errors: errors.length > 0 ? errors : undefined };
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

  async verifyWebhookSignature(payload: any, rawBody: Buffer | undefined, signature: string | undefined) {
    if (!signature) {
      throw new UnauthorizedException('Missing GitHub webhook signature');
    }

    if (!rawBody) {
      throw new UnauthorizedException('Missing raw webhook body for signature verification');
    }

    const repo = payload?.repository;

    if (!repo?.owner?.login || !repo?.name) {
      throw new BadRequestException('Repository payload is missing');
    }

    const projectRepo = await this.prisma.projectRepository.findFirst({
      where: {
        githubOwner: repo.owner.login,
        githubRepo: repo.name,
      },
      select: {
        webhookSecret: true,
      },
    });

    if (!projectRepo?.webhookSecret) {
      throw new UnauthorizedException('Webhook secret not found for repository');
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', projectRepo.webhookSecret)
      .update(rawBody)
      .digest('hex')}`;

    const receivedSignature = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      receivedSignature.length !== expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(receivedSignature, expectedSignatureBuffer)
    ) {
      throw new UnauthorizedException('Invalid GitHub webhook signature');
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


    // ambil token github : project repo -> project -> project owner -> user -> github token

    const project = await this.prisma.project.findFirst({
      where:{
        id : projectRepo.projectId,
      },
    });

    if(!project)return;

    const user = await this.prisma.user.findFirst({
      where: {
        id : project.ownerId,
      },
    });
    
    if(!user?.githubToken){
      throw new Error('Github Is Not Connected');
    };

      const githubToken = user.githubToken;

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

        const hasApprovedReview = await this.getReviewState(repo.owner.login, repo.name, pr.number, githubToken);

        if(!hasApprovedReview) return;

        await this.prisma.taskBranchSync.update({
          where: {
            id: linkedTask.id
          },
          data: {
            prNumber: pr.number,
            syncState: 'DONE',
            lastSyncedAt: new Date(),
          }
        });

        try {
          await this.notion.markTaskComplete(
            linkedTask.notionTaskPageId,
            linkedTask.completionPropertyName,
            linkedTask.completionPropertyType,
            linkedTask.completionValue,
          );
        } catch (error) {
          await this.prisma.taskBranchSync.update({
            where: {
              id: linkedTask.id,
            },
            data: {
              prNumber: linkedTask.prNumber,
              syncState: linkedTask.syncState,
              lastSyncedAt: linkedTask.lastSyncedAt,
            },
          });

          throw error;
        }

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

  async getReviewState(owner: string, repo: string, prNumber: number, githubToken: string): Promise<boolean> {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: `application/vnd.github+json`,
          },
        },
      );


      const reviews = response.data;
      const latestReviewByReviewer = new Map<string, any>();

      for (const review of reviews) {
        const reviewerId = review.user?.login ?? String(review.user?.id ?? '');

        if (!reviewerId) continue;

        const existingReview = latestReviewByReviewer.get(reviewerId);
        const currentTimestamp = new Date(review.submitted_at ?? review.created_at ?? 0).getTime();
        const existingTimestamp = existingReview
          ? new Date(existingReview.submitted_at ?? existingReview.created_at ?? 0).getTime()
          : -1;

        if (!existingReview || currentTimestamp >= existingTimestamp) {
          latestReviewByReviewer.set(reviewerId, review);
        }
      }

      const hasApproval = Array.from(latestReviewByReviewer.values()).some(
        (review: any) => review.state?.toLowerCase() === 'approved',
      );

      return hasApproval;
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

  async linkTaskToBranch(
    projectId: string,
    repoId: string,
    taskId: string,
    branchName: string,
    targetBranch: string,
    databaseId: string,
    completionPropertyName: string,
    completionPropertyType: string,
    completionValue: unknown,
  ) {
    const projectRepo = await this.prisma.projectRepository.findFirst({
      where: {
        id: repoId,
        projectId,
      },
    });

    if (!projectRepo) {
      throw new BadRequestException('Repository does not belong to this project');
    }

    const existingTaskForBranch = await this.prisma.taskBranchSync.findUnique({
      where: {
        repoId_branchName: {
          repoId,
          branchName,
        },
      },
    });

    if (existingTaskForBranch) {
      throw new BadRequestException('This branch is already linked to another Notion task');
    }

    const existingBranchForTask = await this.prisma.taskBranchSync.findUnique({
      where: {
        notionTaskPageId: taskId,
      },
    });

    if (existingBranchForTask) {
      throw new BadRequestException('This Notion task is already linked to another branch');
    }

    const linkedTask = await this.prisma.taskBranchSync.create({
      data: {
        projectId: projectId,
        repoId: repoId,
        notionTaskPageId: taskId,
        notionDatabaseId: databaseId,
        completionPropertyName: completionPropertyName,
        completionPropertyType: completionPropertyType,
        completionValue: completionValue as any,
        branchName: branchName,
        targetBranch: targetBranch,
        syncState: 'LINKED', // untuk MVP gapapa defaultnya linked, tapi nanti untuk production dia harus bisa baca current state branch dari github API
      }
    });

    return linkedTask;
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
