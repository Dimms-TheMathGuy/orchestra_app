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

  /**
   * Notify a project that a task↔branch link changed state (or was unlinked on
   * completion), so connected clients can refresh their branch list live.
   */
  emitTaskSync(projectId: string, payload: any) {
    this.server
      .to(`project-${projectId}`)
      .emit('taskSyncUpdate', payload);
  }
}