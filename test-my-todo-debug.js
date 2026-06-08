const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function test() {
  try {
    console.log('=== 调试我的待办功能 ===\n');

    // 1. 登录获取token
    console.log('1. 登录 shi_binbin/111111...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'shi_binbin',
      password: '111111'
    });
    const token = loginRes.data.data?.accessToken;
    const user = loginRes.data.data?.user;
    console.log('✓ 登录成功');
    console.log(`   用户: ${user?.username} (ID: ${user?.id})\n`);

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. 获取所有项目
    console.log('2. 获取所有项目...');
    const projectsRes = await axios.get(`${BASE_URL}/projects`, { headers });
    const projects = projectsRes.data.data || [];
    console.log(`✓ 共 ${projects.length} 个项目:`);
    projects.forEach(p => {
      console.log(`   - ${p.name} (ID: ${p.id})`);
    });

    // 3. 测试不带project_id的my-todo（应该返回所有项目的待办）
    console.log('\n3. 测试不带project_id的my-todo...');
    const allTodosRes = await axios.get(`${BASE_URL}/defects/my-todo`, {
      headers,
      params: { page: 1, pageSize: 100 }
    });
    console.log(`   总数: ${allTodosRes.data.data?.total || 0}`);

    // 4. 测试带project_id的my-todo（分别测试每个项目）
    console.log('\n4. 测试带project_id的my-todo（逐个测试）...');
    for (const project of projects) {
      const projectId = parseInt(project.id);
      const projectTodosRes = await axios.get(`${BASE_URL}/defects/my-todo`, {
        headers,
        params: { 
          project_id: projectId,
          page: 1, 
          pageSize: 100 
        }
      });
      const count = projectTodosRes.data.data?.total || 0;
      console.log(`   - ${project.name} (ID: ${projectId}): ${count} 条待办`);
    }

    console.log('\n=== 调试完成 ===');

  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应:', error.response.data);
    }
  }
}

test();
