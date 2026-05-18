import { Test, TestingModule } from '@nestjs/testing';
import { ActivityGateway } from 'src/activity/activity.gateway';
import { NotionService } from 'src/notion/notion.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GithubService } from './github.service';

describe('GithubService', () => {
  let service: GithubService;
  let prismaService: any;
  let gateway: { emitToProject: jest.Mock };
  let notionService: { markTaskComplete: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      projectRepository: {
        findFirst: jest.fn(),
      },
      githubActivity: {
        create: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      taskBranchSync: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    gateway = {
      emitToProject: jest.fn(),
    };

    notionService = {
      markTaskComplete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ActivityGateway, useValue: gateway },
        { provide: NotionService, useValue: notionService },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
  });

  const payloadFactory = (overrides?: Partial<any>) => ({
    action: 'opened',
    repository: {
      owner: { login: 'acme' },
      name: 'orchestra',
    },
    pull_request: {
      id: 101,
      number: 7,
      title: 'Add GitHub sync',
      html_url: 'https://github.com/acme/orchestra/pull/7',
      created_at: '2026-04-01T00:00:00.000Z',
      merged: false,
      user: { login: 'reviewer-1' },
      head: { ref: 'feature/github-sync' },
      base: { ref: 'main' },
    },
    ...overrides,
  });

  const linkedTaskFactory = (overrides?: Partial<any>) => ({
    id: 'sync-1',
    projectId: 'project-1',
    repoId: 'repo-1',
    notionTaskPageId: 'page-1',
    notionDatabaseId: 'db-1',
    completionPropertyName: 'Status',
    completionPropertyType: 'status',
    completionValue: 'Done',
    branchName: 'feature/github-sync',
    targetBranch: 'main',
    prNumber: null,
    syncState: 'LINKED',
    latestRepoChange: null,
    lastSyncedAt: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(() => {
    prismaService.projectRepository.findFirst.mockResolvedValue({
      id: 'repo-1',
      projectId: 'project-1',
      githubOwner: 'acme',
      githubRepo: 'orchestra',
    });

    prismaService.githubActivity.create.mockResolvedValue({
      id: 'activity-1',
      projectId: 'project-1',
      repoId: 'repo-1',
    });

    prismaService.project.findFirst.mockResolvedValue({
      id: 'project-1',
      ownerId: 'user-1',
    });

    prismaService.user.findFirst.mockResolvedValue({
      id: 'user-1',
      githubToken: 'github-token',
    });

    prismaService.taskBranchSync.findUnique.mockResolvedValue(linkedTaskFactory());
    prismaService.taskBranchSync.update.mockResolvedValue(undefined);

    jest.spyOn(service, 'getReviewState').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves a linked task to IN_REVIEW when a PR is opened', async () => {
    const payload = payloadFactory({ action: 'opened' });

    await service.handlePullRequest(payload);

    expect(prismaService.taskBranchSync.update).toHaveBeenCalledWith({
      where: { id: 'sync-1' },
      data: {
        prNumber: 7,
        syncState: 'IN_REVIEW',
        lastSyncedAt: expect.any(Date),
      },
    });
    expect(notionService.markTaskComplete).not.toHaveBeenCalled();
  });

  it('moves a linked task back to IN_PROGRESS when a PR closes without merge', async () => {
    const payload = payloadFactory({
      action: 'closed',
      pull_request: {
        ...payloadFactory().pull_request,
        merged: false,
      },
    });

    await service.handlePullRequest(payload);

    expect(prismaService.taskBranchSync.update).toHaveBeenCalledWith({
      where: { id: 'sync-1' },
      data: {
        prNumber: 7,
        syncState: 'IN_PROGRESS',
        lastSyncedAt: expect.any(Date),
      },
    });
    expect(notionService.markTaskComplete).not.toHaveBeenCalled();
  });

  it('marks the task DONE and updates Notion when merged PR has approved reviews', async () => {
    const payload = payloadFactory({
      action: 'closed',
      pull_request: {
        ...payloadFactory().pull_request,
        merged: true,
      },
    });

    await service.handlePullRequest(payload);

    expect(service.getReviewState).toHaveBeenCalledWith(
      'acme',
      'orchestra',
      7,
      'github-token',
    );
    expect(notionService.markTaskComplete).toHaveBeenCalledWith(
      'page-1',
      'Status',
      'status',
      'Done',
    );
    expect(prismaService.taskBranchSync.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'sync-1' },
      data: {
        prNumber: 7,
        syncState: 'DONE',
        lastSyncedAt: expect.any(Date),
      },
    });
  });

  it('does not mark the task DONE when merged PR has no approved review', async () => {
    (service.getReviewState as jest.Mock).mockResolvedValue(false);

    const payload = payloadFactory({
      action: 'closed',
      pull_request: {
        ...payloadFactory().pull_request,
        merged: true,
      },
    });

    await service.handlePullRequest(payload);

    expect(notionService.markTaskComplete).not.toHaveBeenCalled();
    expect(prismaService.taskBranchSync.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          syncState: 'DONE',
        }),
      }),
    );
  });
});
