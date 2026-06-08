import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });

  // Handle Joi validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle custom AppError or HttpError
  if (error.name === 'AppError' || error.name === 'HttpError') {
    const appError = error as any;
    res.status(appError.statusCode || 400).json({
      success: false,
      error: {
        code: appError.code || 'BAD_REQUEST',
        message: appError.message || '请求错误',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle authentication/validation errors (thrown as plain Error in authService)
  if (error.message && (
    error.message === '用户不存在' ||
    error.message === '密码错误' ||
    error.message.includes('账号已被禁用') ||
    error.message.includes('已被使用') ||
    error.message.includes('Token 无效')
  )) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'Internal server error',
      details: process.env['NODE_ENV'] === 'development' ? error.message : undefined,
    },
    timestamp: new Date().toISOString(),
  });
};