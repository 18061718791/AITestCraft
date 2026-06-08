import { query } from './src/utils/database';

async function test() {
  console.log('=== 测试智能物联项目数据统计 ===\n');

  // 1. 查找智能物联项目
  const projectResult = await query(`
    SELECT id, name, level 
    FROM directories 
    WHERE name LIKE '%智能物联%' AND level = 0
    LIMIT 1
  `);
  const project = projectResult.rows[0];
  console.log('1. 查找智能物联项目 (level=0):');
  console.log(`   项目: ${project?.name}, id: ${project?.id}, level: ${project?.level}\n`);

  if (!project) {
    console.log('未找到智能物联项目！');
    return;
  }

  // 2. 查找智能物联项目下的系统
  const systemsResult = await query(`
    SELECT id, name, level, parent_id 
    FROM directories 
    WHERE parent_id = '${project.id}' AND level = 1
  `);
  const systems = systemsResult.rows;
  console.log('2. 智能物联项目下的系统 (level=1):');
  for (const sys of systems) {
    console.log(`   - ${sys.name}, id: ${sys.id}`);
  }
  console.log();

  // 收集所有系统ID
  const systemIds = systems.map(s => parseInt(s.id));

  // 3. 查找系统下的模块
  const modulesResult = await query(`
    SELECT id, name, level, parent_id 
    FROM directories 
    WHERE level = 2 AND parent_id IN (${systemIds.map(id => `'${id}'`).join(', ')})
  `);
  const modules = modulesResult.rows;
  console.log('3. 系统下的模块 (level=2):');
  for (const mod of modules) {
    console.log(`   - ${mod.name}, id: ${mod.id}, parent_id: ${mod.parent_id}`);
  }
  console.log();

  // 4. 统计智能物联项目的总问题数
  console.log('4. 统计智能物联项目的问题数量:');

  // 获取所有子目录ID（包括系统 level=1 和 模块 level=2）
  const allChildIds: number[] = [];

  for (const sys of systems) {
    const sysId = parseInt(sys.id);
    allChildIds.push(sysId);

    // 查找该系统下的模块
    const childModules = modules.filter((m: any) => m.parent_id === sys.id);
    for (const mod of childModules) {
      allChildIds.push(parseInt(mod.id));
    }
  }

  console.log(`   所有子目录ID: [${allChildIds.join(', ')}]`);

  // 统计 issues 表中 parent_id 在这些目录下的记录数
  const totalCountResult = await query(`
    SELECT COUNT(*) as count
    FROM issues
    WHERE parent_id IN (${allChildIds.join(', ')})
  `);
  const totalCount = parseInt(totalCountResult.rows[0].count);
  console.log(`   智能物联项目的问题总数: ${totalCount}`);

  // 5. 统计所有问题（不做过滤）
  const allCountResult = await query(`SELECT COUNT(*) as count FROM issues`);
  const allCount = parseInt(allCountResult.rows[0].count);
  console.log(`\n5. 数据库中所有问题总数: ${allCount}`);

  // 6. 按目录统计
  console.log('\n6. 按目录统计问题数:');
  for (const id of allChildIds) {
    const countResult = await query(`
      SELECT COUNT(*) as count FROM issues WHERE parent_id = ${id}
    `);
    console.log(`   parent_id=${id}: ${parseInt(countResult.rows[0].count)} 条`);
  }

  // 7. 排除目录ID后的问题数
  const allDirsResult = await query(`SELECT id FROM directories`);
  const dirIds = allDirsResult.rows.map((d: any) => d.id);
  const issuesWithFilterResult = await query(`
    SELECT COUNT(*) as count
    FROM issues
    WHERE parent_id IN (${allChildIds.join(', ')})
    AND id NOT IN (${dirIds.map((id: any) => `'${id}'`).join(', ')})
  `);
  const issuesWithFilter = parseInt(issuesWithFilterResult.rows[0].count);
  console.log(`\n7. 排除目录ID后的问题数: ${issuesWithFilter}`);

  console.log('\n=== 结论 ===');
  console.log(`期望数据量: 334 条`);
  console.log(`实际数据量: ${issuesWithFilter} 条`);
  if (issuesWithFilter === 334) {
    console.log('✅ 数据正确！');
  } else {
    console.log('❌ 数据不正确！');
  }
}

test().catch(console.error);
