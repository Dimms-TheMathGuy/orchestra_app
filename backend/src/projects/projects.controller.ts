import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { createProjectSchema } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async createProject(
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const validated = createProjectSchema.parse(body);

      return this.projectsService.createProject(req.user.id, validated);
    } catch (error: any) {
      throw new BadRequestException(error.errors ?? error.message);
    }
  }

  @Get()
  getProjects(@Req() req: AuthenticatedRequest) {
    return this.projectsService.findProjectsForUser(req.user.id);
  }

  @Get(':projectId')
  getProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectsService.findProjectById(projectId, req.user.id);
  }
}
