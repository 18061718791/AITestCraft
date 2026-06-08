import { apiClient } from './apiClient';

export interface UpdateProfileInput {
  nickname?: string;
  email?: string;
  avatar?: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  roles: { id: number; name: string; code: string }[];
  redmine_user_id: number | null;
  redmine_lastname: string | null;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  status?: string;
  roleIds?: number[];
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  nickname?: string;
  status?: string;
  roleIds?: number[];
}

export interface UserListResponse {
  total: number;
  page: number;
  pageSize: number;
  rows: User[];
}

export const userApiService = {
  updateProfile: async (data: UpdateProfileInput): Promise<void> => {
    await apiClient.put('/users/profile', data);
  },

  list: async (page = 1, pageSize = 20, keyword?: string): Promise<UserListResponse> => {
    const response = await apiClient.get('/users', {
      params: { page, pageSize, keyword },
    });
    return response.data.data;
  },

  create: async (data: CreateUserInput): Promise<User> => {
    const response = await apiClient.post('/users', data);
    return response.data.data;
  },

  update: async (id: number, data: UpdateUserInput): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    await apiClient.post(`/users/${id}/reset-password`, { newPassword });
  },
};

export default userApiService;
