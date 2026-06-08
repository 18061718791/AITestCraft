import apiClient from './apiClient';

export interface RedmineUser {
  id: number;
  lastname: string;
  firstname: string;
  login?: string;
}

/**
 * 搜索Redmine用户（支持模糊检索）
 * @param keyword 搜索关键词
 * @param limit 返回数量限制
 */
export async function searchRedmineUsers(keyword: string, limit: number = 20): Promise<RedmineUser[]> {
  const response = await apiClient.get('/redmine-users/search', {
    params: { keyword, limit }
  });
  return response.data.data || [];
}

/**
 * 获取所有活跃的Redmine用户
 * @param limit 返回数量限制
 */
export async function getAllActiveRedmineUsers(limit: number = 100): Promise<RedmineUser[]> {
  const response = await apiClient.get('/redmine-users', {
    params: { limit }
  });
  return response.data.data || [];
}

/**
 * 根据ID获取Redmine用户信息
 * @param userId Redmine用户ID
 */
export async function getRedmineUserById(userId: number): Promise<RedmineUser | null> {
  const response = await apiClient.get(`/redmine-users/${userId}`);
  return response.data.data || null;
}

/**
 * 更新用户Redmine关联
 * @param userId 本地用户ID
 * @param redmineUserId Redmine用户ID
 * @param redmineLastname Redmine用户姓名
 */
export async function updateRedmineBinding(
  userId: number, 
  redmineUserId: number, 
  redmineLastname: string
): Promise<any> {
  const response = await apiClient.put(`/users/${userId}/redmine-binding`, {
    redmineUserId,
    redmineLastname
  });
  return response.data;
}

/**
 * 获取当前用户的Redmine关联信息
 */
export async function getCurrentUserRedmineBinding(): Promise<{ redmine_user_id: number | null }> {
  const response = await apiClient.get('/users/profile/redmine');
  return response.data.data;
}
