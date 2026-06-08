import axios from 'axios';
import { TestCase } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

const api = axios.create({
  baseURL: `${API_PREFIX}/test`,
  timeout: 120000,
});

import setupLoggingInterceptors from '../interceptors/logging';
setupLoggingInterceptors(api);

export interface Base64Image {
  base64: string;
  mimeType: string;
  fileName?: string;
}

export interface GeneratePointsRequest {
  requirement: string;
  sessionId: string;
  system?: string;
  module?: string;
  scenario?: string;
  provider?: string;
  model?: string;
  images?: Base64Image[];
}

export interface GenerateCasesRequest {
  testPoints: string[];
  sessionId: string;
  system?: string;
  module?: string;
  scenario?: string;
  provider?: string;
  model?: string;
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
