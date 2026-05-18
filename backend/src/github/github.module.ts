import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { PrismaModule } from '../prisma/prisma.module' 
<<<<<<< HEAD
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [PrismaModule, ActivityModule],
=======
import { NotionModule } from 'src/notion/notion.module';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [PrismaModule, NotionModule, ActivityModule],
>>>>>>> biometric
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule {}