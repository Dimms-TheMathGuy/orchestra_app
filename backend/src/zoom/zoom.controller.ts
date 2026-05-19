import { Controller, Get, Post, Param, Body, BadRequestException, Headers } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { scheduleMeetingSchema } from './dto/schedule-meeting.dto';

@Controller('zoom')
export class ZoomController {
    constructor(private readonly zoom: ZoomService) {}

    @Post('meetings')
    async schedule(@Body() body: unknown) {
        try {
            const validated = scheduleMeetingSchema.parse(body);
            return this.zoom.scheduleMeeting(validated);
        } catch (error: any) {
            throw new BadRequestException(error.errors ?? error.message);
        }
    }

    @Get('meetings')
    async list() {
        return this.zoom.listMeetings();
    }

    @Get('meetings/:meetingId/recordings')
    async recordings(@Param('meetingId') meetingId: string) {
        return this.zoom.getMeetingRecordings(meetingId);
    }

    @Get('meetings/:meetingId/transcript')
    async transcript(@Param('meetingId') meetingId: string) {
        return this.zoom.retrieveTranscript(meetingId);
    }

    @Get(':meetingId')
    async getTranscript(@Param('meetingId') meetingId: string) {
        return this.zoom.retrieveTranscript(meetingId);
    }

    @Post('webhook')
    async webhook(
        @Body() body: any,
        @Headers('x-zm-signature') signature: string,
    ) {
        this.zoom.verifyWebhookSignature(body, signature);
        return this.zoom.handleWebhook(body);
    }
}
