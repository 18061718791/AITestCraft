import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export interface SystemTreeData {
  systems: Array<{
    id: number;
    name: string;
    modules: Array<{
      id: number;
      name: string;
      systemId: number;
      scenarios: Array<{
        id: number;
        name: string;
        moduleId: number;
      }>;
    }>;
  }>;
}

export class SystemService {
  /**
   * 获取项目管理的完整树形层级数据
   * @returns Promise<SystemTreeData> 系统-模块-场景的完整层级数据
   */
  async getSystemHierarchy(): Promise<SystemTreeData> {
    try {
      // 获取所有系统及其关联的模块和场景
      const systems = await prisma.systems.findMany({
        include: {
          modules: {
            include: {
              scenarios: {
                select: {
                  id: true,
                  name: true,
                  module_id: true
                }
              }
            }
          }
        }
      });

      return {
        systems: systems.map((system: any) => ({
          id: system.id,
          name: system.name,
          modules: system.modules.map((module: any) => ({
            id: module.id,
            name: module.name,
            systemId: module.system_id,
            scenarios: module.scenarios.map((scenario: any) => ({
              id: scenario.id,
              name: scenario.name,
              moduleId: scenario.module_id
            }))
          }))
        }))
      };
    } catch (error) {
      console.error('获取项目层级数据失败:', error);
      throw new Error('无法获取项目管理数据，请检查系统配置');
    }
  }

  /**
   * 获取项目名称列表（用于Excel下拉）
   * @returns Promise<string[]> 项目名称数组
   */
  async getSystemNames(): Promise<string[]> {
    try {
      const systems = await prisma.systems.findMany({
        select: {
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      return systems.map((system: any) => system.name);
    } catch (error) {
      console.error('获取系统名称列表失败:', error);
      return [];
    }
  }

  /**
   * 获取指定系统的模块名称列表
   * @param systemName 系统名称
   * @returns Promise<string[]> 模块名称数组
   */
  async getModuleNamesBySystem(systemName: string): Promise<string[]> {
    try {
      const modules = await prisma.modules.findMany({
        where: {
          systems: {
            name: systemName
          }
        },
        select: { name: true },
        orderBy: { name: 'asc' }
      });
      
      return modules.map((module: any) => module.name);
    } catch (error) {
      console.error(`获取系统 ${systemName} 的模块列表失败:`, error);
      return [];
    }
  }

  /**
   * 获取指定模块的场景名称列表
   * @param systemName 系统名称
   * @param moduleName 模块名称
   * @returns Promise<string[]> 场景名称数组
   */
  async getScenarioNamesByModule(systemName: string, moduleName: string): Promise<string[]> {
    try {
      const scenarios = await prisma.scenarios.findMany({
        where: {
          modules: {
            name: moduleName,
            systems: {
              name: systemName
            }
          }
        },
        select: { name: true },
        orderBy: { name: 'asc' }
      });

      return scenarios.map((scenario: any) => scenario.name);
    } catch (error) {
      console.error(`获取模块 ${moduleName} 的场景列表失败:`, error);
      return [];
    }
  }
}

export const systemService = new SystemService();