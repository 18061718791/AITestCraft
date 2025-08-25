import axios from 'axios';
import { TestCase } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/test`,
  timeout: 30000,
});

// 设置日志拦截器
import setupLoggingInterceptors from '../interceptors/logging';
setupLoggingInterceptors(api);

export interface GeneratePointsRequest {
  requirement: string;
  sessionId: string;
  system?: string;
  module?: string;
  scenario?: string;
}

export interface GenerateCasesRequest {
  testPoints: string[];
  sessionId: string;
  system?: string;
  module?: string;
  scenario?: string;
}

export interface TaskResponse {
  success: boolean;
  data: {
    taskId: string;
    message: string;
    status: string;
  };
  timestamp: string;
}

export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'points' | 'cases';
  sessionId: string;
  data?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const testApi = {
  generateTestPoints: async (data: GeneratePointsRequest): Promise<TaskResponse> => {
    const response = await api.post('/generate-points', data);
    return response.data;
  },

  generateTestCases: async (data: GenerateCasesRequest): Promise<TaskResponse> => {
    const response = await api.post('/generate-cases', data);
    return response.data;
  },

  getTaskStatus: async (taskId: string): Promise<{ success: boolean; data: TaskStatus }> => {
    const response = await api.get(`/task/${taskId}`);
    return response.data;
  },

  downloadExcel: async (testCases: TestCase[], sessionId: string): Promise<Blob> => {
    const response = await api.post('/download-excel', {
      testCases,
      sessionId
    }, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;