import cron from 'node-cron';
import axios from 'axios';
import logger from '../utils/logger';
import listService from './listService';
import { DefectQueryParams } from '../types/defect';
import { prisma } from '../utils/prisma';

interface TodoStats {
  total: number;
  bySystem: Array<{
    systemId: number;
    systemName: string;
    count: number;
    issues: Array<{
      id: number;
      title: string;
      status: string;
      priority: string;
      updatedAt: string;
    }>;
  }>;
}

export class ServerChanService {
  private taskRunning: boolean = false;

  constructor() {
    // 构造函数不再需要参数，将从数据库获取sendKeys
  }

  /**
   * 从数据库获取活跃的接收人员的sendKey
   */
  private async getActiveSendKeys(): Promise<string[]> {
    try {
      const recipients = await prisma.notification_recipients.findMany({
        where: {
          active: true
        },
        select: {
          send_key: true
        }
      });

      const sendKeys = recipients.map(recipient => recipient.send_key).filter(Boolean);
      logger.info('serverchan', 'active_send_keys_fetched', {
        count: sendKeys.length
      });
      return sendKeys;
    } catch (error) {
      logger.error('serverchan', 'error_getting_send_keys', {
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * 发送Server酱通知
   */
  async sendNotification(title: string, desp: string): Promise<boolean> {
    try {
      // 从数据库获取活跃的sendKey
      const sendKeys = await this.getActiveSendKeys();
      
      if (sendKeys.length === 0) {
        logger.warn('serverchan', 'no_active_send_keys');
        return false;
      }

      let successCount = 0;
      let failureCount = 0;
      
      // 循环发送给所有接收者
      for (const sendKey of sendKeys) {
        try {
          const response = await axios.post(
            `https://sctapi.ftqq.com/${sendKey}.send`,
            new URLSearchParams({
              title: title,
              desp: desp
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              timeout: 10000
            }
          );

          if (response.data && response.data.code === 0) {
            successCount++;
            logger.info('serverchan', 'notification_sent', {
              title,
              sendKey
            });
          } else {
            failureCount++;
            logger.error('serverchan', 'notification_failed', {
              title,
              error: response.data?.message || '未知错误',
              sendKey
            });
          }
        } catch (error) {
          failureCount++;
          logger.error('serverchan', 'notification_error', {
            title,
            error: (error as Error).message,
            sendKey
          });
        }
      }

      logger.info('serverchan', 'notification_send_summary', {
        title,
        totalCount: sendKeys.length,
        successCount,
        failureCount
      });
      
      // 只要有一个接收人发送成功，就返回true
      // 这样即使部分接收人发送失败，也不会影响整体功能
      return successCount > 0;
    } catch (error) {
      logger.error('serverchan', 'notification_error', {
        title,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * 查询待办事项统计
   */
  async getTodoStats(): Promise<TodoStats> {
    try {
      // 使用与MyTodoPage相同的筛选条件
      const params: DefectQueryParams = {
        status_id: '3', // 已解决
        page: 1,
        pageSize: 1000, // 足够大的页码以获取所有数据
      };

      logger.info('serverchan', 'fetching_real_todo_stats', { params });
      
      // 从实际数据库获取待办事项
      const response = await listService.getDefects(params);
      const defects = response.list;
      const total = response.total;

      logger.info('serverchan', 'todo_stats_fetched', { total, defectCount: defects.length });

      // 按系统分组统计并添加问题列表
      const systemMap = new Map<string, Array<{
        id: number;
        title: string;
        status: string;
        priority: string;
        updatedAt: string;
      }>>();

      defects.forEach(defect => {
        const systemModuleName = defect.system_module_name || '其他';
        let systemName = systemModuleName;
        
        // 提取系统名称
        if (systemModuleName.includes(' - ')) {
          const parts = systemModuleName.split(' - ');
          systemName = parts[0] || '其他';
        }
        
        // 添加问题到系统列表
        if (!systemMap.has(systemName)) {
          systemMap.set(systemName, []);
        }
        systemMap.get(systemName)?.push({
          id: defect.id,
          title: defect.subject || '无标题',
          status: defect.status_name || '未知状态',
          priority: defect.priority_name || '一般',
          updatedAt: defect.updated_on || new Date().toISOString()
        });
      });

      // 转换为数组格式
      const bySystem = Array.from(systemMap.entries())
        .map(([systemName, issues], index) => ({
          systemId: index + 1,
          systemName,
          count: issues.length,
          issues
        }))
        .sort((a, b) => b.count - a.count);

      const stats: TodoStats = {
        total,
        bySystem
      };

      logger.info('serverchan', 'todo_stats_calculated', stats);
      return stats;
    } catch (error) {
      logger.error('serverchan', 'todo_stats_error', {
        error: (error as Error).message
      });
      return {
        total: 0,
        bySystem: []
      };
    }
  }

  /**
   * 生成待办提醒消息
   */
  async generateTodoMessage(): Promise<string> {
    const stats = await this.getTodoStats();
    
    let message = `## 缺陷管理待办提醒\n\n`;
    message += `### 📊 总体统计\n`;
    message += `您当前共有 **${stats.total}** 条待办事项需要处理\n\n`;

    if (stats.bySystem.length > 0) {
      stats.bySystem.forEach(item => {
        message += `### 🏷️ 系统：${item.systemName} (${item.count} 条)\n`;
        message += `| ID | 标题 | 优先级 | 更新时间 |\n`;
        message += `| --- | --- | --- | --- |\n`;
        
        // 添加问题列表（表格形式）
        if (item.issues.length > 0) {
          item.issues.forEach(issue => {
            const updatedTime = issue.updatedAt ? new Date(issue.updatedAt).toLocaleString('zh-CN') : '';
            message += `| ${issue.id} | ${issue.title} | ${issue.priority} | ${updatedTime} |\n`;
          });
        }
        message += `\n`;
      });
    }

    message += `### ⏰ 提醒时间\n`;
    message += `${new Date().toLocaleString('zh-CN')}\n\n`;

    message += `### 🎯 操作建议\n`;
    message += `- **优先处理**：系统分布中数量较多的系统\n`;
    message += `- **及时更新**：处理完成后请更新状态\n`;
    message += `- **定期检查**：建议每天至少检查一次待办事项\n\n`;

    message += `### 🔗 快速链接\n`;
    message += `[立即处理](http://10.20.42.172:5175/defects/todo)\n\n`;

    message += `---\n`;
    message += `*此消息由缺陷管理系统自动发送，请勿回复*`;

    return message;
  }

  /**
   * 检查是否为工作日
   */
  isWorkday(): boolean {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // 0是周日，6是周六
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  /**
   * 检查是否在工作时间内（9:00-18:00）
   */
  isWorkingHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 9 && hour < 18;
  }

  /**
   * 执行待办提醒
   */
  async executeTodoReminder(): Promise<void> {
    if (this.taskRunning) {
      logger.warn('serverchan', 'task_already_running');
      return;
    }

    this.taskRunning = true;

    try {
      // 检查是否为工作日和工作时间
      if (!this.isWorkday()) {
        logger.info('serverchan', 'skipped_non_workday');
        return;
      }

      if (!this.isWorkingHours()) {
        logger.info('serverchan', 'skipped_non_working_hours');
        return;
      }

      // 生成消息内容
      const message = await this.generateTodoMessage();
      const title = `【缺陷管理】待办事项提醒 (${new Date().toLocaleTimeString('zh-CN')})`;

      // 发送通知
      const success = await this.sendNotification(title, message);
      
      if (success) {
        logger.info('serverchan', 'todo_reminder_sent');
      } else {
        logger.error('serverchan', 'todo_reminder_failed');
      }
    } catch (error) {
      logger.error('serverchan', 'todo_reminder_error', {
        error: (error as Error).message
      });
    } finally {
      this.taskRunning = false;
    }
  }

  /**
   * 启动定时任务
   */
  startScheduledTasks(): void {
    // 每天9:00-18:00之间，每个整点执行一次
    //  cron表达式：0 9-18 * * 1-5
    cron.schedule('0 9-18 * * 1-5', async () => {
      logger.info('serverchan', 'scheduled_task_executing');
      await this.executeTodoReminder();
    }, {
      timezone: 'Asia/Shanghai'
    });

    logger.info('serverchan', 'scheduled_task_started', {
      cronExpression: '0 9-18 * * 1-5',
      description: '工作日9:00-18:00之间每个整点执行'
    });
  }


}

// 创建全局实例
export const serverChanService = new ServerChanService();

export default serverChanService;