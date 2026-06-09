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

    const secret = crypto.randomBytes(20).toString('hex');
    await this.ensureRepoWebhook(repo.owner.login, repo.name, user.githubToken, secret);

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

  private static readonly WEBHOOK_EVENTS = [
    'push',
    'pull_request',
    'issues',
    'issue_comment',
    'pull_request_review',
  ];

  /**
   * Ensure a GitHub webhook pointing at GITHUB_WEBHOOK_URL exists for the repo,
   * signing with `secret`. Idempotent: an existing hook for the same URL is
   * patched (so its secret/events stay in sync) rather than duplicated.
   * Returns the hook id, or null when GITHUB_WEBHOOK_URL is unset (local dev
   * without a tunnel) — in which case real-time sync is unavailable and the
   * user must rely on the Sync button's reconcile instead.
   */
  private async ensureRepoWebhook(
    owner: string,
    repoName: string,
    token: string,
    secret: string,
  ): Promise<number | null> {
    const webhookUrl = process.env.GITHUB_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn(
        'GITHUB_WEBHOOK_URL not set — skipping webhook creation. Real-time GitHub sync disabled; use the Sync button to reconcile.',
      );
      return null;
    }

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
    const config = { url: webhookUrl, content_type: 'json', secret };

    // Reuse an existing hook for the same URL to avoid duplicates.
    let existing: any = null;
    try {
      const resp = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}/hooks`,
        { headers },
      );
      existing = (resp.data ?? []).find((h: any) => h.config?.url === webhookUrl);
    } catch {
      // Listing failed (perms/network) — fall through and attempt a create.
    }

    if (existing) {
      await axios.patch(
        `https://api.github.com/repos/${owner}/${repoName}/hooks/${existing.id}`,
        { active: true, events: GithubService.WEBHOOK_EVENTS, config },
        { headers },
      );
      return existing.id;
    }

    const created = await axios.post(
      `https://api.github.com/repos/${owner}/${repoName}/hooks`,
      { name: 'web', active: true, events: GithubService.WEBHOOK_EVENTS, config },
      { headers },
    );
    return created.data?.id ?? null;
  }

  /** Owner-only: (re)create the GitHub webhook for an already-linked repo. */
  async repairRepoWebhook(projectId: string, repoId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
      include: { owner: true },
    });
    if (!project) {
      throw new ForbiddenException('Only the project owner can repair a repository webhook');
    }
    if (!project.owner.githubToken) {
      throw new BadRequestException('Project owner has not connected GitHub');
    }

    const repo = await this.prisma.projectRepository.findFirst({
      where: { id: repoId, projectId },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found in this project');
    }

    if (!process.env.GITHUB_WEBHOOK_URL) {
      throw new BadRequestException(
        'GITHUB_WEBHOOK_URL is not configured on the server, so a webhook cannot be created. Set it (e.g. your ngrok URL) and restart the backend.',
      );
    }

    const secret = crypto.randomBytes(20).toString('hex');
    let hookId: number | null;
    try {
      hookId = await this.ensureRepoWebhook(repo.githubOwner, repo.githubRepo, project.owner.githubToken, secret);
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? 'Unknown error';
      throw new BadRequestException(`Failed to create webhook on GitHub: ${msg}`);
    }

    // Persist the new secret so webhook signatures verify against it.
    await this.prisma.projectRepository.update({
      where: { id: repo.id },
      data: { webhookSecret: secret },
    });

    return { ok: true, hookId, webhookUrl: process.env.GITHUB_WEBHOOK_URL };
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

    type BranchInfo = {
      repoId: string;
      repoFullName: string;
      name: string;
      linked: boolean;
      linkId: string | null;
      linkedTaskPageId: string | null;
      linkedTaskTitle: string | null;
      syncState: string | null;
    };

    // Fetch every repo's branches concurrently — a project with N repos used to
    // pay N sequential GitHub round-trips; now it's bounded by the slowest one.
    const perRepo = await Promise.all(
      project.repositories.map(async (repo): Promise<BranchInfo[]> => {
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

          return response.data.map((branch: any): BranchInfo => {
            const link = linkMap.get(`${repo.id}::${branch.name}`);
            return {
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
            };
          });
        } catch (error: any) {
          const msg =
            error?.response?.data?.message ?? error?.message ?? 'Unknown error';
          console.error(
            `Branch fetch failed for ${repo.githubOwner}/${repo.githubRepo}:`,
            msg,
          );
          return [];
        }
      }),
    );

    return perRepo.flat();
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
    let tasksUpdated = 0;

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

        // Webhook-independent catch-up: bring linked tasks in line with the
        // branch's real PR/merge state on GitHub (covers missed/absent webhooks).
        tasksUpdated += await this.reconcileTaskBranches(repo, project.owner.githubToken);
      } catch (error: any) {
        const msg = error?.response?.data?.message ?? error?.message ?? 'Unknown error';
        console.error(`Sync failed for ${repo.githubOwner}/${repo.githubRepo}:`, msg);
        errors.push(`${repo.githubOwner}/${repo.githubRepo}: ${msg}`);
      }
    }

    if (errors.length > 0 && errors.length === project.repositories.length) {
      throw new BadRequestException(`Sync failed for all repositories: ${errors.join('; ')}`);
    }

    return {
      message: 'Sync complete',
      tasksUpdated,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Forward-only state ordering — reconcile never regresses a task.
  private static readonly SYNC_STATE_RANK: Record<string, number> = {
    LINKED: 0,
    IN_PROGRESS: 1,
    IN_REVIEW: 2,
    DONE: 3,
  };

  /**
   * Reconcile every task↔branch link for a repo against GitHub's current state,
   * without relying on webhooks. Returns the number of tasks whose state advanced.
   */
  async reconcileTaskBranches(
    repo: { id: string; githubOwner: string; githubRepo: string },
    ownerToken: string,
  ): Promise<number> {
    const links = await this.prisma.taskBranchSync.findMany({ where: { repoId: repo.id } });
    let updated = 0;

    for (const link of links) {
      try {
        if (await this.reconcileOneLink(repo, ownerToken, link)) {
          updated++;
        }
      } catch (error: any) {
        const msg = error?.response?.data?.message ?? error?.message ?? 'Unknown error';
        console.warn(`Reconcile failed for branch ${link.branchName} (${repo.githubOwner}/${repo.githubRepo}):`, msg);
      }
    }

    return updated;
  }

  /** Reconcile a single link. Returns true if its state advanced. */
  private async reconcileOneLink(
    repo: { id: string; githubOwner: string; githubRepo: string },
    token: string,
    link: any,
  ): Promise<boolean> {
    // Terminal — nothing further to reconcile.
    if (link.syncState === 'DONE') return false;

    const owner = repo.githubOwner;
    const name = repo.githubRepo;
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };

    // PRs originating from this branch, regardless of state.
    const prResp = await axios.get(
      `https://api.github.com/repos/${owner}/${name}/pulls?head=${encodeURIComponent(`${owner}:${link.branchName}`)}&state=all&per_page=20`,
      { headers },
    );
    const prs: any[] = Array.isArray(prResp.data) ? prResp.data : [];
    const relevant = prs.filter((pr) => pr.base?.ref === link.targetBranch);
    // Only a merge that happened at/after the link was created counts. Branch
    // names get reused, so an *old* merged PR on the same branch (from a previous
    // cycle) must not complete a freshly-linked task. A small negative skew
    // guards against clock differences between GitHub and our DB.
    const linkCreatedAt = link.createdAt ? new Date(link.createdAt).getTime() : 0;
    const mergedPr = relevant.find(
      (pr) => !!pr.merged_at && new Date(pr.merged_at).getTime() >= linkCreatedAt - 60_000,
    );
    const openPr = relevant.find((pr) => pr.state === 'open');

    // Does the branch have any commits yet?
    let hasCommits = false;
    try {
      const commitsResp = await axios.get(
        `https://api.github.com/repos/${owner}/${name}/commits?sha=${encodeURIComponent(link.branchName)}&per_page=1`,
        { headers },
      );
      hasCommits = Array.isArray(commitsResp.data) && commitsResp.data.length > 0;
    } catch {
      // Branch may have been deleted post-merge — leave hasCommits false.
    }

    // Derive the target state from GitHub reality.
    let desired: 'LINKED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' = 'LINKED';
    let prNumber: number | null = link.prNumber ?? null;

    if (mergedPr) {
      const approved = link.requireApproval
        ? await this.getReviewState(owner, name, mergedPr.number, token)
        : true;
      desired = approved ? 'DONE' : 'IN_REVIEW';
      prNumber = mergedPr.number;
    } else if (openPr) {
      desired = 'IN_REVIEW';
      prNumber = openPr.number;
    } else if (hasCommits) {
      desired = 'IN_PROGRESS';
    }

    const rank = GithubService.SYNC_STATE_RANK;
    if (rank[desired] <= rank[link.syncState]) return false; // forward-only

    // Push the matching value to Notion *before* persisting locally, so a Notion
    // failure leaves the link untouched and the next Sync retries.
    if (desired === 'DONE') {
      await this.notion.markTaskComplete(
        link.notionTaskPageId,
        link.completionPropertyName,
        link.completionPropertyType,
        link.completionValue,
      );
    } else if (desired === 'IN_PROGRESS' && link.inProgressValue !== null && link.inProgressValue !== '') {
      await this.notion.markTaskInProgress(
        link.notionTaskPageId,
        link.completionPropertyName,
        link.completionPropertyType,
        link.inProgressValue,
      );
    }

    if (desired === 'DONE') {
      // Mirror the webhook path: completing a task auto-unlinks it.
      await this.prisma.taskBranchSync.delete({ where: { id: link.id } });
      this.gateway.emitTaskSync(link.projectId, {
        repoId: repo.id,
        branchName: link.branchName,
        syncState: 'DONE',
        unlinked: true,
      });
    } else {
      await this.prisma.taskBranchSync.update({
        where: { id: link.id },
        data: { syncState: desired, prNumber, lastSyncedAt: new Date() },
      });
      this.gateway.emitTaskSync(link.projectId, {
        repoId: repo.id,
        branchName: link.branchName,
        syncState: desired,
      });
    }

    return true;
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

      // Push payload commits expose `timestamp` and `url` (not created_at/html_url).
      // Upsert so a redelivered push (same sha) doesn't trip the unique constraint.
      const activity =
      await this.prisma.githubActivity.upsert({
        where: {
          repoId_githubId_type: {
            repoId: projectRepo.id,
            githubId: commit.id,
            type: 'commit',
          },
        },
        update: {},
        create: {
          projectId: projectRepo.projectId,
          repoId: projectRepo.id,
          type: 'commit',
          title: commit.message,
          author: commit.author?.name ?? commit.author?.username ?? 'unknown',
          githubId: commit.id,
          url: commit.url,
          createdAt: commit.timestamp ? new Date(commit.timestamp) : new Date(),
        },
      });

      this.gateway.emitToProject(
        activity.projectId,
        activity
      );
    }

    // When a commit lands on a linked branch, move the task to IN_PROGRESS
    // (only if it hasn't already advanced to IN_REVIEW or DONE)
    const branchName = payload.ref?.replace('refs/heads/', '');
    if (!branchName) return;

    const linkedTask = await this.prisma.taskBranchSync.findUnique({
      where: { repoId_branchName: { repoId: projectRepo.id, branchName } },
    });

    if (linkedTask && (linkedTask.syncState === 'LINKED')) {
      await this.prisma.taskBranchSync.update({
        where: { id: linkedTask.id },
        data: { syncState: 'IN_PROGRESS', lastSyncedAt: new Date() },
      });
      this.gateway.emitTaskSync(projectRepo.projectId, {
        repoId: projectRepo.id,
        branchName,
        syncState: 'IN_PROGRESS',
      });

      // Mirror the start of work into Notion (best-effort). Only when the link
      // captured an in-progress value — otherwise Notion stays untouched until done.
      if (linkedTask.inProgressValue !== null && linkedTask.inProgressValue !== '') {
        try {
          await this.notion.markTaskInProgress(
            linkedTask.notionTaskPageId,
            linkedTask.completionPropertyName,
            linkedTask.completionPropertyType,
            linkedTask.inProgressValue,
          );
        } catch (error) {
          console.warn(`Notion in-progress sync failed on push for task ${linkedTask.notionTaskPageId}:`, (error as any)?.message);
        }
      }
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

    // A PR fires many events (opened → synchronize → closed) all sharing the same
    // pr.id, so upsert and refresh the title/url instead of create (which would
    // violate the unique (repoId, githubId, type) constraint on the 2nd event).
    const activity =
    await this.prisma.githubActivity.upsert({
      where: {
        repoId_githubId_type: {
          repoId: projectRepo.id,
          githubId: String(pr.id),
          type: 'pull_request',
        },
      },
      update: {
        title: `${payload.action} PR #${pr.number}: ${pr.title}`,
        url: pr.html_url,
      },
      create: {
        projectId: projectRepo.projectId,
        repoId: projectRepo.id,
        type: 'pull_request',
        title: `${payload.action} PR #${pr.number}: ${pr.title}`,
        author: pr.user.login,
        githubId: String(pr.id),
        url: pr.html_url,
        createdAt: pr.created_at ? new Date(pr.created_at) : new Date(),
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
      this.gateway.emitTaskSync(projectRepo.projectId, {
        repoId: projectRepo.id,
        branchName,
        syncState: 'IN_REVIEW',
      });
      return;
    }
    
    if(action === 'closed'){
      if(merged === true && baseBranch === linkedTask.targetBranch){

        // Review gate is opt-in per link. Default (requireApproval=false) lets a
        // plain merge complete the task — the common solo / self-merge flow.
        if(linkedTask.requireApproval){
          const hasApprovedReview = await this.getReviewState(repo.owner.login, repo.name, pr.number, githubToken);
          if(!hasApprovedReview) return;
        }

        // Push completion to Notion first. If it fails, leave the link intact
        // (untouched) so a later webhook/Sync can retry — don't unlink yet.
        await this.notion.markTaskComplete(
          linkedTask.notionTaskPageId,
          linkedTask.completionPropertyName,
          linkedTask.completionPropertyType,
          linkedTask.completionValue,
        );

        // Task is done — auto-unlink so the branch frees up and the widget
        // reflects completion. The merge stays recorded in GithubActivity.
        await this.prisma.taskBranchSync.delete({ where: { id: linkedTask.id } });
        this.gateway.emitTaskSync(projectRepo.projectId, {
          repoId: projectRepo.id,
          branchName,
          syncState: 'DONE',
          unlinked: true,
        });

        return;
      }

      if(merged === false){
        // PR closed without merging (e.g. declined) — keep the task's current
        // state unchanged, just record the PR number and timestamp.
        await this.prisma.taskBranchSync.update({
          where: { id: linkedTask.id },
          data: { prNumber: pr.number, lastSyncedAt: new Date() },
        });
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
    await this.prisma.githubActivity.upsert({
      where: {
        repoId_githubId_type: {
          repoId: projectRepo.id,
          githubId: String(issue.id),
          type: 'issue',
        },
      },
      update: {
        title: `${payload.action} issue #${issue.number}: ${issue.title}`,
        url: issue.html_url,
      },
      create: {
        projectId: projectRepo.projectId,
        repoId: projectRepo.id,
        type: 'issue',
        title: `${payload.action} issue #${issue.number}: ${issue.title}`,
        author: issue.user.login,
        githubId: String(issue.id),
        url: issue.html_url,
        createdAt: issue.created_at ? new Date(issue.created_at) : new Date(),
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
    inProgressValue?: unknown,
    requireApproval = false,
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

    // Check if the branch already has commits — if so, start in IN_PROGRESS
    // so the task status reflects reality immediately on linking.
    let initialState: 'LINKED' | 'IN_PROGRESS' = 'LINKED';
    try {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId },
        include: { owner: true, repositories: { where: { id: repoId } } },
      });
      const repo = project?.repositories[0];
      const token = project?.owner?.githubToken;
      if (repo && token) {
        const resp = await axios.get(
          `https://api.github.com/repos/${repo.githubOwner}/${repo.githubRepo}/commits?sha=${encodeURIComponent(branchName)}&per_page=1`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
        );
        if (Array.isArray(resp.data) && resp.data.length > 0) {
          initialState = 'IN_PROGRESS';
        }
      }
    } catch {
      // Non-fatal — default to LINKED if GitHub check fails
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
        inProgressValue: inProgressValue === undefined ? undefined : (inProgressValue as any),
        requireApproval: requireApproval,
        branchName: branchName,
        targetBranch: targetBranch,
        syncState: initialState,
      }
    });

    // If the branch already had commits, the task is starting in IN_PROGRESS —
    // reflect that in Notion too (best-effort; the local link still stands if it fails).
    if (initialState === 'IN_PROGRESS' && inProgressValue !== undefined && inProgressValue !== '') {
      try {
        await this.notion.markTaskInProgress(
          taskId,
          completionPropertyName,
          completionPropertyType,
          inProgressValue,
        );
      } catch (error) {
        console.warn(`Notion in-progress sync failed on link for task ${taskId}:`, (error as any)?.message);
      }
    }

    return linkedTask;
  }

  async disconnectRepository(projectId: string, repoId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
      include: { owner: true },
    });
    if (!project) {
      throw new ForbiddenException('Only the project owner can disconnect a repository');
    }

    const repo = await this.prisma.projectRepository.findFirst({
      where: { id: repoId, projectId },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found in this project');
    }

    // Best-effort: delete the webhook from GitHub
    if (project.owner.githubToken && process.env.GITHUB_WEBHOOK_URL) {
      try {
        const hooksResp = await axios.get(
          `https://api.github.com/repos/${repo.githubOwner}/${repo.githubRepo}/hooks`,
          { headers: { Authorization: `Bearer ${project.owner.githubToken}`, Accept: 'application/vnd.github+json' } },
        );
        const hook = hooksResp.data.find(
          (h: any) => h.config?.url === process.env.GITHUB_WEBHOOK_URL,
        );
        if (hook) {
          await axios.delete(
            `https://api.github.com/repos/${repo.githubOwner}/${repo.githubRepo}/hooks/${hook.id}`,
            { headers: { Authorization: `Bearer ${project.owner.githubToken}`, Accept: 'application/vnd.github+json' } },
          );
        }
      } catch (err: any) {
        console.warn(`Could not delete GitHub webhook for ${repo.githubOwner}/${repo.githubRepo}:`, err?.message);
      }
    }

    // Cascade: delete task-branch links, then the repo record
    await this.prisma.taskBranchSync.deleteMany({ where: { repoId } });
    await this.prisma.githubActivity.deleteMany({ where: { repoId } });
    await this.prisma.projectRepository.delete({ where: { id: repoId } });

    return { ok: true };
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
