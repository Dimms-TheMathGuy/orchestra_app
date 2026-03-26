import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ActivityGateway {

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinProject')
  handleJoin(@MessageBody() projectId: string, @ConnectedSocket() client: Socket) {
    client.join(`project-${projectId}`);
  }

  emitToProject(projectId: string, activity: any) {
    this.server
      .to(`project-${projectId}`)
      .emit('newActivity', activity);
  }
}