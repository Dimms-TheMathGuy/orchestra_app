import { Controller, Post, Body, Get, Param } from '@nestjs/common'
import { TranscriptsService } from './transcripts.service'

@Controller('transcripts')
export class TranscriptsController {
    constructor(private transcriptsService: TranscriptsService) { }

    @Post()
    upload(@Body() body) {
        return this.transcriptsService.upload(
            body.meetingId, body.text
        )
    }
    @Get(':meetingId')
    getTranscript(@Param('meetingId') id: string) {
        return this.transcriptsService.findByMeeting(Number(id))
    }
}