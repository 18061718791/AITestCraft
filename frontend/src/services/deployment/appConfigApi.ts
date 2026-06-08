import api from '../apiBase';

export interface AppConfig {
  id: number;
  appName: string;
  appCode: string;
  description?: string;
  gitUrl: string;
  repositoryName: string;
  projectPath: string;
  branches: string[];
  isActive: boolean;
  projectId?: string;
  directoryId?: string;
  jenkinsUrl?: string;
  project?: {
    id: string;
    name: string;
  };
  directory?: {
    uuid: string;
    id: string;
    name: string;
    level: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppConfigInput {
  appName: string;
  appCode: string;
  description?: string;
  gitUrl: string;
  repositoryName: string;
  projectPath: string;
  branches: string[];
  webhookSecret?: string;
  isActive?: boolean;
  projectId?: string;
  directoryId?: string;
  jenkinsUrl?: string;
}

export interface AppConfigQueryParams {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
  projectId?: string;
  directoryId?: string;
}

export async function getAppConfigs(params?: AppConfigQueryParams) {
  const response = await api.get('/app-configs', { params });
  return response.data.data;
}

export async function getAppConfig(id: number) {
  const response = await api.get(`/app-configs/${id}`);
  return response.data.data;
}

export async function createAppConfig(data: CreateAppConfigInput) {
  const response = await api.post('/app-configs', data);
  return response.data.data;
}

export async function updateAppConfig(id: number, data: Partial<CreateAppConfigInput>) {
  const response = await api.put(`/app-configs/${id}`, data);
  return response.data.data;
}

export async function deleteAppConfig(id: number) {
  const response = await api.delete(`/app-configs/${id}`);
  return response.data.data;
}

export async function getWebhookSecret(id: number) {
  const response = await api.get(`/app-configs/${id}/webhook-secret`);
  return response.data.data;
}

export async function regenerateWebhookSecret(id: number) {
  const response = await api.post(`/app-configs/${id}/regenerate-secret`);
  return response.data.data;
}

export async function migrateAppsToSystem(projectId: string, directoryId: string) {
  const response = await api.post('/app-configs/migrate-to-system', { projectId, directoryId });
  return response.data.data;
}
