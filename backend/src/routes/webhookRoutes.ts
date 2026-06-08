import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import {
  verifyGitlabWebhook,
  parseGitlabEvent,
  getAppConfigsByRepository,
  shouldListenBranch,
  createDeploymentTask
} from '../services/webhookService';
import { notifyNewDeploymentTasks } from '../services/deploymentNotificationService';

const router = Router();

/**
 * POST /webhooks/gitlab
 * 接收GitLab Webhook推送
 */
router.post('/gitlab', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-gitlab-token'] as string;
    const eventType = req.headers['x-gitlab-event'] as string;

    logger.info(`收到GitLab Webhook: ${eventType}`);

    if (!signature) {
      logger.warn('GitLab Webhook: 缺少签名');
      return res.status(401).json({ success: false, message: '缺少签名' });
    }

    // 解析事件
    const eventData = parseGitlabEvent(req.body);
    if (!eventData) {
      logger.warn('GitLab Webhook: 无法解析事件');
      return res.status(400).json({ success: false, message: '无法解析事件' });
    }

    const { repository, projectPath, branch, commit } = eventData;

    logger.info(`GitLab事件: ${repository}/${projectPath}, 分支: ${branch}`);

    // 获取该仓库所有启用的配置（支持同一仓库多配置场景）
    const configs = await getAppConfigsByRepository(repository);
    logger.info(`GitLab Webhook: 找到 ${configs.length} 个匹配仓库 ${repository} 的配置`);
    configs.forEach((cfg, idx) => {
      logger.info(`  配置[${idx}]: id=${cfg.id}, name=${cfg.app_name}, repo=${cfg.repository_name}, path=${cfg.project_path}, secret=${cfg.webhook_secret?.substring(0, 8)}...`);
    });

    if (configs.length === 0) {
      logger.warn(`GitLab Webhook: 应用 ${repository}/${projectPath} 未配置`);
      return res.status(404).json({ success: false, message: '应用未配置' });
    }

    // 先过滤出分支匹配的配置
    const branchMatchedConfigs = configs.filter(config => shouldListenBranch(config, branch));
    logger.info(`GitLab Webhook: 分支 ${branch} 匹配到 ${branchMatchedConfigs.length} 个配置`);

    if (branchMatchedConfigs.length === 0) {
      logger.info(`GitLab Webhook: 分支 ${branch} 未在任一配置中监听`);
      return res.status(200).json({ success: true, message: '分支未监听' });
    }

    // 用签名遍历匹配正确的配置（解决同一仓库多配置密钥不同的问题）
    const payload = JSON.stringify(req.body);
    const config = branchMatchedConfigs.find(cfg =>
      verifyGitlabWebhook(payload, signature, cfg.webhook_secret)
    );

    if (!config) {
      logger.warn(`GitLab Webhook: 签名验证失败 - ${repository}/${projectPath}`);
      logger.warn(`GitLab Webhook: 请求签名=${signature?.substring(0, 8)}..., 分支匹配配置数=${branchMatchedConfigs.length}`);
      branchMatchedConfigs.forEach((cfg, idx) => {
        logger.warn(`  配置[${idx}]: id=${cfg.id}, secret=${cfg.webhook_secret?.substring(0, 8)}...`);
      });
      return res.status(401).json({ success: false, message: '签名验证失败' });
    }

    logger.info(`GitLab Webhook: 签名验证通过，匹配配置 id=${config.id}, name=${config.app_name}`);

    // 创建部署任务
    const task = await createDeploymentTask(
      config.id,
      config.app_name,
      repository,
      branch,
      commit
    );

    logger.info(`GitLab Webhook: 为 ${config.app_name} 创建了部署任务`);

    // 发送通知
    await notifyNewDeploymentTasks(repository, branch, [task]);

    return res.status(200).json({
      success: true,
      data: {
        taskCreated: 1,
        task: {
          id: task.id,
          appName: task.app_name,
          status: task.status
        }
      }
    });

  } catch (error) {
    logger.error('GitLab Webhook处理错误:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
