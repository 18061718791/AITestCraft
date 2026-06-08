import { query } from './database';

const checkIssues = async () => {
  try {
    console.log('=== 检查PG数据库中的issues表 ===');
    
    const issuesResult = await query('SELECT * FROM issues ORDER BY id LIMIT 10');
    const issues = issuesResult.rows;
    
    console.log('issues表中的前10条记录:');
    issues.forEach((issue: any) => {
      console.log(`  - ID: ${issue.id}, Parent: ${issue.parent_id}, Created: ${issue.created_on}`);
    });
    
    const countResult = await query('SELECT COUNT(*) as count FROM issues');
    const count = parseInt(countResult.rows[0].count);
    console.log(`issues表总记录数: ${count}`);
    
    const issuesWithParentResult = await query(
      'SELECT * FROM issues WHERE parent_id = ANY($1) ORDER BY id LIMIT 10',
      [['2981', '2982', '2983', '2984', '2985']]
    );
    const issuesWithParent = issuesWithParentResult.rows;
    
    console.log('智能物联项目下的问题数据 (parent_id in [2981, 2982, 2983, 2984, 2985]):');
    console.log(`找到 ${issuesWithParent.length} 条记录`);
    issuesWithParent.forEach((issue: any) => {
      console.log(`  - ID: ${issue.id}, Parent: ${issue.parent_id}, Summary: ${issue.summary}`);
    });
    
    console.log('=== 检查完成 ===');
  } catch (error) {
    console.error('检查issues表失败:', error);
  }
};

checkIssues();
