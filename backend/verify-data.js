const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function verifyData() {
  try {
    console.log('=== 数据库验证报告 ===');
    
    // 检查所有表
    const tables = await prisma.$queryRaw`SHOW TABLES;`;
    console.log('1. 数据库表列表:', tables.map(t => Object.values(t)[0]));
    
    // 检查scenarios表记录
    const scenarioCount = await prisma.scenario.count();
    console.log('2. scenarios表记录数:', scenarioCount);
    
    // 检查详细数据
    const scenarios = await prisma.scenario.findMany({
      include: {
        module: {
          include: {
            system: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    
    console.log('3. 场景数据详情:');
    scenarios.forEach((scenario, index) => {
      console.log(`  ${index + 1}. ${scenario.name} (ID: ${scenario.id})`);
      console.log(`     模块: ${scenario.module.name}`);
      console.log(`     系统: ${scenario.module.system.name}`);
      console.log(`     描述: ${scenario.description}`);
      console.log('');
    });
    
    // 检查系统数据
    const systemCount = await prisma.system.count();
    const moduleCount = await prisma.module.count();
    console.log('4. 关联数据:');
    console.log(`   - 系统数量: ${systemCount}`);
    console.log(`   - 模块数量: ${moduleCount}`);
    console.log(`   - 场景数量: ${scenarioCount}`);
    
    // 验证完整性
    if (scenarioCount === 5) {
      console.log('✅ 数据验证通过：成功插入5条测试场景数据');
    } else {
      console.log('❌ 数据验证失败：期望5条场景数据，实际' + scenarioCount + '条');
    }
    
  } catch (error) {
    console.error('验证出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();