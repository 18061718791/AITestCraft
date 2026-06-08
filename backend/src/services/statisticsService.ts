import { query } from '../utils/database';
import logger from '../utils/logger';
import { prisma } from '../utils/prisma';

// 趋势数据类型
interface TrendData {
  labels: string[];
  datasets: TrendDataset[];
}

interface TrendDataset {
  label: string;
  data: number[];
}

// 分布数据类型
interface DistributionData {
  name: string;
  value: number;
}

class StatisticsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = parseInt(process.env['CACHE_TTL'] || '300000'); // 5分钟
  private serviceStartTimestamp = Date.now(); // 服务启动时间戳，用于生成唯一的缓存键
  // 不再使用固定的起始日期，改为动态计算

  // 递归获取所有子目录ID（包括子目录的子目录，带用户数据隔离）
  // 核心逻辑：当二级目录（系统）下有三级目录（模块）时，只返回三级目录ID，排除二级目录ID
  // 当二级目录下没有三级目录时，返回二级目录ID本身
  private async getAllChildDirectoryIds(parentId: string | number, includeLevel2: boolean = true, userId?: number, isAdmin?: boolean): Promise<number[]> {
    const parentIdStr = String(parentId);
    
    // 构建查询条件
    let whereClause: any = { parent_id: parentIdStr };
    
    // 用户数据隔离：非管理员只能访问自己创建的项目下的目录
    if (!isAdmin && userId) {
      const userProjects = await prisma.projects.findMany({
        where: { created_by: userId },
        select: { id: true }
      });
      const userProjectIds = userProjects.map(p => p.id);
      if (userProjectIds.length > 0) {
        whereClause.project_id = { in: userProjectIds };
      } else {
        return []; // 用户没有创建任何项目，返回空
      }
    }
    
    const childDirectories = await prisma.directories.findMany({
      where: whereClause
    });

    let allChildIds: number[] = [];

    for (const dir of childDirectories) {
      const dirId = parseInt(dir.id);
      const dirLevel = dir.level;
      
      const grandChildIds = await this.getAllChildDirectoryIds(dir.id, includeLevel2, userId, isAdmin);
      
      if (dirLevel === 1) {
        if (grandChildIds.length > 0) {
          logger.debug(`Directory ${dir.name} (id=${dirId}, level=${dirLevel}) has ${grandChildIds.length} child modules, using child IDs instead`);
          allChildIds = [...allChildIds, ...grandChildIds];
        } else {
          allChildIds.push(dirId);
        }
      } else {
        allChildIds.push(dirId);
        allChildIds = [...allChildIds, ...grandChildIds];
      }
    }

    logger.debug(`getAllChildDirectoryIds(parentId=${parentId}, includeLevel2=${includeLevel2}) => [${allChildIds.slice(0, 10).join(', ')}${allChildIds.length > 10 ? '...' : ''}] (total: ${allChildIds.length})`);
    return allChildIds;
  }

  // 获取最早的记录日期（带用户数据隔离）
  private async getEarliestRecordDate(parentId?: string | number, userId?: number, isAdmin?: boolean): Promise<string> {
    try {
      let sql = `
        SELECT MIN(created_on) as earliest_date
        FROM issues
      `;
      
      if (parentId) {
        const parentIdStr = String(parentId);
        const allChildIds = await this.getAllChildDirectoryIds(parentIdStr, false, userId, isAdmin);  // 不包含level=2的模块目录
        if (allChildIds.length > 0) {
          sql += ` WHERE parent_id IN (${allChildIds.join(', ')})`;
        } else {
          sql += ` WHERE parent_id = ${parentId}`;
        }
      }
      
      // 排除目录ID对应的记录（带用户数据隔离）
      let directoryFilter: any = {};
      if (!isAdmin && userId) {
        const userProjects = await prisma.projects.findMany({
          where: { created_by: userId },
          select: { id: true }
        });
        const userProjectIds = userProjects.map(p => p.id);
        if (userProjectIds.length > 0) {
          directoryFilter.project_id = { in: userProjectIds };
        } else {
          // 用户没有项目，返回当前日期
          return new Date().toISOString().split('T')[0] as string;
        }
      }
      
      const allDirectories = await prisma.directories.findMany({ where: directoryFilter });
      const directoryIds = allDirectories.map(dir => parseInt(dir.id));
      if (directoryIds.length > 0) {
        const directoryIdsString = directoryIds.map(id => `'${id}'`).join(', ');
        if (parentId) {
          sql += ` AND id::text NOT IN (${directoryIdsString})`;
        } else {
          sql += ` WHERE id::text NOT IN (${directoryIdsString})`;
        }
      }
      
      const result = await query(sql);
      let earliestDate = result.rows[0].earliest_date;
      
      // 如果没有记录，返回当前日期
      if (!earliestDate) {
        return new Date().toISOString().split('T')[0] as string;
      }
      
      // 根据用户要求，统一改为根据查询出来的最早时间往前推一周，不需要再判断是否为周一
      const date = new Date(earliestDate);
      // 往前推一周
      date.setDate(date.getDate() - 7);
      
      return date.toISOString().split('T')[0] as string;
    } catch (error) {
      logger.error('Error getting earliest record date', error);
      // 出错时返回当前日期
      return new Date().toISOString().split('T')[0] as string;
    }
  }

  // 获取项目汇总趋势数据（带用户数据隔离）
  async getOverviewTrend(type: 'all' | 'urgent', timeRange?: string, parentId?: string, userId?: number, isAdmin?: boolean): Promise<TrendData> {
    const cacheKey = `trend_overview_${type}_${timeRange || 'all'}_${parentId || 'all'}_${userId || 'all'}_${this.serviceStartTimestamp}`;
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug('Overview trend data loaded from cache');
      return cached.data;
    }

    try {
      // 计算起始日期
      let startDate: string;
      if (timeRange && timeRange !== 'all') {
        // 根据时间范围计算起始日期
        const now = new Date();
        let start = new Date();
        
        switch (timeRange) {
          case 'week':
            start.setDate(now.getDate() - 7);
            break;
          case 'month':
            start.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            start.setMonth(now.getMonth() - 3);
            break;
          default:
            // 获取动态起始日期
            startDate = await this.getEarliestRecordDate(parentId, userId, isAdmin);
            // 获取子目录ID
            const defaultChildIds = parentId ? await this.getAllChildDirectoryIds(parentId, false, userId, isAdmin) : [];
            // 直接返回，避免后续使用未定义的start变量
            const openSql = await this.buildTrendQuery('created_on', type, false, parentId, startDate, defaultChildIds);
            const openResult = await query(openSql);
            
            // 查询 ALLClose 数据
            const closeSql = await this.buildTrendQuery('updated_on', type, true, parentId, startDate, defaultChildIds);
            const closeResult = await query(closeSql);
            
            // 合并数据
            const data = this.mergeTrendData(openResult.rows, closeResult.rows, type, startDate);
            
            // 更新缓存
            this.cache.set(cacheKey, {
              data,
              timestamp: Date.now(),
            });
            
            logger.info(`Overview trend data fetched successfully (${type}, timeRange: ${timeRange || 'all'})`);
            return data;
        }
        
        startDate = start.toISOString().split('T')[0] as string;
      } else {
        // 获取动态起始日期
        startDate = await this.getEarliestRecordDate(parentId, userId, isAdmin);
      }
      
      // 获取子目录ID
      const childIds = parentId ? await this.getAllChildDirectoryIds(parentId, false, userId, isAdmin) : [];
      
      // 查询 ALLOpen 数据
      const openSql = await this.buildTrendQuery('created_on', type, false, parentId, startDate, childIds);
      const openResult = await query(openSql);
      
      // 查询 ALLClose 数据
      const closeSql = await this.buildTrendQuery('updated_on', type, true, parentId, startDate, childIds);
      const closeResult = await query(closeSql);
      
      // 合并数据
      const data = this.mergeTrendData(openResult.rows, closeResult.rows, type, startDate);
      
      // 更新缓存
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      logger.info(`Overview trend data fetched successfully (${type}, timeRange: ${timeRange || 'all'})`);
      return data;
    } catch (error) {
      logger.error(`Error fetching overview trend data (${type})`, error);
      throw error;
    }
  }

  // 获取系统趋势数据（带用户数据隔离）
  async getSystemTrend(parentId: string, type: 'all' | 'urgent', timeRange?: string, userId?: number, isAdmin?: boolean): Promise<TrendData> {
    const cacheKey = `trend_system_${parentId}_${type}_${timeRange || 'all'}_${this.serviceStartTimestamp}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug(`System ${parentId} trend data loaded from cache`);
      return cached.data;
    }

    try {
      // 递归获取所有子目录ID（不包含level=2的模块目录）
      const childDirectoryIds = await this.getAllChildDirectoryIds(parentId, false);

      // 计算起始日期
      let startDate: string;
      if (timeRange && timeRange !== 'all') {
        // 根据时间范围计算起始日期
        const now = new Date();
        let start = new Date();
        
        switch (timeRange) {
          case 'last_week_fixed':
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const lastSunday = new Date(now);
            lastSunday.setDate(now.getDate() - daysToMonday - 1);
            const lastMonday = new Date(lastSunday);
            lastMonday.setDate(lastSunday.getDate() - 6);
            start = lastMonday;
            break;
          case 'last_month_fixed':
            const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            start = firstDayOfLastMonth;
            break;
          case 'quarter':
            start.setMonth(now.getMonth() - 3);
            break;
          default:
            startDate = await this.getEarliestRecordDate(parentId);
            const openSql = await this.buildTrendQuery('created_on', type, false, parentId, startDate, childDirectoryIds);
            const openResult = await query(openSql);
            
            const closeSql = await this.buildTrendQuery('updated_on', type, true, parentId, startDate, childDirectoryIds);
            const closeResult = await query(closeSql);
            
            const data = this.mergeTrendData(openResult.rows, closeResult.rows, type, startDate);
            
            this.cache.set(cacheKey, {
              data,
              timestamp: Date.now(),
            });
            
            logger.info(`System ${parentId} trend data fetched successfully (${type}, timeRange: ${timeRange || 'all'})`);
            return data;
        }
        
        startDate = start.toISOString().split('T')[0] as string;
      } else {
        startDate = await this.getEarliestRecordDate(parentId);
      }
      
      // 查询 ALLOpen 数据
      const openSql = await this.buildTrendQuery('created_on', type, false, parentId, startDate, childDirectoryIds);
      const openResult = await query(openSql);
      
      // 查询 ALLClose 数据
      const closeSql = await this.buildTrendQuery('updated_on', type, true, parentId, startDate, childDirectoryIds);
      const closeResult = await query(closeSql);
      
      // 合并数据
      const data = this.mergeTrendData(openResult.rows, closeResult.rows, type, startDate);
      
      // 更新缓存
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      logger.info(`System ${parentId} trend data fetched successfully (${type}, timeRange: ${timeRange || 'all'})`);
      return data;
    } catch (error) {
      logger.error(`Error fetching system ${parentId} trend data (${type})`, error);
      throw error;
    }
  }

  // 获取系统分布饼图数据（带用户数据隔离）
  async getSystemDistribution(urgentOnly?: boolean, parentId?: string, timeRange?: string, userId?: number, isAdmin?: boolean): Promise<DistributionData[]> {
    const cacheKey = `distribution_system_${urgentOnly ? 'urgent' : 'all'}_${parentId || 'all'}_${timeRange || 'all'}_${this.serviceStartTimestamp}`;
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug('System distribution data loaded from cache');
      return cached.data;
    }

    try {
      let priorityFilter = '';
      let systemFilter = '';
      
      if (urgentOnly === true) {
        priorityFilter = ' AND priority_id = 4';
      }
      
      // 从项目管理中动态获取目录结构
      let directoryIds: number[] = [];
      let allDirectoryIds: number[] = [];
      
      // 获取所有目录ID，用于排除目录ID对应的记录
      const allDirectories = await prisma.directories.findMany();
      allDirectoryIds = allDirectories.map(dir => parseInt(dir.id));
      
      if (parentId === undefined) {
        // 查询所有项目的数据
        // 核心逻辑：当二级目录（系统）下有三级目录（模块）时，只使用三级目录ID
        // 当二级目录下没有三级目录时，使用二级目录ID本身
        const level1Dirs = allDirectories.filter(dir => dir.level === 1);
        const level2Dirs = allDirectories.filter(dir => dir.level === 2);
        
        for (const dir of level1Dirs) {
          const childModules = level2Dirs.filter(l2Dir => l2Dir.parent_id === dir.id);
          if (childModules.length > 0) {
            // 有子模块，只使用子模块ID
            directoryIds.push(...childModules.map(m => parseInt(m.id)));
          } else {
            // 没有子模块，使用二级目录ID本身
            directoryIds.push(parseInt(dir.id));
          }
        }
        
        if (directoryIds.length > 0) {
          systemFilter = ` AND i.parent_id IN (${directoryIds.join(', ')})`;
        }
      } else {
        // 递归获取所有子目录ID（不包含level=2的模块目录）
        directoryIds = await this.getAllChildDirectoryIds(parentId, false);
        
        if (directoryIds.length > 0) {
          systemFilter = ` AND i.parent_id IN (${directoryIds.join(', ')})`;
        } else {
          // 没有子目录，查询直接子节点的数据
          directoryIds = [parseInt(parentId)];
          systemFilter = ` AND i.parent_id = ${parentId}`;
        }
      }
      
      // 过滤掉目录ID对应的记录，确保目录不会被作为问题统计
      if (allDirectoryIds.length > 0) {
        const directoryIdsString = allDirectoryIds.map(id => `'${id}'`).join(', ');
        systemFilter += ` AND id::text NOT IN (${directoryIdsString})`;
      }
      
      // 构建目录层级映射，用于将三级目录映射到对应的二级目录
      const buildDirectoryHierarchy = async (): Promise<{ [key: number]: number }> => {
        const hierarchy: { [key: number]: number } = {};
        
        // 获取所有目录
        const allDirs = await prisma.directories.findMany();
        
        // 为每个目录构建映射：目录ID -> 对应的二级目录ID
        for (const dir of allDirs) {
          const dirId = parseInt(dir.id);
          const parentId = dir.parent_id;
          const level = dir.level;
          
          if (level === 1) {
            // 二级目录（系统级别），映射到自身
            hierarchy[dirId] = dirId;
          } else {
            const parentDirId = parseInt(parentId);
            if (hierarchy[parentDirId] !== undefined) {
              // 三级或更高级目录（模块级别），映射到其对应的二级目录
              hierarchy[dirId] = hierarchy[parentDirId];
            }
          }
        }
        
        return hierarchy;
      };
      
      const directoryHierarchy = await buildDirectoryHierarchy();
      
      // 计算起始日期
      let startDate: string;
      if (timeRange && timeRange !== 'all') {
        const now = new Date();
        let start = new Date();
        
        switch (timeRange) {
          case 'last_week_fixed':
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const lastSunday = new Date(now);
            lastSunday.setDate(now.getDate() - daysToMonday - 1);
            const lastMonday = new Date(lastSunday);
            lastMonday.setDate(lastSunday.getDate() - 6);
            start = lastMonday;
            break;
          case 'last_month_fixed':
            const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            start = firstDayOfLastMonth;
            break;
          case 'quarter':
            start.setMonth(now.getMonth() - 3);
            break;
          default:
            startDate = await this.getEarliestRecordDate(parentId);
        }
        
        startDate = start.toISOString().split('T')[0] as string;
      } else {
        startDate = await this.getEarliestRecordDate(parentId);
      }
      
      const sql = `
        SELECT
          i.parent_id as directory_id,
          COUNT(*) as value
        FROM issues i
        WHERE i.created_on >= '${startDate}'
        ${priorityFilter}
        ${systemFilter}
        GROUP BY i.parent_id
        ORDER BY value DESC
      `;
      
      const result = await query(sql);
      
      // 合并三级目录的问题数量到对应的二级目录
      const mergedData: { [key: number]: number } = {};
      
      result.rows.forEach((row: any) => {
        const originalDirId = parseInt(row.directory_id);
        const count = parseInt(row.value || '0');
        
        // 找到对应的二级目录ID
        const secondLevelDirId = directoryHierarchy[originalDirId] || originalDirId;
        
        // 合并数量
        if (mergedData[secondLevelDirId]) {
          mergedData[secondLevelDirId] += count;
        } else {
          mergedData[secondLevelDirId] = count;
        }
      });
      
      // 获取目录名称映射
      const directoryMap: { [key: string]: string } = {};
      const secondLevelIds = Object.keys(mergedData).map(id => parseInt(id));
      
      if (secondLevelIds.length > 0) {
        const directories = await prisma.directories.findMany({
          where: {
            id: {
              in: secondLevelIds.map(id => id.toString())
            }
          }
        });
        
        directories.forEach(dir => {
          directoryMap[dir.id] = dir.name;
        });
      }
      
      // 转换数据格式
      const data: DistributionData[] = Object.entries(mergedData).map(([dirId, value]) => ({
        name: directoryMap[dirId] || `目录${dirId}`,
        value: value,
      })).sort((a, b) => b.value - a.value);
      
      // 更新缓存
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      logger.info(`System distribution data fetched successfully (${urgentOnly ? 'urgent' : 'all'}, timeRange: ${timeRange || 'all'})`);
      return data;
    } catch (error) {
      logger.error(`Error fetching system distribution data`, error);
      throw error;
    }
  }

  // 获取优先级分布饼图数据
  async getPriorityDistribution(parentId?: string, timeRange?: string, userId?: number, isAdmin?: boolean): Promise<DistributionData[]> {
    const cacheKey = `distribution_priority_${parentId || 'all'}_${timeRange || 'all'}_${this.serviceStartTimestamp}`;
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug('Priority distribution data loaded from cache');
      return cached.data;
    }

    try {
      let systemFilter = '';
      
      // 从项目管理中动态获取目录结构
      let directoryIds: number[] = [];
      let allDirectoryIds: number[] = [];
      
      // 获取所有目录ID，用于排除目录ID对应的记录
      const allDirectories = await prisma.directories.findMany();
      allDirectoryIds = allDirectories.map(dir => parseInt(dir.id));
      
      if (parentId === undefined) {
        // 查询所有项目的数据
        // 核心逻辑：当二级目录（系统）下有三级目录（模块）时，只使用三级目录ID
        // 当二级目录下没有三级目录时，使用二级目录ID本身
        const level1Dirs = allDirectories.filter(dir => dir.level === 1);
        const level2Dirs = allDirectories.filter(dir => dir.level === 2);
        
        for (const dir of level1Dirs) {
          const childModules = level2Dirs.filter(l2Dir => l2Dir.parent_id === dir.id);
          if (childModules.length > 0) {
            // 有子模块，只使用子模块ID
            directoryIds.push(...childModules.map(m => parseInt(m.id)));
          } else {
            // 没有子模块，使用二级目录ID本身
            directoryIds.push(parseInt(dir.id));
          }
        }
        
        if (directoryIds.length > 0) {
          systemFilter = ` AND i.parent_id IN (${directoryIds.join(', ')})`;
        }
      } else {
        // 递归获取所有子目录ID（不包含level=2的模块目录）
        directoryIds = await this.getAllChildDirectoryIds(parentId, false);
        
        if (directoryIds.length > 0) {
          systemFilter = ` AND i.parent_id IN (${directoryIds.join(', ')})`;
        } else {
          // 没有子目录，查询直接子节点的数据
          directoryIds = [parseInt(parentId)];
          systemFilter = ` AND i.parent_id = ${parentId}`;
        }
      }
      
      // 过滤掉目录ID对应的记录，确保目录不会被作为问题统计
      if (allDirectoryIds.length > 0) {
        const directoryIdsString = allDirectoryIds.map(id => `'${id}'`).join(', ');
        systemFilter += ` AND i.id::text NOT IN (${directoryIdsString})`;
      }
      
      // 计算起始日期
      let startDate: string;
      if (timeRange && timeRange !== 'all') {
        const now = new Date();
        let start = new Date();
        
        switch (timeRange) {
          case 'last_week_fixed':
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const lastSunday = new Date(now);
            lastSunday.setDate(now.getDate() - daysToMonday - 1);
            const lastMonday = new Date(lastSunday);
            lastMonday.setDate(lastSunday.getDate() - 6);
            start = lastMonday;
            break;
          case 'last_month_fixed':
            const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            start = firstDayOfLastMonth;
            break;
          case 'quarter':
            start.setMonth(now.getMonth() - 3);
            break;
          default:
            startDate = await this.getEarliestRecordDate(parentId);
        }
        
        startDate = start.toISOString().split('T')[0] as string;
      } else {
        startDate = await this.getEarliestRecordDate(parentId);
      }
      
      const sql = `
        SELECT
          COALESCE(pp.name, '未知') as name,
          COUNT(*) as value
        FROM issues i
        LEFT JOIN enumerations pp ON i.priority_id = pp.id
        WHERE i.created_on >= '${startDate}'
        ${systemFilter}
        GROUP BY pp.name
        ORDER BY pp.name
      `;
      
      const result = await query(sql);
      const data: DistributionData[] = result.rows.map((row: any) => ({
        name: row.name,
        value: parseInt(row.value || '0'),
      }));
      
      // 更新缓存
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      logger.info(`Priority distribution data fetched successfully (${parentId || 'all'}, timeRange: ${timeRange || 'all'})`);
      return data;
    } catch (error) {
      logger.error(`Error fetching priority distribution data`, error);
      throw error;
    }
  }

  // 构建趋势查询SQL
  private async buildTrendQuery(
    dateField: string,
    type: 'all' | 'urgent',
    closedOnly: boolean = false,
    parentId?: string,
    startDate: string = (new Date().toISOString().split('T')[0] as string),
    childDirectoryIds?: number[]
  ): Promise<string> {
    let priorityFilter = '';
    let statusFilter = '';
    let systemFilter = '';
    
    if (type === 'urgent') {
      priorityFilter = ' AND priority_id = 4';
    }
    
    if (closedOnly) {
      statusFilter = ' AND status_id = 5';
    }
    
    if (parentId) {
      if (childDirectoryIds && childDirectoryIds.length > 0) {
        systemFilter = ` AND parent_id IN (${childDirectoryIds.join(', ')})`;
      } else {
        systemFilter = ` AND parent_id = '${parentId}'`;
      }
    }
    
    return `
      SELECT
        TO_CHAR((DATE_TRUNC('day', ${dateField}) - (EXTRACT(DOW FROM ${dateField})::integer - 1) * INTERVAL '1 day')::date, 'YYYY-MM-DD') as week_start,
        COUNT(*) as count
      FROM issues
      WHERE ${dateField} >= '${startDate}'
      ${priorityFilter}
      ${statusFilter}
      ${systemFilter}
      GROUP BY (DATE_TRUNC('day', ${dateField}) - (EXTRACT(DOW FROM ${dateField})::integer - 1) * INTERVAL '1 day')::date
      ORDER BY week_start
    `;
  }

  // 合并趋势数据
  private mergeTrendData(
    openRows: any[],
    closeRows: any[],
    type: 'all' | 'urgent',
    startDate: string = (new Date().toISOString().split('T')[0] as string)
  ): TrendData {
    // 生成日期标签
    const labels = this.generateWeekLabels(startDate);
    
    // 构建数据映射
    const openMap = new Map(openRows.map(row => [row.week_start, parseInt(row.count || '0')]));
    const closeMap = new Map(closeRows.map(row => [row.week_start, parseInt(row.count || '0')]));
    
    // 生成累积数据
    const openData = labels.map(label => openMap.get(label) || 0);
    const closeData = labels.map(label => closeMap.get(label) || 0);
    
    // 计算累积和
    const cumulativeOpenData = this.calculateCumulativeSum(openData);
    const cumulativeCloseData = this.calculateCumulativeSum(closeData);
    
    // 生成数据集
    const datasets = [
      {
        label: type === 'all' ? 'ALLOpen' : '紧急BUG打开',
        data: cumulativeOpenData,
      },
      {
        label: type === 'all' ? 'ALLClose' : '紧急BUG关闭',
        data: cumulativeCloseData,
      },
    ];
    
    return {
      labels,
      datasets,
    };
  }
  
  // 生成周标签
  private generateWeekLabels(startDate: string = (new Date().toISOString().split('T')[0] as string)): string[] {
    const labels: string[] = [];
    const today = new Date();
    const start = new Date(startDate);
    
    // 调整到周一开始
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const adjustedStartDate = new Date(start.setDate(diff));
    
    // 生成标签
    let currentDate = new Date(adjustedStartDate);
    while (currentDate <= today) {
      labels.push(currentDate.toISOString().split('T')[0] as string);
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return labels;
  }
  
  // 计算累积和
  private calculateCumulativeSum(data: number[]): number[] {
    const result: number[] = [];
    let sum = 0;
    for (const value of data) {
      sum += value;
      result.push(sum);
    }
    return result;
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
    logger.info('Statistics cache cleared');
  }
}

export default new StatisticsService();