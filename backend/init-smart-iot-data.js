// 初始化智能物联项目层级结构数据
const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function initSmartIotData() {
  try {
    console.log('开始初始化智能物联项目数据...');
    
    // 先删除现有的智能物联项目（如果存在）
    try {
      await prisma.projects.delete({
        where: {
          id: '2980'
        }
      });
      console.log('已删除现有的智能物联项目');
    } catch (error) {
      console.log('智能物联项目不存在，跳过删除');
    }
    
    // 创建智能物联项目
    console.log('开始创建智能物联项目...');
    const smartIotProject = await prisma.projects.create({
      data: {
        id: '2980',
        name: '智能物联'
      }
    });
    console.log('智能物联项目创建成功:', smartIotProject);
    
    // 创建目录结构
    const directories = [
      // 二级目录
      {
        id: '2981',
        name: '低代码&研发管理平台',
        project_id: '2980',
        parent_id: '2980',
        level: 2
      },
      {
        id: '2982',
        name: '物联应用',
        project_id: '2980',
        parent_id: '2980',
        level: 2
      },
      {
        id: '2983',
        name: '物联平台',
        project_id: '2980',
        parent_id: '2980',
        level: 2
      },
      {
        id: '2984',
        name: '大数据平台',
        project_id: '2980',
        parent_id: '2980',
        level: 2
      },
      {
        id: '2985',
        name: '边缘计算',
        project_id: '2980',
        parent_id: '2980',
        level: 2
      },
      // 三级目录
      {
        id: '2989',
        name: '低代码工具',
        project_id: '2980',
        parent_id: '2981',
        level: 3
      },
      {
        id: '2990',
        name: '研发管理平台',
        project_id: '2980',
        parent_id: '2981',
        level: 3
      },
      {
        id: '3334',
        name: '客户问题',
        project_id: '2980',
        parent_id: '2981',
        level: 3
      }
    ];
    
    console.log('开始创建目录结构...');
    for (const dir of directories) {
      const createdDir = await prisma.directories.create({
        data: dir
      });
      console.log(`创建目录成功: ${createdDir.name} (ID: ${createdDir.id})`);
    }
    
    console.log('智能物联项目层级结构初始化完成！');
    
    // 验证数据
    const finalDirectoryCount = await prisma.directories.count({
      where: {
        project_id: '2980'
      }
    });
    console.log(`最终目录数量: ${finalDirectoryCount}`);
    if (finalDirectoryCount === 8) {
      console.log('✓ 目录结构完整');
    } else {
      console.log('✗ 目录结构不完整');
    }
    
  } catch (error) {
    console.error('初始化智能物联项目数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行初始化
initSmartIotData();