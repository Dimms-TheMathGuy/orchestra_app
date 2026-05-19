import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SummariesModule } from '../summaries/summaries.module';
import { TranscriptsModule } from '../transcript/transcripts.module';
import { MeetingReviewController } from './meeting-review.controller';
import { MeetingReviewService } from './meeting-review.service';

@Module({
  imports: [PrismaModule, TranscriptsModule, SummariesModule],
  controllers: [MeetingReviewController],
  providers: [MeetingReviewService],
})
export class MeetingReviewModule {}
