import { prisma } from './prisma';

const checkDatabase = async () => {
  try {
    console.log('=== 检查数据库数据 ===');
    
    const project = await prisma.projects.findUnique({
      where: { id: '2980' }
    });
    
    console.log('项目数据:', JSON.stringify(project, null, 2));
    
    const directories = await prisma.directories.findMany({
      where: { project_id: '2980' }
    });
    
    console.log('所有目录数据:');
    directories.forEach(dir => {
      console.log(`  - ID: ${dir.id}, Name: ${dir.name}, Level: ${dir.level}, Parent: ${dir.parent_id}`);
    });
    
    const systems = directories.filter(dir => dir.level === 1);
    
    console.log('过滤后的系统数据 (level === 1):');
    systems.forEach(sys => {
      console.log(`  - ID: ${sys.id}, Name: ${sys.name}, Level: ${sys.level}`);
    });
    
    console.log('=== 检查完成 ===');
  } catch (error) {
    console.error('检查数据库失败:', error);
  } finally {
    await prisma.$disconnect();
  }
};

checkDatabase();
