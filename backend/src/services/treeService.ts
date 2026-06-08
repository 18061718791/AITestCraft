import { query } from '../utils/database';
import { DefectTreeNode } from '../types/defect';
import logger from '../utils/logger';
import { prisma } from '../utils/prisma';

class TreeService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = parseInt(process.env['TREE_CACHE_TTL'] || '600000'); // 10分钟

  // 构建目录树结构（带用户数据隔离）
  async buildTree(userId?: number, isAdmin?: boolean): Promise<DefectTreeNode> {
    const cacheKey = userId ? `defect_tree_${userId}` : 'defect_tree';

    // 检查缓存（只有管理员使用全局缓存，普通用户使用用户专属缓存）
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug('Directory tree loaded from cache');
      return cached.data;
    }

    try {
      // 从项目管理中动态获取所有项目和目录结构
      const projects = await prisma.projects.findMany({
        where: isAdmin ? {} : { created_by: userId ?? null }
      });
      const directories = await prisma.directories.findMany({
        where: isAdmin ? {} : {
          project: { created_by: userId ?? null }
        },
        orderBy: [
          { level: 'asc' },
          { id: 'asc' }
        ]
      });

      // 构建目录树
      const tree = this.convertToTree(projects, directories);
      
      // 计算每个目录的问题数量
      const treeWithCounts = await this.calculateIssueCounts(tree);
      
      // 更新缓存（普通用户使用用户专属缓存）
      if (!isAdmin && userId) {
        this.cache.set(cacheKey, {
          data: treeWithCounts,
          timestamp: Date.now(),
        });
      } else if (isAdmin) {
        this.cache.set('defect_tree', {
          data: treeWithCounts,
          timestamp: Date.now(),
        });
      }
      
      logger.info('Directory tree built successfully from project management data');
      return treeWithCounts;
    } catch (error) {
      logger.error('Error building directory tree', error);
      throw error;
    }
  }

  // 将平面目录结构转换为树结构
  private convertToTree(projects: any[], directories: any[]): DefectTreeNode {
    // 创建根节点
    const root: DefectTreeNode = {
      id: 0,
      name: '项目管理',
      children: []
    };

    // 创建目录映射，方便查找
    const directoryMap: { [key: string]: DefectTreeNode } = {};
    
    // 首先添加所有项目（level=0）作为根节点的子节点
    projects.forEach(project => {
      const projectNode: DefectTreeNode = {
        id: parseInt(project.id),
        name: project.name,
        children: []
      };
      directoryMap[project.id] = projectNode;
      root.children?.push(projectNode);
    });

    // 遍历所有目录，根据level字段构建树结构
    directories.forEach(dir => {
      const directoryNode: DefectTreeNode = {
        id: parseInt(dir.id),
        name: dir.name,
        children: []
      };

      directoryMap[dir.id] = directoryNode;

      // 根据level字段确定父节点关系
      const level = dir.level;
      const parentId = dir.parent_id;

      if (level === 1) {
        // level=1：二级目录（系统级别），parent_id是项目ID
        if (directoryMap[parentId]) {
          directoryMap[parentId].children?.push(directoryNode);
        }
      } else if (level === 2) {
        // level=2：三级目录（模块级别），parent_id是二级目录ID
        if (directoryMap[parentId]) {
          directoryMap[parentId].children?.push(directoryNode);
        }
      }
    });

    return root;
  }

  // 计算目录的问题数量
  private async calculateIssueCounts(node: DefectTreeNode): Promise<DefectTreeNode> {
    // 不为根节点（项目管理）计算问题数量，根据用户要求去除项目管理后面的数据统计内容
    if (node.id !== 0) {
      // 计算当前节点的问题数量
      node.issueCount = await this.getIssueCountForDirectory(node.id);
    }
    
    // 递归计算子节点的问题数量
    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
          if (node.children[i]) {
            node.children[i] = await this.calculateIssueCounts(node.children[i] as DefectTreeNode);
          }
        }
    }
    
    return node;
  }

  // 获取目录下的问题数量
  private async getIssueCountForDirectory(directoryId: number): Promise<number> {
    try {
      // 递归获取所有子目录ID（包括子目录的子目录）
      const getAllChildDirectoryIds = async (parentId: number): Promise<number[]> => {
        const childDirectories = await prisma.directories.findMany({
          where: {
            parent_id: parentId.toString()
          }
        });
        
        let allChildIds: number[] = [];
        
        for (const dir of childDirectories) {
          const dirId = parseInt(dir.id);
          allChildIds.push(dirId);
          // 递归获取子目录的子目录
          const grandChildIds = await getAllChildDirectoryIds(dirId);
          allChildIds = [...allChildIds, ...grandChildIds];
        }
        
        return allChildIds;
      };
      
      // 获取所有子目录ID
      const allChildIds = await getAllChildDirectoryIds(directoryId);
      
      // 构建查询SQL
      let sql = `
        SELECT COUNT(*)
        FROM issues
      `;
      
      // 构建查询条件
      if (allChildIds.length > 0) {
        // 有子目录，查询所有子目录（包括递归子目录）的数据
        sql += ` WHERE parent_id IN (${allChildIds.join(', ')})`;
      } else {
        // 没有子目录，查询直接子节点的数据
        sql += ` WHERE parent_id = ${directoryId}`;
      }
      
      // 获取所有目录ID，用于排除目录ID对应的记录
      const allDirectories = await prisma.directories.findMany();
      const allDirectoryIds = allDirectories.map(dir => parseInt(dir.id));
      
      // 过滤掉目录ID对应的记录
      if (allDirectoryIds.length > 0) {
        const directoryIdsString = allDirectoryIds.map(id => `'${id}'`).join(', ');
        if (allChildIds.length > 0 || directoryId !== 0) {
          sql += ` AND id::text NOT IN (${directoryIdsString})`;
        } else {
          sql += ` WHERE id::text NOT IN (${directoryIdsString})`;
        }
      }
      
      const result = await query(sql);
      return parseInt(result.rows[0].count || '0');
    } catch (error) {
      logger.error('Error calculating issue count', { directoryId, error });
      return 0;
    }
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
    logger.info('Directory tree cache cleared');
  }
}

export default new TreeService();