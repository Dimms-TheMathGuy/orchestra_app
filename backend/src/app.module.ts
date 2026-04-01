import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/users.module';
import { NotionModule } from './notion/notion.module';
import { GithubModule } from './github/github.module';
import { ActivityGateway } from './activity/activity.gateway';
import { TranscriptsModule } from './transcript/transcripts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    NotionModule,
    GithubModule, 
    TranscriptsModule,
  ],
  controllers: [AppController],
  providers: [AppService, ActivityGateway],
})
export class AppModule {}