const { PrismaClient } = require('./dist/generated/prisma');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('正在连接数据库...');
    
    // 测试连接
    await prisma.$connect();
    console.log('数据库连接成功！');
    
    // 检查数据库名称
    const result = await prisma.$queryRaw`SELECT DATABASE() as db_name`;
    console.log('当前数据库:', result[0].db_name);
    
    // 检查表是否存在
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    console.log('数据库中的表:', tables.map(t => t.TABLE_NAME));
    
    // 检查是否有数据
    const systemCount = await prisma.systems.count();
    console.log('系统表记录数:', systemCount);
    
  } catch (error) {
    console.error('数据库连接错误:', error.message);
    if (error.code) {
      console.error('错误代码:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();