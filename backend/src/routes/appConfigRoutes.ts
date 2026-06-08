import { Router } from 'express';
import * as controller from '../controllers/appConfigController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 获取应用配置列表（带用户数据隔离）
router.get('/', authMiddleware, controller.getAppConfigs);

// 获取单个应用配置
router.get('/:id', controller.getAppConfig);

// 创建应用配置（自动关联当前用户）
router.post('/', authMiddleware, controller.createAppConfig);

// 更新应用配置
router.put('/:id', controller.updateAppConfig);

// 删除应用配置
router.delete('/:id', controller.deleteAppConfig);

// 查看Webhook密钥（只读）
router.get('/:id/webhook-secret', controller.getWebhookSecret);

// 重新生成Webhook密钥
router.post('/:id/regenerate-secret', controller.regenerateSecret);

// 数据迁移：将现有应用关联到指定系统
router.post('/migrate-to-system', controller.migrateAppsToSystem);

export default router;
