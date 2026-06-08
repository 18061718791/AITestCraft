const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function test() {
  try {
    console.log('=== 测试我的待办功能 ===\n');

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

    // 2. 获取当前用户的Redmine关联信息
    console.log('2. 获取当前用户的Redmine关联信息...');
    try {
      const redmineRes = await axios.get(`${BASE_URL}/users/profile/redmine`, { headers });
      console.log('✓ Redmine关联信息:', redmineRes.data.data);
    } catch (e) {
      console.log('✗ 获取失败:', e.response?.data);
    }

    // 3. 获取用户列表（确认Redmine关联状态）
    console.log('\n3. 获取用户列表...');
    try {
      const usersRes = await axios.get(`${BASE_URL}/users`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const currentUser = usersRes.data.data?.rows?.find(u => u.id === user.id);
      if (currentUser) {
        console.log(`✓ 用户 ${currentUser.username}:`);
        console.log(`   Redmine用户ID: ${currentUser.redmine_user_id || '未关联'}`);
        console.log(`   Redmine姓名: ${currentUser.redmine_lastname || '未关联'}`);
      }
    } catch (e) {
      console.log('✗ 获取失败:', e.response?.data);
    }

    // 4. 测试我的待办
    console.log('\n4. 测试我的待办...');
    try {
      const todoRes = await axios.get(`${BASE_URL}/defects/my-todo`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const todos = todoRes.data.data?.list || [];
      const total = todoRes.data.data?.total || 0;
      console.log(`✓ 获取成功，共 ${total} 条待办`);
      if (todos.length > 0) {
        console.log('   第一条待办:', todos[0].subject || '无标题');
      }
    } catch (e) {
      console.log('✗ 获取失败:', e.response?.status, e.response?.data);
    }

    console.log('\n=== 测试完成 ===');

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

test();
