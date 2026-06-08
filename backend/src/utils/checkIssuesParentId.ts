import { query } from '../utils/database';

const checkIssuesParentId = async () => {
  try {
    console.log('=== 检查issues表中parent_id的分布 ===');
    
    const parentIdsResult = await query(`
      SELECT DISTINCT parent_id, COUNT(*) as count
      FROM issues
      GROUP BY parent_id
      ORDER BY parent_id
    `);
    
    console.log('issues表中所有不同的parent_id值及其数量:');
    parentIdsResult.rows.forEach((row: any) => {
      console.log(`  - parent_id: ${row.parent_id}, count: ${row.count}`);
    });
    
    const countResult = await query(`SELECT COUNT(*) as total FROM issues`);
    console.log(`\nissues表总记录数: ${countResult.rows[0].total}`);
    
    const systemIssuesResult = await query(`
      SELECT id, parent_id, summary
      FROM issues
      WHERE parent_id IN ('2981', '2982', '2983', '2984', '2985')
      LIMIT 10
    `);
    
    console.log(`\n系统级别的问题数据 (parent_id in [2981, 2982, 2983, 2984, 2985]): ${systemIssuesResult.rowCount} 条`);
    systemIssuesResult.rows.forEach((row: any) => {
      console.log(`  - ID: ${row.id}, Parent: ${row.parent_id}, Summary: ${row.summary}`);
    });
    
    const moduleIssuesResult = await query(`
      SELECT id, parent_id, summary
      FROM issues
      WHERE parent_id IN ('2989', '2990', '3334')
      LIMIT 10
    `);
    
    console.log(`\n模块级别的问题数据 (parent_id in [2989, 2990, 3334]): ${moduleIssuesResult.rowCount} 条`);
    moduleIssuesResult.rows.forEach((row: any) => {
      console.log(`  - ID: ${row.id}, Parent: ${row.parent_id}, Summary: ${row.summary}`);
    });
    
    const allIssuesResult = await query(`
      SELECT id, parent_id, summary
      FROM issues
      WHERE parent_id IN ('2981', '2982', '2983', '2984', '2985', '2989', '2990', '3334')
      LIMIT 10
    `);
    
    console.log(`\n所有系统和模块的问题数据 (parent_id in [2981, 2982, 2983, 2984, 2985, 2989, 2990, 3334]): ${allIssuesResult.rowCount} 条`);
    allIssuesResult.rows.forEach((row: any) => {
      console.log(`  - ID: ${row.id}, Parent: ${row.parent_id}, Summary: ${row.summary}`);
    });
    
    console.log('=== 检查完成 ===');
  } catch (error) {
    console.error('检查issues表失败:', error);
  }
};

checkIssuesParentId();
