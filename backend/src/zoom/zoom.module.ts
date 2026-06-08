import { Module } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { ConfigModule } from '@nestjs/config';
import { TranscriptsModule } from '../transcript/transcripts.module';
import { SummariesModule } from '../summaries/summaries.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [ConfigModule, TranscriptsModule, SummariesModule, PrismaModule, AuthModule, RolesModule],
  controllers: [ZoomController],
  providers: [ZoomService],
})
export class ZoomModule {}
