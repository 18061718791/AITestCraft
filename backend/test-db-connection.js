const { PrismaClient } = require('./src/generated/prisma');

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  const prisma = new PrismaClient();
  
  try {
    // 测试连接
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // 测试获取测试用例
    const testCases = await prisma.test_cases.findMany({
      take: 5,
      include: {
        systems: true,
        modules: true,
        scenarios: true,
      },
    });
    
    console.log(`✅ Found ${testCases.length} test cases`);
    if (testCases.length > 0) {
      console.log('First test case:', testCases[0].title);
    }
    
    // 测试获取系统列表
    const systems = await prisma.systems.findMany();
    console.log(`✅ Found ${systems.length} systems`);
    if (systems.length > 0) {
      console.log('First system:', systems[0].name);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed');
  }
}

testDatabaseConnection();