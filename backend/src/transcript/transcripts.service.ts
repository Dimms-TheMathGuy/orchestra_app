import { Injectable } from '@nestjs/common'
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

  async findByMeeting(meetingId: string) {
    return this.prisma.transcript.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' }
    })
  }
}