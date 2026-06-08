import { Request, Response } from 'express';
import * as taskService from '../services/deploymentTaskService';
import logger from '../utils/logger';
import type { AuthRequest } from '../middleware/auth';

// 辅助函数：检查是否是管理员
const isAdmin = (req: AuthRequest): boolean => {
  return req.user?.roles?.some((r: any) => r.code === 'admin') ?? false;
};

/**
 * 获取部署任务列表（带用户数据隔离）
 */
export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const admin = isAdmin(req);

    const params: taskService.TaskQueryParams = {
      status: req.query['status'] as string,
      repository: req.query['repository'] as string,
      branch: req.query['branch'] as string,
      page: parseInt(req.query['page'] as string) || 1,
      pageSize: parseInt(req.query['pageSize'] as string) || 20,
      projectId: req.query['projectId'] as string | undefined,
      directoryId: req.query['directoryId'] as string | undefined,
      appId: req.query['appId'] ? parseInt(req.query['appId'] as string) : undefined,
      userId: userId,
      isAdmin: admin
    };

    const result = await taskService.getDeploymentTasks(params);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取部署任务列表失败:', error);
    res.status(500).json({ success: false, message: '获取任务列表失败' });
  }
}

/**
 * 获取按应用分组的待部署任务（用于新UI展示，带用户数据隔离）
 */
export async function getPendingTasksGroupedByApp(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const admin = isAdmin(req);
    const projectId = req.query['projectId'] as string | undefined;
    const directoryId = req.query['directoryId'] as string | undefined;

    const result = await taskService.getPendingTasksGroupedByApp(projectId, directoryId, userId, admin);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取分组待部署任务失败:', error);
    res.status(500).json({ success: false, message: '获取任务列表失败' });
  }
}

/**
 * 获取应用部署列表（用于部署历史页面，带用户数据隔离）
 */
export async function getAppDeploymentList(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const admin = isAdmin(req);

    const params: { projectId?: string | undefined; directoryId?: string | undefined; page?: number; pageSize?: number; userId?: number | undefined; isAdmin?: boolean } = {
      projectId: req.query['projectId'] as string | undefined,
      directoryId: req.query['directoryId'] as string | undefined,
      page: parseInt(req.query['page'] as string) || 1,
      pageSize: parseInt(req.query['pageSize'] as string) || 20,
      userId: userId,
      isAdmin: admin
    };

    const result = await taskService.getAppDeploymentList(params);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取应用部署列表失败:', error);
    res.status(500).json({ success: false, message: '获取应用列表失败' });
  }
}

/**
 * 获取应用的部署历史（带用户数据隔离）
 */
export async function getAppDeploymentHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const admin = isAdmin(req);
    const appId = parseInt(req.params['appId'] as string);
    const params = {
      page: parseInt(req.query['page'] as string) || 1,
      pageSize: parseInt(req.query['pageSize'] as string) || 20,
      userId: userId,
      isAdmin: admin
    };

    const result = await taskService.getAppDeploymentHistory(appId, params);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取应用部署历史失败:', error);
    res.status(500).json({ success: false, message: '获取部署历史失败' });
  }
}

/**
 * 获取任务统计（带用户数据隔离）
 */
export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const admin = isAdmin(req);
    const projectId = req.query['projectId'] as string | undefined;
    const directoryId = req.query['directoryId'] as string | undefined;

    const stats = await taskService.getTaskStats(projectId, directoryId, userId, admin);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取任务统计失败:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
}

/**
 * 更新任务状态
 */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const taskId = parseInt(req.params['id'] as string);
    const { status, deployedBy } = req.body;

    if (!status || !['PENDING', 'DEPLOYING', 'COMPLETED', 'FAILED', 'IGNORED'].includes(status)) {
      res.status(400).json({ success: false, message: '无效的状态' });
      return;
    }

    const task = await taskService.updateTaskStatus(
      taskId,
      status,
      deployedBy
    );

    res.json({
      success: true,
      data: task
    });
  } catch (error: any) {
    logger.error('更新任务状态失败:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: '任务不存在' });
      return;
    }

    res.status(500).json({ success: false, message: '更新状态失败' });
  }
}

/**
 * 批量更新任务状态
 */
export async function batchUpdateStatus(req: Request, res: Response): Promise<void> {
  try {
    const { taskIds, status, deployedBy } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      res.status(400).json({ success: false, message: '无效的任务ID列表' });
      return;
    }

    if (!status || !['PENDING', 'DEPLOYING', 'COMPLETED', 'FAILED', 'IGNORED'].includes(status)) {
      res.status(400).json({ success: false, message: '无效的状态' });
      return;
    }

    const result = await taskService.batchUpdateTaskStatus(
      taskIds,
      status,
      deployedBy
    );

    res.json({
      success: true,
      data: { updatedCount: result.count }
    });
  } catch (error) {
    logger.error('批量更新任务状态失败:', error);
    res.status(500).json({ success: false, message: '批量更新失败' });
  }
}
