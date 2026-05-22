import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ChatGateway } from './chat.gateway'
import { encrypt, decrypt } from '../chatencryption/encryption.service'

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  private safeDecrypt(content: string, iv?: string | null) {
    try {
      if (!iv || iv.length !== 32) {
        return content 
      }
      return decrypt(content, iv)
    } catch (err) {
      console.error('Decrypt failed, returning raw content')
      return content
    }
  }

  async getMessages(projectId: string, userId: string) {

    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId }
    })

    if (!member) {
      throw new ForbiddenException('Not a project member')
    }

    const messages = await this.prisma.projectMessage.findMany({
      where: { projectId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' }
    })

    return messages.map(m => ({
      id: m.id,
      projectId: m.projectId,
      senderId: m.senderId,
      senderName: m.sender?.name,
      content: this.safeDecrypt(m.content, m.iv),
      createdAt: m.createdAt
    }))
  }

  async sendMessage(projectId: string, userId: string, content: string) {

    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId }
    })

    if (!member) {
      throw new ForbiddenException('Not a project member')
    }

    const encrypted = encrypt(content)

    const message = await this.prisma.projectMessage.create({
      data: {
        projectId,
        senderId: userId,
        content: encrypted.content,
        iv: encrypted.iv,
      },
      include: {
        sender: true,
      }
    })

    const formattedMessage = {
      id: message.id,
      projectId: message.projectId,
      senderId: message.senderId,
      senderName: message.sender?.name,
      content: content, 
      createdAt: message.createdAt
    }

    this.chatGateway.sendNewMessage(projectId, formattedMessage)

    return formattedMessage
  }
}