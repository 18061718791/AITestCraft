import { prisma } from '../utils/prisma';
import { Request, Response } from 'express';
import logger from '../utils/logger';

class NotificationController {
  /**
   * 获取所有通知接收人
   */
  async getRecipients(_req: Request, res: Response) {
    try {
      const recipients = await prisma.notification_recipients.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          send_key: true,
          active: true
        },
        orderBy: {
          created_at: 'asc'
        }
      });

      res.json({
        success: true,
        data: recipients
      });
    } catch (error) {
      logger.error('Error getting recipients:', error);
      res.status(500).json({
        success: false,
        error: '获取通知接收人失败'
      });
    }
  }

  /**
   * 创建通知接收人
   */
  async createRecipient(req: Request, res: Response) {
    try {
      const { name, email, sendKey, active } = req.body;

      const recipient = await prisma.notification_recipients.create({
        data: {
          name,
          email,
          send_key: sendKey,
          active
        }
      });

      logger.info('Recipient created successfully', { id: recipient.id, name: recipient.name });

      res.json({
        success: true,
        data: recipient
      });
    } catch (error) {
      logger.error('Error creating recipient:', error);
      res.status(500).json({
        success: false,
        error: '创建通知接收人失败'
      });
    }
  }

  /**
   * 更新通知接收人
   */
  async updateRecipient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, sendKey, active } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: '接收人ID不能为空'
        });
        return;
      }

      const recipient = await prisma.notification_recipients.update({
        where: {
          id: parseInt(id)
        },
        data: {
          name,
          email,
          send_key: sendKey,
          active
        }
      });

      logger.info('Recipient updated successfully', { id: recipient.id, name: recipient.name });

      res.json({
        success: true,
        data: recipient
      });
    } catch (error) {
      logger.error('Error updating recipient:', error);
      res.status(500).json({
        success: false,
        error: '更新通知接收人失败'
      });
    }
  }

  /**
   * 删除通知接收人
   */
  async deleteRecipient(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: '接收人ID不能为空'
        });
        return;
      }

      await prisma.notification_recipients.delete({
        where: {
          id: parseInt(id)
        }
      });

      logger.info('Recipient deleted successfully', { id });

      res.json({
        success: true,
        message: '删除通知接收人成功'
      });
    } catch (error) {
      logger.error('Error deleting recipient:', error);
      res.status(500).json({
        success: false,
        error: '删除通知接收人失败'
      });
    }
  }

  /**
   * 获取通知设置
   */
  async getSettings(_req: Request, res: Response) {
    try {
      let settings = await prisma.notification_settings.findFirst({
        select: {
          id: true,
          enabled: true,
          start_time: true,
          end_time: true,
          interval: true
        }
      });

      // 如果没有设置，创建默认设置
      if (!settings) {
        settings = await prisma.notification_settings.create({
          data: {
            enabled: true,
            start_time: '09:00',
            end_time: '18:00',
            interval: 60
          },
          select: {
            id: true,
            enabled: true,
            start_time: true,
            end_time: true,
            interval: true
          }
        });

        // 创建唯一约束记录
        await prisma.notification_settings_unique.create({
          data: {
            setting_id: settings.id
          }
        });
      }

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error getting settings:', error);
      res.status(500).json({
        success: false,
        error: '获取通知设置失败'
      });
    }
  }

  /**
   * 更新通知设置
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const { enabled, startTime, endTime, interval } = req.body;

      let settings = await prisma.notification_settings.findFirst();

      if (settings) {
        // 更新现有设置
        settings = await prisma.notification_settings.update({
          where: {
            id: settings.id
          },
          data: {
            enabled,
            start_time: startTime,
            end_time: endTime,
            interval
          }
        });
      } else {
        // 创建新设置
        settings = await prisma.notification_settings.create({
          data: {
            enabled,
            start_time: startTime,
            end_time: endTime,
            interval
          }
        });

        // 创建唯一约束记录
        await prisma.notification_settings_unique.create({
          data: {
            setting_id: settings.id
          }
        });
      }

      logger.info('Settings updated successfully', { enabled, interval });

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        error: '更新通知设置失败'
      });
    }
  }

  /**
   * 发送测试通知
   */
  async sendTestNotification(_req: Request, res: Response) {
    try {
      // 导入serverChanService
      const { serverChanService } = await import('../services/serverChanService');

      // 生成测试消息
      const testMessage = `## 测试通知

这是一条测试消息，用于验证消息推送功能是否正常工作。

### 测试信息
- 发送时间: ${new Date().toLocaleString('zh-CN')}
- 测试类型: 手动测试

如果您收到这条消息，说明消息推送功能正常。`;

      // 发送测试通知
      const success = await serverChanService.sendNotification('【测试】消息推送功能验证', testMessage);

      if (success) {
        logger.info('Test notification sent successfully');
        res.json({
          success: true,
          message: '测试通知发送成功，请检查是否收到消息'
        });
      } else {
        logger.error('Test notification failed');
        res.status(500).json({
          success: false,
          error: '测试通知发送失败，请检查配置'
        });
      }
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        error: '发送测试通知失败'
      });
    }
  }
}

export const notificationController = new NotificationController();