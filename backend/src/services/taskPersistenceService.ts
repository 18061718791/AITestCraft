import Redis from 'ioredis';
import { TaskStatus } from '../types';
import logger from '../utils/logger';

export class TaskPersistenceService {
  private redis: Redis | null = null;
  private readonly TASK_PREFIX = 'ai_task:';
  private readonly TASK_TTL = 24 * 60 * 60; // 24小时
  private useMemory = false;
  private memoryStore: Map<string, TaskStatus> = new Map();

  constructor() {
    this.initRedis();
  }

  private initRedis(): void {
    try {
      const host = process.env['REDIS_HOST'] || 'localhost';
      const port = parseInt(process.env['REDIS_PORT'] || '6379');
      const password = process.env['REDIS_PASSWORD'] || undefined;
      const db = parseInt(process.env['REDIS_DB'] || '0');

      this.redis = new Redis({
        host,
        port,
        password,
        db,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('task_persistence', 'redis_retry_exceeded', { times });
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('connect', () => {
        logger.info('task_persistence', 'redis_connected', { host, port });
        logger.info('Redis 连接成功，启用 Redis 持久化');
        this.useMemory = false;
      });

      this.redis.on('error', (error) => {
        logger.warn('task_persistence', 'redis_error', { error: error.message });
        logger.warn('Redis 连接失败，降级到内存存储模式');
        this.useMemory = true;
      });
    } catch (error) {
      logger.warn('task_persistence', 'redis_init_failed', { error });
      logger.warn('Redis 初始化失败，降级到内存存储模式');
      this.useMemory = true;
    }
  }

  async saveTask(task: TaskStatus): Promise<void> {
    const key = `${this.TASK_PREFIX}${task.taskId}`;
    const data = JSON.stringify(task);

    if (this.useMemory || !this.redis) {
      this.memoryStore.set(key, { ...task });
      logger.info('task_persistence', 'task_saved_memory', { taskId: task.taskId });
      logger.info(`任务 ${task.taskId} 已保存到内存存储`);
      return;
    }

    try {
      await this.redis.setex(key, this.TASK_TTL, data);
      logger.info('task_persistence', 'task_saved_redis', { taskId: task.taskId });
      logger.info(`任务 ${task.taskId} 已保存到 Redis`);
    } catch (error) {
      logger.warn('task_persistence', 'redis_save_failed', { taskId: task.taskId, error });
      logger.warn(`任务 ${task.taskId} 保存到 Redis 失败，已降级到内存存储`);
      this.memoryStore.set(key, { ...task });
      this.useMemory = true;
    }
  }

  async getTask(taskId: string): Promise<TaskStatus | null> {
    const key = `${this.TASK_PREFIX}${taskId}`;

    if (this.useMemory || !this.redis) {
      const task = this.memoryStore.get(key);
      logger.info(`从内存存储获取任务 ${taskId}`);
      return task ? { ...task } : null;
    }

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('task_persistence', 'redis_get_failed', { taskId, error });
      logger.warn(`从 Redis 获取任务 ${taskId} 失败，尝试从内存存储获取`);
      const task = this.memoryStore.get(key);
      return task ? { ...task } : null;
    }
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus['status'],
    data?: any,
    error?: string
  ): Promise<void> {
    const task = await this.getTask(taskId);
    if (task) {
      logger.info(`更新任务 ${taskId} 状态为 ${status}`);
      task.status = status;
      task.data = data;
      if (error !== undefined) {
        task.error = error;
      } else {
        delete task.error;
      }
      task.updatedAt = new Date();
      await this.saveTask(task);
    } else {
      logger.warn(`任务 ${taskId} 不存在，无法更新状态`);
    }
  }

  async getTasksBySession(sessionId: string): Promise<TaskStatus[]> {
    if (this.useMemory || !this.redis) {
      const tasks: TaskStatus[] = [];
      for (const [, task] of this.memoryStore.entries()) {
        if (task.sessionId === sessionId) {
          tasks.push({ ...task });
        }
      }
      logger.info(`从内存存储获取会话 ${sessionId} 的任务列表，共 ${tasks.length} 个任务`);
      return tasks;
    }

    try {
      const keys = await this.redis.keys(`${this.TASK_PREFIX}*`);
      const tasks: TaskStatus[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const task = JSON.parse(data);
          if (task.sessionId === sessionId) {
            tasks.push(task);
          }
        }
      }

      return tasks;
    } catch (error) {
      logger.warn('task_persistence', 'redis_get_by_session_failed', { sessionId, error });
      logger.warn(`从 Redis 获取会话 ${sessionId} 的任务列表失败，降级到内存存储`);
      const tasks: TaskStatus[] = [];
      for (const [, task] of this.memoryStore.entries()) {
        if (task.sessionId === sessionId) {
          tasks.push({ ...task });
        }
      }
      return tasks;
    }
  }

  async cleanupOldTasks(): Promise<number> {
    if (this.useMemory || !this.redis) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      let cleanedCount = 0;
      for (const [key, task] of this.memoryStore.entries()) {
        if (new Date(task.updatedAt) < oneHourAgo) {
          this.memoryStore.delete(key);
          cleanedCount++;
        }
      }
      logger.info(`内存存储模式：清理了 ${cleanedCount} 个旧任务`);
      return cleanedCount;
    }

    // Redis自动过期，无需手动清理
    logger.info('Redis 模式：任务通过 TTL 自动过期，无需手动清理');
    return 0;
  }

  async healthCheck(): Promise<{ redis: boolean; memory: boolean }> {
    let redisHealthy = false;
    if (this.redis && !this.useMemory) {
      try {
        await this.redis.ping();
        redisHealthy = true;
      } catch {
        redisHealthy = false;
      }
    }
    return { redis: redisHealthy, memory: true };
  }
}

export const taskPersistenceService = new TaskPersistenceService();
