import axios from 'axios';
import { frontendLogger, LogCategory } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// 使用相对路径或环境变量配置的URL
// 相对路径 '/api' 会走Vite代理，适用于本地开发
// 完整URL 适用于生产环境
const api = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  timeout: 30000,
});

// 设置日志拦截器
import setupLoggingInterceptors from '../interceptors/logging';
setupLoggingInterceptors(api);

export interface PromptFile {
  id: number;
  filename: string;
  description: string;
  content: string;
  path: string;
}

export interface PromptFileInfo {
  id: number;
  filename: string;
  description: string;
  path: string;
}

export const promptApi = {
  /**
   * 获取所有提示词文件信息
   */
  getAllPrompts: async (): Promise<PromptFileInfo[]> => {
    try {
      frontendLogger.info(LogCategory.API_REQUEST, `Fetching all prompts`);
      
      const response = await api.get('/prompts');
      
      frontendLogger.info(LogCategory.API_RESPONSE, `Received prompts response: ${JSON.stringify(response.data)}`);
      
      // 确保返回符合前端期望格式的数组
      if (Array.isArray(response.data)) {
        frontendLogger.info(LogCategory.API_RESPONSE, `Response is array, returning as-is`);
        return response.data;
      } else if (response.data.success && Array.isArray(response.data.data)) {
        frontendLogger.info(LogCategory.API_RESPONSE, `Response has success: true and data array, returning response.data.data`);
        return response.data.data;
      } else if (response.data.data) {
        frontendLogger.info(LogCategory.API_RESPONSE, `Response has data property, returning response.data.data`);
        return Array.isArray(response.data.data) ? response.data.data : [];
      } else {
        frontendLogger.warn(LogCategory.API_RESPONSE, `Response format unexpected, returning empty array`);
        return [];
      }
    } catch (error) {
      frontendLogger.error(LogCategory.API_RESPONSE, `Error fetching prompts`, error as Error);
      throw error;
    }
  },

  /**
   * 获取单个提示词文件内容
   */
  getPrompt: async (filename: string): Promise<PromptFile> => {
    try {
      frontendLogger.info(LogCategory.API_REQUEST, `Fetching prompt: ${filename}`);
      
      const response = await api.get(`/prompts/${filename}`);
      
      frontendLogger.info(LogCategory.API_RESPONSE, `Received prompt response: ${JSON.stringify(response.data)}`);
      
      // 确保返回符合前端期望格式的对象
      if (response.data.success && response.data.data) {
        frontendLogger.info(LogCategory.API_RESPONSE, `Response has success: true and data property, returning response.data.data`);
        return response.data.data;
      } else {
        frontendLogger.info(LogCategory.API_RESPONSE, `Response format unexpected, returning response.data`);
        return response.data;
      }
    } catch (error) {
      frontendLogger.error(LogCategory.API_RESPONSE, `Error fetching prompt: ${filename}`, error as Error);
      throw error;
    }
  },

  /**
   * 更新提示词文件内容
   */
  updatePrompt: async (filename: string, content: string): Promise<void> => {
    await api.put(`/prompts/${filename}`, { content });
  },
};

export default promptApi;