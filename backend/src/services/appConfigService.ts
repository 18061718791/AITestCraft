import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import crypto from 'crypto';

export interface CreateAppConfigInput {
  appName: string;
  appCode: string;
  description?: string;
  gitUrl: string;
  repositoryName: string;
  projectPath: string;
  branches: string[];
  webhookSecret?: string;
  isActive?: boolean | undefined;
  projectId?: string;
  directoryId?: string;
  jenkinsUrl?: string;
}

export interface AppConfigQueryParams {
  page?: number;
  pageSize?: number;
  isActive?: boolean | undefined;
  projectId?: string | undefined;
  directoryId?: string | undefined;
  userId?: number | undefined;
  isAdmin?: boolean | undefined;
}

/**
 * 生成Webhook密钥
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 获取应用配置列表（带用户数据隔离）
 */
export async function getAppConfigs(params: AppConfigQueryParams) {
  const { page = 1, pageSize = 20, isActive, projectId, directoryId, userId, isAdmin } = params;

  const where: any = {};
  if (isActive !== undefined) where.is_active = isActive;
  if (projectId) where.project_id = projectId;
  if (directoryId) where.directory_id = directoryId;

  // 用户数据隔离：非管理员只能查看自己创建的应用配置
  if (!isAdmin && userId) {
    where.created_by = userId;
  }

  const [items, total] = await Promise.all([
    prisma.app_configs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        directory: {
          select: {
            uuid: true,
            id: true,
            name: true,
            level: true
          }
        }
      }
    }),
    prisma.app_configs.count({ where })
  ]);

  return {
    items: items.map((item: any) => ({
      id: item.id,
      appName: item.app_name,
      appCode: item.app_code,
      description: item.description,
      gitUrl: item.git_url,
      repositoryName: item.repository_name,
      projectPath: item.project_path,
      branches: JSON.parse(item.branches),
      isActive: item.is_active,
      projectId: item.project_id,
      directoryId: item.directory_id,
      jenkinsUrl: item.jenkins_url,
      project: item.project,
      directory: item.directory,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    })),
    total,
    page,
    pageSize
  };
}

/**
 * 根据ID获取应用配置
 */
export async function getAppConfigById(id: number) {
  const config = await prisma.app_configs.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true
        }
      },
      directory: {
        select: {
          uuid: true,
          id: true,
          name: true,
          level: true
        }
      }
    }
  });

  if (!config) return null;

  return {
    id: config.id,
    appName: config.app_name,
    appCode: config.app_code,
    description: config.description,
    gitUrl: config.git_url,
    repositoryName: config.repository_name,
    projectPath: config.project_path,
    branches: JSON.parse(config.branches),
    webhookSecret: config.webhook_secret,
    isActive: config.is_active,
    projectId: config.project_id,
    directoryId: config.directory_id,
    jenkinsUrl: config.jenkins_url,
    project: config.project,
    directory: config.directory,
    createdAt: config.created_at,
    updatedAt: config.updated_at
  };
}

/**
 * 根据仓库名称和路径获取应用配置
 */
export async function getAppConfigByRepository(repositoryName: string, projectPath: string) {
  return await prisma.app_configs.findFirst({
    where: {
      repository_name: repositoryName,
      project_path: projectPath,
      is_active: true
    }
  });
}

/**
 * 根据目录ID获取应用配置列表
 */
export async function getAppConfigsByDirectory(directoryId: string) {
  const configs = await prisma.app_configs.findMany({
    where: {
      directory_id: directoryId,
      is_active: true
    },
    orderBy: { app_name: 'asc' }
  });

  return configs.map((item: any) => ({
    id: item.id,
    appName: item.app_name,
    appCode: item.app_code,
    description: item.description,
    gitUrl: item.git_url,
    repositoryName: item.repository_name,
    projectPath: item.project_path,
    branches: JSON.parse(item.branches),
    isActive: item.is_active,
    projectId: item.project_id,
    directoryId: item.directory_id,
    jenkinsUrl: item.jenkins_url,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }));
}

export interface CreateAppConfigInputWithUser extends CreateAppConfigInput {
  createdBy?: number | undefined;
}

/**
 * 根据应用编码和创建者获取应用配置
 */
export async function getAppConfigByCodeAndUser(appCode: string, createdBy: number | null) {
  return await prisma.app_configs.findFirst({
    where: {
      app_code: appCode,
      created_by: createdBy
    }
  });
}

/**
 * 创建应用配置（自动关联创建者）
 * 同一用户下应用编码必须唯一
 */
export async function createAppConfig(data: CreateAppConfigInputWithUser) {
  // 检查同一用户下是否已存在相同应用编码
  const existing = await getAppConfigByCodeAndUser(data.appCode, data.createdBy ?? null);
  if (existing) {
    const error: any = new Error('该用户下已存在相同应用编码的应用');
    error.code = 'P2002';
    throw error;
  }

  const secret = data.webhookSecret || generateWebhookSecret();

  return await prisma.app_configs.create({
    data: {
      app_name: data.appName,
      app_code: data.appCode,
      description: data.description || null,
      git_url: data.gitUrl,
      repository_name: data.repositoryName,
      project_path: data.projectPath,
      branches: JSON.stringify(data.branches),
      webhook_secret: secret,
      is_active: data.isActive ?? true,
      project_id: data.projectId || null,
      directory_id: data.directoryId || null,
      jenkins_url: data.jenkinsUrl || null,
      created_by: data.createdBy ?? null
    }
  });
}

export interface UpdateAppConfigInput extends Partial<CreateAppConfigInput> {
  createdBy?: number | null;
}

/**
 * 更新应用配置
 * 同一用户下应用编码必须唯一
 */
export async function updateAppConfig(id: number, data: UpdateAppConfigInput) {
  // 如果更新了应用编码，需要检查唯一性
  if (data.appCode !== undefined) {
    // 获取当前配置
    const currentConfig = await prisma.app_configs.findUnique({
      where: { id },
      select: { created_by: true }
    });

    if (currentConfig) {
      const existing = await getAppConfigByCodeAndUser(data.appCode, currentConfig.created_by);
      if (existing && existing.id !== id) {
        const error: any = new Error('该用户下已存在相同应用编码的应用');
        error.code = 'P2002';
        throw error;
      }
    }
  }

  const updateData: any = {};

  if (data.appName !== undefined) updateData.app_name = data.appName;
  if (data.appCode !== undefined) updateData.app_code = data.appCode;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.gitUrl !== undefined) updateData.git_url = data.gitUrl;
  if (data.repositoryName !== undefined) updateData.repository_name = data.repositoryName;
  if (data.projectPath !== undefined) updateData.project_path = data.projectPath;
  if (data.branches !== undefined) updateData.branches = JSON.stringify(data.branches);
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.projectId !== undefined) updateData.project_id = data.projectId || null;
  if (data.directoryId !== undefined) updateData.directory_id = data.directoryId || null;
  if (data.jenkinsUrl !== undefined) updateData.jenkins_url = data.jenkinsUrl || null;

  return await prisma.app_configs.update({
    where: { id },
    data: updateData
  });
}

/**
 * 删除应用配置
 */
export async function deleteAppConfig(id: number) {
  return await prisma.app_configs.delete({
    where: { id }
  });
}

/**
 * 重新生成Webhook密钥
 */
export async function regenerateWebhookSecret(id: number) {
  const newSecret = generateWebhookSecret();

  return await prisma.app_configs.update({
    where: { id },
    data: { webhook_secret: newSecret }
  });
}

/**
 * 数据迁移：将现有应用关联到指定系统
 */
export async function migrateExistingAppsToSystem(projectId: string, directoryId: string) {
  const result = await prisma.app_configs.updateMany({
    where: {
      project_id: null,
      directory_id: null
    },
    data: {
      project_id: projectId,
      directory_id: directoryId
    }
  });

  return result.count;
}
