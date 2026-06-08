const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function checkProjectData() {
  try {
    console.log('========== 检查智能物联项目数据 ==========\n');
    
    // 1. 检查项目2980
    const project = await prisma.projects.findUnique({
      where: { id: '2980' }
    });
    console.log('1. 项目2980(智能物联):', project);
    
    if (!project) {
      console.log('❌ 项目2980不存在！');
      return;
    }
    
    // 2. 检查项目2980下的所有目录
    const directories = await prisma.$queryRaw`
      SELECT uuid, id, name, project_id, parent_id, level
      FROM directories
      WHERE project_id = ${'2980'}
      ORDER BY level, name
    `;
    
    console.log('\n2. 项目2980下的所有目录:');
    directories.forEach(dir => {
      console.log(`   ID:${dir.id}, name:${dir.name}, level:${dir.level}, parent_id:${dir.parent_id}`);
    });
    
    // 3. 检查二级目录（系统）
    const systems = directories.filter(dir => dir.level === 1);
    console.log('\n3. 项目2980下的二级目录（系统）:');
    systems.forEach(system => {
      console.log(`   ID:${system.id}, name:${system.name}`);
    });
    
    // 4. 检查是否有level=1的目录
    const level1Count = directories.filter(dir => dir.level === 1).length;
    console.log(`\n4. 二级目录数量: ${level1Count}`);
    
    if (level1Count === 0) {
      console.log('❌ 项目2980下没有二级目录（系统）！');
      console.log('这可能是因为数据库中的目录结构不符合预期。');
    }
    
    // 5. 检查所有项目的ID
    const allProjects = await prisma.projects.findMany();
    console.log('\n5. 所有项目:');
    allProjects.forEach(p => {
      console.log(`   ID:${p.id}, name:${p.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjectData();
