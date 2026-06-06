import { Controller, Get, Param } from '@nestjs/common';

import { MeetingReviewService } from './meeting-review.service';

@Controller('meeting-review')
export class MeetingReviewController {
  constructor(private readonly meetingReviewService: MeetingReviewService) {}

  @Get(':projectId')
  getMeetingReview(@Param('projectId') projectId: string) {
    return this.meetingReviewService.getMeetingReview(projectId);
  }
}
