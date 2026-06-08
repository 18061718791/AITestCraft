const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('========== 检查物联平台相关数据 ==========\n');
    
    // 1. 检查目录2983(物联平台)
    const dir2983 = await prisma.directories.findFirst({
      where: { id: '2983' }
    });
    console.log('1. 目录2983(物联平台):', dir2983);
    
    // 2. 检查2983下的三级目录
    const subdirs = await prisma.directories.findMany({
      where: {
        parent_id: '2983',
        level: 3
      }
    });
    console.log('\n2. 2983下的三级目录数量:', subdirs.length);
    console.log('三级目录列表:', subdirs.map(d => ({ id: d.id, name: d.name })));
    
    // 3. 检查上周的缺陷数据
    const now = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(now.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);
    
    console.log('\n3. 时间范围: 上周');
    console.log('   开始时间:', lastWeek.toISOString());
    console.log('   结束时间:', now.toISOString());
    
    // 4. 检查所有parent_id在[2983]或其子目录的缺陷
    const parentIds = subdirs.length > 0 
      ? subdirs.map(d => parseInt(d.id))
      : [2983];
    
    console.log('\n4. 查询的parentIds:', parentIds);
    
    const issues = await prisma.$queryRaw(`
      SELECT COUNT(*) as count
      FROM issues
      WHERE parent_id = ANY($1)
        AND created_on >= $2
        AND created_on <= $3
    `, [parentIds, lastWeek.toISOString(), now.toISOString()]);
    
    console.log('\n5. 上周缺陷总数(parent_id = 2983):', issues[0].count);
    
    // 6. 检查所有缺陷(不限时间)
    const allIssues = await prisma.$queryRaw(`
      SELECT COUNT(*) as count
      FROM issues
      WHERE parent_id = ANY($1)
    `, [parentIds]);
    
    console.log('\n6. 所有缺陷总数(parent_id = 2983):', allIssues[0].count);
    
    // 7. 检查是否有parent_id=2983的缺陷
    const directIssues = await prisma.$queryRaw(`
      SELECT COUNT(*) as count
      FROM issues
      WHERE parent_id = $1
    `, [2983]);
    
    console.log('\n7. 直接parent_id=2983的缺陷数:', directIssues[0].count);
    
    // 8. 检查所有缺陷的parent_id分布
    const parentDistribution = await prisma.$queryRaw(`
      SELECT parent_id, COUNT(*) as count
      FROM issues
      GROUP BY parent_id
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('\n8. 所有缺陷的parent_id分布(前20):');
    parentDistribution.forEach((row, index) => {
      console.log(`   ${index + 1}. parent_id:${row.parent_id}, count:${row.count}`);
    });
    
    // 9. 检查项目2980下的所有目录
    const allDirs = await prisma.directories.findMany({
      where: {
        project_id: '2980',
        level: {
          in: [2, 3]
        }
      }
    });
    
    console.log('\n9. 项目2980下的所有二级和三级目录:');
    allDirs.forEach(dir => {
      console.log(`   ID:${dir.id}, name:${dir.name}, level:${dir.level}, parent_id:${dir.parent_id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
