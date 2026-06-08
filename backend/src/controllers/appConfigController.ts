import { Request, Response } from 'express';
import * as appConfigService from '../services/appConfigService';
import logger from '../utils/logger';
import type { AuthRequest } from '../middleware/auth';

// 辅助函数：检查是否是管理员
const isAdmin = (req: AuthRequest): boolean => {
  return req.user?.roles?.some((r: any) => r.code === 'admin') ?? false;
};

/**
 * 获取应用配置列表（带用户数据隔离）
 */
export async function getAppConfigs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const admin = isAdmin(req);

    const params: appConfigService.AppConfigQueryParams = {
      page: parseInt(req.query['page'] as string) || 1,
      pageSize: parseInt(req.query['pageSize'] as string) || 20,
      isActive: req.query['isActive'] === 'true' ? true :
        req.query['isActive'] === 'false' ? false : undefined,
      projectId: req.query['projectId'] as string | undefined,
      directoryId: req.query['directoryId'] as string | undefined,
      userId: userId,
      isAdmin: admin
    };

    const result = await appConfigService.getAppConfigs(params);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取应用配置列表失败:', error);
    res.status(500).json({ success: false, message: '获取配置列表失败' });
  }
}

/**
 * 获取单个应用配置
 */
export async function getAppConfig(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params['id'] as string);
    const config = await appConfigService.getAppConfigById(id);

    if (!config) {
      res.status(404).json({ success: false, message: '应用配置不存在' });
      return;
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('获取应用配置失败:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
}

/**
 * 创建应用配置（自动关联当前用户）
 */
export async function createAppConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { appName, appCode, description, gitUrl, repositoryName, projectPath, branches, webhookSecret, isActive, projectId, directoryId, jenkinsUrl } = req.body;
    const userId = req.user?.userId;

    // 参数验证
    if (!appName || !appCode || !gitUrl || !repositoryName || !projectPath || !branches) {
      res.status(400).json({
        success: false,
        message: '缺少必填参数：appName, appCode, gitUrl, repositoryName, projectPath, branches'
      });
      return;
    }

    const config = await appConfigService.createAppConfig({
      appName,
      appCode,
      description,
      gitUrl,
      repositoryName,
      projectPath,
      branches: Array.isArray(branches) ? branches : [branches],
      webhookSecret,
      isActive,
      projectId,
      directoryId,
      jenkinsUrl,
      createdBy: userId
    });

    res.json({
      success: true,
      data: {
        ...config,
        branches: JSON.parse(config.branches)
      }
    });
  } catch (error: any) {
    logger.error('创建应用配置失败:', error);

    // 处理唯一性冲突
    if (error.code === 'P2002') {
      res.status(400).json({
        success: false,
        message: error.message || '该用户下已存在相同应用编码的应用'
      });
      return;
    }

    res.status(500).json({ success: false, message: '创建配置失败' });
  }
}

/**
 * 更新应用配置
 */
export async function updateAppConfig(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params['id'] as string);
    const { appName, appCode, description, gitUrl, repositoryName, projectPath, branches, isActive, projectId, directoryId, jenkinsUrl } = req.body;

    const updateData: any = {};
    if (appName !== undefined) updateData.appName = appName;
    if (appCode !== undefined) updateData.appCode = appCode;
    if (description !== undefined) updateData.description = description;
    if (gitUrl !== undefined) updateData.gitUrl = gitUrl;
    if (repositoryName !== undefined) updateData.repositoryName = repositoryName;
    if (projectPath !== undefined) updateData.projectPath = projectPath;
    if (branches !== undefined) updateData.branches = Array.isArray(branches) ? branches : [branches];
    if (isActive !== undefined) updateData.isActive = isActive;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (directoryId !== undefined) updateData.directoryId = directoryId;
    if (jenkinsUrl !== undefined) updateData.jenkinsUrl = jenkinsUrl;

    const config = await appConfigService.updateAppConfig(id, updateData);

    res.json({
      success: true,
      data: {
        ...config,
        branches: JSON.parse(config.branches)
      }
    });
  } catch (error: any) {
    logger.error('更新应用配置失败:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: '应用配置不存在' });
      return;
    }

    if (error.code === 'P2002') {
      res.status(400).json({
        success: false,
        message: error.message || '该用户下已存在相同应用编码的应用'
      });
      return;
    }

    res.status(500).json({ success: false, message: '更新配置失败' });
  }
}

/**
 * 删除应用配置
 */
export async function deleteAppConfig(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params['id'] as string);
    await appConfigService.deleteAppConfig(id);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    logger.error('删除应用配置失败:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: '应用配置不存在' });
      return;
    }

    res.status(500).json({ success: false, message: '删除配置失败' });
  }
}

/**
 * 查看Webhook密钥（只读，不重新生成）
 */
export async function getWebhookSecret(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params['id'] as string);
    const config = await appConfigService.getAppConfigById(id);

    if (!config) {
      res.status(404).json({ success: false, message: '应用配置不存在' });
      return;
    }

    res.json({
      success: true,
      data: { webhookSecret: config.webhookSecret }
    });
  } catch (error) {
    logger.error('获取Webhook密钥失败:', error);
    res.status(500).json({ success: false, message: '获取密钥失败' });
  }
}

/**
 * 重新生成Webhook密钥
 */
export async function regenerateSecret(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params['id'] as string);
    const config = await appConfigService.regenerateWebhookSecret(id);

    res.json({
      success: true,
      data: { webhookSecret: config.webhook_secret }
    });
  } catch (error: any) {
    logger.error('重新生成Webhook密钥失败:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: '应用配置不存在' });
      return;
    }

    res.status(500).json({ success: false, message: '重新生成密钥失败' });
  }
}

/**
 * 数据迁移：将现有应用关联到指定系统
 */
export async function migrateAppsToSystem(req: Request, res: Response): Promise<void> {
  try {
    const { projectId, directoryId } = req.body;

    if (!projectId || !directoryId) {
      res.status(400).json({
        success: false,
        message: '缺少必填参数：projectId, directoryId'
      });
      return;
    }

    const count = await appConfigService.migrateExistingAppsToSystem(projectId, directoryId);

    res.json({
      success: true,
      data: { migratedCount: count },
      message: `成功迁移 ${count} 个应用到指定系统`
    });
  } catch (error) {
    logger.error('数据迁移失败:', error);
    res.status(500).json({ success: false, message: '数据迁移失败' });
  }
}
