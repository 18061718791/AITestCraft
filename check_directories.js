const { PrismaClient } = require('./backend/src/generated/prisma');

process.chdir('./backend'); // 切换到backend目录

const prisma = new PrismaClient();

async function checkDirectories() {
  try {
    console.log('Querying directories...');
    
    // 查询所有目录
    const directories = await prisma.directories.findMany({
      orderBy: [
        { level: 'asc' },
        { created_at: 'asc' }
      ]
    });
    
    console.log(`Found ${directories.length} directories:`);
    
    // 按级别分组显示
    const level0Dirs = directories.filter(dir => dir.level === 0);
    const level1Dirs = directories.filter(dir => dir.level === 1);
    const level2Dirs = directories.filter(dir => dir.level === 2);
    
    console.log('\nLevel 0 Directories (Projects):');
    level0Dirs.forEach(dir => {
      console.log(`- ID: ${dir.id}, Name: ${dir.name}, Project ID: ${dir.project_id}`);
    });
    
    console.log('\nLevel 1 Directories (Systems):');
    level1Dirs.forEach(dir => {
      console.log(`- ID: ${dir.id}, Name: ${dir.name}, Project ID: ${dir.project_id}, Parent ID: ${dir.parent_id}`);
    });
    
    console.log('\nLevel 2 Directories (Modules):');
    level2Dirs.forEach(dir => {
      console.log(`- ID: ${dir.id}, Name: ${dir.name}, Project ID: ${dir.project_id}, Parent ID: ${dir.parent_id}`);
    });
    
    // 特别查找低代码系统
    const lowCodeDirs = directories.filter(dir => dir.name.includes('低代码') || dir.name.includes('lowcode'));
    console.log('\nLow Code Related Directories:');
    lowCodeDirs.forEach(dir => {
      console.log(`- ID: ${dir.id}, Name: ${dir.name}, Level: ${dir.level}, Project ID: ${dir.project_id}`);
    });
    
    // 查找智能物联项目
    const iotProjectDirs = directories.filter(dir => dir.project_id === '1'); // 假设智能物联项目ID是1
    console.log('\nIntelligent IoT Project Directories:');
    iotProjectDirs.forEach(dir => {
      console.log(`- ID: ${dir.id}, Name: ${dir.name}, Level: ${dir.level}`);
    });
    
  } catch (error) {
    console.error('Error querying directories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDirectories();
