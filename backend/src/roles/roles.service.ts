import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Maps each role name to its team key (null = management, no specific team). */
export const ROLE_TEAM: Record<string, string | null> = {
  project_manager: null,
  tech_lead: null,
  project_secretary: null,
  frontend_lead: 'frontend',
  frontend_dev: 'frontend',
  backend_lead: 'backend',
  backend_dev: 'backend',
  qa_lead: 'qa',
  qa_engineer: 'qa',
  design_lead: 'design',
  designer: 'design',
  devops_lead: 'devops',
  devops_engineer: 'devops',
};

export const TEAM_LABEL: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  qa: 'QA',
  design: 'Design',
  devops: 'DevOps',
};

/** Resolve the team key for a given role name. */
export function teamForRole(roleName?: string | null): string | null {
  if (!roleName) return null;
  return ROLE_TEAM[roleName] ?? null;
}

export type MemberContext = {
  isMember: boolean;
  isOwner: boolean;
  level: number; // 0=PM, 1=board, 2=lead, 3=member, 99=no role
  team: string | null;
  roleName: string | null;
};

export const DEFAULT_ROLES = [
  { name: 'project_manager',   displayName: 'Project Manager',    level: 0, isLead: false, color: '#7c3aed' },
  { name: 'tech_lead',         displayName: 'Tech Lead',          level: 1, isLead: false, color: '#3b82f6' },
  { name: 'project_secretary', displayName: 'Project Secretary',  level: 1, isLead: false, color: '#3b82f6' },
  { name: 'frontend_lead',     displayName: 'Frontend Lead',      level: 2, isLead: true,  color: '#06b6d4' },
  { name: 'backend_lead',      displayName: 'Backend Lead',       level: 2, isLead: true,  color: '#06b6d4' },
  { name: 'qa_lead',           displayName: 'QA Lead',            level: 2, isLead: true,  color: '#06b6d4' },
  { name: 'design_lead',       displayName: 'Design Lead',        level: 2, isLead: true,  color: '#06b6d4' },
  { name: 'devops_lead',       displayName: 'DevOps Lead',        level: 2, isLead: true,  color: '#06b6d4' },
  { name: 'frontend_dev',      displayName: 'Frontend Developer', level: 3, isLead: false, color: '#64748b' },
  { name: 'backend_dev',       displayName: 'Backend Developer',  level: 3, isLead: false, color: '#64748b' },
  { name: 'qa_engineer',       displayName: 'QA Engineer',        level: 3, isLead: false, color: '#64748b' },
  { name: 'designer',          displayName: 'Designer',           level: 3, isLead: false, color: '#64748b' },
  { name: 'devops_engineer',   displayName: 'DevOps Engineer',    level: 3, isLead: false, color: '#64748b' },
];

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seed default roles for a new project and assign PM role to the owner. */
  async seedProjectRoles(projectId: string, ownerUserId: string) {
    const roles = await this.prisma.$transaction(
      DEFAULT_ROLES.map((r) =>
        this.prisma.projectRole.upsert({
          where: { projectId_name: { projectId, name: r.name } },
          create: { ...r, projectId },
          update: {},
        }),
      ),
    );

    const pmRole = roles.find((r) => r.name === 'project_manager');
    if (pmRole) {
      await this.prisma.projectMember.updateMany({
        where: { projectId, userId: ownerUserId },
        data: { projectRoleId: pmRole.id },
      });
    }

    return roles;
  }

  /** All roles defined in a project, ordered by level then displayName.
   *  Auto-seeds default roles if none exist (covers projects created before this feature). */
  async getProjectRoles(projectId: string) {
    const existing = await this.prisma.projectRole.findMany({
      where: { projectId },
      orderBy: [{ level: 'asc' }, { displayName: 'asc' }],
    });

    if (existing.length > 0) return existing;

    // No roles yet — seed defaults for this existing project
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return [];

    await this.seedProjectRoles(projectId, project.ownerId);

    return this.prisma.projectRole.findMany({
      where: { projectId },
      orderBy: [{ level: 'asc' }, { displayName: 'asc' }],
    });
  }

  /** Resolve a user's hierarchy context within a project (level + team). */
  async getMemberContext(
    projectId: string,
    userId: string,
  ): Promise<MemberContext> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    const member = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
      include: { projectRole: true },
    });

    const isOwner = project?.ownerId === userId;
    const isMember = isOwner || !!member;
    const roleName = member?.projectRole?.name ?? null;
    const level = member?.projectRole?.level ?? (isOwner ? 0 : 99);
    const team = teamForRole(roleName);

    return { isMember, isOwner, level, team, roleName };
  }

  /** Member submits a role claim request (only one pending at a time). */
  async requestRole(
    userId: string,
    projectId: string,
    roleId: string,
    message?: string,
  ) {
    // Ensure role belongs to project
    const role = await this.prisma.projectRole.findFirst({
      where: { id: roleId, projectId },
    });
    if (!role) throw new NotFoundException('Role not found');

    // Block if user already has a pending request in this project
    const existing = await this.prisma.roleRequest.findFirst({
      where: { userId, projectId, status: 'PENDING' },
    });
    if (existing) {
      throw new BadRequestException(
        'You already have a pending role request for this project',
      );
    }

    return this.prisma.roleRequest.create({
      data: { userId, projectId, roleId, message: message ?? null },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        role: true,
      },
    });
  }

  /** PM fetches all pending requests for a project. */
  async getPendingRequests(projectId: string, requesterId: string) {
    await this.assertIsOwner(projectId, requesterId);

    return this.prisma.roleRequest.findMany({
      where: { projectId, status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** PM approves or rejects a role request. */
  async reviewRequest(
    requestId: string,
    reviewerId: string,
    action: 'approve' | 'reject',
  ) {
    const req = await this.prisma.roleRequest.findUnique({
      where: { id: requestId },
      include: { role: true },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Request is already reviewed');
    }

    await this.assertIsOwner(req.projectId, reviewerId);

    const updated = await this.prisma.roleRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        role: true,
      },
    });

    if (action === 'approve') {
      await this.prisma.projectMember.updateMany({
        where: { projectId: req.projectId, userId: req.userId },
        data: { projectRoleId: req.roleId },
      });
    }

    return updated;
  }

  /** PM directly assigns (or clears) a role for a member. */
  async assignRole(
    projectId: string,
    requesterId: string,
    memberUserId: string,
    roleId: string | null,
  ) {
    await this.assertIsOwner(projectId, requesterId);

    if (roleId !== null) {
      const role = await this.prisma.projectRole.findFirst({
        where: { id: roleId, projectId },
      });
      if (!role) throw new NotFoundException('Role not found');
    }

    return this.prisma.projectMember.update({
      where: { userId_projectId: { userId: memberUserId, projectId } },
      data: { projectRoleId: roleId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        projectRole: true,
      },
    });
  }

  private async assertIsOwner(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can manage roles');
    }
    return project;
  }
}
