import { Controller, Get, Param } from '@nestjs/common'
import { ZoomService } from './zoom.service'
import { TranscriptsService } from '../transcript/transcripts.service'

@Controller('zoom')
export class ZoomController {
    constructor(
        private readonly zoomService: ZoomService,
        private readonly transcriptsService: TranscriptsService
    ) { }

    @Get(':meetingId')
    async getTranscript(@Param('meetingId') meetingId: string) {

        const result = await this.zoomService.retrieveTranscript(meetingId)

        const saved = this.transcriptsService.upload(
            result.meetingId,
            result.text
        )

        return saved
    }
}