import { prisma } from './prisma';

const deleteOldData = async () => {
  try {
    console.log('开始删除旧数据...');
    
    await prisma.directories.deleteMany({
      where: { project_id: '2980' }
    });
    
    await prisma.projects.deleteMany({
      where: { id: '2980' }
    });
    
    console.log('已删除旧数据');
  } catch (error) {
    console.error('删除旧数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
};

deleteOldData();
