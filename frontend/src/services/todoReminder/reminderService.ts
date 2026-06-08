/**
 * 我的待办提醒功能 - 提醒核心服务
 * 查询待办、对比基准、识别待办变化（新增/移除）
 */

import {
  NewTodoData,
  ProjectNewTodoDetail,
  TodoQueryResult,
  TodoBaselineMap,
} from '../../types/todoReminder';
import { projectApi } from '../project/projectApi';
import apiBase from '../apiBase';
import storage from './storage';
import baselineManager from './baselineManager';

/**
 * 提醒服务类
 */
class ReminderService {
  /**
   * 初始化并设置当前用户
   * @param userId 用户ID
   * @param username 用户名
   */
  initialize(userId: number, username: string): void {
    baselineManager.setCurrentUser(userId, username);
  }

  /**
   * 检查所有项目的待办
   * @param userId 可选的用户ID（用于数据隔离）
   * @param username 可选的用户名
   * @returns 待办变化数据，如果没有变化则返回null
   */
  async checkAllProjects(userId?: number, username?: string): Promise<NewTodoData | null> {
    try {
      // 如果提供了用户信息，设置当前用户
      if (userId && username) {
        this.initialize(userId, username);
      }
      
      // 1. 获取所有项目
      const projects = await projectApi.getProjects();
      
      if (!projects || projects.length === 0) {
        return null;
      }

      // 2. 查询各项目待办
      const results: TodoQueryResult[] = [];
      for (const project of projects) {
        try {
          const result = await this.checkProject(parseInt(project.id));
          results.push(result);
        } catch (error) {
          // 查询失败时继续处理其他项目
        }
      }

      // 3. 获取当前基准
      const baseline = baselineManager.getAllBaseline();

      // 4. 如果是首次运行（没有基准），初始化基准并提醒当前所有待办
      if (!baselineManager.hasBaseline()) {
        baselineManager.initializeBaseline(results);
        // 首次运行也提醒用户当前有多少待办
        const initialData = this.createInitialReminderData(results);
        if (initialData && initialData.totalCount > 0) {
          storage.saveNewTodoData(initialData);
        }
        return initialData;
      }

      // 5. 检测待办变化（新增和移除）
      const changeData = this.detectTodoChanges(results, baseline);

      // 6. 如果有变化，更新基准并保存变化数据
      if (changeData && changeData.totalCount > 0) {
        baselineManager.updateBaseline(results);
        storage.saveNewTodoData(changeData);
      }
      // 注意：没有变化时不更新基准，避免漏掉轮询间隔内的新增待办
      // 基准只在确认已提醒后更新，确保下次能检测到新增

      return changeData;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查指定项目的待办
   * @param projectId 项目ID
   * @returns 查询结果
   */
  async checkProject(projectId: number): Promise<TodoQueryResult> {
    try {
      // 调用后端API查询我的待办
      const response = await apiBase.get('/defects/my-todo', {
        params: {
          project_id: projectId,
          page: 1,
          pageSize: 1000, // 获取所有待办，不分页
        },
      });

      const data = response.data;
      
      // 获取项目名称
      let projectName = String(projectId);
      try {
        const projects = await projectApi.getProjects();
        const project = projects.find(p => parseInt(p.id) === projectId);
        if (project) {
          projectName = project.name;
        }
      } catch (e) {
        // 忽略项目查询错误
      }

      // 后端返回结构: { success: true, data: { list: [], total: number } }
      const todoList = data.data?.list || data.data || [];
      const totalCount = data.data?.total || data.total || todoList.length;

      return {
        projectId,
        projectName,
        todos: todoList,
        total: totalCount,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 创建首次运行的提醒数据（展示当前所有待办）
   * @param currentTodos 当前所有项目的待办
   * @returns 提醒数据
   */
  private createInitialReminderData(
    currentTodos: TodoQueryResult[]
  ): NewTodoData | null {
    const projectBreakdown: ProjectNewTodoDetail[] = [];
    let totalCount = 0;

    for (const result of currentTodos) {
      if (result.todos.length > 0) {
        const ids = result.todos.map(t => t.id);
        projectBreakdown.push({
          projectId: result.projectId,
          projectName: result.projectName,
          newIds: ids,
          count: ids.length,
          todos: result.todos, // 包含完整的缺陷数据
        });
        totalCount += ids.length;
      }
    }

    if (totalCount === 0) {
      return null;
    }

    return {
      totalCount,
      projectBreakdown,
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * 对比基准识别待办变化（新增和移除）
   * @param currentTodos 当前所有项目的待办
   * @param baseline 基准状态
   * @returns 待办变化数据，如果没有变化则返回null
   */
  detectTodoChanges(
    currentTodos: TodoQueryResult[],
    baseline: TodoBaselineMap
  ): NewTodoData | null {
    const projectBreakdown: ProjectNewTodoDetail[] = [];
    let totalCount = 0;

    for (const result of currentTodos) {
      const projectId = String(result.projectId);
      const currentIds = result.todos.map(t => t.id);
      const baselineIds = baseline[projectId]?.todoIds || [];

      // 找出新增的ID（当前存在但基准中不存在）
      const newIds = currentIds.filter(id => !baselineIds.includes(id));

      // 只关注新增待办，有新增时才提醒
      if (newIds.length > 0) {
        // 根据ID筛选出对应的完整缺陷数据
        const todosToShow = result.todos.filter(t => newIds.includes(t.id));

        projectBreakdown.push({
          projectId: result.projectId,
          projectName: result.projectName,
          newIds: newIds,
          count: newIds.length,
          todos: todosToShow, // 包含完整的缺陷数据
        });
        totalCount += newIds.length;
      }
    }

    // 检查是否有项目在基准中存在但在当前不存在（整个项目的待办都被解决了）
    for (const [projectId, projectBaseline] of Object.entries(baseline)) {
      const currentProject = currentTodos.find(r => String(r.projectId) === projectId);
      if (!currentProject && projectBaseline.todoIds.length > 0) {
        // 这个项目之前的待办都被解决了，也算作变化
        // 但不增加总数，只是记录状态变化
      }
    }

    if (totalCount === 0) {
      return null;
    }

    return {
      totalCount,
      projectBreakdown,
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * 更新基准为当前状态
   * @param currentTodos 当前所有项目的待办
   */
  updateBaseline(currentTodos: TodoQueryResult[]): void {
    baselineManager.updateBaseline(currentTodos);
  }

  /**
   * 获取提醒状态
   * @returns 提醒状态信息
   */
  getReminderStatus(): {
    isEnabled: boolean;
    hasBaseline: boolean;
    baselineStats: {
      projectCount: number;
      totalTodoCount: number;
      lastUpdated: string | null;
    };
  } {
    const config = storage.getConfig();
    const baselineStats = baselineManager.getBaselineStats();

    return {
      isEnabled: config.enabled,
      hasBaseline: baselineManager.hasBaseline(),
      baselineStats,
    };
  }

  /**
   * 重置所有数据
   */
  resetAll(): void {
    storage.clearAll();
  }

  /**
   * 立即检查（供手动触发）
   * @param userId 可选的用户ID（用于数据隔离）
   * @param username 可选的用户名
   * @returns 检查结果
   */
  async checkNow(userId?: number, username?: string): Promise<NewTodoData | null> {
    return this.checkAllProjects(userId, username);
  }
}

// 导出单例实例
export default new ReminderService();
