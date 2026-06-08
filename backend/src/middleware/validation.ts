import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ErrorCode, HttpError } from '../types';

// Validation schemas
export const generatePointsSchema = Joi.object({
  requirement: Joi.string().min(10).max(5000).required()
    .messages({
      'string.empty': '需求描述不能为空',
      'string.min': '需求描述至少需要10个字符',
      'string.max': '需求描述最多允许5000个字符',
      'any.required': '需求描述是必填项'
    }),
  sessionId: Joi.string().uuid().required()
    .messages({
      'string.empty': '会话ID不能为空',
      'string.guid': '会话ID必须是有效的UUID',
      'any.required': '会话ID是必填项'
    }),
});

export const generateCasesSchema = Joi.object({
  testPoints: Joi.array().items(Joi.string().min(1)).min(1).max(100).required()
    .messages({
      'array.base': '测试点必须是数组',
      'array.min': '至少需要选择1个测试点',
      'array.max': '最多允许选择100个测试点',
      'any.required': '测试点是必填项'
    }),
  sessionId: Joi.string().uuid().required()
    .messages({
      'string.empty': '会话ID不能为空',
      'string.guid': '会话ID必须是有效的UUID',
      'any.required': '会话ID是必填项'
    }),
});

export const downloadExcelSchema = Joi.object({
  caseIds: Joi.array().items(Joi.string()).min(1).optional(),
  sessionId: Joi.string().uuid().required(),
});

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      throw new HttpError(
        400,
        error.details?.[0]?.message || 'Validation error',
        ErrorCode.VALIDATION_ERROR
      );
    }
    
    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      throw new HttpError(
        400,
        error.details?.[0]?.message || 'Validation error',
        ErrorCode.VALIDATION_ERROR
      );
    }
    
    req.query = value;
    next();
  };
};