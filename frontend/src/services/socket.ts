import { Socket } from 'socket.io-client';
import { createSocketService } from './socketFallback';

// 根据环境动态设置WebSocket URL
const getSocketUrl = (): string => {
  // 开发环境使用localhost
  if (import.meta.env.DEV) {
    return 'ws://localhost:9000';
  }
  
  // 生产环境：直接使用配置的外网地址
  const configuredUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_WEBSOCKET_URL || 'ws://120.55.187.125:9000';
  
  // 如果配置的URL已经是完整URL，直接使用
  if (configuredUrl.startsWith('ws://') || configuredUrl.startsWith('wss://')) {
    return configuredUrl;
  }
  
  // 根据页面协议自动选择WebSocket协议
  const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  
  // 处理配置的URL（可能包含协议，也可能不包含）
  let hostname = configuredUrl;
  if (hostname.startsWith('ws://')) {
    hostname = hostname.substring(5);
  } else if (hostname.startsWith('wss://')) {
    hostname = hostname.substring(6);
  } else if (hostname.startsWith('http://')) {
    hostname = hostname.substring(7);
  } else if (hostname.startsWith('https://')) {
    hostname = hostname.substring(8);
  }
  
  // 移除末尾的斜杠
  if (hostname.endsWith('/')) {
    hostname = hostname.slice(0, -1);
  }
  
  const finalUrl = `${wsProtocol}${hostname}`;
  
  return finalUrl;
};

const SOCKET_URL = getSocketUrl();

class SocketService {
  private socket: Socket | null = null;
  private fallbackService: any = null;

  async connect(sessionId: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    // 清理现有连接
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // 使用回退服务
    this.fallbackService = createSocketService(SOCKET_URL);
    
    try {
      const socket = await this.fallbackService.connect(sessionId);
      this.socket = socket;
      this.setupSocketListeners(sessionId);
    } catch (error) {
      console.error('Failed to establish socket connection:', error);
      this.socket = null;
      throw error;
    }
  }

  private setupSocketListeners(sessionId: string): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      // 加入对应的session房间
      this.socket?.emit('join-session', sessionId);

      // 监听加入成功事件
      this.socket?.on('joined-session', () => {
        // Session加入成功处理
      });
    });

    this.socket.on('disconnect', (reason) => {
      // 连接断开处理
      if (reason === 'io server disconnect') {
        // 服务器主动断开，尝试重新连接
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', () => {
      // 连接错误处理
    });

    this.socket.on('reconnect', () => {
      // 重连成功处理
    });

    this.socket.on('reconnect_attempt', () => {
      // 重连尝试处理
    });

    this.socket.on('reconnect_failed', () => {
      // 重连失败处理
    });

    // 事件监听器已设置完成，无需递归调用
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'disconnected';
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.fallbackService) {
      this.fallbackService.disconnect();
      this.fallbackService = null;
    }
  }

  // 确保连接的方法
  async ensureConnected(sessionId: string): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    // 如果还没有socket，先建立连接
    if (!this.socket) {
      await this.connect(sessionId);
      return;
    }

    // 如果socket存在但未连接，等待连接
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000); // 增加超时时间到10秒，给HTTP轮询足够时间

      const onConnect = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      };

      // 绑定一次性事件监听器
      if (this.socket) {
        this.socket.once('connect', onConnect);
        this.socket.once('connect_error', onError);
      }
    });
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
    if (!this.socket) {
      return;
    }
    this.socket.on('points-generated', callback);
  }

  // 监听所有事件（调试用）
  onAny(callback: (eventName: string, ...args: any[]) => void): void {
    if (!this.socket) {
      return;
    }
    this.socket.onAny(callback);
  }

  // 发送事件
  emit(eventName: string, data: any): void {
    if (!this.socket) return;
    this.socket.emit(eventName, data);
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