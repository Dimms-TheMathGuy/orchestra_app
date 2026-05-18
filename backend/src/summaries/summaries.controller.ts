import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { SummariesService } from './summaries.service'
import { updateDraftSchema } from './dto/update-draft.dto'

@Controller('summaries')
export class SummariesController {

    constructor(private summaries: SummariesService) { }

    @Post(':meetingId')
    generate(@Param('meetingId') id: string, @Body('blockId') blockId: string) {

        return this.summaries.generate(id, blockId)

    }

    @Get(':meetingId')
    getSummary(@Param('meetingId') id: string) {

        return this.summaries.findByMeeting(id)

    }

    @Patch(':meetingId/drafts/:draftId')
    updateDraft(@Param('meetingId') id: string, @Param('draftId') draftId: string, @Body() body: unknown) {

        try {
            const validated = updateDraftSchema.parse(body);
            return this.summaries.updateDraft(id, draftId, validated.entries)
        } catch (error: any) {
            throw new BadRequestException(error.issues ?? error.errors ?? error.message)
        }

    }

    @Post(':meetingId/drafts/:draftId/cancel')
    cancelDraft(@Param('meetingId') id: string, @Param('draftId') draftId: string) {

        return this.summaries.cancelDraft(id, draftId)

    }

    @Post(':meetingId/drafts/:draftId/approve')
    approveSummary(@Param('meetingId') id: string, @Param('draftId') draftId: string) {

        return this.summaries.approveDraft(id, draftId)

    }

}
