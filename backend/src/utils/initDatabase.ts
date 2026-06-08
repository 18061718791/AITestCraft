import { prisma } from './prisma';

const initDatabase = async () => {
  try {
    console.log('开始初始化数据库表...');
    
    // 检查是否需要添加智能物联项目及其目录结构
    const existingProject = await prisma.projects.findUnique({
      where: {
        id: '2980'
      }
    });
    
    if (!existingProject) {
      // 添加智能物联项目
      const smartIotProject = await prisma.projects.create({
        data: {
          id: '2980',
          name: '智能物联'
        }
      });
      console.log('智能物联项目添加成功');
      
      // 添加默认目录
      const defaultDirectories = [
        { id: '2981', name: '低代码&研发管理平台', project_id: '2980', parent_id: '2980', level: 1 },
        { id: '2982', name: '物联应用', project_id: '2980', parent_id: '2980', level: 1 },
        { id: '2983', name: '物联平台', project_id: '2980', parent_id: '2980', level: 1 },
        { id: '2984', name: '大数据平台', project_id: '2980', parent_id: '2980', level: 1 },
        { id: '2985', name: '边缘计算', project_id: '2980', parent_id: '2980', level: 1 },
        { id: '2989', name: '低代码工具', project_id: '2980', parent_id: '2981', level: 2 },
        { id: '2990', name: '研发管理平台', project_id: '2980', parent_id: '2981', level: 2 },
        { id: '3334', name: '客户问题', project_id: '2980', parent_id: '2981', level: 2 }
      ];
      
      for (const dir of defaultDirectories) {
        await prisma.directories.create({
          data: dir
        });
      }
      console.log('默认目录添加成功');
    } else {
      console.log('智能物联项目已存在，跳过初始化');
    }
    
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  } finally {
    await prisma.$disconnect();
  }
};

initDatabase();

export default initDatabase;