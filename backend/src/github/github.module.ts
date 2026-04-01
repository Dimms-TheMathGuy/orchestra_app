import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { PrismaModule } from '../prisma/prisma.module'
import { NotionModule } from 'src/notion/notion.module';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [PrismaModule, NotionModule, ActivityModule],
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule { }