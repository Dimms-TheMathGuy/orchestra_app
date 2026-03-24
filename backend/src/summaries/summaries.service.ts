import { Injectable } from '@nestjs/common'
import { GeminiService } from 'src/gemini/gemini.service'
import { TranscriptsService } from 'src/transcript/transcripts.service'
import { NotionService } from 'src/notion/notion.service'

type Summary = {
    id: number;
    meetingId: number;
    content: string;
};

@Injectable()
export class SummariesService {

    private summaries: Summary[] = [];

    constructor(
        private gemini: GeminiService,
        private transcripts: TranscriptsService,
        private notion: NotionService
    ) { };

    async generate(meetingId: number, blockId: string) {

        const transcript = this.transcripts.findByMeeting(meetingId);
        if (!transcript) {
            return { error: "Transcript not found" }
        }

        const SchemaContext = await this.notion.fetchBlockChildren(blockId);

        const summaryText = await this.gemini.summarize(transcript.text, SchemaContext);

        const summary = {
            id: Date.now(),
            meetingId,
            content: summaryText
        }

        this.summaries.push(summary);

        return summary;
    }

    findByMeeting(meetingId: number) {

        return this.summaries.find((s) => s.meetingId === meetingId);

    }

}