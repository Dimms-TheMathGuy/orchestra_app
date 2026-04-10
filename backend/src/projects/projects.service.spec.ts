import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: {
    $transaction: jest.Mock;
    project: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    projectMember: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      project: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      projectMember: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('creates a project and adds the owner as a member', async () => {
    const createdProject = {
      id: 'project-1',
      name: 'Project Alpha',
      description: 'Initial project',
      ownerId: 'user-1',
      notionDbId: null,
      zoomMeetingId: null,
      createdAt: new Date('2026-04-10T12:00:00.000Z'),
      owner: {
        id: 'user-1',
        name: 'Alex',
        email: 'alex@example.com',
      },
      members: [
        {
          id: 'member-1',
          userId: 'user-1',
          role: 'OWNER',
          joinedAt: new Date('2026-04-10T12:00:00.000Z'),
          user: {
            id: 'user-1',
            name: 'Alex',
            email: 'alex@example.com',
            avatarUrl: null,
          },
        },
      ],
      _count: {
        repositories: 0,
        meetings: 0,
        messages: 0,
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        project: {
          create: prisma.project.create,
        },
        projectMember: {
          create: prisma.projectMember.create,
        },
      }),
    );
    prisma.project.create.mockResolvedValue({
      id: 'project-1',
      name: 'Project Alpha',
      description: 'Initial project',
      ownerId: 'user-1',
      createdAt: createdProject.createdAt,
    });
    prisma.projectMember.create.mockResolvedValue({
      id: 'member-1',
    });
    prisma.project.findUnique.mockResolvedValue(createdProject);

    const result = await service.createProject('user-1', {
      name: 'Project Alpha',
      description: 'Initial project',
    });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: 'Project Alpha',
        description: 'Initial project',
        ownerId: 'user-1',
      },
    });
    expect(prisma.projectMember.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        projectId: 'project-1',
        role: 'OWNER',
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'project-1',
        name: 'Project Alpha',
        integrations: {
          notion: false,
          github: false,
          zoom: false,
        },
      }),
    );
  });

  it('lists projects visible to the current user', async () => {
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Project Alpha',
        description: null,
        ownerId: 'user-1',
        notionDbId: null,
        zoomMeetingId: null,
        createdAt: new Date('2026-04-10T12:00:00.000Z'),
        owner: {
          id: 'user-1',
          name: 'Alex',
          email: 'alex@example.com',
        },
        members: [
          {
            id: 'member-1',
            userId: 'user-1',
            role: 'OWNER',
            joinedAt: new Date('2026-04-10T12:00:00.000Z'),
            user: {
              id: 'user-1',
              name: 'Alex',
              email: 'alex@example.com',
              avatarUrl: null,
            },
          },
        ],
        _count: {
          repositories: 1,
          meetings: 2,
          messages: 3,
        },
      },
    ]);

    const result = await service.findProjectsForUser('user-1');

    expect(prisma.project.findMany).toHaveBeenCalled();
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'project-1',
        stats: {
          memberCount: 1,
          repositoryCount: 1,
          meetingCount: 2,
          messageCount: 3,
        },
        integrations: {
          notion: false,
          github: true,
          zoom: false,
        },
      }),
    );
  });
});
