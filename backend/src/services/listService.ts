import { query } from '../utils/database';
import { prisma } from '../utils/prisma';
import { Defect, DefectListResponse, DefectQueryParams } from '../types/defect';
import logger from '../utils/logger';
import { userService } from './userService';

class ListService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = parseInt(process.env['CACHE_TTL'] || '300000'); // 5分钟

  // 获取缺陷列表（带用户数据隔离）
  async getDefects(params: DefectQueryParams): Promise<DefectListResponse> {
    const { 
      page = 1, 
      pageSize = 20, 
      id,
      subject,
      status_id,
      exclude_status_id,
      exclude_status_ids,
      priority_id,
      exclude_priority_id,
      parent_id, 
      startDate, 
      endDate,
      updatedStartDate,
      updatedEndDate,
      system_id,
      module_id,
      project_id,
      assigned_to_name,
      assigned_to_id,
      sort_by,
      sort_direction,
      is_todo,
      userId,
      isAdmin
    } = params;

    // 构建缓存键 - 必须包含所有影响查询结果的参数
    const cacheKey = `defects_${page}_${pageSize}_${id || ''}_${subject || ''}_${status_id || ''}_${exclude_status_id || ''}_${exclude_status_ids ? exclude_status_ids.join(',') : ''}_${priority_id || ''}_${exclude_priority_id || ''}_${parent_id || ''}_${startDate || ''}_${endDate || ''}_${updatedStartDate || ''}_${updatedEndDate || ''}_${system_id || ''}_${module_id || ''}_${project_id || ''}_${assigned_to_name || ''}_${assigned_to_id || ''}_${sort_by || ''}_${sort_direction || ''}_${is_todo ? 'todo' : 'normal'}`;
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      // 如果是我的待办页面请求，不使用缓存，确保始终应用最新的筛选条件
      if (!is_todo) {
        logger.debug('Defect list loaded from cache');
        return cached.data;
      } else {
        logger.debug('Todo page request - skipping cache');
      }
    }

    try {
      // 构建查询参数
      const queryParams: any[] = [];
      let whereClause = `
        WHERE 1=1
      `;

      // 处理项目ID的筛选
      let parentIds: number[] = [];
      
      // 优先处理system_id和module_id参数，无论是否存在project_id
      if (system_id && system_id !== '') {
        const systemId = parseInt(system_id);
        const moduleId = module_id && module_id !== '' ? parseInt(module_id) : undefined;
        
        // 动态获取parentIds（带用户数据隔离）
        parentIds = await this.getParentIds(systemId, moduleId, undefined, userId, isAdmin);
      } else if (project_id && project_id !== '') {
        const projectId = parseInt(project_id);
        
        // 动态获取项目下的所有子目录ID（带用户数据隔离）
        parentIds = await this.getParentIds(undefined, undefined, projectId, userId, isAdmin);
      } else {
        // 默认情况：查询所有二级和三级子节点的数据（带用户数据隔离）
        parentIds = await this.getParentIds(undefined, undefined, undefined, userId, isAdmin);
      }

      // 调试日志
      logger.debug('Defect list parentIds', {
        project_id,
        parentIds,
        parentIdsLength: parentIds.length
      });

      // 应用筛选条件
      // 注意：只有我的待办页面（is_todo=true）需要应用基础筛选条件
      // 问题列表页面（is_todo=false或undefined）不应用基础筛选条件，展示所有数据
      logger.info('Checking todo filter conditions', { is_todo, status_id, assigned_to_id, status_id_type: typeof status_id, assigned_to_id_type: typeof assigned_to_id });
      
      // 从环境变量获取待办页面的配置（作为默认值）
      const defaultAssignedToId = parseInt(process.env['TODO_ASSIGNED_TO_ID'] || '130');
      const todoResolvedStatusId = parseInt(process.env['TODO_RESOLVED_STATUS_ID'] || '5');
      
      // 强制我的待办页面只展示分配给指定用户的问题或状态为已解决的问题
      if (is_todo) {
        // 获取当前用户的Redmine用户ID
        let todoAssignedToId = defaultAssignedToId;
        if (userId) {
          const redmineUserId = await userService.getRedmineUserId(userId);
          if (redmineUserId) {
            todoAssignedToId = redmineUserId;
            logger.info('Using user Redmine ID for todo filter', { userId, redmineUserId });
          } else {
            logger.warn('User has no Redmine binding, using default ID', { userId, defaultAssignedToId });
          }
        }
        
        // 我的待办页面 - 始终应用基础筛选条件
        // 直接构建SQL条件，不使用参数，确保筛选条件正确应用
        whereClause += ` AND ((i.assigned_to_id = ${todoAssignedToId} AND i.status_id != ${todoResolvedStatusId}) OR i.status_id = 3)`;
        logger.info('Applying TODO FILTER CONDITIONS', { 
          project_id, 
          parentIds,
          todoAssignedToId,
          todoResolvedStatusId,
          isDefault: todoAssignedToId === defaultAssignedToId
        });
        
        // 清除可能的额外筛选条件，确保只应用待办页面的基础筛选条件
        // 这样可以防止其他条件干扰待办页面的逻辑
        logger.info('TODO page: clearing additional filters', { status_id, assigned_to_id });
      } else {
        // 问题列表页面，不应用基础筛选条件，展示所有数据
        logger.info('Querying defects without default todo filters (issue list page)', { project_id, status_id, assigned_to_id, parentIds });
      }

      // 调试：检查parentIds中的目录ID
      logger.debug('Directory IDs in parentIds', {
        parentIds,
        directories: parentIds.map(id => `ID: ${id}`)
      });

      // 添加额外筛选条件（无论是否有project_id参数）
      if (id) {
        // 检查ID是否是目录ID，如果是，则跳过搜索
        const isDirectoryId = await this.isDirectoryId(id);
        if (!isDirectoryId) {
          whereClause += ` AND i.id::text LIKE $${queryParams.length + 1}`;
          queryParams.push(`%${id}%`);
        }
      }

      // 标题模糊搜索
      if (subject && subject.trim()) {
        whereClause += ` AND i.subject ILIKE $${queryParams.length + 1}`;
        queryParams.push(`%${subject.trim()}%`);
      }

      // 处理用户在搜索栏中选择的状态筛选 - 支持多选
      if (status_id) {
        if (Array.isArray(status_id) && status_id.length > 0) {
          const statusIds = status_id.map(s => parseInt(s)).filter(s => !isNaN(s));
          if (statusIds.length > 0) {
            whereClause += ` AND i.status_id = ANY($${queryParams.length + 1})`;
            queryParams.push(statusIds);
          }
        } else if (typeof status_id === 'string' && status_id) {
          whereClause += ` AND i.status_id = $${queryParams.length + 1}`;
          queryParams.push(parseInt(status_id));
        }
      }

      // 处理排除状态筛选
      const { exclude_status_id, exclude_status_ids, exclude_priority_id } = params;
      if (exclude_status_id) {
        whereClause += ` AND i.status_id != $${queryParams.length + 1}`;
        queryParams.push(parseInt(exclude_status_id));
      }
      
      // 处理多状态排除
      if (exclude_status_ids && exclude_status_ids.length > 0) {
        const excludeIds = exclude_status_ids.map(s => parseInt(s)).filter(s => !isNaN(s));
        if (excludeIds.length > 0) {
          whereClause += ` AND i.status_id != ALL($${queryParams.length + 1})`;
          queryParams.push(excludeIds);
        }
      }

      // 处理用户在搜索栏中选择的分配给筛选 - 支持多选
      if (assigned_to_id) {
        if (Array.isArray(assigned_to_id) && assigned_to_id.length > 0) {
          const userIds = assigned_to_id.map((a: any) => parseInt(a)).filter((a: number) => !isNaN(a));
          if (userIds.length > 0) {
            whereClause += ` AND i.assigned_to_id = ANY($${queryParams.length + 1})`;
            queryParams.push(userIds);
          }
        } else if (typeof assigned_to_id === 'number') {
          whereClause += ` AND i.assigned_to_id = $${queryParams.length + 1}`;
          queryParams.push(assigned_to_id);
        }
      }

      // 处理优先级筛选 - 支持多选
      if (priority_id) {
        if (Array.isArray(priority_id) && priority_id.length > 0) {
          const priorityIds = priority_id.map(p => parseInt(p)).filter(p => !isNaN(p));
          if (priorityIds.length > 0) {
            whereClause += ` AND i.priority_id = ANY($${queryParams.length + 1})`;
            queryParams.push(priorityIds);
          }
        } else if (typeof priority_id === 'string' && priority_id) {
          whereClause += ` AND i.priority_id = $${queryParams.length + 1}`;
          queryParams.push(parseInt(priority_id));
        }
      }
      
      // 处理排除优先级
      if (exclude_priority_id) {
        whereClause += ` AND i.priority_id != $${queryParams.length + 1}`;
        queryParams.push(parseInt(exclude_priority_id));
      }

      if (parent_id) {
        // 动态查询parent_id对应的所有子目录
        try {
          // 首先查询该目录的级别
          const directory = await prisma.directories.findFirst({
            where: {
              id: parent_id.toString()
            }
          });
          
          if (directory) {
            const level = directory.level;
            
            if (level === 0) {
              // 项目节点：查询所有二级和三级子节点的数据
              const childDirectories = await prisma.directories.findMany({
                where: {
                  level: {
                    in: [1, 2]
                  }
                }
              });
              
              if (childDirectories.length > 0) {
                const childIds = childDirectories.map(dir => parseInt(dir.id));
                whereClause += ` AND i.parent_id = ANY($${queryParams.length + 1})`;
                queryParams.push(childIds);
              }
            } else if (level === 1) {
              // 二级目录（系统级别）：查询所有三级子节点的数据
              const childDirectories = await prisma.directories.findMany({
                where: {
                  parent_id: parent_id.toString(),
                  level: 2
                }
              });
              
              if (childDirectories.length > 0) {
                const childIds = childDirectories.map(dir => parseInt(dir.id));
                whereClause += ` AND i.parent_id = ANY($${queryParams.length + 1})`;
                queryParams.push(childIds);
              } else {
                // 如果没有三级目录，直接查询该目录
                whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
                queryParams.push(parent_id);
              }
            } else if (level === 2) {
              // 三级目录（模块级别）：直接查询该目录下的数据
              whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
              queryParams.push(parent_id);
            } else {
              // 其他级别：直接查询对应parent_id的数据
              whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
              queryParams.push(parent_id);
            }
          } else {
            // 如果目录不存在，直接查询对应parent_id的数据
            whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
            queryParams.push(parent_id);
          }
        } catch (error) {
          logger.error('Error processing parent_id', error);
          // 如果处理失败，直接查询对应parent_id的数据
          whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
          queryParams.push(parent_id);
        }
      }

      if (startDate) {
        whereClause += ` AND i.created_on >= $${queryParams.length + 1}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND i.created_on <= $${queryParams.length + 1}`;
        queryParams.push(endDate);
      }

      if (updatedStartDate) {
        whereClause += ` AND i.updated_on >= $${queryParams.length + 1}`;
        queryParams.push(updatedStartDate);
      }

      if (updatedEndDate) {
        whereClause += ` AND i.updated_on <= $${queryParams.length + 1}`;
        queryParams.push(updatedEndDate);
      }

      if (assigned_to_name) {
        whereClause += ` AND u.lastname = $${queryParams.length + 1}`;
        queryParams.push(assigned_to_name);
      }

      // 注意：assigned_to_id 的筛选逻辑已在上方处理，此处不再重复处理
      
      // 添加parent_id查询条件，这是系统设计的一部分，用于关联目录和缺陷
      // 用户数据隔离：如果没有可访问的目录，返回空结果
      if (parentIds.length === 0) {
        // 用户没有权限访问任何目录，返回空结果
        return {
          list: [],
          total: 0,
          page,
          pageSize
        };
      } else if (parentIds.length === 1) {
        whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
        queryParams.push(parentIds[0]);
      } else {
        whereClause += ` AND i.parent_id = ANY($${queryParams.length + 1})`;
        queryParams.push(parentIds);
      }

      // 过滤掉目录ID对应的记录，确保目录不会被作为问题展示出来
      if (parentIds.length > 0) {
        // 构建目录ID的排除条件
        const directoryIdsString = parentIds.map(id => `'${id}'`).join(', ');
        whereClause += ` AND i.id::text NOT IN (${directoryIdsString})`;
        logger.debug('Added directory ID exclusion condition', {
          directoryIds: parentIds,
          condition: ` AND i.id::text NOT IN (${directoryIdsString})`
        });
      }

      // 动态获取目录结构（带用户数据隔离）
      const projectId = project_id && project_id !== '' ? parseInt(project_id) : undefined;
      const directoryMap = await this.getDirectoryStructure(projectId, userId, isAdmin);

      // 构建查询SQL
      const selectSql = `
        SELECT
          i.*,
          ps.name as status_name,
          pp.name as priority_name,
          u.lastname as assigned_to_name
        FROM issues i
        LEFT JOIN issue_statuses ps ON i.status_id = ps.id
        LEFT JOIN enumerations pp ON i.priority_id = pp.id
        LEFT JOIN users u ON i.assigned_to_id = u.id
      `;

      const countSql = `
        SELECT COUNT(*)
        FROM issues i
      `;

      // 构建排序逻辑
      let orderBy = ' ORDER BY i.updated_on DESC'; // 默认按更新时间倒序
      
      if (sort_by) {
        const validSortFields = ['id', 'created_on', 'updated_on', 'priority_id', 'status_id', 'assigned_to_name', 'system_module_name'];
        const fieldMap: Record<string, string> = {
          'id': 'id',
          'created_at': 'created_on',
          'updated_at': 'updated_on',
          'priority_id': 'priority_id',
          'status_id': 'status_id',
          'assigned_to_name': 'assigned_to_id',
          'system_module_name': 'system_module_name'
        };
        
        const actualField = fieldMap[sort_by] || sort_by;
        if (validSortFields.includes(actualField)) {
          const direction = sort_direction === 'desc' ? 'DESC' : 'ASC';
          orderBy = ` ORDER BY i.${actualField} ${direction}`;
        }
      }
      const limitOffset = ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;

      // 构建最终的查询SQL
      const finalCountSql = countSql + whereClause;
      const finalSelectSql = selectSql + whereClause + orderBy + limitOffset;

      // 调试日志
      logger.debug('Defect list query', {
        whereClause,
        queryParams,
        status_id,
        project_id,
        assigned_to_name,
        assigned_to_id,
        sort_by,
        sort_direction,
        orderBy,
        parentIds,
        is_todo
      });
      
      // 特别为我的待办页面添加详细日志
      if (is_todo) {
        logger.info('TODO PAGE QUERY', {
          finalCountSql,
          finalSelectSql,
          queryParams
        });
      }

      // 查询总数
      const countResult = await query(countSql + whereClause, queryParams);
      const total = parseInt(countResult.rows[0].count || '0');

      // 调试日志
      logger.debug('Defect list count result', {
        total,
        rows: countResult.rows,
        status_id,
        project_id,
        parentIds
      });

      // 查询数据
      const limitParams = [...queryParams, pageSize, (page - 1) * pageSize];
      const dataResult = await query(
        selectSql + whereClause + orderBy + limitOffset,
        limitParams
      );

      // 调试日志
      logger.debug('Defect list data result', {
        rowCount: dataResult.rowCount,
        rows: dataResult.rows.length,
      });

      // 格式化数据
      const list: Defect[] = dataResult.rows.map((row: any) => ({
        id: row.id,
        subject: row.subject,
        description: row.description,
        status_id: row.status_id,
        status_name: row.status_name || '未知',
        priority_id: row.priority_id,
        priority_name: row.priority_name || '未知',
        author_id: row.author_id,
        assigned_to_id: row.assigned_to_id,
        assigned_to_name: row.assigned_to_name || '',
        created_on: row.created_on ? row.created_on.toISOString() : '',
        updated_on: row.updated_on ? row.updated_on.toISOString() : '',
        parent_id: row.parent_id,
        parent_subject: null,
        project_id: row.project_id,
        system_module_name: directoryMap[row.parent_id] || '其他',
      }));

      // 调试日志
      logger.debug('Defect list fetched', {
        count: list.length,
        total: total,
        directoryIds: parentIds,
        page: page,
        pageSize: pageSize
      });

      const response: DefectListResponse = {
        list: list,
        total: total,
        page: page,
        pageSize: pageSize,
      };

      // 更新缓存
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      logger.info('Defect list fetched successfully', { page, pageSize, total });
      return response;
    } catch (error) {
      logger.error('Error fetching defect list', { params, error });
      throw error;
    }
  }

  // 获取缺陷详情
  async getDefectById(id: number): Promise<Defect | null> {
    const cacheKey = `defect_${id}`;
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug(`Defect ${id} loaded from cache`);
      return cached.data;
    }

    try {
      const sql = `
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
        WHERE i.id = $1
      `;

      const result = await query(sql, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const defect: Defect = {
        id: row.id,
        subject: row.subject,
        description: row.description,
        status_id: row.status_id,
        status_name: row.status_name || '未知',
        priority_id: row.priority_id,
        priority_name: row.priority_name || '未知',
        author_id: row.author_id,
        assigned_to_id: row.assigned_to_id,
        assigned_to_name: row.assigned_to_name || '',
        created_on: row.created_on ? row.created_on.toISOString() : '',
        updated_on: row.updated_on ? row.updated_on.toISOString() : '',
        parent_id: row.parent_id,
        parent_subject: row.parent_subject,
        project_id: row.project_id,
      };

      // 更新缓存
      this.cache.set(cacheKey, {
        data: defect,
        timestamp: Date.now(),
      });

      logger.info(`Defect ${id} fetched successfully`);
      return defect;
    } catch (error) {
      logger.error(`Error fetching defect ${id}`, error);
      throw error;
    }
  }

  // 动态获取目录结构（带用户数据隔离）
  async getDirectoryStructure(projectId?: number, userId?: number, isAdmin?: boolean): Promise<{ [key: number]: string }> {
    try {
      // 构建项目过滤条件
      let projectFilter: any = {};
      if (projectId) {
        projectFilter.project_id = projectId.toString();
      }
      
      // 用户数据隔离：非管理员只能访问自己创建的项目下的目录
      if (!isAdmin && userId) {
        const userProjects = await prisma.projects.findMany({
          where: { created_by: userId },
          select: { id: true }
        });
        const userProjectIds = userProjects.map(p => p.id);
        if (userProjectIds.length === 0) {
          return {}; // 用户没有创建任何项目，返回空
        }
        if (projectId) {
          // 如果指定了项目ID，检查是否属于用户
          if (!userProjectIds.includes(projectId.toString())) {
            return {}; // 无权访问该项目
          }
        } else {
          projectFilter.project_id = { in: userProjectIds };
        }
      }
      
      // 查询数据库中的目录结构
      const directories = await prisma.directories.findMany({
        where: projectFilter,
        orderBy: [
          { level: 'asc' },
          { created_at: 'asc' }
        ]
      });
      
      // 构建目录映射
      const directoryMap: { [key: number]: string } = {};
      const directoryNameMap: { [key: number]: string } = {};
      
      // 首先构建基本的ID到名称的映射
      directories.forEach(dir => {
        directoryNameMap[parseInt(dir.id)] = dir.name;
      });
      
      // 然后构建完整的目录路径
      directories.forEach(dir => {
        const id = parseInt(dir.id);
        const level = dir.level;
        const parentId = parseInt(dir.parent_id);
        
        if (level === 1) {
          // 二级目录（系统级别），直接使用名称
          directoryMap[id] = directoryNameMap[id] || '';
        } else if (level === 2) {
          // 三级目录（模块级别），使用"父目录 - 子目录"的格式
          const parentName = directoryNameMap[parentId] || '';
          directoryMap[id] = `${parentName} - ${directoryNameMap[id] || ''}`;
        }
      });
      
      return directoryMap;
    } catch (error) {
      logger.error('Error fetching directory structure', error);
      // 如果获取目录结构失败，返回空对象
      return {};
    }
  }

  // 检查ID是否是目录ID
  private async isDirectoryId(id: number): Promise<boolean> {
    try {
      const directory = await prisma.directories.findFirst({
        where: {
          id: id.toString()
        }
      });
      return directory !== null;
    } catch (error) {
      logger.error('Error checking if ID is directory ID', { id, error });
      return false;
    }
  }

  // 动态获取parentIds（带用户数据隔离）
  // 核心逻辑：当二级目录（系统）下有三级目录（模块）时，只返回三级目录ID，排除二级目录ID
  // 当二级目录下没有三级目录时，返回二级目录ID本身
  async getParentIds(systemId?: number | string, moduleId?: number | string, projectId?: number | string, userId?: number, isAdmin?: boolean): Promise<number[]> {
    try {
      let parentIds: number[] = [];
      
      // 用户数据隔离：构建项目过滤条件
      let projectFilter: any = {};
      if (!isAdmin && userId) {
        // 非管理员只能访问自己创建的项目下的目录
        const userProjects = await prisma.projects.findMany({
          where: { created_by: userId },
          select: { id: true }
        });
        const userProjectIds = userProjects.map(p => p.id);
        if (userProjectIds.length === 0) {
          return []; // 用户没有创建任何项目，返回空
        }
        projectFilter.project_id = { in: userProjectIds };
      }
      
      if (systemId) {
        const parsedSystemId = typeof systemId === 'string' ? parseInt(systemId) : systemId;
        
        if (moduleId) {
          const parsedModuleId = typeof moduleId === 'string' ? parseInt(moduleId) : moduleId;
          parentIds = [parsedModuleId];
        } else {
          const subdirectories = await prisma.directories.findMany({
            where: {
              parent_id: parsedSystemId.toString(),
              level: 2,
              ...projectFilter
            }
          });
          
          if (subdirectories.length > 0) {
            parentIds = subdirectories.map(dir => parseInt(dir.id));
          } else {
            parentIds = [parsedSystemId];
          }
        }
      } else if (projectId) {
        const parsedProjectId = typeof projectId === 'string' ? parseInt(projectId) : projectId;
        
        // 检查用户是否有权限访问该项目
        if (!isAdmin && userId) {
          const project = await prisma.projects.findFirst({
            where: { id: parsedProjectId.toString(), created_by: userId }
          });
          if (!project) {
            return []; // 无权访问该项目
          }
        }
        
        const directories = await prisma.directories.findMany({
          where: {
            project_id: parsedProjectId.toString()
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
        // 查询所有目录，但按用户过滤
        const allDirectories = await prisma.directories.findMany({
          where: projectFilter
        });
        
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
      
      return parentIds;
    } catch (error) {
      logger.error('Error fetching parentIds', error);
      return [];
    }
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
    logger.info('Defect list cache cleared');
  }
}

export default new ListService();