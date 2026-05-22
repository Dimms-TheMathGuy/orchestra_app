import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../prisma/prisma.service'; 

@Module({
  providers: [ChatService, ChatGateway, PrismaService],
  controllers: [ChatController]
})
export class ChatModule {}
