import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

interface DeleteResult {
  deleted: number;
  failed: number;
  errors: DeleteError[];
}

interface DeleteError {
  id: number;
  message: string;
}

export class BatchDeleteService {
  /**
   * 批量删除测试用例
   */
  async deleteTestCases(ids: number[]): Promise<DeleteResult> {
    const result: DeleteResult = {
      deleted: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 验证ID列表
      const validIds = ids.filter(id => !isNaN(id) && id > 0);
      if (validIds.length === 0) {
        throw new Error('无效的ID列表');
      }

      // 检查用例是否存在
      const existingCases = await prisma.testCase.findMany({
        where: { id: { in: validIds } },
        select: { id: true, title: true },
      });

      const existingIds = existingCases.map((c: { id: number }) => c.id);
      const missingIds = validIds.filter(id => !existingIds.includes(id));

      // 记录不存在的ID
      missingIds.forEach(id => {
        result.errors.push({
          id,
          message: '测试用例不存在',
        });
        result.failed++;
      });

      if (existingIds.length === 0) {
        return result;
      }

      // 检查是否有依赖关系（如果有其他表引用）
      const hasDependencies = await this.checkDependencies(existingIds);
      if (hasDependencies.length > 0) {
        hasDependencies.forEach(dep => {
          result.errors.push(dep);
          result.failed++;
        });
      }

      // 执行删除
      const deletableIds = existingIds.filter((id: number) => 
        !hasDependencies.some(dep => dep.id === id)
      );

      if (deletableIds.length > 0) {
        const deleteResult = await prisma.$transaction(async (tx: any) => {
          // 执行删除 - 简化事务处理，移除operationLog依赖
          const result = await tx.testCase.deleteMany({
            where: { id: { in: deletableIds } },
          });

          return result;
        });

        result.deleted = deleteResult.count;
      }

      return result;
    } catch (error) {
      console.error('批量删除测试用例失败:', error);
      throw error;
    }
  }

  /**
   * 检查依赖关系
   */
  private async checkDependencies(_ids: number[]): Promise<DeleteError[]> {
    const errors: DeleteError[] = [];

    // TODO: 实现依赖关系检查
    // 由于当前schema中没有TestExecution模型，暂时返回空数组
    // 后续需要完善测试执行记录功能
    return errors;
  }

  /**
   * 验证用户权限
   */
  async validateUserPermission(_userId: number, _testCaseIds: number[]): Promise<boolean> {
    try {
      // TODO: 实现用户权限验证逻辑
      // 由于当前schema中没有User模型和createdBy字段，暂时返回true
      // 后续需要完善用户系统和权限管理
      return true;
    } catch (error) {
      console.error('验证用户权限失败:', error);
      return false;
    }
  }

  /**
   * 获取可删除的用例列表
   */
  async getDeletableTestCases(testCaseIds: number[]): Promise<{
    deletable: number[];
    notDeletable: Array<{ id: number; reason: string }>;
  }> {
    const result = {
      deletable: [] as number[],
      notDeletable: [] as Array<{ id: number; reason: string }>,
    };

    const existingCases = await prisma.testCase.findMany({
      where: { id: { in: testCaseIds } },
      select: { id: true, title: true },
    });

    const existingIds = existingCases.map((c: { id: number }) => c.id);
    const missingIds = testCaseIds.filter(id => !existingIds.includes(id));

    missingIds.forEach(id => {
      result.notDeletable.push({
        id,
        reason: '测试用例不存在',
      });
    });

    if (existingIds.length === 0) {
      return result;
    }

    // 检查依赖关系
    const dependencies = await this.checkDependencies(existingIds);
    const dependencyIds = new Set(dependencies.map(d => d.id));

    existingIds.forEach((id: number) => {
      if (dependencyIds.has(id)) {
        const dep = dependencies.find(d => d.id === id);
        result.notDeletable.push({
          id,
          reason: dep?.message || '存在依赖关系',
        });
      } else {
        result.deletable.push(id);
      }
    });

    return result;
  }
}