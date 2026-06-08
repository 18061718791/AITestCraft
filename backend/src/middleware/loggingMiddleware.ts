import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RequestLog {
  method: string;
  url: string;
  query: any;
  body: any;
  ip: string;
  userAgent: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
}

interface ResponseLog {
  statusCode: number;
  responseTime: number;
  contentLength?: number | undefined;
  error?: string | undefined;
}

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // 生成请求ID用于追踪
  const requestId = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
  
  // 从请求头获取会话ID
  const sessionId = req.headers['x-session-id'] as string || 
                   req.body?.sessionId || 
                   (req.query as any)?.sessionId as string;

  // 记录请求日志
  const requestLog: RequestLog = {
    method: req.method,
    url: req.url,
    query: sanitizeSensitiveData(req.query),
    body: sanitizeSensitiveData(req.body),
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    timestamp: new Date().toISOString(),
    sessionId
  };

  logger.info('http_request', {
    requestId,
    type: 'request',
    ...requestLog
  });

  // 监听响应完成事件
  const originalSend = res.send;
  let responseBody: any;

  res.send = function(body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    const responseLog: ResponseLog = {
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('content-length') ? 
        parseInt(res.get('content-length') as string) : undefined,
      error: res.statusCode >= 400 ? getErrorMessage(responseBody) : undefined
    };

    const logLevel = res.statusCode >= 500 ? 'error' : 
                    res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('http_response', {
      requestId,
      type: 'response',
      ...responseLog,
      url: req.url,
      method: req.method,
      sessionId
    });
  });

  next();
}

function sanitizeSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

function getErrorMessage(responseBody: any): string | undefined {
  if (!responseBody) return undefined;
  
  try {
    const body = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    return body?.error?.message || body?.message || 'Unknown error';
  } catch {
    return typeof responseBody === 'string' ? responseBody : 'Unknown error';
  }
}