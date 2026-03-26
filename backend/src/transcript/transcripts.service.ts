import { Injectable } from '@nestjs/common'


type Transcript = {
    id: number;
    meetingId: number;
    text: string;
};

@Injectable()
export class TranscriptsService {
    private transcripts: Transcript[] = [];

    upload(meetingId: number, text: string) {
        const transcript = {
            id: Date.now(),
            meetingId,
            text
        };

        this.transcripts.push(transcript);
        return transcript;
    }

    findByMeeting(meetingId: number) {
        return this.transcripts.find(t => t.meetingId === meetingId);
    }
}