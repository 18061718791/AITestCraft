import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';

interface SocketUser {
  socketId: string;
  sessionId: string;
  connectedAt: Date;
}

class NotificationService {
  private io: Server | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();

  initialize(io: Server): void {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      logger.info('websocket', 'client_connected', {
        socketId: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
      });

      socket.on('join-session', (sessionId: string) => {
        if (!sessionId) {
          logger.warn('websocket', 'join_session_failed', {
            socketId: socket.id,
            reason: 'missing_session_id'
          });
          socket.emit('error', { message: 'Session ID is required' });
          return;
        }

        socket.join(sessionId);
        this.connectedUsers.set(socket.id, {
          socketId: socket.id,
          sessionId,
          connectedAt: new Date(),
        });

        logger.info('websocket', 'session_joined', {
          socketId: socket.id,
          sessionId,
          roomSize: this.io?.sockets.adapter.rooms.get(sessionId)?.size || 0
        });
        socket.emit('joined-session', { sessionId });
      });

      socket.on('leave-session', (sessionId: string) => {
        socket.leave(sessionId);
        this.connectedUsers.delete(socket.id);
        logger.info('websocket', 'session_left', {
          socketId: socket.id,
          sessionId
        });
      });

      socket.on('disconnect', (reason) => {
        this.connectedUsers.delete(socket.id);
        logger.info('websocket', 'client_disconnected', {
          socketId: socket.id,
          reason
        });
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  notifyPointsGenerated(sessionId: string, data: any): void {
    if (!this.io) {
      logger.error('websocket', 'notification_failed', {
        reason: 'service_not_initialized',
        sessionId,
        event: 'points-generated'
      });
      return;
    }

    logger.debug('websocket', 'sending_points_notification', {
      sessionId,
      event: 'points-generated',
      taskId: data.taskId,
      pointsCount: data.points?.length || 0,
      firstPoint: data.points?.[0],
      allPoints: data.points
    });

    const rooms = this.io.sockets.adapter.rooms;
    logger.debug('websocket', 'room_status', {
      sessionId,
      roomExists: rooms.has(sessionId),
      roomSize: rooms.get(sessionId)?.size || 0
    });

    this.io.to(sessionId).emit('points-generated', data);
    logger.info('websocket', 'notification_sent', {
      sessionId,
      event: 'points-generated',
      data: {
        taskId: data.taskId,
        pointsCount: data.points?.length || 0
      }
    });
  }

  notifyCasesGenerated(sessionId: string, data: any): void {
    if (!this.io) {
      logger.error('websocket', 'notification_failed', {
        reason: 'service_not_initialized',
        sessionId,
        event: 'cases-generated'
      });
      return;
    }

    this.io.to(sessionId).emit('cases-generated', data);
    logger.info('websocket', 'notification_sent', {
      sessionId,
      event: 'cases-generated',
      data: {
        taskId: data.taskId,
        casesCount: data.cases?.length || 0
      }
    });
  }

  notifyError(sessionId: string, error: any): void {
    if (!this.io) {
      logger.error('websocket', 'notification_failed', {
        reason: 'service_not_initialized',
        sessionId,
        event: 'error'
      });
      return;
    }

    this.io.to(sessionId).emit('error', error);
    logger.warn('websocket', 'error_notification_sent', {
      sessionId,
      error: error.message || error,
      details: error.details
    });
  }

  notifyProgress(sessionId: string, progress: number, message?: string): void {
    if (!this.io) {
      logger.error('websocket', 'notification_failed', {
        reason: 'service_not_initialized',
        sessionId,
        event: 'progress'
      });
      return;
    }

    this.io.to(sessionId).emit('progress', { progress, message });
    logger.debug('websocket', 'progress_notification_sent', {
      sessionId,
      progress,
      message
    });
  }

  getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  getSessionUsers(sessionId: string): SocketUser[] {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.sessionId === sessionId);
  }
}

export const notificationService = new NotificationService();

export const setupSocketHandlers = (io: Server): void => {
  notificationService.initialize(io);
};

export default notificationService;