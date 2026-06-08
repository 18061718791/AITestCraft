// 测试修复结果：查询智能物联项目本周新建的问题
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function testWeeklyIssues() {
  try {
    console.log('=== 测试：查询智能物联项目本周新建的问题 ===');
    
    // 计算本周的开始和结束日期
    const now = new Date();
    const dayOfWeek = now.getDay() || 7; // 将周日从0改为7
    const start = new Date();
    start.setDate(now.getDate() - dayOfWeek + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];
    
    console.log('本周开始日期:', startDate);
    console.log('本周结束日期:', endDate);
    
    // 获取智能物联项目的所有子目录ID
    const directories = await prisma.directories.findMany({
      where: {
        project_id: '2980', // 智能物联项目ID
        level: {
          in: [2, 3]
        }
      }
    });
    
    const parentIds = directories.map(dir => parseInt(dir.id));
    console.log('智能物联项目子目录ID:', parentIds);
    console.log('子目录数量:', parentIds.length);
    
    // 查询本周新建的问题
    const issues = await prisma.$queryRaw`
      SELECT i.id, i.subject, i.created_on, i.parent_id
      FROM issues i
      WHERE i.parent_id = ANY(${parentIds})
      AND i.created_on >= ${startDate}
      AND i.created_on <= ${endDate}
      ORDER BY i.created_on DESC
    `;
    
    console.log('本周新建的问题数量:', issues.length);
    if (issues.length > 0) {
      console.log('前5个问题:');
      issues.slice(0, 5).forEach(issue => {
        console.log(`ID: ${issue.id}, 标题: ${issue.subject}, 创建时间: ${issue.created_on}, 父目录ID: ${issue.parent_id}`);
      });
    } else {
      console.log('本周没有新建的问题');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWeeklyIssues();