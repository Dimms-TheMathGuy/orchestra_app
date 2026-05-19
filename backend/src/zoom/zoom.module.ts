import { Module } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { ConfigModule } from '@nestjs/config';
import { TranscriptsModule } from '../transcript/transcripts.module';
import { SummariesModule } from '../summaries/summaries.module';

@Module({
  imports: [ConfigModule, TranscriptsModule, SummariesModule],
  controllers: [ZoomController],
  providers: [ZoomService],
})
export class ZoomModule {}
