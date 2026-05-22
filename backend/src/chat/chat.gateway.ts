import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'

import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server!: Server

  handleConnection(socket: Socket) {
    console.log('Client connected', socket.id)
  }

  @SubscribeMessage('join_project')
  handleJoinProject(
    @MessageBody() projectId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    console.log(`Joined project ${projectId}`)
    socket.join(`project:${projectId}`)
  }

  sendNewMessage(projectId: string, message: any) {
    this.server.to(`project:${projectId}`).emit('new_message', message)
  }
}