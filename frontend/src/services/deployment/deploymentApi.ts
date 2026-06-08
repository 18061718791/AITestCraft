import api from '../apiBase';

export interface DeploymentTask {
  id: number;
  appId: number;
  appName: string;
  repository: string;
  branch: string;
  commitId: string;
  commitMessage?: string;
  commitAuthor?: string;
  status: 'PENDING' | 'DEPLOYING' | 'COMPLETED' | 'FAILED' | 'IGNORED';
  createdAt: string;
  deployedAt?: string;
  deployedBy?: string;
  appConfig?: {
    id: number;
    appName: string;
    appCode: string;
    jenkinsUrl?: string;
    directoryId?: string;
    directory?: {
      uuid: string;
      name: string;
    };
  };
}

export interface TaskStats {
  pending: number;
  deploying: number;
  completed: number;
  failed: number;
  ignored: number;
}

export interface TaskQueryParams {
  status?: string;
  repository?: string;
  branch?: string;
  page?: number;
  pageSize?: number;
  projectId?: string;
  directoryId?: string;
  appId?: number;
}

export interface PendingTask {
  id: number;
  branch: string;
  commitId: string;
  commitMessage?: string;
  commitAuthor?: string;
  createdAt: string;
}

export interface AppWithPendingTasks {
  appId: number;
  appName: string;
  appCode: string;
  jenkinsUrl?: string;
  directoryId?: string;
  directoryName?: string;
  tasks: PendingTask[];
}

export interface DirectoryGroup {
  directoryId: string;
  directoryName: string;
  apps: AppWithPendingTasks[];
}

export interface AppDeploymentInfo {
  id: number;
  appName: string;
  appCode: string;
  description?: string;
  gitUrl: string;
  repositoryName: string;
  jenkinsUrl?: string;
  directoryId?: string;
  directoryName?: string;
  latestDeployment?: {
    deployedAt: string;
    status: string;
  };
}

export async function getDeploymentTasks(params?: TaskQueryParams) {
  const response = await api.get('/deployment-tasks', { params });
  return response.data.data;
}

export async function getPendingTasksGroupedByApp(projectId?: string, directoryId?: string) {
  const response = await api.get('/deployment-tasks/pending-grouped-by-app', {
    params: { projectId, directoryId }
  });
  return response.data.data as DirectoryGroup[];
}

export async function getAppDeploymentList(params?: {
  projectId?: string;
  directoryId?: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await api.get('/deployment-tasks/app-deployment-list', { params });
  return response.data.data;
}

export async function getAppDeploymentHistory(appId: number, params?: { page?: number; pageSize?: number }) {
  const response = await api.get(`/deployment-tasks/app-history/${appId}`, { params });
  return response.data.data;
}

export async function getTaskStats(projectId?: string, directoryId?: string) {
  const response = await api.get('/deployment-tasks/stats', {
    params: { projectId, directoryId }
  });
  return response.data.data as TaskStats;
}

export async function updateTaskStatus(taskId: number, status: string, deployedBy?: string) {
  const response = await api.put(`/deployment-tasks/${taskId}/status`, {
    status,
    deployedBy
  });
  return response.data.data;
}

export async function batchUpdateTaskStatus(taskIds: number[], status: string, deployedBy?: string) {
  const response = await api.put('/deployment-tasks/batch/status', {
    taskIds,
    status,
    deployedBy
  });
  return response.data.data;
}
