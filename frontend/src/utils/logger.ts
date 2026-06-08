import { v4 as uuidv4 } from 'uuid';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export enum LogCategory {
  USER_ACTION = 'user_action',
  API_REQUEST = 'api_request',
  API_RESPONSE = 'api_response',
  WEBSOCKET = 'websocket',
  ERROR = 'error',
  BUSINESS = 'business'
}

export interface LogMetadata {
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp?: string;
  duration?: number;
  statusCode?: number;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  error?: Error;
  metadata?: LogMetadata;
}

export interface FrontendLoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableBackend: boolean;
  sessionId: string;
}

class FrontendLogger {
  private config: FrontendLoggerConfig;
  private logQueue: LogEntry[] = [];
  private isProcessing = false;

  constructor(config?: Partial<FrontendLoggerConfig>) {
    this.config = {
      level: this.getLogLevelFromEnv(),
      enableConsole: import.meta.env.DEV,
      enableBackend: false,
      sessionId: this.getOrCreateSessionId(),
      ...config
    };
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = import.meta.env.VITE_LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const field of sensitiveFields) {
      if (typeof sanitized === 'object' && sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    error?: Error,
    additionalMetadata?: Partial<LogMetadata>
  ): LogEntry {
    const metadata: LogMetadata = {
      sessionId: this.config.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      ...additionalMetadata
    };

    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      error,
      metadata
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const consoleMethod = this.getConsoleMethod(entry.level);
    const logData = {
      ...entry,
      level: LogLevel[entry.level]
    };

    consoleMethod(`[${entry.category}] ${entry.message}`, logData);
  }

  private getConsoleMethod(level: LogLevel): Function {
    switch (level) {
      case LogLevel.DEBUG: return console.debug;
      case LogLevel.INFO: return console.info;
      case LogLevel.WARN: return console.warn;
      case LogLevel.ERROR: return console.error;
      default: return console.log;
    }
  }

  private async sendToBackend(entry: LogEntry): Promise<void> {
    if (!this.config.enableBackend) return;

    this.logQueue.push(entry);
    
    if (!this.isProcessing) {
      this.isProcessing = true;
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.logQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.logQueue.splice(0, 10);
    
    try {
      // 这里可以集成发送到后端的逻辑
      // await api.post('/logs', { logs: batch });
    } catch (error) {
      console.warn('Failed to send logs to backend:', error);
    }

    this.isProcessing = false;
    
    if (this.logQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    error?: Error,
    metadata?: Partial<LogMetadata>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, category, message, data, error, metadata);
    
    this.logToConsole(entry);
    this.sendToBackend(entry);
  }

  // Public API methods
  debug(category: LogCategory, message: string, data?: any, metadata?: Partial<LogMetadata>): void {
    this.log(LogLevel.DEBUG, category, message, data, undefined, metadata);
  }

  info(category: LogCategory, message: string, data?: any, metadata?: Partial<LogMetadata>): void {
    this.log(LogLevel.INFO, category, message, data, undefined, metadata);
  }

  warn(category: LogCategory, message: string, data?: any, error?: Error, metadata?: Partial<LogMetadata>): void {
    this.log(LogLevel.WARN, category, message, data, error, metadata);
  }

  error(category: LogCategory, message: string, error?: Error, data?: any, metadata?: Partial<LogMetadata>): void {
    this.log(LogLevel.ERROR, category, message, data, error, metadata);
  }

  // Utility methods
  logUserAction(action: string, data?: any): void {
    this.info(LogCategory.USER_ACTION, `User action: ${action}`, data);
  }

  logApiRequest(method: string, url: string, data?: any): void {
    this.info(LogCategory.API_REQUEST, `API request: ${method} ${url}`, data, {
      url,
      duration: 0 // 将在响应时更新
    });
  }

  logApiResponse(method: string, url: string, statusCode: number, duration: number, data?: any): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, LogCategory.API_RESPONSE, `API response: ${method} ${url} ${statusCode}`, data, undefined, {
      url,
      statusCode,
      duration
    });
  }

  logWebSocket(event: string, data?: any): void {
    this.info(LogCategory.WEBSOCKET, `WebSocket: ${event}`, data);
  }

  logBusiness(operation: string, data?: any): void {
    this.info(LogCategory.BUSINESS, `Business operation: ${operation}`, data);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<FrontendLoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getSessionId(): string {
    return this.config.sessionId;
  }

  setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
    sessionStorage.setItem('sessionId', sessionId);
  }
}

// 创建全局实例
export const frontendLogger = new FrontendLogger();

// 类型导出 - 避免重复导出
export type { FrontendLoggerConfig as LoggerConfig, LogMetadata as LoggerMetadata, LogEntry as LoggerLogEntry };