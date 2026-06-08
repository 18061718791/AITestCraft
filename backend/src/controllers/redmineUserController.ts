import { Request, Response } from 'express';
import * as redmineUserService from '../services/redmineUserService';
import logger from '../utils/logger';

/**
 * 搜索Redmine用户
 */
export async function searchRedmineUsers(req: Request, res: Response): Promise<void> {
  try {
    const { keyword } = req.query;
    const limit = parseInt(req.query['limit'] as string) || 20;

    if (!keyword || typeof keyword !== 'string') {
      res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
      return;
    }

    const users = await redmineUserService.searchRedmineUsers(keyword, limit);

    res.json({
      success: true,
      data: users
    });
  } catch (error: any) {
    logger.error('搜索Redmine用户失败', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || '搜索Redmine用户失败'
    });
  }
}

/**
 * 根据ID获取Redmine用户信息
 */
export async function getRedmineUserById(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params['id'] || '0');

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: '用户ID无效'
      });
      return;
    }

    const user = await redmineUserService.getRedmineUserById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Redmine用户不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('获取Redmine用户信息失败', error);
    res.status(500).json({
      success: false,
      message: '获取Redmine用户信息失败'
    });
  }
}

/**
 * 获取所有活跃的Redmine用户
 */
export async function getAllActiveRedmineUsers(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query['limit'] as string) || 100;
    const users = await redmineUserService.getAllActiveRedmineUsers(limit);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('获取Redmine用户列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取Redmine用户列表失败'
    });
  }
}
