import { io, Socket } from 'socket.io-client';

/**
 * WebSocket连接回退方案
 * 当WebSocket连接失败时，强制使用HTTP轮询
 */
export class SocketFallbackService {
  private socket: Socket | null = null;
  private connectionAttempts = 0;
  // maxAttempts is declared but not used - removing to fix TypeScript error
  private fallbackMode = false;

  constructor(private serverUrl: string) {}

  /**
   * 建立连接，自动处理WebSocket失败情况
   */
  async connect(sessionId: string): Promise<Socket> {
    this.connectionAttempts++;

    // 清理现有连接
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // 尝试WebSocket连接（如果还没进入回退模式）
    if (!this.fallbackMode) {
      try {
        this.socket = await this.tryWebSocketConnection(sessionId);
        return this.socket;
      } catch (error) {
        console.warn('[SocketFallback] WebSocket连接失败，切换到HTTP轮询模式');
        this.fallbackMode = true;
      }
    }

    // 使用HTTP轮询回退
    return this.tryHttpPollingConnection(sessionId);
  }

  /**
   * 尝试WebSocket连接
   */
  private async tryWebSocketConnection(sessionId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = io(this.serverUrl, {
        query: { sessionId },
        transports: ['websocket'], // 仅尝试WebSocket
        timeout: 10000, // 增加WebSocket超时时间，适应生产环境网络延迟
        reconnection: false,
        forceNew: true,
        withCredentials: true,
        extraHeaders: {
          'X-Requested-With': 'XMLHttpRequest',
          'x-session-id': sessionId
        },
        // 生产环境优化配置
        upgrade: true,
        rememberUpgrade: true,
        // 移除Origin头设置，让浏览器自动处理
        // origin: undefined // 不要手动设置Origin头
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('WebSocket连接超时'));
      }, 15000); // 增加超时时间到15秒

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('[SocketFallback] WebSocket连接错误:', error.message);
        reject(error);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[SocketFallback] WebSocket错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 尝试HTTP轮询连接
   */
  private async tryHttpPollingConnection(sessionId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = io(this.serverUrl, {
        query: { sessionId },
        transports: ['polling'], // 仅使用HTTP轮询
        timeout: 20000, // 增加超时时间
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        forceNew: true,
        withCredentials: true,
        extraHeaders: {
          'X-Requested-With': 'XMLHttpRequest',
          'x-session-id': sessionId
        }
      });

      // 设置超时保护
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('HTTP轮询连接超时'));
      }, 15000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        this.socket = socket;
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('[SocketFallback] HTTP轮询连接错误:', error.message);
        reject(error);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[SocketFallback] HTTP轮询错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * 获取当前连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * 获取Socket实例
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * 是否在回退模式
   */
  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }
}

/**
 * 创建Socket服务的工厂函数
 */
export function createSocketService(serverUrl: string) {
  return new SocketFallbackService(serverUrl);
}