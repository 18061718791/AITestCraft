import { Router } from 'express';
import defectController from '../controllers/defectController';
import { serverChanService } from '../services/serverChanService';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { query } from '../utils/database';
import { urgentIssueExportService } from '../services/urgentIssueExportService';
import { userService } from '../services/userService';
import { Directory } from '../types/defect';
import { authMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

// 辅助函数：检查是否是管理员
const isAdmin = (req: AuthRequest): boolean => {
  return req.user?.roles?.some((r: any) => r.code === 'admin') ?? false;
};

// 目录结构相关路由（带用户数据隔离）
router.get('/tree', authMiddleware, defectController.getTree);

// 缺陷列表相关路由（带用户数据隔离）
router.get('/', authMiddleware, defectController.getDefects);

// 专门处理我的待办页面的请求（带用户数据隔离）
router.get('/my-todo', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const admin = isAdmin(req);
    const page = parseInt(req.query['page'] as string) || 1;
    const pageSize = parseInt(req.query['pageSize'] as string) || 20;
    const project_id = req.query['project_id'] as string;
    const system_id = req.query['system_id'] as string;
    const module_id = req.query['module_id'] as string;
    const status_id = req.query['status_id'] as string;
    const assigned_to_id = req.query['assigned_to_id'] as string;

    // 用户数据隔离：构建项目过滤条件
    let projectFilter: any = {};
    if (!admin && userId) {
      const userProjects = await prisma.projects.findMany({
        where: { created_by: userId },
        select: { id: true }
      });
      const userProjectIds = userProjects.map(p => p.id);
      if (userProjectIds.length === 0) {
        // 用户没有创建任何项目，返回空结果
        res.json({
          success: true,
          data: {
            list: [],
            total: 0,
            page,
            pageSize,
          }
        });
        return;
      }
      projectFilter.project_id = { in: userProjectIds };
    }

    // 动态获取目录结构
    let parentIds: number[] = [];

    try {
      // 处理system_id和module_id
      if (system_id && system_id !== '') {
        const systemId = parseInt(system_id);
        const moduleId = module_id && module_id !== '' ? parseInt(module_id) : undefined;

        if (!isNaN(systemId)) {
          // 查询系统下的所有子目录（带用户数据隔离）
          const subdirectories = await prisma.directories.findMany({
            where: {
              parent_id: systemId.toString(),
              level: 2,
              ...projectFilter
            }
          });

          if (subdirectories.length > 0) {
            if (moduleId && !isNaN(moduleId)) {
              parentIds = [moduleId];
            } else {
              parentIds = subdirectories.map((dir: Directory) => parseInt(dir.id));
            }
          } else {
            parentIds = [systemId];
          }
        } else {
          // 无效的system_id，查询所有二级和三级目录（带用户数据隔离）
          const allDirectories = await prisma.directories.findMany({
            where: {
              level: {
                in: [1, 2]
              },
              ...projectFilter
            }
          });
          if (allDirectories.length > 0) {
            parentIds = allDirectories.map((dir: Directory) => parseInt(dir.id));
          }
        }
      } else if (project_id && project_id !== '') {
        const projectId = parseInt(project_id);

        if (!isNaN(projectId)) {
          // 检查用户是否有权限访问该项目
          if (!admin && userId) {
            const project = await prisma.projects.findFirst({
              where: { id: projectId.toString(), created_by: userId }
            });
            if (!project) {
              res.json({
                success: true,
                data: {
                  list: [],
                  total: 0,
                  page,
                  pageSize,
                }
              });
              return;
            }
          }

          // 查询项目下的所有二级和三级目录
          const directories = await prisma.directories.findMany({
            where: {
              project_id: projectId.toString(),
              level: {
                in: [1, 2]
              }
            }
          });

          if (directories.length > 0) {
            parentIds = directories.map((dir: Directory) => parseInt(dir.id));
          }
        }
      } else {
        // 没有提供参数，查询所有二级和三级目录（带用户数据隔离）
        const allDirectories = await prisma.directories.findMany({
          where: {
            level: {
              in: [1, 2]
            },
            ...projectFilter
          }
        });
        if (allDirectories.length > 0) {
          parentIds = allDirectories.map((dir: Directory) => parseInt(dir.id));
        }
      }
    } catch (error) {
      console.error('Error fetching directories:', error);
      // 如果获取失败，返回空数组
      parentIds = [];
    }
    
    // 构建查询参数
    const queryParams: any[] = [];
    let whereClause = `WHERE 1=1`;
    
    // 应用parent_id筛选条件
    if (parentIds.length === 1) {
      whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
      queryParams.push(parentIds[0]);
    } else {
      whereClause += ` AND i.parent_id = ANY($${queryParams.length + 1})`;
      queryParams.push(parentIds);
    }
    
    // 应用我的待办页面筛选条件（强制）
    // 获取当前用户的Redmine用户ID，如果未关联则使用默认值130
    let todoAssignedToId = 130;
    if (userId) {
      const redmineUserId = await userService.getRedmineUserId(userId);
      if (redmineUserId) {
        todoAssignedToId = redmineUserId;
        logger.info('My-todo route: Using user Redmine ID', { userId, redmineUserId });
      } else {
        logger.warn('My-todo route: User has no Redmine binding, using default ID 130', { userId });
      }
    }
    
    whereClause += ` AND ((i.assigned_to_id = $${queryParams.length + 1} AND i.status_id != $${queryParams.length + 2}) OR i.status_id = $${queryParams.length + 3})`;
    queryParams.push(todoAssignedToId, 5, 3);
    
    // 应用状态筛选条件
    if (status_id && status_id !== '') {
      whereClause += ` AND i.status_id = $${queryParams.length + 1}`;
      queryParams.push(parseInt(status_id));
    }
    
    // 应用分配给筛选条件
    if (assigned_to_id && assigned_to_id !== '') {
      whereClause += ` AND i.assigned_to_id = $${queryParams.length + 1}`;
      queryParams.push(parseInt(assigned_to_id));
    }
    
    // 构建查询SQL
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
    
    const countSql = `
      SELECT COUNT(*)
      FROM issues i
    `;
    
    // 查询总数
    const countResult = await query(countSql + whereClause, queryParams);
    const total = parseInt(countResult.rows[0].count || '0');
    
    // 构建排序和分页
    const orderBy = ' ORDER BY i.created_on DESC';
    const limitOffset = ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    const limitParams = [...queryParams, pageSize, (page - 1) * pageSize];
    
    // 查询数据
    const dataResult = await query(
      selectSql + whereClause + orderBy + limitOffset,
      limitParams
    );
    
    // 查询所有需要的目录信息
    const directoryIds = dataResult.rows.map((row: any) => row.parent_id).filter((id: any) => id && !isNaN(id));
    const directoriesMap: Record<number, any> = {};
    
    if (directoryIds.length > 0) {
      const uniqueDirectoryIds = [...new Set(directoryIds)];
      const directories = await prisma.directories.findMany({
        where: {
          id: {
            in: uniqueDirectoryIds.map(id => id.toString())
          }
        }
      });
      
      // 构建目录ID到目录信息的映射
      directories.forEach((dir: Directory) => {
        directoriesMap[parseInt(dir.id)] = dir;
      });

      // 如果有三级目录，需要查询其父目录（二级目录）信息
      const moduleIds = directories
        .filter((dir: Directory) => dir.level === 3)
        .map((dir: Directory) => dir.parent_id)
        .filter((id: string | undefined): id is string => !!id && !isNaN(parseInt(id)));

      if (moduleIds.length > 0) {
        const uniqueModuleIds = [...new Set(moduleIds)];
        const parentDirectories = await prisma.directories.findMany({
          where: {
            id: {
              in: uniqueModuleIds
            }
          }
        });

        parentDirectories.forEach((dir: Directory) => {
          directoriesMap[parseInt(dir.id)] = dir;
        });
      }
    }
    
    // 格式化数据
    const list = dataResult.rows.map((row: any) => {
      let system_module_name = '其他'; // 默认值
      
      // 根据parent_id生成系统/模块名称
      if (row.parent_id) {
        const directory = directoriesMap[row.parent_id];
        if (directory) {
          if (directory.level === 1) {
            // 二级目录（系统级别）
            system_module_name = directory.name;
          } else if (directory.level === 2) {
            // 三级目录（模块级别），需要显示系统名称 - 模块名称
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
        system_module_name,
      };
    });
    
    // 返回结果
    res.json({
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
      }
    });
  } catch (error) {
    console.error('Error getting my todo list:', error);
    res.status(500).json({
      success: false,
      error: '获取我的待办列表失败',
    });
  }
});

// 缺陷详情路由（带认证）
router.get('/:id', authMiddleware, defectController.getDefectById);

// 项目汇总统计路由（带用户数据隔离）
router.get('/statistics/overview/trend', authMiddleware, defectController.getOverviewTrend);
router.get('/statistics/overview/pie/system', authMiddleware, defectController.getOverviewSystemDistribution);
router.get('/statistics/overview/pie/priority', authMiddleware, defectController.getOverviewPriorityDistribution);

// 各系统统计路由（带用户数据隔离）
router.get('/statistics/system/:systemId/trend', authMiddleware, defectController.getSystemTrend);
router.get('/statistics/system/:systemId/pie/priority', authMiddleware, defectController.getSystemPriorityDistribution);
router.get('/statistics/system/:systemId/pie/system', authMiddleware, defectController.getSystemSystemDistribution);

// 缓存管理路由（带认证）
router.post('/cache/clear', authMiddleware, defectController.clearCache);

// 测试我的待办页面筛选条件
router.get('/test-todo', async (req, res) => {
  try {
    const todoAssignedToId = parseInt(process.env['TODO_ASSIGNED_TO_ID'] || '130');
    const todoResolvedStatusId = parseInt(process.env['TODO_RESOLVED_STATUS_ID'] || '5');
    
    const sql = `
      SELECT COUNT(*)
      FROM issues i
      WHERE ((i.assigned_to_id = ${todoAssignedToId} AND i.status_id != ${todoResolvedStatusId}) OR i.status_id = 3)
    `;
    
    const result = await query(sql, []);
    const count = parseInt(result.rows[0].count || '0');
    
    res.json({
      success: true,
      data: {
        count,
        message: `我的待办理论上应该有 ${count} 条记录`
      }
    });
  } catch (error) {
    console.error('Error testing todo filter:', error);
    res.status(500).json({
      success: false,
      error: '测试失败'
    });
  }
});

// 消息推送路由
router.post('/send-notification', async (_req, res) => {
  try {
    // 生成待办提醒消息
    const message = await serverChanService.generateTodoMessage();
    const title = `【缺陷管理】待办事项提醒 (${new Date().toLocaleTimeString('zh-CN')})`;
    
    // 发送通知
    const success = await serverChanService.sendNotification(title, message);
    
    logger.info('Notification sent manually:', { success });
    
    res.json({
      success,
      message: success ? '消息推送成功' : '消息推送失败'
    });
  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: '发送消息推送失败'
    });
  }
});

// 获取用户列表
router.get('/users/list', async (_req, res) => {
  try {
    const sql = `
      SELECT id, firstname, lastname, login
      FROM users
      WHERE status = 1
      ORDER BY lastname ASC
    `;
    
    const result = await query(sql, []);
    const users = result.rows.map((row: any) => ({
      id: row.id,
      name: row.lastname || row.firstname || row.login || `用户${row.id}`,
      login: row.login,
    }));
    
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error getting users list:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败',
    });
  }
});

// 消息推送配置路由已移至专门的notificationRoutes.ts文件

// 紧急问题跟踪导出路由（带用户数据隔离）
router.get('/urgent/export', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const admin = isAdmin(req);
    const params = {
      project_id: req.query['project_id'] as string,
      system_id: req.query['system_id'] as string,
      module_id: req.query['module_id'] as string,
      userId,
      isAdmin: admin
    };

    await urgentIssueExportService.exportToExcel(params, res);
  } catch (error) {
    logger.error('Error exporting urgent issues:', error);
    res.status(500).json({
      success: false,
      error: '导出紧急问题数据失败',
    });
  }
});

export default router;