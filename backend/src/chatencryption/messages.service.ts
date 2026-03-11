import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from './encryption.service';

@Injectable()
export class MessagesService {

  constructor(private prisma: PrismaService) {}

  async sendMessage(projectId: string, senderId: string, content: string) {

    const encrypted = encrypt(content);

    return this.prisma.projectMessage.create({
      data: {
        projectId,
        senderId,
        content: encrypted.content,
        iv: encrypted.iv
      }
    });

  }

  async getMessages(projectId: string) {

    const messages = await this.prisma.projectMessage.findMany({
      where: { projectId }
    });

    return messages.map(m => ({
      ...m,
      content: decrypt(m.content, m.iv)
    }));

  }

}