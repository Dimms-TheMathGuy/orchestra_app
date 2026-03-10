import { Injectable } from '@nestjs/common'
import { GeminiService } from '../gemini/gemini.service'
import { TranscriptsService } from '../transcripts/transcripts.service'

@Injectable()
export class SummariesService {

    private summaries = []

    constructor(
        private gemini: GeminiService,
        private transcripts: TranscriptsService
    ) { }

    async generate(meetingId: number) {

        const transcript = this.transcripts.findByMeeting(meetingId)

        if (!transcript) {
            return { error: "Transcript not found" }
        }

        const summaryText = await this.gemini.summarize(transcript.text)

        const summary = {
            id: Date.now(),
            meetingId,
            summary: summaryText
        }

        this.summaries.push(summary)

        return summary

    }

    findByMeeting(meetingId: number) {

        return this.summaries.find(s => s.meetingId === meetingId)

    }

}