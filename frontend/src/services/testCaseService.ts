import axios from 'axios';
import { TestCase, CreateTestCaseRequest, UpdateTestCaseRequest } from '../types/testCase';
import { createRetryableApi } from '../utils/retry';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

const baseService = {
  /**
   * 获取测试用例列表
   */
  async getTestCases(filters?: {
    systemId?: number;
    moduleId?: number;
    scenarioId?: number;
  }): Promise<TestCase[]> {
    const response = await axios.get(`${API_BASE_URL}/api/test-cases`, {
      params: filters,
    });
    return response.data.data;
  },

  /**
   * 获取单个测试用例
   */
  async getTestCase(id: number): Promise<TestCase> {
    const response = await axios.get(`${API_BASE_URL}/api/test-cases/${id}`);
    return response.data.data;
  },

  /**
   * 创建测试用例
   */
  async createTestCase(data: CreateTestCaseRequest): Promise<TestCase> {
    const response = await axios.post(`${API_BASE_URL}/api/test-cases`, data);
    return response.data.data;
  },

  /**
   * 更新测试用例
   */
  async updateTestCase(id: number, data: UpdateTestCaseRequest): Promise<TestCase> {
    const response = await axios.put(`${API_BASE_URL}/api/test-cases/${id}`, data);
    return response.data.data;
  },

  /**
   * 删除测试用例
   */
  async deleteTestCase(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/test-cases/${id}`);
  },

  /**
   * 从测试助手保存测试用例
   */
  async saveFromTestAssistant(
    scenarioId: number,
    testCases: Array<{
      title: string;
      preconditions: string;
      steps: string;
      expectedResult: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      tags?: string[];
    }>
  ): Promise<TestCase[]> {
    const response = await axios.post(`${API_BASE_URL}/api/test-cases/save-from-assistant`, {
      scenarioId,
      testCases,
    });
    return response.data.data;
  },

  /**
   * 下载模板
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await axios.get(`${API_BASE_URL}/api/test-cases/batch/template`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * 批量导出测试用例
   */
  async batchExport(testCaseIds: number[]): Promise<Blob> {
    const response = await axios.post(`${API_BASE_URL}/api/test-cases/batch/export`, {
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
    const response = await axios.get(`${API_BASE_URL}/api/test-cases/by-hierarchy`, {
      params,
    });
    return response.data.data;
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