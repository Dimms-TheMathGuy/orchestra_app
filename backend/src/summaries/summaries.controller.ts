import { Controller, Post, Param, Get } from '@nestjs/common'
import { SummariesService } from './summaries.service'

@Controller('summaries')
export class SummariesController {

    constructor(private summaries: SummariesService) { }

    @Post(':meetingId')
    generate(@Param('meetingId') id: string) {

        return this.summaries.generate(Number(id))

    }

    @Get(':meetingId')
    getSummary(@Param('meetingId') id: string) {

        return this.summaries.findByMeeting(Number(id))

    }

}