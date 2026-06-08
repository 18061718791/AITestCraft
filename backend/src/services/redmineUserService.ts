import { query } from '../utils/database';
import logger from '../utils/logger';

export interface RedmineUser {
  id: number;
  lastname: string;
  firstname: string;
  login?: string;
}

/**
 * 搜索Redmine用户（支持模糊检索）
 * @param keyword 搜索关键词（匹配lastname）
 * @param limit 返回数量限制
 * @returns Redmine用户列表
 */
export async function searchRedmineUsers(keyword: string, limit: number = 20): Promise<RedmineUser[]> {
  try {
    // 构建SQL查询，使用ILIKE进行模糊匹配（PostgreSQL）
    const sql = `
      SELECT 
        id, 
        lastname, 
        firstname,
        login
      FROM users 
      WHERE status = 1 
        AND lastname ILIKE $1
      ORDER BY lastname ASC
      LIMIT $2
    `;
    
    const searchPattern = `%${keyword}%`;
    const result = await query(sql, [searchPattern, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      lastname: row.lastname,
      firstname: row.firstname,
      login: row.login
    }));
  } catch (error: any) {
    logger.error('搜索Redmine用户失败', { 
      error: error.message, 
      stack: error.stack,
      keyword 
    });
    throw new Error(`搜索Redmine用户失败: ${error.message}`);
  }
}

/**
 * 根据ID获取Redmine用户信息
 * @param userId Redmine用户ID
 * @returns Redmine用户信息
 */
export async function getRedmineUserById(userId: number): Promise<RedmineUser | null> {
  try {
    const sql = `
      SELECT 
        id, 
        lastname, 
        firstname,
        login
      FROM users 
      WHERE id = $1 AND status = 1
    `;
    
    const result = await query(sql, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      lastname: row.lastname,
      firstname: row.firstname,
      login: row.login
    };
  } catch (error) {
    logger.error('获取Redmine用户信息失败', { error, userId });
    throw new Error('获取Redmine用户信息失败');
  }
}

/**
 * 获取所有活跃的Redmine用户
 * @param limit 返回数量限制
 * @returns Redmine用户列表
 */
export async function getAllActiveRedmineUsers(limit: number = 100): Promise<RedmineUser[]> {
  try {
    const sql = `
      SELECT 
        id, 
        lastname, 
        firstname,
        login
      FROM users 
      WHERE status = 1
      ORDER BY lastname ASC
      LIMIT $1
    `;
    
    const result = await query(sql, [limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      lastname: row.lastname,
      firstname: row.firstname,
      login: row.login
    }));
  } catch (error) {
    logger.error('获取Redmine用户列表失败', { error });
    throw new Error('获取Redmine用户列表失败');
  }
}
