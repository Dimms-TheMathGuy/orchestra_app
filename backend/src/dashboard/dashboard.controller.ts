import { Body, Controller, Post } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post()
  getDashboard(@Body() body: { userId: string }) {
    return this.dashboardService.getDashboard(body.userId);
  }
}