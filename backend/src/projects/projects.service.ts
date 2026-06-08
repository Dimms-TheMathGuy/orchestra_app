import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
  ) {}

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

    // Seed default roles + assign PM role to owner (outside main transaction)
    await this.rolesService.seedProjectRoles(project.id, userId);

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
            projectRole: true,
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
            projectRole: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        repositories: {
          select: {
            id: true,
            githubOwner: true,
            githubRepo: true,
            githubUrl: true,
          },
          orderBy: { createdAt: 'asc' },
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

  async updateProject(
    projectId: string,
    userId: string,
    data: { name?: string; description?: string },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can edit this project');
    }

    const updateData: { name?: string; description?: string | null } = {};
    if (typeof data.name === 'string' && data.name.trim()) {
      updateData.name = data.name.trim();
    }
    if (typeof data.description === 'string') {
      updateData.description = data.description.trim() || null;
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    return this.findProjectById(projectId, userId);
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

  async addMember(projectId: string, requesterId: string, email: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== requesterId) {
      throw new ForbiddenException('Only the project owner can add members');
    }

    const userToAdd = await this.prisma.user.findUnique({ where: { email } });
    if (!userToAdd) throw new NotFoundException(`No user found with email: ${email}`);

    const alreadyMember = project.members.some((m) => m.userId === userToAdd.id);
    if (alreadyMember) throw new BadRequestException('User is already a member of this project');

    await this.prisma.projectMember.create({
      data: { projectId, userId: userToAdd.id, role: 'MEMBER' },
    });

    return { id: userToAdd.id, name: userToAdd.name, email: userToAdd.email, avatarUrl: userToAdd.avatarUrl };
  }

  async removeMember(projectId: string, requesterId: string, memberUserId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== requesterId) {
      throw new ForbiddenException('Only the project owner can remove members');
    }
    if (memberUserId === requesterId) {
      throw new BadRequestException('Owner cannot remove themselves');
    }

    await this.prisma.projectMember.deleteMany({
      where: { projectId, userId: memberUserId },
    });

    return { removed: memberUserId };
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
        projectRole: member.projectRole ?? null,
        joinedAt: member.joinedAt,
        user: member.user,
      })),
      stats: {
        memberCount,
        repositoryCount: project._count.repositories,
        meetingCount: project._count.meetings,
        messageCount: project._count.messages,
      },
      notionDbId: project.notionDbId ?? null,
      repositories: project.repositories ?? [],
      integrations: {
        notion: Boolean(project.notionDbId),
        github: project._count.repositories > 0,
        zoom: Boolean(project.zoomMeetingId),
      },
    };
  }
}
