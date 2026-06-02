import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(userId: string, dto: CreateProjectDto) {
    const description = dto.description?.trim();

    const project = await this.prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          name: dto.name.trim(),
          description: description ? description : null,
          ownerId: userId,
        },
      });

      await tx.projectMember.create({
        data: {
          userId,
          projectId: createdProject.id,
          role: 'OWNER',
        },
      });

      const memberIds = [...new Set(dto.memberIds ?? [])].filter(
        (memberId) => memberId !== userId,
      );

      if (memberIds.length > 0) {
        await tx.projectMember.createMany({
          data: memberIds.map((memberId) => ({
            userId: memberId,
            projectId: createdProject.id,
            role: 'MEMBER',
          })),
          skipDuplicates: true,
        });
      }

      return createdProject;
    });

    return this.findProjectById(project.id, userId);
  }

  async findProjectsForUser(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
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
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        _count: {
          select: {
            repositories: true,
            meetings: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects.map((project) => this.toProjectResponse(project));
  }

  async findProjectById(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        _count: {
          select: {
            repositories: true,
            meetings: true,
            messages: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const hasAccess =
      project.ownerId === userId ||
      project.members.some((member) => member.userId === userId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return this.toProjectResponse(project);
  }

  async updateStatus(
    projectId: string,
    userId: string,
    status: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the owner can change project status',
      );
    }

    return this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        status,
      },
    });
  }

  async deleteProject(
    projectId: string,
    userId: string,
  ) {
    const project = await this.findProjectById(
      projectId,
      userId,
    );

    return this.prisma.project.delete({
      where: {
        id: project.id,
      },
    });
  }

  async connectNotion(
    projectId: string,
    userId: string,
    databaseId: string,
  ) {
    await this.findProjectById(
      projectId,
      userId,
    );

    return this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        notionDbId: databaseId,
      },
    });
  }

  private toProjectResponse(project: any) {
    const memberCount = project.members.length;

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      owner: project.owner,
      members: project.members.map((member: any) => ({
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user,
      })),
      stats: {
        memberCount,
        repositoryCount: project._count.repositories,
        meetingCount: project._count.meetings,
        messageCount: project._count.messages,
      },
      integrations: {
        notion: Boolean(project.notionDbId),
        github: project._count.repositories > 0,
        zoom: Boolean(project.zoomMeetingId),
      },
    };
  }
}
