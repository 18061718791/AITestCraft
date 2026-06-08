import { prisma } from '../utils/prisma';

export interface TaskQueryParams {
  status?: string;
  repository?: string;
  branch?: string;
  page?: number;
  pageSize?: number;
  projectId?: string | undefined;
  directoryId?: string | undefined;
  appId?: number | undefined;
  userId?: number | undefined;
  isAdmin?: boolean | undefined;
}

export interface AppDeploymentInfo {
  appId: number;
  appName: string;
  appCode: string;
  directoryId?: string;
  directoryName?: string;
  jenkinsUrl?: string;
  pendingCount: number;
  latestCompletedAt?: Date;
}

/**
 * 获取部署任务列表
 */
export async function getDeploymentTasks(params: TaskQueryParams) {
  const { status, repository, branch, page = 1, pageSize = 20, projectId, directoryId, appId } = params;

  const where: any = {};
  if (status) where.status = status;
  if (repository) where.repository = repository;
  if (branch) where.branch = branch;
  if (appId) where.app_id = appId;

  // 如果按项目或系统筛选，需要通过app_config关联查询
  if (projectId || directoryId) {
    where.app_config = {};
    if (projectId) where.app_config.project_id = projectId;
    if (directoryId) where.app_config.directory_id = directoryId;
  }

  const [items, total] = await Promise.all([
    prisma.deployment_tasks.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        app_config: {
          select: {
            id: true,
            app_name: true,
            app_code: true,
            jenkins_url: true,
            directory_id: true,
            directory: {
              select: {
                uuid: true,
                name: true
              }
            }
          }
        }
      }
    }),
    prisma.deployment_tasks.count({ where })
  ]);

  return {
    items: items.map((item: any) => ({
      id: item.id,
      appId: item.app_id,
      appName: item.app_name,
      repository: item.repository,
      branch: item.branch,
      commitId: item.commit_id,
      commitMessage: item.commit_message,
      commitAuthor: item.commit_author,
      status: item.status,
      createdAt: item.created_at,
      deployedAt: item.deployed_at,
      deployedBy: item.deployed_by,
      appConfig: item.app_config ? {
        ...item.app_config,
        jenkinsUrl: item.app_config.jenkins_url,
        directoryId: item.app_config.directory_id
      } : null
    })),
    total,
    page,
    pageSize
  };
}

/**
 * 获取按应用分组的待部署任务（用于新UI展示，带用户数据隔离）
 */
export async function getPendingTasksGroupedByApp(
  projectId?: string,
  directoryId?: string,
  userId?: number,
  isAdmin?: boolean
) {
  const where: any = {
    status: 'PENDING'
  };

  // 用户数据隔离：非管理员只能查看自己创建的应用配置相关的任务
  where.app_config = {};
  if (!isAdmin && userId) {
    where.app_config.created_by = userId;
  }

  if (projectId || directoryId) {
    if (projectId) where.app_config.project_id = projectId;
    if (directoryId) where.app_config.directory_id = directoryId;
  }

  const tasks = await prisma.deployment_tasks.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      app_config: {
        select: {
          id: true,
          app_name: true,
          app_code: true,
          jenkins_url: true,
          directory_id: true,
          branches: true,
          directory: {
            select: {
              uuid: true,
              name: true
            }
          }
        }
      }
    }
  });

  // 按应用分组，同时根据应用配置的分支设置进行过滤
  const groupedByApp = new Map<number, any>();

  tasks.forEach((task: any) => {
    const appId = task.app_id;

    // 检查任务的分支是否在该应用配置的监听分支列表中
    const appBranches = task.app_config?.branches;
    if (appBranches) {
      try {
        const allowedBranches = JSON.parse(appBranches);
        if (!allowedBranches.includes(task.branch)) {
          // 如果任务分支不在监听列表中，跳过该任务
          return;
        }
      } catch {
        // JSON解析失败，跳过过滤
      }
    }

    if (!groupedByApp.has(appId)) {
      groupedByApp.set(appId, {
        appId: appId,
        appName: task.app_name,
        appCode: task.app_config?.app_code || '',
        jenkinsUrl: task.app_config?.jenkins_url,
        directoryId: task.app_config?.directory_id,
        directoryName: task.app_config?.directory?.name,
        tasks: []
      });
    }
    groupedByApp.get(appId).tasks.push({
      id: task.id,
      branch: task.branch,
      commitId: task.commit_id,
      commitMessage: task.commit_message,
      commitAuthor: task.commit_author,
      createdAt: task.created_at
    });
  });

  // 按系统分组
  const groupedByDirectory = new Map<string, any>();

  groupedByApp.forEach((app) => {
    const dirId = app.directoryId || 'uncategorized';
    const dirName = app.directoryName || '未分类';

    if (!groupedByDirectory.has(dirId)) {
      groupedByDirectory.set(dirId, {
        directoryId: dirId,
        directoryName: dirName,
        apps: []
      });
    }
    groupedByDirectory.get(dirId).apps.push(app);
  });

  return Array.from(groupedByDirectory.values());
}

/**
 * 获取应用部署列表（用于部署历史页面，带用户数据隔离）
 */
export async function getAppDeploymentList(params: { projectId?: string | undefined; directoryId?: string | undefined; page?: number; pageSize?: number; userId?: number | undefined; isAdmin?: boolean }) {
  const { projectId, directoryId, page = 1, pageSize = 20, userId, isAdmin } = params;

  const where: any = { is_active: true };

  // 用户数据隔离：非管理员只能查看自己创建的应用配置
  if (!isAdmin && userId) {
    where.created_by = userId;
  }

  if (projectId) where.project_id = projectId;
  if (directoryId) where.directory_id = directoryId;

  const [apps, total] = await Promise.all([
    prisma.app_configs.findMany({
      where,
      orderBy: { app_name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        directory: {
          select: {
            uuid: true,
            name: true
          }
        },
        deployment_tasks: {
          where: {
            status: { in: ['COMPLETED', 'FAILED', 'IGNORED'] }
          },
          orderBy: { deployed_at: 'desc' },
          take: 1,
          select: {
            deployed_at: true,
            status: true
          }
        }
      }
    }),
    prisma.app_configs.count({ where })
  ]);

  return {
    items: apps.map((app: any) => ({
      id: app.id,
      appName: app.app_name,
      appCode: app.app_code,
      description: app.description,
      gitUrl: app.git_url,
      repositoryName: app.repository_name,
      jenkinsUrl: app.jenkins_url,
      directoryId: app.directory_id,
      directoryName: app.directory?.name,
      latestDeployment: app.deployment_tasks[0] ? {
        deployedAt: app.deployment_tasks[0].deployed_at,
        status: app.deployment_tasks[0].status
      } : null
    })),
    total,
    page,
    pageSize
  };
}

/**
 * 获取应用的部署历史（带用户数据隔离）
 */
export async function getAppDeploymentHistory(appId: number, params: { page?: number; pageSize?: number; userId?: number | undefined; isAdmin?: boolean }) {
  const { page = 1, pageSize = 20, userId, isAdmin } = params;

  // 首先检查应用配置是否属于当前用户
  if (!isAdmin && userId) {
    const appConfig = await prisma.app_configs.findFirst({
      where: {
        id: appId,
        created_by: userId
      }
    });
    if (!appConfig) {
      return {
        items: [],
        total: 0,
        page,
        pageSize
      };
    }
  }

  const [items, total] = await Promise.all([
    prisma.deployment_tasks.findMany({
      where: { app_id: appId },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.deployment_tasks.count({ where: { app_id: appId } })
  ]);

  return {
    items: items.map((item: any) => ({
      id: item.id,
      appId: item.app_id,
      appName: item.app_name,
      repository: item.repository,
      branch: item.branch,
      commitId: item.commit_id,
      commitMessage: item.commit_message,
      commitAuthor: item.commit_author,
      status: item.status,
      createdAt: item.created_at,
      deployedAt: item.deployed_at,
      deployedBy: item.deployed_by
    })),
    total,
    page,
    pageSize
  };
}

/**
 * 获取任务统计（带用户数据隔离和分支过滤）
 */
export async function getTaskStats(projectId?: string, directoryId?: string, userId?: number, isAdmin?: boolean) {
  const where: any = {};

  // 用户数据隔离：非管理员只能查看自己创建的应用配置相关的任务
  where.app_config = {};
  if (!isAdmin && userId) {
    where.app_config.created_by = userId;
  }

  if (projectId || directoryId) {
    if (projectId) where.app_config.project_id = projectId;
    if (directoryId) where.app_config.directory_id = directoryId;
  }

  // 先获取所有任务（带应用配置信息），然后进行分支过滤统计
  const tasks = await prisma.deployment_tasks.findMany({
    where,
    include: {
      app_config: {
        select: {
          branches: true
        }
      }
    }
  });

  // 按分支过滤后统计
  const filteredTasks = tasks.filter((task: any) => {
    const appBranches = task.app_config?.branches;
    if (appBranches) {
      try {
        const allowedBranches = JSON.parse(appBranches);
        return allowedBranches.includes(task.branch);
      } catch {
        return true;
      }
    }
    return true;
  });

  const result = {
    pending: 0,
    deploying: 0,
    completed: 0,
    failed: 0,
    ignored: 0
  };

  filteredTasks.forEach((task: any) => {
    const key = task.status.toLowerCase() as keyof typeof result;
    result[key]++;
  });

  return result;
}

/**
 * 更新任务状态
 */
export async function updateTaskStatus(
  taskId: number,
  status: string,
  deployedBy?: string
) {
  const updateData: any = { status };

  if (status === 'COMPLETED' || status === 'FAILED' || status === 'IGNORED') {
    updateData.deployed_at = new Date();
    if (deployedBy) updateData.deployed_by = deployedBy;
  }

  return await prisma.deployment_tasks.update({
    where: { id: taskId },
    data: updateData
  });
}

/**
 * 批量更新任务状态
 */
export async function batchUpdateTaskStatus(
  taskIds: number[],
  status: string,
  deployedBy?: string
) {
  const updateData: any = { status };

  if (status === 'COMPLETED' || status === 'FAILED' || status === 'IGNORED') {
    updateData.deployed_at = new Date();
    if (deployedBy) updateData.deployed_by = deployedBy;
  }

  return await prisma.deployment_tasks.updateMany({
    where: { id: { in: taskIds } },
    data: updateData
  });
}
