import { prisma } from '../utils/prisma';
import { TestCase } from '../types/testCase';
import DateFormatter from '../utils/dateFormatter';

export class TestCaseService {
  /**
   * 获取测试用例列表（带用户数据隔离）
   */
  async getTestCases(filters?: {
    systemId?: number;
    moduleId?: number;
    scenarioId?: number;
    userId?: number | undefined;
    isAdmin?: boolean;
  }): Promise<TestCase[]> {
    const where: any = {};

    if (filters?.systemId) where.systemId = filters.systemId;
    if (filters?.moduleId) where.moduleId = filters.moduleId;
    if (filters?.scenarioId) where.scenarioId = filters.scenarioId;

    // 用户数据隔离：非管理员只能查看自己创建的系统下的用例
    if (!filters?.isAdmin && filters?.userId) {
      // 首先获取用户创建的所有系统ID
      const userSystems = await prisma.systems.findMany({
        where: { created_by: filters.userId },
        select: { id: true }
      });
      const userSystemIds = userSystems.map(s => s.id);
      
      // 只查询这些系统下的用例
      if (userSystemIds.length === 0) {
        return []; // 用户没有创建任何系统，返回空
      }
      where.systemId = { in: userSystemIds };
    }

    const testCases = await prisma.test_cases.findMany({
      where,
      include: {
        systems: true,
        modules: true,
        scenarios: true,
      },
      orderBy: { created_at: 'desc' },
    }) as any[];

    return testCases.map(tc => ({
      id: tc.id,
      title: tc.title,
      preconditions: tc.precondition || '',
      steps: tc.steps,
      expectedResult: tc.expectedResults,
      actualResult: tc.actualResult || '',
      status: tc.status || 'PENDING',
      priority: tc.priority || 'MEDIUM',
      tags: tc.tags || [],
      systemId: tc.systemId,
      moduleId: tc.moduleId,
      scenarioId: tc.scenarioId,
      system: tc.systems,
      module: tc.modules,
      scenario: tc.scenarios,
      createdAt: DateFormatter.formatDateTimeFromString(tc.created_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
      updatedAt: DateFormatter.formatDateTimeFromString(tc.updated_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
    }));
  }

  /**
   * 获取单个测试用例
   */
  async getTestCase(id: number): Promise<TestCase | null> {
    const testCase = await prisma.test_cases.findUnique({
      where: { id },
      include: {
        systems: true,
        modules: true,
        scenarios: true,
      },
    }) as any;

    if (!testCase) return null;

    return {
      id: testCase.id,
      title: testCase.title,
      preconditions: testCase.precondition || '',
      steps: testCase.steps,
      expectedResult: testCase.expectedResults,
      actualResult: testCase.actualResult || '',
      status: testCase.status || 'PENDING',
      priority: testCase.priority || 'MEDIUM',
      tags: testCase.tags || [],
      systemId: testCase.systemId,
      moduleId: testCase.moduleId,
      scenarioId: testCase.scenarioId,
      system: testCase.systems,
      module: testCase.modules,
      scenario: testCase.scenarios,
      createdAt: DateFormatter.formatDateTimeFromString(testCase.created_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
      updatedAt: DateFormatter.formatDateTimeFromString(testCase.updated_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
    };
  }

  /**
   * 创建测试用例
   */
  async createTestCase(data: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    const createData: any = {
      title: data.title,
      precondition: data.preconditions,
      steps: data.steps,
      expectedResults: data.expectedResult,
      priority: data.priority || 'MEDIUM',
      source: 'manual',
      status: data.status || 'PENDING',
      tags: data.tags || [],
      updated_at: new Date(),
    };
    
    if (data.systemId !== undefined) createData.systemId = data.systemId;
    if (data.moduleId !== undefined) createData.moduleId = data.moduleId;
    if (data.scenarioId !== undefined) createData.scenarioId = data.scenarioId;

    const testCase = await prisma.test_cases.create({
      data: createData,
      include: {
        systems: true,
        modules: true,
        scenarios: true,
      },
    }) as any;

    return {
      id: testCase.id,
      title: testCase.title,
      preconditions: testCase.precondition || '',
      steps: testCase.steps,
      expectedResult: testCase.expectedResults,
      actualResult: testCase.actualResult || '',
      status: testCase.status || 'PENDING',
      priority: testCase.priority || 'MEDIUM',
      tags: testCase.tags || [],
      systemId: testCase.systemId,
      moduleId: testCase.moduleId,
      scenarioId: testCase.scenarioId,
      system: testCase.systems,
      module: testCase.modules,
      scenario: testCase.scenarios,
      createdAt: DateFormatter.formatDateTimeFromString(testCase.created_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
      updatedAt: DateFormatter.formatDateTimeFromString(testCase.updated_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
    };
  }

  /**
   * 更新测试用例
   */
  async updateTestCase(id: number, data: Partial<Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TestCase> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.preconditions !== undefined) updateData.precondition = data.preconditions;
    if (data.steps !== undefined) updateData.steps = data.steps;
    if (data.expectedResult !== undefined) updateData.expectedResults = data.expectedResult;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.systemId !== undefined) updateData.systemId = data.systemId;
    if (data.moduleId !== undefined) updateData.moduleId = data.moduleId;
    if (data.scenarioId !== undefined) updateData.scenarioId = data.scenarioId;

    const testCase = await prisma.test_cases.update({
      where: { id },
      data: updateData,
      include: {
        systems: true,
        modules: true,
        scenarios: true,
      },
    }) as any;

    return {
      id: testCase.id,
      title: testCase.title,
      preconditions: testCase.precondition || '',
      steps: testCase.steps,
      expectedResult: testCase.expectedResults,
      actualResult: testCase.actualResult || '',
      status: testCase.status || 'PENDING',
      priority: testCase.priority || 'MEDIUM',
      tags: testCase.tags || [],
      systemId: testCase.systemId,
      moduleId: testCase.moduleId,
      scenarioId: testCase.scenarioId,
      system: testCase.systems,
      module: testCase.modules,
      scenario: testCase.scenarios,
      createdAt: DateFormatter.formatDateTimeFromString(testCase.created_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
      updatedAt: DateFormatter.formatDateTimeFromString(testCase.updated_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
    };
  }

  /**
   * 删除测试用例
   */
  async deleteTestCase(id: number): Promise<void> {
    await prisma.test_cases.delete({
      where: { id },
    });
  }

  /**
   * 获取指定ID的测试用例用于导出
   */
  async getTestCasesForExport(testCaseIds: number[]): Promise<TestCase[]> {
    const testCases = await prisma.test_cases.findMany({
      where: {
        id: {
          in: testCaseIds
        }
      },
      include: {
        systems: true,
        modules: true,
        scenarios: true,
      },
      orderBy: { id: 'asc' },
    }) as any[];

    return testCases.map(tc => ({
      id: tc.id,
      title: tc.title,
      preconditions: tc.precondition || '',
      steps: tc.steps,
      expectedResult: tc.expectedResults,
      actualResult: tc.actualResult || '',
      status: tc.status || 'PENDING',
      priority: tc.priority || 'MEDIUM',
      tags: tc.tags || [],
      systemId: tc.systemId,
      moduleId: tc.moduleId,
      scenarioId: tc.scenarioId,
      system: tc.systems,
      module: tc.modules,
      scenario: tc.scenarios,
      createdAt: DateFormatter.formatDateTimeFromString(tc.created_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
      updatedAt: DateFormatter.formatDateTimeFromString(tc.updated_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
    }));
  }

  /**
   * 格式化测试步骤，添加序号并清理空格
   */
  private formatTestSteps(steps: string): string {
    if (!steps || typeof steps !== 'string') {
      return steps;
    }

    return steps
      .split('\n')
      .map(step => step.trim())
      .filter(step => step.length > 0)
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n');
  }

  /**
   * 格式化预期结果，添加序号并清理空格
   */
  private formatExpectedResults(expectedResults: string): string {
    if (!expectedResults || typeof expectedResults !== 'string') {
      return expectedResults;
    }

    return expectedResults
      .split('\n')
      .map(result => result.trim())
      .filter(result => result.length > 0)
      .map((result, index) => `${index + 1}. ${result}`)
      .join('\n');
  }

  /**
   * 从测试助手保存测试用例
   */
  async saveFromTestAssistant(
    scenarioId?: number,
    moduleId?: number,
    systemId?: number,
    testCases: Array<{
      title: string;
      preconditions: string;
      steps: string;
      expectedResult: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      tags?: string[];
    }> = []
  ): Promise<TestCase[]> {
    let actualSystemId: number;
    let actualModuleId: number | null;
    let actualScenarioId: number | null;

    if (scenarioId) {
      // 如果提供了场景ID，使用场景对应的系统、模块和场景
      const scenario = await prisma.scenarios.findUnique({
        where: { id: scenarioId },
        include: {
          modules: true,
        },
      });

      if (!scenario) {
        throw new Error('场景不存在');
      }

      actualSystemId = scenario.modules.system_id;
      actualModuleId = scenario.modules.id;
      actualScenarioId = scenarioId;
    } else if (moduleId) {
      // 如果提供了模块ID，使用模块对应的系统，不设置场景
      const module = await prisma.modules.findUnique({
        where: { id: moduleId },
        include: {
          systems: true,
        },
      });

      if (!module) {
        throw new Error('模块不存在');
      }

      actualSystemId = module.system_id;
      actualModuleId = module.id;
      actualScenarioId = null; // 不设置场景ID
    } else if (systemId) {
      // 如果只提供了系统ID，只设置系统ID
      const system = await prisma.systems.findUnique({
        where: { id: systemId },
      });

      if (!system) {
        throw new Error('系统不存在');
      }

      actualSystemId = system.id;
      actualModuleId = null; // 不设置模块ID
      actualScenarioId = null; // 不设置场景ID
    } else {
      throw new Error('必须提供场景ID、模块ID或系统ID中的至少一个');
    }

    const createdTestCases = await Promise.all(
      testCases.map(tc =>
        this.createTestCase({
          ...tc,
          steps: this.formatTestSteps(tc.steps),
          expectedResult: this.formatExpectedResults(tc.expectedResult),
          systemId: actualSystemId,
          moduleId: actualModuleId,
          scenarioId: actualScenarioId,
          status: 'PENDING',
          priority: tc.priority || 'MEDIUM',
          tags: tc.tags || [],
        })
      )
    );

    return createdTestCases;
  }

  /**
   * 按层级获取测试用例（支持分页）
   */
  async getTestCasesByHierarchy(params: {
    systemId?: number;
    moduleId?: number;
    scenarioId?: number;
    page?: number;
    limit?: number;
    userId?: number;
    isAdmin?: boolean;
  }): Promise<{
    testCases: TestCase[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, userId, isAdmin } = params;
    const skip = (page - 1) * limit;

    // 构建where条件
    const where: any = {};
    
    // 用户数据隔离：非管理员只能查看自己创建的系统下的用例
    if (!isAdmin && userId) {
      // 首先获取用户创建的所有系统ID
      const userSystems = await prisma.systems.findMany({
        where: { created_by: userId },
        select: { id: true }
      });
      const userSystemIds = userSystems.map(s => s.id);
      
      // 只查询这些系统下的用例
      if (userSystemIds.length === 0) {
        return {
          testCases: [],
          total: 0,
          page,
          limit
        };
      }
      where.systemId = { in: userSystemIds };
    }
    
    if (params.scenarioId) {
      // 场景级：精确匹配场景ID
      where.scenarioId = params.scenarioId;
    } else if (params.moduleId) {
      // 模块级：匹配该模块下的所有场景
      where.moduleId = params.moduleId;
    } else if (params.systemId) {
      // 系统级：匹配该系统下的所有模块和场景
      where.systemId = params.systemId;
    }

    // 获取总数
    const total = await prisma.test_cases.count({ where });

    // 获取分页数据
    const testCases = await prisma.test_cases.findMany({
      where,
      include: {
        systems: true,
        modules: true,
        scenarios: true,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }) as any[];

    const formattedTestCases = testCases.map(tc => ({
      id: tc.id,
      title: tc.title,
      preconditions: tc.precondition || '',
      steps: tc.steps,
      expectedResult: tc.expectedResults,
      actualResult: tc.actualResult || '',
      status: tc.status || 'PENDING',
      priority: tc.priority || 'MEDIUM',
      tags: tc.tags || [],
      systemId: tc.systemId,
      moduleId: tc.moduleId,
      scenarioId: tc.scenarioId,
      system: tc.systems,
      module: tc.modules,
      scenario: tc.scenarios,
      createdAt: DateFormatter.formatDateTimeFromString(tc.created_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
      updatedAt: DateFormatter.formatDateTimeFromString(tc.updated_at),  // 格式化为 yyyy-mm-dd hh:mm:ss
    }));

    return {
      testCases: formattedTestCases,
      total,
      page,
      limit,
    };
  }
}