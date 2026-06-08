import axios from 'axios';
import { TestCase, CreateTestCaseRequest, UpdateTestCaseRequest } from '../types/testCase';
import { createRetryableApi } from '../utils/retry';
import { frontendLogger, LogCategory } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
// 使用相对路径或环境变量配置的URL
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

// 创建带认证的axios实例
const authAxios = axios.create();

// 请求拦截器：自动添加 token
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

const baseService = {
  /**
   * 获取测试用例列表
   */
  async getTestCases(filters?: {
    systemId?: number;
    moduleId?: number;
    scenarioId?: number;
  }): Promise<TestCase[]> {
    const response = await authAxios.get(`${API_PREFIX}/test-cases`, {
      params: filters,
    });
    return response.data.data;
  },

  /**
   * 获取单个测试用例
   */
  async getTestCase(id: number): Promise<TestCase> {
    const response = await authAxios.get(`${API_PREFIX}/test-cases/${id}`);
    return response.data.data;
  },

  /**
   * 创建测试用例
   */
  async createTestCase(data: CreateTestCaseRequest): Promise<TestCase> {
    const response = await authAxios.post(`${API_PREFIX}/test-cases`, data);
    return response.data.data;
  },

  /**
   * 更新测试用例
   */
  async updateTestCase(id: number, data: UpdateTestCaseRequest): Promise<TestCase> {
    const response = await authAxios.put(`${API_PREFIX}/test-cases/${id}`, data);
    return response.data.data;
  },

  /**
   * 删除测试用例
   */
  async deleteTestCase(id: number): Promise<void> {
    await authAxios.delete(`${API_PREFIX}/test-cases/${id}`);
  },

  /**
   * 从测试助手保存测试用例
   */
  async saveFromTestAssistant(
    scenarioId?: number,
    moduleId?: number,
    systemId?: number,
    testCases: Array<{
      title: string;
      preconditions: string;
      steps: string;
      expectedResult: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      tags?: string[];
    }> = []
  ): Promise<TestCase[]> {
    const response = await authAxios.post(`${API_PREFIX}/test-cases/save-from-assistant`, {
      scenarioId,
      moduleId,
      systemId,
      testCases,
    });
    return response.data.data;
  },

  /**
   * 下载模板
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await authAxios.get(`${API_PREFIX}/test-cases/batch/template`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * 批量导出测试用例
   */
  async batchExport(testCaseIds: number[]): Promise<Blob> {
    const response = await authAxios.post(`${API_PREFIX}/test-cases/batch/export`, {
      testCaseIds
    }, {
      responseType: 'blob',
      timeout: 30000, // 30秒超时
    });
    return response.data;
  },
};

// 创建带重试机制的API服务
// 在文件末尾添加新的API方法

const hierarchyService = {
  /**
   * 按层级获取测试用例列表（系统/模块/场景）
   */
  async getTestCasesByHierarchy(params: {
    systemId?: number;
    moduleId?: number;
    scenarioId?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    testCases: TestCase[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      frontendLogger.info(LogCategory.API_REQUEST, `Fetching test cases with params: ${JSON.stringify(params)}`);
      
      const response = await authAxios.get(`${API_PREFIX}/test-cases/by-hierarchy`, {
        params,
      });
      
      frontendLogger.info(LogCategory.API_RESPONSE, `Received response: ${JSON.stringify(response.data)}`);
      
      // 确保返回符合前端期望格式的对象
      if (Array.isArray(response.data)) {
        // 如果后端直接返回了测试用例数组
        frontendLogger.info(LogCategory.API_RESPONSE, `Response is array, returning wrapped format`);
        return {
          testCases: response.data,
          total: response.data.length,
          page: 1,
          limit: response.data.length
        };
      } else if (response.data.data && response.data.data.testCases) {
        // 如果后端返回了 { success: true, data: { testCases: [...] } } 格式
        frontendLogger.info(LogCategory.API_RESPONSE, `Response has data.testCases property, returning response.data.data`);
        return response.data.data;
      } else if (response.data.testCases) {
        // 如果后端返回了 { testCases: [...] } 格式
        frontendLogger.info(LogCategory.API_RESPONSE, `Response has testCases property, returning as-is`);
        return response.data;
      } else {
        // 其他情况，返回空数组
        frontendLogger.warn(LogCategory.API_RESPONSE, `Response format unexpected, returning empty array`);
        return {
          testCases: [],
          total: 0,
          page: 1,
          limit: 10
        };
      }
    } catch (error) {
      frontendLogger.error(LogCategory.API_RESPONSE, `Error fetching test cases`, error as Error);
      throw error;
    }
  },
};

// 更新导出，添加层级查询方法
export const testCaseService = {
  /**
   * 获取测试用例列表（带重试）
   */
  getTestCases: createRetryableApi(baseService.getTestCases, {
    maxRetries: 2,
    delay: 1000,
    backoff: 1.5,
  }),

  /**
   * 获取单个测试用例（带重试）
   */
  getTestCase: createRetryableApi(baseService.getTestCase, {
    maxRetries: 2,
    delay: 1000,
    backoff: 1.5,
  }),

  /**
   * 创建测试用例（带重试）
   */
  createTestCase: createRetryableApi(baseService.createTestCase, {
    maxRetries: 1,
    delay: 1000,
    backoff: 1.5,
  }),

  /**
   * 更新测试用例（带重试）
   */
  updateTestCase: createRetryableApi(baseService.updateTestCase, {
    maxRetries: 1,
    delay: 1000,
    backoff: 1.5,
  }),

  /**
   * 删除测试用例（带重试）
   */
  deleteTestCase: createRetryableApi(baseService.deleteTestCase, {
    maxRetries: 1,
    delay: 1000,
    backoff: 1.5,
  }),

  /**
   * 从测试助手保存测试用例（带重试）
   */
  saveFromTestAssistant: createRetryableApi(baseService.saveFromTestAssistant, {
    maxRetries: 2,
    delay: 1500,
    backoff: 1.5,
  }),

  /**
   * 按层级获取测试用例列表（带重试）
   */
  getTestCasesByHierarchy: createRetryableApi(hierarchyService.getTestCasesByHierarchy, {
    maxRetries: 2,
    delay: 1000,
    backoff: 1.5,
  }),
};