import { PrismaClient } from '../generated/prisma';
import { TestCase } from '../types/testCase';

const prisma = new PrismaClient();

export class TestCaseService {
  /**
   * 获取测试用例列表
   */
  async getTestCases(filters?: {
    systemId?: number;
    moduleId?: number;
    scenarioId?: number;
  }): Promise<TestCase[]> {
    const where: any = {};
    
    if (filters?.systemId) where.systemId = filters.systemId;
    if (filters?.moduleId) where.moduleId = filters.moduleId;
    if (filters?.scenarioId) where.scenarioId = filters.scenarioId;

    const testCases = await prisma.testCase.findMany({
      include: {
        system: true,
        module: true,
        scenario: true,
      },
      orderBy: { createdAt: 'desc' },
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
      system: tc.system,
      module: tc.module,
      scenario: tc.scenario,
      createdAt: tc.createdAt,
      updatedAt: tc.updatedAt,
    }));
  }

  /**
   * 获取单个测试用例
   */
  async getTestCase(id: number): Promise<TestCase | null> {
    const testCase = await prisma.testCase.findUnique({
      where: { id },
      include: {
        system: true,
        module: true,
        scenario: true,
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
      system: testCase.system,
      module: testCase.module,
      scenario: testCase.scenario,
      createdAt: testCase.createdAt,
      updatedAt: testCase.updatedAt,
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
    };
    
    if (data.systemId !== undefined) createData.systemId = data.systemId;
    if (data.moduleId !== undefined) createData.moduleId = data.moduleId;
    if (data.scenarioId !== undefined) createData.scenarioId = data.scenarioId;

    const testCase = await prisma.testCase.create({
      data: createData,
      include: {
        system: true,
        module: true,
        scenario: true,
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
      system: testCase.system,
      module: testCase.module,
      scenario: testCase.scenario,
      createdAt: testCase.createdAt,
      updatedAt: testCase.updatedAt,
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

    const testCase = await prisma.testCase.update({
      where: { id },
      data: updateData,
      include: {
        system: true,
        module: true,
        scenario: true,
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
      system: testCase.system,
      module: testCase.module,
      scenario: testCase.scenario,
      createdAt: testCase.createdAt,
      updatedAt: testCase.updatedAt,
    };
  }

  /**
   * 删除测试用例
   */
  async deleteTestCase(id: number): Promise<void> {
    await prisma.testCase.delete({
      where: { id },
    });
  }

  /**
   * 获取指定ID的测试用例用于导出
   */
  async getTestCasesForExport(testCaseIds: number[]): Promise<TestCase[]> {
    const testCases = await prisma.testCase.findMany({
      where: {
        id: {
          in: testCaseIds
        }
      },
      include: {
        system: true,
        module: true,
        scenario: true,
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
      system: tc.system,
      module: tc.module,
      scenario: tc.scenario,
      createdAt: tc.createdAt,
      updatedAt: tc.updatedAt,
    }));
  }

  /**
   * 从测试助手保存测试用例
   */
  async saveFromTestAssistant(
    scenarioId: number,
    testCases: Array<{
      title: string;
      preconditions: string;
      steps: string;
      expectedResult: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      tags?: string[];
    }>
  ): Promise<TestCase[]> {
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: {
        module: true,
      },
    });

    if (!scenario) {
      throw new Error('场景不存在');
    }

    const createdTestCases = await Promise.all(
      testCases.map(tc =>
        this.createTestCase({
          ...tc,
          systemId: scenario.module.systemId,
          moduleId: scenario.moduleId,
          scenarioId: scenarioId,
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
  }): Promise<{
    testCases: TestCase[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    // 构建where条件
    const where: any = {};
    
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
    const total = await prisma.testCase.count({ where });

    // 获取分页数据
    const testCases = await prisma.testCase.findMany({
      where,
      include: {
        system: true,
        module: true,
        scenario: true,
      },
      orderBy: { createdAt: 'desc' },
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
      system: tc.system,
      module: tc.module,
      scenario: tc.scenario,
      createdAt: tc.createdAt,
      updatedAt: tc.updatedAt,
    }));

    return {
      testCases: formattedTestCases,
      total,
      page,
      limit,
    };
  }
}