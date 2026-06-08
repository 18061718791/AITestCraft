import { IntentType, QueryParams, QueryResult, DefectItem, TrendData, DistributionData } from './types';
import listService from '../listService';
import statisticsService from '../statisticsService';
import { query } from '../../utils/database';
import { prisma } from '../../utils/prisma';
import logger from '../../utils/logger';

type QueryLevel = 'project' | 'system' | 'module' | 'all';

class QueryExecutor {
  async execute(intent: IntentType, params: QueryParams): Promise<QueryResult> {
    logger.info('QueryExecutor: Executing query', { intent, params });

    switch (intent) {
      case 'query_list':
        return await this.executeListQuery(params);
      case 'query_my_todo':
        return await this.executeMyTodoQuery(params);
      case 'query_trend':
        return await this.executeTrendQuery(params);
      case 'query_distribution':
        return await this.executeDistributionQuery(params);
      case 'query_count':
        return await this.executeCountQuery(params);
      case 'generate_document':
        return await this.executeDocumentGeneration(params);
      case 'export_data':
        return await this.executeDataExport(params);
      default:
        return {};
    }
  }

  private detectQueryLevel(params: QueryParams): QueryLevel {
    if (params.moduleId) return 'module';
    if (params.systemId) return 'system';
    if (params.projectId) return 'project';
    return 'all';
  }

  private async executeListQuery(params: QueryParams, forExport: boolean = false): Promise<QueryResult> {
    try {
      const queryParams: any = {
        page: params.page || 1,
        pageSize: forExport ? 10000 : 100
      };

      if (params.moduleId) {
        queryParams.system_id = params.moduleId.toString();
      } else if (params.systemId) {
        queryParams.system_id = params.systemId.toString();
      } else if (params.projectId) {
        queryParams.project_id = params.projectId.toString();
      }
      
      // 处理组合状态条件
      if (params.statusNames && params.statusNames.length > 1) {
        const statusIds = [];
        for (const statusName of params.statusNames) {
          const statusId = await this.getStatusIdByName(statusName);
          if (statusId) statusIds.push(statusId);
        }
        if (statusIds.length > 0) {
          queryParams.status_id = statusIds.map(String);
        }
      } else if (params.statusName) {
        const statusId = await this.getStatusIdByName(params.statusName);
        if (statusId) {
          queryParams.status_id = statusId.toString();
        }
      }
      
      // 处理单状态排除
      if (params.excludeStatusName) {
        const excludeStatusId = await this.getStatusIdByName(params.excludeStatusName);
        if (excludeStatusId) {
          queryParams.exclude_status_id = excludeStatusId.toString();
        }
      }
      
      // 处理多状态排除
      if (params.excludeStatusNames && params.excludeStatusNames.length > 0) {
        const excludeStatusIds = [];
        for (const statusName of params.excludeStatusNames) {
          const statusId = await this.getStatusIdByName(statusName);
          if (statusId) excludeStatusIds.push(statusId);
        }
        if (excludeStatusIds.length > 0) {
          queryParams.exclude_status_ids = excludeStatusIds.map(String);
        }
      }
      
      // 处理组合优先级条件
      if (params.priorityNames && params.priorityNames.length > 1) {
        const priorityIds = [];
        for (const priorityName of params.priorityNames) {
          const priorityId = await this.getPriorityIdByName(priorityName);
          if (priorityId) priorityIds.push(priorityId);
        }
        if (priorityIds.length > 0) {
          queryParams.priority_id = priorityIds.map(String);
        }
      } else if (params.priorityName) {
        const priorityId = await this.getPriorityIdByName(params.priorityName);
        if (priorityId) {
          queryParams.priority_id = priorityId.toString();
        }
      }
      
      // 处理排除优先级
      if (params.excludePriorityName) {
        const excludePriorityId = await this.getPriorityIdByName(params.excludePriorityName);
        if (excludePriorityId) {
          queryParams.exclude_priority_id = excludePriorityId.toString();
        }
      }
      if (params.assignedToName) {
        queryParams.assigned_to_id = parseInt(params.assignedToName);
      }

      if (params.timeRange && params.timeRange !== 'all') {
        const { startDate, endDate } = this.getTimeRange(params.timeRange);
        if (params.dateField === 'updated_on') {
          queryParams.updatedStartDate = startDate;
          queryParams.updatedEndDate = endDate + ' 23:59:59';
        } else {
          queryParams.startDate = startDate;
          queryParams.endDate = endDate + ' 23:59:59';
        }
      }

      if (params.sortBy) {
        queryParams.sort_by = params.sortBy;
      }
      if (params.sortDirection) {
        queryParams.sort_direction = params.sortDirection;
      }

      logger.info('QueryExecutor: Calling listService.getDefects', { queryParams, forExport });

      const result = await listService.getDefects(queryParams);

      logger.info('QueryExecutor: listService.getDefects result', { 
        listLength: result.list?.length, 
        total: result.total 
      });

      return {
        list: result.list as DefectItem[],
        total: result.total
      };
    } catch (error) {
      logger.error('QueryExecutor: List query failed', error);
      throw error;
    }
  }

  private async executeCountQuery(params: QueryParams): Promise<QueryResult> {
    try {
      const queryParams: any[] = [];
      let whereClause = `WHERE 1=1`;

      let parentIds: number[] = [];

      if (params.moduleId) {
        parentIds = [params.moduleId];
      } else if (params.systemId) {
        const subdirectories = await prisma.directories.findMany({
          where: {
            parent_id: params.systemId.toString(),
            level: 2
          }
        });
        if (subdirectories.length > 0) {
          parentIds = subdirectories.map(dir => parseInt(dir.id));
        } else {
          parentIds = [params.systemId];
        }
      } else if (params.projectId) {
        const directories = await prisma.directories.findMany({
          where: {
            project_id: params.projectId.toString()
          }
        });
        
        const level1Dirs = directories.filter(dir => dir.level === 1);
        const level2Dirs = directories.filter(dir => dir.level === 2);
        
        for (const dir of level1Dirs) {
          const childModules = level2Dirs.filter(l2Dir => l2Dir.parent_id === dir.id);
          if (childModules.length > 0) {
            parentIds.push(...childModules.map(m => parseInt(m.id)));
          } else {
            parentIds.push(parseInt(dir.id));
          }
        }
      } else {
        const allDirectories = await prisma.directories.findMany();
        
        const level1Dirs = allDirectories.filter(dir => dir.level === 1);
        const level2Dirs = allDirectories.filter(dir => dir.level === 2);
        
        for (const dir of level1Dirs) {
          const childModules = level2Dirs.filter(l2Dir => l2Dir.parent_id === dir.id);
          if (childModules.length > 0) {
            parentIds.push(...childModules.map(m => parseInt(m.id)));
          } else {
            parentIds.push(parseInt(dir.id));
          }
        }
      }

      if (parentIds.length === 1) {
        whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
        queryParams.push(parentIds[0]);
      } else if (parentIds.length > 0) {
        whereClause += ` AND i.parent_id = ANY($${queryParams.length + 1})`;
        queryParams.push(parentIds);
      } else {
        whereClause += ` AND i.parent_id IS NOT NULL`;
      }

      // 处理组合状态条件
      if (params.statusNames && params.statusNames.length > 1) {
        const statusIds = [];
        for (const statusName of params.statusNames) {
          const statusId = await this.getStatusIdByName(statusName);
          if (statusId) statusIds.push(statusId);
        }
        if (statusIds.length > 0) {
          whereClause += ` AND i.status_id = ANY($${queryParams.length + 1})`;
          queryParams.push(statusIds);
        }
      } else if (params.statusName) {
        const statusId = await this.getStatusIdByName(params.statusName);
        if (statusId) {
          whereClause += ` AND i.status_id = $${queryParams.length + 1}`;
          queryParams.push(statusId);
        }
      }
      
      // 处理单状态排除
      if (params.excludeStatusName) {
        const excludeStatusId = await this.getStatusIdByName(params.excludeStatusName);
        if (excludeStatusId) {
          whereClause += ` AND i.status_id != $${queryParams.length + 1}`;
          queryParams.push(excludeStatusId);
        }
      }
      
      // 处理多状态排除
      if (params.excludeStatusNames && params.excludeStatusNames.length > 0) {
        const excludeStatusIds = [];
        for (const statusName of params.excludeStatusNames) {
          const statusId = await this.getStatusIdByName(statusName);
          if (statusId) excludeStatusIds.push(statusId);
        }
        if (excludeStatusIds.length > 0) {
          whereClause += ` AND i.status_id != ALL($${queryParams.length + 1})`;
          queryParams.push(excludeStatusIds);
        }
      }

      // 处理组合优先级条件
      if (params.priorityNames && params.priorityNames.length > 1) {
        const priorityIds = [];
        for (const priorityName of params.priorityNames) {
          const priorityId = await this.getPriorityIdByName(priorityName);
          if (priorityId) priorityIds.push(priorityId);
        }
        if (priorityIds.length > 0) {
          whereClause += ` AND i.priority_id = ANY($${queryParams.length + 1})`;
          queryParams.push(priorityIds);
        }
      } else if (params.priorityName) {
        const priorityId = await this.getPriorityIdByName(params.priorityName);
        if (priorityId) {
          whereClause += ` AND i.priority_id = $${queryParams.length + 1}`;
          queryParams.push(priorityId);
        }
      }
      
      // 处理排除优先级
      if (params.excludePriorityName) {
        const excludePriorityId = await this.getPriorityIdByName(params.excludePriorityName);
        if (excludePriorityId) {
          whereClause += ` AND i.priority_id != $${queryParams.length + 1}`;
          queryParams.push(excludePriorityId);
        }
      }

      if (params.timeRange && params.timeRange !== 'all') {
        const { startDate, endDate } = this.getTimeRange(params.timeRange);
        
        if (params.dateField === 'updated_on') {
          whereClause += ` AND i.updated_on >= $${queryParams.length + 1}`;
          queryParams.push(startDate);
          whereClause += ` AND i.updated_on <= $${queryParams.length + 1}`;
          queryParams.push(endDate + ' 23:59:59');
        } else {
          whereClause += ` AND i.created_on >= $${queryParams.length + 1}`;
          queryParams.push(startDate);
          whereClause += ` AND i.created_on <= $${queryParams.length + 1}`;
          queryParams.push(endDate + ' 23:59:59');
        }
      }

      const countSql = `SELECT COUNT(*) as count FROM issues i ${whereClause}`;

      logger.info('QueryExecutor: Executing count query', { countSql, queryParams });

      const countResult = await query(countSql, queryParams);
      const count = parseInt(countResult.rows[0]?.count || '0');

      logger.info('QueryExecutor: Count query result', { count });

      return {
        count: count
      };
    } catch (error) {
      logger.error('QueryExecutor: Count query failed', error);
      throw error;
    }
  }

  private async executeMyTodoQuery(params: QueryParams, forExport: boolean = false): Promise<QueryResult> {
    try {
      const page = params.page || 1;
      const pageSize = forExport ? 10000 : 100;

      const todoAssignedToId = parseInt(process.env['TODO_ASSIGNED_TO_ID'] || '130');
      const todoResolvedStatusId = parseInt(process.env['TODO_RESOLVED_STATUS_ID'] || '5');
      const todoNewStatusId = parseInt(process.env['TODO_NEW_STATUS_ID'] || '3');

      let parentIds: number[] = [];

      if (params.moduleId) {
        parentIds = [params.moduleId];
      } else if (params.systemId) {
        const subdirectories = await prisma.directories.findMany({
          where: {
            parent_id: params.systemId.toString(),
            level: 2
          }
        });
        if (subdirectories.length > 0) {
          parentIds = subdirectories.map(dir => parseInt(dir.id));
        } else {
          parentIds = [params.systemId];
        }
      } else if (params.projectId) {
        const directories = await prisma.directories.findMany({
          where: {
            project_id: params.projectId.toString(),
            level: { in: [1, 2] }
          }
        });
        if (directories.length > 0) {
          parentIds = directories.map(dir => parseInt(dir.id));
        }
      } else {
        const allDirectories = await prisma.directories.findMany({
          where: { level: { in: [1, 2] } }
        });
        if (allDirectories.length > 0) {
          parentIds = allDirectories.map(dir => parseInt(dir.id));
        }
      }

      const queryParams: any[] = [];
      let whereClause = `WHERE 1=1`;

      if (parentIds.length === 1) {
        whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
        queryParams.push(parentIds[0]);
      } else if (parentIds.length > 1) {
        whereClause += ` AND i.parent_id = ANY($${queryParams.length + 1})`;
        queryParams.push(parentIds);
      }

      whereClause += ` AND ((i.assigned_to_id = $${queryParams.length + 1} AND i.status_id != $${queryParams.length + 2}) OR i.status_id = $${queryParams.length + 3})`;
      queryParams.push(todoAssignedToId, todoResolvedStatusId, todoNewStatusId);

      // 处理组合状态条件
      if (params.statusNames && params.statusNames.length > 1) {
        const statusIds = [];
        for (const statusName of params.statusNames) {
          const statusId = await this.getStatusIdByName(statusName);
          if (statusId) statusIds.push(statusId);
        }
        if (statusIds.length > 0) {
          whereClause += ` AND i.status_id = ANY($${queryParams.length + 1})`;
          queryParams.push(statusIds);
        }
      } else if (params.statusName) {
        const statusId = await this.getStatusIdByName(params.statusName);
        if (statusId) {
          whereClause += ` AND i.status_id = $${queryParams.length + 1}`;
          queryParams.push(statusId);
        }
      }
      
      // 处理单状态排除
      if (params.excludeStatusName) {
        const excludeStatusId = await this.getStatusIdByName(params.excludeStatusName);
        if (excludeStatusId) {
          whereClause += ` AND i.status_id != $${queryParams.length + 1}`;
          queryParams.push(excludeStatusId);
        }
      }
      
      // 处理多状态排除
      if (params.excludeStatusNames && params.excludeStatusNames.length > 0) {
        const excludeStatusIds = [];
        for (const statusName of params.excludeStatusNames) {
          const statusId = await this.getStatusIdByName(statusName);
          if (statusId) excludeStatusIds.push(statusId);
        }
        if (excludeStatusIds.length > 0) {
          whereClause += ` AND i.status_id != ALL($${queryParams.length + 1})`;
          queryParams.push(excludeStatusIds);
        }
      }

      // 处理组合优先级条件
      if (params.priorityNames && params.priorityNames.length > 1) {
        const priorityIds = [];
        for (const priorityName of params.priorityNames) {
          const priorityId = await this.getPriorityIdByName(priorityName);
          if (priorityId) priorityIds.push(priorityId);
        }
        if (priorityIds.length > 0) {
          whereClause += ` AND i.priority_id = ANY($${queryParams.length + 1})`;
          queryParams.push(priorityIds);
        }
      } else if (params.priorityName) {
        const priorityId = await this.getPriorityIdByName(params.priorityName);
        if (priorityId) {
          whereClause += ` AND i.priority_id = $${queryParams.length + 1}`;
          queryParams.push(priorityId);
        }
      }
      
      // 处理排除优先级
      if (params.excludePriorityName) {
        const excludePriorityId = await this.getPriorityIdByName(params.excludePriorityName);
        if (excludePriorityId) {
          whereClause += ` AND i.priority_id != $${queryParams.length + 1}`;
          queryParams.push(excludePriorityId);
        }
      }

      const selectSql = `
        SELECT
          i.*,
          p.subject as parent_subject,
          ps.name as status_name,
          pp.name as priority_name,
          u.lastname as assigned_to_name
        FROM issues i
        LEFT JOIN issue_statuses ps ON i.status_id = ps.id
        LEFT JOIN enumerations pp ON i.priority_id = pp.id
        LEFT JOIN issues p ON i.parent_id = p.id
        LEFT JOIN users u ON i.assigned_to_id = u.id
      `;

      const countSql = `SELECT COUNT(*) FROM issues i `;

      const countResult = await query(countSql + whereClause, queryParams);
      const total = parseInt(countResult.rows[0]?.count || '0');

      const orderBy = ' ORDER BY i.created_on DESC';
      const limitOffset = ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      const limitParams = [...queryParams, pageSize, (page - 1) * pageSize];

      const dataResult = await query(selectSql + whereClause + orderBy + limitOffset, limitParams);

      const directoryIds = dataResult.rows.map((row: any) => row.parent_id).filter((id: any) => id && !isNaN(id));
      const directoriesMap: Record<number, any> = {};

      if (directoryIds.length > 0) {
        const uniqueDirectoryIds = [...new Set(directoryIds)];
        const directories = await prisma.directories.findMany({
          where: { id: { in: uniqueDirectoryIds.map(id => id.toString()) } }
        });

        directories.forEach(dir => {
          directoriesMap[parseInt(dir.id)] = dir;
        });

        const moduleIds = directories
          .filter(dir => dir.level === 3)
          .map(dir => dir.parent_id)
          .filter((id: any) => id && !isNaN(id));

        if (moduleIds.length > 0) {
          const uniqueModuleIds = [...new Set(moduleIds)];
          const parentDirectories = await prisma.directories.findMany({
            where: { id: { in: uniqueModuleIds } }
          });

          parentDirectories.forEach(dir => {
            directoriesMap[parseInt(dir.id)] = dir;
          });
        }
      }

      const list: DefectItem[] = dataResult.rows.map((row: any) => {
        let system_module_name = '其他';

        if (row.parent_id) {
          const directory = directoriesMap[row.parent_id];
          if (directory) {
            if (directory.level === 1) {
              system_module_name = directory.name;
            } else if (directory.level === 2) {
              const parentDirectory = directoriesMap[parseInt(directory.parent_id)];
              if (parentDirectory) {
                system_module_name = `${parentDirectory.name} - ${directory.name}`;
              } else {
                system_module_name = directory.name;
              }
            }
          }
        }

        return {
          id: row.id,
          subject: row.subject,
          status_name: row.status_name || '未知',
          priority_name: row.priority_name || '未知',
          system_module_name,
          assigned_to_name: row.assigned_to_name || '',
          created_on: row.created_on ? row.created_on.toISOString() : '',
          updated_on: row.updated_on ? row.updated_on.toISOString() : ''
        };
      });

      logger.info('QueryExecutor: My todo query result', { listLength: list.length, total });

      return { list, total };
    } catch (error) {
      logger.error('QueryExecutor: My todo query failed', error);
      throw error;
    }
  }

  private async executeTrendQuery(params: QueryParams): Promise<QueryResult> {
    try {
      const level = this.detectQueryLevel(params);
      const timeRange = params.timeRange || 'all';
      
      let parentId: string | undefined;
      if (level === 'module') {
        parentId = params.moduleId?.toString();
      } else if (level === 'system') {
        parentId = params.systemId?.toString();
      } else if (level === 'project') {
        parentId = params.projectId?.toString();
      }

      logger.info('QueryExecutor: Executing trend query', { level, parentId, timeRange });

      let trendData: any;
      
      // 项目级别、系统级别、模块级别都统一调用 getSystemTrend
      if (parentId) {
        trendData = await statisticsService.getSystemTrend(parentId, 'all', timeRange);
      } else {
        trendData = await statisticsService.getOverviewTrend('all', timeRange, undefined);
      }

      const result: QueryResult = {
        trendData: trendData as TrendData
      };

      if (level === 'project' || level === 'all') {
        const [systemDistribution, priorityDistribution] = await Promise.all([
          statisticsService.getSystemDistribution(false, parentId, timeRange),
          statisticsService.getPriorityDistribution(parentId, timeRange)
        ]);
        
        result.distributionData = {
          systemDistribution: systemDistribution as DistributionData['systemDistribution'],
          priorityDistribution: priorityDistribution as DistributionData['priorityDistribution']
        } as DistributionData;
      } else if (level === 'system' || level === 'module') {
        const priorityDistribution = await statisticsService.getPriorityDistribution(parentId, timeRange);
        
        result.distributionData = {
          priorityDistribution: priorityDistribution as DistributionData['priorityDistribution']
        } as DistributionData;
      }

      return result;
    } catch (error) {
      logger.error('QueryExecutor: Trend query failed', error);
      throw error;
    }
  }

  private async executeDistributionQuery(params: QueryParams): Promise<QueryResult> {
    try {
      const level = this.detectQueryLevel(params);
      const timeRange = params.timeRange || 'all';
      
      let parentId: string | undefined;
      if (level === 'module') {
        parentId = params.moduleId?.toString();
      } else if (level === 'system') {
        parentId = params.systemId?.toString();
      } else if (level === 'project') {
        parentId = params.projectId?.toString();
      }

      const result: QueryResult = {};

      if (level === 'project' || level === 'all') {
        const [systemDistribution, priorityDistribution] = await Promise.all([
          statisticsService.getSystemDistribution(false, parentId, timeRange),
          statisticsService.getPriorityDistribution(parentId, timeRange)
        ]);
        
        result.distributionData = {
          systemDistribution: systemDistribution as DistributionData['systemDistribution'],
          priorityDistribution: priorityDistribution as DistributionData['priorityDistribution']
        } as DistributionData;
      } else {
        const priorityDistribution = await statisticsService.getPriorityDistribution(parentId, timeRange);
        
        result.distributionData = {
          priorityDistribution: priorityDistribution as DistributionData['priorityDistribution']
        } as DistributionData;
      }

      return result;
    } catch (error) {
      logger.error('QueryExecutor: Distribution query failed', error);
      throw error;
    }
  }

  private async executeDocumentGeneration(params: QueryParams): Promise<QueryResult> {
    return {
      taskId: `doc_${Date.now()}`,
      documentUrl: '/api/defect-assistant/documents/placeholder'
    };
  }

  async executeDataExport(params: QueryParams): Promise<QueryResult> {
    return await this.executeListQuery({ ...params, page: 1, pageSize: 10000 }, true);
  }

  async executeMyTodoExport(params: QueryParams): Promise<QueryResult> {
    return await this.executeMyTodoQuery({ ...params, page: 1, pageSize: 10000 }, true);
  }

  private async getStatusIdByName(name: string): Promise<number | null> {
    const statusMap: Record<string, number> = {
      '新建': 1,
      '进行中': 2,
      '已解决': 3,
      '已关闭': 5
    };
    return statusMap[name] || null;
  }

  private async getPriorityIdByName(name: string): Promise<number | null> {
    const priorityMap: Record<string, number> = {
      '紧急': 4,
      '一般': 5
    };
    return priorityMap[name] || null;
  }

  private getTimeRange(range: string): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    switch (range) {
      case 'today':
        startDate = now.toISOString().split('T')[0] || '';
        endDate = startDate;
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0] || '';
        endDate = startDate;
        break;
      case 'day_before_yesterday':
        const dayBeforeYesterday = new Date(now);
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
        startDate = dayBeforeYesterday.toISOString().split('T')[0] || '';
        endDate = startDate;
        break;
      case 'this_week':
        const weekStart = new Date(now);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(weekStart.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart.toISOString().split('T')[0] || '';
        endDate = now.toISOString().split('T')[0] || '';
        break;
      case 'this_month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0] || '';
        endDate = now.toISOString().split('T')[0] || '';
        break;
      case 'last_week':
        const lastWeekStart = new Date(now);
        const lastDayOfWeek = lastWeekStart.getDay();
        const lastDiff = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1;
        lastWeekStart.setDate(lastWeekStart.getDate() - lastDiff - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        startDate = lastWeekStart.toISOString().split('T')[0] || '';
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        endDate = lastWeekEnd.toISOString().split('T')[0] || '';
        break;
      case 'week_before_last':
        const weekBeforeLastStart = new Date(now);
        const weekBeforeLastDayOfWeek = weekBeforeLastStart.getDay();
        const weekBeforeLastDiff = weekBeforeLastDayOfWeek === 0 ? 6 : weekBeforeLastDayOfWeek - 1;
        weekBeforeLastStart.setDate(weekBeforeLastStart.getDate() - weekBeforeLastDiff - 14);
        weekBeforeLastStart.setHours(0, 0, 0, 0);
        startDate = weekBeforeLastStart.toISOString().split('T')[0] || '';
        const weekBeforeLastEnd = new Date(weekBeforeLastStart);
        weekBeforeLastEnd.setDate(weekBeforeLastStart.getDate() + 6);
        endDate = weekBeforeLastEnd.toISOString().split('T')[0] || '';
        break;
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonthStart.toISOString().split('T')[0] || '';
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate = lastMonthEnd.toISOString().split('T')[0] || '';
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0] || '';
        endDate = now.toISOString().split('T')[0] || '';
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0] || '';
        endDate = now.toISOString().split('T')[0] || '';
        break;
      case 'quarter':
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        startDate = quarterAgo.toISOString().split('T')[0] || '';
        endDate = now.toISOString().split('T')[0] || '';
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0] || '';
        endDate = now.toISOString().split('T')[0] || '';
        break;
      default:
        const defaultStart = new Date(now);
        defaultStart.setMonth(defaultStart.getMonth() - 1);
        startDate = defaultStart.toISOString().split('T')[0] || '';
        endDate = now.toISOString().split('T')[0] || '';
    }

    logger.info('QueryExecutor: Calculated time range', { range, startDate, endDate });
    return { startDate, endDate };
  }
}

export default new QueryExecutor();
