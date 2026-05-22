import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async getMessages(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    })

    if (!member) {
      throw new ForbiddenException('Not a project member')
    }

    return this.prisma.projectMessage.findMany({
      where: {
        projectId,
      },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  async sendMessage(
    projectId: string,
    userId: string,
    content: string,
  ) {
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    })

    if (!member) {
      throw new ForbiddenException('Not a project member')
    }

    const message = await this.prisma.projectMessage.create({
      data: {
        projectId,
        senderId: userId,
        content,
        iv: 'temporary',
      },
      include: {
        sender: true,
      },
    })

    this.chatGateway.sendNewMessage(projectId, message)

    return message
  }
}
