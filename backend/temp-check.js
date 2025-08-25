const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function checkAndSeed() {
  try {
    // 检查表是否存在
    const tables = await prisma.$queryRaw`SHOW TABLES;`;
    console.log('现有表:', tables);
    
    // 检查scenarios表
    try {
      const count = await prisma.scenario.count();
      console.log('scenarios表记录数:', count);
    } catch (error) {
      console.log('scenarios表可能不存在:', error.message);
    }
    
    // 运行种子数据
    console.log('开始初始化数据...');
    
    // 创建系统
    const system1 = await prisma.system.create({
      data: {
        name: '测试管理系统',
        description: '用于管理测试用例和测试计划的系统',
      },
    });

    const system2 = await prisma.system.create({
      data: {
        name: '自动化测试平台',
        description: '支持自动化测试执行和结果分析的平台',
      },
    });

    // 创建模块
    const module1 = await prisma.module.create({
      data: {
        name: '测试用例管理',
        description: '管理测试用例的创建、编辑和组织',
        systemId: system1.id,
        sortOrder: 1,
      },
    });

    const module2 = await prisma.module.create({
      data: {
        name: '测试计划管理',
        description: '制定和管理测试计划',
        systemId: system1.id,
        sortOrder: 2,
      },
    });

    const module3 = await prisma.module.create({
      data: {
        name: '测试执行',
        description: '执行自动化测试脚本',
        systemId: system2.id,
        sortOrder: 1,
      },
    });

    // 创建场景
    const scenarios = await prisma.scenario.createMany({
      data: [
        {
          name: '创建测试用例',
          description: '创建新的测试用例',
          content: '用户可以通过表单创建测试用例，包括标题、描述、步骤等信息',
          moduleId: module1.id,
          sortOrder: 1,
        },
        {
          name: '编辑测试用例',
          description: '编辑现有测试用例',
          content: '用户可以修改测试用例的各个字段',
          moduleId: module1.id,
          sortOrder: 2,
        },
        {
          name: '组织测试用例',
          description: '通过标签和分组组织测试用例',
          content: '支持标签分类和自定义分组',
          moduleId: module1.id,
          sortOrder: 3,
        },
        {
          name: '制定测试计划',
          description: '创建测试计划并关联测试用例',
          content: '选择测试用例组成测试计划，设置执行时间',
          moduleId: module2.id,
          sortOrder: 1,
        },
        {
          name: '执行测试脚本',
          description: '运行自动化测试脚本',
          content: '选择测试脚本并执行，查看实时日志',
          moduleId: module3.id,
          sortOrder: 1,
        },
      ],
    });

    console.log(`成功插入 ${scenarios.count} 条场景数据`);
    
    // 验证数据
    const allScenarios = await prisma.scenario.findMany({
      include: {
        module: {
          include: {
            system: true
          }
        }
      }
    });
    
    console.log('所有场景数据:', JSON.stringify(allScenarios, null, 2));
    
  } catch (error) {
    console.error('执行出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed();