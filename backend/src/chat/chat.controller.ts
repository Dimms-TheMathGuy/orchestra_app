import { Controller } from '@nestjs/common';
import { Body, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getMessages(
    @Param('projectId') projectId: string,
    @Req() req: any
  ) {
    const userId = req.user?.id 

    return this.chatService.getMessages(
      projectId,
      userId,
    )
  }

  @Post()
  async sendMessage(
    @Param('projectId') projectId: string,
    @Body('content') content: string,
    @Req() req: any
  ) {
    
    const userId = req.user?.id 

    return this.chatService.sendMessage(
      projectId,
      userId,
      content,
    )
  }
}
