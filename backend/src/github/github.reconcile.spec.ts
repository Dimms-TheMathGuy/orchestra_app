import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { ActivityGateway } from 'src/activity/activity.gateway';
import { NotionService } from 'src/notion/notion.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GithubService } from './github.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GithubService — reconcileTaskBranches', () => {
  let service: GithubService;
  let prismaService: any;
  let notionService: { markTaskComplete: jest.Mock; markTaskInProgress: jest.Mock };
  let gateway: { emitToProject: jest.Mock; emitTaskSync: jest.Mock };

  const repo = { id: 'repo-1', githubOwner: 'acme', githubRepo: 'orchestra' };
  const token = 'github-token';

  const linkFactory = (overrides?: Partial<any>) => ({
    id: 'sync-1',
    projectId: 'project-1',
    repoId: 'repo-1',
    notionTaskPageId: 'page-1',
    notionDatabaseId: 'db-1',
    completionPropertyName: 'Status',
    completionPropertyType: 'status',
    completionValue: 'Done',
    inProgressValue: null,
    requireApproval: false,
    branchName: 'feature/x',
    targetBranch: 'main',
    prNumber: null,
    syncState: 'LINKED',
    ...overrides,
  });

  // Route axios.get by URL: PRs, commits, or reviews.
  const stubGitHub = (opts: { prs?: any[]; hasCommits?: boolean; reviews?: any[] }) => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/reviews')) return Promise.resolve({ data: opts.reviews ?? [] });
      if (url.includes('/pulls')) return Promise.resolve({ data: opts.prs ?? [] });
      if (url.includes('/commits')) {
        return Promise.resolve({ data: opts.hasCommits ? [{ sha: 'abc' }] : [] });
      }
      return Promise.resolve({ data: [] });
    });
  };

  beforeEach(async () => {
    prismaService = {
      taskBranchSync: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    };
    notionService = { markTaskComplete: jest.fn(), markTaskInProgress: jest.fn() };
    gateway = { emitToProject: jest.fn(), emitTaskSync: jest.fn() };

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

  afterEach(() => jest.clearAllMocks());

  it('marks the task DONE in Notion when a merged PR into the target branch is found', async () => {
    prismaService.taskBranchSync.findMany.mockResolvedValue([linkFactory({ syncState: 'IN_PROGRESS' })]);
    stubGitHub({ prs: [{ number: 7, merged_at: '2026-06-01T00:00:00Z', state: 'closed', base: { ref: 'main' } }] });

    const updated = await service.reconcileTaskBranches(repo, token);

    expect(updated).toBe(1);
    expect(notionService.markTaskComplete).toHaveBeenCalledWith('page-1', 'Status', 'status', 'Done');
    // Completing a task auto-unlinks it.
    expect(prismaService.taskBranchSync.delete).toHaveBeenCalledWith({ where: { id: 'sync-1' } });
    expect(gateway.emitTaskSync).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ syncState: 'DONE', unlinked: true }),
    );
  });

  it('moves to IN_REVIEW (no Notion write) when an open PR exists', async () => {
    prismaService.taskBranchSync.findMany.mockResolvedValue([linkFactory({ syncState: 'IN_PROGRESS' })]);
    stubGitHub({ prs: [{ number: 8, merged_at: null, state: 'open', base: { ref: 'main' } }] });

    const updated = await service.reconcileTaskBranches(repo, token);

    expect(updated).toBe(1);
    expect(notionService.markTaskComplete).not.toHaveBeenCalled();
    expect(prismaService.taskBranchSync.update).toHaveBeenCalledWith({
      where: { id: 'sync-1' },
      data: { syncState: 'IN_REVIEW', prNumber: 8, lastSyncedAt: expect.any(Date) },
    });
  });

  it('moves LINKED→IN_PROGRESS and writes the in-progress value when the branch has commits', async () => {
    prismaService.taskBranchSync.findMany.mockResolvedValue([
      linkFactory({ syncState: 'LINKED', inProgressValue: 'In progress' }),
    ]);
    stubGitHub({ prs: [], hasCommits: true });

    const updated = await service.reconcileTaskBranches(repo, token);

    expect(updated).toBe(1);
    expect(notionService.markTaskInProgress).toHaveBeenCalledWith('page-1', 'Status', 'status', 'In progress');
    expect(prismaService.taskBranchSync.update).toHaveBeenCalledWith({
      where: { id: 'sync-1' },
      data: { syncState: 'IN_PROGRESS', prNumber: null, lastSyncedAt: expect.any(Date) },
    });
  });

  it('does NOT complete a merged PR when requireApproval is on and there is no approval', async () => {
    prismaService.taskBranchSync.findMany.mockResolvedValue([
      linkFactory({ syncState: 'IN_PROGRESS', requireApproval: true }),
    ]);
    stubGitHub({
      prs: [{ number: 9, merged_at: '2026-06-01T00:00:00Z', state: 'closed', base: { ref: 'main' } }],
      reviews: [{ state: 'COMMENTED', user: { login: 'r1' }, submitted_at: '2026-06-01T00:00:00Z' }],
    });

    const updated = await service.reconcileTaskBranches(repo, token);

    expect(notionService.markTaskComplete).not.toHaveBeenCalled();
    expect(prismaService.taskBranchSync.update).toHaveBeenCalledWith({
      where: { id: 'sync-1' },
      data: { syncState: 'IN_REVIEW', prNumber: 9, lastSyncedAt: expect.any(Date) },
    });
    expect(updated).toBe(1);
  });

  it('ignores a merged PR that was merged before the link was created (reused branch name)', async () => {
    // Link created at noon; PR on the same branch was merged hours earlier in a
    // previous cycle. The stale merge must NOT complete the freshly-linked task.
    prismaService.taskBranchSync.findMany.mockResolvedValue([
      linkFactory({ syncState: 'IN_PROGRESS', createdAt: new Date('2026-06-09T12:00:00Z') }),
    ]);
    stubGitHub({
      prs: [{ number: 1, merged_at: '2026-06-09T07:30:00Z', state: 'closed', base: { ref: 'main' } }],
      hasCommits: true,
    });

    const updated = await service.reconcileTaskBranches(repo, token);

    expect(updated).toBe(0);
    expect(notionService.markTaskComplete).not.toHaveBeenCalled();
    expect(prismaService.taskBranchSync.update).not.toHaveBeenCalled();
  });

  it('completes when the merge happened after the link was created', async () => {
    prismaService.taskBranchSync.findMany.mockResolvedValue([
      linkFactory({ syncState: 'IN_PROGRESS', createdAt: new Date('2026-06-09T07:00:00Z') }),
    ]);
    stubGitHub({
      prs: [{ number: 2, merged_at: '2026-06-09T08:00:00Z', state: 'closed', base: { ref: 'main' } }],
    });

    const updated = await service.reconcileTaskBranches(repo, token);

    expect(updated).toBe(1);
    expect(notionService.markTaskComplete).toHaveBeenCalledWith('page-1', 'Status', 'status', 'Done');
  });

  it('ignores a merged PR whose base is not the linked target branch', async () => {
    prismaService.taskBranchSync.findMany.mockResolvedValue([linkFactory({ syncState: 'LINKED' })]);
    // merged into develop, not main; no commits either
    stubGitHub({ prs: [{ number: 10, merged_at: '2026-06-01T00:00:00Z', state: 'closed', base: { ref: 'develop' } }], hasCommits: false });

    const updated = await service.reconcileTaskBranches(repo, token);

    expect(updated).toBe(0);
    expect(notionService.markTaskComplete).not.toHaveBeenCalled();
    expect(prismaService.taskBranchSync.update).not.toHaveBeenCalled();
  });

  it('skips links already in DONE', async () => {
    prismaService.taskBranchSync.findMany.mockResolvedValue([linkFactory({ syncState: 'DONE' })]);

    const updated = await service.reconcileTaskBranches(repo, token);

    expect(updated).toBe(0);
    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(prismaService.taskBranchSync.update).not.toHaveBeenCalled();
  });
});
