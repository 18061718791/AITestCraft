import axios from 'axios';
import { System, Module, Scenario } from '../types';
import { createRetryableApi } from '../utils/retry';

const api = axios.create({
  baseURL: '/',
  timeout: 10000,
});

// 请求拦截器：自动添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
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
      const response = await api.get<ApiResponse<System[]>>('/api/system/systems');
      return response.data.data || [];
    } catch (error) {
      throw new Error('获取系统列表失败');
    }
  },

  /**
   * 获取系统下的所有模块
   */
  getModules: async (systemId: number): Promise<Module[]> => {
    try {
      const response = await api.get<ApiResponse<Module[]>>(`/api/system/systems/${systemId}/modules`);
      return response.data.data || [];
    } catch (error) {
      throw new Error('获取模块列表失败');
    }
  },

  /**
   * 获取模块下的所有场景
   */
  getScenarios: async (moduleId: number): Promise<Scenario[]> => {
    try {
      const response = await api.get<ApiResponse<Scenario[]>>(`/api/system/modules/${moduleId}/scenarios`);
      return response.data.data || [];
    } catch (error) {
      throw new Error('获取场景列表失败');
    }
  },

  /**
   * 获取完整的系统-模块-场景树形结构
   */
  getSystemTree: async (): Promise<Array<System & { modules: Array<Module & { scenarios: Scenario[] }> }>> => {
    try {
      // 直接调用API获取树形结构，避免循环依赖
      const response = await api.get<ApiResponse<any>>('/api/system/systems/tree');
      const treeData = response.data.data || [];
      
      // 转换后端返回的数据结构为前端期望的结构
      return treeData.map((system: any) => ({
        id: system.id,
        name: system.title,
        description: system.description || '',
        status: 'active',
        modules: system.children?.map((module: any) => ({
          id: module.id,
          name: module.title,
          description: module.description || '',
          systemId: module.systemId || system.id,
          status: 'active',
          scenarios: module.children?.map((scenario: any) => ({
            id: scenario.id,
            name: scenario.title,
            description: scenario.description || '',
            moduleId: scenario.moduleId || module.id,
            priority: 'medium',
            status: 'active'
          })) || []
        })) || []
      }));
    } catch (error) {
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
