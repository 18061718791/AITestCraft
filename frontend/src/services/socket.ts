import { Socket } from 'socket.io-client';
import { createSocketService } from './socketFallback';

// 根据环境动态设置WebSocket URL
const getSocketUrl = (): string => {
  // 1. 优先使用运行时注入的配置（Docker环境）
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.VITE_SOCKET_URL) {
    const runtimeUrl = (window as any).APP_CONFIG.VITE_SOCKET_URL;
    if (runtimeUrl) {
      console.log('[Socket] Using runtime config:', runtimeUrl);
      return runtimeUrl;
    }
  }

  // 2. 生产环境：使用相对路径自动适配当前域名
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    console.log('[Socket] Using relative path:', wsUrl);
    return wsUrl;
  }

  // 3. 开发环境：使用环境变量或默认值
  const devUrl = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:9000';
  console.log('[Socket] Using dev config:', devUrl);
  return devUrl;
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
      setTimeout(() => this.onPointsGenerated(callback), 100);
      return;
    }
    this.socket.on('points-generated', callback);
    console.log('[Socket] points-generated listener registered');
  }

  onVisionFallback(callback: (data: { taskId: string }) => void): void {
    if (!this.socket) {
      setTimeout(() => this.onVisionFallback(callback), 100);
      return;
    }
    this.socket.on('vision-fallback', callback);
    console.log('[Socket] vision-fallback listener registered');
  }

  // 监听所有事件（调试用）
  onAny(callback: (eventName: string, ...args: any[]) => void): void {
    if (!this.socket) {
      // 如果 socket 还未初始化，延迟绑定
      setTimeout(() => this.onAny(callback), 100);
      return;
    }
    this.socket.onAny(callback);
    console.log('[Socket] onAny listener registered');
  }

  // 发送事件
  emit(eventName: string, data: any): void {
    if (!this.socket) return;
    this.socket.emit(eventName, data);
  }

  onCasesGenerated(callback: (data: { taskId: string; cases: any[] }) => void): void {
    if (!this.socket) {
      setTimeout(() => this.onCasesGenerated(callback), 100);
      return;
    }
    this.socket.on('cases-generated', callback);
    console.log('[Socket] cases-generated listener registered');
  }

  onError(callback: (data: { message: string; code?: string }) => void): void {
    if (!this.socket) {
      setTimeout(() => this.onError(callback), 100);
      return;
    }
    this.socket.on('error', callback);
  }

  onProgress(callback: (data: { progress: number; message: string }) => void): void {
    if (!this.socket) {
      setTimeout(() => this.onProgress(callback), 100);
      return;
    }
    this.socket.on('progress', callback);
  }

  onCasesProgress(callback: (data: { 
    taskId: string; 
    progress: number; 
    completedBatches: number;
    totalBatches: number;
    casesCount: number;
    cases: any[];
    isComplete: boolean;
  }) => void): void {
    if (!this.socket) {
      // 如果 socket 还未初始化，延迟绑定
      setTimeout(() => this.onCasesProgress(callback), 100);
      return;
    }
    this.socket.on('cases-progress', callback);
    console.log('[Socket] cases-progress listener registered');
  }

  /**
   * 监听详细处理日志
   */
  onProcessingLog(callback: (data: {
    id: string;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: string;
    step?: string;
    progress?: number;
    timestamp: string;
  }) => void): void {
    if (!this.socket) {
      setTimeout(() => this.onProcessingLog(callback), 100);
      return;
    }
    this.socket.on('processing-log', callback);
    console.log('[Socket] processing-log listener registered');
  }

  /**
   * 监听新的部署任务通知
   */
  onNewDeploymentTasks(callback: (data: {
    repository: string;
    branch: string;
    tasks: Array<{
      id: number;
      appName: string;
      commitMessage: string | null;
      commitAuthor: string | null;
    }>;
    timestamp: string;
  }) => void): void {
    if (!this.socket) {
      console.warn('[Socket] socket not initialized, retrying in 500ms...');
      setTimeout(() => this.onNewDeploymentTasks(callback), 500);
      return;
    }
    this.socket.on('new-deployment-tasks', callback);
    console.log('[Socket] new-deployment-tasks listener registered on socket:', this.socket.id);

    // 同时监听所有事件（调试用）
    this.socket.onAny?.((eventName: string, ...args: any[]) => {
      if (eventName.includes('deployment') || eventName.includes('new-deployment')) {
        console.log(`[Socket] Received event: ${eventName}`, args);
      }
    });
  }

  /**
   * 监听部署任务状态更新
   */
  onDeploymentTaskUpdate(callback: (data: {
    taskId: number;
    appName: string;
    status: string;
    deployedBy: string | null;
    deployedAt: Date | null;
    timestamp: string;
  }) => void): void {
    if (!this.socket) {
      setTimeout(() => this.onDeploymentTaskUpdate(callback), 100);
      return;
    }
    this.socket.on('deployment-task-update', callback);
    console.log('[Socket] deployment-task-update listener registered');
  }

  off(event: string): void {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

const socketService = new SocketService();
export default socketService;