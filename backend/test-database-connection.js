// 测试数据库连接
const { PrismaClient } = require('./src/generated/prisma');
const { query } = require('./dist/utils/database');

async function testMySQLConnection() {
  console.log('开始测试MySQL数据库连接...');
  
  try {
    const prisma = new PrismaClient();
    
    // 测试MySQL连接
    const systems = await prisma.systems.findMany({ take: 5 });
    console.log('MySQL连接成功！获取到系统数量:', systems.length);
    
    // 关闭Prisma连接
    await prisma.$disconnect();
    
    return true;
  } catch (error) {
    console.error('MySQL连接失败:', error);
    return false;
  }
}

async function testPostgreSQLConnection() {
  console.log('开始测试PostgreSQL数据库连接...');
  
  try {
    // 测试PostgreSQL连接
    const result = await query('SELECT 1 as test');
    console.log('PostgreSQL连接成功！测试结果:', result.rows[0]);
    
    return true;
  } catch (error) {
    console.error('PostgreSQL连接失败:', error);
    return false;
  }
}

async function testAllConnections() {
  console.log('=== 数据库连接测试 ===\n');
  
  const mysqlSuccess = await testMySQLConnection();
  const pgSuccess = await testPostgreSQLConnection();
  
  console.log('\n=== 测试结果 ===');
  console.log('MySQL连接:', mysqlSuccess ? '✅ 成功' : '❌ 失败');
  console.log('PostgreSQL连接:', pgSuccess ? '✅ 成功' : '❌ 失败');
  
  if (mysqlSuccess && pgSuccess) {
    console.log('\n🎉 所有数据库连接测试通过！');
  } else {
    console.log('\n⚠️  部分数据库连接测试失败，请检查配置。');
  }
}

// 运行测试
testAllConnections();