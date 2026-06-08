import { Controller, Get, Post, Param, Body, BadRequestException, Headers, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZoomService } from './zoom.service';
import { scheduleMeetingSchema } from './dto/schedule-meeting.dto';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('zoom')
export class ZoomController {
    constructor(private readonly zoom: ZoomService) {}

    @UseGuards(JwtAuthGuard)
    @Post('meetings')
    async schedule(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
        try {
            const validated = scheduleMeetingSchema.parse(body);
            return this.zoom.scheduleMeeting({ ...validated, hostUserId: req.user.id });
        } catch (error: any) {
            throw new BadRequestException(error.errors ?? error.message);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get('meetings')
    async list(@Req() req: AuthenticatedRequest) {
        return this.zoom.listMeetings(req.user.id);
    }

    // ACL-filtered meetings for a specific project (group-zoom)
    @UseGuards(JwtAuthGuard)
    @Get('projects/:projectId/meetings')
    async listForProject(
        @Param('projectId') projectId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.zoom.listProjectMeetings(projectId, req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('zak')
    async zak() {
        return { zak: await this.zoom.getZak() };
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
