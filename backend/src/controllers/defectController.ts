import { Request, Response } from 'express';
import treeService from '../services/treeService';
import listService from '../services/listService';
import statisticsService from '../services/statisticsService';
import logger from '../utils/logger';
import type { AuthRequest } from '../middleware/auth';

// 辅助函数：检查是否是管理员
const isAdmin = (req: AuthRequest): boolean => {
  return req.user?.roles?.some((r: any) => r.code === 'admin') ?? false;
};

class DefectController {
  // 获取目录树结构（带用户数据隔离）
  async getTree(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const admin = isAdmin(req);
      const tree = await treeService.buildTree(userId, admin);
      res.status(200).json({
        success: true,
        data: tree,
      });
    } catch (error) {
      logger.error('Error getting directory tree', error);
      res.status(500).json({
        success: false,
        error: '获取目录树失败',
      });
    }
  }

  // 获取缺陷列表（带用户数据隔离）
  async getDefects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const admin = isAdmin(req);

      // 处理 assigned_to_id 参数，支持数组格式
      let assignedToId: number[] | undefined;
      const assignedToIdQuery = req.query['assigned_to_id'];
      if (assignedToIdQuery) {
        if (Array.isArray(assignedToIdQuery)) {
          assignedToId = assignedToIdQuery.map(id => parseInt(id as string)).filter(id => !isNaN(id));
        } else if (typeof assignedToIdQuery === 'string') {
          const parsed = parseInt(assignedToIdQuery);
          if (!isNaN(parsed)) {
            assignedToId = [parsed];
          }
        }
      }

      const params: any = {
        page: parseInt(req.query['page'] as string) || 1,
        pageSize: parseInt(req.query['pageSize'] as string) || 20,
        id: req.query['id'] ? parseInt(req.query['id'] as string) : undefined,
        subject: req.query['subject'] as string,
        status_id: req.query['status_id'] as string,
        priority_id: req.query['priority_id'] as string,
        assigned_to_id: assignedToId,
        parent_id: req.query['parent_id'] ? parseInt(req.query['parent_id'] as string) : undefined,
        startDate: req.query['startDate'] as string,
        endDate: req.query['endDate'] as string,
        system_id: req.query['system_id'] as string,
        module_id: req.query['module_id'] as string,
        project_id: req.query['project_id'] as string,
        is_todo: req.query['is_todo'] === 'true',
        sort_by: req.query['sort_by'] as string,
        sort_direction: req.query['sort_direction'] as string,
        userId: userId,
        isAdmin: admin
      };

      const defects = await listService.getDefects(params);
      res.status(200).json({
        success: true,
        data: defects,
      });
    } catch (error) {
      logger.error('Error getting defects list', error);
      res.status(500).json({
        success: false,
        error: '获取缺陷列表失败',
      });
    }
  }

  // 获取缺陷详情
  async getDefectById(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params['id'];
      if (!idParam) {
        res.status(400).json({
          success: false,
          error: '缺少缺陷ID参数',
        });
        return;
      }
      const id = parseInt(idParam);
      const defect = await listService.getDefectById(id);

      if (defect) {
        res.status(200).json({
          success: true,
          data: defect,
        });
      } else {
        res.status(404).json({
          success: false,
          error: '缺陷不存在',
        });
      }
    } catch (error) {
      logger.error('Error getting defect detail', error);
      res.status(500).json({
        success: false,
        error: '获取缺陷详情失败',
      });
    }
  }

  // 获取项目汇总趋势数据（带用户数据隔离）
  async getOverviewTrend(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const admin = isAdmin(req);
      const type = (req.query['type'] as 'all' | 'urgent') || 'all';
      const data = await statisticsService.getOverviewTrend(type, undefined, undefined, userId, admin);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error getting overview trend', error);
      res.status(500).json({
        success: false,
        error: '获取趋势数据失败',
      });
    }
  }

  // 获取系统趋势数据（带用户数据隔离）
  async getSystemTrend(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const admin = isAdmin(req);
      const systemIdParam = req.params['systemId'];
      if (!systemIdParam) {
        res.status(400).json({
          success: false,
          error: '缺少系统ID参数',
        });
        return;
      }
      const systemId = parseInt(systemIdParam);
      const type = (req.query['type'] as 'all' | 'urgent') || 'all';
      const data = await statisticsService.getSystemTrend(systemId.toString(), type, undefined, userId, admin);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error getting system trend', error);
      res.status(500).json({
        success: false,
        error: '获取系统趋势数据失败',
      });
    }
  }

  // 获取项目汇总系统分布饼图数据（带用户数据隔离）
  async getOverviewSystemDistribution(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const admin = isAdmin(req);
      const urgentOnly = req.query['urgent'] === 'true';
      const data = await statisticsService.getSystemDistribution(urgentOnly, undefined, undefined, userId, admin);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error getting overview system distribution', error);
      res.status(500).json({
        success: false,
        error: '获取系统分布数据失败',
      });
    }
  }

  // 获取项目汇总优先级分布饼图数据（带用户数据隔离）
  async getOverviewPriorityDistribution(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const admin = isAdmin(req);
      const data = await statisticsService.getPriorityDistribution(undefined, undefined, userId, admin);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error getting overview priority distribution', error);
      res.status(500).json({
        success: false,
        error: '获取优先级分布数据失败',
      });
    }
  }

  // 获取系统优先级分布饼图数据
  async getSystemPriorityDistribution(req: Request, res: Response): Promise<void> {
    try {
      const systemIdParam = req.params['systemId'];
      if (!systemIdParam) {
        res.status(400).json({
          success: false,
          error: '缺少系统ID参数',
        });
        return;
      }
      const systemId = parseInt(systemIdParam);
      const data = await statisticsService.getPriorityDistribution(systemId.toString());
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error getting system priority distribution', error);
      res.status(500).json({
        success: false,
        error: '获取系统优先级分布数据失败',
      });
    }
  }

  // 获取系统分布饼图数据（支持systemId参数）
  async getSystemSystemDistribution(req: Request, res: Response): Promise<void> {
    try {
      const systemIdParam = req.params['systemId'];
      if (!systemIdParam) {
        res.status(400).json({
          success: false,
          error: '缺少系统ID参数',
        });
        return;
      }
      const systemId = parseInt(systemIdParam);
      const urgentOnly = req.query['urgent'] === 'true';
      const data = await statisticsService.getSystemDistribution(urgentOnly, systemId.toString());
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error getting system system distribution', error);
      res.status(500).json({
        success: false,
        error: '获取系统分布数据失败',
      });
    }
  }

  // 清除缓存
  async clearCache(_req: Request, res: Response): Promise<void> {
    try {
      treeService.clearCache();
      listService.clearCache();
      statisticsService.clearCache();
      res.status(200).json({
        success: true,
        message: '缓存已清除',
      });
    } catch (error) {
      logger.error('Error clearing cache', error);
      res.status(500).json({
        success: false,
        error: '清除缓存失败',
      });
    }
  }
}

export default new DefectController();