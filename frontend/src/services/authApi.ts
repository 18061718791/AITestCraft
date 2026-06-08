import axios from 'axios';
import { apiClient } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email?: string;
  password: string;
  nickname?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  status: string;
  roles: { id: number; name: string; code: string }[];
  permissions: string[];
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const authApiService = {
  login: async (data: LoginInput): Promise<LoginResponse> => {
    const response = await axios.post(`${API_PREFIX}/auth/login`, data);
    return response.data.data;
  },

  register: async (data: RegisterInput): Promise<AuthUser> => {
    const response = await axios.post(`${API_PREFIX}/auth/register`, data);
    return response.data.data;
  },

  me: async (): Promise<AuthUser> => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { oldPassword, newPassword });
  },

  resetPassword: async (newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { newPassword });
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await axios.post(`${API_PREFIX}/auth/refresh`, { refreshToken });
    return response.data.data;
  },
};

export default authApiService;
