/**
 * 我的待办统计测试脚本
 * 用于验证前端和后端数据一致性
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// 测试项目ID（根据用户提供的信息）
const TEST_PROJECTS = [
  { id: 2980, name: '智能物联项目', expectedCount: 17 },
  { id: 2981, name: '测试项目', expectedCount: 2 }
];

/**
 * 测试单个项目的待办查询
 */
async function testProjectTodos(project) {
  console.log(`\n========== 测试项目: ${project.name} (ID: ${project.id}) ==========`);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/defects/my-todo`, {
      params: {
        project_id: project.id,
        page: 1,
        pageSize: 1000,
      },
    });

    const data = response.data;
    console.log('API响应状态:', data.success ? '成功' : '失败');
    console.log('返回数据总数:', data.data?.total || 0);
    console.log('返回列表长度:', data.data?.list?.length || 0);
    console.log('期望数量:', project.expectedCount);
    
    if (data.data?.list && data.data.list.length > 0) {
      console.log('\n前3条待办:');
      data.data.list.slice(0, 3).forEach((todo, index) => {
        console.log(`  ${index + 1}. ID:${todo.id} ${todo.subject}`);
        console.log(`     系统/模块: ${todo.system_module_name}`);
        console.log(`     分配给: ${todo.assigned_to_name} (ID:${todo.assigned_to_id})`);
        console.log(`     状态: ${todo.status_name} (ID:${todo.status_id})`);
      });
      
      // 按系统分组统计
      const systemMap = new Map();
      data.data.list.forEach(todo => {
        const systemModule = todo.system_module_name || '未分类';
        const systemName = systemModule.split('/')[0] || '未分类';
        systemMap.set(systemName, (systemMap.get(systemName) || 0) + 1);
      });
      
      console.log('\n按系统分组:');
      systemMap.forEach((count, systemName) => {
        console.log(`  - ${systemName}: ${count} 条`);
      });
    } else {
      console.log('警告: 没有返回待办数据！');
    }
    
    return data.data?.list || [];
  } catch (error) {
    console.error('查询失败:', error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误详情:', error.response.data);
    }
    return [];
  }
}

/**
 * 测试所有项目的待办查询（不传入project_id）
 */
async function testAllTodos() {
  console.log('\n========== 测试查询所有待办（不指定项目） ==========');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/defects/my-todo`, {
      params: {
        page: 1,
        pageSize: 1000,
      },
    });

    const data = response.data;
    console.log('API响应状态:', data.success ? '成功' : '失败');
    console.log('返回数据总数:', data.data?.total || 0);
    console.log('返回列表长度:', data.data?.list?.length || 0);
    
    return data.data?.list || [];
  } catch (error) {
    console.error('查询失败:', error.message);
    return [];
  }
}

/**
 * 获取项目列表
 */
async function getProjects() {
  console.log('\n========== 获取项目列表 ==========');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/projects`);
    const projects = response.data?.data || [];
    console.log(`获取到 ${projects.length} 个项目:`);
    projects.forEach(p => {
      console.log(`  - ID:${p.id} ${p.name}`);
    });
    return projects;
  } catch (error) {
    console.error('获取项目列表失败:', error.message);
    return [];
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('========================================');
  console.log('    我的待办统计测试脚本');
  console.log('========================================');
  
  // 1. 获取项目列表
  const projects = await getProjects();
  
  // 2. 测试指定项目
  let totalCount = 0;
  for (const project of TEST_PROJECTS) {
    const todos = await testProjectTodos(project);
    totalCount += todos.length;
  }
  
  // 3. 测试不指定项目
  const allTodos = await testAllTodos();
  
  console.log('\n========== 测试结果汇总 ==========');
  console.log(`指定项目统计总数: ${totalCount}`);
  console.log(`所有项目查询总数: ${allTodos.length}`);
  console.log(`期望总数: ${TEST_PROJECTS.reduce((sum, p) => sum + p.expectedCount, 0)}`);
  
  if (totalCount === 0) {
    console.log('\n⚠️ 警告: 没有获取到任何待办数据！');
    console.log('可能原因:');
    console.log('  1. 后端API固定 assigned_to_id = 130，当前用户可能不是130');
    console.log('  2. 状态筛选条件导致数据被过滤');
    console.log('  3. 项目ID或目录关联有问题');
  }
  
  console.log('\n========================================');
}

// 运行测试
runTests().catch(console.error);
