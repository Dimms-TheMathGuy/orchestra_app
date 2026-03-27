import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { PrismaModule } from '../prisma/prisma.module' 
import { NotionModule } from 'src/notion/notion.module';

@Module({
  imports: [PrismaModule, NotionModule],
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule {}