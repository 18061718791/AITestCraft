import { notificationService } from './notificationService';
import logger from '../utils/logger';

interface DeploymentTask {
  id: number;
  app_name: string;
  commit_message: string | null;
  commit_author: string | null;
}

/**
 * 通知新的部署任务
 */
export async function notifyNewDeploymentTasks(
  repository: string,
  branch: string,
  tasks: DeploymentTask[]
) {
  try {
    // 使用 notificationService 发送广播
    const io = notificationService.getIO();
    if (io) {
      const notificationData = {
        repository,
        branch,
        tasks: tasks.map(t => ({
          id: t.id,
          appName: t.app_name,
          commitMessage: t.commit_message,
          commitAuthor: t.commit_author
        })),
        timestamp: new Date().toISOString()
      };

      // 获取所有 socket 连接
      const allSockets = await io.fetchSockets();
      logger.info(`【部署通知】当前连接数: ${allSockets.length}, 准备发送通知`);

      if (allSockets.length === 0) {
        logger.warn('【部署通知】没有活跃的 WebSocket 连接，通知无法送达前端');
      }

      // 向所有 socket 直接发送（最可靠的方式）
      allSockets.forEach((socket: any) => {
        socket.emit('new-deployment-tasks', notificationData);
        logger.info(`【部署通知】已发送到 socket: ${socket.id}`);
      });

      // 同时广播到默认命名空间（兼容方式）
      io.emit('new-deployment-tasks', notificationData);

      logger.info(`【部署通知】已发送: ${repository} 有 ${tasks.length} 个新任务, 连接数: ${allSockets.length}`);
    } else {
      logger.warn('【部署通知】WebSocket io 对象未初始化，无法发送通知');
    }

    // 注意：Server酱推送已在serverChanService中实现定时任务
    // 这里只发送WebSocket实时通知

  } catch (error) {
    logger.error('【部署通知】发送部署任务通知失败:', error);
  }
}

interface TaskStatusUpdate {
  id: number;
  app_name: string;
  status: string;
  deployed_by: string | null;
  deployed_at: Date | null;
}

/**
 * 通知任务状态更新
 */
export async function notifyTaskStatusUpdate(task: TaskStatusUpdate) {
  try {
    const io = (notificationService as any).io;
    if (io) {
      io.emit('deployment-task-update', {
        taskId: task.id,
        appName: task.app_name,
        status: task.status,
        deployedBy: task.deployed_by,
        deployedAt: task.deployed_at,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('发送任务状态更新通知失败:', error);
  }
}
