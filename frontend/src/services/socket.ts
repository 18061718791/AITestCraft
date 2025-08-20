import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  connect(sessionId: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('Connecting to WebSocket:', SOCKET_URL, 'with sessionId:', sessionId);

    this.socket = io(SOCKET_URL, {
      query: { sessionId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id);
      console.log('Connected to room:', sessionId);
      
      // 加入对应的session房间
      this.socket?.emit('join-session', sessionId);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      console.error('Connection URL:', SOCKET_URL);
      console.error('Session ID:', sessionId);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Reconnection failed after max attempts');
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 添加类型安全的方法，用于socketLogger.ts中的使用
  getSocketId?(): string | null {
    return this.socket?.id || null;
  }

  getSocketUrl?(): string | null {
    return SOCKET_URL;
  }

  onConnect?(callback: () => void): void {
    if (this.socket) {
      this.socket.on('connect', callback);
    }
  }

  onDisconnect?(callback: (reason: string) => void): void {
    if (this.socket) {
      this.socket.on('disconnect', callback);
    }
  }

  onConnectError?(callback: (error: any) => void): void {
    if (this.socket) {
      this.socket.on('connect_error', callback);
    }
  }

  onReconnect?(callback: (attemptNumber: number) => void): void {
    if (this.socket) {
      this.socket.on('reconnect', callback);
    }
  }

  onReconnectFailed?(callback: () => void): void {
    if (this.socket) {
      this.socket.on('reconnect_failed', callback);
    }
  }

  onPointsGenerated(callback: (data: { taskId: string; points: any[] }) => void): void {
    if (!this.socket) return;
    this.socket.on('points-generated', callback);
  }

  onCasesGenerated(callback: (data: { taskId: string; cases: any[] }) => void): void {
    if (!this.socket) return;
    this.socket.on('cases-generated', callback);
  }

  onError(callback: (data: { message: string; code?: string }) => void): void {
    if (!this.socket) return;
    this.socket.on('error', callback);
  }

  onProgress(callback: (data: { progress: number; message: string }) => void): void {
    if (!this.socket) return;
    this.socket.on('progress', callback);
  }

  off(event: string): void {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

const socketService = new SocketService();
export default socketService;