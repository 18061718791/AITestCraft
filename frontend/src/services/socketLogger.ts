import socketService from './socket';
import { frontendLogger, LogCategory } from '../utils/logger';

export interface SocketLogData {
  event: string;
  data?: any;
  timestamp: string;
  sessionId: string;
}

class SocketLogger {
  private isInitialized = false;

  initialize(sessionId: string): void {
    if (this.isInitialized) return;

    frontendLogger.logWebSocket('initialize', { sessionId });

    // 监听连接事件
    if (socketService.onConnect) {
      socketService.onConnect(() => {
        frontendLogger.logWebSocket('connected', {
          socketId: socketService.getSocketId?.(),
          sessionId
        });
      });
    }

    // 监听断开事件
    if (socketService.onDisconnect) {
      socketService.onDisconnect((reason: string) => {
        frontendLogger.logWebSocket('disconnected', {
          reason,
          sessionId
        });
      });
    }

    // 监听连接错误
    if (socketService.onConnectError) {
      socketService.onConnectError((error: any) => {
        frontendLogger.error(LogCategory.ERROR, 'websocket_connection_error', error, {
          sessionId,
          url: socketService.getSocketUrl?.()
        });
      });
    }

    // 监听重连事件
    if (socketService.onReconnect) {
      socketService.onReconnect((attemptNumber: number) => {
        frontendLogger.logWebSocket('reconnected', {
          attemptNumber,
          sessionId
        });
      });
    }

    // 监听重连失败
    if (socketService.onReconnectFailed) {
      socketService.onReconnectFailed(() => {
        frontendLogger.error(LogCategory.ERROR, 'websocket_reconnect_failed', new Error('Max reconnection attempts reached'), {
          sessionId
        });
      });
    }

    this.isInitialized = true;
  }

  logEvent(event: string, data?: any): void {
    frontendLogger.logWebSocket('event_received', {
      event,
      data,
      sessionId: frontendLogger.getSessionId()
    });
  }

  logEmit(event: string, data?: any): void {
    frontendLogger.logWebSocket('event_emitted', {
      event,
      data,
      sessionId: frontendLogger.getSessionId()
    });
  }

  logError(event: string, error: any): void {
    frontendLogger.error(LogCategory.ERROR, `websocket_event_error_${event}`, error, {
      sessionId: frontendLogger.getSessionId()
    });
  }
}

// 增强现有的socketService

// 添加获取socket ID的方法
if (!socketService.getSocketId) {
  Object.defineProperty(socketService, 'getSocketId', {
    value: function() {
      return this.socket?.id || null;
    }
  });
}

// 添加获取socket URL的方法
if (!socketService.getSocketUrl) {
  Object.defineProperty(socketService, 'getSocketUrl', {
    value: function() {
      return this.socket?.io?.uri || null;
    }
  });
}

// 添加连接事件监听
if (!socketService.onConnect) {
  Object.defineProperty(socketService, 'onConnect', {
    value: function(callback: () => void) {
      if (this.socket) {
        this.socket.on('connect', callback);
      }
    }
  });
}

// 添加断开事件监听
if (!socketService.onDisconnect) {
  Object.defineProperty(socketService, 'onDisconnect', {
    value: function(callback: (reason: string) => void) {
      if (this.socket) {
        this.socket.on('disconnect', callback);
      }
    }
  });
}

// 添加连接错误监听
if (!socketService.onConnectError) {
  Object.defineProperty(socketService, 'onConnectError', {
    value: function(callback: (error: any) => void) {
      if (this.socket) {
        this.socket.on('connect_error', callback);
      }
    }
  });
}

// 添加重连事件监听
if (!socketService.onReconnect) {
  Object.defineProperty(socketService, 'onReconnect', {
    value: function(callback: (attemptNumber: number) => void) {
      if (this.socket) {
        this.socket.on('reconnect', callback);
      }
    }
  });
}

// 添加重连失败监听
if (!socketService.onReconnectFailed) {
  Object.defineProperty(socketService, 'onReconnectFailed', {
    value: function(callback: () => void) {
      if (this.socket) {
        this.socket.on('reconnect_failed', callback);
      }
    }
  });
}

// 创建SocketLogger实例
export const socketLogger = new SocketLogger();

// 增强原有的socket事件监听
const originalOnPointsGenerated = socketService.onPointsGenerated;
socketService.onPointsGenerated = function(callback: any) {
  return originalOnPointsGenerated.call(this, (data: any) => {
    socketLogger.logEvent('points-generated', data);
    callback(data);
  });
};

const originalOnCasesGenerated = socketService.onCasesGenerated;
socketService.onCasesGenerated = function(callback: any) {
  return originalOnCasesGenerated.call(this, (data: any) => {
    socketLogger.logEvent('cases-generated', data);
    callback(data);
  });
};

const originalOnError = socketService.onError;
socketService.onError = function(callback: any) {
  return originalOnError.call(this, (data: any) => {
    socketLogger.logError('error', data);
    callback(data);
  });
};

const originalOnProgress = socketService.onProgress;
socketService.onProgress = function(callback: any) {
  return originalOnProgress.call(this, (data: any) => {
    socketLogger.logEvent('progress', data);
    callback(data);
  });
};

export default socketLogger;