import { Router } from 'express';
import * as controller from '../controllers/deploymentTaskController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 获取任务列表（带用户数据隔离）
router.get('/', authMiddleware, controller.getTasks);

// 获取按应用分组的待部署任务（用于新UI展示，带用户数据隔离）
router.get('/pending-grouped-by-app', authMiddleware, controller.getPendingTasksGroupedByApp);

// 获取应用部署列表（用于部署历史页面，带用户数据隔离）
router.get('/app-deployment-list', authMiddleware, controller.getAppDeploymentList);

// 获取应用的部署历史（带用户数据隔离）
router.get('/app-history/:appId', authMiddleware, controller.getAppDeploymentHistory);

// 获取任务统计（带用户数据隔离）
router.get('/stats', authMiddleware, controller.getStats);

// 更新任务状态
router.put('/:id/status', authMiddleware, controller.updateStatus);

// 批量更新任务状态
router.put('/batch/status', authMiddleware, controller.batchUpdateStatus);

export default router;
