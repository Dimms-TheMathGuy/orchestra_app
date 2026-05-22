import { Controller } from '@nestjs/common';
import { Body, Get, Param, Post, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('projects/:projectId/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getMessages(
    @Param('projectId') projectId: string
  ) {
    const userId = '456f650f-195a-4fe2-b4ae-851b6847cf4d'

    return this.chatService.getMessages(
      projectId,
      userId,
    )
  }

  @Post()
  async sendMessage(
    @Param('projectId') projectId: string,
    @Body('content') content: string
  ) {
    const userId = '1bf51b2c-cb14-44f7-b5f5-ef6faaf227ee'

    return this.chatService.sendMessage(
      projectId,
      userId,
      content,
    )
  }
}
