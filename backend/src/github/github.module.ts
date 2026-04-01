import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { PrismaModule } from '../prisma/prisma.module' 
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [PrismaModule, ActivityModule],
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule {}