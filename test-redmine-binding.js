const axios = require('axios');

const BASE_URL = 'http://localhost:9000/api';

async function test() {
  try {
    console.log('=== Redmine用户关联功能测试 ===\n');

    // 1. 登录获取token
    console.log('1. 登录 testuser/111111...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: '111111'
    });
    const token = loginRes.data.data?.accessToken;
    const user = loginRes.data.data?.user;
    console.log('✓ 登录成功');
    console.log(`   用户: ${user?.username} (ID: ${user?.id})\n`);

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. 搜索Redmine用户
    console.log('2. 搜索Redmine用户（关键字：张）...');
    try {
      const searchRes = await axios.get(`${BASE_URL}/redmine-users/search`, {
        headers,
        params: { keyword: '张', limit: 10 }
      });
      const users = searchRes.data.data || [];
      console.log(`✓ 搜索成功，找到 ${users.length} 个用户`);
      users.forEach(u => {
        console.log(`   - ${u.lastname} (ID: ${u.id})`);
      });
      console.log('');
    } catch (e) {
      console.log(`✗ 搜索失败: ${e.response?.status} - ${e.response?.data?.message}\n`);
    }

    // 3. 获取用户列表（查看Redmine关联状态）
    console.log('3. 获取用户列表...');
    try {
      const usersRes = await axios.get(`${BASE_URL}/users`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const users = usersRes.data.data?.rows || [];
      console.log(`✓ 获取成功，共 ${users.length} 个用户`);
      users.forEach(u => {
        const redmineInfo = u.redmine_user_id 
          ? `已关联: ${u.redmine_lastname} (ID:${u.redmine_user_id})`
          : '未关联';
        console.log(`   - ${u.username}: ${redmineInfo}`);
      });
      console.log('');
    } catch (e) {
      console.log(`✗ 获取失败: ${e.response?.status} - ${e.response?.data?.message}\n`);
    }

    // 4. 更新Redmine关联（使用ID=130作为测试）
    console.log('4. 更新当前用户的Redmine关联（ID=130）...');
    try {
      const bindRes = await axios.put(`${BASE_URL}/users/${user.id}/redmine-binding`, {
        redmineUserId: 130,
        redmineLastname: '测试用户'
      }, { headers });
      console.log('✓ 关联成功');
      console.log(`   Redmine用户: ${bindRes.data.data?.redmine_lastname} (ID: ${bindRes.data.data?.redmine_user_id})\n`);
    } catch (e) {
      console.log(`✗ 关联失败: ${e.response?.status} - ${e.response?.data?.message}\n`);
    }

    // 5. 验证我的待办（应该使用用户的Redmine ID）
    console.log('5. 测试我的待办页面...');
    try {
      const todoRes = await axios.get(`${BASE_URL}/defects/my-todo`, {
        headers,
        params: { page: 1, pageSize: 10 }
      });
      const todos = todoRes.data.data?.list || [];
      console.log(`✓ 获取成功，共 ${todos.length} 条待办\n`);
    } catch (e) {
      console.log(`✗ 获取失败: ${e.response?.status} - ${e.response?.data?.message}\n`);
    }

    console.log('=== 测试完成 ===');

  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

test();
