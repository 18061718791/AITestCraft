import { PrismaClient } from '../generated/prisma';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface DeletionCheckResult {
  canDelete: boolean;
  childCount: number;
  childType: string;
  message: string;
}

export class DeletionCheckService {
  /**
   * 检查系统是否可以被删除
   * @param systemId 系统ID
   * @returns 删除检查结果
   */
  async checkSystemDeletion(systemId: number): Promise<DeletionCheckResult> {
    try {
      const moduleCount = await prisma.module.count({
        where: {
          systemId: systemId
        }
      });

      if (moduleCount > 0) {
        return {
          canDelete: false,
          childCount: moduleCount,
          childType: 'modules',
          message: `无法删除系统：该系统包含${moduleCount}个模块，请先删除所有模块后再尝试删除系统`
        };
      }

      return {
        canDelete: true,
        childCount: 0,
        childType: 'modules',
        message: '系统可以删除'
      };
    } catch (error) {
      logger.error('检查系统删除失败:', error);
      throw new Error('删除检查失败');
    }
  }

  /**
   * 检查模块是否可以被删除
   * @param moduleId 模块ID
   * @returns 删除检查结果
   */
  async checkModuleDeletion(moduleId: number): Promise<DeletionCheckResult> {
    try {
      const scenarioCount = await prisma.scenario.count({
        where: {
          moduleId: moduleId
        }
      });

      if (scenarioCount > 0) {
        return {
          canDelete: false,
          childCount: scenarioCount,
          childType: 'scenarios',
          message: `无法删除模块：该模块包含${scenarioCount}个场景，请先删除所有场景后再尝试删除模块`
        };
      }

      return {
        canDelete: true,
        childCount: 0,
        childType: 'scenarios',
        message: '模块可以删除'
      };
    } catch (error) {
      logger.error('检查模块删除失败:', error);
      throw new Error('删除检查失败');
    }
  }
}

export const deletionCheckService = new DeletionCheckService();