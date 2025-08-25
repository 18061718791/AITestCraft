import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
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
    const response = await api.get('/prompts');
    return response.data.data;
  },

  /**
   * 获取单个提示词文件内容
   */
  getPrompt: async (filename: string): Promise<PromptFile> => {
    const response = await api.get(`/prompts/${filename}`);
    return response.data.data;
  },

  /**
   * 更新提示词文件内容
   */
  updatePrompt: async (filename: string, content: string): Promise<void> => {
    await api.put(`/prompts/${filename}`, { content });
  },
};

export default promptApi;