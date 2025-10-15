const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestCases() {
  try {
    const testCases = await prisma.test_cases.findMany({
      take: 5,
      select: { id: true, title: true, created_at: true, updated_at: true }
    });
    
    console.log('测试用例数据:');
    testCases.forEach((tc, index) => {
      console.log('用例' + (index + 1) + ':');
      console.log('  ID: ' + tc.id);
      console.log('  标题: ' + tc.title);
      console.log('  创建时间: ' + tc.created_at);
      console.log('  创建时间类型: ' + typeof tc.created_at);
      console.log('  更新时间: ' + tc.updated_at);
      console.log('  更新时间类型: ' + typeof tc.updated_at);
      
      // 尝试转换为Date对象
      const date = new Date(tc.created_at);
      console.log('  Date对象是否有效: ' + !isNaN(date.getTime()));
      console.log('  Date对象值: ' + date);
      console.log('');
    });
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestCases();