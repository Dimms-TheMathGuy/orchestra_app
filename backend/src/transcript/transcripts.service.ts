import { Injectable } from '@nestjs/common'


type Transcript = {
    id: number;
    meetingId: string;
    text: string;
};

@Injectable()
export class TranscriptsService {
    private transcripts: Transcript[] = [];

    upload(meetingId: string, text: string) {
        const transcript = {
            id: Date.now(),
            meetingId,
            text
        };
import { PrismaService } from '../prisma/prisma.service'
import { PrismaModule } from '../prisma/prisma.module';

@Injectable()
export class TranscriptsService {
  constructor(private prisma: PrismaService) {}

  async upload(meetingId: string, text: string) {
    return this.prisma.transcript.create({
      data: {
        meetingId,
        text
      }
    })
  }

    findByMeeting(meetingId: string) {
        return this.transcripts.find(t => t.meetingId === meetingId);
    }
  async findByMeeting(meetingId: string) {
    return this.prisma.transcript.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' }
    })
  }
}