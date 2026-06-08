const { prisma } = require('./src/utils/prisma');

async function check() {
  try {
    // 查询所有应用配置
    const apps = await prisma.app_configs.findMany({
      select: {
        id: true,
        app_name: true,
        created_by: true
      }
    });

    console.log('数据库中的应用配置:');
    apps.forEach(app => {
      console.log(`  ID: ${app.id}, 名称: ${app.app_name}, 创建者: ${app.created_by}`);
    });

    // 查询testuser的ID
    const user = await prisma.users.findUnique({
      where: { username: 'testuser' },
      select: { id: true, username: true }
    });
    console.log('\n当前用户:', user);

  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
