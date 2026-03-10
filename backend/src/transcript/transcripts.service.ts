import { Injectable } from '@nestjs/common'

@Injectable()
export class TranscriptsService {
    private transcripts = []

    upload(meetingId: number, text: string) {
        const transcript = {
            id: Date.now(),
            meetingId,
            text
        }

        this.transcripts.push(transcript)
        return transcript
    }

    findByMeeting(meetingId: number) {
        return this.transcripts.find(t => t.meetingId === meetingId)
    }
}