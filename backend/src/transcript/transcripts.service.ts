import { Injectable } from '@nestjs/common'
<<<<<<< HEAD
import { PrismaService } from '../prisma/prisma.service'
import { PrismaModule } from '../prisma/prisma.module';
=======


type Transcript = {
    id: number;
    meetingId: string;
    text: string;
};
>>>>>>> biometric

@Injectable()
export class TranscriptsService {
  constructor(private prisma: PrismaService) {}

<<<<<<< HEAD
  async upload(meetingId: string, text: string) {
    return this.prisma.transcript.create({
      data: {
        meetingId,
        text
      }
    })
  }

  async findByMeeting(meetingId: string) {
    return this.prisma.transcript.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' }
    })
  }
=======
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
>>>>>>> biometric
}