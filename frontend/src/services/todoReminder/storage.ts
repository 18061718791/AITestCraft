/**
 * 我的待办提醒功能 - 配置存储服务
 * 使用localStorage持久化存储配置和基准数据
 */

import {
  TodoReminderConfig,
  TodoBaselineMap,
  UserBaselineData,
  NewTodoData,
  DEFAULT_CONFIG,
  STORAGE_KEYS,
} from '../../types/todoReminder';

/**
 * 配置存储服务类
 */
class TodoReminderStorage {
  /**
   * 获取配置
   * @returns 配置对象，如果不存在则返回默认配置
   */
  getConfig(): TodoReminderConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 合并默认值，确保所有字段都存在
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
        };
      }
    } catch (e) {
      // 读取失败时返回默认配置
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * 保存配置
   * @param config 部分配置对象
   */
  saveConfig(config: Partial<TodoReminderConfig>): void {
    try {
      const current = this.getConfig();
      const updated: TodoReminderConfig = {
        ...current,
        ...config,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    } catch (e) {
      // 保存失败时静默处理
    }
  }

  /**
   * 获取当前用户ID
   * @returns 当前用户ID，如果不存在则返回null
   */
  getCurrentUserId(): number | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored) {
        const userData = JSON.parse(stored);
        return userData.userId || null;
      }
    } catch (e) {
      // 读取失败时返回null
    }
    return null;
  }

  /**
   * 保存当前用户信息
   * @param userId 用户ID
   * @param username 用户名
   */
  saveCurrentUser(userId: number, username: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({ userId, username }));
    } catch (e) {
      // 保存失败时静默处理
    }
  }

  /**
   * 检查用户是否切换
   * @param userId 当前用户ID
   * @returns 是否切换了用户
   */
  hasUserSwitched(userId: number): boolean {
    const currentUserId = this.getCurrentUserId();
    return currentUserId !== null && currentUserId !== userId;
  }

  /**
   * 获取基准数据（带用户数据隔离）
   * @param userId 用户ID
   * @returns 基准数据映射
   */
  getBaseline(userId?: number): TodoBaselineMap {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BASELINE);
      if (stored) {
        const data: UserBaselineData = JSON.parse(stored);
        // 如果提供了userId，检查是否匹配
        if (userId && data.userId !== userId) {
          return {}; // 用户不匹配，返回空数据
        }
        return data.baseline || {};
      }
    } catch (e) {
      // 读取失败时返回空对象
    }
    return {};
  }

  /**
   * 保存基准数据（带用户数据隔离）
   * @param baseline 基准数据映射
   * @param userId 用户ID
   * @param username 用户名
   */
  saveBaseline(baseline: TodoBaselineMap, userId: number, username: string): void {
    try {
      const data: UserBaselineData = {
        userId,
        username,
        baseline,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.BASELINE, JSON.stringify(data));
      // 同时保存当前用户信息
      this.saveCurrentUser(userId, username);
    } catch (e) {
      // 保存失败时静默处理
    }
  }

  /**
   * 更新指定项目的基准
   * @param projectId 项目ID
   * @param todoIds 待办缺陷ID列表
   * @param userId 用户ID（可选，用于数据隔离）
   * @param username 用户名（可选）
   */
  updateProjectBaseline(projectId: string | number, todoIds: number[], userId?: number, username?: string): void {
    try {
      const baseline = this.getBaseline(userId);
      baseline[String(projectId)] = {
        todoIds,
        updatedAt: new Date().toISOString(),
      };
      if (userId && username) {
        this.saveBaseline(baseline, userId, username);
      } else {
        // 兼容旧版本：如果没有用户信息，直接保存（不带用户隔离）
        localStorage.setItem(STORAGE_KEYS.BASELINE, JSON.stringify({ baseline }));
      }
    } catch (e) {
      // 更新失败时静默处理
    }
  }

  /**
   * 获取新增待办数据
   * @returns 新增待办数据，如果不存在则返回null
   */
  getNewTodoData(): NewTodoData | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEW_DATA);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // 读取失败时返回null
    }
    return null;
  }

  /**
   * 保存新增待办数据
   * @param data 新增待办数据
   */
  saveNewTodoData(data: NewTodoData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NEW_DATA, JSON.stringify(data));
    } catch (e) {
      // 保存失败时静默处理
    }
  }

  /**
   * 清除新增待办数据
   */
  clearNewTodoData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.NEW_DATA);
    } catch (e) {
      // 清除失败时静默处理
    }
  }

  /**
   * 清除所有数据（重置）
   */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CONFIG);
      localStorage.removeItem(STORAGE_KEYS.BASELINE);
      localStorage.removeItem(STORAGE_KEYS.NEW_DATA);
    } catch (e) {
      // 清除失败时静默处理
    }
  }

  /**
   * 获取指定项目的基准
   * @param projectId 项目ID
   * @returns 项目基准，如果不存在则返回null
   */
  getProjectBaseline(projectId: string | number): { todoIds: number[]; updatedAt: string } | null {
    const baseline = this.getBaseline();
    return baseline[String(projectId)] || null;
  }

  /**
   * 检查是否存在基准数据
   * @returns 是否存在
   */
  hasBaseline(): boolean {
    const baseline = this.getBaseline();
    return Object.keys(baseline).length > 0;
  }
}

// 导出单例实例
export default new TodoReminderStorage();
