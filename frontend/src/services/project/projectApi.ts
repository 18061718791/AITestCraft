import { apiClient } from '../apiClient';

const API_BASE_URL = '';

export interface Project {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Directory {
  uuid: string;
  id: string;
  name: string;
  project_id: string;
  parent_id: string;
  level: number;
  created_at?: string;
  updated_at?: string;
  children?: Directory[];
}

// 项目相关API
export const projectApi = {
  // 获取所有项目
  getProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get(`${API_BASE_URL}/projects`);
    // 防御性编程：处理不同的响应格式
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      console.error('项目列表API返回格式错误:', response.data);
      return [];
    }
  },

  // 获取单个项目
  getProjectById: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`${API_BASE_URL}/projects/${id}`);
    return response.data;
  },

  // 创建项目
  createProject: async (project: { id?: string; name: string }): Promise<Project> => {
    const response = await apiClient.post(`${API_BASE_URL}/projects`, project);
    return response.data;
  },

  // 更新项目
  updateProject: async (id: string, project: { name: string }): Promise<Project> => {
    const response = await apiClient.put(`${API_BASE_URL}/projects/${id}`, project);
    return response.data;
  },

  // 删除项目
  deleteProject: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`${API_BASE_URL}/projects/${id}`);
    return response.data;
  },
};

// 目录相关API
export const directoryApi = {
  // 获取项目的所有目录
  getDirectoriesByProjectId: async (projectId: string): Promise<Directory[]> => {
    const response = await apiClient.get(`${API_BASE_URL}/directories/project/${projectId}`);
    // 防御性编程：处理不同的响应格式
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      console.error('目录列表API返回格式错误:', response.data);
      return [];
    }
  },

  // 创建目录
  createDirectory: async (directory: {
    id?: string;
    name: string;
    project_id: string;
    parent_id: string;
    level: number;
  }): Promise<Directory> => {
    const response = await apiClient.post(`${API_BASE_URL}/directories`, directory);
    return response.data;
  },

  // 更新目录
  updateDirectory: async (id: string, directory: {
    name?: string;
    id?: string;
    parent_id?: string;
    level?: number;
  }): Promise<Directory> => {
    const response = await apiClient.put(`${API_BASE_URL}/directories/${id}`, directory);
    return response.data;
  },

  // 删除目录
  deleteDirectory: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`${API_BASE_URL}/directories/${id}`);
    return response.data;
  },
};