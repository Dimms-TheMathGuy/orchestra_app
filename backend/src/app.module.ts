import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/users.module';
import { NotionModule } from './notion/notion.module';
import { GithubModule } from './github/github.module';
import { TranscriptsModule } from './transcript/transcripts.module';
import { SummariesModule } from './summaries/summaries.module';
import { MeetingsModule } from './meetings/meetings.module';
import { ZoomModule } from './zoom/zoom.module';
import { ActivityGateway } from './activity/activity.gateway';
<<<<<<< HEAD
import { TranscriptsModule } from './transcript/transcripts.module';
=======
import { PasskeyModule } from './passkey/passkey.module';
import { DashboardModule } from './dashboard/dashboard.module';
>>>>>>> biometric

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    NotionModule,
<<<<<<< HEAD
    GithubModule, 
    TranscriptsModule,
=======
    GithubModule,
    TranscriptsModule,
    SummariesModule,
    MeetingsModule,
    ZoomModule,
    PasskeyModule,
    DashboardModule,
>>>>>>> biometric
  ],
  controllers: [AppController],
  providers: [AppService, ActivityGateway],
})
export class AppModule {}