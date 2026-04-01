import { Injectable } from '@nestjs/common'


type Transcript = {
    id: string;
    meetingId: string;
    text: string;
};

@Injectable()
export class TranscriptsService {
    private transcripts: Transcript[] = [];

    upload(meetingId: string, text: string) {
        const transcript = {
            id: Date.now().toString(),
            meetingId,
            text
        };

        this.transcripts.push(transcript);
        return transcript;
    }

    findByMeeting(meetingId: string) {
        return this.transcripts.find(t => t.meetingId === meetingId);
    }
}