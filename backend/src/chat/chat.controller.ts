import { Controller } from '@nestjs/common';
import { Body, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** List channels the user can access in this project */
  @Get('channels')
  async getChannels(@Param('projectId') projectId: string, @Req() req: any) {
    return this.chatService.getChannels(projectId, req.user?.id)
  }

  /** Messages in a specific channel */
  @Get('channels/:channelId/messages')
  async getChannelMessages(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Req() req: any,
  ) {
    return this.chatService.getMessages(projectId, req.user?.id, channelId)
  }

  /** Send a message to a specific channel */
  @Post('channels/:channelId/messages')
  async sendChannelMessage(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(projectId, req.user?.id, content, channelId)
  }

  /** Legacy: messages in the General channel */
  @Get('messages')
  async getMessages(@Param('projectId') projectId: string, @Req() req: any) {
    return this.chatService.getMessages(projectId, req.user?.id)
  }

  /** Legacy: send to the General channel */
  @Post('messages')
  async sendMessage(
    @Param('projectId') projectId: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(projectId, req.user?.id, content)
  }
}
