import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksScheduler } from './tasks.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotionModule } from '../notion/notion.module';

@Module({
  imports: [PrismaModule, AuthModule, NotionModule],
  controllers: [TasksController],
  providers: [TasksService, TasksScheduler],
})
export class TasksModule {}
