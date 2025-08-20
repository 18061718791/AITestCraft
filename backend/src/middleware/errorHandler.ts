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

  // Handle custom AppError
  if (error.name === 'AppError') {
    const appError = error as any;
    res.status(appError.statusCode || 500).json({
      success: false,
      error: {
        code: appError.code || 'INTERNAL_ERROR',
        message: appError.message || 'Internal server error',
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