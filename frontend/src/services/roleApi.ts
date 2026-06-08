import { apiClient } from './apiClient';

export interface Permission {
  id: number;
  name: string;
  code: string;
  description: string | null;
  module: string;
  status: string;
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  role_permissions: { id: number; permission: Permission }[];
}

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRoleInput {
  name?: string;
  code?: string;
  description?: string;
  status?: string;
  permissionIds?: number[];
}

export const roleApiService = {
  list: async (): Promise<Role[]> => {
    const response = await apiClient.get('/roles');
    return response.data.data;
  },

  create: async (data: CreateRoleInput): Promise<Role> => {
    const response = await apiClient.post('/roles', data);
    return response.data.data;
  },

  update: async (id: number, data: UpdateRoleInput): Promise<Role> => {
    const response = await apiClient.put(`/roles/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },

  listPermissions: async (): Promise<Permission[]> => {
    const response = await apiClient.get('/roles/permissions');
    return response.data.data;
  },

  initDefaults: async (): Promise<void> => {
    await apiClient.get('/roles/init-defaults');
  },
};

export default roleApiService;
