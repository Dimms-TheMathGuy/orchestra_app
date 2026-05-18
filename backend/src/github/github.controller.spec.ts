import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

describe('GithubController', () => {
  let controller: GithubController;
  let githubService: {
    connect: jest.Mock;
    getUserRepos: jest.Mock;
    linkRepository: jest.Mock;
    linkTaskToBranch: jest.Mock;
    getActivities: jest.Mock;
    sync: jest.Mock;
    verifyWebhookSignature: jest.Mock;
    processEvent: jest.Mock;
    githubStatus: jest.Mock;
  };

  beforeEach(async () => {
    githubService = {
      connect: jest.fn(),
      getUserRepos: jest.fn(),
      linkRepository: jest.fn(),
      linkTaskToBranch: jest.fn(),
      getActivities: jest.fn(),
      sync: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      processEvent: jest.fn(),
      githubStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [{ provide: GithubService, useValue: githubService }],
    }).compile();

    controller = module.get<GithubController>(GithubController);
  });

  it('passes validated task-branch-sync payload to service', async () => {
    const body = {
      repoId: 'repo-1',
      taskId: 'task-1',
      branchName: 'feature/github-sync',
      targetBranch: 'main',
      databaseId: 'db-1',
      completionPropertyName: 'Status',
      completionPropertyType: 'status',
      completionValue: 'Done',
    };

    await controller.linkTaskToBranch('project-1', body);

    expect(githubService.linkTaskToBranch).toHaveBeenCalledWith(
      'project-1',
      'repo-1',
      'task-1',
      'feature/github-sync',
      'main',
      'db-1',
      'Status',
      'status',
      'Done',
    );
  });

  it('throws BadRequestException for invalid task-branch-sync payload', async () => {
    const invalidBody = {
      repoId: 'repo-1',
      branchName: 'feature/github-sync',
    };

    await expect(controller.linkTaskToBranch('project-1', invalidBody)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('verifies signature before processing webhook payload', async () => {
    const payload = {
      repository: {
        owner: { login: 'acme' },
        name: 'orchestra',
      },
    };
    const headers = {
      'x-github-event': 'pull_request',
      'x-hub-signature-256': 'sha256=test-signature',
    };
    const req = {
      rawBody: Buffer.from(JSON.stringify(payload)),
    } as any;

    await controller.handleWebhook(payload, headers, req);

    expect(githubService.verifyWebhookSignature).toHaveBeenCalledWith(
      payload,
      req.rawBody,
      'sha256=test-signature',
    );
    expect(githubService.processEvent).toHaveBeenCalledWith('pull_request', payload);
  });

  it('passes projectId to getActivities', () => {
    controller.getActivities('project-1');

    expect(githubService.getActivities).toHaveBeenCalledWith('project-1');
  });
});
