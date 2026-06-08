/**
 * 我的待办提醒功能 - 基准状态管理
 * 管理各项目待办基准状态，用于对比识别新增待办
 * 支持用户数据隔离
 */

import {
  TodoBaselineMap,
  ProjectBaseline,
  TodoQueryResult,
} from '../../types/todoReminder';
import storage from './storage';

/**
 * 基准管理器类
 */
class BaselineManager {
  private currentUserId: number | null = null;
  private currentUsername: string | null = null;

  /**
   * 设置当前用户信息
   * @param userId 用户ID
   * @param username 用户名
   */
  setCurrentUser(userId: number, username: string): void {
    this.currentUserId = userId;
    this.currentUsername = username;
    
    // 检查用户是否切换，如果切换了则清除旧数据
    if (storage.hasUserSwitched(userId)) {
      console.log(`[TodoReminder] 检测到用户切换，清除旧用户数据`);
      this.clearBaseline();
    }
    
    // 保存当前用户信息
    storage.saveCurrentUser(userId, username);
  }

  /**
   * 获取当前用户ID
   * @returns 当前用户ID
   */
  getCurrentUserId(): number | null {
    return this.currentUserId || storage.getCurrentUserId();
  }

  /**
   * 初始化基准（首次记录）
   * @param results 所有项目的待办查询结果
   */
  initializeBaseline(results: TodoQueryResult[]): void {
    const baseline: TodoBaselineMap = {};
    
    for (const result of results) {
      baseline[String(result.projectId)] = {
        todoIds: result.todos.map(todo => todo.id),
        updatedAt: new Date().toISOString(),
      };
    }
    
    const userId = this.getCurrentUserId();
    const username = this.currentUsername || 'unknown';
    
    if (userId) {
      storage.saveBaseline(baseline, userId, username);
    } else {
      // 如果没有用户信息，使用旧版本存储方式
      storage.saveBaseline(baseline, 0, 'unknown');
    }
  }

  /**
   * 更新基准为当前状态
   * @param results 所有项目的待办查询结果
   */
  updateBaseline(results: TodoQueryResult[]): void {
    const userId = this.getCurrentUserId();
    const username = this.currentUsername || 'unknown';
    const baseline = storage.getBaseline(userId || undefined);
    
    for (const result of results) {
      baseline[String(result.projectId)] = {
        todoIds: result.todos.map(todo => todo.id),
        updatedAt: new Date().toISOString(),
      };
    }
    
    if (userId) {
      storage.saveBaseline(baseline, userId, username);
    } else {
      storage.saveBaseline(baseline, 0, 'unknown');
    }
  }

  /**
   * 更新指定项目的基准
   * @param projectId 项目ID
   * @param todoIds 待办缺陷ID列表
   */
  updateProjectBaseline(projectId: number | string, todoIds: number[]): void {
    const userId = this.getCurrentUserId();
    const username = this.currentUsername || 'unknown';
    storage.updateProjectBaseline(projectId, todoIds, userId || undefined, username);
  }

  /**
   * 获取指定项目的基准
   * @param projectId 项目ID
   * @returns 项目基准，如果不存在则返回null
   */
  getProjectBaseline(projectId: number | string): ProjectBaseline | null {
    return storage.getProjectBaseline(projectId);
  }

  /**
   * 获取所有项目的基准
   * @returns 基准数据映射
   */
  getAllBaseline(): TodoBaselineMap {
    const userId = this.getCurrentUserId();
    return storage.getBaseline(userId || undefined);
  }

  /**
   * 获取指定项目的基准ID列表
   * @param projectId 项目ID
   * @returns ID列表，如果不存在则返回空数组
   */
  getProjectBaselineIds(projectId: number | string): number[] {
    const baseline = this.getProjectBaseline(projectId);
    return baseline?.todoIds || [];
  }

  /**
   * 检查是否存在基准数据
   * @returns 是否存在
   */
  hasBaseline(): boolean {
    const userId = this.getCurrentUserId();
    const baseline = storage.getBaseline(userId || undefined);
    return Object.keys(baseline).length > 0;
  }

  /**
   * 检查指定项目是否有基准
   * @param projectId 项目ID
   * @returns 是否有基准
   */
  hasProjectBaseline(projectId: number | string): boolean {
    const userId = this.getCurrentUserId();
    const baseline = storage.getBaseline(userId || undefined);
    return String(projectId) in baseline;
  }

  /**
   * 清除所有基准数据
   */
  clearBaseline(): void {
    storage.saveBaseline({}, 0, 'unknown');
  }

  /**
   * 清除指定项目的基准
   * @param projectId 项目ID
   */
  clearProjectBaseline(projectId: number | string): void {
    const userId = this.getCurrentUserId();
    const baseline = storage.getBaseline(userId || undefined);
    delete baseline[String(projectId)];
    
    if (userId && this.currentUsername) {
      storage.saveBaseline(baseline, userId, this.currentUsername);
    } else {
      storage.saveBaseline(baseline, 0, 'unknown');
    }
  }

  /**
   * 获取基准统计信息
   * @returns 统计信息
   */
  getBaselineStats(): {
    projectCount: number;
    totalTodoCount: number;
    lastUpdated: string | null;
  } {
    const userId = this.getCurrentUserId();
    const baseline = storage.getBaseline(userId || undefined);
    const projects = Object.values(baseline);
    
    let totalTodoCount = 0;
    let lastUpdated: string | null = null;
    
    for (const project of projects) {
      totalTodoCount += project.todoIds.length;
      if (!lastUpdated || project.updatedAt > lastUpdated) {
        lastUpdated = project.updatedAt;
      }
    }
    
    return {
      projectCount: projects.length,
      totalTodoCount,
      lastUpdated,
    };
  }
}

// 导出单例实例
export default new BaselineManager();
