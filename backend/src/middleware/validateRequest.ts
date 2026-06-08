import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', errors.array());
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: errors.array(),
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  next();
};

export default validateRequest;