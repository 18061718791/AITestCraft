import crypto from 'crypto';
import { prisma } from '../utils/prisma';

export interface GitlabPushEvent {
  object_kind: 'push';
  project: {
    name: string;
    web_url: string;
    path_with_namespace?: string;
    path?: string;
  };
  ref: string;
  checkout_sha: string;
  commits: Array<{
    id: string;
    message: string;
    author: {
      name: string;
    };
  }>;
}

export interface GitlabMergeEvent {
  object_kind: 'merge_request';
  project: {
    name: string;
    path_with_namespace?: string;
    path?: string;
  };
  object_attributes: {
    target_branch: string;
    merge_commit_sha: string;
    last_commit: {
      id: string;
      message: string;
      author: {
        name: string;
      };
    };
  };
}

/**
 * 验证GitLab Webhook签名
 * GitLab 使用简单的 Secret Token 机制，不是 HMAC-SHA256
 */
export function verifyGitlabWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // GitLab 的 X-Gitlab-Token 就是简单的字符串比较
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(secret)
    );
  } catch (error) {
    return false;
  }
}

/**
 * 解析GitLab事件
 * 支持多种仓库标识：project.name、path_with_namespace、project.path
 */
export function parseGitlabEvent(body: any): { repository: string; projectPath: string; branch: string; commit: any } | null {
  // Push事件
  if (body.object_kind === 'push') {
    const event = body as GitlabPushEvent;
    const branch = event.ref.replace('refs/heads/', '');
    const latestCommit = event.commits[0];

    if (!latestCommit) return null;

    // 优先使用 path_with_namespace（如 shi_binbin/aitestcraft），兼容性更好
    // 其次使用 project.name（如 AITestCraft）
    const repository = event.project.path_with_namespace || event.project.name;

    return {
      repository,
      projectPath: event.project.path_with_namespace || '',
      branch,
      commit: {
        id: event.checkout_sha || latestCommit.id,
        message: latestCommit.message,
        author: latestCommit.author.name
      }
    };
  }

  // Merge Request事件
  if (body.object_kind === 'merge_request') {
    const event = body as GitlabMergeEvent;
    const attrs = event.object_attributes;

    return {
      repository: event.project.path_with_namespace || event.project.name,
      projectPath: event.project.path_with_namespace || '',
      branch: attrs.target_branch,
      commit: {
        id: attrs.merge_commit_sha || attrs.last_commit.id,
        message: attrs.last_commit.message,
        author: attrs.last_commit.author.name
      }
    };
  }

  return null;
}

/**
 * 根据仓库名称和分支获取应用配置
 * 同一个仓库可能有多个配置（监听不同分支），严格返回分支匹配的配置
 * 如果找不到匹配分支的配置，返回 null，避免 fallback 导致错误匹配
 */
export async function getAppConfigByRepository(repositoryName: string, _projectPath: string, branch?: string) {
  // 查找所有匹配该仓库的启用配置
  const configs = await prisma.app_configs.findMany({
    where: {
      repository_name: repositoryName,
      is_active: true
    }
  });

  if (configs.length === 0) {
    return null;
  }

  // 如果提供了分支，严格返回分支匹配的配置
  if (branch) {
    const matchedConfig = configs.find(config => {
      try {
        const branches = JSON.parse(config.branches);
        return branches.includes(branch);
      } catch {
        return false;
      }
    });

    if (matchedConfig) {
      return matchedConfig;
    }

    // 严格模式：找不到匹配分支的配置，返回 null
    // 这样上层可以明确区分"应用未配置"和"分支未监听"
    return null;
  }

  // 如果没有提供分支，返回第一个配置（向后兼容）
  return configs[0];
}

/**
 * 获取仓库所有启用的配置（支持同一仓库多配置场景）
 * 支持忽略大小写匹配，同时匹配 repository_name 和 project_path
 */
export async function getAppConfigsByRepository(repositoryName: string) {
  const allConfigs = await prisma.app_configs.findMany({
    where: {
      is_active: true
    }
  });

  // 忽略大小写匹配 repository_name 或 project_path
  return allConfigs.filter(config => {
    const repoName = config.repository_name?.toLowerCase() || '';
    const projectPath = config.project_path?.toLowerCase() || '';
    const searchName = repositoryName.toLowerCase();

    return repoName === searchName ||
           projectPath === searchName ||
           repoName === searchName.split('/').pop() || // 匹配 path 的最后一部分
           projectPath === searchName.split('/').pop();
  });
}

/**
 * 检查分支是否应该被监听
 */
export function shouldListenBranch(config: any, branch: string): boolean {
  try {
    const branches = JSON.parse(config.branches);
    return branches.includes(branch);
  } catch {
    return false;
  }
}

/**
 * 创建部署任务
 */
export async function createDeploymentTask(
  appId: number,
  appName: string,
  repository: string,
  branch: string,
  commit: any
) {
  return await prisma.deployment_tasks.create({
    data: {
      app_id: appId,
      app_name: appName,
      repository,
      branch,
      commit_id: commit.id.substring(0, 8),
      commit_message: commit.message.substring(0, 200),
      commit_author: commit.author,
      status: 'PENDING'
    }
  });
}
