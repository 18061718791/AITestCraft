import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 10 }) {
    this.config = config;
    this.cleanupInterval();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.getKey(req);
      const now = Date.now();

      const record = this.requests.get(key);

      if (!record || now > record.resetTime) {
        this.requests.set(key, {
          count: 1,
          resetTime: now + this.config.windowMs,
        });
        next();
        return;
      }

      if (record.count >= this.config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        logger.warn('rate_limiter', 'rate_limit_exceeded', {
          key,
          count: record.count,
          retryAfter,
        });
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `请求过于频繁，请 ${retryAfter} 秒后重试`,
            retryAfter,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      record.count++;
      next();
    };
  }

  private getKey(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.path;
    return `${ip}:${path}`;
  }

  private cleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.requests.entries()) {
        if (now > record.resetTime) {
          this.requests.delete(key);
        }
      }
    }, this.config.windowMs);
  }
}

export const generateRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 5, // 每分钟最多5次生成请求
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60, // 每分钟最多60次API请求
});
