import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PrismaModule } from '../prisma/prisma.module';


type Transcript = {
    id: number;
    meetingId: string;
    text: string;
};

@Injectable()
export class TranscriptsService {
  constructor(private prisma: PrismaService) {}
    upload(meetingId: string, text: string) {
        const transcript = {
            id: Date.now(),
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