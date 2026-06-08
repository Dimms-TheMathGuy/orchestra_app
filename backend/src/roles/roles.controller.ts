import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesService } from './roles.service';
import type { Request } from 'express';

type AuthReq = Request & { user: { id: string } };

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /** List all roles defined for this project */
  @Get()
  getProjectRoles(@Param('projectId') projectId: string) {
    return this.rolesService.getProjectRoles(projectId);
  }

  /** PM fetches all role requests (any status) */
  @Get('requests')
  getRequests(
    @Param('projectId') projectId: string,
    @Req() req: AuthReq,
  ) {
    return this.rolesService.getPendingRequests(projectId, req.user.id);
  }

  /** Member submits a role claim request */
  @Post('request')
  requestRole(
    @Param('projectId') projectId: string,
    @Body() body: { roleId: string; message?: string },
    @Req() req: AuthReq,
  ) {
    return this.rolesService.requestRole(
      req.user.id,
      projectId,
      body.roleId,
      body.message,
    );
  }

  /** PM approves or rejects a role request */
  @Patch('requests/:requestId/review')
  reviewRequest(
    @Param('requestId') requestId: string,
    @Body() body: { action: 'approve' | 'reject' },
    @Req() req: AuthReq,
  ) {
    return this.rolesService.reviewRequest(requestId, req.user.id, body.action);
  }

  /** PM directly assigns (or clears with null) a role to a member */
  @Patch('members/:memberUserId/assign')
  assignRole(
    @Param('projectId') projectId: string,
    @Param('memberUserId') memberUserId: string,
    @Body() body: { roleId: string | null },
    @Req() req: AuthReq,
  ) {
    return this.rolesService.assignRole(
      projectId,
      req.user.id,
      memberUserId,
      body.roleId,
    );
  }
}
