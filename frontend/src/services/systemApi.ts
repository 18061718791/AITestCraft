import axios from 'axios';
import { System, Module, Scenario } from '../types';
import { createRetryableApi } from '../utils/retry';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

// 设置日志拦截器
import setupLoggingInterceptors from '../interceptors/logging';
setupLoggingInterceptors(api);

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

const baseService = {
  /**
   * 获取所有系统
   */
  getSystems: async (): Promise<System[]> => {
    try {
      const response = await api.get<ApiResponse<System[]>>('/system/systems');
      return response.data.data || [];
    } catch (error) {
      console.error('获取系统列表失败:', error);
      throw new Error('获取系统列表失败');
    }
  },

  /**
   * 获取系统下的所有模块
   */
  getModules: async (systemId: number): Promise<Module[]> => {
    try {
      const response = await api.get<ApiResponse<Module[]>>(`/system/systems/${systemId}/modules`);
      return response.data.data || [];
    } catch (error) {
      console.error(`获取系统 ${systemId} 的模块列表失败:`, error);
      throw new Error('获取模块列表失败');
    }
  },

  /**
   * 获取模块下的所有场景
   */
  getScenarios: async (moduleId: number): Promise<Scenario[]> => {
    try {
      const response = await api.get<ApiResponse<Scenario[]>>(`/system/modules/${moduleId}/scenarios`);
      return response.data.data || [];
    } catch (error) {
      console.error(`获取模块 ${moduleId} 的场景列表失败:`, error);
      throw new Error('获取场景列表失败');
    }
  },

  /**
   * 获取完整的系统-模块-场景树形结构
   */
  getSystemTree: async (): Promise<Array<System & { modules: Array<Module & { scenarios: Scenario[] }> }>> => {
    try {
      const systems = await systemApi.getSystems();
      const tree = await Promise.all(
        systems.map(async (system: System) => {
          const modules = await systemApi.getModules(system.id);
          const modulesWithScenarios = await Promise.all(
            modules.map(async (module: Module) => {
              const scenarios = await systemApi.getScenarios(module.id);
              return { ...module, scenarios };
            })
          );
          return { ...system, modules: modulesWithScenarios };
        })
      );
      return tree;
    } catch (error) {
      console.error('获取系统树形结构失败:', error);
      throw new Error('获取系统结构失败');
    }
  }
};

// 创建带重试机制的API服务
export const systemApi = {
  /**
   * 获取所有系统（带重试）
   */
  getSystems: createRetryableApi(baseService.getSystems, {
    maxRetries: 2,
    delay: 1000,
    backoff: 1.5,
  }),

  /**
   * 获取系统下的所有模块（带重试）
   * 获取模块下的所有场景（带重试）
   */
  getModules: createRetryableApi(baseService.getModules, {
    maxRetries: 2,
    delay: 1000,
    backoff: 1.5,
  }),

  /**
   * 获取模块下的所有场景（带重试）
   */
  getScenarios: createRetryableApi(baseService.getScenarios, {
    maxRetries: 2,
    delay: 1000,
    backoff: 1.5,
  }),

  /**
   * 获取完整的系统-模块-场景树形结构（带重试）
   */
  getSystemTree: createRetryableApi(baseService.getSystemTree, {
    maxRetries: 1,
    delay: 1500,
    backoff: 1.5,
  }),
};

export default systemApi;